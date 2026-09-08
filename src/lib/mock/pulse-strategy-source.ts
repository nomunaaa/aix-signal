/**
 * Single source for Pulse strategy board mock KPIs (useStrategyCalc + 액션바 툴바).
 * Phase 2: replace with /api/strategies/stats.
 *
 * 승률은 UI 목업 일관성을 위해 50–80% 밴드로 유지 (종목 통계 `SYMBOL_STATS`와 동일 체감).
 */

import type {
  StrategyStats,
  StrategyId,
  StrategyStatsWithPeriod,
  SignalStreamId,
  GateKpi30d,
} from '@/views/signals/pulse/types/pulse.types';

export const PULSE_MOCK_STRATEGY_STATS_LIST: StrategyStats[] = [
  { id: 'oneshot', winRate: 72.4, returnRate: 16.8, sharpeRatio: 1.8, totalTrades: 342, maxDrawdown: -8.5 },
  { id: 'safe', winRate: 78.2, returnRate: 14.2, sharpeRatio: 2.1, totalTrades: 298, maxDrawdown: -5.2 },
  { id: 'deep', winRate: 66.8, returnRate: 24.5, sharpeRatio: 1.5, totalTrades: 256, maxDrawdown: -12.3 },
  { id: 'full', winRate: 76.1, returnRate: 21.0, sharpeRatio: 1.9, totalTrades: 310, maxDrawdown: -7.8 },
];

export const PULSE_MOCK_STATS_7D: Record<StrategyId, StrategyStatsWithPeriod> = {
  oneshot: { period: '7d', winRate: 72, returnRate: 4.2, mdd: -2.8, sharpeRatio: 1.8, totalTrades: 156, avgReturn: 4.2, avgLoss: -2.1 },
  safe: { period: '7d', winRate: 78, returnRate: 6.3, mdd: -2.2, sharpeRatio: 2.1, totalTrades: 134, avgReturn: 6.3, avgLoss: -1.8 },
  deep: { period: '7d', winRate: 68, returnRate: 8.7, mdd: -4.5, sharpeRatio: 1.6, totalTrades: 98, avgReturn: 8.7, avgLoss: -3.2 },
  full: { period: '7d', winRate: 79, returnRate: 11.2, mdd: -3.8, sharpeRatio: 2.4, totalTrades: 112, avgReturn: 11.2, avgLoss: -2.5 },
};

export const PULSE_MOCK_STATS_24H: Record<StrategyId, StrategyStatsWithPeriod> = {
  oneshot: { period: '24h', winRate: 75, returnRate: 3.8, mdd: -1.5, sharpeRatio: 2.0, totalTrades: 23, avgReturn: 3.8, avgLoss: -1.9 },
  safe: { period: '24h', winRate: 78, returnRate: 5.1, mdd: -1.2, sharpeRatio: 2.3, totalTrades: 19, avgReturn: 5.1, avgLoss: -1.5 },
  deep: { period: '24h', winRate: 65, returnRate: 9.2, mdd: -3.1, sharpeRatio: 1.5, totalTrades: 14, avgReturn: 9.2, avgLoss: -3.8 },
  full: { period: '24h', winRate: 79, returnRate: 10.8, mdd: -2.5, sharpeRatio: 2.6, totalTrades: 16, avgReturn: 10.8, avgLoss: -2.0 },
};

export const PULSE_MOCK_STATS_30D_BY_STREAM: Record<SignalStreamId, GateKpi30d> = {
  pulse: { winRate: 71.2, returnRate: 8.4, pnlUsd: 12420, mdd: -6.2 },
  wave: { winRate: 66.8, returnRate: 11.1, pnlUsd: 9830, mdd: -8.1 },
};

export const PULSE_MOCK_STATS_30D_BY_STRATEGY: Record<SignalStreamId, Record<StrategyId, GateKpi30d>> = {
  pulse: {
    oneshot: { winRate: 69.4, returnRate: 7.1, pnlUsd: 8120, mdd: -5.4 },
    safe: { winRate: 74.2, returnRate: 5.8, pnlUsd: 6640, mdd: -3.9 },
    deep: { winRate: 62.1, returnRate: 10.2, pnlUsd: 9010, mdd: -7.8 },
    full: { winRate: 72.5, returnRate: 9.0, pnlUsd: 7780, mdd: -5.1 },
  },
  wave: {
    oneshot: { winRate: 65.0, returnRate: 9.4, pnlUsd: 6890, mdd: -7.2 },
    safe: { winRate: 70.3, returnRate: 7.6, pnlUsd: 7120, mdd: -5.5 },
    deep: { winRate: 58.6, returnRate: 12.8, pnlUsd: 8450, mdd: -10.4 },
    full: { winRate: 68.9, returnRate: 11.0, pnlUsd: 7920, mdd: -7.0 },
  },
};

/** 액션바·카드에서 동일 숫자로 쓰는 보드 기준 승률(%) — `PULSE_MOCK_STRATEGY_STATS_LIST`와 동기 */
export function getStrategyBoardWinRatePct(id: StrategyId): number {
  return PULSE_MOCK_STRATEGY_STATS_LIST.find((s) => s.id === id)?.winRate ?? 0;
}
