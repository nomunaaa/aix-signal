/**
 * Bar aggregation utilities for AiXSignal
 * Shared between edge functions and frontend
 */

export interface Bar1m {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Bar5m {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface Bar10m {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/**
 * Aggregate 1m bars to 10m bars using bucket-based approach
 * @param bars1m - Array of 1-minute bars
 * @param bucketMs - Bucket size in milliseconds (default: 600000 = 10 minutes)
 * @returns Array of aggregated bars
 */
export function fold1mTo10m(bars1m: Bar1m[], bucketMs = 600000): Bar10m[] {
  const buckets = new Map<number, Bar10m>();
  
  for (const b of bars1m) {
    const bucket = Math.floor(b.t / bucketMs) * bucketMs;
    
    if (!buckets.has(bucket)) {
      buckets.set(bucket, { t: bucket, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v });
    } else {
      const cur = buckets.get(bucket)!;
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
    }
  }
  
  return Array.from(buckets.values()).sort((a, b) => a.t - b.t);
}

/**
 * Aggregate 5m bars to 10m bars (combine 2 x 5m bars into 1 x 10m bar)
 * @param bars5m - Array of 5-minute bars
 * @param bucketMs - Bucket size in milliseconds (default: 600000 = 10 minutes)
 * @returns Array of aggregated 10-minute bars
 */
export function fold5mTo10m(bars5m: Bar5m[], bucketMs = 600000): Bar10m[] {
  const result: Bar10m[] = [];
  
  // Sort by timestamp to ensure correct order
  const sorted = [...bars5m].sort((a, b) => a.t - b.t);
  
  // 5 minutes in milliseconds
  const FIVE_MIN_MS = 5 * 60 * 1000;
  
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    const a = sorted[i];
    const b = sorted[i + 1];
    
    if (b.t - a.t !== FIVE_MIN_MS) continue;
    
    result.push({
      t: a.t,                    // 10m candle start = first 5m bar timestamp
      o: a.o,                    // Open from first 5m bar
      h: Math.max(a.h, b.h),     // Highest high
      l: Math.min(a.l, b.l),     // Lowest low
      c: b.c,                    // Close from second 5m bar
      v: a.v + b.v               // Sum volumes
    });
  }
  
  return result;
}
