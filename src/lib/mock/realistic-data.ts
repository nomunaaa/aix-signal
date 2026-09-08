/**
 * April 2026–aligned deterministic mock data for Pulse / Symbol Hub.
 * Prices and derived PnL/discount values stay consistent (no hand-tuned % drift).
 */

import type { PulseApiResponse, PulseApiSignal, PulseSection, PulseSectionFields, PulseStrategyId } from '@/types/signal';
import { EVENT_TYPE_META, type EventType, type SymbolContextEvent } from '@/types/event';
import type { OneSignal } from '@/types/signals';
import { getConfidenceGrade, getFreshnessGradeFromMinutes } from '@/lib/confidence';
import { derivePulseOpenSectionFromTrendsPnl } from '@/views/signals/pulse/utils/sectionRules';

function mockTrendArrowToDirection(t: 'up' | 'down'): 'UP' | 'DOWN' {
  return t === 'up' ? 'UP' : 'DOWN';
}

// ── Time helpers (relative to runtime “now”) ─────────────────────────────

export function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

export function hoursAgo(h: number): string {
  return minutesAgo(h * 60);
}

// ── Base market snapshot (2026-04 style) ─────────────────────────────────

export const BASE_PRICES: Record<
  string,
  {
    price: number;
    dailyVolume: string;
    marketCap: string;
    dailyRange: [number, number];
  }
> = {
  BTCUSDT: { price: 72800, dailyVolume: '8.89B', marketCap: '1.46T', dailyRange: [71868, 73450] },
  ETHUSDT: { price: 2240, dailyVolume: '6.65B', marketCap: '270B', dailyRange: [2195, 2285] },
  SOLUSDT: { price: 84.1, dailyVolume: '1.2B', marketCap: '48.4B', dailyRange: [82.5, 86.2] },
  XRPUSDT: { price: 1.345, dailyVolume: '1.96B', marketCap: '82.7B', dailyRange: [1.32, 1.368] },
  BNBUSDT: { price: 606.2, dailyVolume: '487M', marketCap: '82.6B', dailyRange: [598, 615] },
  DOGEUSDT: { price: 0.0928, dailyVolume: '1.97B', marketCap: '15.7B', dailyRange: [0.0905, 0.0955] },
  ADAUSDT: { price: 0.2496, dailyVolume: '135M', marketCap: '8.8B', dailyRange: [0.244, 0.256] },
  DOTUSDT: { price: 3.85, dailyVolume: '89M', marketCap: '5.2B', dailyRange: [3.72, 3.98] },
  AVAXUSDT: { price: 18.4, dailyVolume: '210M', marketCap: '7.1B', dailyRange: [17.8, 19.1] },
  LINKUSDT: { price: 9.0, dailyVolume: '80M', marketCap: '5.8B', dailyRange: [8.7, 9.25] },
  SUIUSDT: { price: 0.9318, dailyVolume: '112M', marketCap: '2.6B', dailyRange: [0.905, 0.958] },
  NEARUSDT: { price: 2.45, dailyVolume: '95M', marketCap: '2.8B', dailyRange: [2.35, 2.58] },
  PEPEUSDT: { price: 0.0000085, dailyVolume: '820M', marketCap: '3.5B', dailyRange: [0.0000078, 0.0000092] },
  WIFUSDT: { price: 0.1945, dailyVolume: '65M', marketCap: '194M', dailyRange: [0.182, 0.21] },
};

/** Unified mock page (`use-mock-signals`) symbols not in `BASE_PRICES` — April 2026–scale spot + 24h band */
const MOCK_BASE_PRICE_EXTENSIONS: Record<string, (typeof BASE_PRICES)[string]> = {
  MATICUSDT: { price: 0.82, dailyVolume: '420M', marketCap: '7.9B', dailyRange: [0.798, 0.842] },
  LTCUSDT: { price: 86.5, dailyVolume: '310M', marketCap: '6.5B', dailyRange: [84.2, 88.4] },
  ATOMUSDT: { price: 4.55, dailyVolume: '78M', marketCap: '1.8B', dailyRange: [4.42, 4.68] },
  APTUSDT: { price: 4.95, dailyVolume: '95M', marketCap: '2.1B', dailyRange: [4.78, 5.12] },
  ARBUSDT: { price: 0.385, dailyVolume: '125M', marketCap: '1.55B', dailyRange: [0.372, 0.398] },
  OPUSDT: { price: 0.658, dailyVolume: '88M', marketCap: '890M', dailyRange: [0.638, 0.678] },
  SEIUSDT: { price: 0.192, dailyVolume: '62M', marketCap: '720M', dailyRange: [0.186, 0.198] },
  TIAUSDT: { price: 2.85, dailyVolume: '71M', marketCap: '1.95B', dailyRange: [2.72, 2.98] },
  INJUSDT: { price: 12.6, dailyVolume: '54M', marketCap: '1.1B', dailyRange: [12.1, 13.05] },
  FETUSDT: { price: 0.558, dailyVolume: '48M', marketCap: '1.45B', dailyRange: [0.538, 0.578] },
  RENDERUSDT: { price: 3.45, dailyVolume: '59M', marketCap: '1.35B', dailyRange: [3.32, 3.58] },
  JUPUSDT: { price: 0.412, dailyVolume: '41M', marketCap: '620M', dailyRange: [0.398, 0.426] },
  ONDOUSDT: { price: 0.718, dailyVolume: '52M', marketCap: '2.25B', dailyRange: [0.698, 0.738] },
  STXUSDT: { price: 0.685, dailyVolume: '33M', marketCap: '1.02B', dailyRange: [0.662, 0.708] },
  RUNEUSDT: { price: 1.38, dailyVolume: '38M', marketCap: '470M', dailyRange: [1.32, 1.44] },
  FILUSDT: { price: 2.95, dailyVolume: '44M', marketCap: '1.85B', dailyRange: [2.82, 3.08] },
  /** 선물 1000단위 계약 — PEPEUSDT spot × 1000 근사 */
  '1000PEPEUSDT': {
    price: 0.0085,
    dailyVolume: '820M',
    marketCap: '3.5B',
    dailyRange: [0.0078, 0.0092],
  },
};

export type MockBasePriceRow = (typeof BASE_PRICES)[string];

export function mockBasePriceRow(symbol: string): MockBasePriceRow | undefined {
  return BASE_PRICES[symbol] ?? MOCK_BASE_PRICE_EXTENSIONS[symbol];
}

/** Spot for mock factories — primary list + unified-page extensions */
export function getMockSpotPrice(symbol: string): number {
  return mockBasePriceRow(symbol)?.price ?? 1;
}

export function getPrecision(price: number): number {
  if (price > 1000) return 2;
  if (price > 1) return 4;
  if (price > 0.01) return 4;
  return 8;
}

export function roundPrice(n: number, precision?: number): number {
  const p = precision ?? getPrecision(n);
  const f = 10 ** p;
  return Math.round(n * f) / f;
}

