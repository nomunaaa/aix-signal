import type { TrendType } from "@/types/signal";

export const TEN_MIN_MS = 10 * 60 * 1000;

export type Timeframe = "2h" | "4h" | "6h";

export const TIMEFRAMES: { value: Timeframe; label: string; ms: number }[] = [
  { value: "2h", label: "2H", ms: 2 * 60 * 60 * 1000 },
  { value: "4h", label: "4H", ms: 4 * 60 * 60 * 1000 },
  { value: "6h", label: "6H", ms: 6 * 60 * 60 * 1000 },
];

export const INITIAL_DAYS = 6;
export const BACKFILL_DAYS = 3;
export const MAX_VISIBLE_CANDLES = (10 * 24 * 60) / 10;
export const LEFT_PAD_SLOTS = 0;
export const RIGHT_PAD_SLOTS = 60;
export const FIFTEEN_SEC_MS = 15 * 1000;

// ----- Color helpers -----

export function longBgColorFromValue(v: number): string {
  if (v === 100) return "rgba(255, 215, 0, 0.15)"; // light green
  if (v === 0) return "rgba(156, 163, 175, 0.08)"; // light gray
  if (v === -100) return "rgba(239, 68, 68, 0.15)"; // light red
  return "transparent";
}

export function shortCandleColorFromValue(v: number): string {
  if (v === 100) return "#22c55e"; // green
  if (v === 0) return "#9ca3af"; // gray
  if (v === -100) return "#ef4444"; // red
  return "";
}

export function trendBgColorFromType(
  value: number,
  type?: TrendType
): string {
  if (type === "trend_short") {
    return shortTrendBgColorFromValue(value);
  }
  return longBgColorFromValue(value);
}

function shortTrendBgColorFromValue(v: number): string {
  if (v === 100) return "rgba(34, 197, 94, 0.15)";
  if (v === 0) return "rgba(156, 163, 175, 0.08)";
  if (v === -100) return "rgba(239, 68, 68, 0.15)";
  return "transparent";
}
