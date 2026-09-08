import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { calculatePnlBreakdown, DEFAULT_FEE_CONFIG, type PnlBreakdown } from '@/domain/trading/pnlEngine';
import { useSimulationProfile } from '@/domain/trading/simulationProfile';
import type { TradingCategory } from '@/lib/trading-category';
import type { EntryTrendDirection } from '@/types/enhanced-signal';
import type {
  CycleStrategyCompareKey,
  StrategyId,
  StrategyVariantCompare,
} from '@/views/signals/pulse/types/pulse.types';

export interface SignalPair {
  id: string;
  cycle_id?: string | null;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  holdTimeSec: number;
  grossRoePct: number; // 순수 가격 변동률 (승률 계산용, 시뮬레이션 무관)
  pnlPct: number; // Net ROE (PnL 계산용, 시뮬레이션 의존)
  pnlAmount: number;
  barinterval?: '1m' | '10m';
  tradingCategory?: TradingCategory;
  pnlBreakdown?: PnlBreakdown; // 상세 분석
  flow: string | null; // 마지막 위치 (청산 당시 고정된 값)
  /** Entry-time trend snapshots used for trend/non-trend classification. */
  entryTrendShort?: EntryTrendDirection | null;
  entryTrendLong?: EntryTrendDirection | null;
  hasAdditionalBuy?: boolean;
  hasPartialClose?: boolean;
  additionalEntryPrice?: number;
  partialExitPrice?: number;
  partialExitPercent?: number;
  averageEntryPrice?: number;
  strategyId?: StrategyId;
  strategyVariants?: Record<CycleStrategyCompareKey, StrategyVariantCompare>;
}

export interface SymbolHistorySummary {
  totalEntries: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgPnlPct: number;
  totalPnlPct: number;
  totalPnlAmount: number;
  recent30DaysEntries: number;
  monthlyPnlPct: number;
  monthlyPnlAmount: number;
}

