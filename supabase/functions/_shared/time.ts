/**
 * Strategy webhooks-ээр ирсэн timestamp (close time)-г chart bar open time (Binance openTime) болгох.
 */
/** 1 minute in milliseconds */
export const ONE_MINUTE = 60_000;

/** 10 minutes in milliseconds */
export const TEN_MINUTES = 600_000;

/**
 * Convert timestamp to milliseconds
 * @param u - timestamp in seconds or milliseconds
 * @returns timestamp in milliseconds
 */
export const toMs = (u: number): number => (u < 1e12 ? u * 1000 : u);

/**
 * Preserve a strategy payload timestamp exactly, only normalizing seconds to milliseconds.
 */
export const payloadTimestampMs = (u: number): number => toMs(u);

/**
 * Өгөгдсөн intervalMs-д floor хийж open time болгох.
 */
export function bucketOpenMs(t: number, intervalMs: number): number {
  const ms = toMs(t);
  return Math.floor(ms / intervalMs) * intervalMs;
}

/**
 * Strategy webhook-ээр ирсэн timestamp (close time)-г өгөгдсөн intervalMs-д floor хийж chart bar open time (Binance openTime) болгох.
 */
export function bucketOpenFromClose(t: number, intervalMs: number): number {
  const ms = toMs(t);
  if (ms <= 0) return 0;
  return Math.floor((ms - 1) / intervalMs) * intervalMs;
}

/**
 * Floor to a 1m open timestamp without close-time shifting.
 */
export const bucket1m = (t: number): number => bucketOpenMs(t, ONE_MINUTE);

/**
 * Floor to a 10m open timestamp without close-time shifting.
 */
export const bucket10m = (t: number): number => bucketOpenMs(t, TEN_MINUTES);

/**
 * Get today's start in UTC (00:00:00 UTC)
 * @param now - current timestamp (default: Date.now())
 * @returns timestamp of today's 00:00:00 UTC in milliseconds
 */
export function getTodayUtcStart(now = Date.now()): number {
  // UTC 기준으로 하루의 시작 (00:00:00 UTC)
  return Math.floor(now / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
}

/**
 * Get today's start in KST (00:00:00) - DEPRECATED, use UTC instead
 * @param now - current timestamp (default: Date.now())
 * @returns timestamp of today's 00:00:00 KST in milliseconds
 * @deprecated Use getTodayUtcStart instead for consistency with Binance
 */
export function getTodayKstStart(now = Date.now()): number {
  const kstOffset = 9 * 60 * 60 * 1000; // KST = UTC+9
  return Math.floor((now + kstOffset) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - kstOffset;
}

/**
 * Validate timestamp is in milliseconds and reasonable range
 * @param ts_ms - timestamp to validate
 * @returns true if valid
 */
export function isValidTimestamp(ts_ms: number): boolean {
  if (!Number.isFinite(ts_ms)) return false;
  if (ts_ms < 946684800000) return false; // Before 2000-01-01
  if (ts_ms > Date.now() + 86400000) return false; // More than 1 day in future
  return true;
}
