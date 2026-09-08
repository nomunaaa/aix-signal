/**
 * Vertical table dashboard layout for /signals/pulse.
 *
 * Structure:
 *   1. Action controls bar    - stream/strategy/sim
 *   2. Table control bar       - search, 행 필터(LIVE/WAIT), filters, sort, density
 *   3. Main content           - open summary tables + history
 *   4. Signal detail          - Sheet(데스크톱) / Drawer(모바일) on row click
 *
 * No "구간" column. Each table has unique columns.
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PulseSectionTable } from './PulseSectionTable';
import { HistoryTable } from './HistoryTable';
import { SignalDetailCard } from './SignalDetailCard';
import { TableControlBar, type SignalDatePeriod } from './TableControlBar';
import { PulseActionControlsBar } from './PulseActionControlsBar';
import { useNavigate, useSearchParams } from '@/lib/navigation-compat';
import { USE_MOCK_SIGNALS } from '@/lib/env/mock';
import { type FeedSignal, type OpenSignal } from '../utils/section';
import {
  type Signal,
  type DiscountedSignal,
  type LockedSignal,
  type ClosedSignal,
  type FilterPresetId,
  type SignalStreamId,
  SIGNAL_TREND_MODES,
  type SignalTrendMode,
  type SignalTrendModeFilter,
  type HistoryQueryState,
} from '../types/pulse.types';
import { usePulseStore } from '../stores/pulseStore';
import { useSimulation } from '../hooks/useSimulation';
import { useClosedSignalHistoryPage } from '../hooks/useClosedSignalHistoryPage';
import { useActiveSection } from '../hooks/useActiveSection';
import { PRESET_COLUMN_MAP } from '../config/presetColumns';
import { DEFAULT_FILTER_PRESET } from '../utils/filterPresets';
import { useSignalTransitions } from '../hooks/useSignalTransitions';
import { sortClosedSignals, sortClosedSignalsByStrategyPerformance } from '../utils/strategyEngine';
import {
  isoTimestampMs,
  matchesHistoryDatePeriod,
  normalizeIsoTimestamp,
} from '../utils/historyDateRange';
import { chartPathForSignal } from '../utils/chartLink';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';
import {
  normalizeTradingCategory,
  TRADING_CATEGORY_ORDER,
  type TradingCategory,
} from '@/lib/trading-category';
import {
  getOpenSummaryColumns,
  buildOpenRowData,
  type OpenRowData,
} from '../config/sectionColumnDefs';
import { localizePulseColumnDefs, usePulseCopy } from '../utils/pulseTranslations';

type StreamFilterState = Record<SignalStreamId, boolean>;
const DEFAULT_HISTORY_PAGE_SIZE = 10;

type SummaryBucketKey =
  | 'discountedSimultaneous'
  | 'standardSimultaneous'
  | 'discountedTrend'
  | 'standardTrend'
  | 'discountedReversal'
  | 'standardReversal'
  | 'discountedNoTrend'
  | 'standardNoTrend';

type SummaryBuckets = Record<SummaryBucketKey, OpenRowData[]>;

function emptySummaryBuckets(): SummaryBuckets {
  return {
    discountedSimultaneous: [],
    standardSimultaneous: [],
    discountedTrend: [],
    standardTrend: [],
    discountedReversal: [],
    standardReversal: [],
    discountedNoTrend: [],
    standardNoTrend: [],
  };
}

function normalizeHistorySymbolParam(value: string | null): string {
  return value?.trim().toUpperCase() ?? '';
}

function parseHistoryLimitParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(1, Math.floor(parsed));
}

function parseHistoryPeriodParam(value: string | null): SignalDatePeriod | null {
  return value === '30d' || value === '90d' || value === 'all' ? value : null;
}

function parseHistoryStreamFilterParam(value: string | null): StreamFilterState | null {
  if (!value) return null;
  const streams = new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
  const next = {
    pulse: streams.has('pulse'),
    wave: streams.has('wave'),
  };
  return next.pulse || next.wave ? next : null;
}

function parseHistoryTrendModeParam(value: string | null): SignalTrendModeFilter | null {
  if (!value) return null;
  const modes = new Set(value.split(',').map((mode) => mode.trim()));
  const next: SignalTrendModeFilter = {
    trend: modes.has('trend'),
    nonTrend: modes.has('nonTrend'),
    reversal: modes.has('reversal'),
  };
  return SIGNAL_TREND_MODES.some((mode) => next[mode]) ? next : null;
}

function parseHistoryCategoriesParam(value: string | null): TradingCategory[] | null {
  if (!value) return null;
  const parsed = value
    .split(',')
    .map((item) => normalizeTradingCategory(item))
    .filter((item): item is TradingCategory => Boolean(item));
  if (parsed.length === 0) return null;

  const parsedSet = new Set(parsed);
  const ordered = TRADING_CATEGORY_ORDER.filter((item) => parsedSet.has(item));
  return ordered.length > 0 ? ordered : null;
}

function streamFromBarinterval(barinterval?: '1m' | '10m'): SignalStreamId {
  return barinterval === '10m' ? 'wave' : 'pulse';
}

function streamFromOpenSignal(signal: OpenSignal): SignalStreamId {
  return streamFromBarinterval((signal as Signal).barinterval);
}

function streamFromClosedSignal(signal: ClosedSignal): SignalStreamId {
  return streamFromBarinterval(signal.barinterval);
}

function matchesStreamFilter(stream: SignalStreamId, filter: StreamFilterState): boolean {
  return filter[stream];
}

function trendModeFromOpenSignal(signal: OpenSignal): SignalTrendMode | null {
  const raw = signal as Signal;
  return resolveSignalTrendModeFromEntryTrends({
    direction: signal.direction,
    shortTrend: raw.entryTrendShort,
    longTrend: raw.entryTrendLong,
  });
}

function trendModeFromClosedSignal(signal: ClosedSignal): SignalTrendMode | null {
  return resolveSignalTrendModeFromEntryTrends({
    direction: signal.direction,
    shortTrend: signal.entryTrendShort,
    longTrend: signal.entryTrendLong,
  });
}

type HistoryExactDateRange = {
  fromIso?: string | null;
  toIso?: string | null;
};

function matchesExactDateRange(signal: ClosedSignal, range: HistoryExactDateRange): boolean {
  const closedAt =
    typeof signal.closedAt === 'string'
      ? new Date(signal.closedAt).getTime()
      : signal.closedAt.getTime();
  if (!Number.isFinite(closedAt)) return false;

  const from = isoTimestampMs(range.fromIso);
  if (from !== null && closedAt < from) return false;

  const to = isoTimestampMs(range.toIso);
  if (to !== null && closedAt > to) return false;

  return true;
}

function matchesDatePeriod(
  signal: ClosedSignal,
  period: SignalDatePeriod,
  exactRange?: HistoryExactDateRange
): boolean {
  if (exactRange?.fromIso || exactRange?.toIso) {
    return matchesExactDateRange(signal, exactRange);
  }
  return matchesHistoryDatePeriod(signal.closedAt, period);
}

function favoriteSymbolKey(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function allTradingCategoriesSelected(categories: readonly string[]): boolean {
  return categories.length === TRADING_CATEGORY_ORDER.length;
}

function rowHasAdditionalEntry(row: OpenRowData): boolean {
  return (
    row.additionalSignal === true ||
    row.additionalEntryPending === true ||
    row.additionalEntryPrice != null
  );
}

function rowHasPartialExit(row: OpenRowData): boolean {
  return (
    row.partialSignal === true || row.partialExitPending === true || row.partialExitPrice != null
  );
}

// --- Types ---

export type FeedSignalUnion = Signal | DiscountedSignal | LockedSignal | ClosedSignal;

export interface PulseSingleColumnLayoutProps {
  readonly openSignals: (Signal | DiscountedSignal | LockedSignal)[];
  readonly closedSignals: ClosedSignal[];
  readonly closedSignalsTotalCount?: number;
  readonly showDiscount: boolean;
  readonly showLocked: boolean;
  readonly lastUpdate: Date;
  readonly openSignalsLoading?: boolean;
  readonly isReconnecting?: boolean;
  readonly total24hSignals?: number;
  readonly allowedSymbols?: string[];
  readonly favoriteSymbols?: readonly string[];
}

// --- Component ---

export function PulseSingleColumnLayout({
  openSignals,
  closedSignals,
  closedSignalsTotalCount = 0,
  showDiscount: _showDiscount,
  showLocked: _showLocked,
  lastUpdate,
  openSignalsLoading = false,
  isReconnecting = false,
  total24hSignals: _total24hSignals = 0,
  allowedSymbols = [],
  favoriteSymbols = [],
}: PulseSingleColumnLayoutProps) {
  const { language, copy } = usePulseCopy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const historyStreamsParam = searchParams.get('historyStreams');
  const historyTrendModeParam = searchParams.get('historyTrendMode');
  const historyCategoriesParam = searchParams.get('historyCategories');
  // 사용자가 히스토리 종목 스코프를 '전체'로 직접 되돌리면 true — URL의 historySymbol/search가
  // (index.tsx의 재동기화 effect 등으로) 뒤늦게 되살아나더라도 이번 마운트 동안은 무시한다.
  const historySymbolFilterClearedRef = useRef(false);
  const historySymbolFilter = historySymbolFilterClearedRef.current
    ? ''
    : normalizeHistorySymbolParam(
        searchParams.get('historySymbol') ??
          searchParams.get('symbol') ??
          searchParams.get('search')
      );
  const historyLimit = parseHistoryLimitParam(searchParams.get('historyLimit'));
  const historyPeriodFromUrl = parseHistoryPeriodParam(searchParams.get('historyPeriod'));
  const historyFromIso = normalizeIsoTimestamp(searchParams.get('historyFromIso'));
  const historyToIso = normalizeIsoTimestamp(searchParams.get('historyToIso'));
  const exactHistoryDateRange = useMemo(
    () =>
      historyFromIso || historyToIso
        ? {
            fromIso: historyFromIso,
            toIso: historyToIso,
          }
        : undefined,
    [historyFromIso, historyToIso]
  );
  const historyStreamFilterFromUrl = useMemo(
    () => parseHistoryStreamFilterParam(historyStreamsParam),
    [historyStreamsParam]
  );
  const historyTrendModeFilterFromUrl = useMemo(
    () => parseHistoryTrendModeParam(historyTrendModeParam),
    [historyTrendModeParam]
  );
  const historyTradingCategoriesFromUrl = useMemo(
    () => parseHistoryCategoriesParam(historyCategoriesParam),
    [historyCategoriesParam]
  );
  const forceRecentlyClosedSort = searchParams.get('historySort') === 'recent_closed';
  const shouldFocusHistory = searchParams.get('historyFocus') === '1';
  const [historyPage, setHistoryPage] = useState(1);
  const [historyQueryState, setHistoryQueryState] = useState<HistoryQueryState | null>(null);
  const historySectionRef = useRef<HTMLDivElement | null>(null);
  const [columnPresetId, setColumnPresetId] = useState<FilterPresetId>(DEFAULT_FILTER_PRESET);
  // 기간 필터는 usePulseStore가 소스 오브 트루스 — usePulseSignals가 같은 값을 읽어
  // exit_time 하한을 SQL에 밀어넣기 때문에 로컬 state로 들고 있으면 전체 히스토리를
  // 내려받은 뒤 클라이언트에서 걸러내게 된다.
  const datePeriod = usePulseStore((state) => state.historyDatePeriod);
  const setDatePeriod = usePulseStore((state) => state.setHistoryDatePeriod);
  const [historySimulationSignals, setHistorySimulationSignals] = useState<ClosedSignal[] | null>(
    null
  );

  // Active section detection for TableControlBar
  const { registerRef, activeTableId } = useActiveSection();
  const columnDensity = usePulseStore((s) => s.columnDensity);

  // Global store: strategy, direction, search, sort
  const selectedStrategy = usePulseStore((s) => s.selectedStrategy);
  const searchQuery = usePulseStore((s) => s.searchQuery);
  const sortBy = usePulseStore((s) => s.sortBy);
  const sortDir = usePulseStore((s) => s.sortDir);
  const favorites = usePulseStore((s) => s.favorites);
  const trendModeFilter = usePulseStore((s) => s.trendModeFilter);
  const tradingCategoryFilters = usePulseStore((s) => s.tradingCategoryFilters);
  const streamFilter = usePulseStore((s) => s.streamFilter);
  const toggleStreamFilter = usePulseStore((s) => s.toggleStreamFilter);
  const isSymbolLocked = allowedSymbols.length === 0;
  const historyStreamFilter = historyStreamFilterFromUrl ?? streamFilter;
  const historyTrendModeFilter = historyTrendModeFilterFromUrl ?? trendModeFilter;
  const historyTradingCategories = historyTradingCategoriesFromUrl ?? tradingCategoryFilters;
  const effectiveHistoryDatePeriod = historyPeriodFromUrl ?? datePeriod;
  const historyTradingCategoryFilterSet = useMemo(
    () => new Set(historyTradingCategories),
    [historyTradingCategories]
  );

  const handleStreamFilterChange = useCallback(
    (stream: SignalStreamId, checked: boolean) => {
      if (streamFilter[stream] !== checked) toggleStreamFilter(stream);
    },
    [streamFilter, toggleStreamFilter]
  );

  const handleDatePeriodChange = useCallback(
    (period: SignalDatePeriod) => {
      setDatePeriod(period);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('historyPeriod');
          next.delete('historyFromIso');
          next.delete('historyToIso');
          return next;
        },
        { replace: true }
      );
    },
    [setDatePeriod, setSearchParams]
  );

  const handleClearHistoryDateRange = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('historyFromIso');
        next.delete('historyToIso');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  useEffect(() => {
    if (historyPeriodFromUrl && historyPeriodFromUrl !== datePeriod) {
      setDatePeriod(historyPeriodFromUrl);
    }
  }, [datePeriod, historyPeriodFromUrl, setDatePeriod]);

  // Feed signals into central store for transition detection
  const allOpenSignals = openSignals as FeedSignal[];
  useSignalTransitions(allOpenSignals);

  const { input: simulationInput } = useSimulation();

  // 타이핑마다 1000+ 행을 재필터링하지 않도록 검색어를 디바운스
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // closedSignals 검색어로 추가 필터링
  const closedForActiveStreams = useMemo(
    () =>
      closedSignals.filter((signal) =>
        matchesStreamFilter(streamFromClosedSignal(signal), historyStreamFilter)
      ),
    [closedSignals, historyStreamFilter]
  );

  const closedForActiveTradingCategories = useMemo(() => {
    if (allTradingCategoriesSelected(historyTradingCategories)) return closedForActiveStreams;
    return closedForActiveStreams.filter((signal) => {
      const category = normalizeTradingCategory(signal.tradingCategory);
      return category ? historyTradingCategoryFilterSet.has(category) : false;
    });
  }, [closedForActiveStreams, historyTradingCategories, historyTradingCategoryFilterSet]);

  const closedForActiveTrendModes = useMemo(() => {
    return closedForActiveTradingCategories.filter((signal) => {
      const mode = trendModeFromClosedSignal(signal);
      return mode == null ? false : historyTrendModeFilter[mode];
    });
  }, [closedForActiveTradingCategories, historyTrendModeFilter]);

  const closedForActivePeriod = useMemo(
    () =>
      closedForActiveTrendModes.filter((s) =>
        matchesDatePeriod(s, effectiveHistoryDatePeriod, exactHistoryDateRange)
      ),
    [closedForActiveTrendModes, effectiveHistoryDatePeriod, exactHistoryDateRange]
  );

  const filteredClosed = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return closedForActivePeriod;
    const q = debouncedSearchQuery.trim().toLowerCase();
    return closedForActivePeriod.filter((s) => s.symbol.toLowerCase().includes(q));
  }, [closedForActivePeriod, debouncedSearchQuery]);

  const sortedClosed = useMemo(() => {
    if (forceRecentlyClosedSort) {
      return sortClosedSignals([...filteredClosed], 'time', 'desc');
    }
    if (sortBy === 'time' && sortDir === 'desc') {
      return sortClosedSignalsByStrategyPerformance(filteredClosed);
    }
    return sortClosedSignals([...filteredClosed], sortBy, sortDir);
  }, [filteredClosed, forceRecentlyClosedSort, sortBy, sortDir]);
  const canUseHistoryServerTotal =
    !historySymbolFilter &&
    !debouncedSearchQuery.trim() &&
    historyStreamFilter.pulse &&
    historyStreamFilter.wave &&
    SIGNAL_TREND_MODES.every((mode) => historyTrendModeFilter[mode]) &&
    allTradingCategoriesSelected(historyTradingCategories);
  const historyDisplayTotalCount = canUseHistoryServerTotal
    ? Math.max(closedSignalsTotalCount, sortedClosed.length)
    : sortedClosed.length;

  // History pagination (클라이언트 사이드)
  const historyPageSize = historyLimit ?? DEFAULT_HISTORY_PAGE_SIZE;
  const hasUnsupportedHistoryServerFilter = Boolean(
    historyQueryState?.filter.minReturn.trim() || historyQueryState?.filter.maxReturn.trim()
  );
  const canUseHistoryServerPagination =
    !USE_MOCK_SIGNALS &&
    !isSymbolLocked &&
    historyQueryState !== null &&
    !hasUnsupportedHistoryServerFilter &&
    allowedSymbols.length > 0;
  const serverHistoryPage = useClosedSignalHistoryPage({
    enabled: canUseHistoryServerPagination,
    symbols: allowedSymbols,
    streamFilter: historyStreamFilter,
    trendModeFilter: historyTrendModeFilter,
    tradingCategories: historyTradingCategories,
    queryState: historyQueryState,
    searchQuery: debouncedSearchQuery,
    favorites,
    page: historyPage,
    pageSize: historyPageSize,
  });
  const useHistoryServerPagination = canUseHistoryServerPagination && serverHistoryPage.hasLoaded;
  const effectiveHistoryTotalCount = useHistoryServerPagination
    ? Math.max(serverHistoryPage.totalCount, serverHistoryPage.signals.length)
    : historyDisplayTotalCount;
  const historyTotalPages = useHistoryServerPagination
    ? serverHistoryPage.totalPages
    : Math.max(1, Math.ceil(sortedClosed.length / historyPageSize));
  const pagedClosed = useMemo(() => {
    if (useHistoryServerPagination) return serverHistoryPage.signals;
    const start = (historyPage - 1) * historyPageSize;
    return sortedClosed.slice(start, start + historyPageSize);
  }, [
    historyPageSize,
    historyPage,
    serverHistoryPage.signals,
    sortedClosed,
    useHistoryServerPagination,
  ]);

  // 검색어 변경 시 히스토리 페이지 리셋
  useEffect(() => {
    setHistoryPage(1);
  }, [
    debouncedSearchQuery,
    effectiveHistoryDatePeriod,
    historyFromIso,
    historyToIso,
    historyStreamFilter.pulse,
    historyStreamFilter.wave,
    historyTrendModeFilter.trend,
    historyTrendModeFilter.nonTrend,
    historyTrendModeFilter.reversal,
    historyTradingCategories,
    historyPageSize,
  ]);

  // sortedClosed.length is a dependency so this retries once data finishes loading, but it
  // must only ever auto-scroll ONCE per visit — otherwise every later filter change (Strategy,
  // Trend, ...) that changes the closed-signal count re-triggers the jump-to-History scroll.
  const hasFocusedHistoryRef = useRef(false);
  useEffect(() => {
    if (!shouldFocusHistory || hasFocusedHistoryRef.current) return;
    const handle = window.setTimeout(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      hasFocusedHistoryRef.current = true;
    }, 100);
    return () => window.clearTimeout(handle);
  }, [shouldFocusHistory, sortedClosed.length]);

  // Helper: sort favorited symbols to the top
  const sortFavFirst = useCallback(
    <T extends { symbol: string }>(rows: T[]): T[] => {
      return [...rows].sort((a, b) => {
        const aFav = favorites.has(favoriteSymbolKey(a.symbol)) ? 0 : 1;
        const bFav = favorites.has(favoriteSymbolKey(b.symbol)) ? 0 : 1;
        return aFav - bFav;
      });
    },
    [favorites]
  );

  const simultaneousSymbolSet = useMemo(() => {
    const streamsBySymbol = new Map<string, Set<SignalStreamId>>();
    for (const signal of openSignals as OpenSignal[]) {
      const key = signal.symbol.toUpperCase();
      const streams = streamsBySymbol.get(key) ?? new Set<SignalStreamId>();
      streams.add(streamFromOpenSignal(signal));
      streamsBySymbol.set(key, streams);
    }
    return new Set(
      [...streamsBySymbol.entries()]
        .filter(([, streams]) => streams.has('pulse') && streams.has('wave'))
        .map(([symbol]) => symbol)
    );
  }, [openSignals]);

  const summaryRows = useMemo(() => {
    const rows = (openSignals as OpenSignal[])
      .filter((signal) => matchesStreamFilter(streamFromOpenSignal(signal), streamFilter))
      .map((signal) => {
        const row = buildOpenRowData(signal, simulationInput);
        return {
          ...row,
          profitLossAmount: row.pnlAmount,
        };
      });
    return sortFavFirst(rows);
  }, [
    openSignals,
    simulationInput.capital,
    simulationInput.capitalRatio,
    simulationInput.leverage,
    sortFavFirst,
    streamFilter,
  ]);

  const summaryBuckets = useMemo<SummaryBuckets>(() => {
    const buckets = emptySummaryBuckets();
    for (const row of summaryRows) {
      const discounted = (row.discountRate ?? 0) > 0;
      const simultaneous = simultaneousSymbolSet.has(row.symbol.toUpperCase());
      const trendMode = trendModeFromOpenSignal(row._raw);
      if (trendMode == null) continue;

      if (trendMode === 'reversal') {
        buckets[discounted ? 'discountedReversal' : 'standardReversal'].push(row);
      } else if (simultaneous) {
        buckets[discounted ? 'discountedSimultaneous' : 'standardSimultaneous'].push(row);
      } else if (trendMode === 'trend') {
        buckets[discounted ? 'discountedTrend' : 'standardTrend'].push(row);
      } else {
        buckets[discounted ? 'discountedNoTrend' : 'standardNoTrend'].push(row);
      }
    }
    return buckets;
  }, [summaryRows, simultaneousSymbolSet]);

  const buildSummaryCols = useCallback(
    (includeDiscountRate = true, includeAdditionalEntry = false, includePartialExit = false) =>
      localizePulseColumnDefs(
        getOpenSummaryColumns({
          includeAdditionalEntry,
          includeDiscountRate,
          includePartialExit,
          profitLossZeroTone: includeDiscountRate ? 'loss' : 'profit',
        }),
        language
      ),
    [language]
  );

  const discountedSimultaneousHasAdditionalEntry =
    summaryBuckets.discountedSimultaneous.some(rowHasAdditionalEntry);
  const discountedSimultaneousHasPartialExit =
    summaryBuckets.discountedSimultaneous.some(rowHasPartialExit);
  const standardSimultaneousHasAdditionalEntry =
    summaryBuckets.standardSimultaneous.some(rowHasAdditionalEntry);
  const standardSimultaneousHasPartialExit =
    summaryBuckets.standardSimultaneous.some(rowHasPartialExit);
  const discountedTrendHasAdditionalEntry =
    summaryBuckets.discountedTrend.some(rowHasAdditionalEntry);
  const discountedTrendHasPartialExit = summaryBuckets.discountedTrend.some(rowHasPartialExit);
  const standardTrendHasAdditionalEntry = summaryBuckets.standardTrend.some(rowHasAdditionalEntry);
  const standardTrendHasPartialExit = summaryBuckets.standardTrend.some(rowHasPartialExit);
  const discountedReversalHasAdditionalEntry =
    summaryBuckets.discountedReversal.some(rowHasAdditionalEntry);
  const discountedReversalHasPartialExit =
    summaryBuckets.discountedReversal.some(rowHasPartialExit);
  const standardReversalHasAdditionalEntry =
    summaryBuckets.standardReversal.some(rowHasAdditionalEntry);
  const standardReversalHasPartialExit = summaryBuckets.standardReversal.some(rowHasPartialExit);
  const discountedNoTrendHasAdditionalEntry =
    summaryBuckets.discountedNoTrend.some(rowHasAdditionalEntry);
  const discountedNoTrendHasPartialExit = summaryBuckets.discountedNoTrend.some(rowHasPartialExit);
  const standardNoTrendHasAdditionalEntry =
    summaryBuckets.standardNoTrend.some(rowHasAdditionalEntry);
  const standardNoTrendHasPartialExit = summaryBuckets.standardNoTrend.some(rowHasPartialExit);

  const discountedSimultaneousCols = useMemo(
    () =>
      buildSummaryCols(
        true,
        discountedSimultaneousHasAdditionalEntry,
        discountedSimultaneousHasPartialExit
      ),
    [
      buildSummaryCols,
      discountedSimultaneousHasAdditionalEntry,
      discountedSimultaneousHasPartialExit,
    ]
  );
  const standardSimultaneousCols = useMemo(
    () =>
      buildSummaryCols(
        false,
        standardSimultaneousHasAdditionalEntry,
        standardSimultaneousHasPartialExit
      ),
    [buildSummaryCols, standardSimultaneousHasAdditionalEntry, standardSimultaneousHasPartialExit]
  );
  const discountedTrendCols = useMemo(
    () => buildSummaryCols(true, discountedTrendHasAdditionalEntry, discountedTrendHasPartialExit),
    [buildSummaryCols, discountedTrendHasAdditionalEntry, discountedTrendHasPartialExit]
  );
  const standardTrendCols = useMemo(
    () => buildSummaryCols(false, standardTrendHasAdditionalEntry, standardTrendHasPartialExit),
    [buildSummaryCols, standardTrendHasAdditionalEntry, standardTrendHasPartialExit]
  );
  const discountedReversalCols = useMemo(
    () =>
      buildSummaryCols(
        true,
        discountedReversalHasAdditionalEntry,
        discountedReversalHasPartialExit
      ),
    [buildSummaryCols, discountedReversalHasAdditionalEntry, discountedReversalHasPartialExit]
  );
  const standardReversalCols = useMemo(
    () =>
      buildSummaryCols(false, standardReversalHasAdditionalEntry, standardReversalHasPartialExit),
    [buildSummaryCols, standardReversalHasAdditionalEntry, standardReversalHasPartialExit]
  );
  const discountedNoTrendCols = useMemo(
    () =>
      buildSummaryCols(true, discountedNoTrendHasAdditionalEntry, discountedNoTrendHasPartialExit),
    [buildSummaryCols, discountedNoTrendHasAdditionalEntry, discountedNoTrendHasPartialExit]
  );
  const standardNoTrendCols = useMemo(
    () => buildSummaryCols(false, standardNoTrendHasAdditionalEntry, standardNoTrendHasPartialExit),
    [buildSummaryCols, standardNoTrendHasAdditionalEntry, standardNoTrendHasPartialExit]
  );

  const simultaneousCount =
    summaryBuckets.discountedSimultaneous.length + summaryBuckets.standardSimultaneous.length;
  const openTableRowCount = Object.values(summaryBuckets).reduce(
    (count, rows) => count + rows.length,
    0
  );

  const navigateToSignalChart = useCallback(
    (signal: FeedSignal) => {
      navigate(chartPathForSignal(signal));
    },
    [navigate]
  );

  // Legacy detail events now go to the matching chart route.
  useEffect(() => {
    const handler = (e: Event) => {
      const { signal } = (e as CustomEvent).detail;
      if (signal) navigateToSignalChart(signal);
    };
    window.addEventListener('pulse:signal-drawer', handler);
    return () => window.removeEventListener('pulse:signal-drawer', handler);
  }, [navigateToSignalChart]);

  // AI pick jumps follow the same chart navigation.
  useEffect(() => {
    const handler = (e: Event) => {
      const { signal } = (e as CustomEvent).detail;
      if (signal) navigateToSignalChart(signal);
    };
    window.addEventListener('pulse:ai-pick-jump', handler);
    return () => {
      window.removeEventListener('pulse:ai-pick-jump', handler);
    };
  }, [navigateToSignalChart]);

  const handleOpenRowClick = useCallback(
    (row: OpenRowData) => navigateToSignalChart(row._raw),
    [navigateToSignalChart]
  );

  const handleHistoryFilteredSignalsChange = useCallback((rows: ClosedSignal[]) => {
    setHistorySimulationSignals(rows);
  }, []);

  // 종목 히스토리 드릴다운(historySymbol/search) URL 파라미터 정리 — 그대로 두면 이후
  // 다른 필터 변경(예: showFavoritesOnly)이 URL 재동기화 시 이 값을 계속 되살린다.
  const handleClearHistorySymbolFilter = useCallback(() => {
    historySymbolFilterClearedRef.current = true;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('historySymbol');
        next.delete('search');
        next.delete('symbol');
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const emptySummaryTitle = language === 'ko' ? '조건에 맞는 시그널 없음' : 'No matching signals';
  const emptySummaryDescription =
    language === 'ko'
      ? '현재 필터 조건에 맞는 오픈 시그널이 없습니다.'
      : 'No open signals match the current filters.';
  const summarySections = [
    {
      id: 'discounted-simultaneous',
      title: language === 'ko' ? '할인 동시발생 시그널' : 'Discounted simultaneous signal',
      subtitle:
        language === 'ko'
          ? '할인 상태이며 Pulse와 Wave가 동시에 열린 시그널'
          : 'Discounted signals open on both Pulse and Wave.',
      rows: summaryBuckets.discountedSimultaneous,
      columns: discountedSimultaneousCols,
    },
    {
      id: 'standard-simultaneous',
      title: language === 'ko' ? '동시발생 시그널' : 'Simultaneous signal',
      subtitle:
        language === 'ko'
          ? '할인 상태가 아니며 Pulse와 Wave가 동시에 열린 시그널'
          : 'Non-discounted signals open on both Pulse and Wave.',
      rows: summaryBuckets.standardSimultaneous,
      columns: standardSimultaneousCols,
    },
    {
      id: 'discounted-trend',
      title: language === 'ko' ? '할인 추세 시그널' : 'Discounted trend signal',
      subtitle:
        language === 'ko'
          ? '할인 상태이며 방향과 단기·장기 추세가 일치하는 오픈 시그널'
          : 'Discounted open signals aligned with short and long trend.',
      rows: summaryBuckets.discountedTrend,
      columns: discountedTrendCols,
    },
    {
      id: 'standard-trend',
      title: language === 'ko' ? '추세 시그널' : 'Trend signal',
      subtitle:
        language === 'ko'
          ? '할인 상태가 아니며 방향과 단기·장기 추세가 일치하는 오픈 시그널'
          : 'Non-discounted open signals aligned with short and long trend.',
      rows: summaryBuckets.standardTrend,
      columns: standardTrendCols,
    },
    {
      id: 'discounted-reversal',
      title: language === 'ko' ? '할인 역추세 시그널' : 'Discounted reversal signal',
      subtitle:
        language === 'ko'
          ? '할인 상태이며 장기 추세가 하락으로 잡힌 역추세 오픈 시그널'
          : 'Discounted open signals classified as reversal from entry trend snapshots.',
      rows: summaryBuckets.discountedReversal,
      columns: discountedReversalCols,
    },
    {
      id: 'standard-reversal',
      title: language === 'ko' ? '역추세 시그널' : 'Reversal signal',
      subtitle:
        language === 'ko'
          ? '할인 상태가 아니며 장기 추세가 하락으로 잡힌 역추세 오픈 시그널'
          : 'Non-discounted open signals classified as reversal from entry trend snapshots.',
      rows: summaryBuckets.standardReversal,
      columns: standardReversalCols,
    },
    {
      id: 'discounted-no-trend',
      title: language === 'ko' ? '할인 비추세 시그널' : 'Discounted no-trend signal',
      subtitle:
        language === 'ko'
          ? '할인 상태이며 추세가 일치하지 않는 오픈 시그널'
          : 'Discounted open signals without trend alignment.',
      rows: summaryBuckets.discountedNoTrend,
      columns: discountedNoTrendCols,
    },
    {
      id: 'standard-no-trend',
      title: language === 'ko' ? '비추세 시그널' : 'No-trend signal',
      subtitle:
        language === 'ko'
          ? '할인 상태가 아니며 추세가 일치하지 않는 오픈 시그널'
          : 'Non-discounted open signals without trend alignment.',
      rows: summaryBuckets.standardNoTrend,
      columns: standardNoTrendCols,
    },
  ];

  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-var(--header-height))] flex-col',
        isReconnecting && 'reconnecting'
      )}
      data-density={columnDensity}
    >
      {/* 0. Persistent reconnection banner */}
      {isReconnecting && (
        <div
          className="sticky top-[var(--header-height)] z-40 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground"
          role="alert"
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>{copy.reconnecting}</span>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        </div>
      )}

      {/* 1. Action controls — 스트림/전략/시뮬 */}
      <PulseActionControlsBar
        isReconnecting={isReconnecting}
        streamFilter={streamFilter}
        onStreamFilterChange={handleStreamFilterChange}
        simulationHistorySignals={historySimulationSignals ?? sortedClosed}
      />

      {/* 1.1 Table Control Bar — 검색/필터/정렬/밀도 (sticky) */}
      <div
        className={cn(
          'sticky z-20 w-full border-b border-border bg-background',
          isReconnecting ? 'top-[calc(var(--header-height)+36px)]' : 'top-[var(--header-height)]'
        )}
      >
        <div
          className="container mx-auto"
          style={{
            paddingLeft: 'var(--header-padding-x)',
            paddingRight: 'var(--header-padding-x)',
          }}
        >
          <div className="flex min-h-[40px] items-center overflow-hidden">
            <TableControlBar
              activeTableId={activeTableId}
              columnPresetId={columnPresetId}
              onColumnPresetChange={setColumnPresetId}
              availableColumns={PRESET_COLUMN_MAP[columnPresetId]?.columns}
              className="flex-1"
              lastUpdate={lastUpdate}
              isReconnecting={isReconnecting}
              totalOpenPositions={openTableRowCount}
              secondaryCount={simultaneousCount}
              secondaryCountLabel={language === 'ko' ? '동시' : 'Simul'}
              datePeriod={effectiveHistoryDatePeriod}
              onDatePeriodChange={handleDatePeriodChange}
              showSignalStateFilter={false}
              favoriteSymbols={favoriteSymbols}
            />
          </div>
        </div>
      </div>

      {/* 3. Main Content: open tables + full-width history */}
      <div
        className="container mx-auto min-h-0 flex-1 py-3 sm:py-4"
        style={{
          paddingLeft: 'var(--header-padding-x)',
          paddingRight: 'var(--header-padding-x)',
        }}
      >
        {openSignalsLoading && !isSymbolLocked ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
              <div className="h-48 animate-pulse rounded-lg border border-border bg-card" />
            </div>
            <div className="h-64 animate-pulse rounded-lg border border-border bg-card" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* === Monitoring Zone === */}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {summarySections.map((section) => (
                <div key={section.id} ref={registerRef(section.id)} className="h-full">
                  <PulseSectionTable<OpenRowData>
                    title={section.title}
                    subtitle={section.subtitle}
                    rowData={section.rows}
                    columnDefs={section.columns}
                    onRowClick={handleOpenRowClick}
                    count={section.rows.length}
                    emptyTitle={emptySummaryTitle}
                    emptyDescription={emptySummaryDescription}
                    tableType="summary"
                    compactColumnWidths
                    stretchToParentHeight
                    upgradeRequired={isSymbolLocked}
                  />
                </div>
              ))}
            </div>

            {/* Table 7: history */}
            <div
              ref={(el) => {
                historySectionRef.current = el;
                registerRef('history')(el);
              }}
            >
              <HistoryTable
                signals={pagedClosed}
                allSignals={useHistoryServerPagination ? undefined : sortedClosed}
                totalCount={effectiveHistoryTotalCount}
                currentPage={historyPage}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
                serverPaginated={useHistoryServerPagination}
                externalSymbolFilter={historySymbolFilter || undefined}
                onClearExternalSymbolFilter={handleClearHistorySymbolFilter}
                externalDatePeriod={effectiveHistoryDatePeriod}
                externalDateRange={exactHistoryDateRange}
                onClearExternalDateRange={handleClearHistoryDateRange}
                pageSize={historyPageSize}
                onRowClick={(row) => navigateToSignalChart(row)}
                signalFilterActive={false}
                upgradeRequired={isSymbolLocked}
                simulationInput={simulationInput}
                selectedStrategy={selectedStrategy}
                onFilteredSignalsChange={handleHistoryFilteredSignalsChange}
                onHistoryQueryChange={setHistoryQueryState}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Signal Detail Card */}
      <SignalDetailCard />
    </div>
  );
}
