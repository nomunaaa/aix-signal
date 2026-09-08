// Pure stats aggregation for the Proof page — shared by server (initial payload)
// and client (recompute on filter change, no network round trip, no supabase import).

import type {
  ProofCycleStatsSlice,
  ProofSimulationData,
  ProofStatsRowKey,
  ProofStatsStream,
  ProofStatsTrendMode,
  ProofTotalStatsRow,
  ProofSymbolStatsRow,
} from '@/lib/mock/proof-mock';
import {
  TRADING_CATEGORY_ORDER,
  type PlatformCycleRow,
  type TradingCategory,
} from '@/lib/proof-platform-aggregate';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';

const RECENT_30D_MS = 30 * 86_400_000;
const MIN_AVG_LOSS_RATE_FOR_PL_RATIO = 0.0001;
const PROOF_RATE_DECIMALS = 8;

// signal_cycles에는 사이클 진행 중 가격 경로(구간 최고/최저가)가 저장되지 않아
// "할인 진입 시 실제로 얼마나 더 좋은 가격에 들어갔을지"를 종가/시가만으로는 정확히
// 복원할 수 없다. 정확한 경로 데이터가 없는 임시 방편으로, 진입-청산 간 가격 이동폭의
// 일부만 "할인 포착"했다고 가정하는 보수적 계수를 승패 방향에 상관없이 대칭 적용한다.
const DISCOUNTED_ENTRY_CAPTURE_RATE = 0.5;

export function symbolShortName(symbol: string): string {
  return symbol.replace(/USDT$/i, '') || symbol;
}

export function winRateDecimal(wins: number, total: number): number {
  if (total === 0) return 0;
  return parseFloat((wins / total).toFixed(4));
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function round2(value: number): number {
  return normalizeZero(parseFloat(value.toFixed(2)));
}

export function round8(value: number): number {
  return normalizeZero(parseFloat(value.toFixed(PROOF_RATE_DECIMALS)));
}

export function normalizeProofRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return round8(value);
}

export function winLossRatioFromAverages(
  avgWinRate: number,
  avgLossAbsRate: number
): number | null {
  if (!Number.isFinite(avgWinRate) || !Number.isFinite(avgLossAbsRate)) return null;
  if (avgWinRate <= 0 || avgLossAbsRate < MIN_AVG_LOSS_RATE_FOR_PL_RATIO) return null;
  return round2(avgWinRate / avgLossAbsRate);
}

export function emptyStatsSlice(): ProofCycleStatsSlice {
  return {
    cycleCount: 0,
    asOfIso: null,
    pnlPctSum: 0,
    pnlPerEntryNotionalRateSum: 0,
    entryLegCountSum: 0,
    maxPnlPct: 0,
    minPnlPct: 0,
    maxPnlPerEntryNotionalRate: 0,
    minPnlPerEntryNotionalRate: 0,
    winRate: 0,
    winLossRatio: null,
    avgHoldSec: null,
  };
}

export function holdSecFor(row: PlatformCycleRow): number {
  if (row.holdSec != null) return row.holdSec;
  const entryMs = new Date(row.entryTime).getTime();
  const exitMs = new Date(row.exitTime).getTime();
  return Math.max(0, Math.floor((exitMs - entryMs) / 1000));
}

function computeAvgHoldSec(rows: PlatformCycleRow[]): number | null {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + holdSecFor(row), 0);
  return Math.round(total / rows.length);
}

function asOfIsoForRows(rows: PlatformCycleRow[], asOfMs: number): string | null {
  return rows.length > 0 ? new Date(asOfMs).toISOString() : null;
}

function cycleStats(rows: PlatformCycleRow[], asOfMs = Date.now()): ProofCycleStatsSlice {
  return {
    ...cycleStatsFromPoints(rows.map((row) => pointFromRow(row))),
    asOfIso: asOfIsoForRows(rows, asOfMs),
    avgHoldSec: computeAvgHoldSec(rows),
  };
}

type CyclePnlPoint = {
  pnlPct: number;
  pnlPerEntryNotionalRate: number;
  entryLegCount: number;
};

