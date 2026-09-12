import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { SignalStreamId } from '../types/pulse.types';
import type { HistoryDatePeriod } from '../utils/historyDateRange';

type StreamWinRates = Partial<Record<SignalStreamId, number>>;

type StreamStatsRow = {
  symbol: string | null;
  barinterval: string | null;
  entries: number | string | null;
  win_count: number | string | null;
};

const proofStatsClient = supabase as unknown as SupabaseClient;

function periodToProofInterval(period: HistoryDatePeriod): 'last_30d' | 'last_3mo' | 'all_time' {
  if (period === '90d') return 'last_3mo';
  if (period === 'all') return 'all_time';
  return 'last_30d';
}

function finiteNumber(value: number | string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Arithmetic mean of the qualified symbols' own win rates, per stream. */
export function useStreamWinRates({
  enabled,
  qualifiedSymbols,
  period,
}: {
  enabled: boolean;
  qualifiedSymbols: readonly string[];
  period: HistoryDatePeriod;
}): StreamWinRates {
  const [rates, setRates] = useState<StreamWinRates>({});
  const symbolsKey = useMemo(
    () =>
      [...new Set(qualifiedSymbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
        .sort()
        .join(','),
    [qualifiedSymbols]
  );

  useEffect(() => {
    const symbols = symbolsKey ? symbolsKey.split(',') : [];
    if (!enabled || symbols.length === 0) {
      setRates({});
      return;
    }

    let cancelled = false;
    void proofStatsClient
      .from('proof_stats')
      .select('symbol,barinterval,entries,win_count')
      .eq('scope', 'symbol')
      .eq('trading_category', 'E2X2')
      .eq('trend', 'reversal')
      .in('category', ['standard', 'discounted'])
      .eq('timeinterval', periodToProofInterval(period))
      .in('barinterval', ['1m', '10m'])
      .in('symbol', symbols)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Signal Board stream win-rate query failed:', error);
          setRates({});
          return;
        }

        const values: Record<SignalStreamId, number[]> = { pulse: [], wave: [] };
        for (const row of (data ?? []) as StreamStatsRow[]) {
          const stream =
            row.barinterval === '1m' ? 'pulse' : row.barinterval === '10m' ? 'wave' : null;
          const entries = finiteNumber(row.entries);
          const wins = finiteNumber(row.win_count);
          if (stream && entries > 0) values[stream].push((wins / entries) * 100);
        }
        setRates({
          pulse: values.pulse.length
            ? values.pulse.reduce((sum, value) => sum + value, 0) / values.pulse.length
            : undefined,
          wave: values.wave.length
            ? values.wave.reduce((sum, value) => sum + value, 0) / values.wave.length
            : undefined,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, period, symbolsKey]);

  return rates;
}
