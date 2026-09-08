/**
 * Pulse open-position section rules.
 *
 * Trend classification is based on entry-time trend snapshots for buy/long
 * signals only. Anything outside the defined buy rules resolves to null.
 *
 * Live trend values may change during the cycle, but they must not move an open
 * signal between trend-mode families. PnL may still move trend rows between
 * TREND_DISCOUNT <-> TREND_TP.
 */

import type { EntryTrendDirection, PulseSectionState } from '../types/pulse.types';
import {
  resolveSignalTrendModeFromEntryTrends,
  type SignalTrendMode,
} from '@/lib/signal-trend-mode';

export function resolveSignalTrendModeForSignal(
  direction: 'long' | 'short',
  shortTrend?: EntryTrendDirection | null | undefined,
  longTrend?: EntryTrendDirection | null | undefined,
): SignalTrendMode | null {
  return resolveSignalTrendModeFromEntryTrends({
    direction,
    shortTrend,
    longTrend,
  });
}

export function areShortLongTrendDirectionsAlignedWithSignal(
  direction: 'long' | 'short',
  shortTrend?: EntryTrendDirection | null | undefined,
  longTrend?: EntryTrendDirection | null | undefined,
): boolean {
  return resolveSignalTrendModeForSignal(direction, shortTrend, longTrend) === 'trend';
}

export function derivePulseOpenSectionFromTrendsPnl(input: {
  direction: 'long' | 'short';
  shortTrend?: EntryTrendDirection | null | undefined;
  longTrend?: EntryTrendDirection | null | undefined;
  pnlPercent: number;
}): PulseSectionState {
  const trendMode = resolveSignalTrendModeForSignal(
    input.direction,
    input.shortTrend,
    input.longTrend,
  );

  if (trendMode === 'trend') {
    return input.pnlPercent < 0 ? 'TREND_DISCOUNT' : 'TREND_TP';
  }

  if (trendMode === 'nonTrend') {
    return input.direction === 'long' ? 'NON_TREND_LONG' : 'NON_TREND_SHORT';
  }

  if (trendMode === 'reversal') {
    return 'REVERSAL';
  }

  return 'WAITING_ENTRY';
}
