// src/chart/binance10m/api.ts
import type { UTCTimestamp } from "lightweight-charts";
import type { Candle, Kline } from "./types";
import {
    BUCKET_MS_10M,
    BUCKET_MS_15M,
    BUCKET_MS_1D,
    BUCKET_MS_1H,
    BUCKET_MS_1M,
    BUCKET_MS_4H,
    BUCKET_MS_5M,
    BINANCE_KLINES_LIMIT,
    MAX_1M_BARS,
    MAX_5M_BARS,
} from "./constants";

/**
 * Binance Futures REST: klines between [startMs, endMs], paginated.
 * PUBLIC endpoint, no key required.
 */
const REST_BASE = "https://fapi.binance.com/fapi/v1";
function klineStepMs(interval: string): number {
    switch (interval) {
        case "1m":
            return BUCKET_MS_1M;
        case "5m":
            return BUCKET_MS_5M;
        case "10m":
            return BUCKET_MS_10M;
        case "15m":
            return BUCKET_MS_15M;
        case "1h":
            return BUCKET_MS_1H;
        case "4h":
            return BUCKET_MS_4H;
        case "1d":
            return BUCKET_MS_1D;
        default:
            return BUCKET_MS_1M;
    }
}

export async function fetchFuturesKlinesBetween(
    symbol: string,
    interval: "1m" | "5m" | "10m" | "15m" | "1h" | "4h" | "1d",
    startMs: number,
    endMs: number,
    limit = 1000
): Promise<Kline[]> {
    const out: Kline[] = [];
    let cursor = startMs;

    while (cursor <= endMs) {
        const url = new URL(`${REST_BASE}/klines`);
        url.searchParams.set("symbol", symbol.toUpperCase());
        url.searchParams.set("interval", interval);
        url.searchParams.set("startTime", String(cursor));
        url.searchParams.set("endTime", String(endMs));
        url.searchParams.set("limit", String(limit));

        const res = await fetch(url.toString());
        if (!res.ok) {
            console.error("Futures klines error:", await res.text());
            break;
        }

        const batch = (await res.json()) as Kline[];
        if (!batch.length) break;

        out.push(...batch);

        const lastOpen = batch[batch.length - 1][0]; // openTime ms
        const stepMs = klineStepMs(interval);
        const next = lastOpen + stepMs;

        if (next <= cursor) break;
        cursor = next;

        if (batch.length < limit) break;
    }

    return out;
}

const REQUESTS = 9; // ✅ 8 or 9 requests

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/*
 * ------------------------- 1m klines -------------------------
 */

async function fetchFuturesKlines1m(params: {
    symbol: string;
    interval: "1m";
    limit: number;
    endTime?: number;
}): Promise<Kline[]> {
    const { symbol, interval, limit, endTime } = params;

    const url = new URL(`${REST_BASE}/klines`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));
    if (endTime !== undefined) url.searchParams.set("endTime", String(endTime));

    let attempt = 0;
    let backoff = 400;

    while (attempt < 6) {
        attempt++;
        try {
            const res = await fetch(url.toString());
            if (res.ok) return (await res.json()) as Kline[];

            const text = await res.text();
            if (res.status === 429 || res.status === 418) {
                console.warn(
                    `Futures REST throttled (${res.status}). attempt=${attempt} backoff=${backoff}ms`,
                    text
                );
                await sleep(backoff);
                backoff = Math.min(4000, Math.floor(backoff * 1.7));
                continue;
            }

            console.error("Futures klines error:", res.status, text);
            return [];
        } catch (e) {
            console.warn(`Futures REST network error attempt=${attempt}`, e);
            await sleep(backoff);
            backoff = Math.min(4000, Math.floor(backoff * 1.7));
        }
    }

    console.error("Futures klines exhausted retries");
    return [];
}


export async function fetchInitial1mHistory(symbol: string): Promise<Kline[]> {
    // paginate backward from "now" with multiple requests
    let endTime = Date.now();

    // dedupe by openTime
    const byOpenTime = new Map<number, Kline>();

    for (let i = 0; i < REQUESTS; i++) {
        const batch = await fetchFuturesKlines1m({
            symbol,
            interval: "1m",
            limit: BINANCE_KLINES_LIMIT,
            endTime,
        });

        if (!batch.length) {
            console.warn(`[Futures 1m] batch ${i + 1}/${REQUESTS} returned empty`);
            break;
        }

        for (const k of batch) byOpenTime.set(k[0], k);

        const batchFirst = batch[0][0];
        const batchLast = batch[batch.length - 1][0];

        console.warn(
            `[Futures 1m] batch ${i + 1}/${REQUESTS} bars=${batch.length} range=${new Date(
                batchFirst
            ).toISOString()} .. ${new Date(batchLast).toISOString()}`
        );

        // move backward: next endTime is just before earliest candle in this batch
        endTime = batchFirst - 1;

        await sleep(120);

        // if server gave fewer than LIMIT, you hit oldest available
        if (batch.length < BINANCE_KLINES_LIMIT) break;
    }

    // map -> sorted asc
    const all = Array.from(byOpenTime.values()).sort((a, b) => a[0] - b[0]);

    // take latest 7200 (5D)
    const sliced = all.slice(-MAX_1M_BARS);

    if (sliced.length) {
        console.warn(
            `[Futures 1m initial FINAL] bars=${sliced.length} range=${new Date(
                sliced[0][0]
            ).toISOString()} .. ${new Date(sliced[sliced.length - 1][0]).toISOString()}`
        );
    } else {
        console.warn("[Futures 1m initial FINAL] no data loaded");
    }

    return sliced;
}

