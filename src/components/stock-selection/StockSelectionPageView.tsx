'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { CoinIcon } from '@/components/signals/CoinIcon';
import { FavoriteStarButton } from '@/components/common/FavoriteStarButton';
import { ProofStatBar } from '@/components/proof/ProofStatBar';
import { ProofToolbar } from '@/components/proof/ProofToolbar';
import { SymbolMetricCells } from '@/components/proof/SymbolStatsSection';
import {
  SortableTh,
  TableHeaderLabel,
  type SymbolStatsSortKey,
} from '@/components/proof/SortableTh';
import { PROOF_COPY } from '@/components/proof/proofCopy';
import { combineProofCycleStats, proofLanguageFromCode } from '@/components/proof/proofFormat';
import {
  hasPositiveLongTermProfit,
  meetsQualityThresholdsForPeriod,
} from '@/components/proof/symbolQuality';
import { getSymbolsFromEnv } from '@/config/symbols';
import type { ProofPageMock, ProofSymbolStatsRow, ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import { buildEmptyProofPage } from '@/lib/proof/build-proof-page-data';
import { reconstructSymbolStats, type ProofStatsSelection } from '@/lib/proof/proof-buckets';
import type { TradingCategory } from '@/lib/trading-category';
import {
  DEFAULT_SHARED_SIMULATION_INPUT,
  readSharedSimulationInput,
  subscribeSharedSimulationInput,
} from '@/lib/simulationStorage';
import { cn } from '@/lib/utils';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import { SelectedSignalBolt, SelectedSignalScope } from './SelectedSignalBolt';
import { StockSignalSelector } from './StockSignalSelector';
import { useStockSelectionStore } from './stockSelectionStore';

type OptionDefinition = { id: SignalStreamOptionId; selection?: ProofStatsSelection };
type StockSelectionRow = { option: OptionDefinition; stats: ProofSymbolStatsRow };

const OPTIONS: readonly OptionDefinition[] = [
  { id: 'P1', selection: { stream: 'PULSE', trendMode: 'reversal' } },
  { id: 'P2', selection: { stream: 'PULSE', trendMode: 'trend' } },
  { id: 'P3', selection: { stream: 'PULSE', trendMode: 'nonTrend' } },
  { id: 'B1', selection: { stream: 'BEAT', trendMode: 'reversal' } },
  { id: 'B2', selection: { stream: 'BEAT', trendMode: 'trend' } },
  { id: 'B3', selection: { stream: 'BEAT', trendMode: 'nonTrend' } },
  { id: 'W1', selection: { stream: 'WAVE', trendMode: 'reversal' } },
  { id: 'W2', selection: { stream: 'WAVE', trendMode: 'trend' } },
  { id: 'W3', selection: { stream: 'WAVE', trendMode: 'nonTrend' } },
];

const OPTION_ORDER = new Map(OPTIONS.map((option, index) => [option.id, index]));

const TRADING_CATEGORIES: readonly TradingCategory[] = ['E2X2'];
const METRIC_HEADER_CLASS = 'overflow-hidden px-1 py-2 text-center align-middle font-medium';
const BORDERED_METRIC_HEADER_CLASS = `${METRIC_HEADER_CLASS} border-l border-border/60`;

function compareRows(a: StockSelectionRow, b: StockSelectionRow, key: SymbolStatsSortKey): number {
  if (key === 'symbol') return a.stats.symbol.localeCompare(b.stats.symbol);
  const [period, metric] = key.split(':') as [string, string];
  const slice = (row: ProofSymbolStatsRow) =>
    period === 'recent30'
      ? row.recent30Total
      : period === 'recent3mo'
        ? row.recent3moTotal
        : row.standard;
  const value = (row: ProofSymbolStatsRow) => {
    const current = slice(row);
    if (metric === 'entries') return current.cycleCount;
    if (metric === 'winRate') return current.winRate;
    if (metric === 'avgRatio') return current.winLossRatio ?? Number.NEGATIVE_INFINITY;
    if (metric === 'holdTime') return current.avgHoldSec ?? Number.NEGATIVE_INFINITY;
    return current.pnlPerEntryNotionalRateSum;
  };
  return value(a.stats) - value(b.stats);
}

function buildPinnedStats(
  rows: readonly StockSelectionRow[]
): [ProofTotalStatsRow, ProofTotalStatsRow] {
  return [
    {
      key: 'standard',
      label: 'Standard',
      recent30: combineProofCycleStats(rows.map(({ stats }) => stats.recent30Total)),
      recent3mo: combineProofCycleStats(rows.map(({ stats }) => stats.recent3moTotal)),
      total: combineProofCycleStats(rows.map(({ stats }) => stats.standard)),
    },
    {
      key: 'discounted',
      label: 'Discounted',
      recent30: combineProofCycleStats(rows.map(({ stats }) => stats.recent30Discounted)),
      recent3mo: combineProofCycleStats(rows.map(({ stats }) => stats.recent3moDiscounted)),
      total: combineProofCycleStats(rows.map(({ stats }) => stats.discounted)),
    },
  ];
}

export function StockSelectionPageView() {
  const { i18n } = useTranslation();
  const languageCode = useSyncExternalStore(
    (onStoreChange) => {
      i18n.on('languageChanged', onStoreChange);
      return () => i18n.off('languageChanged', onStoreChange);
    },
    () => i18n.resolvedLanguage ?? i18n.language,
    () => 'ko'
  );
  const language = proofLanguageFromCode(languageCode);
  const copy = PROOF_COPY[language];
  const toolbarRef = useRef<HTMLDivElement>(null);
  const allSymbols = useMemo(() => getSymbolsFromEnv(), []);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const searchQuery = usePulseStore((state) => state.searchQuery);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const streamOptionFilter = usePulseStore((state) => state.streamOptionFilter);
  const excludedSignals = useStockSelectionStore((state) => state.excludedSignals);
  const showSelectedOnly = useStockSelectionStore((state) => state.showSelectedOnly);
  const hydrateSelection = useStockSelectionStore((state) => state.hydrate);
  // 기간은 화면마다 따로 들지 않고 스토어 하나만 본다 — 히스토리의 기간 선택과
  // 같은 값이라, 로컬 state로 두면 화면을 옮길 때마다 기간이 되돌아간다.
  const qualityPeriod = usePulseStore((state) => state.qualityPeriod);
  const setQualityPeriod = usePulseStore((state) => state.setQualityPeriod);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [seed, setSeed] = useState(DEFAULT_SHARED_SIMULATION_INPUT.capital);
  const [entryRatio, setEntryRatio] = useState(DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio);
  const [leverage, setLeverage] = useState(DEFAULT_SHARED_SIMULATION_INPUT.leverage);
  const [sortKey, setSortKey] = useState<SymbolStatsSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [data, setData] = useState<ProofPageMock>(() => buildEmptyProofPage('30d'));

  useEffect(() => hydrateSelection(), [hydrateSelection]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/proof', { signal: controller.signal })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<ProofPageMock>)
          : Promise.reject(new Error(String(response.status)))
      )
      .then(setData)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          console.error('[stock-selection] data fetch failed:', error);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const apply = (input: ReturnType<typeof readSharedSimulationInput>) => {
      setSeed(input.capital);
      setEntryRatio(input.capitalRatio);
      setLeverage(input.leverage);
    };
    apply(readSharedSimulationInput());
    return subscribeSharedSimulationInput(apply);
  }, []);
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const sync = () => setToolbarHeight(Math.ceil(toolbar.getBoundingClientRect().height));
    sync();
    window.addEventListener('resize', sync);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    observer?.observe(toolbar);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  const rowsByOption = useMemo(
    () =>
      new Map(
        OPTIONS.map((option) => {
          if (!option.selection)
            return [option.id, new Map<string, ProofSymbolStatsRow>()] as const;
          const rows = reconstructSymbolStats(
            data.buckets,
            [option.selection.stream],
            [option.selection.trendMode],
            TRADING_CATEGORIES,
            [option.selection]
          );
          return [
            option.id,
            new Map(rows.map((row) => [row.symbol.trim().toUpperCase(), row])),
          ] as const;
        })
      ),
    [data.buckets]
  );

  const profitableSymbolsByOption = useMemo(() => {
    const result = {} as Record<SignalStreamOptionId, readonly string[]>;
    for (const option of OPTIONS) {
      const optionRows = rowsByOption.get(option.id);
      result[option.id] = allSymbols.filter((symbol) => {
        const stats = optionRows?.get(symbol);
        return stats != null && hasPositiveLongTermProfit(stats);
      });
    }
    return result;
  }, [allSymbols, rowsByOption]);

  const visibleRows = useMemo(() => {
    const query = searchQuery.trim().toUpperCase();
    const rows = OPTIONS.filter((option) => streamOptionFilter[option.id]).flatMap((option) => {
      const optionRows = rowsByOption.get(option.id)!;
      return allSymbols.flatMap((symbol): StockSelectionRow[] => {
        const stats = optionRows.get(symbol);
        if (!stats || !hasPositiveLongTermProfit(stats)) return [];
        if (
          !meetsQualityThresholdsForPeriod(
            stats,
            qualityWinRateThreshold,
            qualityRiskRewardThreshold,
            qualityPeriod
          )
        )
          return [];
        if (showFavoritesOnly && !favorites.has(symbol)) return [];
        // 해제해도 종목은 목록에 그대로 남는다 — '선택시그널'로 좁혀 볼 때만 숨긴다.
        if (showSelectedOnly && excludedSignals[option.id].has(symbol)) return [];
        if (query && !symbol.includes(query)) return [];
        return [{ option, stats }];
      });
    });

    // 정렬은 시그널 종류별로 나눠서 하지 않고 전체 행에 한 번에 건다. 종류별로
    // 돌리면 P1이 전부 먼저, 그다음 B2… 순으로 묶여서 승률보다 시그널 종류가
    // 사실상 1순위가 되어 버린다. 값이 같을 때만 종류·심볼 순으로 정리한다.
    if (!sortKey) return rows;
    const direction = sortDirection === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const delta = compareRows(a, b, sortKey) * direction;
      if (delta !== 0) return delta;
      const optionDelta = OPTION_ORDER.get(a.option.id)! - OPTION_ORDER.get(b.option.id)!;
      if (optionDelta !== 0) return optionDelta;
      return a.stats.symbol.localeCompare(b.stats.symbol);
    });
  }, [
    allSymbols,
    favorites,
    qualityPeriod,
    qualityRiskRewardThreshold,
    qualityWinRateThreshold,
    rowsByOption,
    searchQuery,
    excludedSignals,
    streamOptionFilter,
    showFavoritesOnly,
    showSelectedOnly,
    sortDirection,
    sortKey,
  ]);

  // 상단 통계는 켜져 있는 시그널만 합산한다. 해제한 종목은 화면에는 남지만
  // 여기서는 빠진다 — 그게 번개를 끄는 목적이다.
  const statsRows = useMemo(
    () => visibleRows.filter(({ option, stats }) => !excludedSignals[option.id].has(stats.symbol)),
    [visibleRows, excludedSignals]
  );
  const pinnedStats = useMemo(() => buildPinnedStats(statsRows), [statsRows]);
  const handleSort = (key: SymbolStatsSortKey) => {
    if (sortKey === key) setSortDirection((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDirection(key === 'symbol' ? 'asc' : 'desc');
    }
  };

  const metricHeader = (label: string, key: SymbolStatsSortKey, bordered = false) => (
    <SortableTh
      label={label}
      sortKey={key}
      activeKey={sortKey}
      direction={sortDirection}
      onSort={handleSort}
      className={bordered ? BORDERED_METRIC_HEADER_CLASS : METRIC_HEADER_CLASS}
    />
  );

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-background px-4 py-8 pb-20 text-foreground md:px-5">
      <ProofToolbar
        containerRef={toolbarRef}
        qualityPeriod={qualityPeriod}
        onQualityPeriodChange={setQualityPeriod}
        streamWinRates={{}}
        favoriteSymbols={allSymbols}
        renderFavoriteScopeAddon={(className) => <SelectedSignalScope className={className} />}
        renderStreamOptionSelector={(className) => (
          <StockSignalSelector symbolsByOption={profitableSymbolsByOption} className={className} />
        )}
        streamSummaryOverride="Signal selection"
        compactSimulationTrigger
      />
      <ProofStatBar rows={pinnedStats} copy={copy} stickyTopOffsetPx={toolbarHeight} />

      <section className="mt-8">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-[10px] xl:text-xs">
            <colgroup>
              <col className="w-[4.5%]" />
              <col className="w-[10%]" />
              {Array.from({ length: 18 }).map((_, index) => (
                <col key={index} className="w-[4.75%]" />
              ))}
            </colgroup>
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th rowSpan={2} className="px-1 py-2 text-center font-medium">
                  {language === 'ko' ? '추세' : language === 'ja' ? 'トレンド' : 'Trend'}
                </th>
                <th rowSpan={2} className="px-1 py-2 text-center font-medium">
                  <TableHeaderLabel label={copy.table.asset} />
                </th>
                <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                  {copy.table.recent30}
                </th>
                <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                  {copy.table.recent3mo}
                </th>
                <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                  {copy.table.cumulative}
                </th>
              </tr>
              <tr>
                {metricHeader(copy.table.entries, 'recent30:entries', true)}
                {metricHeader(copy.table.accountReturn, 'recent30:pnl')}
                {metricHeader(copy.table.accountProfit, 'recent30:pnl')}
                {metricHeader(copy.table.avgWinRate, 'recent30:winRate')}
                {metricHeader(copy.table.avgRatio, 'recent30:avgRatio')}
                {metricHeader(copy.table.avgHoldTime, 'recent30:holdTime')}
                {metricHeader(copy.table.entries, 'recent3mo:entries', true)}
                {metricHeader(copy.table.accountReturn, 'recent3mo:pnl')}
                {metricHeader(copy.table.accountProfit, 'recent3mo:pnl')}
                {metricHeader(copy.table.avgWinRate, 'recent3mo:winRate')}
                {metricHeader(copy.table.avgRatio, 'recent3mo:avgRatio')}
                {metricHeader(copy.table.avgHoldTime, 'recent3mo:holdTime')}
                {metricHeader(copy.table.entries, 'total:entries', true)}
                {metricHeader(copy.table.accountReturn, 'total:pnl')}
                {metricHeader(copy.table.accountProfit, 'total:pnl')}
                {metricHeader(copy.table.avgWinRate, 'total:winRate')}
                {metricHeader(copy.table.avgRatio, 'total:avgRatio')}
                {metricHeader(copy.table.avgHoldTime, 'total:holdTime')}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visibleRows.length ? (
                visibleRows.map(({ option, stats }) => (
                  <tr key={`${option.id}-${stats.symbol}`} className="hover:bg-muted/30">
                    <td className="px-1 py-3 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 text-[10px] font-bold',
                          SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(option.id)]
                        )}
                      >
                        {option.id}
                      </span>
                    </td>
                    <td className="bg-card px-1 py-3 text-left text-foreground">
                      <div className="flex min-w-0 items-center gap-1">
                        <FavoriteStarButton symbol={stats.symbol} />
                        <CoinIcon symbol={stats.symbol} size={16} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate font-mono font-medium">
                          {stats.shortName}
                        </span>
                        <SelectedSignalBolt optionId={option.id} symbol={stats.symbol} />
                      </div>
                    </td>
                    <SymbolMetricCells
                      row={stats}
                      symbol={stats.symbol}
                      seed={seed}
                      entryRatio={entryRatio}
                      leverage={leverage}
                      streams={option.selection ? [option.selection.stream] : []}
                      trendModes={option.selection ? [option.selection.trendMode] : []}
                      tradingCategories={TRADING_CATEGORIES}
                      signalOptions={[option.id]}
                      language={language}
                    />
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={20} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    {copy.table.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
