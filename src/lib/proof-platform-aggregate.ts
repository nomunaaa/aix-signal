/**
 * Win/Loss: realized_pnl_pct > 0 is win
 */

import type { WinLossPoint } from '@/lib/mock/symbol-hub-winloss';
import type { StrategyAccentColor } from '@/lib/strategy-display';
import {
  normalizeTradingCategory,
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import type { SignalAction } from '@/types/signal-action';
import type { ClosedSignal, StrategyId } from '@/views/signals/pulse/types/pulse.types';
import {
  buildHistoryStrategyVariants,
  calculateHistorySimulationPnl,
  historyVariantKeyForStrategy,
} from '@/views/signals/pulse/utils/historyPnl';

export { TRADING_CATEGORY_ORDER, type TradingCategory } from '@/lib/trading-category';

export type ProofPeriod = '7d' | '30d' | '90d' | 'all';

export type ProofEngine = 'PULSE' | 'WAVE' | 'OTHER';
export type ProofEntryTrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

const PROOF_BASE_SIMULATION_INPUT = {
  capital: 100000,
  capitalRatio: 5,
  leverage: 10,
};
const PROOF_BASE_ENTRY_NOTIONAL =
  PROOF_BASE_SIMULATION_INPUT.capital *
  (PROOF_BASE_SIMULATION_INPUT.capitalRatio / 100) *
  PROOF_BASE_SIMULATION_INPUT.leverage;

export const TRADING_CATEGORY_LABEL: Record<TradingCategory, string> = {
  E1X1: '원샷',
  E1X2: '세이프',
  E2X1: '딥바이',
  E2X2: '올플랜',
};

export const TRADING_CATEGORY_TO_ACCENT: Record<TradingCategory, StrategyAccentColor> = {
  E1X1: 'teal',
  E1X2: 'purple',
  E2X1: 'amber',
  E2X2: 'rose',
};

function parseTradingCategory(raw: string | null | undefined): TradingCategory | null {
  return normalizeTradingCategory(raw) ?? null;
}

export interface PlatformCycleRow {
  id: string;
  symbol: string;
  side: string;
  entryPrice: number | null;
  currentPrice: number | null;
  exitPrice: number | null;
  pnlPct: number;
  pnlPerEntryNotionalRate: number;
  entryLegCount: number;
  additionalEntryPrice: number | null;
  partialExitPrice: number | null;
  partialExitPercent: number | null;
  strategyId: StrategyId | null;
  exitTime: string;
  entryTime: string;
  holdSec: number | null;
  engine: ProofEngine;
  tradingCategory: TradingCategory | null;
  flow: string | null;
  entryTrendShort: ProofEntryTrendDirection | null;
  entryTrendLong: ProofEntryTrendDirection | null;
}

export interface EngineStats {
  winRate: number;
  avgPnl: number;
  totalCycles: number;
  wins: number;
}

export interface SymbolRankRow {
  symbol: string;
  avgPnl: number;
  count: number;
}

export interface ProofBoardStats {
  overall: EngineStats;
  pulse: EngineStats;
  wave: EngineStats;
  best: SymbolRankRow[];
  worst: SymbolRankRow[];
  /** trading_category win rate (0 if no data) */
  tradingCategoryWinRates: Record<TradingCategory, { winRate: number; count: number }>;
}

/** Map barinterval to engine */
function engineFromBarinterval(bi: string | null | undefined): ProofEngine {
  if (bi === '1m') return 'PULSE';
  if (bi === '10m') return 'WAVE';
  return 'OTHER';
}

function parseEntryTrendSnapshot(raw: unknown): ProofEntryTrendDirection | null {
  if (typeof raw === 'string') {
    const normalized = raw.trim().toUpperCase();
    if (normalized === 'UP' || normalized === 'LONG') return 'UP';
    if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
    if (normalized === 'NEUTRAL' || normalized === '0') return 'NEUTRAL';
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 0) return 'UP';
  if (parsed < 0) return 'DOWN';
  return 'NEUTRAL';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed != null && parsed > 0 ? parsed : null;
}

function normalizeSideForPnl(side: unknown): 'long' | 'short' {
  const normalized = typeof side === 'string' ? side.trim().toLowerCase() : '';
  return normalized === 'short' || normalized === 'sell' ? 'short' : 'long';
}

function normalizeStrategyId(raw: unknown): StrategyId | undefined {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (value === 'oneshot' || value === 'basic') return 'oneshot';
  if (value === 'deep' || value === 'dca') return 'deep';
  if (value === 'safe' || value === 'partial_exit') return 'safe';
  if (value === 'full' || value === 'dca_partial') return 'full';
  return undefined;
}

function strategyIdForCycle(
  tradingCategory: TradingCategory | null,
  rawStrategyType: unknown
): StrategyId {
  if (tradingCategory) return TRADING_CATEGORY_TO_STRATEGY[tradingCategory] as StrategyId;
  return normalizeStrategyId(rawStrategyType) ?? 'oneshot';
}

function mapSignalActionsFromEmbed(raw: unknown): SignalAction[] {
  if (!Array.isArray(raw)) return [];

  const actions: SignalAction[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const actionType = item.action_type;
    const status = item.status;
    const price = toPositiveNumber(item.price);

    if (actionType !== 'additional_entry' && actionType !== 'partial_exit') continue;
    if (status !== 'pending' && status !== 'triggered' && status !== 'expired') continue;
    if (price === null) continue;

    actions.push({
      action_type: actionType,
      price,
      status,
      triggered_at: item.triggered_at == null ? null : String(item.triggered_at),
    });
  }

  return actions;
}

function triggeredActionPrice(
  actions: SignalAction[],
  actionType: SignalAction['action_type']
): number | null {
  const triggered = actions.find(
    (action) => action.action_type === actionType && action.status === 'triggered'
  );
  const fallback = actions.find((action) => action.action_type === actionType);
  return toPositiveNumber(triggered?.price) ?? toPositiveNumber(fallback?.price);
}

function lifecyclePrice(
  raw: Record<string, unknown>,
  snapshotKey: 'added_entry_price' | 'partial_exit_price',
  actions: SignalAction[],
  actionType: SignalAction['action_type']
): number | null {
  return toPositiveNumber(raw[snapshotKey]) ?? triggeredActionPrice(actions, actionType);
}

function lifecyclePercent(raw: Record<string, unknown>): number | null {
  const event = raw.partial_exit_event;
  if (event && typeof event === 'object') {
    const percent = toNumber((event as Record<string, unknown>).percentage);
    if (percent !== null) return percent;
  }
  return toNumber(raw.partial_exit_percentage);
}

function calculateProofCyclePnl(params: {
  id: string;
  symbol: string;
  side: unknown;
  entryPrice: number | null;
  exitPrice: number | null;
  realizedPnlPct: number;
  exitTime: string;
  strategyId: StrategyId;
  additionalEntryPrice: number | null;
  partialExitPrice: number | null;
  partialExitPercent: number | null;
}): { pnlPct: number; pnlPerEntryNotionalRate: number; entryLegCount: number } {
  if (params.entryPrice == null || params.exitPrice == null) {
    return {
      pnlPct: params.realizedPnlPct,
      pnlPerEntryNotionalRate: params.realizedPnlPct / 100,
      entryLegCount: 1,
    };
  }

  const direction = normalizeSideForPnl(params.side);
  const strategyVariants = buildHistoryStrategyVariants({
    direction,
    entryPrice: params.entryPrice,
    exitPrice: params.exitPrice,
    additionalEntryPrice: params.additionalEntryPrice,
    partialExitPrice: params.partialExitPrice,
    partialExitPercent: params.partialExitPercent,
  });
  const strategyVariantKey = historyVariantKeyForStrategy(params.strategyId);
  const selectedVariant = strategyVariants[strategyVariantKey];
  const hasLifecycleAdjustment =
    params.additionalEntryPrice !== null || params.partialExitPrice !== null;
  const signal: ClosedSignal = {
    id: params.id,
    symbol: params.symbol,
    direction,
    entryPrice: params.entryPrice,
    exitPrice: params.exitPrice,
    pnlPercent: params.realizedPnlPct,
    holdDuration: '',
    closedAt: params.exitTime,
    discountGain: 0,
    lockedAmount: 0,
    additionalEntryPrice: params.additionalEntryPrice ?? undefined,
    partialExitPrice: params.partialExitPrice ?? undefined,
    partialExitPercent: params.partialExitPercent ?? undefined,
    strategyId: params.strategyId,
    strategyVariants: hasLifecycleAdjustment ? strategyVariants : undefined,
  };
  const projected = calculateHistorySimulationPnl(
    signal,
    PROOF_BASE_SIMULATION_INPUT,
    params.strategyId
  );
  const entryLegCount =
    projected.positionSize > 0
      ? Math.max(1, projected.totalEntryNotional / projected.positionSize)
      : selectedVariant?.dcaPrice != null
        ? 2
        : 1;

  return {
    pnlPct: projected.pnlPercent,
    pnlPerEntryNotionalRate: projected.pnlAmount / PROOF_BASE_ENTRY_NOTIONAL,
    entryLegCount,
  };
}

/** Map signal_cycle row to platform cycle row */
export function mapSignalCycleRow(raw: Record<string, unknown>): PlatformCycleRow | null {
  const id = String(raw.id ?? '');
  if (!id) return null;
  const exitTime = raw.exit_time != null ? String(raw.exit_time) : null;
  if (!exitTime) return null;
  const realizedPnlPct = toNumber(raw.realized_pnl_pct) ?? 0;
  const entryRaw = raw.entry_price;
  const exitRaw = raw.exit_price;
  const currentRaw = raw.current_price ?? exitRaw;
  const entryPrice = toPositiveNumber(entryRaw);
  const exitPrice = toPositiveNumber(exitRaw);
  const currentPrice = toPositiveNumber(currentRaw);
  const bi = raw.barinterval != null ? String(raw.barinterval) : null;
  const tc = parseTradingCategory(
    raw.trading_category != null ? String(raw.trading_category) : null
  );
  const actions = Array.isArray(raw.actions)
    ? mapSignalActionsFromEmbed(raw.actions)
    : mapSignalActionsFromEmbed(raw.signal_actions);
  const additionalEntryPrice = lifecyclePrice(
    raw,
    'added_entry_price',
    actions,
    'additional_entry'
  );
  const partialExitPrice = lifecyclePrice(raw, 'partial_exit_price', actions, 'partial_exit');
  const partialExitPercent = lifecyclePercent(raw);
  const strategyId = strategyIdForCycle(tc, raw.strategy_type);
  const pnl = calculateProofCyclePnl({
    id,
    symbol: String(raw.symbol ?? ''),
    side: raw.side,
    entryPrice,
    exitPrice,
    realizedPnlPct,
    exitTime,
    strategyId,
    additionalEntryPrice,
    partialExitPrice,
    partialExitPercent,
  });

  return {
    id,
    symbol: String(raw.symbol ?? ''),
    side: String(raw.side ?? ''),
    entryPrice,
    currentPrice,
    exitPrice,
    pnlPct: pnl.pnlPct,
    pnlPerEntryNotionalRate: pnl.pnlPerEntryNotionalRate,
    entryLegCount: pnl.entryLegCount,
    additionalEntryPrice,
    partialExitPrice,
    partialExitPercent,
    strategyId,
    exitTime,
    entryTime: String(raw.entry_time ?? exitTime),
    holdSec: raw.hold_sec != null ? Number(raw.hold_sec) : null,
    engine: engineFromBarinterval(bi),
    tradingCategory: tc,
    flow: raw.flow != null ? String(raw.flow) : null,
    entryTrendShort: parseEntryTrendSnapshot(raw.entry_trend_short),
    entryTrendLong: parseEntryTrendSnapshot(raw.entry_trend_long),
  };
}

/** Compute engine stats */
function computeEngineStats(rows: PlatformCycleRow[]): EngineStats {
  if (rows.length === 0) {
    return { winRate: 0, avgPnl: 0, totalCycles: 0, wins: 0 };
  }
  const wins = rows.filter((r) => r.pnlPct > 0).length;
  const avgPnl = rows.reduce((s, r) => s + r.pnlPct, 0) / rows.length;
  return {
    winRate: parseFloat(((wins / rows.length) * 100).toFixed(1)),
    avgPnl: parseFloat(avgPnl.toFixed(2)),
    totalCycles: rows.length,
    wins,
  };
}

/** Filter cycles by period */
export function filterByPeriod(rows: PlatformCycleRow[], period: ProofPeriod): PlatformCycleRow[] {
  if (period === 'all') return rows;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const cutoff = Date.now() - days * 86400000;
  return rows.filter((r) => new Date(r.exitTime).getTime() >= cutoff);
}

/** Aggregate proof board stats */
export function aggregateProofBoard(rows: PlatformCycleRow[]): ProofBoardStats {
  const pulseRows = rows.filter((r) => r.engine === 'PULSE');
  const waveRows = rows.filter((r) => r.engine === 'WAVE');

  const bySymbol = new Map<string, number[]>();
  for (const r of rows) {
    const arr = bySymbol.get(r.symbol) ?? [];
    arr.push(r.pnlPct);
    bySymbol.set(r.symbol, arr);
  }
  const symbolAvg = Array.from(bySymbol.entries()).map(([symbol, pnls]) => ({
    symbol,
    avgPnl: parseFloat((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)),
    count: pnls.length,
  }));
  symbolAvg.sort((a, b) => b.avgPnl - a.avgPnl);
  const best = symbolAvg.slice(0, 3);
  const worst = symbolAvg.slice(-3).reverse();

  const tradingCategoryWinRates = {} as Record<TradingCategory, { winRate: number; count: number }>;
  for (const key of TRADING_CATEGORY_ORDER) {
    const subset = rows.filter((r) => r.tradingCategory === key);
    if (subset.length === 0) {
      tradingCategoryWinRates[key] = { winRate: 0, count: 0 };
    } else {
      const w = subset.filter((r) => r.pnlPct > 0).length;
      tradingCategoryWinRates[key] = {
        winRate: parseFloat(((w / subset.length) * 100).toFixed(1)),
        count: subset.length,
      };
    }
  }

  return {
    overall: computeEngineStats(rows),
    pulse: computeEngineStats(pulseRows),
    wave: computeEngineStats(waveRows),
    best,
    worst,
    tradingCategoryWinRates,
  };
}

/** WinLossTimeline for recent n cycles (oldest to newest array) */
export function toWinLossPoints(rows: PlatformCycleRow[], max = 20): WinLossPoint[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  );
  const slice = sorted.slice(-max);
  return slice.map((r) => {
    const d = new Date(r.exitTime);
    return {
      win: r.pnlPct > 0,
      pnlPct: parseFloat(r.pnlPct.toFixed(2)),
      dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
    };
  });
}

