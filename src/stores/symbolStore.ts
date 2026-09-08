/**
 * Symbol Global Store (Zustand)
 *
 * 30 симболын бүх датаг global хадгална:
 * 1. realPrice - WebSocket-аар real-time үнэ авах
 * 2. last 24h high/low - initial хийх үед database-аас, дараа нь real үнээр шинэчлэх
 * 3. last trend утгууд - initial хийх үед database-аас, дараа нь insert event subscription-аар шинэчлэх
 * 4. last volatility - initial хийх үед database-аас, дараа нь insert event subscription-аар шинэчлэх
 * 5. last signal cycle - initial хийх үед database-аас, дараа нь insert event subscription-аар шинэчлэх
 * Singleton pattern - хаах шаардлагагүй, давхардуулж нээхгүй
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { getTodayUtcStart } from '@/lib/time';
import { subscribeTickerPrice } from '@/services/binanceTickerWs';
import { normalizeTradingCategory, type TradingCategory } from '@/lib/trading-category';
import type { EntryTrendDirection } from '@/types/enhanced-signal';
import { isBatchUploadRealtimeRow } from '@/lib/realtime/ingestMode';

/** Serialize `initialize` so concurrent calls do not attach to the same Realtime channel after `subscribe()`. */
let symbolStoreInitChain: Promise<void> = Promise.resolve();
let symbolStorePricePollTimer: ReturnType<typeof setInterval> | null = null;
const lastTrendRangeFetches = new Set<string>();
const SYMBOL_STORE_PRICE_POLL_MS = 5_000;
const TEN_MINUTE_MS = 10 * 60 * 1000;
const FIFTEEN_SECOND_MS = 15 * 1000;
const LAST_TREND_RANGE_LIMIT = 5_000;

type TrendBarInterval = '1m' | '10m';

export interface LastTrendRange {
  highest: number;
  lowest: number;
  startedAt: string;
  startedAtMs: number;
}

// Signal Cycle утга
export interface SignalCycle {
  id: string;
  symbol: string;
  side: string; // 'LONG' | 'SHORT'
  entry_price: number;
  entry_time: string;
  entry_event_id: string | null;
  exit_price: number | null;
  exit_time: string | null;
  exit_event_id: string | null;
  realized_pnl_pct: number | null;
  hold_sec: number | null;
  is_open: boolean;
  ingest_mode?: string | null;
  flow: string | null;
  entry_trend_short: EntryTrendDirection | null;
  entry_trend_long: EntryTrendDirection | null;
  barinterval: string | null;
  trading_category: TradingCategory | null;
  expected_win_rate_pct?: number | null;
  win_rate_pct?: number | null;
  win_rate?: number | null;
  win_rate_7d?: number | null;
  win_rate_30d?: number | null;
  win_rate_all?: number | null;
  risk_reward_ratio?: number | null;
  risk_reward_ratio_30d?: number | null;
  risk_reward_ratio_all?: number | null;
  created_at: string;
  updated_at: string;
}

// Symbol дата утга
export interface SymbolData {
  // Price утгууд
  realPrice: number | null; // Binance-аас авсан бодит үнэ
  dailyChange: number; // Өдрийн нээлт (00:00 UTC)-ийн үнэтэй харьцуулсан % өөрчлөлт
  dailyOpenPrice: number | null; // Өнөөдрийн 00:00 UTC-ийн daily candle open үнэ
  highest24h: number; // Сүүлийн 24 цагийн хамгийн өндөр үнэ
  lowest24h: number; // Сүүлийн 24 цагийн хамгийн бага үнэ
  priceTs: string; // Price update timestamp

  // Trend утгууд (barinterval: '1m' | '10m')
  trendShort1m: number | null; // 1m short-term trend
  trendLong1m: number | null; // 1m long-term trend
  trendShort10m: number | null; // 10m short-term trend
  trendLong10m: number | null; // 10m long-term trend
  trendTs1m: string; // 1m current trend start/update timestamp
  trendTs10m: string; // 10m current trend start/update timestamp
  trendShortTs1m?: string; // 1m short-term trend start/update timestamp
  trendLongTs1m?: string; // 1m long-term trend start/update timestamp
  trendShortTs10m?: string; // 10m short-term trend start/update timestamp
  trendLongTs10m?: string; // 10m long-term trend start/update timestamp
  highestLastTrend1m?: number | null; // 1m overlapped trend high since start
  lowestLastTrend1m?: number | null; // 1m overlapped trend low since start
  lastTrendStartedAt1m?: string; // 1m overlapped trend start timestamp
  highestLastTrend10m?: number | null; // 10m overlapped trend high since start
  lowestLastTrend10m?: number | null; // 10m overlapped trend low since start
  lastTrendStartedAt10m?: string; // 10m overlapped trend start timestamp
  prevTrendShort1m: number | null; // Өмнөх 1m short-term trend
  prevTrendLong1m: number | null; // Өмнөх 1m long-term trend
  prevTrendShort10m: number | null; // Өмнөх 10m short-term trend
  prevTrendLong10m: number | null; // Өмнөх 10m long-term trend

  // Volatility утгууд
  volatility1m: number | null; // 1m volatility
  volatility10m: number | null; // 10m volatility
  volatilityTs1m: string; // 1m Volatility update timestamp
  volatilityTs10m: string; // 10m Volatility update timestamp

  // Signal Cycle утгууд
  lastSignalCycle1m: SignalCycle | null; // 1m хамгийн сүүлийн signal cycle
  lastSignalCycle10m: SignalCycle | null; // 10m хамгийн сүүлийн signal cycle
  signalCycles1m?: SignalCycle[];
  signalCycles10m?: SignalCycle[];
  signalCycleTs1m: string; // 1m Signal cycle update timestamp
  signalCycleTs10m: string; // 10m Signal cycle update timestamp
}

type SymbolChangeCallback = (symbol: string, data: Partial<SymbolData>) => void;

interface SymbolState {
  // Symbol дата: Map<symbol, SymbolData>
  symbols: Map<string, SymbolData>;

  tickerUnsubscribes: Map<string, () => void>;

  // Realtime subscription channel (trend_events, volatility_events)
  channel: ReturnType<typeof supabase.channel> | null;

  // Subscription эхлүүлсэн эсэх (давхардуулж эхлүүлэхгүйн тулд)
  initialized: boolean;

  // Symbol өөрчлөлтийн callback-ууд
  changeCallbacks: Set<SymbolChangeCallback>;

  // Actions
  initialize: (symbols: string[]) => Promise<void>;

  // Getters
  getSymbol: (symbol: string) => SymbolData | null;
  getPrice: (symbol: string) => number | null;
  getDailyChange: (symbol: string) => number | null;
  getHighest24h: (symbol: string) => number | null;
  getLowest24h: (symbol: string) => number | null;
  getTrend: (
    symbol: string,
    barinterval: '1m' | '10m',
    timeframe: 'short' | 'long'
  ) => number | null;
  getPrevTrend: (
    symbol: string,
    barinterval: '1m' | '10m',
    timeframe: 'short' | 'long'
  ) => number | null;
  getVolatility: (symbol: string, barinterval: '1m' | '10m') => number | null;
  getSignalCycle: (symbol: string, barinterval: '1m' | '10m') => SignalCycle | null;
  getSignalCycles: (symbol: string, barinterval: '1m' | '10m') => SignalCycle[];
  getLastTrendRange: (symbol: string, barinterval: TrendBarInterval) => LastTrendRange | null;

  // Callback management
  onSymbolChange: (callback: SymbolChangeCallback) => () => void; // unsubscribe function буцаана

  // Internal: Update methods
  updatePrice: (symbol: string, price: number, _dailyChange: number) => void;
  update24hStats: (symbol: string, highest24h: number, lowest24h: number) => void;
  updateTrend: (
    symbol: string,
    barinterval: '1m' | '10m',
    timeframe: 'short' | 'long',
    value: number,
    timestamp?: string | number | null
  ) => void;
  updateVolatility: (symbol: string, barinterval: '1m' | '10m', value: number) => void;
  updateSignalCycle: (symbol: string, barinterval: '1m' | '10m', cycle: any) => void;
  refreshLastTrendRanges: (symbols: string[], barinterval?: TrendBarInterval) => Promise<void>;

  // Fetch methods
  fetchInitialPrices: (symbols: string[]) => Promise<void>;
  fetchInitial24hStats: (symbols: string[]) => Promise<void>;
  fetchInitialTrends: (symbols: string[]) => Promise<void>;
  fetchInitialVolatilities: (symbols: string[]) => Promise<void>;
  fetchInitialSignalCycles: (symbols: string[]) => Promise<void>;
  fetchBinancePrices: (
    symbols: string[]
  ) => Promise<Map<string, { price: number; dailyChange: number }>>;
  fetchDailyOpenPrices: (symbols: string[]) => Promise<void>;
}

function ensureSymbolStorePricePolling(get: () => SymbolState) {
  if (symbolStorePricePollTimer) return;

  const poll = async () => {
    const state = get();
    const symbols = Array.from(state.tickerUnsubscribes.keys());

    if (symbols.length === 0) {
      if (symbolStorePricePollTimer) {
        clearInterval(symbolStorePricePollTimer);
        symbolStorePricePollTimer = null;
      }
      return;
    }

    try {
      const prices = await state.fetchBinancePrices(symbols);
      prices.forEach((data, symbol) => {
        state.updatePrice(symbol, data.price, data.dailyChange);
      });
    } catch (error) {
      console.warn('[symbolStore] price polling failed:', error);
    }
  };

  symbolStorePricePollTimer = setInterval(() => {
    void poll();
  }, SYMBOL_STORE_PRICE_POLL_MS);

  void poll();
}

