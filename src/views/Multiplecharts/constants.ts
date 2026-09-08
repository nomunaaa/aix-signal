// src/pages/Multiplecharts/constants.ts

// bucket size
export const BUCKET_MS_1M = 60_000; // 1 minute in milliseconds
export const BUCKET_MS_5M = 300_000; // 5 minutes in milliseconds
export const BUCKET_MS_10M = 600_000; // 10 minutes in milliseconds
export const BUCKET_MS_15M = 900_000; // 15 minutes in milliseconds
export const BUCKET_MS_1H = 3_600_000;
export const BUCKET_MS_4H = 14_400_000;
export const BUCKET_MS_1D = 86_400_000;

export const BARS_PER_HOUR_1M = 60; // 60 bars per hour
export const BARS_PER_HOUR_5M = 12; // 12 bars per hour
export const BARS_PER_HOUR_10M = 6; // 6 bars per hour
export const BARS_PER_HOUR_15M = 4; // 4 bars per hour

export const MAX_1M_BARS = 30 * 24 * BARS_PER_HOUR_1M; // 43200 bars for 30 days
export const MAX_5M_BARS = 60 * 24 * BARS_PER_HOUR_5M; // 17280 bars for 60 days
export const MAX_10M_BARS = 90 * 24 * BARS_PER_HOUR_10M; // 12960 bars for 90 days
export const MAX_15M_BARS = 120 * 24 * BARS_PER_HOUR_15M; // 11520 bars for 120 days
export const MAX_1H_BARS = 4000;
export const MAX_4H_BARS = 3000;
export const MAX_1D_BARS = 2000;

export const BINANCE_KLINES_LIMIT = 1500; // Binance limit

/** Binance kline bucket size for chart bar interval (REST + WS). */
export function resolveChartBucketMs(barInterval: string): number {
    switch (barInterval) {
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

export function resolveMaxCandles(barInterval: string): number {
    switch (barInterval) {
        case "1m":
            return MAX_1M_BARS;
        case "5m":
            return MAX_5M_BARS;
        case "10m":
            return MAX_10M_BARS;
        case "15m":
            return MAX_15M_BARS;
        case "1h":
            return MAX_1H_BARS;
        case "4h":
            return MAX_4H_BARS;
        case "1d":
            return MAX_1D_BARS;
        default:
            return MAX_1M_BARS;
    }
}

export type TfKey1m = "2H" | "4H" | "6H" | "12H" | "5D";
export type TfKey5m = "6H" | "12H" | "1D" | "3D" | "5D";
export type TfKey10m = "6H" | "12H" | "3D" | "5D" | "7D";
export type TfKey15m = "6H" | "12H" | "1D" | "3D" | "5D";

// Bollinger
export const BB_PERIOD = 20;
export const BB_MULTIPLIER = 2;

// ---------- SVG arrows ----------
export const LONG_ENTRY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="8" width="4" height="12" fill="#7AC943" />
  <polygon points="12,3 6,9 18,9" fill="#7AC943" />
</svg>
`;
export const LONG_EXIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="8" width="4" height="12" fill="#7AC943" />
  <polygon points="6,15 18,15 12,21" fill="#7AC943" />
  <rect x="7" y="22" width="10" height="3" fill="#7AC943" />
</svg>
`;
export const SHORT_ENTRY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="4" width="4" height="12" fill="#F7941D" />
  <polygon points="6,15 18,15 12,21" fill="#F7941D" />
</svg>
`;
export const SHORT_EXIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="7" y="-1" width="10" height="3" fill="#F7941D" />
  <polygon points="12,3 6,9 18,9" fill="#F7941D" />
  <rect x="10" y="6" width="4" height="12" fill="#F7941D" />
</svg>
`;

export const ARROW_SIZE = 24;

// ---------- 모의매매(Mock Trade) 화살표 — 실제 시그널(초록/주황)과 헷갈리지 않도록 하늘색 통일 ----------
const MOCK_ARROW_COLOR = "#38BDF8";

export const MOCK_LONG_ENTRY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="8" width="4" height="12" fill="${MOCK_ARROW_COLOR}" />
  <polygon points="12,3 6,9 18,9" fill="${MOCK_ARROW_COLOR}" />
</svg>
`;
export const MOCK_LONG_EXIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="8" width="4" height="12" fill="${MOCK_ARROW_COLOR}" />
  <polygon points="6,15 18,15 12,21" fill="${MOCK_ARROW_COLOR}" />
  <rect x="7" y="22" width="10" height="3" fill="${MOCK_ARROW_COLOR}" />
</svg>
`;
export const MOCK_SHORT_ENTRY_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="10" y="4" width="4" height="12" fill="${MOCK_ARROW_COLOR}" />
  <polygon points="6,15 18,15 12,21" fill="${MOCK_ARROW_COLOR}" />
</svg>
`;
export const MOCK_SHORT_EXIT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect x="7" y="-1" width="10" height="3" fill="${MOCK_ARROW_COLOR}" />
  <polygon points="12,3 6,9 18,9" fill="${MOCK_ARROW_COLOR}" />
  <rect x="10" y="6" width="4" height="12" fill="${MOCK_ARROW_COLOR}" />
</svg>
`;