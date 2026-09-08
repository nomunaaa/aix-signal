import { useEffect, useState, useMemo } from 'react';
import { useCryptoIcons } from '@/contexts/CryptoIconContext';
import { useSignalSections } from '@/hooks/useSignalSections';
import { useSignalCycles } from '@/hooks/useSignalCycles';
import { usePulseStore } from '../stores/pulseStore';
import type { SignalPair } from '@/hooks/useSymbolHistory';
import type { EnhancedSignal } from '@/types/enhanced-signal';
import {
  normalizeTradingCategory,
  tradingCategoryForStrategy,
  TRADING_CATEGORY_TO_STRATEGY,
} from '@/lib/trading-category';
import type {
  Signal,
  ClosedSignal,
  TickerEvent,
  SignalStreamId,
  StrategyId,
} from '../types/pulse.types';
import { formatDuration } from '../utils/formatters';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';

const ALL_SYMBOLS = [
  'ADAUSDT',
  'APTUSDT',
  'ARBUSDT',
  'ATOMUSDT',
  'AVAXUSDT',
  'BCHUSDT',
  'BNBUSDT',
  'BTCUSDT',
  'DOGEUSDT',
  'DOTUSDT',
  'ETHUSDT',
  'FILUSDT',
  'GALAUSDT',
  'INJUSDT',
  'LDOUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'NEARUSDT',
  'OPUSDT',
  'POLUSDT',
  'PYTHUSDT',
  'SANDUSDT',
  'SEIUSDT',
  'SOLUSDT',
  'STXUSDT',
  'SUIUSDT',
  'TONUSDT',
  'UNIUSDT',
  'XRPUSDT',
  'ZECUSDT',
];

type BarInterval = '1m' | '10m';

const STREAM_TO_BAR_INTERVAL: Record<SignalStreamId, BarInterval> = {
  pulse: '1m',
  wave: '10m',
};

// ── v2 반환 인터페이스 ──
export interface UsePulseSignalsReturn {
  signals: Signal[];
  tickerEvents: TickerEvent[];
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  // 하위 호환: 기존 소비자용 확장 필드
  closedSignals: ClosedSignal[];
  closedSignalsTotalCount: number;
  trendProfit: Signal[];
  trendEntry: Signal[];
  neutralSignals: Signal[];
  headlines: Record<string, string | null>;
  totalOpenPositions: number;
  total24hSignals: number;
  lastUpdate: Date;
}

