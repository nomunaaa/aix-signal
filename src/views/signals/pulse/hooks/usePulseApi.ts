/**
 * Fetches PULSE signals from API (MSW mock: GET /api/signals/pulse).
 * Returns { as_of, strategy_id, signals[] } normalized to openSignals + closedSignals.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import type { PulseApiResponse, PulseApiSignal } from '@/types/signal';
import { normalizeTradingCategory, tradingCategoryForStrategy } from '@/lib/trading-category';
import type {
  Signal,
  ClosedSignal,
  StrategyId,
  SignalStreamId,
  SignalCycleUiState,
  EntryTrendDirection,
} from '../types/pulse.types';

type PulseApiError = Error & { status?: number };
type PulseBarInterval = '1m' | '10m';

const ALL_STRATEGY_IDS: readonly StrategyId[] = ['oneshot', 'deep', 'safe', 'full'];

const STREAM_TO_BAR_INTERVAL: Record<SignalStreamId, PulseBarInterval> = {
  pulse: '1m',
  wave: '10m',
};

function toBool(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function numberFromUnknown(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function isPulseApiEnabled(): boolean {
  const hasConfiguredBase = Boolean(
    process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE
  );
  return (
    hasConfiguredBase &&
    (toBool(process.env.NEXT_PUBLIC_USE_REAL_PULSE_API) || process.env.NODE_ENV === 'production')
  );
}

/**
 * DEV에서는 기본적으로 빈 베이스(현재 오리진 `/api/...`)로 요청해 MSW가 가로챌 수 있게 함.
 * `.env`에 `VITE_API_BASE_URL`이 있어도 로컬 목을 쓰려면 그대로 두면 됨.
 * 실제 스테이징/프로덕션 API를 DEV에서 직접 칠 때만 `VITE_USE_REAL_PULSE_API=true` 설정.
 */
function pulseApiBase(): string {
  if (process.env.NODE_ENV !== 'production') {
    if (process.env.NEXT_PUBLIC_USE_REAL_PULSE_API === 'true') {
      return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '';
    }
    return '';
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE || '';
}

function mapTrend(v: unknown): 1 | -1 | 0 | undefined {
  if (v === 1 || v === -1 || v === 0) return v as 1 | -1 | 0;
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v > 0) return 1;
    if (v < 0) return -1;
    return 0;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const normalized = v.trim().toLowerCase();
    if (normalized === 'up') return 1;
    if (normalized === 'down') return -1;
    if (normalized === 'neutral') return 0;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return mapTrend(parsed);
  }
  return undefined;
}

function mapEntryTrendDirection(v: unknown): EntryTrendDirection | undefined {
  if (typeof v === 'string' && v.trim() !== '') {
    const normalized = v.trim().toUpperCase();
    if (normalized === 'UP' || normalized === 'LONG') return 'UP';
    if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
    if (normalized === 'NEUTRAL' || normalized === 'NONE' || normalized === '0') return 'NEUTRAL';
  }

  const parsed = Number(v);
  if (!Number.isFinite(parsed)) return undefined;
  if (parsed > 0) return 'UP';
  if (parsed < 0) return 'DOWN';
  return 'NEUTRAL';
}

function entryTrendFromApiSection(
  section: Signal['section'],
  direction: Signal['direction']
): { short?: EntryTrendDirection; long?: EntryTrendDirection } {
  if (section === 'TREND_DISCOUNT' || section === 'TREND_TP') {
    const expected = direction === 'long' ? 'UP' : 'DOWN';
    return { short: expected, long: expected };
  }
  if (section === 'NON_TREND_LONG' || section === 'NON_TREND_SHORT') {
    return { short: 'NEUTRAL', long: direction === 'long' ? 'UP' : 'DOWN' };
  }
  if (section === 'REVERSAL') {
    return { short: 'UP', long: 'DOWN' };
  }
  return {};
}

function quoteVolume24hFromFields(
  fields: PulseApiSignal['section_fields'],
  symbol: string
): number | undefined {
  const q = fields?.quote_volume_24h;
  if (typeof q === 'number' && Number.isFinite(q)) return q;
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h % 900_000) + 120_000;
}

