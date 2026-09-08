'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';

interface ChartSymbolSelectProps {
  readonly symbols: readonly string[];
  readonly value: string;
  readonly onValueChange: (symbol: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

function normalizeSymbols(symbols: readonly string[]): string[] {
  return Array.from(new Set(symbols.map(normalizeSymbol).filter(Boolean)));
}

export function ChartSymbolSelect({
  symbols,
  value,
  onValueChange,
  disabled = false,
  className,
}: ChartSymbolSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const favorites = usePulseStore((s) => s.favorites);
  const toggleFavorite = usePulseStore((s) => s.toggleFavorite);

  const normalizedValue = normalizeSymbol(value);
  const normalizedSymbols = useMemo(() => normalizeSymbols(symbols), [symbols]);
  const topSymbols = normalizedSymbols.slice(0, 5);
  const favoriteSymbols = useMemo(
    () => normalizedSymbols.filter((symbol) => favorites.has(symbol)),
    [favorites, normalizedSymbols]
  );
  const filteredSymbols = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalizedSymbols;
    return normalizedSymbols.filter((symbol) => symbol.toLowerCase().includes(q));
  }, [normalizedSymbols, query]);

  const renderSymbolRow = (symbol: string) => {
    const isFavorite = favorites.has(symbol);
    const isSelected = symbol === normalizedValue;

    return (
      <div
        key={symbol}
        role="option"
        aria-selected={isSelected}
        className={cn(
          'flex h-8 items-center gap-1 rounded-md px-1 text-xs transition-colors',
          isSelected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted'
        )}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(symbol);
          }}
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-background/80',
            isFavorite ? 'text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400/50'
          )}
          aria-label={isFavorite ? `Remove ${symbol} from favorites` : `Add ${symbol} to favorites`}
          title={isFavorite ? 'Unfavorite' : 'Favorite'}
        >
          <Star className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            onValueChange(symbol);
            setOpen(false);
          }}
          className="flex h-full min-w-0 flex-1 items-center gap-2 rounded px-1 text-left"
        >
          <span className="min-w-0 flex-1 truncate font-mono font-medium">{symbol}</span>
          {isSelected ? <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden /> : null}
        </button>
      </div>
    );
  };

  const renderGroup = (label: string, groupSymbols: readonly string[]) => {
    if (groupSymbols.length === 0) return null;

    return (
      <div className="space-y-0.5">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {groupSymbols.map(renderSymbolRow)}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-7 w-40 justify-between gap-1 bg-background px-2 text-xs font-normal',
            className
          )}
          role="combobox"
          aria-expanded={open}
          aria-label="Select chart symbol"
        >
          <span className="min-w-0 truncate font-mono">{normalizedValue || 'Plan required'}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="z-[10001] w-[min(100vw-2rem,18rem)] p-2">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search symbol"
              className="h-8 pl-8 pr-2 text-xs"
              aria-label="Search chart symbol"
            />
          </div>

          <div className="max-h-72 overflow-y-auto pr-1" role="listbox" aria-label="Chart symbols">
            {query.trim() ? (
              renderGroup('Results', filteredSymbols)
            ) : (
              <>
                {renderGroup('Favorites', favoriteSymbols)}
                {renderGroup(
                  'Top 5',
                  topSymbols.filter((symbol) => !favorites.has(symbol))
                )}
                {renderGroup(
                  'All symbols',
                  normalizedSymbols.filter(
                    (symbol) => !favorites.has(symbol) && !topSymbols.includes(symbol)
                  )
                )}
              </>
            )}
            {filteredSymbols.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">No symbols</div>
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