function pointFromRow(row: PlatformCycleRow): CyclePnlPoint {
  return {
    pnlPct: row.pnlPct,
    pnlPerEntryNotionalRate: row.pnlPerEntryNotionalRate,
    entryLegCount: row.entryLegCount,
  };
}

function cycleStatsFromPoints(sourcePoints: CyclePnlPoint[]): ProofCycleStatsSlice {
  const points = sourcePoints.map((point) => ({
    ...point,
    pnlPerEntryNotionalRate: normalizeProofRate(point.pnlPerEntryNotionalRate),
  }));

  if (points.length === 0) return emptyStatsSlice();

  const wins = points.filter((point) => point.pnlPerEntryNotionalRate > 0);
  const losses = points.filter((point) => point.pnlPerEntryNotionalRate < 0);
  const pnlPctSum = points.reduce((sum, point) => sum + point.pnlPct, 0);
  const pnlPerEntryNotionalRateSum = points.reduce(
    (sum, point) => sum + point.pnlPerEntryNotionalRate,
    0
  );
  const entryLegCountSum = points.reduce((sum, point) => sum + point.entryLegCount, 0);
  const avgWin =
    wins.length > 0
      ? wins.reduce((sum, point) => sum + point.pnlPerEntryNotionalRate, 0) / wins.length
      : 0;
  const avgLossAbs =
    losses.length > 0
      ? Math.abs(
          losses.reduce((sum, point) => sum + point.pnlPerEntryNotionalRate, 0) / losses.length
        )
      : 0;

  return {
    cycleCount: points.length,
    pnlPctSum: round2(pnlPctSum),
    pnlPerEntryNotionalRateSum: round8(pnlPerEntryNotionalRateSum),
    entryLegCountSum: round8(entryLegCountSum),
    maxPnlPct: round2(Math.max(...points.map((point) => point.pnlPct))),
    minPnlPct: round2(Math.min(...points.map((point) => point.pnlPct))),
    maxPnlPerEntryNotionalRate: round8(
      Math.max(...points.map((point) => point.pnlPerEntryNotionalRate))
    ),
    minPnlPerEntryNotionalRate: round8(
      Math.min(...points.map((point) => point.pnlPerEntryNotionalRate))
    ),
    avgHoldSec: null,
    winRate: winRateDecimal(wins.length, points.length),
    winLossRatio: winLossRatioFromAverages(avgWin, avgLossAbs),
  };
}

function proofSide(row: PlatformCycleRow): 'long' | 'short' | null {
  const side = row.side.trim().toLowerCase();
  if (side === 'long' || side === 'buy') return 'long';
  if (side === 'short' || side === 'sell') return 'short';
  return null;
}

export function discountRatePct(row: PlatformCycleRow): number {
  const side = proofSide(row);
  const entryPrice = row.entryPrice;
  const exitPrice = row.exitPrice;
  if (!side || entryPrice == null || exitPrice == null || entryPrice <= 0) return 0;

  const moveAbsPct = (Math.abs(exitPrice - entryPrice) / entryPrice) * 100;
  return moveAbsPct * DISCOUNTED_ENTRY_CAPTURE_RATE;
}

function discountedCycleStats(rows: PlatformCycleRow[], asOfMs = Date.now()): ProofCycleStatsSlice {
  return {
    ...cycleStatsFromPoints(
      rows.map((row) => {
        const discountPct = discountRatePct(row);
        return {
          pnlPct: row.pnlPct + discountPct,
          pnlPerEntryNotionalRate:
            row.pnlPerEntryNotionalRate + (discountPct / 100) * row.entryLegCount,
          entryLegCount: row.entryLegCount,
        };
      })
    ),
    asOfIso: asOfIsoForRows(rows, asOfMs),
    avgHoldSec: computeAvgHoldSec(rows),
  };
}

function recent30Rows(rows: PlatformCycleRow[], nowMs = Date.now()): PlatformCycleRow[] {
  const cutoff = nowMs - RECENT_30D_MS;
  return rows.filter((r) => new Date(r.exitTime).getTime() >= cutoff);
}

function recent3moCutoffMs(nowMs: number): number {
  const cutoff = new Date(nowMs);
  cutoff.setMonth(cutoff.getMonth() - 3);
  return cutoff.getTime();
}

