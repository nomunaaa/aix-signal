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

/**
 * 점수는 스트림이 아니라 '열려 있는 사이클 수'로 센다. Beat는 Pulse와 같은 1분봉을
 * 쓰므로 barinterval로는 둘이 구분되지 않는데, 사이클 수로 세면 Beat 시그널이 하나
 * 더 열린 만큼 그대로 4점이 더해진다 — 스트림을 구분하지 않고도 반영된다.
 *
 * 인자는 각 봉 간격에서 열려 있는 사이클 개수다.
 */
export function signalOpenCount(pulseOpenCycles: number, waveOpenCycles: number): number {
  return Math.max(0, pulseOpenCycles) + Math.max(0, waveOpenCycles);
}

export function signalPoint(pulseOpenCycles: number, waveOpenCycles: number): number {
  const pulseCount = Math.max(0, pulseOpenCycles);
  const waveCount = Math.max(0, waveOpenCycles);
  // 열린 사이클 하나당 4점. 1분봉과 10분봉이 동시에 열려 있을 때의 +6은 그대로 둔다.
  return (pulseCount + waveCount) * 4 + (pulseCount > 0 && waveCount > 0 ? 6 : 0);
}

function openCycleCount(
  explicit: number | undefined,
  signal: TrendBoardSignalKind
): number {
  // 개수를 넘기지 않은 호출부는 예전처럼 '시그널이 있으면 1개'로 본다.
  return explicit ?? (signal !== 'none' ? 1 : 0);
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
  pulseOpenCycles,
  waveOpenCycles,
}: {
  pulse?: TrendBoardStreamPointInput | null;
  wave?: TrendBoardStreamPointInput | null;
  /** 해당 봉 간격에서 열려 있는 사이클 수. 생략하면 시그널 유무로 0/1을 쓴다. */
  pulseOpenCycles?: number;
  waveOpenCycles?: number;
}): number {
  const pulseView = pulse ?? EMPTY_STREAM_POINT_INPUT;
  const waveView = wave ?? EMPTY_STREAM_POINT_INPUT;

  return (
    trendBaseScore(pulseView.shortTrend, pulseView.longTrend) +
    trendBaseScore(waveView.shortTrend, waveView.longTrend) +
    signalPoint(
      openCycleCount(pulseOpenCycles, pulseView.signal),
      openCycleCount(waveOpenCycles, waveView.signal)
    ) +
    trendSignalAdjustmentPoint(pulseView) +
    trendSignalAdjustmentPoint(waveView)
  );
}
