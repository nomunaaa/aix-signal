'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  reconstructSymbolStats,
  reconstructTotalStatsForSymbols,
  type ProofStatsSelection,
} from '@/lib/proof/proof-buckets';
import { buildEmptyProofPage } from '@/lib/proof/build-proof-page-data';
import { emptyStatsSlice } from '@/lib/proof/proof-stats';
import type { ProofPageMock, ProofStatsStream, ProofStatsTrendMode, ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import { DEFAULT_SHARED_SIMULATION_INPUT } from '@/lib/simulationStorage';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { StreamSelector } from '@/views/signals/pulse/components/StreamSelector';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_OPTION_OUTLINE_CLASS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import { HistorySymbolCountLink } from '@/components/proof/HistoryEntryCountLink';
import { HistoricalMoneyCell, HistoricalPctCell } from '@/components/proof/ProofStatCells';
import { formatHoldSec, formatRatio, projectedPct, projectedUsd, proofLanguageFromCode } from '@/components/proof/proofFormat';
import { formatWinRate } from '@/lib/proof/format-proof';
import { PROOF_COPY } from '@/components/proof/proofCopy';
import { TableHeaderLabel } from '@/components/proof/SortableTh';
import { SymbolQualityFilter } from '@/components/proof/SymbolQualityFilter';
import {
  hasPositiveLongTermProfit,
  meetsQualityThresholdsForPeriod,
} from '@/components/proof/symbolQuality';
import { FavoriteScopeControls } from '@/views/signals/pulse/components/FavoriteScopeControls';

const OPTIONS: readonly { id: SignalStreamOptionId; group: string; selection?: ProofStatsSelection }[] = [
  { id: 'P1', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'reversal' } },
  { id: 'P2', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'trend' } },
  { id: 'P3', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'nonTrend' } },
  { id: 'B1', group: 'Beat', selection: { stream: 'BEAT', trendMode: 'reversal' } },
  { id: 'B2', group: 'Beat', selection: { stream: 'BEAT', trendMode: 'trend' } },
  { id: 'B3', group: 'Beat', selection: { stream: 'BEAT', trendMode: 'nonTrend' } },
  { id: 'W1', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'reversal' } },
  { id: 'W2', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'trend' } },
  { id: 'W3', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'nonTrend' } },
];

type SelectionOptionStats = {
  row: ProofTotalStatsRow | null;
  symbolCount: number;
  symbols: string[];
};

type SelectionPeriod = 'recent30' | 'recent3mo' | 'total';
type SelectionMetric =
  | 'symbols'
  | 'entries'
  | 'accountReturn'
  | 'accountProfit'
  | 'winRate'
  | 'ratio'
  | 'holdTime';
type SelectionSortKey = `${SelectionPeriod}:${SelectionMetric}`;
type ProofCopy = (typeof PROOF_COPY)[keyof typeof PROOF_COPY];

function selectionMetricColumns(copy: ProofCopy): { metric: SelectionMetric; label: string }[] {
  return [
    { metric: 'symbols', label: copy.filters.symbol },
    { metric: 'entries', label: copy.table.entries },
    { metric: 'accountReturn', label: copy.table.accountReturn },
    { metric: 'accountProfit', label: copy.table.accountProfit },
    { metric: 'winRate', label: copy.table.avgWinRate },
    { metric: 'ratio', label: copy.table.avgRatio },
    { metric: 'holdTime', label: copy.table.avgHoldTime },
  ];
}