function resolveSignalStateFromApi(
  api: PulseApiSignal,
  section: Signal['section']
): SignalCycleUiState {
  const fromRoot = (api as PulseApiSignal & { signal_state?: string }).signal_state;
  const fromFields = (api.section_fields as { signal_state?: string } | undefined)?.signal_state;
  const raw = fromRoot ?? fromFields;
  if (raw === 'LIVE' || raw === 'WAIT') return raw;
  if (section === 'WAITING_ENTRY') return 'WAIT';
  return 'LIVE';
}

function volatilityPctFromFields(fields: PulseApiSignal['section_fields']): number | undefined {
  const f = fields as Record<string, unknown>;
  if (typeof f.price_change_pct_24h === 'number' && Number.isFinite(f.price_change_pct_24h)) {
    return f.price_change_pct_24h;
  }
  const hi = f.high_24h as number | undefined;
  const lo = f.low_24h as number | undefined;
  if (hi == null || lo == null || hi <= lo) return undefined;
  const mid = (hi + lo) / 2;
  if (mid <= 0) return undefined;
  return ((hi - lo) / mid) * 100;
}

function flowFromApiSignal(
  api: PulseApiSignal,
  fields: PulseApiSignal['section_fields']
): string | null {
  const rootFlow = (api as PulseApiSignal & { flow?: string | null }).flow;
  const flow = fields?.flow ?? rootFlow ?? null;
  if (typeof flow !== 'string') return null;
  const trimmed = flow.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cycleIdFromApiSignal(
  api: PulseApiSignal,
  fields: PulseApiSignal['section_fields']
): string | null {
  const cycleId = fields?.cycle_id ?? api.cycle_id ?? null;
  if (typeof cycleId !== 'string') return null;
  const trimmed = cycleId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function closedHasAdditionalBuy(fields: PulseApiSignal['section_fields']): boolean {
  return (
    (typeof fields?.additional_buy_count === 'number' && fields.additional_buy_count > 0) ||
    (typeof fields?.additional_entry_time === 'string' &&
      fields.additional_entry_time.trim().length > 0) ||
    (typeof fields?.additional_entry_price === 'number' &&
      Number.isFinite(fields.additional_entry_price))
  );
}

function closedHasPartialClose(fields: PulseApiSignal['section_fields']): boolean {
  return (
    (typeof fields?.partial_exit_time === 'string' && fields.partial_exit_time.trim().length > 0) ||
    (typeof fields?.locked_amount === 'number' && fields.locked_amount > 0) ||
    (typeof fields?.locked_profit_amount === 'number' && fields.locked_profit_amount > 0) ||
    (typeof fields?.partial_close_price === 'number' && Number.isFinite(fields.partial_close_price))
  );
}

function normalizeSignal(api: PulseApiSignal): Signal | ClosedSignal {
  const section = api.section as Signal['section'];
  const fields = api.section_fields ?? {};
  const apiRecord = api as PulseApiSignal & Record<string, unknown>;
  const fieldRecord = fields as Record<string, unknown>;
  const partialExitPercent =
    numberFromUnknown(fieldRecord.partial_exit_percent) ??
    numberFromUnknown(fieldRecord.partial_exit_percentage) ??
    numberFromUnknown(fieldRecord.partial_exit_pct);

  const base = {
    id: api.cycle_id,
    symbol: api.symbol,
    direction: api.direction,
    entryPrice: api.entry_price,
    pnlPercent: api.profit_rate,
    enteredAt: api.entry_time,
    section,
    barinterval: api.barinterval,
    tradingCategory: normalizeTradingCategory(api.trading_category),
    extraSignal: (api as PulseApiSignal & { extra_signal?: string | null }).extra_signal ?? null,
    remainingTime:
      (api as PulseApiSignal & { remaining_time?: number }).remaining_time ?? fields.countdown_sec,
    discountPrice: fields.discount_price,
    discountRate: fields.discount_rate,
    additionalEntryPrice: fields.additional_entry_price,
    additionalDiscountAmount: fields.additional_discount_amount,
    discountGainPercent: fields.discount_gain_percent,
    partialClosePrice: fields.partial_close_price,
    partialExitPercent,
    lockedProfitAmount: fields.locked_profit_amount,
    lockedProfitPercent: fields.locked_profit_percent,
    nontrendDuration: fields.nontrend_duration,
    volatility: fields.volatility,
    pnl1dAmount: fields.pnl_1d_amount,
    pnl1dPercent: fields.pnl_1d_percent,
    pnl7dAmount: fields.pnl_7d_amount,
    pnl7dPercent: fields.pnl_7d_percent,
    lastCloseTime: fields.last_close_time,
    todaySignalCount: fields.today_signal_count,
    avgCycleTime: fields.avg_cycle_time,
    closePrice: fields.close_price,
    investPnlAmount: fields.invest_pnl_amount,
    investPnlPercent: fields.invest_pnl_percent,
    cycleTime: fields.cycle_time,
  };

  const entryTrendShort = mapEntryTrendDirection(
    apiRecord.entry_trend_short ?? fieldRecord.entry_trend_short
  );
  const entryTrendLong = mapEntryTrendDirection(
    apiRecord.entry_trend_long ?? fieldRecord.entry_trend_long
  );

  if (section === 'CLOSED_RECENT') {
    return {
      ...base,
      cycle_id: cycleIdFromApiSignal(api, fields),
      exitPrice: api.current_price,
      holdDuration: fields.hold_duration ?? '—',
      closedAt: api.section_time,
      discountGain: 0,
      lockedAmount: fields.locked_amount ?? 0,
      hasAdditionalBuy: closedHasAdditionalBuy(fields),
      hasPartialClose: closedHasPartialClose(fields),
      flow: flowFromApiSignal(api, fields),
      entryTrendShort: entryTrendShort ?? null,
      entryTrendLong: entryTrendLong ?? null,
    } as ClosedSignal;
  }

  const lockedFromFields =
    typeof fields.locked_profit_amount === 'number' && fields.locked_profit_amount > 0
      ? fields.locked_profit_amount
      : typeof fields.locked_amount === 'number' && fields.locked_amount > 0
        ? fields.locked_amount
        : undefined;
  const entryFallback = entryTrendFromApiSection(section, api.direction);
  const resolvedEntryTrendShort = entryTrendShort ?? entryFallback.short;
  const resolvedEntryTrendLong = entryTrendLong ?? entryFallback.long;

  return {
    ...base,
    currentPrice: api.current_price,
    status: 'open',
    signalState: resolveSignalStateFromApi(api, section),
    sectionTime: api.section_time,
    shortTrend: mapTrend(fields.short_trend),
    longTrend: mapTrend(fields.long_trend),
    entryTrendShort: resolvedEntryTrendShort,
    entryTrendLong: resolvedEntryTrendLong,
    high24h: fields.high_24h,
    low24h: fields.low_24h,
    volatility24hPct: volatilityPctFromFields(fields),
    additionalEntryPending: Boolean(fields.additional_entry_pending),
    partialExitPending: Boolean(fields.partial_exit_pending),
    avgCycleTimeMinutes:
      typeof fields.avg_cycle_time === 'number' ? fields.avg_cycle_time : undefined,
    sparkline24h: Array.isArray(fields.sparkline_24h) ? fields.sparkline_24h : undefined,
    lockedAmount: lockedFromFields,
    averageEntryPrice: fields.average_entry_price,
    additionalBuyCount:
      typeof fields.additional_buy_count === 'number' ? fields.additional_buy_count : undefined,
    additionalEntryTime:
      typeof fields.additional_entry_time === 'string' ? fields.additional_entry_time : undefined,
    partialExitTime:
      typeof fields.partial_exit_time === 'string' ? fields.partial_exit_time : undefined,
    quoteVolume24h: quoteVolume24hFromFields(fields, api.symbol),
  } as Signal;
}

async function fetchPulse(
  strategyId: StrategyId,
  stream: SignalStreamId
): Promise<{
  as_of: string;
  strategy_id: string;
  openSignals: Signal[];
  closedSignals: ClosedSignal[];
}> {
  const strategyMap: Record<StrategyId, string> = {
    oneshot: 'S1',
    safe: 'S2',
    deep: 'S3',
    full: 'S4',
  };
  const strategyParam = strategyMap[strategyId] ?? 'S1';
  const barinterval = STREAM_TO_BAR_INTERVAL[stream];
  const tradingCategory = tradingCategoryForStrategy(strategyId);
  const params = new URLSearchParams({
    strategy: strategyParam,
    scenario: 'basic',
    stream,
    barinterval,
    trading_category: tradingCategory,
  });
  const url = `${pulseApiBase()}/api/signals/pulse?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error(`Pulse API ${res.status}`) as PulseApiError;
    error.status = res.status;
    throw error;
  }
  const data: PulseApiResponse = await res.json();
  const openSignals: Signal[] = [];
  const closedSignals: ClosedSignal[] = [];
  for (const s of data.signals) {
    if (s.barinterval && s.barinterval !== barinterval) continue;
    const responseCategory = normalizeTradingCategory(s.trading_category);
    if (responseCategory && responseCategory !== tradingCategory) continue;
    const norm = normalizeSignal(s);
    if (s.section === 'CLOSED_RECENT') {
      closedSignals.push(norm as ClosedSignal);
    } else {
      openSignals.push(norm as Signal);
    }
  }
  return {
    as_of: data.as_of,
    strategy_id: data.strategy_id,
    openSignals,
    closedSignals,
  };
}

export interface UsePulseApiOptions {
  strategyId: StrategyId;
  stream?: SignalStreamId;
  enabled?: boolean;
}

export function usePulseApi({ strategyId, stream = 'pulse', enabled = true }: UsePulseApiOptions) {
  const apiEnabled = enabled && isPulseApiEnabled();
  const query = useQuery({
    queryKey: ['pulse', 'signals', strategyId, stream],
    queryFn: () => fetchPulse(strategyId, stream),
    enabled: apiEnabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      const status = (error as PulseApiError | undefined)?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(250 * 2 ** attempt, 4000),
  });

  const asOf = query.data?.as_of ? new Date(query.data.as_of) : new Date();
  return {
    openSignals: query.data?.openSignals ?? [],
    closedSignals: query.data?.closedSignals ?? [],
    asOf,
    strategyId: query.data?.strategy_id ?? strategyId,
    isEnabled: apiEnabled,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: apiEnabled ? query.refetch : undefined,
  };
}

export interface UsePulseApiAllCategoriesOptions {
  stream?: SignalStreamId;
  enabled?: boolean;
}

function latestAsOf(results: readonly { data?: { as_of?: string } }[]): Date {
  const latest = Math.max(
    ...results
      .map((result) => {
        const asOf = (result.data as { as_of?: string } | undefined)?.as_of;
        return asOf ? new Date(asOf).getTime() : Number.NaN;
      })
      .filter(Number.isFinite)
  );
  return Number.isFinite(latest) ? new Date(latest) : new Date();
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  return [...new Map(rows.map((row) => [row.id, row])).values()];
}

export function usePulseApiAllCategories({
  stream = 'pulse',
  enabled = true,
}: UsePulseApiAllCategoriesOptions = {}) {
  const apiEnabled = enabled && isPulseApiEnabled();
  const queries = useQueries({
    queries: ALL_STRATEGY_IDS.map((strategyId) => ({
      queryKey: ['pulse', 'signals', strategyId, stream],
      queryFn: () => fetchPulse(strategyId, stream),
      enabled: apiEnabled,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: unknown) => {
        const status = (error as PulseApiError | undefined)?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt: number) => Math.min(250 * 2 ** attempt, 4000),
    })),
  });

  const openSignals = uniqueById(queries.flatMap((query) => query.data?.openSignals ?? []));
  const closedSignals = uniqueById(queries.flatMap((query) => query.data?.closedSignals ?? []));
  const firstError = queries.find((query) => query.error)?.error ?? null;

  return {
    openSignals,
    closedSignals,
    asOf: latestAsOf(queries),
    strategyId: 'all',
    isEnabled: apiEnabled,
    isLoading: apiEnabled && queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    error: firstError,
    refetch: apiEnabled
      ? async () => {
          await Promise.all(queries.map((query) => query.refetch()));
        }
      : undefined,
  };
}
