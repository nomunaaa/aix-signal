import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SignalPair } from '@/hooks/useSymbolHistory';
import type { EnhancedSignal, EntryTrendDirection, Section, Side } from '@/types/enhanced-signal';
import type { SignalAction } from '@/types/signal-action';
import { useSymbolStore } from '@/stores/symbolStore';
import { applyDemoSignalStrategyFields } from '@/mocks/signalStrategyDemo';
import {
  enrichSignalCyclesWithLifecycleActions,
  fetchOpenSignalCyclesWithActions,
} from '@/lib/queries/signals';
import {
  applyTradingCategoryFilter,
  normalizeTradingCategory,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import {
  buildHistoryStrategyVariants,
  calculateOpenSignalPnl,
  historyVariantKeyForStrategy,
} from '@/views/signals/pulse/utils/historyPnl';
import type { StrategyId } from '@/views/signals/pulse/types/pulse.types';
import {
  historyPeriodStartMs,
  type HistoryDatePeriod,
} from '@/views/signals/pulse/utils/historyDateRange';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';
import { isBatchUploadRealtimeRow } from '@/lib/realtime/ingestMode';

type BarInterval = '1m' | '10m';
type PriceSource = NonNullable<EnhancedSignal['priceSource']>;
type CycleRow = Record<string, unknown>;
type SignalEventLite = {
  id?: unknown;
  price?: unknown;
  percentage?: unknown;
  signal_type?: unknown;
};

type UseSignalCyclesOptions = {
  enabled?: boolean;
  symbols?: string[];
  tradingCategory?: TradingCategory;
  historyTradingCategory?: TradingCategory | null;
  openTradingCategory?: TradingCategory | null;
  /**
   * History 기간 필터를 SQL로 밀어넣는다. 지정하지 않으면 기존처럼 전체 기간을
   * 내려받는다('all'과 동일).
   */
  historyPeriod?: HistoryDatePeriod;
};

const HISTORY_PAGE_SIZE = 1000;
const HISTORY_MAX_FETCH_ROWS = 5000;

/**
 * History 페이지가 실제로 소비하는 컬럼만 명시한다 — 예전에는 select('*')로
 * 30개 컬럼을 모두 받았다.
 *
 * 안전한 이유: 원본 행을 읽는 곳은 enrichSignalCyclesWithLifecycleActions와
 * convertCyclesToPairs 둘뿐이고, 후자는 스프레드 없이 필드를 하나씩 골라
 * 새 객체를 만든다. 즉 이 두 함수가 읽지 않는 컬럼은 화면까지 도달할 수 없다.
 *
 * 제외한 5개: created_at, updated_at, entry_event_id, exit_event_id,
 * exit_cycle_id. (symbolStore·Notifications는 각자 별도 쿼리를 쓰므로 영향 없음.)
 * UUID·타임스탬프라 gzip 압축률이 낮아, 컬럼 수 비중(5/30)보다 절감폭이 크다 —
 * 실측 1000행 기준 gzip 155KB -> 95KB.
 */
// 하나의 문자열 리터럴이어야 supabase-js가 컬럼 목록을 파싱해 행 타입을 추론한다
// (배열 .join(',')이나 '+' 연결은 타입이 string으로 넓어져 GenericStringError가 된다).
// prettier-ignore
const HISTORY_CYCLE_COLUMNS = 'id,cycle_id,symbol,side,entry_price,exit_price,entry_time,exit_time,hold_sec,realized_pnl_pct,barinterval,trading_category,strategy_type,flow,is_open,entry_trend_short,entry_trend_long,added_entry_event_id,added_entry_cycle_id,added_entry_price,added_entry_timestamp,partial_exit_event_id,partial_exit_cycle_id,partial_exit_price,partial_exit_timestamp';

const DEFAULT_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'UNIUSDT',
  'ATOMUSDT',
  'ETCUSDT',
  'LTCUSDT',
  'NEARUSDT',
  'ALGOUSDT',
  'APTUSDT',
  'ARBUSDT',
  'OPUSDT',
  'INJUSDT',
  'SUIUSDT',
  'SEIUSDT',
  'STXUSDT',
  'TIAUSDT',
  'WLDUSDT',
  'FETUSDT',
  'RENDERUSDT',
  'GRTUSDT',
  'RNDRUSDT',
];

const VALID_SECTIONS = new Set<Section>(['trend_entry', 'trend_pos', 'ct_entry', 'ct_pos']);

