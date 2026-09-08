/**
 * 히스토리 테이블 목 — 청산 시그널 비어 있을 때 UI 검증용 (최대 약 90일 분포)
 */

import type {
  ClosedSignal,
  CycleStrategyCompareKey,
  StrategyId,
  StrategyVariantCompare,
} from '@/views/signals/pulse/types/pulse.types';

export type { CycleStrategyCompareKey, StrategyVariantCompare };

const SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'LINKUSDT',
  'DOTUSDT',
  'MATICUSDT',
];

const STRATEGIES: StrategyId[] = ['oneshot', 'deep', 'safe', 'full'];

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function holdSecToLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function mkVariant(
  key: CycleStrategyCompareKey,
  entry: number,
  exit: number,
  qty: number,
  side: 'long' | 'short',
  dcaPrice: number | null,
  partialPrice: number | null,
): StrategyVariantCompare {
  const pnlUsdRaw = side === 'long' ? (exit - entry) * qty : (entry - exit) * qty;
  const pnlUsd = Math.round(pnlUsdRaw * 100) / 100;
  const pnlPct =
    entry > 0
      ? Math.round(
          ((side === 'long' ? exit - entry : entry - exit) / entry) * 10000,
        ) / 100
      : 0;
  return {
    key,
    entryPrice: entry,
    dcaPrice,
    partialExitPrice: partialPrice,
    exitPrice: exit,
    pnlUsd,
    pnlPct,
    isWin: pnlUsd >= 0,
  };
}

function cyclePhaseLine(hasAdd: boolean, hasPartial: boolean): string {
  if (hasAdd && hasPartial) return '진입 → 중간진입 → 중간청산 → 청산';
  if (hasAdd) return '진입 → 중간진입 → 청산';
  if (hasPartial) return '진입 → 중간청산 → 청산';
  return '진입 → 청산';
}

function buildClosed(ix: number, count: number): ClosedSignal {
  const rnd = mulberry32(ix * 997 + 13);
  const sym = SYMBOLS[ix % SYMBOLS.length] ?? 'BTCUSDT';
  const side: 'long' | 'short' = ix % 3 === 0 ? 'short' : 'long';
  const entry = Math.round((20 + rnd() * 8000) * 100) / 100;
  const move = (side === 'long' ? 1 : -1) * (0.005 + rnd() * 0.035);
  const exit = Math.round(entry * (1 + move) * 100) / 100;
  const qty = 0.05 + rnd() * 0.15;

  const basic = mkVariant('basic', entry, exit, qty, side, null, null);
  const dcaSecond = Math.round(entry * (side === 'long' ? 0.988 : 1.012) * 100) / 100;
  const avgEntry = (entry + dcaSecond) / 2;
  const dca = mkVariant('dca', avgEntry, exit, qty, side, dcaSecond, null);
  const partialPx = Math.round((entry + (exit - entry) * 0.55) * 100) / 100;
  const partial = mkVariant('partial_exit', entry, exit, qty, side, null, partialPx);
  const both = mkVariant('dca_partial', avgEntry, exit, qty, side, dcaSecond, partialPx);

  const strategyVariants: Record<CycleStrategyCompareKey, StrategyVariantCompare> = {
    basic,
    dca,
    partial_exit: partial,
    dca_partial: both,
  };

  const holdSec = 1800 + Math.floor(rnd() * 8000);
  const spanMs = 90 * 86400000;
  const tFrac = count > 1 ? ix / (count - 1) : 0;
  const exitMs = Date.now() - Math.floor(tFrac * spanMs + rnd() * 3600000 * 6);

  const hasAdditionalBuy = ix % 4 === 0;
  const hasPartialClose = ix % 5 === 0;
  const st =
    ix % 7 === 0 ? (0 as const) : side === 'long' ? (1 as const) : (-1 as const);
  const lt =
    ix % 5 === 0 ? (0 as const) : rnd() > 0.35 ? st : ((rnd() > 0.5 ? 1 : -1) as 1 | -1);
  const expectedEntryTrend = side === 'long' ? 'UP' : 'DOWN';
  const oppositeEntryTrend = side === 'long' ? 'DOWN' : 'UP';
  const entryTrendAligned = ix % 3 !== 2;

  return {
    id: `mock-hist-${ix}`,
    cycle_id: `20260720-${String(190100 + ix).padStart(6, '0')}`,
    symbol: sym,
    direction: side,
    entryPrice: basic.entryPrice,
    exitPrice: basic.exitPrice,
    pnlPercent: basic.pnlPct,
    holdDuration: holdSecToLabel(holdSec),
    closedAt: new Date(exitMs).toISOString(),
    discountGain: 0,
    lockedAmount: 0,
    enteredAt: new Date(exitMs - holdSec * 1000).toISOString(),
    hasAdditionalBuy,
    hasPartialClose,
    strategyVariants,
    strategyId: STRATEGIES[ix % STRATEGIES.length],
    flow: ix % 3 === 0 ? 'trend_pos' : ix % 3 === 1 ? 'trend_entry' : 'ct_entry',
    entryTrendShort: entryTrendAligned ? expectedEntryTrend : oppositeEntryTrend,
    entryTrendLong: entryTrendAligned ? expectedEntryTrend : 'NEUTRAL',
    shortTrendAtClose: st,
    longTrendAtClose: lt,
    cyclePhaseSummary: cyclePhaseLine(hasAdditionalBuy, hasPartialClose),
  };
}

let cached: ClosedSignal[] | null = null;
let cachedCount = 0;

export function buildClosedSignalsHistoryMock(count = 150): ClosedSignal[] {
  if (cached && cachedCount === count) return cached;
  cached = Array.from({ length: count }, (_, i) => buildClosed(i, count));
  cachedCount = count;
  return cached;
}

/** Drawer/Zone5 — cycleId 기준 결정적 4전략 */
export function getStrategyVariantsForCycleId(cycleId: string): StrategyVariantCompare[] {
  let h = 0;
  for (let i = 0; i < cycleId.length; i++) h = (h * 31 + cycleId.charCodeAt(i)) >>> 0;
  const row = buildClosed(h % 10_000, 10_000);
  const v = row.strategyVariants;
  if (!v) return [];
  return Object.values(v);
}

/** 기본 목 — import 별칭 */
export const historyCyclesMock: ClosedSignal[] = buildClosedSignalsHistoryMock(150);
