'use client';

import { useMemo, useState } from 'react';
import { formatWinRate } from '@/lib/proof/format-proof';
import type {
  ProofStatsStream,
  ProofStatsTrendMode,
  ProofSymbolStatsRow,
} from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { FavoriteScopeControls } from '@/views/signals/pulse/components/FavoriteScopeControls';
import { getSymbolsFromEnv } from '@/config/symbols';
import { AssetSymbolCell, HistoricalMoneyCell, HistoricalPctCell } from './ProofStatCells';
import { HistoryEntryCountLink } from './HistoryEntryCountLink';
import { SortableTh, TableHeaderLabel, type SymbolStatsSortKey } from './SortableTh';
import { formatHoldSec, formatRatio, type ProofLanguage } from './proofFormat';
import type { ProofCopy } from './proofCopy';
import {
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

export function SymbolStatsSection({
  rows,
  seed,
  entryRatio,
  leverage,
  streams,
  trendModes,
  tradingCategories,
  copy,
  language,
  qualityPeriod,
}: {
  rows: ProofSymbolStatsRow[];
  seed: number;
  entryRatio: number;
  leverage: number;
  streams: readonly ProofStatsStream[];
  trendModes: readonly ProofStatsTrendMode[];
  tradingCategories: readonly TradingCategory[];
  copy: ProofCopy;
  language: ProofLanguage;
  qualityPeriod: ProofQualityPeriod;
}) {
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const favoriteSymbols = useMemo(() => getSymbolsFromEnv(), []);
  const [sortKey, setSortKey] = useState<SymbolStatsSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const handleSort = (key: SymbolStatsSortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDirection(key === 'symbol' ? 'asc' : 'desc');
    }
  };
  const visibleRows = useMemo(() => {
    let filtered = showFavoritesOnly
      ? rows.filter((row) => favorites.has(row.symbol.trim().toUpperCase()))
      : rows;
    filtered = filtered.filter((row) => {
      if (
        row.standard.cycleCount === 0 &&
        row.recent30Total.cycleCount === 0 &&
        row.recent3moTotal.cycleCount === 0
      ) {
        return false;
      }

      return meetsQualityThresholdsForPeriod(
        row,
        qualityWinRateThreshold,
        qualityRiskRewardThreshold,
        qualityPeriod
      );
    });
    if (!sortKey) return filtered;
    const sorted = [...filtered].sort((a, b) => compareSymbolStatsRows(a, b, sortKey));
    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
  }, [
    favorites,
    rows,
    showFavoritesOnly,
    qualityWinRateThreshold,
    qualityRiskRewardThreshold,
    qualityPeriod,
    sortKey,
    sortDirection,
  ]);

  return (
    <section className="mt-10 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {copy.sections.symbol.title}
        </h2>
        <FavoriteScopeControls symbols={favoriteSymbols} className="flex-wrap" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1180px] table-fixed border-collapse text-xs xl:min-w-0">
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
          </colgroup>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="bg-muted px-1 py-2 text-center align-middle font-medium">
                <TableHeaderLabel label={copy.table.asset} />
              </th>
              <th colSpan={6} className={`${GROUP_HEADER_CLASS} border-l border-border/60`}>
                {copy.table.recent30}
              </th>
              <th colSpan={6} className={`${GROUP_HEADER_CLASS} border-l border-border/60`}>
                {copy.table.recent3mo}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-2 py-8 text-center text-sm text-muted-foreground">
                  {copy.table.empty}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const recent30Present = row.recent30Total.cycleCount > 0;
                const recent3moPresent = row.recent3moTotal.cycleCount > 0;
                return (
                  <tr key={row.symbol} className="hover:bg-muted/30">
                    <td className={SYMBOL_CELL_CLASS}>
                      <AssetSymbolCell symbol={row.symbol} />
                    </td>
                    <td className={BORDERED_METRIC_CELL_CLASS}>
                      <HistoryEntryCountLink
                        symbol={row.symbol}
                        count={row.recent30Total.cycleCount}
                        period="30d"
                        asOfIso={row.recent30Total.asOfIso}
                        streams={streams}
                        trendModes={trendModes}
                        tradingCategories={tradingCategories}
                      />
                    </td>
                    <td className={VALUE_CELL_CLASS}>
                      <HistoricalPctCell
                        slice={row.recent30Total}
                        seed={seed}
                        entryRatio={entryRatio}
                        leverage={leverage}
                        tone="standard"
                      />
                    </td>
                    <td className={VALUE_CELL_CLASS}>
                      <HistoricalMoneyCell
                        slice={row.recent30Total}
                        seed={seed}
                        entryRatio={entryRatio}
                        leverage={leverage}
                        tone="standard"
                      />
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {recent30Present ? formatWinRate(row.recent30Total.winRate) : '—'}
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {formatRatio(row.recent30Total.winLossRatio, recent30Present)}
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {formatHoldSec(row.recent30Total.avgHoldSec, recent30Present, language)}
                    </td>
                    <td className={BORDERED_METRIC_CELL_CLASS}>
                      <HistoryEntryCountLink
                        symbol={row.symbol}
                        count={row.recent3moTotal.cycleCount}
                        period="90d"
                        asOfIso={row.recent3moTotal.asOfIso}
                        streams={streams}
                        trendModes={trendModes}
                        tradingCategories={tradingCategories}
                      />
                    </td>
                    <td className={VALUE_CELL_CLASS}>
                      <HistoricalPctCell
                        slice={row.recent3moTotal}
                        seed={seed}
                        entryRatio={entryRatio}
                        leverage={leverage}
                        tone="standard"
                      />
                    </td>
                    <td className={VALUE_CELL_CLASS}>
                      <HistoricalMoneyCell
                        slice={row.recent3moTotal}
                        seed={seed}
                        entryRatio={entryRatio}
                        leverage={leverage}
                        tone="standard"
                      />
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {recent3moPresent ? formatWinRate(row.recent3moTotal.winRate) : '—'}
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {formatRatio(row.recent3moTotal.winLossRatio, recent3moPresent)}
                    </td>
                    <td className={METRIC_CELL_CLASS}>
                      {formatHoldSec(row.recent3moTotal.avgHoldSec, recent3moPresent, language)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
