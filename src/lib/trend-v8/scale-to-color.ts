/**
 * 롱/숏 5단계 · 변동량 amber · 시그널 신뢰도 농도 — UI 스타일 (AIX-6 스펙)
 */

import {
  LONG_SHORT_COLORS,
  SIGNAL_RELIABILITY_COLORS,
  VOLATILITY_COLORS,
  type Direction,
  type LongShortScale,
  type SignalReliability,
  type SignalState,
  type VolatilityScale,
} from '@/lib/mock/trend-v8-mock'

export function getLongShortCellStyle(scale: LongShortScale): { backgroundColor: string; color: string } {
  const c = LONG_SHORT_COLORS[scale]
  return { backgroundColor: c.bg, color: c.text }
}

export function getVolatilityCellStyle(scale: VolatilityScale): { backgroundColor: string; color: string } {
  const c = VOLATILITY_COLORS[scale]
  return { backgroundColor: c.bg, color: c.text }
}

/** LIVE/WAIT + 방향 + 신뢰도 → SIGNAL_RELIABILITY_COLORS 키 */
export function getSignalCellStyle(
  state: SignalState,
  direction: Direction | null,
  reliability: SignalReliability,
): { backgroundColor: string; color: string } {
  if (state === 'NONE' || !direction) {
    return { backgroundColor: SIGNAL_RELIABILITY_COLORS.NONE.bg, color: SIGNAL_RELIABILITY_COLORS.NONE.text }
  }
  const tier = reliability ?? 'C'
  const prefix = state === 'LIVE' ? 'LIVE' : 'WAIT'
  const key = `${prefix}_${tier}` as keyof typeof SIGNAL_RELIABILITY_COLORS
  const c = SIGNAL_RELIABILITY_COLORS[key] ?? SIGNAL_RELIABILITY_COLORS.NONE
  return { backgroundColor: c.bg, color: c.text }
}