/** LONG: current − entry (negative = favorable discount). SHORT: entry − current. */
export function calcDiscount(entry: number, current: number, direction: 'long' | 'short'): { dollar: number; percent: number } {
  const dollar =
    direction === 'long'
      ? roundPrice(current - entry, getPrecision(current - entry))
      : roundPrice(entry - current, getPrecision(entry - current));
  const pct = entry === 0 ? 0 : (dollar / entry) * 100;
  return { dollar, percent: +pct.toFixed(2) };
}

/** Signed unrealized PnL % from entry → current. */
export function calcPnL(entry: number, current: number, direction: 'long' | 'short'): { dollar: number; percent: number } {
  const dollar =
    direction === 'long'
      ? roundPrice(current - entry, getPrecision(current - entry))
      : roundPrice(entry - current, getPrecision(entry - current));
  const pct = entry === 0 ? 0 : (dollar / entry) * 100;
  return { dollar, percent: +pct.toFixed(2) };
}

export type MockActionType = 'additional_entry' | 'partial_exit';
export type MockActionStatus = 'pending' | 'triggered' | 'expired';

export interface MockSignalAction {
  id: string;
  action_type: MockActionType;
  price: number;
  status: MockActionStatus;
  triggered_at: string | null;
}

export type MockStrategyType = 'basic' | 'dca' | 'partial_exit' | 'dca_partial';

export interface MockSignal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  current_price: number;
  short_trend: 'up' | 'down';
  long_trend: 'up' | 'down';
  strategy_type: MockStrategyType;
  created_at: string;
  actions: MockSignalAction[];
  /** 레거시 라벨 — Pulse API `section` 은 `mockToPulse` 에서 추세·손익 규칙으로 재계산됨 */
  section: 'discount_entry' | 'profit_taking' | 'non_trend';
}

export function getVolatilityType(symbol: string): 'high' | 'low' | 'none' {
  const base = mockBasePriceRow(symbol);
  if (!base) return 'low';
  const range = ((base.dailyRange[1] - base.dailyRange[0]) / base.price) * 100;
  if (range > 5) return 'high';
  if (range > 1) return 'low';
  return 'none';
}

export const VOLATILITY_LABELS = {
  high: '등락',
  low: '횡보',
  none: '보합',
} as const;

function volatilityField(symbol: string): 'LOW' | 'MID' | 'HIGH' {
  const v = getVolatilityType(symbol);
  if (v === 'high') return 'HIGH';
  if (v === 'low') return 'MID';
  return 'LOW';
}

export function mockSparkline24h(basePrice: number, seed: number, len = 24): number[] {
  const out: number[] = [];
  let v = basePrice;
  for (let i = 0; i < len; i++) {
    v += Math.sin((seed + i) * 0.35) * basePrice * 0.001 + (((seed + i * 5) % 7) - 3) * basePrice * 0.00006;
    out.push(roundPrice(v, getPrecision(basePrice)));
  }
  return out;
}

export function buildSparkline7d(center: number, seed: number): number[] {
  const out: number[] = [];
  let v = center * 0.97;
  for (let i = 0; i < 7; i++) {
    v += Math.sin((seed + i) * 0.9) * center * 0.012 + (((seed + i * 11) % 5) - 2) * center * 0.003;
    out.push(roundPrice(v, getPrecision(center)));
  }
  return out;
}