/** CycleTimeline bar data (newest on right) */
export interface ProofCycleBar {
  dir: 'LONG' | 'SHORT';
  pnlPct: number;
  holdMin: number;
}

/** /proof/cycles timeline row */
export interface ProofCycleTimelineItem {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  engine: ProofEngine;
  pnlPercent: number;
  exitTime: Date;
  holdSeconds: number;
}

export function mapPlatformRowToTimelineItem(row: PlatformCycleRow): ProofCycleTimelineItem {
  const side = String(row.side).toUpperCase();
  const exitMs = new Date(row.exitTime).getTime();
  const entryMs = new Date(row.entryTime).getTime();
  const holdSeconds =
    row.holdSec != null ? row.holdSec : Math.max(0, Math.floor((exitMs - entryMs) / 1000));

  return {
    id: row.id,
    symbol: row.symbol,
    direction: side === 'SHORT' ? 'SHORT' : 'LONG',
    engine: row.engine,
    pnlPercent: parseFloat(row.pnlPct.toFixed(2)),
    exitTime: new Date(row.exitTime),
    holdSeconds,
  };
}

/** Timeline display: left=past → right=newest (max max cycles) */
export function toProofCycleBars(rows: PlatformCycleRow[], max = 20): ProofCycleBar[] {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  );
  const slice = sorted.slice(-max);
  return slice.map((r) => ({
    dir: String(r.side).toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
    pnlPct: parseFloat(r.pnlPct.toFixed(2)),
    holdMin: r.holdSec != null ? Math.max(1, Math.round(r.holdSec / 60)) : 0,
  }));
}
