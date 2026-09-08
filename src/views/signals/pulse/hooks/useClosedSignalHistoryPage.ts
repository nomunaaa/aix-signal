import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TRADING_CATEGORY_ORDER, type TradingCategory } from '@/lib/trading-category';
import { enrichSignalCyclesWithLifecycleActions } from '@/lib/queries/signals';
import type {
  ClosedSignal,
  HistoryQueryState,
  SignalStreamId,
  SignalTrendMode,
  SignalTrendModeFilter,
} from '../types/pulse.types';
import {
  HISTORY_CLOSED_CYCLE_COLUMNS,
  mapCycleRowsToClosedSignals,
  type ClosedSignalCycleRow,
} from '../utils/closedSignalHistoryMapper';
import {
  dateInputEndExclusiveMs,
  dateInputStartMs,
  normalizeIsoTimestamp,
} from '../utils/historyDateRange';

type StreamFilterState = Record<SignalStreamId, boolean>;

type UseClosedSignalHistoryPageOptions = {
  enabled: boolean;
  symbols: readonly string[];
  streamFilter: StreamFilterState;
  trendModeFilter: SignalTrendModeFilter;
  tradingCategories: readonly TradingCategory[];
  queryState: HistoryQueryState | null;
  searchQuery: string;
  favorites: ReadonlySet<string>;
  page: number;
  pageSize: number;
};

type ClosedSignalHistoryPageState = {
  signals: ClosedSignal[];
  totalCount: number;
  totalPages: number;
  loading: boolean;
  hasLoaded: boolean;
  error: Error | null;
};

const EMPTY_HISTORY_PAGE: ClosedSignalHistoryPageState = {
  signals: [],
  totalCount: 0,
  totalPages: 1,
  loading: false,
  hasLoaded: false,
  error: null,
};

const EMPTY_LOADED_HISTORY_PAGE: ClosedSignalHistoryPageState = {
  ...EMPTY_HISTORY_PAGE,
  hasLoaded: true,
};

function normalizeSymbols(symbols: readonly string[]): string[] {
  return Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
  ).sort();
}

