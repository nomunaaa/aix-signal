// src/chart/binance10m/aggregation5m10m.ts
import type { Candle, Kline } from "./types";
import { BUCKET_MS_10M } from "./constants";
import { make10mCandleFromMs } from "./api";

/**
 * Convert Binance kline row to numbers.
 * Kline format: [ openTime, open, high, low, close, volume, closeTime, ... ]
 */
function k5ToNums(k: Kline) {
    return {
        openTimeMs: Number(k[0]),
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
        volume: Number(k[5]),
        closeTimeMs: Number(k[6]),
    };
}

/**
 * Aggregate sorted 5m klines -> 10m candles by bucket.
 * Handles partial last bucket too (still returns it).
 */
export function aggregate5mTo10m(klines5m: Kline[]): Candle[] {
    if (!klines5m.length) return [];
    const out: Candle[] = [];

    let curBucket: number | null = null;
    let cur: Candle | null = null;

    for (const k of klines5m) {
        const m = k5ToNums(k);
        const bucket = Math.floor(m.openTimeMs / BUCKET_MS_10M);
        const bucketStartMs = bucket * BUCKET_MS_10M;

        if (curBucket === null || bucket !== curBucket || !cur) {
            if (cur) out.push(cur);
            curBucket = bucket;
            cur = make10mCandleFromMs({
                tMs: bucketStartMs,
                open: m.open,
                high: m.high,
                low: m.low,
                close: m.close,
                volume: m.volume,
            });
            continue;
        }

        // merge into current 10m candle
        cur.high = Math.max(cur.high, m.high);
        cur.low = Math.min(cur.low, m.low);
        cur.close = m.close;
        cur.volume = (cur.volume ?? 0) + (m.volume ?? 0);
    }

    if (cur) out.push(cur);
    return out;
}

/**
 * Merge a 5m kline update into the current 10m candle (by bucket).
 * If buckets differ, return null (caller should start a new 10m candle).
 */
export function merge5mInto10m(
    last10m: Candle,
    k5: { openTimeMs: number; open: number; high: number; low: number; close: number; volume: number }
): Candle | null {
    const bucket = Math.floor(k5.openTimeMs / BUCKET_MS_10M);
    if (bucket !== last10m.bucket) return null;

    return {
        ...last10m,
        high: Math.max(last10m.high, k5.high),
        low: Math.min(last10m.low, k5.low),
        close: k5.close,
        volume: (last10m.volume ?? 0) + (k5.volume ?? 0),
    };
}


 
/** Binance kline WS top-level `s` (e.g. ETHUSDT). Null if missing — caller may skip strict filtering. */
export function wsKlineEventSymbol(msg: unknown): string | null {
    if (!msg || typeof msg !== "object") return null;
    const s = (msg as { s?: unknown }).s;
    if (typeof s !== "string" || !s.trim()) return null;
    return s.toUpperCase();
}

export function wsKlineTo1mNums(msg: any) {
    // msg.k.t = open time, msg.k.x = closed
    const k = msg?.k;
    if (!k?.t) return null;

    return {
        openTimeMs: Number(k.t),
        isClosed: Boolean(k.x),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
    };
}

 
export function wsKlineTo5mNums(msg: any) {
    // msg.k.t = open time, msg.k.x = closed
    const k = msg?.k;
    if (!k?.t) return null;

    return {
        openTimeMs: Number(k.t),
        isClosed: Boolean(k.x),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
    };
}

 
export function wsKlineTo10mNums(msg: any) {
    // msg.k.t = open time, msg.k.x = closed
    const k = msg?.k;
    if (!k?.t) return null;

    return {
        openTimeMs: Number(k.t),
        isClosed: Boolean(k.x),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
    };
}

 
export function wsKlineTo15mNums(msg: any) {
    // msg.k.t = open time, msg.k.x = closed
    const k = msg?.k;
    if (!k?.t) return null;

    return {
        openTimeMs: Number(k.t),
        isClosed: Boolean(k.x),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
    };
}