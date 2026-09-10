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

import { useEffect } from 'react';
import { useBinanceChart } from '@/views/Multiplecharts/useBinanceChart';
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
    state: { initialLoading, signalEvents },
    actions: {
      handleTimeframeClick,
      setShowTrendShort,
      setShowTrendLong,
      setShowBollinger,
      forceResize,
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

  useEffect(() => {
    handleTimeframeClick(timeframe);
  }, [timeframe, handleTimeframeClick]);

  // 타일은 그리드 리플로우로 크기가 바뀌므로 컨테이너 리사이즈를 훅에 알린다.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => forceResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, forceResize]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 순서·z-index 모두 Chart1m.tsx와 동일 */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" />
      <div ref={signalSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={mockTradeSvgOverlayRef} className="pointer-events-none absolute inset-0 z-20" />
      <div ref={containerRef} className="absolute inset-0 z-0" />

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
