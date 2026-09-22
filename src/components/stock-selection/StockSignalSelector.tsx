'use client';

import { useMemo, useState } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Search, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import { useBilingualText } from '@/hooks/useBilingualText';
import { useStockSelectionStore } from './stockSelectionStore';

const INACTIVE_OPTION_CLASS = {
  pulse: 'border-red-500 bg-background text-red-700 dark:text-red-400',
  beat: 'border-emerald-500 bg-background text-emerald-700 dark:text-emerald-400',
  wave: 'border-blue-500 bg-background text-blue-700 dark:text-blue-400',
} as const;

function symbolLabel(symbol: string): string {
  return symbol.replace(/USDT$/i, '');
}

function SignalSymbolPicker({
  optionId,
  symbols,
}: {
  optionId: SignalStreamOptionId;
  symbols: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = useStockSelectionStore((state) => state.selectedSignals[optionId]);
  const toggleSymbol = useStockSelectionStore((state) => state.toggleSelectedSignal);
  const active = usePulseStore((state) => state.streamOptionFilter[optionId]);
  const toggleTrend = usePulseStore((state) => state.toggleStreamOptionFilter);
  const tone = signalOptionTone(optionId);
  const { tr } = useBilingualText();
  const normalizedSymbols = useMemo(
    () => Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))),
    [symbols]
  );
  const filteredSymbols = useMemo(() => {
    const needle = query.trim().toUpperCase();
    return needle
      ? normalizedSymbols.filter((symbol) => symbol.includes(needle))
      : normalizedSymbols;
  }, [normalizedSymbols, query]);
  const selectedCount = normalizedSymbols.filter((symbol) => selected.has(symbol)).length;

  const renderGroup = (label: string, groupSymbols: readonly string[]) => {
    if (groupSymbols.length === 0) return null;
    return (
      <div className="space-y-0.5">
        <div className="sticky top-0 bg-popover px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label} ({groupSymbols.length})
        </div>
        {groupSymbols.map((symbol) => {
          const isSelected = selected.has(symbol);
          return (
            <button
              key={symbol}
              type="button"
              role="option"
              aria-selected={isSelected}
              onClick={() => toggleSymbol(optionId, symbol)}
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors',
                isSelected
                  ? 'bg-yellow-400/10 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Zap
                className={cn('h-3.5 w-3.5 shrink-0 text-yellow-400', isSelected && 'fill-current')}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-mono font-medium">
                {symbolLabel(symbol)}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Anchor asChild>
        <button
          type="button"
          aria-pressed={active}
          aria-label={`${optionId}. Left click toggles the trend. Right click selects symbols.`}
          title="Left click: show this trend. Right click: choose symbols."
          onClick={() => {
            setOpen(false);
            toggleTrend(optionId);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
          className={cn(
            'flex h-8 min-w-8 select-none flex-col items-center justify-center gap-0.5 rounded border px-1.5 text-[12px] font-semibold leading-none transition-colors',
            active ? SIGNAL_OPTION_BADGE_CLASS[tone] : INACTIVE_OPTION_CLASS[tone]
          )}
        >
          {optionId}
          <span className="font-mono text-[10px] leading-none opacity-75">{selectedCount}</span>
        </button>
      </PopoverPrimitive.Anchor>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tr('심볼 검색', 'Search symbol')}
            className="h-8 pl-8 text-xs"
            aria-label={tr(`${optionId} 심볼 검색`, `Search ${optionId} symbols`)}
          />
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1" role="listbox">
          {filteredSymbols.length ? (
            query.trim() ? (
              renderGroup(tr('결과', 'Results'), filteredSymbols)
            ) : (
              <>
                {renderGroup(
                  tr('선택', 'Selected'),
                  normalizedSymbols.filter((symbol) => selected.has(symbol))
                )}
                {renderGroup(
                  tr('기타', 'Others'),
                  normalizedSymbols.filter((symbol) => !selected.has(symbol))
                )}
              </>
            )
          ) : (
            <div className="px-2 py-8 text-center text-xs text-muted-foreground">
              {tr('심볼 없음', 'No symbols')}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StockSignalSelector({
  symbolsByOption,
  className,
}: {
  symbolsByOption: Partial<Record<SignalStreamOptionId, readonly string[]>>;
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-h-8 flex-nowrap items-center gap-1 rounded-lg p-1', className)}
      aria-label="Signal trend filters"
    >
      {SIGNAL_STREAM_OPTION_IDS.map((optionId) => (
        <SignalSymbolPicker
          key={optionId}
          optionId={optionId}
          symbols={symbolsByOption[optionId] ?? []}
        />
      ))}
    </div>
  );
}
