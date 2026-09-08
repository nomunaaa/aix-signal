import type { SymbolAnalysis } from '@/lib/mock/trend-v8-mock';

export type TrendBoardTrendKind = 'up' | 'down' | 'none';
export type TrendBoardSignalKind = 'long' | 'short' | 'none';

export type TrendBoardStreamPointInput = {
  shortTrend: TrendBoardTrendKind;
  longTrend: TrendBoardTrendKind;
  signal: TrendBoardSignalKind;
};

const EMPTY_STREAM_POINT_INPUT: TrendBoardStreamPointInput = {
  shortTrend: 'none',
  longTrend: 'none',
  signal: 'none',
};

export function trendKind(scale: SymbolAnalysis['shortTermTrend']['scale']): TrendBoardTrendKind {
  if (scale === 'long' || scale === 'strong_long') return 'up';
  if (scale === 'short' || scale === 'strong_short') return 'down';
  return 'none';
}

export function trendBaseScore(
  shortTrend: TrendBoardTrendKind,
  longTrend: TrendBoardTrendKind
): number {
  return (shortTrend !== 'none' ? 3 : 0) + (longTrend !== 'none' ? 3 : 0);
}

export function signalOpenCount(
  pulseSignal: TrendBoardSignalKind,
  waveSignal: TrendBoardSignalKind
): number {
  return (pulseSignal !== 'none' ? 1 : 0) + (waveSignal !== 'none' ? 1 : 0);
}

export function signalPoint(
  pulseSignal: TrendBoardSignalKind,
  waveSignal: TrendBoardSignalKind
): number {
  const pulseOpen = pulseSignal !== 'none';
  const waveOpen = waveSignal !== 'none';
  return (pulseOpen ? 4 : 0) + (waveOpen ? 4 : 0) + (pulseOpen && waveOpen ? 6 : 0);
}

function signalKindFromTrend(kind: TrendBoardTrendKind): TrendBoardSignalKind {
  if (kind === 'up') return 'long';
  if (kind === 'down') return 'short';
  return 'none';
}

export function trendSignalAdjustmentPoint(view: TrendBoardStreamPointInput): number {
  if (view.signal === 'none') return 0;
  if (view.shortTrend === 'none' || view.longTrend === 'none') return 0;
  if (view.shortTrend !== view.longTrend) return 0;

  const alignedTrendSignal = signalKindFromTrend(view.shortTrend);
  if (alignedTrendSignal === 'none') return 0;

  return alignedTrendSignal === view.signal ? 3 : -6;
}

export function calculateTrendBoardPoint({
  pulse,
  wave,
}: {
  pulse?: TrendBoardStreamPointInput | null;
  wave?: TrendBoardStreamPointInput | null;
}): number {
  const pulseView = pulse ?? EMPTY_STREAM_POINT_INPUT;
  const waveView = wave ?? EMPTY_STREAM_POINT_INPUT;

  return (
    trendBaseScore(pulseView.shortTrend, pulseView.longTrend) +
    trendBaseScore(waveView.shortTrend, waveView.longTrend) +
    signalPoint(pulseView.signal, waveView.signal) +
    trendSignalAdjustmentPoint(pulseView) +
    trendSignalAdjustmentPoint(waveView)
  );
}
