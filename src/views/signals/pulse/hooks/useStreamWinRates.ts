import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SignalStreamId } from '../types/pulse.types';
import { historyPeriodStartMs, type HistoryDatePeriod } from '../utils/historyDateRange';

type StreamWinRates = Partial<Record<SignalStreamId, number>>;

export function useStreamWinRates({
  enabled,
  symbols,
  favorites,
  favoritesOnly,
  period,
}: {
  enabled: boolean;
  symbols: readonly string[];
  favorites: ReadonlySet<string>;
  favoritesOnly: boolean;
  period: HistoryDatePeriod;
}): StreamWinRates {
  const [rates, setRates] = useState<StreamWinRates>({});
  const symbolsKey = useMemo(
    () => [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort().join(','),
    [symbols]
  );
  const favoritesKey = useMemo(
    () => [...favorites].map((symbol) => symbol.trim().toUpperCase()).filter(Boolean).sort().join(','),
    [favorites]
  );

  useEffect(() => {
    const allSymbols = symbolsKey ? symbolsKey.split(',') : [];
    const favoriteSet = new Set(favoritesKey ? favoritesKey.split(',') : []);
    const scopedSymbols = favoritesOnly
      ? allSymbols.filter((symbol) => favoriteSet.has(symbol))
      : allSymbols;

    if (!enabled || scopedSymbols.length === 0) {
      setRates({});
      return;
    }

    const periodStartMs = historyPeriodStartMs(period);
    const periodStartIso = periodStartMs === null ? null : new Date(periodStartMs).toISOString();
    let cancelled = false;

    const countFor = async (barinterval: '1m' | '10m', winsOnly: boolean) => {
      let query = supabase
        .from('signal_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('is_open', false)
        .not('exit_time', 'is', null)
        .eq('barinterval', barinterval)
        .eq('trading_category', 'E2X2')
        .eq('entry_trend_long', 'DOWN')
        .in('entry_trend_short', ['UP', 'DOWN'])
        .in('symbol', scopedSymbols);
      if (periodStartIso) query = query.gte('exit_time', periodStartIso);
      if (winsOnly) query = query.gt('realized_pnl_pct', 0);
      const result = await query;
      if (result.error) throw result.error;
      return result.count ?? 0;
    };

    void Promise.all([
      countFor('1m', false),
      countFor('1m', true),
      countFor('10m', false),
      countFor('10m', true),
    ])
      .then(([pulseTotal, pulseWins, waveTotal, waveWins]) => {
        if (cancelled) return;
        setRates({
          pulse: pulseTotal > 0 ? (pulseWins / pulseTotal) * 100 : undefined,
          wave: waveTotal > 0 ? (waveWins / waveTotal) * 100 : undefined,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Signal stream win-rate query failed:', error);
        setRates({});
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, favoritesKey, favoritesOnly, period, symbolsKey]);

  return rates;
}
