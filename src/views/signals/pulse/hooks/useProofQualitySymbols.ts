import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { SignalStreamId } from '../types/pulse.types';
import type { HistoryDatePeriod } from '../utils/historyDateRange';

type ProofQualityRow = {
  symbol: string | null;
  entries: number | string | null;
  win_count: number | string | null;
  loss_count: number | string | null;
  wins_per_entry_notional_rate_sum: number | string | null;
  losses_per_entry_notional_rate_abs_sum: number | string | null;
};

type QualityAccumulator = {
  entries: number;
  wins: number;
  losses: number;
  winRateSum: number;
  lossRateAbsSum: number;
};

// `proof_stats` is deployed but has not yet been added to the generated client schema.
// Keep this query isolated from the generated table union until the schema is regenerated.
const proofStatsClient = supabase as unknown as SupabaseClient;

function finiteNumber(value: number | string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function proofTimeinterval(period: HistoryDatePeriod): 'last_30d' | 'last_3mo' | 'all_time' {
  if (period === '90d') return 'last_3mo';
  if (period === 'all') return 'all_time';
  return 'last_30d';
}

export function useProofQualitySymbols({
  enabled,
  symbols,
  streamFilter,
  period,
  minWinRate,
  minRiskReward,
}: {
  enabled: boolean;
  symbols: readonly string[];
  streamFilter: Record<SignalStreamId, boolean>;
  period: HistoryDatePeriod;
  minWinRate: number;
  minRiskReward: number;
}): { qualifiedSymbols: ReadonlySet<string>; loading: boolean } {
  const symbolsKey = useMemo(
    () =>
      [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
        .sort()
        .join(','),
    [symbols]
  );
  const [rows, setRows] = useState<ProofQualityRow[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    const scopedSymbols = symbolsKey ? symbolsKey.split(',') : [];
    const barIntervals = [
      streamFilter.pulse ? '1m' : null,
      streamFilter.wave ? '10m' : null,
    ].filter((value): value is '1m' | '10m' => value !== null);

    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    if (scopedSymbols.length === 0 || barIntervals.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void proofStatsClient
      .from('proof_stats')
      .select(
        'symbol,entries,win_count,loss_count,wins_per_entry_notional_rate_sum,losses_per_entry_notional_rate_abs_sum'
      )
      .eq('scope', 'symbol')
      .eq('trading_category', 'E2X2')
      .eq('trend', 'reversal')
      .eq('timeinterval', proofTimeinterval(period))
      .in('category', ['standard', 'discounted'])
      .in('barinterval', barIntervals)
      .in('symbol', scopedSymbols)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Signal Board proof quality query failed:', error);
          setRows([]);
        } else {
          setRows((data ?? []) as ProofQualityRow[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, period, streamFilter.pulse, streamFilter.wave, symbolsKey]);

  const qualifiedSymbols = useMemo(() => {
    if (!enabled) return new Set(symbolsKey ? symbolsKey.split(',') : []);

    const bySymbol = new Map<string, QualityAccumulator>();
    for (const row of rows) {
      const symbol = row.symbol?.trim().toUpperCase();
      if (!symbol) continue;
      const current = bySymbol.get(symbol) ?? {
        entries: 0,
        wins: 0,
        losses: 0,
        winRateSum: 0,
        lossRateAbsSum: 0,
      };
      current.entries += finiteNumber(row.entries);
      current.wins += finiteNumber(row.win_count);
      current.losses += finiteNumber(row.loss_count);
      current.winRateSum += finiteNumber(row.wins_per_entry_notional_rate_sum);
      current.lossRateAbsSum += finiteNumber(row.losses_per_entry_notional_rate_abs_sum);
      bySymbol.set(symbol, current);
    }

    const result = new Set<string>();
    for (const [symbol, stats] of bySymbol) {
      if (stats.entries <= 0 || stats.wins <= 0 || stats.losses <= 0) continue;
      const winRate = (stats.wins / stats.entries) * 100;
      const avgWin = stats.winRateSum / stats.wins;
      const avgLoss = stats.lossRateAbsSum / stats.losses;
      const riskReward = avgLoss > 0 ? avgWin / avgLoss : 0;
      if (winRate >= minWinRate && riskReward >= minRiskReward) result.add(symbol);
    }
    return result;
  }, [enabled, minRiskReward, minWinRate, rows, symbolsKey]);

  return { qualifiedSymbols, loading };
}