function normalizeSymbols(symbols: string[]): string[] {
  return Array.from(
    new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
  ).sort();
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
  return parsed !== null && parsed > 0 ? parsed : null;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeSide(value: unknown): Side {
  return String(value ?? '').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';
}

function normalizeBarInterval(value: unknown, fallback: BarInterval): BarInterval {
  return value === '1m' || value === '10m' ? value : fallback;
}

function normalizeSection(value: unknown): Section | undefined {
  return VALID_SECTIONS.has(value as Section) ? (value as Section) : undefined;
}

function normalizeStrategyId(value: unknown): StrategyId | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'oneshot' || raw === 'basic') return 'oneshot';
  if (raw === 'deep' || raw === 'dca') return 'deep';
  if (raw === 'safe' || raw === 'partial_exit') return 'safe';
  if (raw === 'full' || raw === 'dca_partial') return 'full';
  return undefined;
}

function strategyIdFromCycle(cycle: CycleRow): StrategyId | undefined {
  const category = normalizeTradingCategory(cycle.trading_category);
  if (category) return TRADING_CATEGORY_TO_STRATEGY[category];
  return normalizeStrategyId(cycle.strategy_type);
}

function cycleMatchesTradingCategory(cycle: CycleRow, tradingCategory?: TradingCategory): boolean {
  if (!tradingCategory) return true;
  return normalizeTradingCategory(cycle.trading_category) === tradingCategory;
}

function flowLabelFromSection(section?: Section): EnhancedSignal['flow'] {
  return section === 'trend_pos' || section === 'ct_pos' ? 'POSITIONING' : 'ENTRY_DISCOUNT';
}

function normalizeIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function hasCycleEventValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function eventFromCycle(
  cycle: CycleRow,
  key: 'added_entry_event' | 'partial_exit_event'
): SignalEventLite | null {
  const event = cycle[key];
  return event && typeof event === 'object' ? (event as SignalEventLite) : null;
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
  cycle: CycleRow,
  eventKey: 'added_entry_event' | 'partial_exit_event',
  actions: SignalAction[],
  actionType: SignalAction['action_type']
): number | null {
  return (
    toPositiveNumber(eventFromCycle(cycle, eventKey)?.price) ??
    triggeredActionPrice(actions, actionType)
  );
}

function lifecyclePercent(cycle: CycleRow, eventKey: 'partial_exit_event'): number | null {
  return toNumber(eventFromCycle(cycle, eventKey)?.percentage);
}

async function enrichClosedCyclesWithLifecycleData(cycles: CycleRow[]): Promise<CycleRow[]> {
  if (cycles.length === 0) return cycles;

  return enrichSignalCyclesWithLifecycleActions(cycles);
}

function calculateTrendAlignment(
  trendLong: number | null,
  trendShort: number | null
): boolean | null {
  if (trendLong === null || trendShort === null) return null;
  const normalizedLong = trendLong > 0 ? 1 : trendLong < 0 ? -1 : 0;
  const normalizedShort = trendShort > 0 ? 1 : trendShort < 0 ? -1 : 0;
  if (normalizedLong === 0 || normalizedShort === 0) return false;
  return normalizedLong === normalizedShort;
}

