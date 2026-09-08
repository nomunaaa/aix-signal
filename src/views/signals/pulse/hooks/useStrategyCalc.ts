import { useQuery } from '@tanstack/react-query';
import type {
  StrategyStats,
  StrategyId,
  StrategyStatsWithPeriod,
  SignalStreamId,
  GateKpi30d,
} from '../types/pulse.types';
import {
  PULSE_MOCK_STRATEGY_STATS_LIST,
  PULSE_MOCK_STATS_7D,
  PULSE_MOCK_STATS_24H,
  PULSE_MOCK_STATS_30D_BY_STREAM,
  PULSE_MOCK_STATS_30D_BY_STRATEGY,
} from '@/lib/mock/pulse-strategy-source';

export interface UseStrategyCalcReturn {
  strategies: StrategyStats[];
  recommended: StrategyId;
  stats24h: Record<StrategyId, StrategyStatsWithPeriod>;
  stats7d: Record<StrategyId, StrategyStatsWithPeriod>;
  /** 스트림 카드용 — 최근 30일 집계 */
  stats30dByStream: Record<SignalStreamId, GateKpi30d>;
  /** 선택 스트림 기준 전략별 30일 */
  stats30dByStrategy: Record<SignalStreamId, Record<StrategyId, GateKpi30d>>;
  isLoading: boolean;
}

async function fetchStrategyStats(): Promise<StrategyStats[]> {
  // TODO Phase 2: const res = await fetch('/api/strategies/stats'); return res.json();
  return PULSE_MOCK_STRATEGY_STATS_LIST;
}

export function useStrategyCalc(): UseStrategyCalcReturn {
  const { data, isLoading } = useQuery({
    queryKey: ['pulse', 'strategy-stats'],
    queryFn: fetchStrategyStats,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const strategies = data ?? [];

  // sharpeRatio 최고 전략을 추천으로
  const recommended: StrategyId =
    strategies.length > 0
      ? strategies.reduce((best, s) => (s.sharpeRatio > best.sharpeRatio ? s : best)).id
      : 'safe';

  return {
    strategies,
    recommended,
    stats24h: PULSE_MOCK_STATS_24H,
    stats7d: PULSE_MOCK_STATS_7D,
    stats30dByStream: PULSE_MOCK_STATS_30D_BY_STREAM,
    stats30dByStrategy: PULSE_MOCK_STATS_30D_BY_STRATEGY,
    isLoading,
  };
}
