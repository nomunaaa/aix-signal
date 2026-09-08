/**
 * 종목상세 Zone 2 — useBinanceChart (클라이언트 전용), 가시 범위는 부모 preset과 동기화
 */
import { useEffect, useRef } from 'react';
import { useBinanceChart } from '@/views/Multiplecharts/useBinanceChart';
import {
  SYMBOL_CHART_RANGE_PRESETS,
  type SymbolChartRangePreset,
} from '@/lib/symbol-detail/chart-symbol-presets';

type Props = { symbol: string; rangePreset: SymbolChartRangePreset };

export default function SymbolDetailChartInner({ symbol, rangePreset }: Props) {
  const tf =
    SYMBOL_CHART_RANGE_PRESETS.find((p) => p.id === rangePreset)?.tf ?? SYMBOL_CHART_RANGE_PRESETS[2].tf;
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    refs: { containerRef },
    state: { initialLoading, chartReady },
    actions: { handleTimeframeClick, forceResize },
  } = useBinanceChart(symbol, '5m');

  useEffect(() => {
    handleTimeframeClick(tf);
    // handleTimeframeClick은 훅 내부에서 매 렌더 새 참조 — symbol/preset 동기화만 의존
     
  }, [symbol, rangePreset, tf]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => forceResize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [forceResize]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[320px] w-full min-h-[320px] overflow-hidden rounded-lg border border-border/50 bg-muted/10"
    >
      {initialLoading && !chartReady ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          차트 로딩…
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full min-h-[320px]" />
    </div>
  );
}
