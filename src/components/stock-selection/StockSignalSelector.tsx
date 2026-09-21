'use client';

import { useMemo, useState } from 'react';
import { Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import { useStockSelectionStore } from './stockSelectionStore';

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
  const toggle = useStockSelectionStore((state) => state.toggleSelectedSignal);
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
  const topSymbols = useMemo(() => normalizedSymbols.slice(0, 5), [normalizedSymbols]);
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
              onClick={() => toggle(optionId, symbol)}
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
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-10 min-w-9 flex-col gap-0.5 px-2 text-xs font-semibold leading-none',
            selectedCount > 0 && SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(optionId)]
          )}
          aria-label={`${optionId} selected symbols`}
        >
          {optionId}
          <span className="font-mono text-[9px] opacity-75">{selectedCount}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-2">
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search symbol"
            className="h-8 pl-8 text-xs"
            aria-label={`Search ${optionId} symbols`}
          />
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1" role="listbox">
          {filteredSymbols.length ? (
            query.trim() ? (
              renderGroup('Results', filteredSymbols)
            ) : (
              <>
                {renderGroup(
                  'Selected',
                  normalizedSymbols.filter((symbol) => selected.has(symbol))
                )}
                {renderGroup(
                  'Top 5',
                  topSymbols.filter((symbol) => !selected.has(symbol))
                )}
                {renderGroup(
                  'All symbols',
                  normalizedSymbols.filter(
                    (symbol) => !selected.has(symbol) && !topSymbols.includes(symbol)
                  )
                )}
              </>
            )
          ) : (
            <div className="px-2 py-8 text-center text-xs text-muted-foreground">No symbols</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StockSignalSelector({
  symbols,
  className,
}: {
  symbols: readonly string[];
  className?: string;
}) {
  return (
    <div
      className={cn('flex min-h-14 flex-wrap items-center gap-1.5 rounded-lg p-2', className)}
      aria-label="Signal symbol selection"
    >
      {SIGNAL_STREAM_OPTION_IDS.map((optionId) => (
        <SignalSymbolPicker key={optionId} optionId={optionId} symbols={symbols} />
      ))}
    </div>
  );
}
