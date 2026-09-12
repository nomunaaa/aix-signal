// Proof page stats as a small additive "cube" instead of raw rows.
//
// Shipping all-time closed cycles to the client (previous approach) meant a
// 14MB+ payload once the table grew past ~30k rows. Every stat the filter bar
// needs (win rate, pnl sum, hold time, win/loss ratio, max/min pnl) can be
// derived from per-bucket SUMS that are additive across a union of buckets —
// so we aggregate once server-side into a tiny cube (stream x trendMode x
// category x window), ship that, and the client reconstructs any of the 135
// filter combinations by summing the handful of matching buckets instead of
// re-scanning tens of thousands of rows or re-fetching from the server.
import {
  discountRatePct,
  emptyStatsSlice,
  holdSecFor,
  normalizeProofRate,
  round2,
  round8,
  symbolShortName,
  trendMode,
  winRateDecimal,
  winLossRatioFromAverages,
} from '@/lib/proof/proof-stats';
import {
  TRADING_CATEGORY_ORDER,
  type PlatformCycleRow,
  type TradingCategory,
} from '@/lib/proof-platform-aggregate';
import type {
  ProofCycleStatsSlice,
  ProofStatsStream,
  ProofStatsTrendMode,
  ProofSymbolStatsRow,
  ProofTotalStatsRow,
} from '@/lib/mock/proof-mock';

const UNCATEGORIZED = 'UNCATEGORIZED' as const;
type CategoryKey = TradingCategory | typeof UNCATEGORIZED;

export interface ProofBucketAccumulator {
  count: number;
  asOfMs: number | null;
  pnlSum: number;
  pnlPerEntryNotionalRateSum: number;
  entryLegCountSum: number;
  winCount: number;
  winsSum: number;
  winsPerEntryNotionalRateSum: number;
  lossCount: number;
  lossesSumAbs: number;
  lossesPerEntryNotionalRateAbsSum: number;
  maxPnl: number;
  minPnl: number;
  maxPnlPerEntryNotionalRate: number;
  minPnlPerEntryNotionalRate: number;
  discPnlSum: number;
  discPnlPerEntryNotionalRateSum: number;
  discWinCount: number;
  discWinsSum: number;
  discWinsPerEntryNotionalRateSum: number;
  discLossCount: number;
  discLossesSumAbs: number;
  discLossesPerEntryNotionalRateAbsSum: number;
  discMaxPnl: number;
  discMinPnl: number;
  discMaxPnlPerEntryNotionalRate: number;
  discMinPnlPerEntryNotionalRate: number;
  holdSecSum: number;
}

export type ProofBucketMap = Record<string, ProofBucketAccumulator>;

export interface ProofBuckets {
  total: ProofBucketMap;
  recent30: ProofBucketMap;
  recent3mo: ProofBucketMap;
  bySymbolTotal: Record<string, ProofBucketMap>;
  bySymbolRecent30: Record<string, ProofBucketMap>;
  bySymbolRecent3mo: Record<string, ProofBucketMap>;
}

const RECENT_30D_MS = 30 * 86_400_000;

function bucketKey(
  stream: ProofStatsStream,
  mode: ProofStatsTrendMode,
  category: CategoryKey
): string {
  return `${stream}|${mode}|${category}`;
}

export interface ProofStatsAggregateRow {
  scope: 'symbol' | 'all_symbols' | string;
  symbol: string | null;
  barinterval: string | null;
  trading_category: string | null;
  timeinterval: string | null;
  trend: ProofStatsTrendMode | string | null;
  category: 'standard' | 'discounted' | string | null;
  entries: number | string | null;
  pnl_pct_sum: number | string | null;
  pnl_per_entry_notional_rate_sum: number | string | null;
  entry_leg_count_sum: number | string | null;
  win_count: number | string | null;
  loss_count: number | string | null;
  wins_pnl_pct_sum: number | string | null;
  wins_per_entry_notional_rate_sum: number | string | null;
  losses_pnl_pct_abs_sum: number | string | null;
  losses_per_entry_notional_rate_abs_sum: number | string | null;
  highest_profit_pct: number | string | null;
  highest_loss_pct: number | string | null;
  highest_profit_per_entry_notional_rate: number | string | null;
  highest_loss_per_entry_notional_rate: number | string | null;
  hold_sec_sum: number | string | null;
  updated_at?: string | null;
}

