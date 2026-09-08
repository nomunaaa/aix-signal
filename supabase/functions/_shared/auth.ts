/**
 * 인증 유틸리티
 */

// 환경변수에서 WEBHOOK_HMAC_SECRET을 가져옵니다 (필수)
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_HMAC_SECRET');

if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_HMAC_SECRET environment variable is required for webhook authentication');
}

function normalizeStrategyEnvKey(tradingCategory: string): string {
  return tradingCategory.toUpperCase().replace(/[^A-Z0-9]/g, '_');
}

/**
 * HMAC SHA256 서명 생성
 */
async function generateHmacSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = encoder.encode(WEBHOOK_SECRET);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

async function generateHmacSignatureWithSecret(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const key = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Signal webhook: trading_category/strategy specific WEBHOOK_HMAC_SECRET_<STRATEGY>
 */
export async function validateSignalStrategyWebhookSignature(
  request: Request,
  payload: string,
  tradingCategory: string
): Promise<boolean> {
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  if (isDevelopment) {
    console.warn('⚠️  Development mode: Webhook signature validation bypassed');
    return true;
  }

  const signature = request.headers.get('x-signature');
  if (!signature) return false;

  const secretKeyName = `WEBHOOK_HMAC_SECRET_${normalizeStrategyEnvKey(tradingCategory)}`;
  const secret = Deno.env.get(secretKeyName);
  if (!secret) return false;

  const expectedSignature = await generateHmacSignatureWithSecret(payload, secret);
  return signature === expectedSignature;
}

/**
 * 웹훅 서명 검증
 * SECURITY: 개발 환경에서만 서명 검증을 우회할 수 있습니다.
 */
export async function validateWebhookSignature(request: Request, payload: string): Promise<boolean> {
  // 개발 환경에서만 서명 검증을 우회 (환경변수로 제어, 절대 클라이언트 헤더로 제어하지 않음)
  const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development';
  if (isDevelopment) {
    console.warn('⚠️  Development mode: Webhook signature validation bypassed');
    return true;
  }
  
  const signature = request.headers.get('x-signature');
  if (!signature) return false;
  
  const expectedSignature = await generateHmacSignature(payload);
  return signature === expectedSignature;
}

/**
 * Bearer 토큰 검증
 */
export function validateBearerToken(request: Request, validToken: string): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === validToken;
}
