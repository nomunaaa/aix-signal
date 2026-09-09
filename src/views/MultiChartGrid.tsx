'use client';

/**
 * /multichart — 6-symbol chart grid.
 * Shared timeframe switches the candle interval for all tiles (same
 * 1m/5m/15m/1h/4h/1d set as /chart's TF bar). Each tile has its own
 * symbol picker and draws trend colors + signal arrows.
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
  CHART_INTERVALS,
  type ChartInterval,
} from '@/components/multichart/MultiChartTile';

const DEFAULT_SYMBOLS = [...VOLUME_TOP5_SYMBOLS, 'DOGEUSDT'];

export default function MultiChartGrid() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [interval, setInterval] = useState<ChartInterval>('1m');
  const [showTrend, setShowTrend] = useState(false);

  const setSymbolAt = (index: number, symbol: string) => {
    setSymbols((prev) => prev.map((s, i) => (i === index ? symbol : s)));
  };

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">멀티차트</h1>
          <p className="text-xs text-muted-foreground">
            6개 종목을 동시에 확인합니다. 시그널 화살표 · 추세 색상(선택) 지원.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-muted-foreground">
            <input
              type="checkbox"
              checked={showTrend}
              onChange={(e) => setShowTrend(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            추세 색상 (단기추세)
            {showTrend ? (
              <span className="ml-1 flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-sm bg-[#22c55e]" />
                <span className="inline-block h-2 w-2 rounded-sm bg-[#9ca3af]" />
                <span className="inline-block h-2 w-2 rounded-sm bg-[#ef4444]" />
              </span>
            ) : null}
          </label>

          <div className="flex items-center gap-1 rounded-md border border-border bg-card/50 p-1">
            {CHART_INTERVALS.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setInterval(tf)}
                className={`h-7 rounded px-2.5 text-xs font-medium transition-colors ${
                  interval === tf
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        {symbols.map((symbol, index) => (
          <div
            key={index}
            className="flex h-[320px] flex-col rounded-lg border border-border bg-card p-2"
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
              <MultiChartTile symbol={symbol} interval={interval} showTrend={showTrend} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