/** EnhancedSignal → Signal 변환 */
function trendToPulseSign(value?: number | null): 1 | -1 | 0 | undefined {
  if (value == null) return undefined;
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function adaptSignal(es: EnhancedSignal): Signal {
  const additionalEntry = es.actions?.find((action) => action.action_type === 'additional_entry');
  const partialExit = es.actions?.find((action) => action.action_type === 'partial_exit');
  const additionalEntryTriggered = additionalEntry?.status === 'triggered';
  const partialExitTriggered = partialExit?.status === 'triggered';

  return {
    id: es.id,
    symbol: es.symbol,
    direction: es.side === 'LONG' ? 'long' : 'short',
    entryPrice: es.entryPrice ?? es.price,
    currentPrice: es.price,
    pnlPercent: es.pnl_pct ?? 0,
    enteredAt: es.entry_time ?? new Date().toISOString(),
    status: 'open',
    signalState: 'LIVE',
    shortTrend: trendToPulseSign(es.trendShort),
    longTrend: trendToPulseSign(es.trendLong),
    entryTrendShort: es.entryTrendShort ?? undefined,
    entryTrendLong: es.entryTrendLong ?? undefined,
    barinterval: es.barinterval === '10m' ? '10m' : '1m',
    tradingCategory: normalizeTradingCategory(es.trading_category),
    actions: es.actions,
    additionalEntryPrice: additionalEntry?.price,
    additionalEntryPending: additionalEntry?.status === 'pending',
    additionalBuyCount: additionalEntryTriggered ? 1 : undefined,
    additionalEntryTime: additionalEntryTriggered
      ? (additionalEntry.triggered_at ?? undefined)
      : undefined,
    partialClosePrice: partialExit?.price,
    partialExitPending: partialExit?.status === 'pending',
    partialExitTime: partialExitTriggered ? (partialExit.triggered_at ?? undefined) : undefined,
    partialExitPercent: es.partialExitPercent,
  };
}

function signalTrendMode(signal: Signal) {
  return resolveSignalTrendModeFromEntryTrends({
    direction: signal.direction,
    shortTrend: signal.entryTrendShort,
    longTrend: signal.entryTrendLong,
  });
}

/** SignalPair → ClosedSignal 변환 */
function pairToClosedSignal(p: SignalPair): ClosedSignal {
  const tradingCategory = normalizeTradingCategory(p.tradingCategory);
  return {
    id: p.id,
    cycle_id: p.cycle_id ?? null,
    symbol: p.symbol,
    direction: p.side === 'long' ? 'long' : 'short',
    entryPrice: p.entryPrice,
    exitPrice: p.exitPrice,
    pnlPercent: p.pnlPct ?? p.grossRoePct ?? 0,
    holdDuration: p.holdTimeSec ? formatDuration(p.holdTimeSec) : '—',
    closedAt: new Date(p.exitTime * 1000).toISOString(),
    enteredAt: new Date(p.entryTime * 1000).toISOString(),
    discountGain: 0,
    lockedAmount: 0,
    hasAdditionalBuy: p.hasAdditionalBuy,
    hasPartialClose: p.hasPartialClose,
    additionalEntryPrice: p.additionalEntryPrice,
    partialExitPrice: p.partialExitPrice,
    partialExitPercent: p.partialExitPercent,
    averageEntryPrice: p.averageEntryPrice,
    strategyId:
      p.strategyId ?? (tradingCategory ? TRADING_CATEGORY_TO_STRATEGY[tradingCategory] : undefined),
    strategyVariants: p.strategyVariants,
    barinterval: p.barinterval,
    tradingCategory,
    holdSeconds: p.holdTimeSec,
    flow: p.flow,
    entryTrendShort: p.entryTrendShort ?? null,
    entryTrendLong: p.entryTrendLong ?? null,
  };
}

/** ClosedSignal → TickerEvent 변환 (최근 청산을 이벤트로) */
function closedToTickerEvent(cs: ClosedSignal): TickerEvent {
  return {
    id: `te-${cs.id}`,
    type: 'exit',
    symbol: cs.symbol,
    direction: cs.direction,
    price: cs.exitPrice,
    timestamp: typeof cs.closedAt === 'string' ? cs.closedAt : cs.closedAt.toISOString(),
    message: `${cs.symbol} ${cs.direction === 'long' ? 'LONG' : 'SHORT'} 청산 ${cs.pnlPercent >= 0 ? '+' : ''}${cs.pnlPercent.toFixed(2)}%`,
  };
}

/** Signal → TickerEvent 변환 (진입 이벤트) */
function signalToTickerEvent(s: Signal): TickerEvent {
  return {
    id: `te-${s.id}`,
    type: 'entry',
    symbol: s.symbol,
    direction: s.direction,
    price: s.entryPrice,
    timestamp: typeof s.enteredAt === 'string' ? s.enteredAt : s.enteredAt.toISOString(),
    message: `${s.symbol} ${s.direction === 'long' ? 'LONG' : 'SHORT'} 진입 $${s.entryPrice.toLocaleString()}`,
  };
}

export function usePulseSignals(
  allowedSymbols: string[] = ALL_SYMBOLS,
  stream: SignalStreamId = 'pulse',
  strategy: StrategyId | null = 'oneshot'
): UsePulseSignalsReturn {
  const { preloadIcons } = useCryptoIcons();
  const { data: sectionsData } = useSignalSections();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const allowedSymbolSet = useMemo(() => new Set(allowedSymbols), [allowedSymbols]);
  const barInterval = STREAM_TO_BAR_INTERVAL[stream];
  const tradingCategory = strategy ? tradingCategoryForStrategy(strategy) : undefined;
  // History 기간을 SQL 하한으로 넘겨 전체 히스토리 다운로드를 막는다.
  const historyPeriod = usePulseStore((state) => state.historyDatePeriod);

  const {
    historyData,
    historyTotalCount,
    loading: historyLoading,
    openSignals: rawOpenSignals,
    openSignalsLoading,
  } = useSignalCycles(barInterval, {
    enabled: allowedSymbols.length > 0,
    symbols: allowedSymbols,
    tradingCategory,
    historyTradingCategory: null,
    historyPeriod,
  });

  // 시그널 변환
  const openSignals = useMemo<Signal[]>(
    () => rawOpenSignals.filter((s) => allowedSymbolSet.has(s.symbol)).map(adaptSignal),
    [allowedSymbolSet, rawOpenSignals]
  );

  const trendProfit = useMemo(
    () => openSignals.filter((s) => signalTrendMode(s) === 'trend' && (s.pnlPercent ?? 0) >= 0),
    [openSignals]
  );

  const trendEntry = useMemo(
    () => openSignals.filter((s) => signalTrendMode(s) === 'trend' && (s.pnlPercent ?? 0) < 0),
    [openSignals]
  );

  const neutralSignals = useMemo(
    () => openSignals.filter((s) => signalTrendMode(s) === 'nonTrend'),
    [openSignals]
  );

  const closedSignals = useMemo<ClosedSignal[]>(
    () => (historyData ?? []).filter((s) => allowedSymbolSet.has(s.symbol)).map(pairToClosedSignal),
    [allowedSymbolSet, historyData]
  );

  // v2: tickerEvents — 최근 이벤트 20건 (진입 + 청산 혼합, 시간순 내림차순)
  const tickerEvents = useMemo<TickerEvent[]>(() => {
    const entryEvents = openSignals.slice(0, 10).map(signalToTickerEvent);
    const exitEvents = closedSignals.slice(0, 10).map(closedToTickerEvent);
    return [...entryEvents, ...exitEvents]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [openSignals, closedSignals]);

  const headlines = sectionsData?.headlines || {
    trendProfit: null,
    trendValid: null,
    ctProfit: null,
    ctValid: null,
  };

  const totalOpenPositions = useMemo(
    () => new Set(openSignals.map((s) => s.symbol)).size,
    [openSignals]
  );

  const total24hSignals = useMemo(() => {
    const oneDayAgo = Date.now() - 86_400_000;
    const openIn24h = openSignals.filter((s) => {
      const t =
        typeof s.enteredAt === 'string' ? new Date(s.enteredAt).getTime() : s.enteredAt.getTime();
      return t >= oneDayAgo;
    }).length;
    const closedIn24h = (historyData ?? []).filter(
      (s) => allowedSymbolSet.has(s.symbol) && s.exitTime * 1000 >= oneDayAgo
    ).length;
    return openIn24h + closedIn24h;
  }, [allowedSymbolSet, openSignals, historyData]);

  // 아이콘 프리로드
  useEffect(() => {
    if (allowedSymbols.length === 0) return;
    preloadIcons(allowedSymbols);
  }, [allowedSymbols, preloadIcons]);

  useEffect(() => {
    setLastUpdate(new Date());
  }, [historyData, rawOpenSignals]);

  return {
    // v2 인터페이스 (Alpha/Beta/Charlie 의존)
    signals: openSignals,
    tickerEvents,
    isLoading: openSignalsLoading || historyLoading,
    isConnected: !openSignalsLoading,
    error: null,
    // 하위 호환 확장 필드
    closedSignals,
    closedSignalsTotalCount: historyTotalCount,
    trendProfit,
    trendEntry,
    neutralSignals,
    headlines,
    totalOpenPositions,
    total24hSignals,
    lastUpdate,
  };
}
