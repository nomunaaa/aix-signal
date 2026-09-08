import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { sortFavoritesFirst } from '@/lib/favorite-symbol-order';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';

interface SymbolFilterDropdownProps {
  readonly symbols: readonly string[];
  readonly value: string | null;
  readonly onChange: (symbol: string | null) => void;
  readonly allLabel: string;
  readonly searchLabel: string;
  readonly emptyLabel: string;
  readonly className?: string;
}

/** 성과 페이지 전용 단일 종목 필터 — usePulseStore와 무관한 페이지 로컬 상태다. */
export function SymbolFilterDropdown({
  symbols,
  value,
  onChange,
  allLabel,
  searchLabel,
  emptyLabel,
  className,
}: SymbolFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const favorites = usePulseStore((state) => state.favorites);

  const normalizedSymbols = useMemo(
    () => Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))),
    [symbols]
  );
  // 즐겨찾기 종목을 맨 위로 — FavoriteSymbolsCombobox와 동일한 정렬을 쓴다.
  const orderedSymbols = useMemo(
    () => sortFavoritesFirst(normalizedSymbols, favorites),
    [favorites, normalizedSymbols]
  );
  const filteredSymbols = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orderedSymbols;
    return orderedSymbols.filter((symbol) => symbol.toLowerCase().includes(q));
  }, [orderedSymbols, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 min-w-[120px] shrink-0 justify-between gap-1.5 border-border bg-background px-2.5 text-xs font-normal',
            value
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300'
              : 'text-muted-foreground hover:bg-muted/40',
            className
          )}
          aria-expanded={open}
          role="combobox"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Star className={cn('h-3.5 w-3.5 shrink-0', value && 'fill-current')} aria-hidden />
            <span className="truncate font-mono">{value ?? allLabel}</span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-55" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[min(100vw-2rem,18rem)] p-2">
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchLabel}
              className="h-8 pl-8 pr-2 text-xs"
              aria-label={searchLabel}
            />
          </div>

          <div className="max-h-72 overflow-y-auto pr-1" role="listbox">
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors',
                value === null
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {/* 아래 종목 행들의 별 아이콘과 라벨 시작점을 맞추기 위한 자리. */}
              <span className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-medium">{allLabel}</span>
              {value === null ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            </button>

            {filteredSymbols.length > 0 ? (
              filteredSymbols.map((symbol) => {
                const selected = symbol === value;
                const favorite = favorites.has(symbol);
                return (
                  <button
                    key={symbol}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(symbol);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors',
                      selected
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        favorite ? 'fill-current text-yellow-400' : 'text-muted-foreground/40'
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono font-medium">{symbol}</span>
                    {selected ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
                  </button>
                );
              })
            ) : (
              <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
