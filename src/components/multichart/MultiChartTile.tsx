'use client';

/**
 * Single-symbol tile for /multichart.
 *
 * Uses the SAME engine as /chart1m — the real `useBinanceChart` hook —
 * rather than a lookalike. That means identical candles, trend bands,
 * trend candle-coloring, Bollinger, and the custom SVG signal arrows
 * with their labels, because it is literally the same code path.
 *
 * Only the surrounding chrome is reduced for a 6-up grid: no toolbar,
 * no OHLC legend row, no mock-trade panel. The per-tile controls that
 * remain map 1:1 onto the hook's own actions/state.
 */

import { useEffect, useRef } from 'react';
import { useBinanceChart } from '@/views/Multiplecharts/useBinanceChart';
import { useMockTrade } from '@/views/Multiplecharts/useMockTrade';
import { useAuth } from '@/contexts/AuthContext';
import { useSharedSimulationInput } from '@/hooks/useSharedSimulationInput';
import { mockMarginFromPct } from '@/lib/mockTradeCapital';
import type { ChartTradingCategoryFilter, ChartTrendMode } from '@/views/Multiplecharts/types';

export const MULTICHART_TF_KEYS = ['2H', '4H', '6H', '5D'] as const;
export type MultichartTfKey = (typeof MULTICHART_TF_KEYS)[number];

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
  const [simulationInput] = useSharedSimulationInput();

  const {
    mockOpen,
    mockPhase,
    mockDirection,
    setMockDirection,
    mockProfitPct,
    remainingPct,
    mockSaving,
    fills,
    handleMockEntry,
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

  const entryMargin = mockMarginFromPct(simulationInput.capitalRatio);

  const onEntry = (direction: 'long' | 'short') => {
    setMockDirection(direction);
    void handleMockEntry(direction, undefined, entryMargin, simulationInput.leverage);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 순서·z-index 모두 Chart1m.tsx와 동일 */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" />
      <div ref={signalSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={mockTradeSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={containerRef} className="absolute inset-0 z-0" />

      <div className="absolute bottom-1 left-1 right-1 z-30 flex items-center gap-1">
        {inPosition ? (
          <>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                mockDirection === 'long'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-rose-500/15 text-rose-400'
              }`}
            >
              {mockDirection === 'long' ? '롱' : '숏'} {remainingPct}%
            </span>
            <span
              className={`rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums ${
                (mockProfitPct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(mockProfitPct ?? 0) >= 0 ? '+' : ''}
              {(mockProfitPct ?? 0).toFixed(2)}%
            </span>
            <button
              type="button"
              disabled={mockSaving}
              onClick={() => void handleCloseAll()}
              className="ml-auto rounded bg-muted/80 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
            >
              전량청산
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!isAuthenticated || mockSaving || !lastPrice}
              onClick={() => onEntry('long')}
              className="rounded bg-emerald-600/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              title={isAuthenticated ? '모의매매 롱 진입' : '로그인 후 이용할 수 있습니다'}
            >
              매수·롱
            </button>
            <button
              type="button"
              disabled={!isAuthenticated || mockSaving || !lastPrice}
              onClick={() => onEntry('short')}
              className="rounded bg-rose-600/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              title={isAuthenticated ? '모의매매 숏 진입' : '로그인 후 이용할 수 있습니다'}
            >
              매도·숏
            </button>
          </>
        )}
      </div>

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
