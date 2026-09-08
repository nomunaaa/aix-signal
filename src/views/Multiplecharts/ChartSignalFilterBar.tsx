'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ChartTradingCategoryFilter, ChartTrendMode } from './types';

const TRADING_CATEGORY_OPTIONS: ChartTradingCategoryFilter[] = [
  'E1X1',
  'E1X2',
  'E2X1',
  'E2X2',
];
const TREND_MODE_OPTIONS: { id: ChartTrendMode; label: string }[] = [
  { id: 'trend', label: '추세' },
  { id: 'nonTrend', label: '비추세' },
  { id: 'reversal', label: '역추세' },
];

export function ChartSignalFilterBar({
  tradingCategory,
  onTradingCategoryChange,
  trendModes,
  onToggleTrendMode,
}: {
  tradingCategory: ChartTradingCategoryFilter;
  onTradingCategoryChange: (value: ChartTradingCategoryFilter) => void;
  trendModes: ChartTrendMode[];
  onToggleTrendMode: (mode: ChartTrendMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">구분 :</span>
        {TREND_MODE_OPTIONS.map((opt) => {
          const checked = trendModes.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={cn(
                'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-colors',
                checked
                  ? 'border-emerald-500/40 bg-card text-emerald-600 dark:text-emerald-400'
                  : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40'
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleTrendMode(opt.id)}
                className="h-3 w-3 accent-emerald-500"
              />
              {opt.label}
            </label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">신호 :</span>
        <Select
          value={tradingCategory}
          onValueChange={(value) => onTradingCategoryChange(value as ChartTradingCategoryFilter)}
        >
          <SelectTrigger className="h-7 w-[88px] bg-background text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[10001] bg-popover">
            {TRADING_CATEGORY_OPTIONS.map((category) => (
              <SelectItem key={category} value={category} className="text-xs">
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