function normalizeTrendSnapshot(value: unknown): EntryTrendDirection | null {
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

function calculateDirectionalTrendAlignment(
  side: Side,
  trendLong: EntryTrendDirection | null,
  trendShort: EntryTrendDirection | null
): boolean {
  return (
    resolveSignalTrendModeFromEntryTrends({
      direction: side,
      longTrend: trendLong,
      shortTrend: trendShort,
    }) === 'trend'
  );
}

function calculateFlow(isTrendAligned: boolean, pnlPct: number | undefined): Section {
  if (pnlPct === undefined) {
    return isTrendAligned ? 'trend_entry' : 'ct_entry';
  }
  if (isTrendAligned) {
    return pnlPct < 0 ? 'trend_entry' : 'trend_pos';
  }
  return pnlPct < 0 ? 'ct_entry' : 'ct_pos';
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

function priceSnapshotForCycle(
  cycle: CycleRow,
  fallbackBarInterval: BarInterval,
  manualPrice?: number | null,
  manualSource: PriceSource = 'manual'
) {
  const symbol = String(cycle.symbol ?? '').toUpperCase();
  const barinterval = normalizeBarInterval(cycle.barinterval, fallbackBarInterval);
  const store = useSymbolStore.getState();

  const manual = toPositiveNumber(manualPrice);
  const storePrice = toPositiveNumber(store.getPrice(symbol));
  const cyclePrice = toPositiveNumber(cycle.current_price) ?? toPositiveNumber(cycle.price);

  const currentPrice = manual ?? storePrice ?? cyclePrice;
  const priceSource: PriceSource =
    manual !== null
      ? manualSource
      : storePrice !== null
        ? 'symbol_store'
        : cyclePrice !== null
          ? 'cycle'
          : 'unknown';

  return {
    symbol,
    barinterval,
    currentPrice: currentPrice ?? undefined,
    priceSource,
    trendLong: store.getTrend(symbol, barinterval, 'long'),
    trendShort: store.getTrend(symbol, barinterval, 'short'),
  };
}

function convertCycleToSignal(
  cycle: CycleRow,
  fallbackBarInterval: BarInterval,
  manualPrice?: number | null,
  manualSource: PriceSource = 'manual'
): EnhancedSignal {
  const snapshot = priceSnapshotForCycle(cycle, fallbackBarInterval, manualPrice, manualSource);
  const id = String(cycle.id ?? '');
  const side = normalizeSide(cycle.side);
  const entryPrice = toPositiveNumber(cycle.entry_price) ?? undefined;
  const exitPrice = toPositiveNumber(cycle.exit_price) ?? undefined;
  const realizedPnlPct = toNumber(cycle.realized_pnl_pct);
  const entryTime = normalizeIso(cycle.entry_time);
  const exitTime = normalizeIso(cycle.exit_time);
  const actions = Array.isArray(cycle.actions)
    ? mapSignalActionsFromEmbed(cycle.actions)
    : mapSignalActionsFromEmbed(cycle.signal_actions);
  const partialExitPercent = lifecyclePercent(cycle, 'partial_exit_event');

  const isOpen = cycle.is_open !== false && !exitTime;
  const hasLivePrice = snapshot.priceSource === 'symbol_store' || snapshot.priceSource === 'manual';
  const displayPrice = snapshot.currentPrice ?? entryPrice ?? 0;

  let pnlPct: number | undefined;
  if (isOpen && snapshot.currentPrice !== undefined && entryPrice !== undefined) {
    const pnl = calculateOpenSignalPnl({
      direction: side === 'SHORT' ? 'short' : 'long',
      entryPrice,
      currentPrice: snapshot.currentPrice,
      actions,
      partialExitPercent: partialExitPercent ?? undefined,
    });
    pnlPct = pnl.pnlPercent;
  } else if (!isOpen && realizedPnlPct !== null) {
    pnlPct = realizedPnlPct;
  }

  const trendAligned = calculateTrendAlignment(snapshot.trendLong, snapshot.trendShort);
  const entryTrendShort = normalizeTrendSnapshot(cycle.entry_trend_short);
  const entryTrendLong = normalizeTrendSnapshot(cycle.entry_trend_long);
  const entryTrendAligned = calculateDirectionalTrendAlignment(
    side,
    entryTrendLong,
    entryTrendShort
  );
  const calculatedSection = calculateFlow(entryTrendAligned, pnlPct);

  // Entry trend snapshots are stable for the cycle; live trend changes only affect display.
  const section = calculatedSection ?? normalizeSection(cycle.flow);
  const flow = flowLabelFromSection(section);

  let elapsedSec: number | undefined;
  if (entryTime) {
    elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(entryTime).getTime()) / 1000));
  }

  return {
    id,
    symbol: snapshot.symbol,
    side,
    price: displayPrice,
    flow,
    section,
    elapsed_sec: elapsedSec,
    pnl_pct: pnlPct !== undefined ? round2(pnlPct) : undefined,
    entry_rate: pnlPct !== undefined ? round2(-pnlPct) : undefined,
    hasRealtimePrice: hasLivePrice,
    priceSource: snapshot.priceSource,
    trendShort: snapshot.trendShort,
    trendLong: snapshot.trendLong,
    trendAligned,
    entryTrendShort,
    entryTrendLong,
    entryTrendAligned,
    realized_pnl_pct: realizedPnlPct !== null ? round2(realizedPnlPct) : undefined,
    entry_time: entryTime,
    exit_time: exitTime,
    entryPrice,
    exitPrice,
    entryTimestamp: entryTime ? new Date(entryTime).getTime() : undefined,
    exitTimestamp: exitTime ? new Date(exitTime).getTime() : undefined,
    hold_sec: toNumber(cycle.hold_sec) ?? undefined,
    barinterval: snapshot.barinterval,
    strategy_type: cycle.strategy_type as EnhancedSignal['strategy_type'],
    trading_category: normalizeTradingCategory(cycle.trading_category),
    actions,
    partialExitPercent: partialExitPercent ?? undefined,
  };
}

