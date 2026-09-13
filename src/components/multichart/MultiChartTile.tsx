'use client';

/**
 * Single-symbol tile for /multichart.
 *
 * Uses the SAME engine as /chart1m — the real `useBinanceChart` hook —
 * rather than a lookalike. That means identical candles, trend bands,
 * trend candle-coloring, Bollinger, and the custom SVG signal arrows
 * with their labels, because it is literally the same code path.
 *
 * Mock trading itself is NOT done here — the tile only owns useMockTrade
 * (needed to draw its own entry/exit arrows via setMockTradeOverlay) and
 * reports a snapshot + action handles up to MultiChartGrid, which renders
 * one shared sidebar (matching /chart1m) for whichever tile is selected.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useBinanceChart } from '@/views/Multiplecharts/useBinanceChart';
import { useMockTrade } from '@/views/Multiplecharts/useMockTrade';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { ChartTradingCategoryFilter, ChartTrendMode } from '@/views/Multiplecharts/types';

export const MULTICHART_TF_KEYS = ['2H', '4H', '6H', '5D'] as const;
export type MultichartTfKey = (typeof MULTICHART_TF_KEYS)[number];

export interface MultiChartMockSnapshot {
  symbol: string;
  isAuthenticated: boolean;
  lastPrice: number | null;
  mockOpen: boolean;
  mockPhase: 'entry' | 'exit';
  mockDirection: 'long' | 'short';
  mockEntryPrice: number | null;
  mockExitReferencePrice: number | null;
  mockExitLocked: boolean;
  mockProfitPct: number | null;
  remainingPct: number;
  realizedPnlUsd: number;
  mockSaving: boolean;
  latestSignal: { direction: 'long' | 'short' | null; price: number | null; confidence: number | null };
}

export interface MultiChartMockActions {
  enter: (direction: 'long' | 'short', marginUsd: number, leverage: number) => void;
  addEntry: () => void;
  partialClose: (pct: number) => void;
  closeAll: () => void;
}

interface MultiChartTileProps {
  symbol: string;
  /** '1m' | '10m' — the two bar intervals the signal/trend tables are keyed to. */
  barInterval: string;
  timeframe: MultichartTfKey;
  showTrendShort: boolean;
  showTrendLong: boolean;
  showBollinger: boolean;
  tradingCategoryFilter: ChartTradingCategoryFilter;
  trendModesFilter: ChartTrendMode[];
  selected: boolean;
  onSelect: () => void;
  onMockStateChange: (snapshot: MultiChartMockSnapshot) => void;
  registerMockActions: (actions: MultiChartMockActions) => void;
}