/** Mirrors the same seed/entryRatio/leverage the Account Return/Profit cells project with. */
function selectionSortValue(entry: SelectionOptionStats, key: SelectionSortKey): number {
  const [period, metric] = key.split(':') as [SelectionPeriod, SelectionMetric];
  if (metric === 'symbols') return entry.symbolCount;

  const slice = entry.row
    ? period === 'recent30'
      ? entry.row.recent30
      : period === 'recent3mo'
        ? entry.row.recent3mo
        : entry.row.total
    : emptyStatsSlice();
  const { capital, capitalRatio, leverage } = DEFAULT_SHARED_SIMULATION_INPUT;
  switch (metric) {
    case 'entries':
      return slice.cycleCount;
    case 'accountReturn':
      return projectedPct(slice, capital, capitalRatio, leverage);
    case 'accountProfit':
      return projectedUsd(slice, capital, capitalRatio, leverage);
    case 'winRate':
      return slice.winRate;
    case 'ratio':
      return slice.winLossRatio ?? -Infinity;
    case 'holdTime':
      return slice.avgHoldSec ?? -Infinity;
    default:
      return 0;
  }
}

function SortableHeaderCell({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: SelectionSortKey;
  activeKey: SelectionSortKey | null;
  direction: 'asc' | 'desc';
  onSort: (key: SelectionSortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="cursor-pointer select-none overflow-hidden border-l border-border/60 px-0.5 py-2 text-center align-middle font-medium transition-colors hover:bg-muted/80"
      onClick={() => onSort(sortKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSort(sortKey);
        }
      }}
    >
      <span
        className="inline-flex min-w-0 max-w-full flex-col items-center justify-center overflow-hidden"
        title={label}
      >
        <TableHeaderLabel label={label} />
        {isActive ? (
          direction === 'desc' ? (
            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          ) : (
            <ChevronUp className="h-2.5 w-2.5 shrink-0" />
          )
        ) : (
          <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-30" />
        )}
      </span>
    </th>
  );
}

function MetricCells({
  slice,
  symbols,
  selection,
  id,
  period,
  language,
}: {
  slice: ProofPageMock['totalStats'][0]['total'];
  symbols: string[];
  selection?: ProofStatsSelection;
  id: SignalStreamOptionId;
  period: '30d' | '90d' | 'all';
  language: 'ko' | 'en' | 'ja';
}) {
  const present = slice.cycleCount > 0;
  const streams: ProofStatsStream[] = selection ? [selection.stream] : [];
  const trends: ProofStatsTrendMode[] = selection ? [selection.trendMode] : [];
  return (
    <>
      <td className="border-l border-border/60 px-1 py-3 text-right">
        <HistorySymbolCountLink
          symbols={symbols}
          count={Math.max(1, slice.cycleCount)}
          period={period}
          asOfIso={slice.asOfIso}
          asOfFromIso={slice.asOfFromIso}
          streams={streams}
          trendModes={trends}
          tradingCategories={['E2X2']}
          signalOptions={[id]}
          display="symbols"
        />
      </td>
      <td className="px-1 py-3 text-right">
        <HistorySymbolCountLink
          symbols={symbols}
          count={slice.cycleCount}
          period={period}
          asOfIso={slice.asOfIso}
          asOfFromIso={slice.asOfFromIso}
          streams={streams}
          trendModes={trends}
          tradingCategories={['E2X2']}
          signalOptions={[id]}
          display="entries"
        />
      </td>
      <td className="px-1 py-3 text-right">
        <HistoricalPctCell
          slice={slice}
          seed={DEFAULT_SHARED_SIMULATION_INPUT.capital}
          entryRatio={DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio}
          leverage={DEFAULT_SHARED_SIMULATION_INPUT.leverage}
          tone="standard"
        />
      </td>
      <td className="px-1 py-3 text-right">
        <HistoricalMoneyCell
          slice={slice}
          seed={DEFAULT_SHARED_SIMULATION_INPUT.capital}
          entryRatio={DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio}
          leverage={DEFAULT_SHARED_SIMULATION_INPUT.leverage}
          tone="standard"
        />
      </td>
      <td className="px-1 py-3 text-right font-mono font-semibold">
        {present ? formatWinRate(slice.winRate) : '—'}
      </td>
      <td className="px-1 py-3 text-right font-mono font-semibold">
        {formatRatio(slice.winLossRatio, present)}
      </td>
      <td className="px-1 py-3 text-right font-mono font-semibold">
        {formatHoldSec(slice.avgHoldSec, present, language)}
      </td>
    </>
  );
}