function signalToCycleInput(signal: EnhancedSignal): CycleRow {
  return {
    id: signal.id,
    symbol: signal.symbol,
    side: signal.side,
    entry_price: signal.entryPrice ?? signal.price,
    current_price: signal.hasRealtimePrice ? signal.price : undefined,
    entry_time: signal.entry_time,
    exit_time: signal.exit_time,
    exit_price: signal.exitPrice,
    flow: signal.section,
    entry_trend_short: signal.entryTrendShort,
    entry_trend_long: signal.entryTrendLong,
    realized_pnl_pct: signal.realized_pnl_pct,
    hold_sec: signal.hold_sec,
    barinterval: signal.barinterval,
    strategy_type: signal.strategy_type,
    trading_category: signal.trading_category,
    signal_actions: signal.actions ?? [],
  };
}

function applyStrategyFields(signals: EnhancedSignal[]): EnhancedSignal[] {
  return applyDemoSignalStrategyFields(signals);
}

function mergeOpenSignal(prev: EnhancedSignal[], next: EnhancedSignal): EnhancedSignal[] {
  const [withStrategy] = applyStrategyFields([next]);
  const existing = prev.find((signal) => signal.id === withStrategy.id);
  if (!existing) return [withStrategy, ...prev];

  return prev.map((signal) =>
    signal.id === withStrategy.id
      ? {
          ...withStrategy,
          strategy_type: withStrategy.strategy_type ?? signal.strategy_type,
          trading_category: withStrategy.trading_category ?? signal.trading_category,
          actions:
            withStrategy.actions && withStrategy.actions.length > 0
              ? withStrategy.actions
              : (signal.actions ?? withStrategy.actions),
        }
      : signal
  );
}

function refreshSignalFromStore(
  signal: EnhancedSignal,
  fallbackBarInterval: BarInterval
): EnhancedSignal {
  return convertCycleToSignal(signalToCycleInput(signal), fallbackBarInterval, undefined, 'manual');
}

function makeChannelName(
  barinterval: BarInterval,
  symbolsKey: string,
  categoryKey: string
): string {
  let hash = 0;
  const key = `${symbolsKey}|${categoryKey}`;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `signal_cycles_${barinterval}_${hash.toString(36)}`;
}

