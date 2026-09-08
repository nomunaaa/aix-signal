import { RedisClient } from './redis.ts';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for an IP address
 * @param ip - IP address to check
 * @param limit - Maximum number of requests allowed
 * @param windowSeconds - Time window in seconds
 * @param keyPrefix - Redis key prefix for this endpoint
 */
export async function checkRateLimit(
  ip: string,
  limit: number,
  windowSeconds: number,
  keyPrefix: string
): Promise<RateLimitResult> {
  const redis = new RedisClient();
  const key = `ratelimit:${keyPrefix}:${ip}`;
  
  try {
    // Get current count
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    
    if (current >= limit) {
      // Get TTL to inform user when they can retry
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + (ttl * 1000)
      };
    }
    
    // Increment counter
    const newCount = current + 1;
    await redis.set(key, newCount.toString(), windowSeconds);
    
    return {
      allowed: true,
      remaining: limit - newCount,
      resetAt: Date.now() + (windowSeconds * 1000)
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On Redis error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetAt: Date.now() + (windowSeconds * 1000)
    };
  }
}

/**
 * Extract IP address from request headers
 */
export function getClientIP(req: Request): string {
  // Check common headers for IP address (from proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to 'unknown' if no IP can be determined
  return 'unknown';
}
