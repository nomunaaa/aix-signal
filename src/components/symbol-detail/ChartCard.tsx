import { lazy, Suspense, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  SYMBOL_CHART_RANGE_PRESETS,
  defaultSymbolChartPreset,
  type SymbolChartRangePreset,
} from '@/lib/symbol-detail/chart-symbol-presets';
const SymbolDetailChartInner = lazy(() => import('@/components/symbol-detail/SymbolDetailChartInner'));

export function ChartCard({ symbol }: { symbol: string }) {
  const [preset, setPreset] = useState<SymbolChartRangePreset>(defaultSymbolChartPreset);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          value={preset}
          onValueChange={(v) => v && setPreset(v as SymbolChartRangePreset)}
          className="flex-wrap justify-start"
        >
          {SYMBOL_CHART_RANGE_PRESETS.map((p) => (
            <ToggleGroupItem key={p.id} value={p.id} className="h-8 px-2 font-mono text-xs">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <Suspense fallback={<div className="h-[320px] animate-pulse rounded-lg border border-border/40 bg-muted/20" />}>
        <SymbolDetailChartInner symbol={symbol} rangePreset={preset} />
      </Suspense>
    </div>
  );
}
