export type EntryTrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';
export type SignalTrendMode = 'trend' | 'nonTrend' | 'reversal';
export type SignalTrendModeFilterShape = Record<SignalTrendMode, boolean>;

export const SIGNAL_TREND_MODES: readonly SignalTrendMode[] = [
  'trend',
  'nonTrend',
  'reversal',
];

export const DEFAULT_SIGNAL_TREND_MODE_FILTER: SignalTrendModeFilterShape = {
  trend: true,
  nonTrend: true,
  reversal: true,
};

export function normalizeSignalDirection(value: unknown): 'long' | 'short' | null {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'long' || normalized === 'buy') return 'long';
  if (normalized === 'short' || normalized === 'sell') return 'short';
  return null;
}

export function normalizeEntryTrendDirection(value: unknown): EntryTrendDirection | null {
  if (typeof value === 'string' && value.trim() !== '') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'UP' || normalized === 'LONG') return 'UP';
    if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
    if (normalized === 'NEUTRAL' || normalized === 'NONE' || normalized === '0') return 'NEUTRAL';
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 0) return 'UP';
  if (parsed < 0) return 'DOWN';
  return 'NEUTRAL';
}

export function normalizeSignalTrendMode(value: unknown): SignalTrendMode | null {
  return SIGNAL_TREND_MODES.includes(value as SignalTrendMode)
    ? (value as SignalTrendMode)
    : null;
}

export function selectedSignalTrendModes(
  filter: SignalTrendModeFilterShape
): SignalTrendMode[] {
  return SIGNAL_TREND_MODES.filter((mode) => filter[mode]);
}

export function isAllSignalTrendModesSelected(filter: SignalTrendModeFilterShape): boolean {
  return SIGNAL_TREND_MODES.every((mode) => filter[mode]);
}

export function hasAnySignalTrendModeSelected(filter: SignalTrendModeFilterShape): boolean {
  return SIGNAL_TREND_MODES.some((mode) => filter[mode]);
}

export function resolveSignalTrendModeFromEntryTrends(input: {
  direction?: unknown;
  shortTrend?: unknown;
  longTrend?: unknown;
}): SignalTrendMode | null {
  const direction = normalizeSignalDirection(input.direction);
  if (direction !== 'long') return null;

  const longTrend = normalizeEntryTrendDirection(input.longTrend);
  const shortTrend = normalizeEntryTrendDirection(input.shortTrend);

  if (longTrend === 'UP') {
    if (shortTrend === 'UP' || shortTrend === 'DOWN') return 'trend';
    if (shortTrend === 'NEUTRAL') return 'nonTrend';
  }

  if (longTrend === 'DOWN') {
    if (shortTrend === 'UP' || shortTrend === 'DOWN') return 'reversal';
    if (shortTrend === 'NEUTRAL') return 'nonTrend';
  }

  return null;
}
