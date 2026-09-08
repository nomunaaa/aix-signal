/**
 * Time utilities for AiXSignal
 * All timestamps are stored and transmitted in milliseconds (Unix epoch in ms)
 */

/** 10 minutes in milliseconds */
export const TEN = 600_000;
/** 1 minute in milliseconds */
export const ONE_MINUTE = 60_000;

/**
 * Convert timestamp to milliseconds
 * @param u - timestamp in seconds or milliseconds
 * @returns timestamp in milliseconds
 */
export const toMs = (u: number): number => (u < 1e12 ? u * 1000 : u);

/** Timestamp-г өгөгдсөн intervalMs-д floor хийж open time болгох. */
export function bucketOpenMs(t: number, intervalMs: number): number {
  const ms = toMs(t);
  return Math.floor(ms / intervalMs) * intervalMs;
}

/** Strategy webhook-ээр ирсэн timestamp (close time)-г floor хийж chart bar open time (Binance openTime) болгох. */
export function bucketOpenFromClose(t: number, intervalMs: number): number {
  const ms = toMs(t);
  if (ms <= 0) return 0;
  return Math.floor((ms - 1) / intervalMs) * intervalMs;
}

/**
 * Одоогийн bar open time (1m).
 */
export const bucket1m = (t: number): number => bucketOpenMs(t, ONE_MINUTE);

/**
 * Одоогийн bar open time (10m).
 */
export const bucket10m = (t: number): number => bucketOpenMs(t, TEN);

/**
 * Get today's start in KST (00:00:00)
 * @param now - current timestamp (default: Date.now())
 * @returns timestamp of today's 00:00:00 KST in milliseconds
 */
export function getTodayKstStart(now = Date.now()): number {
  const kstOffset = 9 * 60 * 60 * 1000; // KST = UTC+9
  return Math.floor((now + kstOffset) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - kstOffset;
}

/**
 * Apply time range to chart, snapping to last available data
 * @deprecated Legacy function for Highcharts - use ECharts equivalent instead
 * @param chart - Chart instance (legacy Highcharts type)
 * @param spanMs - time span in milliseconds
 */
 
export function applyRangeToLast(chart: any, spanMs: number) {
   
  const series = chart.get('ohlc') as any;
  const xs = series?.xData as number[];
  if (!xs?.length) return;

  const end = xs[xs.length - 1];
  const start = Math.max(xs[0], end - spanMs);

  console.warn('[applyRangeToLast]', {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    spanH: spanMs / 3600e3,
    dataPoints: xs.length
  });

  // Set main axis
  chart.xAxis[0].setExtremes(start, end, false, false);

  // Sync navigator
  requestAnimationFrame(() => {
     
    const nav = (chart as any).navigator;
    if (nav?.xAxis) {
      nav.xAxis.setExtremes(start, end, false, false);
    }
  });
}

/**
 * Format milliseconds timestamp to KST ISO string
 * @param ms - timestamp in milliseconds
 * @returns ISO string in KST timezone
 */
export function formatKST(ms: number): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(ms + kstOffset);
  return kstDate.toISOString().replace('Z', ' KST');
}

/**
 * Get today's start in UTC (00:00:00 UTC)
 * @param now - current timestamp (default: Date.now())
 * @returns timestamp of today's 00:00:00 UTC in milliseconds
 */
export function getTodayUtcStart(now = Date.now()): number {
  const ONE_DAY = 24 * 60 * 60 * 1000;
  return Math.floor(now / ONE_DAY) * ONE_DAY;
}