export async function fetchOlder1mKlines(symbol: string, endTime: number): Promise<Kline[]> {
    const batch = await fetchFuturesKlines1m({
        symbol,
        interval: "1m",
        limit: BINANCE_KLINES_LIMIT,
        endTime,
    });

    if (batch.length) {
        console.warn(
            `[Futures 1m older] bars=${batch.length} range=${new Date(
                batch[0][0]
            ).toISOString()} .. ${new Date(batch[batch.length - 1][0]).toISOString()}`
        );
    }

    return batch;
}



/*
 * ------------------------- 5m klines -------------------------
 */

async function fetchFuturesKlines5m(params: {
    symbol: string;
    interval: "5m";
    limit: number;
    endTime?: number;
}): Promise<Kline[]> {
    const { symbol, interval, limit, endTime } = params;

    const url = new URL(`${REST_BASE}/klines`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));
    if (endTime !== undefined) url.searchParams.set("endTime", String(endTime));

    let attempt = 0;
    let backoff = 400;

    while (attempt < 6) {
        attempt++;
        try {
            const res = await fetch(url.toString());
            if (res.ok) return (await res.json()) as Kline[];

            const text = await res.text();
            if (res.status === 429 || res.status === 418) {
                console.warn(
                    `Futures REST throttled (${res.status}). attempt=${attempt} backoff=${backoff}ms`,
                    text
                );
                await sleep(backoff);
                backoff = Math.min(4000, Math.floor(backoff * 1.7));
                continue;
            }

            console.error("Futures klines error:", res.status, text);
            return [];
        } catch (e) {
            console.warn(`Futures REST network error attempt=${attempt}`, e);
            await sleep(backoff);
            backoff = Math.min(4000, Math.floor(backoff * 1.7));
        }
    }

    console.error("Futures klines exhausted retries");
    return [];
}


export async function fetchInitial5mHistory(symbol: string): Promise<Kline[]> {
    // paginate backward from "now" with multiple requests
    let endTime = Date.now();

    // dedupe by openTime
    const byOpenTime = new Map<number, Kline>();

    for (let i = 0; i < REQUESTS; i++) {
        const batch = await fetchFuturesKlines5m({
            symbol,
            interval: "5m",
            limit: BINANCE_KLINES_LIMIT,
            endTime,
        });

        if (!batch.length) {
            console.warn(`[Futures 5m] batch ${i + 1}/${REQUESTS} returned empty`);
            break;
        }

        for (const k of batch) byOpenTime.set(k[0], k);

        const batchFirst = batch[0][0];
        const batchLast = batch[batch.length - 1][0];

        console.warn(
            `[Futures 5m] batch ${i + 1}/${REQUESTS} bars=${batch.length} range=${new Date(
                batchFirst
            ).toISOString()} .. ${new Date(batchLast).toISOString()}`
        );

        // move backward: next endTime is just before earliest candle in this batch
        endTime = batchFirst - 1;

        await sleep(120);

        // if server gave fewer than LIMIT, you hit oldest available
        if (batch.length < BINANCE_KLINES_LIMIT) break;
    }

    // map -> sorted asc
    const all = Array.from(byOpenTime.values()).sort((a, b) => a[0] - b[0]);

    // take latest 7200 (5D)
    const sliced = all.slice(-MAX_5M_BARS);

    if (sliced.length) {
        console.warn(
            `[Futures 5m initial FINAL] bars=${sliced.length} range=${new Date(
                sliced[0][0]
            ).toISOString()} .. ${new Date(sliced[sliced.length - 1][0]).toISOString()}`
        );
    } else {
        console.warn("[Futures 5m initial FINAL] no data loaded");
    }

    return sliced;
}

export async function fetchOlder5mKlines(symbol: string, endTime: number): Promise<Kline[]> {
    const batch = await fetchFuturesKlines5m({
        symbol,
        interval: "5m",
        limit: BINANCE_KLINES_LIMIT,
        endTime,
    });

    if (batch.length) {
        console.warn(
            `[Futures 5m older] bars=${batch.length} range=${new Date(
                batch[0][0]
            ).toISOString()} .. ${new Date(batch[batch.length - 1][0]).toISOString()}`
        );
    }

    return batch;
}

/**
 * Fetch older 5m klines strictly before `beforeMs` (exclusive).
 * We fetch a window ending at beforeMs and return ascending.
 */
export async function fetchFuturesKlines5mOlder(
    symbol: string,
    beforeMs: number,
    bars: number
): Promise<Kline[]> {
    // 5m bars -> duration
    const windowMs = bars * 300_000;
    const start = Math.max(0, beforeMs - windowMs);
    const end = beforeMs - 1;

    const batch = await fetchFuturesKlinesBetween(symbol, "5m", start, end, 1000);
    // Keep only strictly older
    return batch.filter((k) => k[0] < beforeMs);
}

/**
 * Utility: map a 10m Candle to the lightweight-charts time type.
 */
export function candleTimeMs(c: Candle) {
    return Number(c.time) * 1000;
}

export function make10mCandleFromMs(args: {
    tMs: number; // openTime ms
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}): Candle {
    const bucket = Math.floor(args.tMs / BUCKET_MS_10M);
    return {
        bucket,
        time: Math.floor(args.tMs / 1000) as UTCTimestamp,
        open: args.open,
        high: args.high,
        low: args.low,
        close: args.close,
        volume: args.volume,
    };
}