function isoFromMs(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function symbolPattern(value: string): string {
  return `%${value.trim().toUpperCase()}%`;
}

type HistoryTrendPair = {
  longTrend: 'UP' | 'DOWN';
  shortTrend: 'UP' | 'DOWN' | 'NEUTRAL';
};

const HISTORY_TREND_MODE_PAIRS: Record<SignalTrendMode, HistoryTrendPair[]> = {
  trend: [
    { longTrend: 'UP', shortTrend: 'UP' },
    { longTrend: 'UP', shortTrend: 'DOWN' },
  ],
  nonTrend: [
    { longTrend: 'UP', shortTrend: 'NEUTRAL' },
    { longTrend: 'DOWN', shortTrend: 'NEUTRAL' },
  ],
  reversal: [
    { longTrend: 'DOWN', shortTrend: 'UP' },
    { longTrend: 'DOWN', shortTrend: 'DOWN' },
  ],
};

export function postgrestTrendModeOrFilter(trendModeFilter: SignalTrendModeFilter): string | null {
  const seenPairs = new Set<string>();
  const clauses: string[] = [];

  for (const mode of Object.keys(HISTORY_TREND_MODE_PAIRS) as SignalTrendMode[]) {
    if (!trendModeFilter[mode]) continue;

    for (const pair of HISTORY_TREND_MODE_PAIRS[mode]) {
      const key = `${pair.longTrend}|${pair.shortTrend}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const shortTrendFilter =
        pair.shortTrend === 'NEUTRAL'
          ? 'or(entry_trend_short.eq.NEUTRAL,entry_trend_short.is.null)'
          : `entry_trend_short.eq.${pair.shortTrend}`;
      clauses.push(`and(entry_trend_long.eq.${pair.longTrend},${shortTrendFilter})`);
    }
  }

  return clauses.length > 0 ? clauses.join(',') : null;
}

export function useClosedSignalHistoryPage({
  enabled,
  symbols,
  streamFilter,
  trendModeFilter,
  tradingCategories,
  queryState,
  searchQuery,
  favorites,
  page,
  pageSize,
}: UseClosedSignalHistoryPageOptions): ClosedSignalHistoryPageState {
  const [state, setState] = useState<ClosedSignalHistoryPageState>(EMPTY_HISTORY_PAGE);
  const symbolsKey = useMemo(() => normalizeSymbols(symbols).join(','), [symbols]);
  const favoritesKey = useMemo(
    () => normalizeSymbols(Array.from(favorites)).join(','),
    [favorites]
  );
  const categoriesKey = tradingCategories.join(',');
  const streamKey = `${streamFilter.pulse ? 'pulse' : ''}|${streamFilter.wave ? 'wave' : ''}`;
  const trendModeKey = `${trendModeFilter.trend ? 'trend' : ''}|${
    trendModeFilter.nonTrend ? 'nonTrend' : ''
  }|${trendModeFilter.reversal ? 'reversal' : ''}`;

  useEffect(() => {
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const normalizedSymbols = symbolsKey ? symbolsKey.split(',') : [];
    const normalizedFavorites = new Set(favoritesKey ? favoritesKey.split(',') : []);
    const barIntervals = [
      streamFilter.pulse ? ('1m' as const) : null,
      streamFilter.wave ? ('10m' as const) : null,
    ].filter((item): item is '1m' | '10m' => Boolean(item));
    const selectedCategories = TRADING_CATEGORY_ORDER.filter((category) =>
      tradingCategories.includes(category)
    );
    const trendModeOrFilter = postgrestTrendModeOrFilter(trendModeFilter);

    if (
      !enabled ||
      !queryState ||
      normalizedSymbols.length === 0 ||
      barIntervals.length === 0 ||
      selectedCategories.length === 0 ||
      !trendModeOrFilter
    ) {
      setState(EMPTY_HISTORY_PAGE);
      return;
    }

    const scopedSymbols = queryState.showFavoritesOnly
      ? normalizedSymbols.filter((symbol) => normalizedFavorites.has(symbol))
      : normalizedSymbols;

    if (scopedSymbols.length === 0) {
      setState(EMPTY_LOADED_HISTORY_PAGE);
      return;
    }

    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));

    const run = async () => {
      const filter = queryState.filter;
      const from = (safePage - 1) * safePageSize;
      const to = from + safePageSize - 1;

      const applyFilters = (query: any): any => {
        let next = query;
        next = next
          .eq('is_open', false)
          .not('exit_time', 'is', null)
          .in('symbol', scopedSymbols)
          .in('barinterval', barIntervals)
          .or(trendModeOrFilter);

        if (selectedCategories.length !== TRADING_CATEGORY_ORDER.length) {
          next = next.in('trading_category', selectedCategories);
        }

        const localSymbol = filter.symbol.trim();
        if (localSymbol) next = next.ilike('symbol', symbolPattern(localSymbol));

        const globalSymbol = searchQuery.trim();
        if (globalSymbol) next = next.ilike('symbol', symbolPattern(globalSymbol));

        if (filter.direction) {
          next = next.eq('side', filter.direction === 'long' ? 'LONG' : 'SHORT');
        }

        const exactFromIso = normalizeIsoTimestamp(filter.exactDateFromIso);
        const fromIso = exactFromIso ?? isoFromMs(dateInputStartMs(filter.dateFrom));
        if (fromIso) next = next.gte('exit_time', fromIso);

        const exactToIso = normalizeIsoTimestamp(filter.exactDateToIso);
        if (exactToIso) {
          next = next.lte('exit_time', exactToIso);
        } else {
          const toIso = isoFromMs(dateInputEndExclusiveMs(filter.dateTo));
          if (toIso) next = next.lt('exit_time', toIso);
        }

        return next;
      };

      const countQuery = applyFilters(
        supabase.from('signal_cycles').select('id', { count: 'exact', head: true })
      );
      let pageQuery = applyFilters(
        supabase.from('signal_cycles').select(HISTORY_CLOSED_CYCLE_COLUMNS)
      );

      if (queryState.sort.by === 'symbol') {
        pageQuery = pageQuery
          .order('symbol', { ascending: queryState.sort.dir === 'asc' })
          .order('exit_time', { ascending: false });
      } else {
        pageQuery = pageQuery.order('exit_time', { ascending: queryState.sort.dir === 'asc' });
      }
      pageQuery = pageQuery.range(from, to);

      const [countResult, pageResult] = await Promise.all([countQuery, pageQuery]);

      if (pageResult.error) throw pageResult.error;
      if (countResult.error) {
        console.warn('Signal history server count failed:', countResult.error);
      }

      const totalCount = countResult.count ?? pageResult.data?.length ?? 0;
      const rows = (pageResult.data ?? []) as ClosedSignalCycleRow[];
      const enrichedRows = await enrichSignalCyclesWithLifecycleActions(rows);
      const signals = mapCycleRowsToClosedSignals(enrichedRows);

      if (cancelled) return;
      setState({
        signals,
        totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
        loading: false,
        hasLoaded: true,
        error: null,
      });
    };

    void run().catch((error) => {
      if (cancelled) return;
      console.error('Signal history server page fetch failed:', error);
      setState({
        ...EMPTY_HISTORY_PAGE,
        loading: false,
        hasLoaded: true,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    categoriesKey,
    enabled,
    favoritesKey,
    page,
    pageSize,
    queryState,
    searchQuery,
    streamFilter.pulse,
    streamFilter.wave,
    streamKey,
    symbolsKey,
    trendModeFilter,
    trendModeKey,
    tradingCategories,
  ]);

  return state;
}
