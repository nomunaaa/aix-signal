'use client';

import { Fragment, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWinRate } from '@/lib/proof/format-proof';
import { emptyStatsSlice } from '@/lib/proof/proof-stats';
import {
  reconstructSymbolStats,
  type ProofBuckets,
  type ProofStatsSelection,
} from '@/lib/proof/proof-buckets';
import type {
  ProofStatsStream,
  ProofStatsTrendMode,
  ProofSymbolStatsRow,
} from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { AssetSymbolCell, HistoricalMoneyCell, HistoricalPctCell } from './ProofStatCells';
import { HistoryEntryCountLink } from './HistoryEntryCountLink';
import { SortableTh, TableHeaderLabel, type SymbolStatsSortKey } from './SortableTh';
import {
  combineProofCycleStats,
  formatHoldSec,
  formatRatio,
  type ProofLanguage,
} from './proofFormat';
import type { ProofCopy } from './proofCopy';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import {
  hasPositiveLongTermProfit,
  meetsQualityThresholdsForPeriod,
  type ProofQualityPeriod,
} from './symbolQuality';

function symbolStatsSortValue(row: ProofSymbolStatsRow, key: SymbolStatsSortKey): number {
  if (key === 'symbol') return 0;

  const [period, metric] = key.split(':') as [
    'recent30' | 'recent3mo' | 'total',
    'entries' | 'pnl' | 'winRate' | 'avgRatio' | 'holdTime',
  ];
  const slice =
    period === 'recent30'
      ? row.recent30Total
      : period === 'recent3mo'
        ? row.recent3moTotal
        : row.standard;
  switch (metric) {
    case 'entries':
      return slice.cycleCount;
    case 'pnl':
      return slice.pnlPerEntryNotionalRateSum;
    case 'winRate':
      return slice.winRate;
    case 'avgRatio':
      return slice.winLossRatio ?? -Infinity;
    case 'holdTime':
      return slice.avgHoldSec ?? -Infinity;
    default:
      return 0;
  }
}

function compareSymbolStatsRows(
  a: ProofSymbolStatsRow,
  b: ProofSymbolStatsRow,
  key: SymbolStatsSortKey
): number {
  if (key === 'symbol') {
    return a.symbol.localeCompare(b.symbol);
  }
  return symbolStatsSortValue(a, key) - symbolStatsSortValue(b, key);
}

const GROUP_HEADER_CLASS = 'bg-muted px-1 py-2 text-center align-middle font-medium';
const METRIC_HEADER_CLASS = 'bg-muted';
const BORDERED_METRIC_HEADER_CLASS = 'border-l border-border/60 bg-muted';
const SYMBOL_CELL_CLASS = 'bg-card px-1 py-3 text-left text-foreground';
const METRIC_CELL_CLASS =
  'min-w-0 truncate px-1 py-3 text-right font-mono font-semibold tabular-nums text-foreground';