export const useSymbolHistory = (symbol: string, daysFilter: number | null = null) => {
  const [pairs, setPairs] = useState<SignalPair[]>([]);
  const [summary, setSummary] = useState<SymbolHistorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 시뮬레이션 프로필 사용
  const { profile } = useSimulationProfile();
  const POSITION_SIZE = profile.baseCapital * profile.entryFraction * profile.defaultLeverage;

  const hasCycleEventValue = (value: unknown) => {
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  };

  const normalizeEntryTrendSnapshot = (value: unknown): EntryTrendDirection | null => {
    if (typeof value === 'string') {
      const normalized = value.trim().toUpperCase();
      if (normalized === 'UP' || normalized === 'LONG') return 'UP';
      if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
      if (normalized === 'NEUTRAL' || normalized === '0') return 'NEUTRAL';
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    if (parsed > 0) return 'UP';
    if (parsed < 0) return 'DOWN';
    return 'NEUTRAL';
  };

  useEffect(() => {
    if (!symbol) return;
    
    fetchHistory();
   
  }, [symbol, daysFilter]);

  async function fetchHistory() {
    try {
      setLoading(true);

      // Calculate cutoff timestamp if filter is applied
      let cutoffDate: string | null = null;
      if (daysFilter) {
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - daysFilter);
        cutoffDate = cutoffTime.toISOString();
      }

      // Fetch from signal_cycles (닫힌 포지션만)
      let query = supabase
        .from('signal_cycles')
        .select('*')
        .eq('symbol', symbol.toUpperCase())
        .eq('is_open', false); // 닫힌 포지션만
      
      if (cutoffDate) {
        query = query.gte('entry_time', cutoffDate);
      }
      
      const { data: cycles, error } = await query.order('exit_time', { ascending: false });

      if (error) throw error;

      if (!cycles || cycles.length === 0) {
        setPairs([]);
        setSummary(null);
        return;
      }

      // Convert signal_cycles to SignalPair format
      const signalPairs: SignalPair[] = cycles.map((cycle) => {
        const entryTime = new Date(cycle.entry_time).getTime() / 1000;
        const exitTime = cycle.exit_time ? new Date(cycle.exit_time).getTime() / 1000 : entryTime;
        const holdTimeSec = cycle.hold_sec || 0;
        const side = cycle.side.toUpperCase() as 'LONG' | 'SHORT';
        const exitPrice = cycle.exit_price || cycle.entry_price;
        
        // Gross ROE 계산 (승률 계산용 - 시뮬레이션 무관)
        const grossRoe = side === 'LONG'
          ? ((exitPrice - cycle.entry_price) / cycle.entry_price) * 100
          : ((cycle.entry_price - exitPrice) / cycle.entry_price) * 100;
        
        // 도메인 엔진 사용: PnL 상세 계산 (시뮬레이션 의존)
        const breakdown = calculatePnlBreakdown(
          cycle.entry_price,
          exitPrice,
          side,
          POSITION_SIZE,
          profile.defaultLeverage,
          {
            ...DEFAULT_FEE_CONFIG,
            useTaker: profile.useTakerFee,
          }
        );

        return {
          id: cycle.id,
          cycle_id: cycle.cycle_id ?? null,
          symbol: cycle.symbol,
          side: cycle.side.toLowerCase() as 'long' | 'short',
          entryPrice: cycle.entry_price,
          exitPrice: exitPrice,
          entryTime,
          exitTime,
          holdTimeSec,
          grossRoePct: grossRoe, // 순수 가격 변동 (승률용)
          pnlPct: breakdown.netRoe, // Net ROE (PnL용)
          pnlAmount: breakdown.pnlAmount,
          pnlBreakdown: breakdown,
          flow: cycle.flow, // 마지막 위치 (청산 당시 고정된 값)
          entryTrendShort: normalizeEntryTrendSnapshot(cycle.entry_trend_short),
          entryTrendLong: normalizeEntryTrendSnapshot(cycle.entry_trend_long),
          hasAdditionalBuy:
            hasCycleEventValue(cycle.added_entry_event_id) ||
            hasCycleEventValue(cycle.added_entry_cycle_id),
          hasPartialClose:
            hasCycleEventValue(cycle.partial_exit_event_id) ||
            hasCycleEventValue(cycle.partial_exit_cycle_id),
        };
      });

      // Calculate summary statistics
      const now = Date.now() / 1000;
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      const recentPairs = signalPairs.filter(p => p.entryTime >= thirtyDaysAgo);
      
      // 승률 계산: Gross ROE 기준 (시뮬레이션 무관)
      const winCount = signalPairs.filter(p => p.grossRoePct >= 0).length;
      const lossCount = signalPairs.filter(p => p.grossRoePct < 0).length;
      const winRate = signalPairs.length > 0 ? (winCount / signalPairs.length) * 100 : 0;

      const totalPnlPct = signalPairs.reduce((sum, p) => sum + p.pnlPct, 0);
      const totalPnlAmount = signalPairs.reduce((sum, p) => sum + p.pnlAmount, 0);
      const avgPnlPct = signalPairs.length > 0 ? totalPnlPct / signalPairs.length : 0;

      const monthlyPnlPct = recentPairs.reduce((sum, p) => sum + p.pnlPct, 0);
      const monthlyPnlAmount = recentPairs.reduce((sum, p) => sum + p.pnlAmount, 0);

      setSummary({
        totalEntries: signalPairs.length,
        winCount,
        lossCount,
        winRate,
        avgPnlPct,
        totalPnlPct,
        totalPnlAmount,
        recent30DaysEntries: recentPairs.length,
        monthlyPnlPct,
        monthlyPnlAmount,
      });

      setPairs(signalPairs); // Already sorted by exit_time desc
    } catch (error) {
      console.error('Failed to fetch symbol history:', error);
    } finally {
      setLoading(false);
    }
  }

  return { pairs, summary, loading, refetch: fetchHistory };
};