export function MultiChartTile({
  symbol,
  barInterval,
  timeframe,
  showTrendShort,
  showTrendLong,
  showBollinger,
  tradingCategoryFilter,
  trendModesFilter,
  selected,
  onSelect,
  onMockStateChange,
  registerMockActions,
}: MultiChartTileProps) {
  const {
    refs: { containerRef, overlayRef, signalSvgOverlayRef, mockTradeSvgOverlayRef },
    state: { initialLoading, signalEvents, lastPrice, lastCandleTime },
    actions: {
      handleTimeframeClick,
      setShowTrendShort,
      setShowTrendLong,
      setShowBollinger,
      forceResize,
      setMockTradeOverlay,
      clearMockTradeOverlay,
    },
  } = useBinanceChart(symbol, barInterval, {
    tradingCategoryFilter,
    trendModesFilter,
  });

  // 그리드 상단 컨트롤 → 훅 내부 상태로 반영 (차트 페이지의 체크박스와 동일 경로).
  useEffect(() => {
    setShowTrendShort(showTrendShort);
  }, [showTrendShort, setShowTrendShort]);

  useEffect(() => {
    setShowTrendLong(showTrendLong);
  }, [showTrendLong, setShowTrendLong]);

  useEffect(() => {
    setShowBollinger(showBollinger);
  }, [showBollinger, setShowBollinger]);

  /**
   * handleTimeframeClick / forceResize는 훅에서 useCallback으로 감싸여 있지 않아
   * 렌더마다 새 함수가 된다. 이걸 그대로 deps에 넣으면 매 렌더마다 다시 실행돼
   * applyTimeframe이 보이는 구간을 계속 리셋한다 — 드래그로 차트를 못 옮기던 원인.
   * 최신 함수는 ref로 들고, 실행은 값이 실제로 바뀔 때만 한다.
   */
  const handleTimeframeClickRef = useRef(handleTimeframeClick);
  handleTimeframeClickRef.current = handleTimeframeClick;
  const forceResizeRef = useRef(forceResize);
  forceResizeRef.current = forceResize;

  // 훅 기본값이 '6H'라 초기값과 같으면 마운트 시에는 건드리지 않는다.
  const appliedTfRef = useRef<MultichartTfKey>(timeframe);
  useEffect(() => {
    if (appliedTfRef.current === timeframe) return;
    appliedTfRef.current = timeframe;
    handleTimeframeClickRef.current(timeframe);
  }, [timeframe]);

  // 타일은 그리드 리플로우로 크기가 바뀌므로 컨테이너 리사이즈를 훅에 알린다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => forceResizeRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const { isAuthenticated } = useAuth();

  const {
    mockOpen,
    mockPhase,
    mockDirection,
    setMockDirection,
    mockEntryPrice,
    mockExitLocked,
    mockExitReferencePrice,
    mockProfitPct,
    remainingPct,
    realizedPnlUsd,
    mockSaving,
    fills,
    handleMockEntry,
    handleAddEntry,
    handlePartialClose,
    handleMockExit,
    handleCloseAll,
  } = useMockTrade({ symbol, lastPrice, lastCandleTime, isAuthenticated, barInterval });

  const inPosition = mockOpen && mockPhase !== 'entry' && remainingPct > 0;

  // 진입/청산 체결점 오버레이 — fills는 이미 MockTradeFillPoint[]라 그대로 넘긴다 (Chart1m과 동일).
  useEffect(() => {
    if (mockPhase === 'entry' || fills.length === 0) {
      clearMockTradeOverlay();
      return;
    }
    setMockTradeOverlay({ fills, direction: mockDirection });
  }, [mockPhase, fills, mockDirection, setMockTradeOverlay, clearMockTradeOverlay]);

  /** 이 종목의 가장 최근 진입 시그널 — Chart1m의 latestSignal과 동일 로직. */
  const latestSignal = useMemo(() => {
    const entries = (signalEvents ?? []).filter(
      (ev) => String(ev.signal_type).toLowerCase() === 'entry'
    );
    const latest = entries.reduce<(typeof entries)[number] | null>(
      (acc, ev) => (!acc || Number(ev.timestamp_ms) > Number(acc.timestamp_ms) ? ev : acc),
      null
    );
    if (!latest) return { direction: null, price: null, confidence: null };
    return {
      direction:
        String(latest.direction).toLowerCase() === 'short' ? ('short' as const) : ('long' as const),
      price: Number(latest.price) || null,
      confidence: latest.trend_confidence != null ? Number(latest.trend_confidence) : null,
    };
  }, [signalEvents]);

  // 스냅샷은 부모(MultiChartGrid)의 사이드바 렌더링용 — 값이 바뀔 때만 올려보낸다.
  useEffect(() => {
    onMockStateChange({
      symbol,
      isAuthenticated,
      lastPrice,
      mockOpen,
      mockPhase,
      mockDirection,
      mockEntryPrice,
      mockExitReferencePrice,
      mockExitLocked,
      mockProfitPct,
      remainingPct,
      realizedPnlUsd,
      mockSaving,
      latestSignal,
    });
  }, [
    symbol,
    isAuthenticated,
    lastPrice,
    mockOpen,
    mockPhase,
    mockDirection,
    mockEntryPrice,
    mockExitReferencePrice,
    mockExitLocked,
    mockProfitPct,
    remainingPct,
    realizedPnlUsd,
    mockSaving,
    latestSignal,
  ]);

  // 액션 핸들은 매 렌더 최신값으로 갱신 — ref 등록이라 리렌더를 유발하지 않는다.
  registerMockActions({
    enter: (direction, marginUsd, leverage) => {
      setMockDirection(direction);
      void handleMockEntry(direction, undefined, marginUsd, leverage);
    },
    addEntry: () => void handleAddEntry(),
    partialClose: (pct) => void handlePartialClose(pct),
    closeAll: () => void (mockPhase === 'exit' && !mockExitLocked ? handleMockExit() : handleCloseAll()),
  });

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative h-full w-full cursor-pointer overflow-hidden rounded-lg ring-2 ring-transparent transition-shadow',
        selected && 'ring-primary'
      )}
    >
      {/* 순서·z-index 모두 Chart1m.tsx와 동일 */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" />
      <div ref={signalSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={mockTradeSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {inPosition ? (
        <div className="pointer-events-none absolute bottom-1 left-1 z-30 flex items-center gap-1">
          <span
            className={cn(
              'rounded px-1.5 py-0.5 text-[10px] font-semibold',
              mockDirection === 'long'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            )}
          >
            {mockDirection === 'long' ? '롱' : '숏'} {remainingPct}%
          </span>
          <span
            className={cn(
              'rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums',
              (mockProfitPct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {(mockProfitPct ?? 0) >= 0 ? '+' : ''}
            {(mockProfitPct ?? 0).toFixed(2)}%
          </span>
        </div>
      ) : null}

      {initialLoading ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/60 text-[11px] text-muted-foreground">
          불러오는 중…
        </div>
      ) : (
        <div className="pointer-events-none absolute left-1 top-1 z-30 rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {signalEvents.length > 0 ? `시그널 ${signalEvents.length}` : '시그널 없음'}
        </div>
      )}
    </div>
  );
}