function newerTrendTimestamp(current: string | undefined, incoming: string) {
  const currentMs = current ? Date.parse(current) : Number.NaN;
  const incomingMs = Date.parse(incoming);

  if (!Number.isFinite(currentMs)) return incoming;
  if (!Number.isFinite(incomingMs)) return current ?? incoming;
  return incomingMs >= currentMs ? incoming : (current ?? incoming);
}

function timestampToMs(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    return Number.isFinite(ms) ? ms : null;
  }

  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && value.trim() !== '') {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function chartBars10mRangeStartMs(startedAtMs: number): number {
  return Math.floor(startedAtMs / TEN_MINUTE_MS) * TEN_MINUTE_MS;
}

function chartBars15sRangeStartMs(startedAtMs: number): number {
  return Math.floor(startedAtMs / FIFTEEN_SECOND_MS) * FIFTEEN_SECOND_MS;
}

function isTrendValueDirectional(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value !== 0;
}

function hasOverlappedTrend(data: SymbolData | null | undefined, barinterval: TrendBarInterval) {
  if (!data) return false;
  const short = barinterval === '1m' ? data.trendShort1m : data.trendShort10m;
  const long = barinterval === '1m' ? data.trendLong1m : data.trendLong10m;

  return (
    isTrendValueDirectional(short) &&
    isTrendValueDirectional(long) &&
    Math.sign(short!) === Math.sign(long!)
  );
}

function getTrendOverlapStartedAtMs(
  data: SymbolData | null | undefined,
  barinterval: TrendBarInterval
): number | null {
  if (!data || !hasOverlappedTrend(data, barinterval)) return null;

  if (barinterval === '1m') {
    const shortMs = timestampToMs(data.trendShortTs1m ?? data.trendTs1m);
    const longMs = timestampToMs(data.trendLongTs1m ?? data.trendTs1m);
    if (shortMs != null && longMs != null) return Math.max(shortMs, longMs);
    return timestampToMs(data.trendTs1m);
  }

  const shortMs = timestampToMs(data.trendShortTs10m ?? data.trendTs10m);
  const longMs = timestampToMs(data.trendLongTs10m ?? data.trendTs10m);
  if (shortMs != null && longMs != null) return Math.max(shortMs, longMs);
  return timestampToMs(data.trendTs10m);
}

function getCachedLastTrendStartedAtMs(
  data: SymbolData,
  barinterval: TrendBarInterval
): number | null {
  return timestampToMs(
    barinterval === '1m' ? data.lastTrendStartedAt1m : data.lastTrendStartedAt10m
  );
}

function hasStoredLastTrendRangeFields(data: SymbolData, barinterval: TrendBarInterval) {
  if (barinterval === '1m') {
    return (
      data.highestLastTrend1m != null ||
      data.lowestLastTrend1m != null ||
      Boolean(data.lastTrendStartedAt1m)
    );
  }

  return (
    data.highestLastTrend10m != null ||
    data.lowestLastTrend10m != null ||
    Boolean(data.lastTrendStartedAt10m)
  );
}

function makeLastTrendRangeFetchKey(
  symbol: string,
  barinterval: TrendBarInterval,
  startedAtMs: number
) {
  return `${symbol}:${barinterval}:${startedAtMs}`;
}

function clearLastTrendRangeFields(data: SymbolData, barinterval: TrendBarInterval): SymbolData {
  if (barinterval === '1m') {
    return {
      ...data,
      highestLastTrend1m: null,
      lowestLastTrend1m: null,
      lastTrendStartedAt1m: '',
    };
  }

  return {
    ...data,
    highestLastTrend10m: null,
    lowestLastTrend10m: null,
    lastTrendStartedAt10m: '',
  };
}

function assignLastTrendRangeFields(
  data: SymbolData,
  barinterval: TrendBarInterval,
  range: LastTrendRange
): SymbolData {
  if (barinterval === '1m') {
    return {
      ...data,
      highestLastTrend1m: range.highest,
      lowestLastTrend1m: range.lowest,
      lastTrendStartedAt1m: range.startedAt,
    };
  }

  return {
    ...data,
    highestLastTrend10m: range.highest,
    lowestLastTrend10m: range.lowest,
    lastTrendStartedAt10m: range.startedAt,
  };
}

function expandLastTrendRangeWithPrice(data: SymbolData, price: number): SymbolData {
  let next = data;

  if (
    hasOverlappedTrend(next, '1m') &&
    next.highestLastTrend1m != null &&
    next.lowestLastTrend1m != null
  ) {
    next = {
      ...next,
      highestLastTrend1m: Math.max(next.highestLastTrend1m, price),
      lowestLastTrend1m: Math.min(next.lowestLastTrend1m, price),
    };
  }

  if (
    hasOverlappedTrend(next, '10m') &&
    next.highestLastTrend10m != null &&
    next.lowestLastTrend10m != null
  ) {
    next = {
      ...next,
      highestLastTrend10m: Math.max(next.highestLastTrend10m, price),
      lowestLastTrend10m: Math.min(next.lowestLastTrend10m, price),
    };
  }

  return next;
}

function getLastTrendRangeFromData(
  data: SymbolData | null | undefined,
  barinterval: TrendBarInterval
): LastTrendRange | null {
  if (!data || !hasOverlappedTrend(data, barinterval)) return null;

  const highest = barinterval === '1m' ? data.highestLastTrend1m : data.highestLastTrend10m;
  const lowest = barinterval === '1m' ? data.lowestLastTrend1m : data.lowestLastTrend10m;
  const startedAt = barinterval === '1m' ? data.lastTrendStartedAt1m : data.lastTrendStartedAt10m;
  const startedAtMs = timestampToMs(startedAt);

  if (highest == null || lowest == null || startedAtMs == null) return null;
  if (!Number.isFinite(highest) || !Number.isFinite(lowest)) return null;
  if (highest === lowest) return null;

  return {
    highest,
    lowest,
    startedAt: startedAt || new Date(startedAtMs).toISOString(),
    startedAtMs,
  };
}

function parseRangeValue(value: number | string | null | undefined): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseEntryTrendSnapshot(value: unknown): EntryTrendDirection | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'UP' || normalized === 'LONG') return 'UP';
    if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
    if (normalized === 'NEUTRAL' || normalized === '0') return 'NEUTRAL';
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 0) return 'UP';
  if (parsed < 0) return 'DOWN';
  return 'NEUTRAL';
}

function parseSignalCycleRow(
  cycle: any,
  fallbackSymbol: string,
  fallbackBarinterval: TrendBarInterval
): SignalCycle | null {
  const entryPrice = cycle.entry_price ? parseFloat(String(cycle.entry_price)) : NaN;
  if (isNaN(entryPrice)) return null;

  const exitPrice = cycle.exit_price ? parseFloat(String(cycle.exit_price)) : null;
  const realizedPnl = cycle.realized_pnl_pct ? parseFloat(String(cycle.realized_pnl_pct)) : null;

  return {
    id: cycle.id,
    symbol: cycle.symbol || fallbackSymbol,
    side: cycle.side || null,
    entry_price: entryPrice,
    entry_time: cycle.entry_time || cycle.created_at || new Date().toISOString(),
    entry_event_id: cycle.entry_event_id || null,
    exit_price: exitPrice,
    exit_time: cycle.exit_time || null,
    exit_event_id: cycle.exit_event_id || null,
    realized_pnl_pct: realizedPnl,
    hold_sec: cycle.hold_sec || null,
    is_open: cycle.is_open !== undefined && cycle.is_open !== null ? Boolean(cycle.is_open) : false,
    flow: cycle.flow || null,
    entry_trend_short: parseEntryTrendSnapshot(cycle.entry_trend_short),
    entry_trend_long: parseEntryTrendSnapshot(cycle.entry_trend_long),
    barinterval: cycle.barinterval || fallbackBarinterval,
    trading_category: normalizeTradingCategory(cycle.trading_category) ?? null,
    expected_win_rate_pct: parseNullableNumber(
      cycle.expected_win_rate_pct ?? cycle.expectedWinRatePct
    ),
    win_rate_pct: parseNullableNumber(cycle.win_rate_pct ?? cycle.winRatePct),
    win_rate: parseNullableNumber(cycle.win_rate ?? cycle.winRate),
    win_rate_7d: parseNullableNumber(cycle.win_rate_7d ?? cycle.winRate7d),
    win_rate_30d: parseNullableNumber(
      cycle.win_rate_30d ?? cycle.win_rate_30d_pct ?? cycle.winRate30d ?? cycle.winRate30dPct
    ),
    win_rate_all: parseNullableNumber(
      cycle.win_rate_all ??
        cycle.all_win_rate ??
        cycle.all_win_rate_pct ??
        cycle.winRateAll ??
        cycle.allWinRate ??
        cycle.allWinRatePct
    ),
    risk_reward_ratio: parseNullableNumber(cycle.risk_reward_ratio ?? cycle.riskRewardRatio),
    risk_reward_ratio_30d: parseNullableNumber(
      cycle.risk_reward_ratio_30d ?? cycle.riskRewardRatio30d
    ),
    risk_reward_ratio_all: parseNullableNumber(
      cycle.risk_reward_ratio_all ??
        cycle.all_risk_reward_ratio ??
        cycle.riskRewardRatioAll ??
        cycle.allRiskRewardRatio
    ),
    created_at: cycle.created_at || new Date().toISOString(),
    updated_at: cycle.updated_at || new Date().toISOString(),
  };
}