export function SelectionPageView() {
  const { i18n } = useTranslation();
  const language = proofLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  const copy = PROOF_COPY[language];
  const optionFilter = usePulseStore((state) => state.streamOptionFilter);
  const toggleOptionFilter = usePulseStore((state) => state.toggleStreamOptionFilter);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const [data, setData] = useState<ProofPageMock>(() => buildEmptyProofPage('30d'));
  // 기간은 화면마다 따로 들지 않고 스토어 하나만 본다 — 히스토리의 기간 선택과
  // 같은 값이라, 로컬 state로 두면 화면을 옮길 때마다 기간이 되돌아간다.
  const qualityPeriod = usePulseStore((state) => state.qualityPeriod);
  const setQualityPeriod = usePulseStore((state) => state.setQualityPeriod);
  useEffect(() => { void fetch('/api/proof').then((response) => response.ok ? response.json() as Promise<ProofPageMock> : Promise.reject()).then(setData).catch(() => undefined); }, []);
  const allSymbols = useMemo(() => Array.from(new Set([
    ...Object.keys(data.buckets.bySymbolTotal),
    ...Object.keys(data.buckets.bySymbolRecent30),
    ...Object.keys(data.buckets.bySymbolRecent3mo),
  ])), [data.buckets]);
  const stats = useMemo(() => new Map<SignalStreamOptionId, SelectionOptionStats>(
    OPTIONS.map((option): [SignalStreamOptionId, SelectionOptionStats] => {
      if (!option.selection) return [option.id, { row: null, symbolCount: 0, symbols: [] }];
      const rows = reconstructSymbolStats(data.buckets, [option.selection.stream], [option.selection.trendMode], ['E2X2'], [option.selection]);
      // Same bar as the Proof page's symbol table: a symbol must be profitable
      // long-term AND meet the win-rate/risk-reward threshold, not just one or
      // the other — otherwise a losing symbol could still pass on ratio alone.
      const symbols = rows
        .filter(
          (row) =>
            hasPositiveLongTermProfit(row) &&
            meetsQualityThresholdsForPeriod(
              row,
              qualityWinRateThreshold,
              qualityRiskRewardThreshold,
              qualityPeriod
            )
        )
        .map((row) => row.symbol.trim().toUpperCase())
        .filter((symbol) => !showFavoritesOnly || favorites.has(symbol));
      return [option.id, {
        row: reconstructTotalStatsForSymbols(data.buckets, symbols, [option.selection.stream], [option.selection.trendMode], ['E2X2'], [option.selection])[0],
        symbolCount: symbols.length,
        symbols,
      }];
    })
  ), [
    data.buckets,
    favorites,
    qualityPeriod,
    qualityRiskRewardThreshold,
    qualityWinRateThreshold,
    showFavoritesOnly,
  ]);
  const [sortKey, setSortKey] = useState<SelectionSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const metricColumns = selectionMetricColumns(copy);
  const handleSort = (key: SelectionSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };
  // Sort within the whole list (not just each Pulse/Beat/Wave sub-group) — the
  // group label below is shown whenever it differs from the row above it, so
  // this stays correct regardless of how the rows end up ordered.
  const sortedRows = useMemo(() => {
    const withEntries = OPTIONS.map((option) => ({
      option,
      entry: stats.get(option.id) ?? { row: null, symbolCount: 0, symbols: [] },
    }));
    if (!sortKey) return withEntries;
    const sorted = [...withEntries].sort(
      (a, b) => selectionSortValue(a.entry, sortKey) - selectionSortValue(b.entry, sortKey)
    );
    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
  }, [stats, sortKey, sortDirection]);
  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-background px-4 py-8 pb-20 text-foreground md:px-5">
      <div
        className="sticky z-40 -mx-4 mb-8 border-b border-border/40 bg-background/95 px-4 py-2 backdrop-blur md:-mx-5 md:px-5"
        style={{ top: 'var(--header-height)' }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <FavoriteScopeControls symbols={allSymbols} />
          <StreamSelector />
          <SymbolQualityFilter
            copy={copy}
            period={qualityPeriod}
            onPeriodChange={setQualityPeriod}
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full table-fixed border-collapse text-[10px] xl:text-xs">
          <colgroup>
            <col className="w-[3.5%]" />
            <col className="w-[3%]" />
            {Array.from({ length: 21 }).map((_, index) => (
              <col key={index} className="w-[4.5%]" />
            ))}
          </colgroup>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th rowSpan={2} className="px-1 py-2 text-center font-medium">
                {copy.filters.signal}
              </th>
              <th rowSpan={2} className="px-1 py-2 text-center font-medium">
                {copy.filters.trend}
              </th>
              <th colSpan={7} className="border-l border-border/60 px-1 py-2">
                {copy.table.recent30}
              </th>
              <th colSpan={7} className="border-l border-border/60 px-1 py-2">
                {copy.table.recent3mo}
              </th>
              <th colSpan={7} className="border-l border-border/60 px-1 py-2">
                {copy.table.cumulative}
              </th>
            </tr>
            <tr>
              {metricColumns.map(({ metric, label }) => (
                <SortableHeaderCell
                  key={`recent30:${metric}`}
                  label={label}
                  sortKey={`recent30:${metric}`}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              ))}
              {metricColumns.map(({ metric, label }) => (
                <SortableHeaderCell
                  key={`recent3mo:${metric}`}
                  label={label}
                  sortKey={`recent3mo:${metric}`}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              ))}
              {metricColumns.map(({ metric, label }) => (
                <SortableHeaderCell
                  key={`total:${metric}`}
                  label={label}
                  sortKey={`total:${metric}`}
                  activeKey={sortKey}
                  direction={sortDirection}
                  onSort={handleSort}
                />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sortedRows.map(({ option, entry }, index) => {
              const row = entry.row;
              const symbols = entry.symbols;
              const selected = optionFilter[option.id];
              const showGroupLabel =
                index === 0 || sortedRows[index - 1].option.group !== option.group;
              // 선택된 행 강조는 이 파일에만 있던 노란색이었다 — 디자인 토큰
              // 밖의 색이라 경고/오류처럼 보였다. 다른 화면에서 쓰는 primary
              // 틴트로 바꿔 두 테마 모두에서 자연스럽게 보이게 한다.
              return (
                <tr
                  key={option.id}
                  className={cn('transition-colors', selected && 'bg-primary/10')}
                >
                  <td className="px-1 py-3 text-center font-semibold">
                    {showGroupLabel ? option.group : ''}
                  </td>
                  <td className="px-1 py-3 text-center">
                    {/* 배지 모양은 상단 필터와 같은 뜻을 가진다 — 꽉 참은 "선택됨",
                        테두리만 있는 것은 "선택되지 않음". 상단 필터와 같은 스토어
                        액션을 부르므로 어느 쪽을 눌러도 양쪽이 함께 바뀐다. */}
                    <button
                      type="button"
                      onClick={() => toggleOptionFilter(option.id)}
                      aria-pressed={selected}
                      title={`${option.id} ${
                        language === 'ko'
                          ? selected
                            ? '필터 끄기'
                            : '필터 켜기'
                          : language === 'ja'
                            ? selected
                              ? 'フィルター解除'
                              : 'フィルター適用'
                            : selected
                              ? 'filter off'
                              : 'filter on'
                      }`}
                      className={cn(
                        'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold transition-colors',
                        'cursor-pointer hover:opacity-80',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                        selected
                          ? SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(option.id)]
                          : SIGNAL_OPTION_OUTLINE_CLASS[signalOptionTone(option.id)]
                      )}
                    >
                      {option.id}
                    </button>
                  </td>
                  <MetricCells
                    slice={row?.recent30 ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="30d"
                    language={language}
                  />
                  <MetricCells
                    slice={row?.recent3mo ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="90d"
                    language={language}
                  />
                  <MetricCells
                    slice={row?.total ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="all"
                    language={language}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