/** 종목 상세 개요 미니차트(7포인트)용 */
export function sparkline7dForSymbol(symbol: string): number[] {
  const c = getMockSpotPrice(symbol);
  return buildSparkline7d(c, hashSymbol(symbol));
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function rangePct24h(symbol: string): number {
  const b = mockBasePriceRow(symbol);
  if (!b) return 2;
  const [lo, hi] = b.dailyRange;
  const mid = (hi + lo) / 2;
  if (mid <= 0) return 2;
  return +(((hi - lo) / mid) * 100).toFixed(2);
}

function highLow24(symbol: string): { high: number; low: number } {
  const b = mockBasePriceRow(symbol);
  if (!b) return { high: 0, low: 0 };
  return { high: b.dailyRange[1], low: b.dailyRange[0] };
}

/**
 * DCA 평균단가: 초기 진입가와 **첫 번째** `additional_entry` + `triggered` 행만 평균.
 * 여러 건이 triggered여도 `Array.prototype.find`는 첫 매칭만 사용한다 (레거시 단순화).
 */
export function calcAverageEntry(entry: number, actions: MockSignalAction[]): number {
  const dca = actions.find((a) => a.action_type === 'additional_entry' && a.status === 'triggered');
  if (!dca) return entry;
  return roundPrice((entry + dca.price) / 2, getPrecision((entry + dca.price) / 2));
}

export function calcAdjustedPnLPercent(entry: number, current: number, direction: 'long' | 'short', actions: MockSignalAction[]): number {
  const avg = calcAverageEntry(entry, actions);
  return calcPnL(avg, current, direction).percent;
}

export function calcDiscountSignal(signal: Pick<MockSignal, 'direction' | 'entry_price' | 'current_price'>): {
  dollar: number;
  percent: number;
} {
  return calcDiscount(signal.entry_price, signal.current_price, signal.direction);
}

export function calcPnLSignal(signal: Pick<MockSignal, 'direction' | 'entry_price' | 'current_price'>): {
  dollar: number;
  percent: number;
} {
  return calcPnL(signal.entry_price, signal.current_price, signal.direction);
}

export function calcAverageEntrySignal(signal: Pick<MockSignal, 'entry_price' | 'actions'>): number {
  return calcAverageEntry(signal.entry_price, signal.actions);
}

export function calcAdjustedPnL(signal: MockSignal): number {
  return calcAdjustedPnLPercent(signal.entry_price, signal.current_price, signal.direction, signal.actions);
}

// ── Logical signal rows (single source for Pulse + exports) ───────────────

function mkActions(
  rows: Array<{ id: string; action_type: MockActionType; price: number; status: MockActionStatus; triggeredMinAgo: number | null }>,
): MockSignalAction[] {
  return rows.map((r) => ({
    id: r.id,
    action_type: r.action_type,
    price: roundPrice(r.price, getPrecision(r.price)),
    status: r.status,
    triggered_at: r.triggeredMinAgo != null ? minutesAgo(r.triggeredMinAgo) : null,
  }));
}

export const DISCOUNT_ENTRY_SIGNALS: MockSignal[] = [
  {
    id: 'sig-de-1',
    symbol: 'BTCUSDT',
    direction: 'long',
    entry_price: 73200,
    current_price: 72800,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca',
    created_at: minutesAgo(38),
    section: 'discount_entry',
    actions: mkActions([{ id: 'act-de-1-1', action_type: 'additional_entry', price: 72200, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-de-2',
    symbol: 'ETHUSDT',
    direction: 'long',
    entry_price: 2285,
    current_price: 2240,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'basic',
    created_at: minutesAgo(12),
    section: 'discount_entry',
    actions: [],
  },
  {
    id: 'sig-de-3',
    symbol: 'SOLUSDT',
    direction: 'long',
    entry_price: 86.5,
    current_price: 84.1,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca',
    created_at: minutesAgo(95),
    section: 'discount_entry',
    actions: mkActions([{ id: 'act-de-3-1', action_type: 'additional_entry', price: 82.8, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-de-4',
    symbol: 'AVAXUSDT',
    direction: 'long',
    entry_price: 19.05,
    current_price: 18.4,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca_partial',
    created_at: minutesAgo(180),
    section: 'discount_entry',
    actions: mkActions([
      { id: 'act-de-4-1', action_type: 'additional_entry', price: 17.9, status: 'pending', triggeredMinAgo: null },
      { id: 'act-de-4-2', action_type: 'partial_exit', price: 19.8, status: 'pending', triggeredMinAgo: null },
    ]),
  },
  {
    id: 'sig-de-5',
    symbol: 'SUIUSDT',
    direction: 'long',
    entry_price: 0.958,
    current_price: 0.9318,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'basic',
    created_at: minutesAgo(55),
    section: 'discount_entry',
    actions: [],
  },
  {
    id: 'sig-de-6',
    symbol: 'NEARUSDT',
    direction: 'short',
    entry_price: 2.35,
    current_price: 2.45,
    short_trend: 'down',
    long_trend: 'down',
    strategy_type: 'basic',
    created_at: minutesAgo(22),
    section: 'discount_entry',
    actions: [],
  },
  {
    id: 'sig-de-7',
    symbol: 'BNBUSDT',
    direction: 'long',
    entry_price: 615.0,
    current_price: 606.2,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca',
    created_at: minutesAgo(140),
    section: 'discount_entry',
    actions: mkActions([
      { id: 'act-de-7-1', action_type: 'additional_entry', price: 598.0, status: 'triggered', triggeredMinAgo: 45 },
    ]),
  },
];

export const PROFIT_TAKING_SIGNALS: MockSignal[] = [
  {
    id: 'sig-pt-1',
    symbol: 'XRPUSDT',
    direction: 'long',
    entry_price: 1.28,
    current_price: 1.345,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'partial_exit',
    created_at: minutesAgo(420),
    section: 'profit_taking',
    actions: mkActions([{ id: 'act-pt-1-1', action_type: 'partial_exit', price: 1.35, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-pt-2',
    symbol: 'DOGEUSDT',
    direction: 'long',
    entry_price: 0.088,
    current_price: 0.0928,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca_partial',
    created_at: minutesAgo(310),
    section: 'profit_taking',
    actions: mkActions([
      { id: 'act-pt-2-1', action_type: 'additional_entry', price: 0.085, status: 'triggered', triggeredMinAgo: 180 },
      { id: 'act-pt-2-2', action_type: 'partial_exit', price: 0.094, status: 'pending', triggeredMinAgo: null },
    ]),
  },
  {
    id: 'sig-pt-3',
    symbol: 'LINKUSDT',
    direction: 'short',
    entry_price: 9.5,
    current_price: 9.0,
    short_trend: 'down',
    long_trend: 'down',
    strategy_type: 'basic',
    created_at: minutesAgo(250),
    section: 'profit_taking',
    actions: [],
  },
  {
    id: 'sig-pt-4',
    symbol: 'ADAUSDT',
    direction: 'long',
    entry_price: 0.235,
    current_price: 0.2496,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'partial_exit',
    created_at: minutesAgo(560),
    section: 'profit_taking',
    actions: mkActions([{ id: 'act-pt-4-1', action_type: 'partial_exit', price: 0.252, status: 'triggered', triggeredMinAgo: 30 }]),
  },
  {
    id: 'sig-pt-5',
    symbol: 'DOTUSDT',
    direction: 'long',
    entry_price: 3.62,
    current_price: 3.85,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'basic',
    created_at: minutesAgo(480),
    section: 'profit_taking',
    actions: [],
  },
];

export const NON_TREND_SIGNALS: MockSignal[] = [
  {
    id: 'sig-nt-1',
    symbol: 'PEPEUSDT',
    direction: 'long',
    entry_price: 0.0000082,
    current_price: 0.0000085,
    short_trend: 'up',
    long_trend: 'down',
    strategy_type: 'basic',
    created_at: minutesAgo(45),
    section: 'non_trend',
    actions: [],
  },
  {
    id: 'sig-nt-2',
    symbol: 'WIFUSDT',
    direction: 'short',
    entry_price: 0.205,
    current_price: 0.1945,
    short_trend: 'up',
    long_trend: 'down',
    strategy_type: 'partial_exit',
    created_at: minutesAgo(130),
    section: 'non_trend',
    actions: mkActions([{ id: 'act-nt-2-1', action_type: 'partial_exit', price: 0.188, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-nt-3',
    symbol: 'ARBUSDT',
    direction: 'short',
    entry_price: 0.398,
    current_price: 0.385,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca',
    created_at: minutesAgo(720),
    section: 'non_trend',
    actions: mkActions([{ id: 'act-nt-3-1', action_type: 'additional_entry', price: 0.412, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-nt-4',
    symbol: 'INJUSDT',
    direction: 'long',
    entry_price: 13.05,
    current_price: 12.6,
    short_trend: 'down',
    long_trend: 'up',
    strategy_type: 'basic',
    created_at: minutesAgo(85),
    section: 'non_trend',
    actions: [],
  },
  {
    id: 'sig-nt-5',
    symbol: 'ONDOUSDT',
    direction: 'long',
    entry_price: 0.738,
    current_price: 0.718,
    short_trend: 'down',
    long_trend: 'down',
    strategy_type: 'dca_partial',
    created_at: minutesAgo(200),
    section: 'non_trend',
    actions: mkActions([
      { id: 'act-nt-5-1', action_type: 'additional_entry', price: 0.698, status: 'expired', triggeredMinAgo: null },
      { id: 'act-nt-5-2', action_type: 'partial_exit', price: 0.75, status: 'pending', triggeredMinAgo: null },
    ]),
  },
  {
    id: 'sig-nt-6',
    symbol: 'OPUSDT',
    direction: 'short',
    entry_price: 0.638,
    current_price: 0.658,
    short_trend: 'up',
    long_trend: 'down',
    strategy_type: 'basic',
    created_at: minutesAgo(160),
    section: 'non_trend',
    actions: [],
  },
  {
    id: 'sig-nt-7',
    symbol: 'SEIUSDT',
    direction: 'short',
    entry_price: 0.186,
    current_price: 0.192,
    short_trend: 'down',
    long_trend: 'up',
    strategy_type: 'basic',
    created_at: minutesAgo(110),
    section: 'non_trend',
    actions: [],
  },
  {
    id: 'sig-nt-8',
    symbol: 'TIAUSDT',
    direction: 'short',
    entry_price: 2.78,
    current_price: 2.85,
    short_trend: 'up',
    long_trend: 'up',
    strategy_type: 'dca',
    created_at: minutesAgo(340),
    section: 'non_trend',
    actions: mkActions([{ id: 'act-nt-8-1', action_type: 'additional_entry', price: 2.95, status: 'pending', triggeredMinAgo: null }]),
  },
  {
    id: 'sig-nt-9',
    symbol: 'FILUSDT',
    direction: 'short',
    entry_price: 2.82,
    current_price: 2.95,
    short_trend: 'up',
    long_trend: 'down',
    strategy_type: 'basic',
    created_at: minutesAgo(75),
    section: 'non_trend',
    actions: [],
  },
];

export const ALL_SIGNALS: MockSignal[] = [...DISCOUNT_ENTRY_SIGNALS, ...PROFIT_TAKING_SIGNALS, ...NON_TREND_SIGNALS];

export const SECTION_COUNTS = {
  discount_entry: DISCOUNT_ENTRY_SIGNALS.length,
  profit_taking: PROFIT_TAKING_SIGNALS.length,
  non_trend: NON_TREND_SIGNALS.length,
} as const;

// ── Symbol stats (win rate 50–80) ──────────────────────────────────────────

export const SYMBOL_STATS: Record<
  string,
  {
    win_rate: number;
    total_trades: number;
    avg_pnl: number;
    avg_hold_minutes: number;
    recent_results: ('W' | 'L')[];
    active_signals: number;
  }
> = {
  BTCUSDT: { win_rate: 72, total_trades: 50, avg_pnl: 2.1, avg_hold_minutes: 45, recent_results: ['W', 'W', 'W', 'L', 'W'], active_signals: 2 },
  ETHUSDT: { win_rate: 68, total_trades: 42, avg_pnl: 1.8, avg_hold_minutes: 38, recent_results: ['W', 'L', 'W', 'W', 'L'], active_signals: 2 },
  SOLUSDT: { win_rate: 65, total_trades: 35, avg_pnl: 2.5, avg_hold_minutes: 52, recent_results: ['L', 'W', 'W', 'W', 'W'], active_signals: 2 },
  XRPUSDT: { win_rate: 70, total_trades: 28, avg_pnl: 1.5, avg_hold_minutes: 62, recent_results: ['W', 'W', 'L', 'W', 'L'], active_signals: 2 },
  BNBUSDT: { win_rate: 74, total_trades: 22, avg_pnl: 1.9, avg_hold_minutes: 40, recent_results: ['W', 'W', 'L', 'W', 'W'], active_signals: 2 },
  DOGEUSDT: { win_rate: 58, total_trades: 30, avg_pnl: 3.2, avg_hold_minutes: 35, recent_results: ['W', 'L', 'L', 'W', 'L'], active_signals: 1 },
  ADAUSDT: { win_rate: 62, total_trades: 18, avg_pnl: 1.4, avg_hold_minutes: 70, recent_results: ['L', 'W', 'W', 'L', 'W'], active_signals: 2 },
  DOTUSDT: { win_rate: 66, total_trades: 15, avg_pnl: 2.0, avg_hold_minutes: 55, recent_results: ['W', 'W', 'L', 'L', 'W'], active_signals: 1 },
  AVAXUSDT: { win_rate: 60, total_trades: 20, avg_pnl: 2.8, avg_hold_minutes: 48, recent_results: ['L', 'W', 'L', 'W', 'W'], active_signals: 2 },
  LINKUSDT: { win_rate: 71, total_trades: 25, avg_pnl: 1.6, avg_hold_minutes: 42, recent_results: ['W', 'W', 'W', 'L', 'W'], active_signals: 1 },
  SUIUSDT: { win_rate: 55, total_trades: 12, avg_pnl: 3.5, avg_hold_minutes: 30, recent_results: ['W', 'L', 'W', 'L', 'L'], active_signals: 1 },
  NEARUSDT: { win_rate: 63, total_trades: 14, avg_pnl: 2.2, avg_hold_minutes: 50, recent_results: ['W', 'L', 'W', 'W', 'L'], active_signals: 1 },
  PEPEUSDT: { win_rate: 52, total_trades: 18, avg_pnl: 5.5, avg_hold_minutes: 25, recent_results: ['L', 'W', 'L', 'W', 'L'], active_signals: 1 },
  WIFUSDT: { win_rate: 52, total_trades: 10, avg_pnl: 6.2, avg_hold_minutes: 20, recent_results: ['L', 'L', 'W', 'L', 'W'], active_signals: 1 },
};

export const SYMBOL_LIST = Object.entries(BASE_PRICES).map(([symbol, data]) => {
  const rangePct = ((data.dailyRange[1] - data.dailyRange[0]) / data.price) * 100;
  const sign = hashSymbol(symbol) % 2 === 0 ? 1 : -1;
  return {
    symbol,
    price: data.price,
    change24h: +((rangePct * 0.45) * sign).toFixed(2),
    volume: data.dailyVolume,
    marketCap: data.marketCap,
  };
});

/** Period returns (%), clamped to a plausible band for UI scales */
export const PERIOD_RETURNS: Record<string, Record<string, number>> = Object.fromEntries(
  Object.keys(BASE_PRICES).map((sym) => {
    const h = hashSymbol(sym);
    const base7 = +(((h % 17) - 8) * 0.35).toFixed(2);
    const base30 = +(((h % 23) - 11) * 0.28).toFixed(2);
    return [
      sym,
      {
        '1d': +(((h % 11) - 5) * 0.14).toFixed(2),
        '7d': base7,
        '30d': base30,
        '90d': +((base30 * 2.1 + (h % 5) * -0.4).toFixed(2)),
        '180d': +((base30 * 2.8 + (h % 7) * -0.55).toFixed(2)),
        ytd: +((base30 * 1.9 + (h % 6) * -0.35).toFixed(2)),
        '1y': +((base30 * 2.4 + (h % 9) * -0.5).toFixed(2)),
      },
    ];
  }),
);

// ── PulseApi builders ─────────────────────────────────────────────────────

function strategyIdForMock(s: MockStrategyType): PulseStrategyId {
  const m: Record<MockStrategyType, PulseStrategyId> = {
    basic: 'S1',
    dca: 'S3',
    partial_exit: 'S2',
    dca_partial: 'S4',
  };
  return m[s];
}

function minutesFromIso(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

function discountFields(s: MockSignal, seed: number): PulseSectionFields {
  const { high, low } = highLow24(s.symbol);
  const pct24 = rangePct24h(s.symbol);
  const disc = calcDiscount(s.entry_price, s.current_price, s.direction);
  const avg = calcAverageEntry(s.entry_price, s.actions);
  const triggered = s.actions.filter((a) => a.action_type === 'additional_entry' && a.status === 'triggered');
  const pending = s.actions.find((a) => a.action_type === 'additional_entry' && a.status === 'pending');
  const additional_buy_count = triggered.length;
  const additional_entry_time = triggered[0]?.triggered_at ?? undefined;

  const pnlFromOriginal = calcPnL(s.entry_price, s.current_price, s.direction).percent;
  const pnlFromAvg = avg !== s.entry_price ? calcPnL(avg, s.current_price, s.direction).percent : pnlFromOriginal;
  const gainVsOriginal = +(pnlFromAvg - pnlFromOriginal).toFixed(2);

  return {
    average_entry_price: avg !== s.entry_price ? avg : undefined,
    discount_price: s.current_price,
    discount_rate: disc.percent,
    additional_entry_price: pending?.price,
    additional_discount_amount:
      pending != null ? roundPrice(Math.abs(s.entry_price - pending.price) * 0.02, 2) : undefined,
    discount_gain_percent: additional_buy_count > 0 && gainVsOriginal !== 0 ? Math.abs(gainVsOriginal) : undefined,
    short_trend: s.short_trend,
    long_trend: s.long_trend,
    high_24h: high,
    low_24h: low,
    price_change_pct_24h: pct24,
    additional_entry_pending: Boolean(pending),
    additional_buy_count,
    additional_entry_time,
    avg_cycle_time: 24 + (seed % 6) * 18,
    sparkline_24h: mockSparkline24h(s.current_price, seed),
  };
}

function tpFields(s: MockSignal, seed: number): PulseSectionFields {
  const { high, low } = highLow24(s.symbol);
  const pct24 = rangePct24h(s.symbol);
  const pendingPx = s.actions.find((a) => a.action_type === 'partial_exit' && a.status === 'pending')?.price;
  const triggered = s.actions.find((a) => a.action_type === 'partial_exit' && a.status === 'triggered');
  const locked = roundPrice(Math.abs(s.current_price - s.entry_price) * 0.12, 2);
  return {
    partial_close_price: pendingPx,
    locked_profit_amount: locked,
    locked_profit_percent: +((locked / s.entry_price) * 100).toFixed(2),
    short_trend: s.short_trend,
    long_trend: s.long_trend,
    high_24h: high,
    low_24h: low,
    price_change_pct_24h: pct24,
    partial_exit_pending: Boolean(pendingPx),
    partial_exit_time: triggered?.triggered_at ?? undefined,
    avg_cycle_time: 40 + (seed % 4) * 22,
    sparkline_24h: mockSparkline24h(s.current_price, seed + 17),
  };
}

function nonTrendFields(s: MockSignal, seed: number): PulseSectionFields {
  const { high, low } = highLow24(s.symbol);
  const pct24 = rangePct24h(s.symbol);
  const pendingAdd = s.actions.find((a) => a.action_type === 'additional_entry' && a.status === 'pending');
  const pendingExit = s.actions.find((a) => a.action_type === 'partial_exit' && a.status === 'pending');
  return {
    short_trend: s.short_trend,
    long_trend: s.long_trend,
    nontrend_duration: 18 + (seed % 40),
    volatility: volatilityField(s.symbol),
    high_24h: high,
    low_24h: low,
    price_change_pct_24h: pct24,
    additional_entry_pending: Boolean(pendingAdd),
    additional_entry_price: pendingAdd?.price,
    partial_exit_pending: Boolean(pendingExit),
    partial_close_price: pendingExit?.price,
    avg_cycle_time: 55 + (seed % 5) * 12,
    sparkline_24h: mockSparkline24h(s.current_price, seed + 33),
  };
}

function mockToPulse(s: MockSignal, seed: number): PulseApiSignal {
  const pnl = calcPnL(s.entry_price, s.current_price, s.direction);
  const section: PulseSection = derivePulseOpenSectionFromTrendsPnl({
    direction: s.direction,
    shortTrend: mockTrendArrowToDirection(s.short_trend),
    longTrend: mockTrendArrowToDirection(s.long_trend),
    pnlPercent: pnl.percent,
  });
  const strategy_id = strategyIdForMock(s.strategy_type);
  const section_fields: PulseSectionFields | undefined =
    section === 'TREND_DISCOUNT'
      ? discountFields(s, seed)
      : section === 'TREND_TP'
        ? tpFields(s, seed)
        : nonTrendFields(s, seed);

  const entryMin = minutesFromIso(s.created_at) + 3;
  return {
    cycle_id: s.id,
    symbol: s.symbol,
    direction: s.direction,
    entry_price: s.entry_price,
    current_price: s.current_price,
    profit_amount: pnl.dollar,
    profit_rate: pnl.percent,
    entry_time: minutesAgo(entryMin),
    section_time: s.created_at,
    section,
    strategy_id,
    barinterval: '1m',
    section_fields,
    extra_signal: seed % 4 === 0 ? null : 'AI 보조신호',
    remaining_time: 30 + (seed % 9) * 12,
  };
}

function newSignals(): PulseApiSignal[] {
  const b = BASE_PRICES;
  const rows: Array<{
    id: string;
    sym: keyof typeof BASE_PRICES;
    dir: 'long' | 'short';
    entry: number;
    cur: number;
    em: number;
    sm: number;
    short_trend: 'up' | 'down';
    long_trend: 'up' | 'down';
  }> = [
    { id: 'cyc-new-001', sym: 'BTCUSDT', dir: 'long', entry: 72720, cur: b.BTCUSDT.price, em: 4, sm: 2, short_trend: 'up', long_trend: 'up' },
    /** 숏·단기·장기 모두 하락 일치 + 손실 → 추세/할인진입 (현재가 > 진입가) */
    { id: 'cyc-new-002', sym: 'ETHUSDT', dir: 'short', entry: 2180, cur: b.ETHUSDT.price, em: 6, sm: 3, short_trend: 'down', long_trend: 'down' },
    /** 롱인데 단기만 불일치 → 비추세 */
    { id: 'cyc-new-003', sym: 'SUIUSDT', dir: 'long', entry: 0.918, cur: b.SUIUSDT.price, em: 8, sm: 5, short_trend: 'down', long_trend: 'up' },
    { id: 'cyc-new-004', sym: 'PEPEUSDT', dir: 'long', entry: 0.00000835, cur: b.PEPEUSDT.price, em: 10, sm: 6, short_trend: 'up', long_trend: 'up' },
  ];
  return rows.map((r, i) => {
    const pnl = calcPnL(r.entry, r.cur, r.dir);
    const hiLo = highLow24(r.sym);
    const section = derivePulseOpenSectionFromTrendsPnl({
      direction: r.dir,
      shortTrend: mockTrendArrowToDirection(r.short_trend),
      longTrend: mockTrendArrowToDirection(r.long_trend),
      pnlPercent: pnl.percent,
    });
    return {
      cycle_id: r.id,
      symbol: r.sym,
      direction: r.dir,
      entry_price: r.entry,
      current_price: r.cur,
      profit_amount: pnl.dollar,
      profit_rate: pnl.percent,
      entry_time: minutesAgo(r.em),
      section_time: minutesAgo(r.sm),
      section,
      strategy_id: 'S1' as const,
      barinterval: '1m',
      extra_signal: i % 2 === 0 ? null : 'AI 보조신호',
      remaining_time: 120 + i * 20,
      section_fields: {
        high_24h: hiLo.high,
        low_24h: hiLo.low,
        price_change_pct_24h: rangePct24h(r.sym),
        sparkline_24h: mockSparkline24h(r.cur, i + 3),
        short_trend: r.short_trend,
        long_trend: r.long_trend,
      },
    };
  });
}

function closedRecent(): PulseApiSignal[] {
  const rows: Array<{
    id: string;
    sym: keyof typeof BASE_PRICES;
    dir: 'long' | 'short';
    entry: number;
    exit: number;
    sm: number;
    hold: string;
  }> = [
    { id: 'cyc-cr-001', sym: 'LINKUSDT', dir: 'short', entry: 9.2, exit: 9.05, sm: 400, hold: '2h 10m' },
    { id: 'cyc-cr-002', sym: 'DOTUSDT', dir: 'long', entry: 3.72, exit: 3.81, sm: 520, hold: '1h 48m' },
    { id: 'cyc-cr-003', sym: 'NEARUSDT', dir: 'short', entry: 2.52, exit: 2.47, sm: 610, hold: '55m' },
    { id: 'cyc-cr-004', sym: 'WIFUSDT', dir: 'long', entry: 0.188, exit: 0.1945, sm: 700, hold: '3h 5m' },
    { id: 'cyc-cr-005', sym: 'XRPUSDT', dir: 'long', entry: 1.31, exit: 1.335, sm: 800, hold: '4h 22m' },
  ];
  return rows.map((r) => {
    const pnl = calcPnL(r.entry, r.exit, r.dir);
    return {
      cycle_id: r.id,
      symbol: r.sym,
      direction: r.dir,
      entry_price: r.entry,
      current_price: r.exit,
      profit_amount: pnl.dollar,
      profit_rate: pnl.percent,
      entry_time: minutesAgo(r.sm + 40),
      section_time: minutesAgo(r.sm),
      section: 'CLOSED_RECENT' as const,
      strategy_id: 'S1' as const,
      barinterval: '1m',
      section_fields: {
        hold_duration: r.hold,
        locked_amount: 0,
        close_price: r.exit,
        invest_pnl_amount: pnl.dollar,
        invest_pnl_percent: pnl.percent,
        cycle_time: 37,
      },
    };
  });
}

function waitingEntry(): PulseApiSignal[] {
  const rows: Array<{
    id: string;
    sym: keyof typeof BASE_PRICES;
    dir: 'long' | 'short';
    entry: number;
    cur: number;
    cd: number;
    sm: number;
  }> = [
    { id: 'cyc-we-001', sym: 'NEARUSDT', dir: 'long', entry: 2.44, cur: 2.45, cd: 180, sm: 25 },
    { id: 'cyc-we-002', sym: 'DOTUSDT', dir: 'short', entry: 3.92, cur: 3.9, cd: 240, sm: 30 },
    { id: 'cyc-we-003', sym: 'SUIUSDT', dir: 'long', entry: 0.92, cur: 0.9318, cd: 300, sm: 35 },
    { id: 'cyc-we-004', sym: 'LINKUSDT', dir: 'short', entry: 9.12, cur: 9.1, cd: 360, sm: 40 },
  ];
  return rows.map((r, i) => {
    const pnl = calcPnL(r.entry, r.cur, r.dir);
    return {
      cycle_id: r.id,
      symbol: r.sym,
      direction: r.dir,
      entry_price: r.entry,
      current_price: r.cur,
      profit_amount: pnl.dollar,
      profit_rate: pnl.percent,
      entry_time: minutesAgo(r.sm + 5),
      section_time: minutesAgo(r.sm),
      section: 'WAITING_ENTRY' as const,
      strategy_id: 'S1' as const,
      barinterval: '1m',
      section_fields: {
        countdown_sec: r.cd,
        pnl_1d_amount: 12 + i * 1.2,
        pnl_1d_percent: 0.35 + i * 0.05,
        pnl_7d_amount: 40 + i * 3,
        pnl_7d_percent: 0.85 + i * 0.07,
        last_close_time: minutesAgo(r.sm + 200),
        today_signal_count: 2 + (i % 3),
        avg_cycle_time: 42,
      },
    };
  });
}

/** Full MSW payload for `scenario=basic` — no post-processing required. */
export function buildRealisticPulseApiResponse(): PulseApiResponse {
  const seeds = ALL_SIGNALS.map((s, i) => mockToPulse(s, i + 1));
  return {
    as_of: new Date().toISOString(),
    strategy_id: 'S1',
    signals: [...newSignals(), ...seeds, ...closedRecent(), ...waitingEntry()],
  };
}

export function getRealisticClosedSignals(): PulseApiSignal[] {
  return buildRealisticPulseApiResponse().signals.filter((s) => s.section === 'CLOSED_RECENT');
}

// ── Symbol hub: summary + events ─────────────────────────────────────────

/** Summary row for `SymbolContextSummaryBar` — mirrors `events-mock` `SymbolContextSummaryMock`. */
export function buildRealisticSymbolSummary(symbol: string, basePrice: number) {
  const seed = hashSymbol(symbol || 'x');
  const st = SYMBOL_STATS[symbol];
  const sparkline7d = buildSparkline7d(basePrice, seed);
  const lo = Math.min(...sparkline7d) * 0.998;
  const hi = Math.max(...sparkline7d) * 1.002;
  const weekChangePct = +(((sparkline7d[6]! - sparkline7d[0]!) / sparkline7d[0]!) * 100).toFixed(2);
  const b = mockBasePriceRow(symbol);
  const rawVol = b?.dailyVolume ?? `${(6 + (seed % 6)).toFixed(1)}B`;
  const volLabel = rawVol.startsWith('$') ? rawVol : `$${rawVol}`;
  const wins = st ? st.recent_results.filter((x) => x === 'W').length : 3;
  const losses = st ? 5 - wins : 2;
  const lastFive = st?.recent_results ?? ['W', 'L', 'W', 'L', 'W'];
  const entry = roundPrice(basePrice * (0.992 + (seed % 5) * 0.002), getPrecision(basePrice));
  const cur = basePrice;
  const pct = calcPnL(entry, cur, 'long').percent;
  const confidence = 72 + (seed % 12);
  const freshnessMinutes =
    symbol === 'ETHUSDT' ? 12 : symbol === 'SUIUSDT' ? 55 : symbol === 'AVAXUSDT' ? 180 : 8 + (seed % 22);
  const hasSignal = seed % 5 !== 0;
  return {
    sparkline7d,
    weekHigh: hi,
    weekLow: lo,
    weekChangePct,
    weekVolumeLabel: volLabel,
    signalLine: hasSignal
      ? `LONG $${entry.toLocaleString('en-US', { maximumFractionDigits: 6 })} → $${cur.toLocaleString('en-US', { maximumFractionDigits: 6 })} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%)`
      : null,
    winRateLabel: st ? `${st.win_rate}% (${Math.round(st.win_rate * st.total_trades / 100)}/${st.total_trades})` : '62% (31/50)',
    confidence,
    confidenceGrade: getConfidenceGrade(confidence),
    freshnessShort: `${freshnessMinutes}분 전`,
    freshnessMinutes,
    freshnessGrade: getFreshnessGradeFromMinutes(freshnessMinutes),
    lastFive,
    lastFiveSummary: `${wins}승 ${losses}패`,
  };
}

/** Mirrors `events-mock` ORDER_FULL — used to pad tier mix + unique types for tests. */
const ORDER_FULL: EventType[] = [
  'signal_new',
  'action_entry',
  'action_exit',
  'cycle_close',
  'action_expired',
  'stop_loss',
  'trend_change',
  'volatility_spike',
  'market_shift',
  'volume_spike',
  'price_breakout',
  'price_breakdown',
  'win_streak',
  'lose_streak',
  'fitness_change',
  'winrate_milestone',
  'freshness_decay',
];

function padSyntheticMessage(type: EventType, symbol: string, ix: number): Pick<SymbolContextEvent, 'message' | 'detail' | 'sentiment'> {
  const base = EVENT_TYPE_META[type].defaultSentiment;
  const px = getMockSpotPrice(symbol);
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : n < 100 ? 4 : 2 });
  switch (type) {
    case 'signal_new':
      return {
        message: `${symbol} LONG 시그널 $${fmt(px * 0.998)}`,
        detail: `신뢰도 🟢${72 + (ix % 10)}`,
        sentiment: 'positive',
      };
    case 'action_entry':
      return {
        message: `분할매수 체결 $${fmt(px * 0.99)} — 평균단가 조정`,
        sentiment: 'positive',
      };
    case 'action_exit':
      return { message: `부분 익절 $${fmt(px * 1.01)}`, sentiment: 'positive' };
    case 'cycle_close':
      return { message: `청산 +${(1.2 + (ix % 5) * 0.15).toFixed(2)}% — 보유 2h`, sentiment: 'positive' };
    case 'action_expired':
      return { message: '추가 진입 신호 만료', sentiment: 'neutral' };
    case 'stop_loss':
      return { message: '손절 -3.1% — 자동 청산', sentiment: 'negative' };
    case 'trend_change':
      return { message: '단기추세 전환 감지', detail: symbol, sentiment: 'neutral' };
    case 'volatility_spike':
      return { message: '24h 변동성 +38%', sentiment: 'neutral' };
    case 'market_shift':
      return { message: '시장 레짐 전환', sentiment: 'neutral' };
    case 'volume_spike':
      return { message: '거래량 24h 평균 대비 +62%', sentiment: 'neutral' };
    case 'price_breakout':
      return { message: `저항 근접 $${fmt(px * 1.02)}`, sentiment: 'positive' };
    case 'price_breakdown':
      return { message: `지지 근접 $${fmt(px * 0.97)}`, sentiment: 'negative' };
    case 'win_streak':
      return { message: '연승 구간 — 신뢰도 상승', sentiment: 'positive' };
    case 'lose_streak':
      return { message: '연패 구간 — 리스크 관리', sentiment: 'negative' };
    case 'fitness_change':
      return { message: '전략 적합도 조정', sentiment: 'neutral' };
    case 'winrate_milestone':
      return { message: `${symbol} 승률 68% 돌파`, sentiment: 'positive' };
    case 'freshness_decay':
      return { message: '신선도 등급 하락', sentiment: 'neutral' };
    default: {
      const _e: never = type;
      void _e;
      return { message: String(type), sentiment: base };
    }
  }
}

/** Curated feed rows (newest first) — messages align with BASE_PRICES / stats. */
const MOCK_EVENTS_UNSORTED: SymbolContextEvent[] = [
  {
    id: 'ev-1',
    type: 'signal_new',
    symbol: 'ETHUSDT',
    message: `LONG 진입 시그널 $${(2285).toLocaleString('en-US')}`,
    detail: '신뢰도 🟢78 · 딥바이 적합도 🟢112',
    timestamp: minutesAgo(12),
    tier: 1,
    sentiment: 'positive',
  },
  {
    id: 'ev-2',
    type: 'action_entry',
    symbol: 'BNBUSDT',
    message: '분할매수 발동 $598.00 — 평균단가 $606.50',
    detail: 'DCA 체결 · 반등 구간',
    timestamp: minutesAgo(45),
    tier: 1,
    sentiment: 'positive',
  },
  {
    id: 'ev-3',
    type: 'trend_change',
    symbol: 'BTCUSDT',
    message: '단기추세 하락→상승 전환',
    detail: '추세/할인진입 섹션 유지',
    timestamp: minutesAgo(58),
    tier: 2,
    sentiment: 'neutral',
  },
  {
    id: 'ev-4',
    type: 'action_exit',
    symbol: 'ADAUSDT',
    message: '이익 실현 $0.2520 — 확보 수익 +$0.017',
    detail: '분할청산 1차',
    timestamp: minutesAgo(30),
    tier: 1,
    sentiment: 'positive',
  },
  {
    id: 'ev-5',
    type: 'volume_spike',
    symbol: 'DOGEUSDT',
    message: '거래량 24h 평균 대비 +72%',
    detail: '유동성 증가',
    timestamp: minutesAgo(72),
    tier: 2,
    sentiment: 'neutral',
  },
  {
    id: 'ev-6',
    type: 'cycle_close',
    symbol: 'LINKUSDT',
    message: 'SHORT 청산 +5.26% ($42.50) — 보유 3h 20m',
    detail: '올해 누적: +$1,240 (12승 4패)',
    timestamp: minutesAgo(95),
    tier: 1,
    sentiment: 'positive',
  },
  {
    id: 'ev-7',
    type: 'win_streak',
    symbol: 'BTCUSDT',
    message: '4연승 달성 — 신뢰도 78→82',
    detail: '최근 10건 승률 70%',
    timestamp: minutesAgo(120),
    tier: 3,
    sentiment: 'positive',
  },
  {
    id: 'ev-8',
    type: 'price_breakout',
    symbol: 'BTCUSDT',
    message: `24h 최고가 근접 $${BASE_PRICES.BTCUSDT.dailyRange[1].toLocaleString('en-US')}`,
    detail: '저항 구간 테스트',
    timestamp: minutesAgo(140),
    tier: 2,
    sentiment: 'positive',
  },
  {
    id: 'ev-9',
    type: 'fitness_change',
    symbol: 'SOLUSDT',
    message: '세이프 시장적합도 110→88 (추세→횡보)',
    detail: '전략 재검토 권장',
    timestamp: minutesAgo(180),
    tier: 3,
    sentiment: 'negative',
  },
  {
    id: 'ev-10',
    type: 'stop_loss',
    symbol: 'WIFUSDT',
    message: '손절 -3.1% (-$62) — 자동 청산',
    detail: '비추세 구간 손절',
    timestamp: minutesAgo(220),
    tier: 1,
    sentiment: 'negative',
  },
  {
    id: 'ev-11',
    type: 'signal_new',
    symbol: 'BTCUSDT',
    message: `LONG 진입 시그널 $${(73200).toLocaleString('en-US')}`,
    detail: '신뢰도 🟢80 · 원샷',
    timestamp: minutesAgo(38),
    tier: 1,
    sentiment: 'positive',
  },
  {
    id: 'ev-12',
    type: 'market_shift',
    symbol: 'BTCUSDT',
    message: '시장 상태: 고변동→추세 전환',
    detail: '원샷/세이프 적합도 ↑',
    timestamp: minutesAgo(300),
    tier: 2,
    sentiment: 'neutral',
  },
  {
    id: 'ev-13',
    type: 'action_expired',
    symbol: 'SOLUSDT',
    message: '분할매수 신호 만료 — 미발동',
    detail: '$81.00 도달하지 않음',
    timestamp: minutesAgo(200),
    tier: 1,
    sentiment: 'neutral',
  },
  {
    id: 'ev-14',
    type: 'lose_streak',
    symbol: 'PEPEUSDT',
    message: '3연패 — 신뢰도 55→48',
    detail: '비추세 구간 변동성 주의',
    timestamp: minutesAgo(350),
    tier: 3,
    sentiment: 'negative',
  },
  {
    id: 'ev-15',
    type: 'freshness_decay',
    symbol: 'AVAXUSDT',
    message: '마지막 신호 3시간 경과 — 신선도 🟢→🔴',
    detail: '새 신호 대기 중',
    timestamp: minutesAgo(180),
    tier: 3,
    sentiment: 'neutral',
  },
];

export const MOCK_EVENTS = [...MOCK_EVENTS_UNSORTED].sort(
  (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
);

export function realisticEventsForSymbol(symbol: string, minCount = 10, maxCount = 17): SymbolContextEvent[] {
  const seed = hashSymbol(symbol);
  const target = Math.min(maxCount, Math.max(minCount, 10 + (seed % 8)));
  const mine = MOCK_EVENTS.filter((e) => e.symbol === symbol);
  const out = [...mine];
  if (!out.some((e) => e.tier === 3)) {
    out.push({
      id: `${symbol}-t3-base`,
      type: 'win_streak',
      symbol,
      message: '연승 구간 — 신뢰도 상승',
      detail: `${symbol} 최근 10건`,
      timestamp: minutesAgo(16 + (seed % 4)),
      tier: 3,
      sentiment: 'positive',
    });
  }
  let i = 0;
  while (out.length < target) {
    const type = ORDER_FULL[i % ORDER_FULL.length]!;
    const meta = EVENT_TYPE_META[type];
    const msg = padSyntheticMessage(type, symbol, i);
    out.push({
      id: `${symbol}-pad-${seed}-${i}`,
      type,
      symbol,
      ...msg,
      timestamp: minutesAgo(18 + i * 11 + (seed % 5)),
      tier: meta.tier,
    });
    i++;
  }
  return out
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, target);
}

// ── Legacy PULSE™ / WAVE™ diagram pages (`SignalPulse1`, `SignalWave1`) ──

function aiTrendFromMock(symbol: string, short: 'up' | 'down', long: 'up' | 'down'): OneSignal['ai_analysis'] {
  const v = getVolatilityType(symbol);
  const volatility = v === 'high' ? 'High' : v === 'low' ? 'Low' : 'Mid';
  return {
    trend_short: short === 'up' ? 'up' : 'down',
    trend_long: long === 'up' ? 'up' : 'down',
    volatility,
    analysis_text: 'Mock 시그널 — realistic-data',
    risk_level: volatility === 'High' ? 'High' : 'Mid',
  };
}

/** `OneSignal` 행 1건 — 진입/청산가·기대수익은 `calcPnL`과 정합 */
export function buildLegacyOneSignalRow(s: MockSignal): OneSignal {
  const entry = s.entry_price;
  const cur = s.current_price;
  const pnlNow = calcPnL(entry, cur, s.direction);
  const targetPct = Math.min(7.5, Math.max(0.45, Math.abs(pnlNow.percent) + 0.35));
  const exit_price =
    s.direction === 'long'
      ? roundPrice(entry * (1 + targetPct / 100), getPrecision(entry))
      : roundPrice(entry * (1 - targetPct / 100), getPrecision(entry));
  const expectedRaw =
    s.direction === 'long'
      ? ((exit_price - entry) / entry) * 100
      : ((entry - exit_price) / entry) * 100;
  const expected_return_pct = +Math.min(8, Math.max(0.35, Math.abs(expectedRaw))).toFixed(2);
  const seed = hashSymbol(`${s.symbol}-${s.id}`);
  const strategy_cumulative_return_pct = 16 + (seed % 19);
  const risk_reward_ratio = +(1.45 + (seed % 12) * 0.1).toFixed(2);

  return {
    asset: s.symbol,
    signal_type: 'ONE',
    direction: s.direction === 'long' ? 'Long' : 'Short',
    entry_price: entry,
    exit_price,
    expected_return_pct,
    risk_reward_ratio,
    strategy_id: 1 + (seed % 3),
    strategy_name: seed % 2 === 0 ? 'Trend Follow' : 'Momentum',
    strategy_cumulative_return_pct,
    timestamp: s.created_at,
    ai_analysis: aiTrendFromMock(s.symbol, s.short_trend, s.long_trend),
  };
}

/** Pulse 레거시 페이지용 샘플 (수익·할인 혼합) */
export const LEGACY_PULSE_ONE_SIGNAL_DEMOS: OneSignal[] = [
  buildLegacyOneSignalRow(PROFIT_TAKING_SIGNALS[0]!),
  buildLegacyOneSignalRow(PROFIT_TAKING_SIGNALS[1]!),
  buildLegacyOneSignalRow(DISCOUNT_ENTRY_SIGNALS[0]!),
  buildLegacyOneSignalRow(DISCOUNT_ENTRY_SIGNALS[1]!),
  buildLegacyOneSignalRow(NON_TREND_SIGNALS[0]!),
];

/** Wave 레거시 페이지용 샘플 (순서만 다르게) */
export const LEGACY_WAVE_ONE_SIGNAL_DEMOS: OneSignal[] = [
  buildLegacyOneSignalRow(PROFIT_TAKING_SIGNALS[2]!),
  buildLegacyOneSignalRow(DISCOUNT_ENTRY_SIGNALS[2]!),
  buildLegacyOneSignalRow(PROFIT_TAKING_SIGNALS[3]!),
  buildLegacyOneSignalRow(NON_TREND_SIGNALS[1]!),
  buildLegacyOneSignalRow(DISCOUNT_ENTRY_SIGNALS[3]!),
];

export function getSelectableSymbols(): string[] {
  return Object.keys(BASE_PRICES);
}
