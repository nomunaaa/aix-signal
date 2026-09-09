'use client';

/**
 * /multichart — fixed 6-symbol chart grid (1m only, first pass).
 * No drag/resize/save-layout; each tile has its own symbol picker.
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
import { MultiChartTile } from '@/components/multichart/MultiChartTile';

const DEFAULT_SYMBOLS = [...VOLUME_TOP5_SYMBOLS, 'DOGEUSDT'];

export default function MultiChartGrid() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);

  const setSymbolAt = (index: number, symbol: string) => {
    setSymbols((prev) => prev.map((s, i) => (i === index ? symbol : s)));
  };

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col">
      <div className="border-b border-border px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">멀티차트</h1>
        <p className="text-xs text-muted-foreground">
          6개 종목 1분봉을 동시에 확인합니다.
        </p>
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
              <MultiChartTile symbol={symbol} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
