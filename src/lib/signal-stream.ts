/**
 * Signal board stream discriminator.
 * Pulse/Beat share barinterval `1m`; Wave is `10m`.
 * Prefer `signal_name` over barinterval when both are available.
 */

export type SignalBoardStreamId = 'pulse' | 'beat' | 'wave';

export type SignalStreamName = 'pulse_signal-1' | 'beat_signal-1' | 'wave_signal-1';

export const SIGNAL_BOARD_STREAM_IDS: readonly SignalBoardStreamId[] = [
  'pulse',
  'beat',
  'wave',
] as const;

export const STREAM_TO_BAR_INTERVAL: Record<SignalBoardStreamId, '1m' | '10m'> = {
  pulse: '1m',
  beat: '1m',
  wave: '10m',
};

export const STREAM_TO_SIGNAL_NAME: Record<SignalBoardStreamId, SignalStreamName> = {
  pulse: 'pulse_signal-1',
  beat: 'beat_signal-1',
  wave: 'wave_signal-1',
};

export const SIGNAL_NAME_TO_STREAM: Record<SignalStreamName, SignalBoardStreamId> = {
  'pulse_signal-1': 'pulse',
  'beat_signal-1': 'beat',
  'wave_signal-1': 'wave',
};

export function normalizeSignalStreamName(
  value: string | null | undefined,
  barinterval?: string | null
): SignalStreamName {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'pulse_signal-1') return 'pulse_signal-1';
  if (normalized === 'beat_signal-1') return 'beat_signal-1';
  if (normalized === 'wave_signal-1') return 'wave_signal-1';
  return barinterval === '10m' ? 'wave_signal-1' : 'pulse_signal-1';
}

export function streamFromSignalName(
  value: string | null | undefined,
  barinterval?: string | null
): SignalBoardStreamId {
  return SIGNAL_NAME_TO_STREAM[normalizeSignalStreamName(value, barinterval)];
}

export function signalNamesForStreamFilter(
  filter: Partial<Record<SignalBoardStreamId, boolean>>
): SignalStreamName[] {
  return SIGNAL_BOARD_STREAM_IDS.filter((id) => filter[id]).map((id) => STREAM_TO_SIGNAL_NAME[id]);
}

export function barIntervalsForStreamFilter(
  filter: Partial<Record<SignalBoardStreamId, boolean>>
): Array<'1m' | '10m'> {
  const intervals = new Set<'1m' | '10m'>();
  for (const id of SIGNAL_BOARD_STREAM_IDS) {
    if (filter[id]) intervals.add(STREAM_TO_BAR_INTERVAL[id]);
  }
  return Array.from(intervals);
}

export function hasAnyStreamSelected(
  filter: Partial<Record<SignalBoardStreamId, boolean>>
): boolean {
  return SIGNAL_BOARD_STREAM_IDS.some((id) => filter[id]);
}