function emptyAcc(): ProofBucketAccumulator {
  return {
    count: 0,
    asOfMs: null,
    pnlSum: 0,
    pnlPerEntryNotionalRateSum: 0,
    entryLegCountSum: 0,
    winCount: 0,
    winsSum: 0,
    winsPerEntryNotionalRateSum: 0,
    lossCount: 0,
    lossesSumAbs: 0,
    lossesPerEntryNotionalRateAbsSum: 0,
    maxPnl: -Infinity,
    minPnl: Infinity,
    maxPnlPerEntryNotionalRate: -Infinity,
    minPnlPerEntryNotionalRate: Infinity,
    discPnlSum: 0,
    discPnlPerEntryNotionalRateSum: 0,
    discWinCount: 0,
    discWinsSum: 0,
    discWinsPerEntryNotionalRateSum: 0,
    discLossCount: 0,
    discLossesSumAbs: 0,
    discLossesPerEntryNotionalRateAbsSum: 0,
    discMaxPnl: -Infinity,
    discMinPnl: Infinity,
    discMaxPnlPerEntryNotionalRate: -Infinity,
    discMinPnlPerEntryNotionalRate: Infinity,
    holdSecSum: 0,
  };
}

function numberFromDb(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function timestampMsFromDb(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function maxTimestampMs(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

function streamFromBarinterval(value: string | null | undefined): ProofStatsStream | null {
  if (value === '1m') return 'PULSE';
  if (value === '10m') return 'WAVE';
  return null;
}

function trendModeFromDb(value: string | null | undefined): ProofStatsTrendMode | null {
  if (value === 'trend' || value === 'nonTrend' || value === 'reversal') return value;
  return null;
}

function tradingCategoryFromDb(value: string | null | undefined): CategoryKey {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return TRADING_CATEGORY_ORDER.includes(normalized as TradingCategory)
    ? (normalized as TradingCategory)
    : UNCATEGORIZED;
}

function ensureDbAccumulator(
  map: ProofBucketMap,
  stream: ProofStatsStream,
  mode: ProofStatsTrendMode,
  category: CategoryKey
): ProofBucketAccumulator {
  const key = bucketKey(stream, mode, category);
  map[key] = map[key] ?? emptyAcc();
  return map[key];
}

function applyDbRowToAccumulator(acc: ProofBucketAccumulator, row: ProofStatsAggregateRow): void {
  const entries = numberFromDb(row.entries);
  const entryLegCountSum = numberFromDb(row.entry_leg_count_sum);
  const holdSecSum = numberFromDb(row.hold_sec_sum);
  const winCount = numberFromDb(row.win_count);
  const lossCount = numberFromDb(row.loss_count);
  acc.asOfMs = maxTimestampMs(acc.asOfMs, timestampMsFromDb(row.updated_at));

  acc.count = Math.max(acc.count, entries);
  acc.entryLegCountSum = Math.max(acc.entryLegCountSum, entryLegCountSum);
  acc.holdSecSum = Math.max(acc.holdSecSum, holdSecSum);

  if (row.category === 'standard') {
    acc.pnlSum = numberFromDb(row.pnl_pct_sum);
    acc.pnlPerEntryNotionalRateSum = numberFromDb(row.pnl_per_entry_notional_rate_sum);
    acc.winCount = winCount;
    acc.winsSum = numberFromDb(row.wins_pnl_pct_sum);
    acc.winsPerEntryNotionalRateSum = numberFromDb(row.wins_per_entry_notional_rate_sum);
    acc.lossCount = lossCount;
    acc.lossesSumAbs = numberFromDb(row.losses_pnl_pct_abs_sum);
    acc.lossesPerEntryNotionalRateAbsSum = numberFromDb(row.losses_per_entry_notional_rate_abs_sum);
    acc.maxPnl = numberFromDb(row.highest_profit_pct);
    acc.minPnl = numberFromDb(row.highest_loss_pct);
    acc.maxPnlPerEntryNotionalRate = numberFromDb(row.highest_profit_per_entry_notional_rate);
    acc.minPnlPerEntryNotionalRate = numberFromDb(row.highest_loss_per_entry_notional_rate);
  } else if (row.category === 'discounted') {
    acc.discPnlSum = numberFromDb(row.pnl_pct_sum);
    acc.discPnlPerEntryNotionalRateSum = numberFromDb(row.pnl_per_entry_notional_rate_sum);
    acc.discWinCount = winCount;
    acc.discWinsSum = numberFromDb(row.wins_pnl_pct_sum);
    acc.discWinsPerEntryNotionalRateSum = numberFromDb(row.wins_per_entry_notional_rate_sum);
    acc.discLossCount = lossCount;
    acc.discLossesSumAbs = numberFromDb(row.losses_pnl_pct_abs_sum);
    acc.discLossesPerEntryNotionalRateAbsSum = numberFromDb(
      row.losses_per_entry_notional_rate_abs_sum
    );
    acc.discMaxPnl = numberFromDb(row.highest_profit_pct);
    acc.discMinPnl = numberFromDb(row.highest_loss_pct);
    acc.discMaxPnlPerEntryNotionalRate = numberFromDb(row.highest_profit_per_entry_notional_rate);
    acc.discMinPnlPerEntryNotionalRate = numberFromDb(row.highest_loss_per_entry_notional_rate);
  }
}

function addRowToAcc(acc: ProofBucketAccumulator, row: PlatformCycleRow, asOfMs: number): void {
  const pnl = row.pnlPct;
  const pnlRate = normalizeProofRate(row.pnlPerEntryNotionalRate);
  const entryLegCount = row.entryLegCount;
  const discountPct = discountRatePct(row);
  const disc = pnl + discountPct;
  const discRate = normalizeProofRate(pnlRate + (discountPct / 100) * entryLegCount);

  acc.asOfMs = maxTimestampMs(acc.asOfMs, asOfMs);
  acc.count += 1;
  acc.pnlSum += pnl;
  acc.pnlPerEntryNotionalRateSum += pnlRate;
  acc.entryLegCountSum += entryLegCount;
  acc.maxPnl = Math.max(acc.maxPnl, pnl);
  acc.minPnl = Math.min(acc.minPnl, pnl);
  acc.maxPnlPerEntryNotionalRate = Math.max(acc.maxPnlPerEntryNotionalRate, pnlRate);
  acc.minPnlPerEntryNotionalRate = Math.min(acc.minPnlPerEntryNotionalRate, pnlRate);
  if (pnlRate > 0) {
    acc.winCount += 1;
    acc.winsSum += pnl;
    acc.winsPerEntryNotionalRateSum += pnlRate;
  } else if (pnlRate < 0) {
    acc.lossCount += 1;
    acc.lossesSumAbs += Math.abs(pnl);
    acc.lossesPerEntryNotionalRateAbsSum += Math.abs(pnlRate);
  }

  acc.discPnlSum += disc;
  acc.discPnlPerEntryNotionalRateSum += discRate;
  acc.discMaxPnl = Math.max(acc.discMaxPnl, disc);
  acc.discMinPnl = Math.min(acc.discMinPnl, disc);
  acc.discMaxPnlPerEntryNotionalRate = Math.max(acc.discMaxPnlPerEntryNotionalRate, discRate);
  acc.discMinPnlPerEntryNotionalRate = Math.min(acc.discMinPnlPerEntryNotionalRate, discRate);
  if (discRate > 0) {
    acc.discWinCount += 1;
    acc.discWinsSum += disc;
    acc.discWinsPerEntryNotionalRateSum += discRate;
  } else if (discRate < 0) {
    acc.discLossCount += 1;
    acc.discLossesSumAbs += Math.abs(disc);
    acc.discLossesPerEntryNotionalRateAbsSum += Math.abs(discRate);
  }

  acc.holdSecSum += holdSecFor(row);
}

function mergeAcc(a: ProofBucketAccumulator, b: ProofBucketAccumulator): ProofBucketAccumulator {
  return {
    count: a.count + b.count,
    asOfMs: maxTimestampMs(a.asOfMs, b.asOfMs),
    pnlSum: a.pnlSum + b.pnlSum,
    pnlPerEntryNotionalRateSum: a.pnlPerEntryNotionalRateSum + b.pnlPerEntryNotionalRateSum,
    entryLegCountSum: a.entryLegCountSum + b.entryLegCountSum,
    winCount: a.winCount + b.winCount,
    winsSum: a.winsSum + b.winsSum,
    winsPerEntryNotionalRateSum: a.winsPerEntryNotionalRateSum + b.winsPerEntryNotionalRateSum,
    lossCount: a.lossCount + b.lossCount,
    lossesSumAbs: a.lossesSumAbs + b.lossesSumAbs,
    lossesPerEntryNotionalRateAbsSum:
      a.lossesPerEntryNotionalRateAbsSum + b.lossesPerEntryNotionalRateAbsSum,
    maxPnl: Math.max(a.maxPnl, b.maxPnl),
    minPnl: Math.min(a.minPnl, b.minPnl),
    maxPnlPerEntryNotionalRate: Math.max(
      a.maxPnlPerEntryNotionalRate,
      b.maxPnlPerEntryNotionalRate
    ),
    minPnlPerEntryNotionalRate: Math.min(
      a.minPnlPerEntryNotionalRate,
      b.minPnlPerEntryNotionalRate
    ),
    discPnlSum: a.discPnlSum + b.discPnlSum,
    discPnlPerEntryNotionalRateSum:
      a.discPnlPerEntryNotionalRateSum + b.discPnlPerEntryNotionalRateSum,
    discWinCount: a.discWinCount + b.discWinCount,
    discWinsSum: a.discWinsSum + b.discWinsSum,
    discWinsPerEntryNotionalRateSum:
      a.discWinsPerEntryNotionalRateSum + b.discWinsPerEntryNotionalRateSum,
    discLossCount: a.discLossCount + b.discLossCount,
    discLossesSumAbs: a.discLossesSumAbs + b.discLossesSumAbs,
    discLossesPerEntryNotionalRateAbsSum:
      a.discLossesPerEntryNotionalRateAbsSum + b.discLossesPerEntryNotionalRateAbsSum,
    discMaxPnl: Math.max(a.discMaxPnl, b.discMaxPnl),
    discMinPnl: Math.min(a.discMinPnl, b.discMinPnl),
    discMaxPnlPerEntryNotionalRate: Math.max(
      a.discMaxPnlPerEntryNotionalRate,
      b.discMaxPnlPerEntryNotionalRate
    ),
    discMinPnlPerEntryNotionalRate: Math.min(
      a.discMinPnlPerEntryNotionalRate,
      b.discMinPnlPerEntryNotionalRate
    ),
    holdSecSum: a.holdSecSum + b.holdSecSum,
  };
}

function isoFromTimestampMs(value: number | null): string | null {
  return value === null ? null : new Date(value).toISOString();
}

function recent3moCutoffMs(nowMs: number): number {
  const cutoff = new Date(nowMs);
  cutoff.setMonth(cutoff.getMonth() - 3);
  return cutoff.getTime();
}

/** Single pass over all rows — builds the total-level and per-symbol cubes at once. */
export function buildProofBuckets(rows: PlatformCycleRow[], nowMs = Date.now()): ProofBuckets {
  const total: ProofBucketMap = {};
  const recent30: ProofBucketMap = {};
  const recent3mo: ProofBucketMap = {};
  const bySymbolTotal: Record<string, ProofBucketMap> = {};
  const bySymbolRecent30: Record<string, ProofBucketMap> = {};
  const bySymbolRecent3mo: Record<string, ProofBucketMap> = {};
  const cutoff30 = nowMs - RECENT_30D_MS;
  const cutoff3mo = recent3moCutoffMs(nowMs);

  for (const row of rows) {
    if (row.engine !== 'PULSE' && row.engine !== 'WAVE') continue;

    const mode = trendMode(row);
    if (mode == null) continue;
    const key = bucketKey(row.engine, mode, row.tradingCategory ?? UNCATEGORIZED);
    const exitMs = new Date(row.exitTime).getTime();
    const isRecent30 = exitMs >= cutoff30;
    const isRecent3mo = exitMs >= cutoff3mo;

    total[key] = total[key] ?? emptyAcc();
    addRowToAcc(total[key], row, nowMs);
    if (isRecent30) {
      recent30[key] = recent30[key] ?? emptyAcc();
      addRowToAcc(recent30[key], row, nowMs);
    }
    if (isRecent3mo) {
      recent3mo[key] = recent3mo[key] ?? emptyAcc();
      addRowToAcc(recent3mo[key], row, nowMs);
    }

    const symbolTotalMap = (bySymbolTotal[row.symbol] ??= {});
    symbolTotalMap[key] = symbolTotalMap[key] ?? emptyAcc();
    addRowToAcc(symbolTotalMap[key], row, nowMs);
    if (isRecent30) {
      const symbolRecentMap = (bySymbolRecent30[row.symbol] ??= {});
      symbolRecentMap[key] = symbolRecentMap[key] ?? emptyAcc();
      addRowToAcc(symbolRecentMap[key], row, nowMs);
    }
    if (isRecent3mo) {
      const symbolRecent3moMap = (bySymbolRecent3mo[row.symbol] ??= {});
      symbolRecent3moMap[key] = symbolRecent3moMap[key] ?? emptyAcc();
      addRowToAcc(symbolRecent3moMap[key], row, nowMs);
    }
  }

  return { total, recent30, recent3mo, bySymbolTotal, bySymbolRecent30, bySymbolRecent3mo };
}

export function proofStatsRowsToBuckets(rows: ProofStatsAggregateRow[]): ProofBuckets {
  const buckets: ProofBuckets = {
    total: {},
    recent30: {},
    recent3mo: {},
    bySymbolTotal: {},
    bySymbolRecent30: {},
    bySymbolRecent3mo: {},
  };

  for (const row of rows) {
    const stream = streamFromBarinterval(row.barinterval);
    const mode = trendModeFromDb(row.trend);
    if (stream == null || mode == null) continue;

    const category = tradingCategoryFromDb(row.trading_category);
    const isRecent30 = row.timeinterval === 'last_30d';
    const isRecent3mo = row.timeinterval === 'last_3mo';
    const isAllTime = row.timeinterval === 'all_time';
    if (!isRecent30 && !isRecent3mo && !isAllTime) continue;

    if (row.scope === 'all_symbols') {
      const map = isRecent30 ? buckets.recent30 : isRecent3mo ? buckets.recent3mo : buckets.total;
      applyDbRowToAccumulator(ensureDbAccumulator(map, stream, mode, category), row);
      continue;
    }

    if (row.scope !== 'symbol' || !row.symbol) continue;
    const symbol = row.symbol.trim().toUpperCase();
    if (!symbol || symbol === '*') continue;

    const bySymbol = isRecent30
      ? buckets.bySymbolRecent30
      : isRecent3mo
        ? buckets.bySymbolRecent3mo
        : buckets.bySymbolTotal;
    const symbolMap = (bySymbol[symbol] ??= {});
    applyDbRowToAccumulator(ensureDbAccumulator(symbolMap, stream, mode, category), row);
  }

  return buckets;
}

function categoryKeysForSelection(tradingCategories: readonly TradingCategory[]): CategoryKey[] {
  if (tradingCategories.length >= TRADING_CATEGORY_ORDER.length) {
    return [...TRADING_CATEGORY_ORDER, UNCATEGORIZED];
  }
  return [...tradingCategories];
}

function combinedAcc(
  map: ProofBucketMap,
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  categoryKeys: readonly CategoryKey[]
): ProofBucketAccumulator {
  let acc = emptyAcc();
  for (const stream of streams) {
    for (const mode of trendModes) {
      for (const category of categoryKeys) {
        const found = map[bucketKey(stream, mode, category)];
        if (found) acc = mergeAcc(acc, found);
      }
    }
  }
  return acc;
}

function finalizeSlice(
  acc: ProofBucketAccumulator,
  variant: 'standard' | 'discounted' | 'combined'
): ProofCycleStatsSlice {
  if (acc.count === 0) return emptyStatsSlice();

  const isDiscounted = variant === 'discounted';
  const isCombined = variant === 'combined';
  const winCount = isCombined ? acc.winCount + acc.discWinCount : isDiscounted ? acc.discWinCount : acc.winCount;
  const lossCount = isCombined ? acc.lossCount + acc.discLossCount : isDiscounted ? acc.discLossCount : acc.lossCount;
  const winsRateSum =
    isCombined
      ? acc.winsPerEntryNotionalRateSum + acc.discWinsPerEntryNotionalRateSum
      : isDiscounted
      ? acc.discWinsPerEntryNotionalRateSum
      : acc.winsPerEntryNotionalRateSum;
  const lossesRateAbsSum =
    isCombined
      ? acc.lossesPerEntryNotionalRateAbsSum + acc.discLossesPerEntryNotionalRateAbsSum
      : isDiscounted
      ? acc.discLossesPerEntryNotionalRateAbsSum
      : acc.lossesPerEntryNotionalRateAbsSum;
  const pnlSum = isCombined ? acc.pnlSum + acc.discPnlSum : isDiscounted ? acc.discPnlSum : acc.pnlSum;
  const pnlRateSum =
    isCombined
      ? acc.pnlPerEntryNotionalRateSum + acc.discPnlPerEntryNotionalRateSum
      : isDiscounted ? acc.discPnlPerEntryNotionalRateSum : acc.pnlPerEntryNotionalRateSum;
  const maxPnl = isCombined ? Math.max(acc.maxPnl, acc.discMaxPnl) : isDiscounted ? acc.discMaxPnl : acc.maxPnl;
  const minPnl = isCombined ? Math.min(acc.minPnl, acc.discMinPnl) : isDiscounted ? acc.discMinPnl : acc.minPnl;
  const maxPnlRate =
    isCombined ? Math.max(acc.maxPnlPerEntryNotionalRate, acc.discMaxPnlPerEntryNotionalRate) : isDiscounted ? acc.discMaxPnlPerEntryNotionalRate : acc.maxPnlPerEntryNotionalRate;
  const minPnlRate =
    isCombined ? Math.min(acc.minPnlPerEntryNotionalRate, acc.discMinPnlPerEntryNotionalRate) : isDiscounted ? acc.discMinPnlPerEntryNotionalRate : acc.minPnlPerEntryNotionalRate;
  const avgWin = winCount > 0 ? winsRateSum / winCount : 0;
  const avgLossAbs = lossCount > 0 ? lossesRateAbsSum / lossCount : 0;

  return {
    cycleCount: isCombined ? acc.count * 2 : acc.count,
    asOfIso: isoFromTimestampMs(acc.asOfMs),
    pnlPctSum: round2(pnlSum),
    pnlPerEntryNotionalRateSum: round8(pnlRateSum),
    entryLegCountSum: round8(isCombined ? acc.entryLegCountSum * 2 : acc.entryLegCountSum),
    maxPnlPct: round2(maxPnl),
    minPnlPct: round2(minPnl),
    maxPnlPerEntryNotionalRate: round8(maxPnlRate),
    minPnlPerEntryNotionalRate: round8(minPnlRate),
    winRate: winRateDecimal(winCount, isCombined ? acc.count * 2 : acc.count),
    winLossRatio: winLossRatioFromAverages(avgWin, avgLossAbs),
    avgHoldSec: Math.round(acc.holdSecSum / acc.count),
  };
}

export function reconstructTotalStats(
  buckets: ProofBuckets,
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  tradingCategories: readonly TradingCategory[]
): [ProofTotalStatsRow, ProofTotalStatsRow] {
  const categoryKeys = categoryKeysForSelection(tradingCategories);
  const totalAcc = combinedAcc(buckets.total, streams, trendModes, categoryKeys);
  const recent30Acc = combinedAcc(buckets.recent30, streams, trendModes, categoryKeys);
  const recent3moAcc = combinedAcc(buckets.recent3mo, streams, trendModes, categoryKeys);

  return [
    {
      key: 'standard',
      label: 'Standard',
      recent30: finalizeSlice(recent30Acc, 'standard'),
      recent3mo: finalizeSlice(recent3moAcc, 'standard'),
      total: finalizeSlice(totalAcc, 'standard'),
    },
    {
      key: 'discounted',
      label: 'Discounted',
      recent30: finalizeSlice(recent30Acc, 'discounted'),
      recent3mo: finalizeSlice(recent3moAcc, 'discounted'),
      total: finalizeSlice(totalAcc, 'discounted'),
    },
  ];
}

/** reconstructTotalStats와 동일하지만 전체 심볼 대신 지정된 심볼 집합(예: 즐겨찾기)만 합산한다. */
export function reconstructTotalStatsForSymbols(
  buckets: ProofBuckets,
  symbols: readonly string[],
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  tradingCategories: readonly TradingCategory[]
): [ProofTotalStatsRow, ProofTotalStatsRow] {
  const categoryKeys = categoryKeysForSelection(tradingCategories);
  let totalAcc = emptyAcc();
  let recent30Acc = emptyAcc();
  let recent3moAcc = emptyAcc();
  for (const symbol of symbols) {
    totalAcc = mergeAcc(
      totalAcc,
      combinedAcc(buckets.bySymbolTotal[symbol] ?? {}, streams, trendModes, categoryKeys)
    );
    recent30Acc = mergeAcc(
      recent30Acc,
      combinedAcc(buckets.bySymbolRecent30[symbol] ?? {}, streams, trendModes, categoryKeys)
    );
    recent3moAcc = mergeAcc(
      recent3moAcc,
      combinedAcc(buckets.bySymbolRecent3mo[symbol] ?? {}, streams, trendModes, categoryKeys)
    );
  }

  return [
    {
      key: 'standard',
      label: 'Standard',
      recent30: finalizeSlice(recent30Acc, 'standard'),
      recent3mo: finalizeSlice(recent3moAcc, 'standard'),
      total: finalizeSlice(totalAcc, 'standard'),
    },
    {
      key: 'discounted',
      label: 'Discounted',
      recent30: finalizeSlice(recent30Acc, 'discounted'),
      recent3mo: finalizeSlice(recent3moAcc, 'discounted'),
      total: finalizeSlice(totalAcc, 'discounted'),
    },
  ];
}

export function reconstructSymbolStats(
  buckets: ProofBuckets,
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  tradingCategories: readonly TradingCategory[]
): ProofSymbolStatsRow[] {
  const categoryKeys = categoryKeysForSelection(tradingCategories);
  const symbols = new Set([
    ...Object.keys(buckets.bySymbolTotal),
    ...Object.keys(buckets.bySymbolRecent30),
    ...Object.keys(buckets.bySymbolRecent3mo),
  ]);

  const rows: ProofSymbolStatsRow[] = [];
  for (const symbol of symbols) {
    const totalAcc = combinedAcc(
      buckets.bySymbolTotal[symbol] ?? {},
      streams,
      trendModes,
      categoryKeys
    );
    const recent30Acc = combinedAcc(
      buckets.bySymbolRecent30[symbol] ?? {},
      streams,
      trendModes,
      categoryKeys
    );
    const recent3moAcc = combinedAcc(
      buckets.bySymbolRecent3mo[symbol] ?? {},
      streams,
      trendModes,
      categoryKeys
    );
    if (totalAcc.count === 0 && recent30Acc.count === 0 && recent3moAcc.count === 0) continue;

    rows.push({
      symbol,
      shortName: symbolShortName(symbol),
      recent30Total: finalizeSlice(recent30Acc, 'standard'),
      recent3moTotal: finalizeSlice(recent3moAcc, 'standard'),
      recent30Discounted: finalizeSlice(recent30Acc, 'discounted'),
      recent3moDiscounted: finalizeSlice(recent3moAcc, 'discounted'),
      recent30Combined: finalizeSlice(recent30Acc, 'combined'),
      recent3moCombined: finalizeSlice(recent3moAcc, 'combined'),
      standard: finalizeSlice(totalAcc, 'standard'),
      discounted: finalizeSlice(totalAcc, 'discounted'),
      combined: finalizeSlice(totalAcc, 'combined'),
    });
  }

  return rows.sort(
    (a, b) => b.standard.pnlPerEntryNotionalRateSum - a.standard.pnlPerEntryNotionalRateSum
  );
}
