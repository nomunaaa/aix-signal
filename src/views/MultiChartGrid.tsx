'use client';

/**
 * /multichart — 6 tiles, each running the same useBinanceChart engine as
 * /chart1m. The toolbar mirrors chart1m's controls (Pulse/Wave interval,
 * 구분 trend-mode checkboxes, 신호 category, timeframe pills, Bollinger,
 * Trend short/long) but applies them to all 6 tiles at once.
 */

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_SYMBOLS, VOLUME_TOP5_SYMBOLS } from '@/config/symbols';
import {
  MultiChartTile,
  MULTICHART_TF_KEYS,
  type MultichartTfKey,
} from '@/components/multichart/MultiChartTile';
import type { ChartTradingCategoryFilter, ChartTrendMode } from '@/views/Multiplecharts/types';

const DEFAULT_SYMBOLS = [...VOLUME_TOP5_SYMBOLS, 'DOGEUSDT'];

const STREAMS = [
  { label: 'Pulse (1m)', value: '1m' },
  { label: 'Wave (10m)', value: '10m' },
] as const;

const CATEGORIES: ChartTradingCategoryFilter[] = ['ALL', 'E1X1', 'E1X2', 'E2X1', 'E2X2'];

const TREND_MODES: { key: ChartTrendMode; label: string }[] = [
  { key: 'trend', label: '추세' },
  { key: 'nonTrend', label: '비추세' },
  { key: 'reversal', label: '역추세' },
];

export default function MultiChartGrid() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [barInterval, setBarInterval] = useState<string>('1m');
  const [timeframe, setTimeframe] = useState<MultichartTfKey>('6H');
  const [showTrendShort, setShowTrendShort] = useState(true);
  const [showTrendLong, setShowTrendLong] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [category, setCategory] = useState<ChartTradingCategoryFilter>('ALL');
  const [trendModes, setTrendModes] = useState<ChartTrendMode[]>([
    'trend',
    'nonTrend',
    'reversal',
  ]);

  const setSymbolAt = (index: number, symbol: string) => {
    setSymbols((prev) => prev.map((s, i) => (i === index ? symbol : s)));
  };

  const toggleTrendMode = (mode: ChartTrendMode) => {
    setTrendModes((prev) => {
      const next = prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode];
      return next.length === 0 ? prev : next;
    });
  };

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5">
        <h1 className="text-sm font-semibold text-foreground">멀티차트</h1>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          차트
          <Select value={barInterval} onValueChange={setBarInterval}>
            <SelectTrigger className="h-7 w-[116px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STREAMS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          구분
          {TREND_MODES.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center gap-1 text-foreground">
              <input
                type="checkbox"
                checked={trendModes.includes(m.key)}
                onChange={() => toggleTrendMode(m.key)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {m.label}
            </label>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          신호
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ChartTradingCategoryFilter)}
          >
            <SelectTrigger className="h-7 w-[84px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="flex items-center gap-1 rounded-md border border-border bg-card/50 p-0.5">
          {MULTICHART_TF_KEYS.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`h-6 rounded px-2 text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-1 text-foreground">
            <input
              type="checkbox"
              checked={showTrendShort}
              onChange={(e) => setShowTrendShort(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Trend short
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-foreground">
            <input
              type="checkbox"
              checked={showTrendLong}
              onChange={(e) => setShowTrendLong(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Trend long
          </label>
          <label className="flex cursor-pointer items-center gap-1 text-foreground">
            <input
              type="checkbox"
              checked={showBollinger}
              onChange={(e) => setShowBollinger(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            Bollinger
          </label>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {symbols.map((symbol, index) => (
          <div
            key={index}
            className="flex h-[340px] flex-col rounded-lg border border-border bg-card p-2"
          >
            <Select value={symbol} onValueChange={(v) => setSymbolAt(index, v)}>
              <SelectTrigger className="h-8 w-full shrink-0 text-xs">
                <SelectValue>{symbol}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ALL_SYMBOLS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-2 min-h-0 flex-1">
              <MultiChartTile
                symbol={symbol}
                barInterval={barInterval}
                timeframe={timeframe}
                showTrendShort={showTrendShort}
                showTrendLong={showTrendLong}
                showBollinger={showBollinger}
                tradingCategoryFilter={category}
                trendModesFilter={trendModes}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