const BORDERED_METRIC_CELL_CLASS = `${METRIC_CELL_CLASS} border-l border-border/60`;
const VALUE_CELL_CLASS = 'min-w-0 px-1 py-3 text-right';
const EMPTY_SLICE = emptyStatsSlice();
const SIGNAL_CHILDREN: readonly {
  id: SignalStreamOptionId;
  selection?: ProofStatsSelection;
}[] = [
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

export function SymbolMetricCells({
  row,
  symbol,
  seed,
  entryRatio,
  leverage,
  streams,
  trendModes,
  tradingCategories,
  signalOptions,
  language,
}: {
  row?: ProofSymbolStatsRow;
  symbol: string;
  seed: number;
  entryRatio: number;
  leverage: number;
  streams: readonly ProofStatsStream[];
  trendModes: readonly ProofStatsTrendMode[];
  tradingCategories: readonly TradingCategory[];
  signalOptions: readonly SignalStreamOptionId[];
  language: ProofLanguage;
}) {
  const periods = [
    { period: '30d' as const, slice: row?.recent30Total ?? EMPTY_SLICE },
    { period: '90d' as const, slice: row?.recent3moTotal ?? EMPTY_SLICE },
    { period: 'all' as const, slice: row?.standard ?? EMPTY_SLICE },
  ];

  return periods.map(({ period, slice }) => {
    const present = slice.cycleCount > 0;
    return (
      <Fragment key={period}>
        <td className={BORDERED_METRIC_CELL_CLASS}>
          <HistoryEntryCountLink
            symbol={symbol}
            count={slice.cycleCount}
            period={period}
            asOfIso={slice.asOfIso}
            streams={streams}
            trendModes={trendModes}
            tradingCategories={tradingCategories}
            signalOptions={signalOptions}
          />
        </td>
        <td className={VALUE_CELL_CLASS}>
          <HistoricalPctCell
            slice={slice}
            seed={seed}
            entryRatio={entryRatio}
            leverage={leverage}
            tone="standard"
          />
        </td>
        <td className={VALUE_CELL_CLASS}>
          <HistoricalMoneyCell
            slice={slice}
            seed={seed}
            entryRatio={entryRatio}
            leverage={leverage}
            tone="standard"
          />
        </td>
        <td className={METRIC_CELL_CLASS}>{present ? formatWinRate(slice.winRate) : '—'}</td>
        <td className={METRIC_CELL_CLASS}>{formatRatio(slice.winLossRatio, present)}</td>
        <td className={METRIC_CELL_CLASS}>{formatHoldSec(slice.avgHoldSec, present, language)}</td>
      </Fragment>
    );
  });
}

/** Build the parent row from precisely the child rows that remain visible. */
function combineVisibleChildRows(rows: readonly ProofSymbolStatsRow[]): ProofSymbolStatsRow {
  const first = rows[0];
  if (!first) throw new Error('At least one visible child row is required.');

  return {
    symbol: first.symbol,
    shortName: first.shortName,
    recent30Total: combineProofCycleStats(rows.map((row) => row.recent30Total)),
    recent3moTotal: combineProofCycleStats(rows.map((row) => row.recent3moTotal)),
    recent30Discounted: combineProofCycleStats(rows.map((row) => row.recent30Discounted)),
    recent3moDiscounted: combineProofCycleStats(rows.map((row) => row.recent3moDiscounted)),
    recent30Combined: combineProofCycleStats(rows.map((row) => row.recent30Combined)),
    recent3moCombined: combineProofCycleStats(rows.map((row) => row.recent3moCombined)),
    standard: combineProofCycleStats(rows.map((row) => row.standard)),
    discounted: combineProofCycleStats(rows.map((row) => row.discounted)),
    combined: combineProofCycleStats(rows.map((row) => row.combined)),
  };
}

export function SymbolStatsSection({
  rows,
  seed,
  entryRatio,
  leverage,
  tradingCategories,
  copy,
  language,
  buckets,
  selectedOptionIds,
  qualityPeriod,
}: {
  rows: ProofSymbolStatsRow[];
  seed: number;
  entryRatio: number;
  leverage: number;
  tradingCategories: readonly TradingCategory[];
  copy: ProofCopy;
  language: ProofLanguage;
  buckets: ProofBuckets;
  selectedOptionIds: readonly SignalStreamOptionId[];
  qualityPeriod: ProofQualityPeriod;
}) {
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  // 전략(P1/P2/P3 등)별로 걸러낸 뒤 남은 종목의 데이터만 표에 반영한다 —
  // 승률/손익비 threshold는 SymbolQualityFilter와 동일 기준을 공유한다.
  const isChildVisible = (childRow: ProofSymbolStatsRow | undefined): childRow is ProofSymbolStatsRow =>
    childRow != null &&
    hasPositiveLongTermProfit(childRow) &&
    meetsQualityThresholdsForPeriod(
      childRow,
      qualityWinRateThreshold,
      qualityRiskRewardThreshold,
      qualityPeriod
    );
  const [sortKey, setSortKey] = useState<SymbolStatsSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(() => new Set());
  const selectedChildren = useMemo(() => {
    const selectedIds = new Set(selectedOptionIds);
    return SIGNAL_CHILDREN.filter((child) => selectedIds.has(child.id));
  }, [selectedOptionIds]);
  const childRowsByOption = useMemo(() => {
    const result = new Map<SignalStreamOptionId, Map<string, ProofSymbolStatsRow>>();
    for (const child of selectedChildren) {
      if (!child.selection) {
        result.set(child.id, new Map());
        continue;
      }
      const childRows = reconstructSymbolStats(
        buckets,
        [child.selection.stream],
        [child.selection.trendMode],
        tradingCategories,
        [child.selection]
      );
      result.set(child.id, new Map(childRows.map((row) => [row.symbol, row])));
    }
    return result;
  }, [buckets, selectedChildren, tradingCategories]);
  const toggleExpanded = (symbol: string) => {
    setExpandedSymbols((current) => {
      const next = new Set(current);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      return next;
    });
  };
  const handleSort = (key: SymbolStatsSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'symbol' ? 'asc' : 'desc');
    }
  };
  const visibleRows = useMemo(() => {
    const rowsWithVisibleChildren = rows.flatMap((row) => {
      const visibleChildren = selectedChildren
        .map((child) => childRowsByOption.get(child.id)?.get(row.symbol))
        .filter(isChildVisible);
      return visibleChildren.length ? [combineVisibleChildRows(visibleChildren)] : [];
    });
    let filtered = showFavoritesOnly
      ? rowsWithVisibleChildren.filter((row) => favorites.has(row.symbol.trim().toUpperCase()))
      : rowsWithVisibleChildren;
    filtered = filtered.filter((row) => {
      if (
        row.standard.cycleCount === 0 &&
        row.recent30Total.cycleCount === 0 &&
        row.recent3moTotal.cycleCount === 0
      ) {
        return false;
      }

      return true;
    });
    if (!sortKey) return filtered;
    const sorted = [...filtered].sort((a, b) => compareSymbolStatsRows(a, b, sortKey));
    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
  }, [
    favorites,
    rows,
    childRowsByOption,
    selectedChildren,
    showFavoritesOnly,
    sortKey,
    sortDirection,
    qualityWinRateThreshold,
    qualityRiskRewardThreshold,
    qualityPeriod,
  ]);
  const allExpanded =
    visibleRows.length > 0 && visibleRows.every((row) => expandedSymbols.has(row.symbol));
  const toggleExpandAll = () => {
    setExpandedSymbols(
      allExpanded ? new Set() : new Set(visibleRows.map((row) => row.symbol))
    );
  };

  return (
    <section className="mt-10 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {copy.sections.symbol.title}
        </h2>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full table-fixed border-collapse text-[10px] xl:text-xs">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5.5%]" />
            <col className="w-[6%]" />
            <col className="w-[4.5%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5.5%]" />
            <col className="w-[6%]" />
            <col className="w-[4.5%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5.5%]" />
            <col className="w-[6%]" />
            <col className="w-[4.5%]" />
            <col className="w-[4.5%]" />
            <col className="w-[5%]" />
          </colgroup>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              {/* 전체 열기/닫기는 행마다 있는 chevron 바로 위, 같은 열에 둔다 —
                  제목 옆에 있을 때보다 무엇을 여닫는 버튼인지 분명해진다. */}
              <th className="bg-muted px-1 py-2 align-middle font-medium">
                <div className="flex w-full min-w-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleExpandAll}
                    disabled={visibleRows.length === 0}
                    aria-expanded={allExpanded}
                    title={allExpanded ? copy.table.collapseAll : copy.table.expandAll}
                    aria-label={allExpanded ? copy.table.collapseAll : copy.table.expandAll}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-background/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
                  >
                    {allExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <span className="min-w-0 flex-1 text-center">
                    <TableHeaderLabel label={copy.table.asset} />
                  </span>
                </div>
              </th>
              <th colSpan={6} className={`${GROUP_HEADER_CLASS} border-l border-border/60`}>
                {copy.table.recent30}
              </th>
              <th colSpan={6} className={`${GROUP_HEADER_CLASS} border-l border-border/60`}>
                {copy.table.recent3mo}
              </th>
              <th colSpan={6} className={`${GROUP_HEADER_CLASS} border-l border-border/60`}>
                {copy.table.cumulative}
              </th>
            </tr>
            <tr>
              <SortableTh
                label={`${copy.filters.symbol}(${visibleRows.length})`}
                sortKey="symbol"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className="bg-muted text-center"
              />
              <SortableTh
                label={copy.table.entries}
                sortKey="recent30:entries"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={BORDERED_METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountReturn}
                sortKey="recent30:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountProfit}
                sortKey="recent30:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgWinRate}
                sortKey="recent30:winRate"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgRatio}
                sortKey="recent30:avgRatio"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgHoldTime}
                sortKey="recent30:holdTime"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.entries}
                sortKey="recent3mo:entries"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={BORDERED_METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountReturn}
                sortKey="recent3mo:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountProfit}
                sortKey="recent3mo:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgWinRate}
                sortKey="recent3mo:winRate"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgRatio}
                sortKey="recent3mo:avgRatio"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgHoldTime}
                sortKey="recent3mo:holdTime"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.entries}
                sortKey="total:entries"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={BORDERED_METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountReturn}
                sortKey="total:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.accountProfit}
                sortKey="total:pnl"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgWinRate}
                sortKey="total:winRate"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgRatio}
                sortKey="total:avgRatio"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
              <SortableTh
                label={copy.table.avgHoldTime}
                sortKey="total:holdTime"
                activeKey={sortKey}
                direction={sortDirection}
                onSort={handleSort}
                className={METRIC_HEADER_CLASS}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-2 py-8 text-center text-sm text-muted-foreground">
                  {copy.table.empty}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const expanded = expandedSymbols.has(row.symbol);
                const visibleChildren = selectedChildren.filter((child) =>
                  isChildVisible(childRowsByOption.get(child.id)?.get(row.symbol))
                );
                const visibleChildSelections = visibleChildren.flatMap((child) =>
                  child.selection ? [child.selection] : []
                );
                return (
                  <Fragment key={row.symbol}>
                    <tr className="hover:bg-muted/30">
                      <td className={SYMBOL_CELL_CLASS}>
                        <div className="flex w-full min-w-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(row.symbol)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-expanded={expanded}
                            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.symbol} signal stats`}
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          <AssetSymbolCell symbol={row.symbol} />
                        </div>
                      </td>
                      <SymbolMetricCells
                        row={row}
                        symbol={row.symbol}
                        seed={seed}
                        entryRatio={entryRatio}
                        leverage={leverage}
                        streams={[
                          ...new Set(visibleChildSelections.map((selection) => selection.stream)),
                        ]}
                        trendModes={[
                          ...new Set(
                            visibleChildSelections.map((selection) => selection.trendMode)
                          ),
                        ]}
                        tradingCategories={tradingCategories}
                        signalOptions={visibleChildren.map((child) => child.id)}
                        language={language}
                      />
                    </tr>
                    {expanded
                      ? visibleChildren.map((child) => {
                          const childRow = childRowsByOption.get(child.id)?.get(row.symbol);
                          const childStreams = child.selection ? [child.selection.stream] : [];
                          const childTrendModes = child.selection
                            ? [child.selection.trendMode]
                            : [];
                          if (!childRow) return null;
                          return (
                            <tr
                              key={`${row.symbol}-${child.id}`}
                              className="bg-muted/15 hover:bg-muted/30"
                            >
                              <td className="px-1 py-2.5 pl-8 text-left">
                                <span
                                  className={cn(
                                    'inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 text-[10px] font-bold',
                                    SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(child.id)]
                                  )}
                                >
                                  {child.id}
                                </span>
                              </td>
                              <SymbolMetricCells
                                row={childRow}
                                symbol={row.symbol}
                                seed={seed}
                                entryRatio={entryRatio}
                                leverage={leverage}
                                streams={childStreams}
                                trendModes={childTrendModes}
                                tradingCategories={tradingCategories}
                                signalOptions={[child.id]}
                                language={language}
                              />
                            </tr>
                          );
                        })
                      : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