export const useSignalCycles = (
  barinterval: BarInterval = '10m',
  options: UseSignalCyclesOptions = {}
) => {
  const enabled = options.enabled ?? true;
  const optionSymbols = options.symbols;
  const tradingCategory = options.tradingCategory;
  const historyTradingCategory =
    options.historyTradingCategory === undefined
      ? tradingCategory
      : (options.historyTradingCategory ?? undefined);
  const openTradingCategory =
    options.openTradingCategory === undefined
      ? tradingCategory
      : (options.openTradingCategory ?? undefined);
  const historyPeriod = options.historyPeriod;
  const categoryKey = `${openTradingCategory ?? 'all'}|${historyTradingCategory ?? 'all'}`;
  const symbols = useMemo(
    () => normalizeSymbols(optionSymbols ?? DEFAULT_SYMBOLS),
    [optionSymbols]
  );
  const symbolsKey = symbols.join(',');
  const symbolSet = useMemo(() => new Set(symbols), [symbolsKey]);
  const [historyData, setHistoryData] = useState<SignalPair[]>([]);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openSignals, setOpenSignals] = useState<EnhancedSignal[]>([]);
  const [openSignalsLoading, setOpenSignalsLoading] = useState(true);
  const symbolStoreFingerprint = useSymbolStore((state) => {
    if (!enabled || symbols.length === 0) return '';
    return symbols
      .map((symbol) => {
        const data = state.symbols.get(symbol);
        if (!data) return `${symbol}:missing`;
        const trendShort = barinterval === '1m' ? data.trendShort1m : data.trendShort10m;
        const trendLong = barinterval === '1m' ? data.trendLong1m : data.trendLong10m;
        return `${symbol}:${data.realPrice ?? ''}:${trendShort ?? ''}:${trendLong ?? ''}`;
      })
      .join('|');
  });

  const convertCyclesToPairs = useCallback(
    (cycles: CycleRow[]): SignalPair[] => {
      return cycles.map((cycle) => {
        const entryTimeIso = normalizeIso(cycle.entry_time) ?? new Date().toISOString();
        const exitTimeIso = normalizeIso(cycle.exit_time) ?? entryTimeIso;
        const entryTime = new Date(entryTimeIso).getTime() / 1000;
        const exitTime = new Date(exitTimeIso).getTime() / 1000;
        const entryPrice = toPositiveNumber(cycle.entry_price) ?? 0;
        const exitPrice = toPositiveNumber(cycle.exit_price) ?? entryPrice;
        const side = normalizeSide(cycle.side);
        const realizedPnlPct = toNumber(cycle.realized_pnl_pct);
        const actions = Array.isArray(cycle.actions)
          ? mapSignalActionsFromEmbed(cycle.actions)
          : mapSignalActionsFromEmbed(cycle.signal_actions);
        const additionalEntryPrice = lifecyclePrice(
          cycle,
          'added_entry_event',
          actions,
          'additional_entry'
        );
        const partialExitPrice = lifecyclePrice(
          cycle,
          'partial_exit_event',
          actions,
          'partial_exit'
        );
        const partialExitPercent = lifecyclePercent(cycle, 'partial_exit_event');
        const direction = side.toLowerCase() as 'long' | 'short';
        const strategyId = strategyIdFromCycle(cycle);
        const strategyVariants = buildHistoryStrategyVariants({
          direction,
          entryPrice,
          exitPrice,
          additionalEntryPrice,
          partialExitPrice,
          partialExitPercent,
        });
        const hasLifecycleAdjustment = additionalEntryPrice !== null || partialExitPrice !== null;
        const strategyVariantKey = historyVariantKeyForStrategy(strategyId ?? 'oneshot');
        const pnlPct = hasLifecycleAdjustment
          ? strategyVariants[strategyVariantKey].pnlPct
          : (realizedPnlPct ?? strategyVariants.basic.pnlPct);
        const averageEntryPrice =
          additionalEntryPrice == null ? undefined : strategyVariants.dca.averageEntryPrice;
        const pnlAmount = strategyVariants[strategyVariantKey].pnlUsd;
        const hasAdditionalBuy =
          hasCycleEventValue(cycle.added_entry_event_id) ||
          hasCycleEventValue(cycle.added_entry_cycle_id) ||
          additionalEntryPrice !== null;
        const hasPartialClose =
          hasCycleEventValue(cycle.partial_exit_event_id) ||
          hasCycleEventValue(cycle.partial_exit_cycle_id) ||
          partialExitPrice !== null;
        const entryTrendShort = normalizeTrendSnapshot(cycle.entry_trend_short);
        const entryTrendLong = normalizeTrendSnapshot(cycle.entry_trend_long);

        return {
          id: String(cycle.id ?? ''),
          cycle_id: typeof cycle.cycle_id === 'string' ? cycle.cycle_id : null,
          symbol: String(cycle.symbol ?? '').toUpperCase(),
          side: direction,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime,
          holdTimeSec: toNumber(cycle.hold_sec) ?? 0,
          grossRoePct: pnlPct,
          pnlPct,
          pnlAmount,
          barinterval: normalizeBarInterval(cycle.barinterval, barinterval),
          tradingCategory: normalizeTradingCategory(cycle.trading_category),
          flow: typeof cycle.flow === 'string' ? cycle.flow : null,
          entryTrendShort,
          entryTrendLong,
          hasAdditionalBuy,
          hasPartialClose,
          additionalEntryPrice: additionalEntryPrice ?? undefined,
          partialExitPrice: partialExitPrice ?? undefined,
          partialExitPercent: partialExitPercent ?? undefined,
          averageEntryPrice,
          strategyId,
          strategyVariants: hasLifecycleAdjustment ? strategyVariants : undefined,
        };
      });
    },
    [barinterval]
  );

  const fetchHistory = useCallback(async () => {
    if (!enabled || symbols.length === 0) {
      setHistoryData([]);
      setHistoryTotalCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 기간 필터를 SQL 하한으로 밀어넣는다 — 예전에는 전체 히스토리(수만 행)를
      // 페이지네이션으로 모두 내려받은 뒤 클라이언트에서 걸러냈다.
      const periodStartMs = historyPeriod ? historyPeriodStartMs(historyPeriod) : null;
      const periodStartIso = periodStartMs != null ? new Date(periodStartMs).toISOString() : null;

      const buildHistoryCountQuery = () => {
        let query = supabase
          .from('signal_cycles')
          .select('id', { count: 'exact', head: true })
          .eq('is_open', false)
          .eq('barinterval', barinterval)
          .in('symbol', symbols);

        if (periodStartIso) query = query.gte('exit_time', periodStartIso);

        return applyTradingCategoryFilter(query, historyTradingCategory);
      };

      const buildHistoryPageQuery = (from: number, limit: number) => {
        let query = supabase
          .from('signal_cycles')
          .select(HISTORY_CYCLE_COLUMNS)
          .eq('is_open', false)
          .eq('barinterval', barinterval)
          .in('symbol', symbols);

        if (periodStartIso) query = query.gte('exit_time', periodStartIso);

        query = query.order('exit_time', { ascending: false }).range(from, from + limit - 1);

        return applyTradingCategoryFilter(query, historyTradingCategory);
      };

      // Keep row hydration capped to avoid all-time request fan-out; count stays separate.
      const allCycles: CycleRow[] = [];
      const countResult = await buildHistoryCountQuery();
      if (countResult.error) {
        console.warn('Signal history count fetch failed:', countResult.error);
      }

      for (let from = 0; from < HISTORY_MAX_FETCH_ROWS; from += HISTORY_PAGE_SIZE) {
        const pageLimit = Math.min(HISTORY_PAGE_SIZE, HISTORY_MAX_FETCH_ROWS - from);
        const page = await buildHistoryPageQuery(from, pageLimit);
        if (page.error) throw page.error;

        const pageRows = (page.data ?? []) as CycleRow[];
        allCycles.push(...pageRows);

        if (pageRows.length < pageLimit) {
          break;
        }
      }

      const enrichedCycles = await enrichClosedCyclesWithLifecycleData(allCycles);
      setHistoryData(convertCyclesToPairs(enrichedCycles));
      setHistoryTotalCount(countResult.count ?? allCycles.length);
    } catch (error) {
      console.error('Signal history fetch failed:', error);
      setHistoryData([]);
      setHistoryTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [
    barinterval,
    convertCyclesToPairs,
    enabled,
    historyPeriod,
    historyTradingCategory,
    symbolsKey,
  ]);

  const fetchOpenSignals = useCallback(async () => {
    if (!enabled || symbols.length === 0) {
      setOpenSignals([]);
      setOpenSignalsLoading(false);
      return;
    }

    try {
      setOpenSignalsLoading(true);
      await useSymbolStore.getState().initialize(symbols);

      const { data: cycles, error } = await fetchOpenSignalCyclesWithActions(barinterval, {
        symbols,
        tradingCategory: openTradingCategory,
      });
      if (error) throw error;

      const signals = ((cycles ?? []) as CycleRow[]).map((cycle) =>
        convertCycleToSignal(cycle, barinterval, undefined, 'manual')
      );
      setOpenSignals(applyStrategyFields(signals));
    } catch (error) {
      console.error('Open signals fetch failed:', error);
      setOpenSignals([]);
    } finally {
      setOpenSignalsLoading(false);
    }
  }, [barinterval, enabled, openTradingCategory, symbolsKey]);

  const updatePrices = useCallback(
    (prices: Record<string, number>) => {
      setOpenSignals((prev) => {
        const updated = prev.map((signal) => {
          const manualPrice = toPositiveNumber(prices[signal.symbol]);
          if (manualPrice === null) return signal;
          return convertCycleToSignal(
            signalToCycleInput(signal),
            barinterval,
            manualPrice,
            'manual'
          );
        });
        return applyStrategyFields(updated);
      });
    },
    [barinterval]
  );

  useEffect(() => {
    setHistoryData([]);
    setHistoryTotalCount(0);
    setOpenSignals([]);
    setLoading(Boolean(enabled && symbols.length > 0));
    setOpenSignalsLoading(Boolean(enabled && symbols.length > 0));
  }, [barinterval, categoryKey, enabled, symbols.length, symbolsKey]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;
    void useSymbolStore.getState().initialize(symbols);
  }, [enabled, symbolsKey]);

  useEffect(() => {
    if (!enabled || symbols.length === 0 || !symbolStoreFingerprint) return;

    setOpenSignals((prev) => {
      if (prev.length === 0) return prev;
      let changed = false;
      const updated = prev.map((signal) => {
        if (!symbolSet.has(signal.symbol)) return signal;
        const next = refreshSignalFromStore(signal, barinterval);
        if (
          next.price !== signal.price ||
          next.pnl_pct !== signal.pnl_pct ||
          next.entry_rate !== signal.entry_rate ||
          next.section !== signal.section ||
          next.trendShort !== signal.trendShort ||
          next.trendLong !== signal.trendLong ||
          next.priceSource !== signal.priceSource
        ) {
          changed = true;
        }
        return next;
      });
      return changed ? applyStrategyFields(updated) : prev;
    });
  }, [barinterval, enabled, symbolSet, symbols.length, symbolStoreFingerprint]);

  useEffect(() => {
    void fetchHistory();
    void fetchOpenSignals();
  }, [fetchHistory, fetchOpenSignals]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    const channel = supabase
      .channel(makeChannelName(barinterval, symbolsKey, categoryKey))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signal_cycles',
          filter: 'is_open=eq.true',
        },
        async (payload) => {
          const cycle = payload.new as CycleRow;
          if (isBatchUploadRealtimeRow(cycle)) return;
          const symbol = String(cycle.symbol ?? '').toUpperCase();
          if (!symbolSet.has(symbol)) return;
          if (normalizeBarInterval(cycle.barinterval, barinterval) !== barinterval) return;
          if (!cycleMatchesTradingCategory(cycle, openTradingCategory)) return;

          const [enrichedCycle] = await enrichSignalCyclesWithLifecycleActions([cycle]);
          setOpenSignals((prev) =>
            mergeOpenSignal(
              prev,
              convertCycleToSignal(enrichedCycle ?? cycle, barinterval, undefined, 'manual')
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'signal_cycles',
        },
        async (payload) => {
          const cycle = payload.new as CycleRow;
          if (isBatchUploadRealtimeRow(cycle)) return;
          const symbol = String(cycle.symbol ?? '').toUpperCase();
          if (!symbolSet.has(symbol)) return;
          if (normalizeBarInterval(cycle.barinterval, barinterval) !== barinterval) return;
          const matchesOpenCategory = cycleMatchesTradingCategory(cycle, openTradingCategory);
          const matchesHistoryCategory = cycleMatchesTradingCategory(cycle, historyTradingCategory);

          if (!matchesOpenCategory) {
            setOpenSignals((prev) => prev.filter((signal) => signal.id !== String(cycle.id ?? '')));
          }

          if (cycle.is_open === false) {
            setOpenSignals((prev) => prev.filter((signal) => signal.id !== String(cycle.id ?? '')));
            if (!matchesHistoryCategory) return;

            const [enrichedCycle] = await enrichSignalCyclesWithLifecycleActions([cycle]);
            const updatedPair = convertCyclesToPairs([enrichedCycle ?? cycle])[0];
            if (!updatedPair) return;
            setHistoryData((prev) => {
              const merged = prev.some((pair) => pair.id === updatedPair.id)
                ? prev.map((pair) => (pair.id === updatedPair.id ? updatedPair : pair))
                : [updatedPair, ...prev];
              return merged.sort((a, b) => b.exitTime - a.exitTime);
            });
            return;
          }

          if (cycle.is_open === true && matchesOpenCategory) {
            const [enrichedCycle] = await enrichSignalCyclesWithLifecycleActions([cycle]);
            setOpenSignals((prev) =>
              mergeOpenSignal(
                prev,
                convertCycleToSignal(enrichedCycle ?? cycle, barinterval, undefined, 'manual')
              )
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[useSignalCycles] realtime subscription failed:', status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    barinterval,
    categoryKey,
    convertCyclesToPairs,
    enabled,
    historyTradingCategory,
    openTradingCategory,
    symbolSet,
    symbolsKey,
  ]);

  return {
    historyData,
    historyTotalCount,
    loading,
    refetch: fetchHistory,
    openSignals,
    openSignalsLoading,
    refetchOpenSignals: fetchOpenSignals,
    updatePrices,
  };
};
