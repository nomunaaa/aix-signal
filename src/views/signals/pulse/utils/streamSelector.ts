import type {
  SignalStreamId,
  SignalStreamOptionFilter,
  SignalStreamOptionId,
  SignalTrendMode,
  SignalTrendModeFilter,
} from '../types/pulse.types';

export const SIGNAL_STREAM_OPTION_IDS: readonly SignalStreamOptionId[] = [
  'P1',
  'P2',
  'P3',
  'B1',
  'B2',
  'B3',
  'W1',
  'W2',
  'W3',
];

export const DEFAULT_SIGNAL_STREAM_OPTION_FILTER: SignalStreamOptionFilter = {
  P1: true,
  P2: false,
  P3: false,
  B1: false,
  B2: false,
  B3: false,
  W1: true,
  W2: false,
  W3: false,
};

export type SignalOptionTone = 'pulse' | 'beat' | 'wave';

export const SIGNAL_OPTION_BADGE_CLASS: Record<SignalOptionTone, string> = {
  pulse: 'bg-red-500 text-white',
  beat: 'bg-emerald-500 text-white',
  wave: 'bg-blue-500 text-white',
};

/**
 * 선택되지 않은 시그널 배지 — 테두리만 있는 형태. 채워진 배지는 "선택됨"을
 * 뜻하므로, 단순히 어떤 시그널인지 라벨로만 보여 주는 곳에서도 이 스타일을 쓴다.
 * 테두리 두께는 쓰는 쪽에서 `border`로 준다.
 */
export const SIGNAL_OPTION_OUTLINE_CLASS: Record<SignalOptionTone, string> = {
  pulse: 'border-red-500 bg-background text-red-700 dark:text-red-400',
  beat: 'border-emerald-500 bg-background text-emerald-700 dark:text-emerald-400',
  wave: 'border-blue-500 bg-background text-blue-700 dark:text-blue-400',
};

export function signalOptionTone(optionId: string): SignalOptionTone {
  if (optionId.startsWith('B')) return 'beat';
  return optionId.startsWith('W') ? 'wave' : 'pulse';
}

export function optionIdForSignal(
  stream: SignalStreamId,
  trendMode: SignalTrendMode
): SignalStreamOptionId {
  const prefix = stream === 'pulse' ? 'P' : stream === 'beat' ? 'B' : 'W';
  const suffix = trendMode === 'reversal' ? '1' : trendMode === 'trend' ? '2' : '3';
  return `${prefix}${suffix}` as SignalStreamOptionId;
}

export function streamOptionMatchesSignal(
  filter: SignalStreamOptionFilter,
  stream: SignalStreamId,
  trendMode: SignalTrendMode | null
): boolean {
  return trendMode != null && filter[optionIdForSignal(stream, trendMode)];
}

export function baseStreamFilterFromOptions(
  filter: SignalStreamOptionFilter
): Record<SignalStreamId, boolean> {
  return {
    pulse: filter.P1 || filter.P2 || filter.P3,
    beat: filter.B1 || filter.B2 || filter.B3,
    wave: filter.W1 || filter.W2 || filter.W3,
  };
}

export function trendModeFilterFromOptions(
  filter: SignalStreamOptionFilter
): SignalTrendModeFilter {
  return {
    reversal: filter.P1 || filter.B1 || filter.W1,
    trend: filter.P2 || filter.B2 || filter.W2,
    nonTrend: filter.P3 || filter.B3 || filter.W3,
  };
}