function signalCycleTimeMs(cycle: SignalCycle): number {
  const timestamp =
    Date.parse(cycle.entry_time || '') ||
    Date.parse(cycle.created_at || '') ||
    Date.parse(cycle.updated_at || '');
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortSignalCycles(cycles: readonly SignalCycle[]): SignalCycle[] {
  return [...cycles].sort((a, b) => {
    const timeDelta = signalCycleTimeMs(a) - signalCycleTimeMs(b);
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

function latestSignalCycleTimestamp(cycles: readonly SignalCycle[]): string {
  const latest = cycles
    .map((cycle) => Date.parse(cycle.updated_at || cycle.created_at || cycle.entry_time || ''))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  return Number.isFinite(latest) ? new Date(latest).toISOString() : new Date().toISOString();
}

function signalCyclesForBarinterval(
  data: SymbolData | null | undefined,
  barinterval: TrendBarInterval
): SignalCycle[] {
  if (!data) return [];
  const list = barinterval === '1m' ? data.signalCycles1m : data.signalCycles10m;
  if (list && list.length > 0) return sortSignalCycles(list.filter((cycle) => cycle.is_open));

  const legacy = barinterval === '1m' ? data.lastSignalCycle1m : data.lastSignalCycle10m;
  return legacy?.is_open ? [legacy] : [];
}

function rangeFromChartRows(rows: Array<{ high: number | string; low: number | string }>) {
  if (rows.length === 0) return null;

  let highest = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;

  for (const row of rows) {
    const high = parseRangeValue(row.high);
    const low = parseRangeValue(row.low);
    if (high != null) highest = Math.max(highest, high);
    if (low != null) lowest = Math.min(lowest, low);
  }

  if (!Number.isFinite(highest) || !Number.isFinite(lowest)) return null;

  return { highest, lowest };
}

function hasRangeSpan(range: { highest: number; lowest: number } | null) {
  return Boolean(range && range.highest !== range.lowest);
}

function getStorePriceRangeFallback(data: SymbolData): { highest: number; lowest: number } | null {
  if (
    Number.isFinite(data.highest24h) &&
    Number.isFinite(data.lowest24h) &&
    data.highest24h !== data.lowest24h
  ) {
    return {
      highest: data.highest24h,
      lowest: data.lowest24h,
    };
  }

  return null;
}

interface TrendEventRow {
  symbol: string;
  barinterval: string;
  timeframe: string;
  value: number;
  ts: string;
}

interface VolatilityEventRow {
  symbol: string;
  barinterval: string;
  value: number;
  ts: string;
}

const TREND_BARINTERVALS = ['1m', '10m'] as const;
const TREND_TIMEFRAMES = ['short', 'long'] as const;

/**
 * (symbol x barinterval x timeframe)-ийн хамгийн сүүлийн 2 trend event-ийг
 * НЭГ хүсэлтээр авна — өмнө нь энэ нь 30 x 2 x 2 = 120 тусдаа хүсэлт байсан.
 *
 * RPC нь DB дээр байхгүй үед (migration хараахан ажиллаагүй) хуучин симбол
 * тус бүрийн замд буцаж унана, ингэснээр migration-аас өмнө deploy хийсэн ч
 * Signal Board эвдрэхгүй.
 */
async function fetchLatestTrendEventRows(symbols: string[]): Promise<TrendEventRow[][]> {
  const { data, error } = await (supabase.rpc as any)('get_latest_trend_events', {
    p_symbols: symbols,
  });

  if (!error && Array.isArray(data)) {
    // rn=1 нь одоогийн trend, rn=2 нь өмнөх нь. Групп бүрийг [latest, previous]
    // дараалалтай болгож, симбол тус бүрийн хуучин хэлбэрт хөрвүүлнэ.
    const groups = new Map<string, TrendEventRow[]>();
    for (const row of data as Array<TrendEventRow & { rn: number }>) {
      const key = `${row.symbol}|${row.barinterval}|${row.timeframe}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    return Array.from(groups.values()).map((group) =>
      [...group].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
    );
  }

  console.warn(
    '[symbolStore] get_latest_trend_events RPC unavailable, falling back to per-symbol queries:',
    error
  );

  const results = await Promise.all(
    symbols.flatMap((symbol) =>
      TREND_BARINTERVALS.flatMap((barinterval) =>
        TREND_TIMEFRAMES.map((timeframe) =>
          supabase
            .from('trend_events')
            .select('symbol, barinterval, timeframe, value, ts')
            .eq('symbol', symbol)
            .eq('barinterval', barinterval)
            .eq('timeframe', timeframe)
            .order('ts', { ascending: false })
            .limit(2)
        )
      )
    )
  );

  return results
    .map((result) => (Array.isArray(result.data) ? (result.data as TrendEventRow[]) : []))
    .filter((rows) => rows.length > 0);
}

/**
 * (symbol x barinterval)-ийн хамгийн сүүлийн volatility event-ийг НЭГ хүсэлтээр
 * авна — өмнө нь 30 x 2 = 60 тусдаа хүсэлт байсан. RPC байхгүй үед хуучин зам руу
 * буцаж унана.
 */
async function fetchLatestVolatilityEventRows(symbols: string[]): Promise<VolatilityEventRow[]> {
  const { data, error } = await (supabase.rpc as any)('get_latest_volatility_events', {
    p_symbols: symbols,
  });

  if (!error && Array.isArray(data)) {
    return data as VolatilityEventRow[];
  }

  console.warn(
    '[symbolStore] get_latest_volatility_events RPC unavailable, falling back to per-symbol queries:',
    error
  );

  const results = await Promise.all(
    symbols.flatMap((symbol) =>
      TREND_BARINTERVALS.map((barinterval) =>
        supabase
          .from('volatility_events')
          .select('symbol, barinterval, value, ts')
          .eq('symbol', symbol)
          .eq('barinterval', barinterval)
          .order('ts', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )
  );

  return results
    .map((result) => result.data as VolatilityEventRow | null)
    .filter((row): row is VolatilityEventRow => Boolean(row && row.symbol));
}

async function fetchChartBars10mRangeOnly(
  symbol: string,
  startedAtMs: number
): Promise<{ highest: number; lowest: number } | null> {
  const rangeStartMs = chartBars10mRangeStartMs(startedAtMs);
  const { data, error } = await supabase
    .from('chart_bars_10m')
    .select('high, low')
    .eq('symbol', symbol)
    .gte('ts_ms', rangeStartMs)
    .order('ts_ms', { ascending: false })
    .limit(LAST_TREND_RANGE_LIMIT);

  if (error) {
    console.warn('[symbolStore] Failed to fetch last trend range from chart_bars_10m:', error);
    return null;
  }

  let rows = data ?? [];

  if (rows.length === 0) {
    const { data: previousRows, error: previousError } = await supabase
      .from('chart_bars_10m')
      .select('high, low')
      .eq('symbol', symbol)
      .lte('ts_ms', startedAtMs)
      .order('ts_ms', { ascending: false })
      .limit(1);

    if (previousError) {
      console.warn('[symbolStore] Failed to fetch nearest last trend candle:', previousError);
    }

    rows = previousRows ?? [];
  }

  return rangeFromChartRows(rows);
}

async function fetchChartBars15sRange(
  symbol: string,
  startedAtMs: number
): Promise<{ highest: number; lowest: number } | null> {
  const rangeStartMs = chartBars15sRangeStartMs(startedAtMs);
  const { data, error } = await (supabase as any)
    .from('chart_bars_15s')
    .select('high, low')
    .eq('symbol', symbol)
    .gte('ts_ms', rangeStartMs)
    .order('ts_ms', { ascending: false })
    .limit(LAST_TREND_RANGE_LIMIT);

  if (error) {
    console.warn('[symbolStore] Failed to fetch last trend range from chart_bars_15s:', error);
    return null;
  }

  let rows = data ?? [];

  if (rows.length === 0) {
    const { data: previousRows, error: previousError } = await (supabase as any)
      .from('chart_bars_15s')
      .select('high, low')
      .eq('symbol', symbol)
      .lte('ts_ms', startedAtMs)
      .order('ts_ms', { ascending: false })
      .limit(1);

    if (previousError) {
      console.warn('[symbolStore] Failed to fetch nearest 15s last trend candle:', previousError);
    }

    rows = previousRows ?? [];
  }

  return rangeFromChartRows(rows as Array<{ high: number | string; low: number | string }>);
}

async function fetchChartBarsLastTrendRange(
  symbol: string,
  startedAtMs: number
): Promise<{ highest: number; lowest: number } | null> {
  const tenMinuteRange = await fetchChartBars10mRangeOnly(symbol, startedAtMs);
  if (hasRangeSpan(tenMinuteRange)) return tenMinuteRange;

  const fifteenSecondRange = await fetchChartBars15sRange(symbol, startedAtMs);
  if (fifteenSecondRange) return fifteenSecondRange;

  return tenMinuteRange;
}

// Өдрийн 00:00 UTC-ийн open үнэ тухайн UTC өдрийн туршид хувирдаггүй тул нэг л
// удаа татаад cache-лэнэ — өмнө нь board load бүрт симбол тутамд Binance klines
// руу 30 хүсэлт явдаг байсан (klines-д multi-symbol endpoint байхгүй).
/**
 * Binance 선물에 상장돼 있지 않은 심볼 — 벌크 ticker 응답에 한 번도 나오지 않은
 * 심볼들이다. 개별 조회 폴백에서 제외해 매 폴링마다 실패할 요청을 반복하지 않는다.
 * 벌크 조회 대상에서는 빼지 않으므로 상장되는 순간 자동으로 복구된다.
 */
const binanceUnlistedSymbols = new Set<string>();

const DAILY_OPEN_STORAGE_KEY = 'symbolStore:daily-open';

type DailyOpenCache = { dayStartMs: number; prices: Record<string, number> };

function readDailyOpenCache(dayStartMs: number): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DAILY_OPEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<DailyOpenCache>;
    // Өдөр хальсан бол цэвэрлэж, дахин татна.
    if (parsed?.dayStartMs !== dayStartMs || typeof parsed.prices !== 'object') return {};
    const prices: Record<string, number> = {};
    for (const [symbol, value] of Object.entries(parsed.prices ?? {})) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) prices[symbol] = numeric;
    }
    return prices;
  } catch {
    return {};
  }
}

function writeDailyOpenCache(dayStartMs: number, prices: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: DailyOpenCache = { dayStartMs, prices };
    localStorage.setItem(DAILY_OPEN_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

type LastTrendRangeRequest = { symbol: string; startedAtMs: number };
type LastTrendRangeResult = Map<string, { highest: number; lowest: number }>;

function makeRangeKey(symbol: string, startedAtMs: number): string {
  return `${symbol}|${startedAtMs}`;
}

/**
 * Бүх (symbol, trend overlap start) хосын high/low-г НЭГ хүсэлтээр авна — өмнө нь
 * хос тутамд chart_bars_10m/15s руу 1-4 хүсэлт явж, 30 симбол x 2 barinterval
 * дээр 240 хүртэл хүсэлт болдог байсан.
 *
 * RPC нь DB дээр байхгүй үед (migration хараахан ажиллаагүй) хуучин хос тус бүрийн
 * замд буцаж унана, ингэснээр migration-аас өмнө deploy хийсэн ч Signal Board
 * эвдрэхгүй.
 */
async function fetchLastTrendRangesBatch(
  requests: LastTrendRangeRequest[]
): Promise<LastTrendRangeResult> {
  const resolved: LastTrendRangeResult = new Map();
  if (requests.length === 0) return resolved;

  const { data, error } = await (supabase.rpc as any)('get_last_trend_ranges', {
    p_symbols: requests.map((request) => request.symbol),
    p_started_at_ms: requests.map((request) => request.startedAtMs),
  });

  if (!error && Array.isArray(data)) {
    for (const row of data as Array<{
      symbol: string;
      started_at_ms: number | string;
      highest: number | string;
      lowest: number | string;
    }>) {
      const highest = parseRangeValue(row.highest);
      const lowest = parseRangeValue(row.lowest);
      if (highest == null || lowest == null) continue;
      resolved.set(makeRangeKey(row.symbol, Number(row.started_at_ms)), { highest, lowest });
    }
    return resolved;
  }

  console.warn(
    '[symbolStore] get_last_trend_ranges RPC unavailable, falling back to per-symbol queries:',
    error
  );

  const fallback = await Promise.all(
    requests.map(async (request) => ({
      request,
      range: await fetchChartBarsLastTrendRange(request.symbol, request.startedAtMs),
    }))
  );

  for (const { request, range } of fallback) {
    if (range) resolved.set(makeRangeKey(request.symbol, request.startedAtMs), range);
  }

  return resolved;
}

export const useSymbolStore = create<SymbolState>((set, get) => ({
  symbols: new Map(),
  tickerUnsubscribes: new Map(),
  channel: null,
  initialized: false,
  changeCallbacks: new Set(),

  /**
   * Store initialize хийх
   * 1. Initial дата татах (prices, 24h stats, trends, volatilities)
   * 2. Realtime subscription эхлүүлэх (trend_events, volatility_events)
   * 3. WebSocket-аар real-time үнэ авах
   */
  initialize: async (symbols: string[]) => {
    const pending = symbolStoreInitChain
      .catch(() => undefined)
      .then(async () => {
        const state = get();

        // Хэрэв аль хэдийн эхлүүлсэн бол, зөвхөн шинэ symbol-ууд subscribe хийх
        if (state.initialized && state.channel && state.tickerUnsubscribes.size > 0) {
          const existingSymbols = Array.from(state.tickerUnsubscribes.keys());
          const newSymbols = symbols.filter((s) => !existingSymbols.includes(s));

          if (newSymbols.length > 0) {
            try {
              // fetchInitialPrices가 먼저 심볼 맵을 시딩해야 나머지 함수들의
              // "값 없음" 기본 분기가 안전하게 동작한다 — 그 뒤 나머지는 병렬로 실행한다.
              await get().fetchInitialPrices(newSymbols);
              await Promise.all([
                get().fetchDailyOpenPrices(newSymbols),
                get().fetchInitial24hStats(newSymbols),
                get().fetchInitialTrends(newSymbols),
                get().fetchInitialVolatilities(newSymbols),
                get().fetchInitialSignalCycles(newSymbols),
              ]);
            } catch (err) {
              console.error('Failed to initialize new symbols:', err);
            }

            const newTickerUnsubscribes = new Map(state.tickerUnsubscribes);

            newSymbols.forEach((symbol) => {
              const unsubscribe = subscribeTickerPrice(symbol, (priceData) => {
                get().updatePrice(priceData.symbol, priceData.price, priceData.dailyChange);
                get().update24hStats(priceData.symbol, priceData.highest24h, priceData.lowest24h);
              });
              newTickerUnsubscribes.set(symbol, unsubscribe);
            });

            set({ tickerUnsubscribes: newTickerUnsubscribes });
          }

          ensureSymbolStorePricePolling(get);
          return;
        }

        // Хуучин WebSocket subscription-уудыг цэвэрлэх
        state.tickerUnsubscribes.forEach((unsubscribe) => {
          try {
            unsubscribe();
          } catch (err) {
            console.warn('Error unsubscribing from ticker:', err);
          }
        });
        state.tickerUnsubscribes.clear();

        try {
          // 1. Initial дата татах — fetchInitialPrices эхлээд бүх symbol-ыг map-д
          // seed хийдэг тул нэрлэсэн дараагийн функцууд түүнээс хамааралтай; үлдсэн
          // 5-ыг зэрэгцүүлж ажиллуулна (өмнө нь 6 функц дараалан ажилладаг байсан).
          await get().fetchInitialPrices(symbols);
          await Promise.all([
            get().fetchDailyOpenPrices(symbols),
            get().fetchInitial24hStats(symbols),
            get().fetchInitialTrends(symbols),
            get().fetchInitialVolatilities(symbols),
            get().fetchInitialSignalCycles(symbols),
          ]);

          // 2. Realtime subscription эхлүүлэх (trend_events, volatility_events)
          const channel = supabase
            .channel('symbol_store_global')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'trend_events',
              },
              (payload) => {
                const event = payload.new as any;
                if (
                  event.symbol &&
                  event.barinterval &&
                  event.timeframe &&
                  event.value !== undefined &&
                  event.ts
                ) {
                  const barinterval = event.barinterval === '1m' ? '1m' : '10m';
                  const timeframe = event.timeframe as 'short' | 'long';
                  get().updateTrend(event.symbol, barinterval, timeframe, event.value, event.ts);
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'volatility_events',
              },
              (payload) => {
                const event = payload.new as any;
                if (event.symbol && event.barinterval && event.value !== undefined && event.ts) {
                  const barinterval = event.barinterval === '1m' ? '1m' : '10m';
                  get().updateVolatility(event.symbol, barinterval, event.value);
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'INSERT', // Зөвхөн INSERT event-үүд
                schema: 'public',
                table: 'signal_cycles',
              },
              (payload) => {
                const cycle = payload.new as any;
                if (isBatchUploadRealtimeRow(cycle)) return;

                if (!cycle) {
                  return;
                }

                if (!cycle.id || !cycle.symbol || !cycle.barinterval) {
                  return;
                }

                if (!cycle.entry_price || isNaN(parseFloat(String(cycle.entry_price)))) {
                  return;
                }

                void get().fetchInitialSignalCycles([cycle.symbol]);
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'signal_cycles',
              },
              (payload) => {
                const cycle = payload.new as any;
                if (isBatchUploadRealtimeRow(cycle)) return;
                if (!cycle) {
                  return;
                }

                if (!cycle.id || !cycle.symbol || !cycle.barinterval) {
                  return;
                }

                if (!cycle.entry_price || isNaN(parseFloat(String(cycle.entry_price)))) {
                  return;
                }

                void get().fetchInitialSignalCycles([cycle.symbol]);
              }
            )
            .subscribe();

          // 3. WebSocket-аар real-time үнэ авах
          const tickerUnsubscribes = new Map<string, () => void>();

          symbols.forEach((symbol) => {
            const unsubscribe = subscribeTickerPrice(symbol, (priceData) => {
              // Real-time үнэ шинэчлэх
              get().updatePrice(priceData.symbol, priceData.price, priceData.dailyChange);

              // 24h high/low шинэчлэх
              get().update24hStats(priceData.symbol, priceData.highest24h, priceData.lowest24h);
            });

            tickerUnsubscribes.set(symbol, unsubscribe);
          });

          // 4. Daily open (өдөр бүрийн 00:00 UTC) үнийг авах
          const checkDailyOpenUpdate = () => {
            const now = Date.now();
            const todayUtcStart = getTodayUtcStart();
            const tomorrowUtcStart = todayUtcStart + 24 * 60 * 60 * 1000;
            const msUntilMidnight = tomorrowUtcStart - now;

            const state = get();
            const lastDailyOpenUpdate = (state as any).lastDailyOpenUpdate || 0;
            if (lastDailyOpenUpdate < todayUtcStart) {
              get().fetchDailyOpenPrices(symbols);
              set({ lastDailyOpenUpdate: now } as any);
            }

            // Дараагийн 00:00 UTC хүртэл
            setTimeout(
              () => {
                get().fetchDailyOpenPrices(symbols);
                set({ lastDailyOpenUpdate: Date.now() } as any);
                const dailyOpenCheckInterval = setInterval(
                  () => {
                    const now2 = Date.now();
                    const todayUtcStart2 = getTodayUtcStart();
                    const lastUpdate2 = (get() as any).lastDailyOpenUpdate || 0;
                    if (lastUpdate2 < todayUtcStart2) {
                      get().fetchDailyOpenPrices(symbols);
                      set({ lastDailyOpenUpdate: now2 } as any);
                    }
                  },
                  60 * 60 * 1000
                );

                (get() as any).dailyOpenCheckInterval = dailyOpenCheckInterval;
              },
              Math.max(msUntilMidnight, 1000)
            );
          };

          checkDailyOpenUpdate();

          set({
            initialized: true,
            tickerUnsubscribes,
            channel,
          });
          ensureSymbolStorePricePolling(get);
        } catch (err) {
          console.error('Failed to initialize symbol store:', err);
        }
      });
    symbolStoreInitChain = pending;
    try {
      await pending;
    } finally {
      // 체인이 현재 pending과 동일한 경우에만 초기화하여 메모리 누수 방지
      // (새로운 호출이 이미 큐에 들어있으면 리셋하지 않음)
      if (symbolStoreInitChain === pending) {
        symbolStoreInitChain = Promise.resolve();
      }
    }
  },

  /**
   * Binance API-аас бүх симболын үнийг авах
   */
  fetchBinancePrices: async (symbols: string[]) => {
    const { BINANCE_API } = await import('@/config/api');
    const prices = new Map<string, { price: number; dailyChange: number }>();
    const targetSymbols = new Set(symbols.map((symbol) => symbol.toUpperCase()));

    try {
      const response = await fetch(`${BINANCE_API.REST_FUTURES}/ticker/price`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          data.forEach((row) => {
            const symbol = typeof row?.symbol === 'string' ? row.symbol.toUpperCase() : '';
            if (!targetSymbols.has(symbol)) return;
            const price = parseFloat(String(row.price));
            if (!Number.isFinite(price) || price <= 0) return;
            prices.set(symbol, { price, dailyChange: 0 });
          });

          // 벌크 응답이 정상적으로 왔는데도 빠져 있는 심볼은 Binance 선물에
          // 상장돼 있지 않다는 뜻이다 — 개별 조회를 해봐야 똑같이 실패한다.
          // 표시해 두고 아래 개별 폴백에서 건너뛴다(가격 폴링이 5초마다 도는데,
          // 그때마다 영영 실패할 요청을 심볼당 1건씩 계속 보내고 있었다).
          // 벌크 호출 자체는 계속 하므로 나중에 상장되면 그 즉시 다시 잡힌다.
          for (const symbol of targetSymbols) {
            if (!prices.has(symbol)) binanceUnlistedSymbols.add(symbol);
          }

          if (prices.size === targetSymbols.size) {
            return prices;
          }
        }
      } else if (response.status === 418) {
        console.warn(
          'Rate limited while fetching Binance bulk prices, falling back to per-symbol requests...'
        );
      } else {
        console.warn(
          `Failed to fetch Binance bulk prices: ${response.status}, falling back to per-symbol requests...`
        );
      }
    } catch (err) {
      console.warn('Error fetching Binance bulk prices, falling back to per-symbol requests:', err);
    }

    // 벌크 응답에서 이미 찾은 심볼은 재요청하지 않고, 누락된 심볼만 개별 조회로 채운다
    // (예전에는 벌크 응답이 하나라도 있으면 나머지 누락분을 그냥 버렸다).
    const missingSymbols = symbols.filter(
      (symbol) =>
        !prices.has(symbol.toUpperCase()) && !binanceUnlistedSymbols.has(symbol.toUpperCase())
    );

    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 100;

    for (let i = 0; i < missingSymbols.length; i += BATCH_SIZE) {
      const batch = missingSymbols.slice(i, i + BATCH_SIZE);

      const pricePromises = batch.map(async (symbol) => {
        try {
          const response = await fetch(`${BINANCE_API.REST_FUTURES}/ticker/price?symbol=${symbol}`);
          if (!response.ok) {
            if (response.status === 418) {
              console.warn(`Rate limited for ${symbol}, skipping...`);
            } else {
              console.warn(`Failed to fetch Binance price for ${symbol}: ${response.status}`);
            }
            return null;
          }

          const data = await response.json();
          if (data.price) {
            const price = parseFloat(data.price);
            return { symbol, price, dailyChange: 0 };
          }
          return null;
        } catch (err) {
          console.warn(`Error fetching Binance price for ${symbol}:`, err);
          return null;
        }
      });

      const batchResults = await Promise.all(pricePromises);

      batchResults.forEach((result) => {
        if (result) {
          prices.set(result.symbol, {
            price: result.price,
            dailyChange: result.dailyChange,
          });
        }
      });

      if (i + BATCH_SIZE < missingSymbols.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return prices;
  },

  /**
   * Initial хийх үед Binance-аас үнэ авах
   */
  fetchInitialPrices: async (symbols: string[]) => {
    const binancePrices = await get().fetchBinancePrices(symbols);
    const newSymbols = new Map(get().symbols);

    // Бүх симболуудыг эхлээд store-д нэмэх (үнэ null байж болно)
    symbols.forEach((symbol) => {
      if (!newSymbols.has(symbol)) {
        const priceData = binancePrices.get(symbol);
        newSymbols.set(symbol, {
          realPrice: priceData?.price || null,
          dailyChange: priceData?.dailyChange || 0,
          dailyOpenPrice: null,
          highest24h: priceData?.price || 0,
          lowest24h: priceData?.price || 0,
          priceTs: new Date().toISOString(),
          trendShort1m: null,
          trendLong1m: null,
          trendShort10m: null,
          trendLong10m: null,
          trendTs1m: '',
          trendTs10m: '',
          prevTrendShort1m: null,
          prevTrendLong1m: null,
          prevTrendShort10m: null,
          prevTrendLong10m: null,
          volatility1m: null,
          volatility10m: null,
          volatilityTs1m: '',
          volatilityTs10m: '',
          lastSignalCycle1m: null,
          lastSignalCycle10m: null,
          signalCycleTs1m: '',
          signalCycleTs10m: '',
        });
      }
    });

    // Binance-аас үнэ авсан симболуудыг шинэчлэх
    binancePrices.forEach((data, symbol) => {
      const existing = newSymbols.get(symbol) || {
        realPrice: null,
        dailyChange: 0,
        dailyOpenPrice: null,
        highest24h: data.price,
        lowest24h: data.price,
        priceTs: new Date().toISOString(),
        trendShort1m: null,
        trendLong1m: null,
        trendShort10m: null,
        trendLong10m: null,
        trendTs1m: '',
        trendTs10m: '',
        volatility1m: null,
        volatility10m: null,
        volatilityTs1m: '',
        volatilityTs10m: '',
        lastSignalCycle1m: null,
        lastSignalCycle10m: null,
        signalCycleTs1m: '',
        signalCycleTs10m: '',
      };

      const oldPrice = existing.realPrice;
      const newPrice = data.price;

      // High/low шинэчлэх (real үнэтэй харьцуулж)
      let highest24h = existing.highest24h;
      let lowest24h = existing.lowest24h;

      if (oldPrice !== null) {
        // Одоогийн үнэтэй харьцуулж шинэчлэх
        highest24h = Math.max(existing.highest24h, newPrice);
        lowest24h = Math.min(existing.lowest24h, newPrice);
      } else {
        // Эхний удаа: одоогийн үнэгээр эхлүүлэх
        highest24h = newPrice;
        lowest24h = newPrice;
      }

      newSymbols.set(symbol, {
        ...existing,
        realPrice: newPrice,
        dailyChange: data.dailyChange,
        highest24h,
        lowest24h,
        priceTs: new Date().toISOString(),
      } as SymbolData);

      // Callback-уудыг дуудах
      if (oldPrice !== newPrice) {
        get().changeCallbacks.forEach((callback) => {
          try {
            callback(symbol, {
              realPrice: newPrice,
              dailyChange: data.dailyChange,
              highest24h,
              lowest24h,
              priceTs: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Error in symbol change callback:', err);
          }
        });
      }
    });

    set({ symbols: newSymbols });
  },

  /**
   * Database-аас анх initial хийхэд 24h high/low авах
   */
  fetchInitial24hStats: async (symbols: string[]) => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    // RPC функц ашиглан нэг query-аар бүх симболын 24h high/low авах
    const { data: priceStats24h } = await (supabase.rpc as any)('get_price_stats_24h', {
      p_symbols: symbols,
      p_twenty_four_hours_ago: twentyFourHoursAgo,
    });

    const newSymbols = new Map(get().symbols);

    if (priceStats24h && Array.isArray(priceStats24h)) {
      for (const stat of priceStats24h as Array<{
        symbol: string;
        highest24h: number | string;
        lowest24h: number | string;
      }>) {
        const symbol = stat.symbol;
        const highest = parseFloat(String(stat.highest24h));
        const lowest = parseFloat(String(stat.lowest24h));

        if (symbol && !isNaN(highest) && !isNaN(lowest)) {
          const existing = newSymbols.get(symbol) || {
            realPrice: null,
            dailyChange: 0,
            dailyOpenPrice: null,
            highest24h: highest,
            lowest24h: lowest,
            priceTs: new Date().toISOString(),
            trendShort1m: null,
            trendLong1m: null,
            trendShort10m: null,
            trendLong10m: null,
            trendTs: '',
            volatility1m: null,
            volatility10m: null,
            volatilityTs: '',
            lastSignalCycle1m: null,
            lastSignalCycle10m: null,
            signalCycleTs: '',
          };

          // Одоогийн үнэтэй харьцуулж шинэчлэх
          const currentPrice = existing.realPrice || highest;
          const finalHighest = Math.max(highest, currentPrice);
          const finalLowest = Math.min(lowest, currentPrice);

          newSymbols.set(symbol, {
            ...existing,
            highest24h: finalHighest,
            lowest24h: finalLowest,
          } as SymbolData);
        }
      }
    }

    set({ symbols: newSymbols });
  },

  /**
   * Binance API-аас өнөөдрийн 00:00 UTC-ийн daily candle open үнийг авах
   */
  fetchDailyOpenPrices: async (symbols: string[]) => {
    const { BINANCE_API } = await import('@/config/api');
    const todayUtcStart = getTodayUtcStart();
    const todayUtcStartSeconds = Math.floor(todayUtcStart / 1000);

    // Тухайн UTC өдөрт аль хэдийн татсан симболуудыг дахин татахгүй.
    const cachedPrices = readDailyOpenCache(todayUtcStart);
    const symbolsToFetch = symbols.filter((symbol) => cachedPrices[symbol] == null);

    const openPricePromises = symbolsToFetch.map(async (symbol) => {
      try {
        // Binance Futures klines API ашиглан өнөөдрийн 00:00 UTC-ийн daily candle авах
        const response = await fetch(
          `${BINANCE_API.REST_FUTURES}/klines?symbol=${symbol}&interval=1d&limit=1&startTime=${todayUtcStartSeconds * 1000}`
        );

        if (!response.ok) {
          console.warn(`Failed to fetch daily open price for ${symbol}: ${response.status}`);
          return { symbol, openPrice: null };
        }

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0 && data[0]) {
          const openPrice = parseFloat(data[0][1]);
          if (!isNaN(openPrice) && openPrice > 0) {
            return { symbol, openPrice };
          }
        }

        // Хэрэв өнөөдрийн candle байхгүй бол өмнөх өдрийн close үнийг ашиглах
        const yesterdayResponse = await fetch(
          `${BINANCE_API.REST_FUTURES}/klines?symbol=${symbol}&interval=1d&limit=1`
        );

        if (yesterdayResponse.ok) {
          const yesterdayData = await yesterdayResponse.json();
          if (Array.isArray(yesterdayData) && yesterdayData.length > 0 && yesterdayData[0]) {
            const yesterdayClose = parseFloat(yesterdayData[0][4]);
            if (!isNaN(yesterdayClose) && yesterdayClose > 0) {
              return { symbol, openPrice: yesterdayClose };
            }
          }
        }

        return { symbol, openPrice: null };
      } catch (err) {
        console.warn(`Error fetching daily open price for ${symbol}:`, err);
        return { symbol, openPrice: null };
      }
    });

    const fetched = await Promise.all(openPricePromises);

    // Шинээр татсаныг cache-д нэмж, cache-аас уншсантай нэгтгэнэ.
    const nextCache = { ...cachedPrices };
    for (const result of fetched) {
      if (result.symbol && result.openPrice !== null) nextCache[result.symbol] = result.openPrice;
    }
    if (fetched.length > 0) writeDailyOpenCache(todayUtcStart, nextCache);

    const results = symbols.map((symbol) => ({
      symbol,
      openPrice: nextCache[symbol] ?? null,
    }));

    // fetchInitialPrices가 먼저 심볼을 시딩해 둔다는 전제이므로, 병렬로 실행되는
    // 다른 fetchInitial* 함수들이 그 사이에 쓴 갱신을 덮어쓰지 않도록 병렬 요청이
    // 끝난 뒤 최신 상태를 다시 읽는다(요청 시작 시점 스냅샷을 쓰면 안 된다).
    const newSymbols = new Map(get().symbols);

    results.forEach((result) => {
      if (result.symbol && result.openPrice !== null) {
        const existing = newSymbols.get(result.symbol);
        if (existing) {
          newSymbols.set(result.symbol, {
            ...existing,
            dailyOpenPrice: result.openPrice,
          });

          // Хэрэв realPrice байвал dailyChange-ийг шинэчлэх
          if (existing.realPrice !== null) {
            const calculatedDailyChange =
              ((existing.realPrice - result.openPrice) / result.openPrice) * 100;
            newSymbols.set(result.symbol, {
              ...existing,
              dailyOpenPrice: result.openPrice,
              dailyChange: calculatedDailyChange,
            });
          }
        }
      }
    });

    set({ symbols: newSymbols });
  },

  /**
   * Database-аас анх initial хийхэд хамгийн сүүлийн 2 trend event-ийг авч, сүүлийнх нь одоогийн trend, түүний өмнөх нь prevTrend байна
   */
  fetchInitialTrends: async (symbols: string[]) => {
    // Бүх симболын trend утгуудыг НЭГ хүсэлтээр авах (доторх бүлэг бүр
    // [хамгийн сүүлийн, өмнөх] дараалалтай).
    const trendGroups = await fetchLatestTrendEventRows(symbols);
    const newSymbols = new Map(get().symbols);

    trendGroups.forEach((trendEvents) => {
      if (trendEvents.length > 0) {
        const latestTrend = trendEvents[0]; // Хамгийн сүүлийн trend (одоогийн trend)
        const previousTrend = trendEvents.length > 1 ? trendEvents[1] : null; // Өмнөх trend

        const symbol = latestTrend.symbol;
        const barinterval = latestTrend.barinterval === '1m' ? '1m' : '10m';
        const timeframe = latestTrend.timeframe as 'short' | 'long';
        const currentValue = latestTrend.value;
        const prevValue = previousTrend ? previousTrend.value : null;

        const existing = newSymbols.get(symbol) || {
          realPrice: null,
          dailyChange: 0,
          dailyOpenPrice: null,
          highest24h: 0,
          lowest24h: 0,
          priceTs: '',
          trendShort1m: null,
          trendLong1m: null,
          trendShort10m: null,
          trendLong10m: null,
          trendTs1m: '',
          trendTs10m: '',
          prevTrendShort1m: null,
          prevTrendLong1m: null,
          prevTrendShort10m: null,
          prevTrendLong10m: null,
          volatility1m: null,
          volatility10m: null,
          volatilityTs1m: '',
          volatilityTs10m: '',
          lastSignalCycle1m: null,
          lastSignalCycle10m: null,
          signalCycleTs1m: '',
          signalCycleTs10m: '',
        };

        const updated: Partial<SymbolData> = {};
        const timestamp = latestTrend.ts || new Date().toISOString();

        if (barinterval === '1m') {
          if (timeframe === 'short') {
            updated.trendShort1m = currentValue;
            updated.prevTrendShort1m = prevValue;
            updated.trendShortTs1m = timestamp;
          } else {
            updated.trendLong1m = currentValue;
            updated.prevTrendLong1m = prevValue;
            updated.trendLongTs1m = timestamp;
          }
          updated.trendTs1m = newerTrendTimestamp(existing.trendTs1m, timestamp);
        } else {
          if (timeframe === 'short') {
            updated.trendShort10m = currentValue;
            updated.prevTrendShort10m = prevValue;
            updated.trendShortTs10m = timestamp;
          } else {
            updated.trendLong10m = currentValue;
            updated.prevTrendLong10m = prevValue;
            updated.trendLongTs10m = timestamp;
          }
          updated.trendTs10m = newerTrendTimestamp(existing.trendTs10m, timestamp);
        }

        newSymbols.set(symbol, {
          ...existing,
          ...updated,
        } as SymbolData);
      }
    });

    set({ symbols: newSymbols });
    void get().refreshLastTrendRanges(symbols);
  },

  /**
   * Database-аас анх initial хийхэд volatility утгууд авах
   */
  fetchInitialVolatilities: async (symbols: string[]) => {
    // Бүх симболын volatility утгуудыг НЭГ хүсэлтээр авах
    const volatilityRows = await fetchLatestVolatilityEventRows(symbols);
    const newSymbols = new Map(get().symbols);

    volatilityRows.forEach((row) => {
      const symbol = row.symbol;
      const barinterval = row.barinterval === '1m' ? '1m' : '10m';
      const value = row.value;

      const existing = newSymbols.get(symbol) || {
        realPrice: null,
        dailyChange: 0,
        dailyOpenPrice: null,
        highest24h: 0,
        lowest24h: 0,
        priceTs: '',
        trendShort1m: null,
        trendLong1m: null,
        trendShort10m: null,
        trendLong10m: null,
        trendTs1m: '',
        trendTs10m: '',
        prevTrendShort1m: null,
        prevTrendLong1m: null,
        prevTrendShort10m: null,
        prevTrendLong10m: null,
        volatility1m: null,
        volatility10m: null,
        volatilityTs1m: '',
        volatilityTs10m: '',
        lastSignalCycle1m: null,
        lastSignalCycle10m: null,
        signalCycleTs1m: '',
        signalCycleTs10m: '',
      };

      const updated: Partial<SymbolData> = {};
      const timestamp = row.ts || new Date().toISOString();
      if (barinterval === '1m') {
        updated.volatility1m = value;
        updated.volatilityTs1m = timestamp;
      } else {
        updated.volatility10m = value;
        updated.volatilityTs10m = timestamp;
      }

      newSymbols.set(symbol, {
        ...existing,
        ...updated,
      } as SymbolData);
    });

    set({ symbols: newSymbols });
  },

  /**
   * Database-аас анх initial хийхэд signal cycle утгууд авах
   */
  fetchInitialSignalCycles: async (symbols: string[]) => {
    // Нээлттэй (is_open=true) цикл нь маш цөөн тул симбол тус бүрээр асуухын оронд
    // бүгдийг нь НЭГ хүсэлтээр авч, (symbol, barinterval) тус бүрийн хамгийн эртнийг
    // клиент дээр сонгоно — өмнөх 30 x 2 = 60 хүсэлтийг 1 болгоно.
    const { data: openCycles, error } = await supabase
      .from('signal_cycles')
      .select('*')
      .in('symbol', symbols)
      .eq('is_open', true)
      .order('entry_time', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[symbolStore] Failed to fetch open signal cycles:', error);
      return;
    }

    // entry_time/created_at өсөх дарааллаар ирсэн тул (symbol, barinterval) бүрийн
    // ЭХНИЙ тохиолдол нь хуучин .limit(1)-тэй яг ижил мөр болно.
    const openCyclesByKey = new Map<string, SignalCycle[]>();
    for (const rawCycle of (openCycles ?? []) as any[]) {
      if (!rawCycle?.symbol || !rawCycle?.barinterval) continue;
      const barinterval: TrendBarInterval = rawCycle.barinterval === '1m' ? '1m' : '10m';
      const signalCycle = parseSignalCycleRow(rawCycle, rawCycle.symbol, barinterval);
      if (!signalCycle?.is_open) continue;
      const key = `${signalCycle.symbol}|${barinterval}`;
      const list = openCyclesByKey.get(key) ?? [];
      list.push(signalCycle);
      openCyclesByKey.set(key, list);
    }

    const newSymbols = new Map(get().symbols);

    symbols.forEach((symbol) => {
      (['1m', '10m'] as const).forEach((barinterval) => {
        const key = `${symbol}|${barinterval}`;
        const cycles = sortSignalCycles(openCyclesByKey.get(key) ?? []);
        const existing = newSymbols.get(symbol);
        if (!existing) return;

        const updated: Partial<SymbolData> = {};
        const timestamp =
          cycles.length > 0 ? latestSignalCycleTimestamp(cycles) : new Date().toISOString();
        if (barinterval === '1m') {
          updated.lastSignalCycle1m = cycles[0] ?? null;
          updated.signalCycles1m = cycles;
          updated.signalCycleTs1m = timestamp;
        } else {
          updated.lastSignalCycle10m = cycles[0] ?? null;
          updated.signalCycles10m = cycles;
          updated.signalCycleTs10m = timestamp;
        }

        newSymbols.set(symbol, {
          ...existing,
          ...updated,
        } as SymbolData);
      });
    });

    set({ symbols: newSymbols });
  },

  /**
   * Price шинэчлэх
   */
  updatePrice: (symbol: string, price: number, _dailyChange: number) => {
    const newSymbols = new Map(get().symbols);
    const existing = newSymbols.get(symbol);

    if (existing) {
      const oldPrice = existing.realPrice;
      const highest24h = oldPrice !== null ? Math.max(existing.highest24h, price) : price;
      const lowest24h = oldPrice !== null ? Math.min(existing.lowest24h, price) : price;

      // Өдрийн нээлтийн үнэтэй харьцуулсан өөрчлөлт тооцоолох
      let calculatedDailyChange = 0;
      if (existing.dailyOpenPrice !== null && existing.dailyOpenPrice > 0) {
        calculatedDailyChange = ((price - existing.dailyOpenPrice) / existing.dailyOpenPrice) * 100;
      }

      const nextData = expandLastTrendRangeWithPrice(
        {
          ...existing,
          realPrice: price,
          dailyChange: calculatedDailyChange,
          highest24h,
          lowest24h,
          priceTs: new Date().toISOString(),
        },
        price
      );

      newSymbols.set(symbol, nextData);

      set({ symbols: newSymbols });

      // Callback-уудыг дуудах
      if (oldPrice !== price) {
        get().changeCallbacks.forEach((callback) => {
          try {
            callback(symbol, {
              realPrice: price,
              dailyChange: calculatedDailyChange,
              highest24h,
              lowest24h,
              priceTs: new Date().toISOString(),
            });
          } catch (err) {
            console.error('Error in symbol change callback:', err);
          }
        });
      }
    }
  },

  /**
   * 24h stats шинэчлэх
   */
  update24hStats: (symbol: string, highest24h: number, lowest24h: number) => {
    const newSymbols = new Map(get().symbols);
    const existing = newSymbols.get(symbol);

    if (existing) {
      newSymbols.set(symbol, {
        ...existing,
        highest24h,
        lowest24h,
      });

      set({ symbols: newSymbols });
    }
  },

  /**
   * Trend давхацсан үед тухайн overlap эхэлсэнээс хойших high/low-г symbol store-д хадгалах
   */
  refreshLastTrendRanges: async (symbols: string[], barinterval?: TrendBarInterval) => {
    const intervals: TrendBarInterval[] = barinterval ? [barinterval] : ['1m', '10m'];
    const requests: Array<{ symbol: string; barinterval: TrendBarInterval; startedAtMs: number }> =
      [];
    const currentSymbols = new Map(get().symbols);
    let hasImmediateChange = false;

    for (const symbol of symbols) {
      let data = currentSymbols.get(symbol);
      if (!data) continue;

      for (const interval of intervals) {
        const startedAtMs = getTrendOverlapStartedAtMs(data, interval);

        if (startedAtMs == null) {
          if (hasStoredLastTrendRangeFields(data, interval)) {
            data = clearLastTrendRangeFields(data, interval);
            currentSymbols.set(symbol, data);
            hasImmediateChange = true;
          }
          continue;
        }

        const cachedStartedAtMs = getCachedLastTrendStartedAtMs(data, interval);
        const cachedRange = getLastTrendRangeFromData(data, interval);

        if (cachedRange && cachedStartedAtMs === startedAtMs) {
          continue;
        }

        const fetchKey = makeLastTrendRangeFetchKey(symbol, interval, startedAtMs);
        if (!lastTrendRangeFetches.has(fetchKey)) {
          requests.push({ symbol, barinterval: interval, startedAtMs });
          lastTrendRangeFetches.add(fetchKey);
        }
      }
    }

    if (hasImmediateChange) {
      set({ symbols: currentSymbols });
    }

    if (requests.length === 0) return;

    // Бүх хосын high/low-г нэг хүсэлтээр авах — доорх хос тус бүрийн боловсруулалт
    // (realPrice-аар clamp хийх, store fallback руу унах) хэвээрээ.
    const resolvedRanges = await fetchLastTrendRangesBatch(
      requests.map(({ symbol, startedAtMs }) => ({ symbol, startedAtMs }))
    );

    await Promise.all(
      requests.map(async (request) => {
        try {
          const fetchedRange =
            resolvedRanges.get(makeRangeKey(request.symbol, request.startedAtMs)) ?? null;
          const latestData = get().symbols.get(request.symbol);
          if (!latestData) return;

          const latestStartedAtMs = getTrendOverlapStartedAtMs(latestData, request.barinterval);
          if (latestStartedAtMs !== request.startedAtMs) return;

          const fallbackPrice = latestData.realPrice;
          const storeFallbackRange = getStorePriceRangeFallback(latestData);
          let rangeBase = fetchedRange ?? storeFallbackRange;

          if (!rangeBase) {
            const nextSymbols = new Map(get().symbols);
            const stillLatest = nextSymbols.get(request.symbol);
            if (stillLatest && hasStoredLastTrendRangeFields(stillLatest, request.barinterval)) {
              nextSymbols.set(
                request.symbol,
                clearLastTrendRangeFields(stillLatest, request.barinterval)
              );
              set({ symbols: nextSymbols });
            }
            return;
          }

          let highestBase = rangeBase.highest;
          let lowestBase = rangeBase.lowest;
          let highest = fallbackPrice != null ? Math.max(highestBase, fallbackPrice) : highestBase;
          let lowest = fallbackPrice != null ? Math.min(lowestBase, fallbackPrice) : lowestBase;

          if (highest === lowest && storeFallbackRange) {
            rangeBase = storeFallbackRange;
            highestBase = rangeBase.highest;
            lowestBase = rangeBase.lowest;
            highest = fallbackPrice != null ? Math.max(highestBase, fallbackPrice) : highestBase;
            lowest = fallbackPrice != null ? Math.min(lowestBase, fallbackPrice) : lowestBase;
          }

          if (highest === lowest) {
            const nextSymbols = new Map(get().symbols);
            const stillLatest = nextSymbols.get(request.symbol);
            if (stillLatest && hasStoredLastTrendRangeFields(stillLatest, request.barinterval)) {
              nextSymbols.set(
                request.symbol,
                clearLastTrendRangeFields(stillLatest, request.barinterval)
              );
              set({ symbols: nextSymbols });
            }
            return;
          }

          const range: LastTrendRange = {
            highest,
            lowest,
            startedAt: new Date(request.startedAtMs).toISOString(),
            startedAtMs: request.startedAtMs,
          };

          const nextSymbols = new Map(get().symbols);
          const stillLatest = nextSymbols.get(request.symbol);
          if (!stillLatest) return;

          const nextData = assignLastTrendRangeFields(stillLatest, request.barinterval, range);
          nextSymbols.set(request.symbol, nextData);
          set({ symbols: nextSymbols });

          get().changeCallbacks.forEach((callback) => {
            try {
              callback(
                request.symbol,
                request.barinterval === '1m'
                  ? {
                      highestLastTrend1m: range.highest,
                      lowestLastTrend1m: range.lowest,
                      lastTrendStartedAt1m: range.startedAt,
                    }
                  : {
                      highestLastTrend10m: range.highest,
                      lowestLastTrend10m: range.lowest,
                      lastTrendStartedAt10m: range.startedAt,
                    }
              );
            } catch (err) {
              console.error('Error in symbol change callback:', err);
            }
          });
        } finally {
          lastTrendRangeFetches.delete(
            makeLastTrendRangeFetchKey(request.symbol, request.barinterval, request.startedAtMs)
          );
        }
      })
    );
  },

  /**
   * Trend шинэчлэх (realtime subscription-аар)
   * Өмнөх trend утгыг хадгална
   */
  updateTrend: (
    symbol: string,
    barinterval: '1m' | '10m',
    timeframe: 'short' | 'long',
    value: number,
    timestamp?: string | number | null
  ) => {
    const newSymbols = new Map(get().symbols);
    const existing = newSymbols.get(symbol) || {
      realPrice: null,
      dailyChange: 0,
      highest24h: 0,
      lowest24h: 0,
      priceTs: '',
      trendShort1m: null,
      trendLong1m: null,
      trendShort10m: null,
      trendLong10m: null,
      trendTs1m: '',
      trendTs10m: '',
      prevTrendShort1m: null,
      prevTrendLong1m: null,
      prevTrendShort10m: null,
      prevTrendLong10m: null,
      volatility1m: null,
      volatility10m: null,
      volatilityTs1m: '',
      volatilityTs10m: '',
      lastSignalCycle1m: null,
      lastSignalCycle10m: null,
      signalCycleTs1m: '',
      signalCycleTs10m: '',
    };

    const updated: Partial<SymbolData> = {};
    const trendTimestamp =
      typeof timestamp === 'number'
        ? new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp).toISOString()
        : timestamp || new Date().toISOString();

    // Өмнөх trend утгыг хадгалах (шинэчлэхээс өмнө)
    if (barinterval === '1m') {
      if (timeframe === 'short') {
        updated.prevTrendShort1m = existing.trendShort1m; // Өмнөх утгыг хадгалах
        updated.trendShort1m = value; // Шинэ утга
        updated.trendShortTs1m = trendTimestamp;
      } else {
        updated.prevTrendLong1m = existing.trendLong1m; // Өмнөх утгыг хадгалах
        updated.trendLong1m = value; // Шинэ утга
        updated.trendLongTs1m = trendTimestamp;
      }
      updated.trendTs1m = newerTrendTimestamp(existing.trendTs1m, trendTimestamp);
    } else {
      if (timeframe === 'short') {
        updated.prevTrendShort10m = existing.trendShort10m; // Өмнөх утгыг хадгалах
        updated.trendShort10m = value; // Шинэ утга
        updated.trendShortTs10m = trendTimestamp;
      } else {
        updated.prevTrendLong10m = existing.trendLong10m; // Өмнөх утгыг хадгалах
        updated.trendLong10m = value; // Шинэ утга
        updated.trendLongTs10m = trendTimestamp;
      }
      updated.trendTs10m = newerTrendTimestamp(existing.trendTs10m, trendTimestamp);
    }

    let nextData = {
      ...existing,
      ...updated,
    } as SymbolData;

    if (!hasOverlappedTrend(nextData, barinterval)) {
      nextData = clearLastTrendRangeFields(nextData, barinterval);
    }

    newSymbols.set(symbol, nextData);

    set({ symbols: newSymbols });

    if (hasOverlappedTrend(nextData, barinterval)) {
      void get().refreshLastTrendRanges([symbol], barinterval);
    }

    // Callback-уудыг дуудах
    get().changeCallbacks.forEach((callback) => {
      try {
        callback(symbol, updated);
      } catch (err) {
        console.error('Error in symbol change callback:', err);
      }
    });
  },

  /**
   * Volatility шинэчлэх (realtime subscription-аар)
   */
  updateVolatility: (symbol: string, barinterval: '1m' | '10m', value: number) => {
    const newSymbols = new Map(get().symbols);
    const existing = newSymbols.get(symbol) || {
      realPrice: null,
      dailyChange: 0,
      dailyOpenPrice: null,
      highest24h: 0,
      lowest24h: 0,
      priceTs: '',
      trendShort1m: null,
      trendLong1m: null,
      trendShort10m: null,
      trendLong10m: null,
      trendTs1m: '',
      trendTs10m: '',
      prevTrendShort1m: null,
      prevTrendLong1m: null,
      prevTrendShort10m: null,
      prevTrendLong10m: null,
      volatility1m: null,
      volatility10m: null,
      volatilityTs1m: '',
      volatilityTs10m: '',
      lastSignalCycle1m: null,
      lastSignalCycle10m: null,
      signalCycles1m: [],
      signalCycles10m: [],
      signalCycleTs1m: '',
      signalCycleTs10m: '',
    };

    const updated: Partial<SymbolData> = {};
    const timestamp = new Date().toISOString();
    if (barinterval === '1m') {
      updated.volatility1m = value;
      updated.volatilityTs1m = timestamp;
    } else {
      updated.volatility10m = value;
      updated.volatilityTs10m = timestamp;
    }

    newSymbols.set(symbol, {
      ...existing,
      ...updated,
    } as SymbolData);

    set({ symbols: newSymbols });

    // Callback-уудыг дуудах
    get().changeCallbacks.forEach((callback) => {
      try {
        callback(symbol, updated);
      } catch (err) {
        console.error('Error in symbol change callback:', err);
      }
    });
  },

  /**
   * Signal Cycle шинэчлэх (realtime subscription-аар)
   */
  updateSignalCycle: (symbol: string, barinterval: '1m' | '10m', cycle: any) => {
    const newSymbols = new Map(get().symbols);
    const existing = newSymbols.get(symbol) || {
      realPrice: null,
      dailyChange: 0,
      dailyOpenPrice: null,
      highest24h: 0,
      lowest24h: 0,
      priceTs: '',
      trendShort1m: null,
      trendLong1m: null,
      trendShort10m: null,
      trendLong10m: null,
      trendTs1m: '',
      trendTs10m: '',
      prevTrendShort1m: null,
      prevTrendLong1m: null,
      prevTrendShort10m: null,
      prevTrendLong10m: null,
      volatility1m: null,
      volatility10m: null,
      volatilityTs1m: '',
      volatilityTs10m: '',
      lastSignalCycle1m: null,
      lastSignalCycle10m: null,
      signalCycles1m: [],
      signalCycles10m: [],
      signalCycleTs1m: '',
      signalCycleTs10m: '',
    };

    // Cycle датаг зөв parse хийх
    const signalCycle = parseSignalCycleRow(cycle, symbol, barinterval);
    if (!signalCycle) return;

    const updated: Partial<SymbolData> = {};
    const timestamp = cycle.updated_at || cycle.created_at || new Date().toISOString();
    const currentCycles = signalCyclesForBarinterval(existing, barinterval);
    const nextCycles = sortSignalCycles(
      signalCycle.is_open
        ? [...currentCycles.filter((item) => item.id !== signalCycle.id), signalCycle]
        : currentCycles.filter((item) => item.id !== signalCycle.id)
    );
    if (barinterval === '1m') {
      updated.lastSignalCycle1m = nextCycles[0] ?? null;
      updated.signalCycles1m = nextCycles;
      updated.signalCycleTs1m = timestamp;
    } else {
      updated.lastSignalCycle10m = nextCycles[0] ?? null;
      updated.signalCycles10m = nextCycles;
      updated.signalCycleTs10m = timestamp;
    }

    newSymbols.set(symbol, {
      ...existing,
      ...updated,
    } as SymbolData);

    set({ symbols: newSymbols });

    // Callback-уудыг дуудах
    get().changeCallbacks.forEach((callback) => {
      try {
        callback(symbol, updated);
      } catch (err) {
        console.error('Error in symbol change callback:', err);
      }
    });
  },

  /**
   * Symbol-ийн бүх датаг авах
   */
  getSymbol: (symbol: string) => {
    return get().symbols.get(symbol) || null;
  },

  /**
   * Symbol-ийн үнийг авах
   */
  getPrice: (symbol: string) => {
    const data = get().symbols.get(symbol);
    return data ? data.realPrice : null;
  },

  /**
   * Symbol-ийн өдрийн нээлтийн үнэтэй харьцуулсан өөрчлөлтийг авах
   */
  getDailyChange: (symbol: string) => {
    const data = get().symbols.get(symbol);
    return data ? data.dailyChange : null;
  },

  /**
   * Symbol-ийн сүүлийн 24 цагийн хамгийн өндөр үнийг авах
   */
  getHighest24h: (symbol: string) => {
    const data = get().symbols.get(symbol);
    return data ? data.highest24h : null;
  },

  /**
   * Symbol-ийн сүүлийн 24 цагийн хамгийн бага үнийг авах
   */
  getLowest24h: (symbol: string) => {
    const data = get().symbols.get(symbol);
    return data ? data.lowest24h : null;
  },

  /**
   * Symbol-ийн trend утгыг авах
   */
  getTrend: (symbol: string, barinterval: '1m' | '10m', timeframe: 'short' | 'long') => {
    const data = get().symbols.get(symbol);
    if (!data) return null;

    if (barinterval === '1m') {
      return timeframe === 'short' ? data.trendShort1m : data.trendLong1m;
    } else {
      return timeframe === 'short' ? data.trendShort10m : data.trendLong10m;
    }
  },

  /**
   * Symbol-ийн өмнөх trend утгыг авах
   */
  getPrevTrend: (symbol: string, barinterval: '1m' | '10m', timeframe: 'short' | 'long') => {
    const data = get().symbols.get(symbol);
    if (!data) return null;

    if (barinterval === '1m') {
      return timeframe === 'short' ? data.prevTrendShort1m : data.prevTrendLong1m;
    } else {
      return timeframe === 'short' ? data.prevTrendShort10m : data.prevTrendLong10m;
    }
  },

  /**
   * Symbol-ийн volatility утгыг авах
   */
  getVolatility: (symbol: string, barinterval: '1m' | '10m') => {
    const data = get().symbols.get(symbol);
    if (!data) return null;

    return barinterval === '1m' ? data.volatility1m : data.volatility10m;
  },

  /**
   * Symbol-ийн signal cycle утгыг авах
   */
  getSignalCycle: (symbol: string, barinterval: '1m' | '10m') => {
    const data = get().symbols.get(symbol);
    if (!data) return null;

    return barinterval === '1m' ? data.lastSignalCycle1m : data.lastSignalCycle10m;
  },

  getSignalCycles: (symbol: string, barinterval: '1m' | '10m') => {
    return signalCyclesForBarinterval(get().symbols.get(symbol), barinterval);
  },

  /**
   * Trend давхацсан үеийн high/low range авах
   */
  getLastTrendRange: (symbol: string, barinterval: TrendBarInterval) => {
    return getLastTrendRangeFromData(get().symbols.get(symbol), barinterval);
  },

  /**
   * Symbol өөрчлөлтийн callback бүртгэх
   * @returns unsubscribe function
   */
  onSymbolChange: (callback: SymbolChangeCallback) => {
    const callbacks = get().changeCallbacks;
    callbacks.add(callback);

    // Unsubscribe function буцаана
    return () => {
      callbacks.delete(callback);
    };
  },
}));
