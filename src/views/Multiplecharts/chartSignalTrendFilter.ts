import type { ChartTrendMode } from './types';
import {
  SIGNAL_TREND_MODES,
  normalizeEntryTrendDirection,
  normalizeSignalDirection,
  resolveSignalTrendModeFromEntryTrends,
} from '@/lib/signal-trend-mode';

type TrendSide = 'long' | 'short';
type SignalDirection = 'long' | 'short';
type TrendSign = -1 | 0 | 1;

type SignalTrendInput = {
  direction?: unknown;
  timestamp?: unknown;
  timestamp_ms?: unknown;
  entry_timestamp_ms?: unknown;
  entry_trend_short?: unknown;
  entry_trend_long?: unknown;
};

type TrendEventInput = {
  ts?: unknown;
  timeframe?: unknown;
  type?: unknown;
  value?: unknown;
};

function normalizeDirection(value: unknown): SignalDirection | null {
  return normalizeSignalDirection(value);
}

function normalizeTimestampMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value >= 1_000_000_000_000 ? value : value * 1000;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric >= 1_000_000_000_000 ? numeric : numeric * 1000;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function signalTimestampMs(signal: SignalTrendInput): number | null {
  return normalizeTimestampMs(signal.timestamp_ms) ?? normalizeTimestampMs(signal.timestamp);
}

function trendReferenceTimestampMs(signal: SignalTrendInput): number | null {
  return normalizeTimestampMs(signal.entry_timestamp_ms) ?? signalTimestampMs(signal);
}

function trendSide(event: TrendEventInput): TrendSide | null {
  const raw = `${String(event.type ?? '')} ${String(event.timeframe ?? '')}`.toLowerCase();
  if (raw.includes('long')) return 'long';
  if (raw.includes('short')) return 'short';
  return null;
}

export function normalizeTrendSign(value: unknown): TrendSign | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value > 0) return 1;
    if (value < 0) return -1;
    return 0;
  }

  if (typeof value === 'string') {
    const raw = value.trim().toLowerCase();
    if (raw === 'up' || raw === 'long' || raw === 'bull' || raw === 'bullish') return 1;
    if (raw === 'down' || raw === 'short' || raw === 'bear' || raw === 'bearish') return -1;
    if (raw === '0' || raw === 'flat' || raw === 'neutral' || raw === 'range') return 0;
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return normalizeTrendSign(numeric);
  }

  return null;
}

function latestTrendSignAt(
  trends: TrendEventInput[],
  side: TrendSide,
  timestampMs: number,
): TrendSign | null {
  let latestMs = Number.NEGATIVE_INFINITY;
  let latestSign: TrendSign | null = null;

  for (const trend of trends) {
    if (trendSide(trend) !== side) continue;
    const trendMs = normalizeTimestampMs(trend.ts);
    if (trendMs === null || trendMs > timestampMs || trendMs < latestMs) continue;
    const sign = normalizeTrendSign(trend.value);
    if (sign === null) continue;
    latestMs = trendMs;
    latestSign = sign;
  }

  return latestSign;
}

export function resolveSignalTrendMode(
  signal: SignalTrendInput,
  trends: TrendEventInput[],
): ChartTrendMode | null {
  const direction = normalizeDirection(signal.direction);
  if (!direction) return null;

  const explicitShortTrend = normalizeEntryTrendDirection(signal.entry_trend_short);
  const explicitLongTrend = normalizeEntryTrendDirection(signal.entry_trend_long);
  if (explicitShortTrend != null || explicitLongTrend != null) {
    return resolveSignalTrendModeFromEntryTrends({
      direction,
      shortTrend: explicitShortTrend,
      longTrend: explicitLongTrend,
    });
  }

  const timestampMs = trendReferenceTimestampMs(signal);
  if (timestampMs === null) return null;

  const longTrend = latestTrendSignAt(trends, 'long', timestampMs);
  const shortTrend = latestTrendSignAt(trends, 'short', timestampMs);

  return resolveSignalTrendModeFromEntryTrends({
    direction,
    longTrend,
    shortTrend,
  });
}

export function shouldShowSignalForTrendModes(
  signal: SignalTrendInput,
  trends: TrendEventInput[],
  trendModes: ChartTrendMode[],
): boolean {
  if (trendModes.length === 0) return false;
  const mode = resolveSignalTrendMode(signal, trends);
  if (mode == null) return false;
  if (SIGNAL_TREND_MODES.every((candidate) => trendModes.includes(candidate))) return true;
  return trendModes.includes(mode);
}