function recent3moRows(rows: PlatformCycleRow[], nowMs = Date.now()): PlatformCycleRow[] {
  const cutoff = recent3moCutoffMs(nowMs);
  return rows.filter((r) => new Date(r.exitTime).getTime() >= cutoff);
}

export function trendMode(row: PlatformCycleRow): ProofStatsTrendMode | null {
  const side = proofSide(row);
  return resolveSignalTrendModeFromEntryTrends({
    direction: side,
    shortTrend: row.entryTrendShort,
    longTrend: row.entryTrendLong,
  });
}

export function statsVariantKey(
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  tradingCategories: readonly TradingCategory[]
): string {
  return `${streams.join('+')}|${trendModes.join('+')}|${tradingCategories.join('+')}`;
}

export function filterStatsRows(
  rows: PlatformCycleRow[],
  streams: readonly ProofStatsStream[],
  trendModes: readonly ProofStatsTrendMode[],
  tradingCategories?: readonly TradingCategory[]
): PlatformCycleRow[] {
  const categorySet =
    tradingCategories != null && tradingCategories.length < TRADING_CATEGORY_ORDER.length
      ? new Set(tradingCategories)
      : null;

  return rows.filter((row) => {
    const mode = trendMode(row);
    return (
      (row.engine === 'PULSE' || row.engine === 'WAVE') &&
      streams.includes(row.engine) &&
      mode !== null &&
      trendModes.includes(mode) &&
      (categorySet == null || (row.tradingCategory != null && categorySet.has(row.tradingCategory)))
    );
  });
}

function statsRow(
  key: ProofStatsRowKey,
  label: string,
  rows: PlatformCycleRow[],
  mode: 'standard' | 'discounted' = 'standard'
): ProofTotalStatsRow {
  const nowMs = Date.now();
  const buildStats = (sliceRows: PlatformCycleRow[]) =>
    mode === 'discounted' ? discountedCycleStats(sliceRows, nowMs) : cycleStats(sliceRows, nowMs);
  return {
    key,
    label,
    recent30: buildStats(recent30Rows(rows, nowMs)),
    recent3mo: buildStats(recent3moRows(rows, nowMs)),
    total: buildStats(rows),
  };
}

export function buildTotalStats(
  rows: PlatformCycleRow[]
): [ProofTotalStatsRow, ProofTotalStatsRow] {
  return [
    statsRow('standard', 'Standard', rows),
    statsRow('discounted', 'Discounted', rows, 'discounted'),
  ];
}

export function buildSimulatorData(
  totalStats: [ProofTotalStatsRow, ProofTotalStatsRow]
): ProofSimulationData {
  return {
    monthlyFeeUsd: 99,
    yearlyFeeUsd: 1188,
    scenarios: [
      {
        key: totalStats[0].key,
        label: 'Standard',
        badge: 'Pulse standard',
        recent30: totalStats[0].recent30,
      },
      {
        key: totalStats[1].key,
        label: 'Discounted',
        badge: 'Discount rate applied',
        recent30: totalStats[1].recent30,
      },
    ],
  };
}

export function buildSymbolStats(rows: PlatformCycleRow[]): ProofSymbolStatsRow[] {
  const nowMs = Date.now();
  const bySymbol = new Map<string, PlatformCycleRow[]>();
  for (const row of rows) {
    const arr = bySymbol.get(row.symbol) ?? [];
    arr.push(row);
    bySymbol.set(row.symbol, arr);
  }

  return Array.from(bySymbol.entries())
    .map(([symbol, symbolRows]) => ({
      symbol,
      shortName: symbolShortName(symbol),
      recent30Total: cycleStats(recent30Rows(symbolRows, nowMs), nowMs),
      recent3moTotal: cycleStats(recent3moRows(symbolRows, nowMs), nowMs),
      standard: cycleStats(symbolRows, nowMs),
      discounted: discountedCycleStats(symbolRows, nowMs),
    }))
    .sort((a, b) => b.standard.pnlPerEntryNotionalRateSum - a.standard.pnlPerEntryNotionalRateSum);
}
