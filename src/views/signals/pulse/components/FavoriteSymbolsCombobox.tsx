import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { sortFavoritesFirst } from '@/lib/favorite-symbol-order';
import { usePulseStore } from '../stores/pulseStore';
import { usePulseCopy } from '../utils/pulseTranslations';

interface FavoriteSymbolsComboboxProps {
  readonly symbols: readonly string[];
  readonly className?: string;
}

function normalizeSymbols(symbols: readonly string[]): string[] {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)));
}

export function FavoriteSymbolsCombobox({ symbols, className }: FavoriteSymbolsComboboxProps) {
  const { language } = usePulseCopy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const favorites = usePulseStore((s) => s.favorites);
  const toggleFavorite = usePulseStore((s) => s.toggleFavorite);
  // 즐겨찾기 스코프(FavoriteScopeControls)가 '즐겨찾기'일 때만 이 버튼도 같이 노란색으로
  // 강조한다 — '전체(종목)'일 때는 즐겨찾기 개수와 무관하게 항상 빈 별 아이콘으로 보인다.
  const showFavoritesOnly = usePulseStore((s) => s.showFavoritesOnly);

  const normalizedSymbols = useMemo(() => normalizeSymbols(symbols), [symbols]);

  // 즐겨찾기를 맨 위로 올린 순서. 열려 있는 동안에는 고정한다 — 별을 누를 때마다
  // 즉시 재정렬하면 클릭한 행이 커서 아래에서 튀어 올라 다음 종목을 잘못 누르게 된다.
  // 팝오버를 열 때마다 새로 계산하므로 닫았다 다시 열면 최신 순서가 반영된다.
  const [orderedSymbols, setOrderedSymbols] = useState<string[]>(() =>
    sortFavoritesFirst(normalizedSymbols, favorites)
  );

  const handleOpenChange = (next: boolean) => {
    // 클로저에 잡힌 favorites가 아니라 store의 최신 값을 읽는다 — 닫자마자 다시 열어
    // 리렌더가 끼어들지 않은 경우에도 방금 토글한 즐겨찾기가 반영되도록.
    if (next) {
      setOrderedSymbols(
        sortFavoritesFirst(normalizedSymbols, usePulseStore.getState().favorites)
      );
    }
    setOpen(next);
  };

  const filteredSymbols = useMemo(() => {
    // 목록에 없던 종목이 prop으로 새로 들어온 경우에도 빠짐없이 보여준다.
    const known = new Set(orderedSymbols);
    const source = [...orderedSymbols, ...normalizedSymbols.filter((s) => !known.has(s))].filter(
      (symbol) => normalizedSymbols.includes(symbol)
    );
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((symbol) => symbol.toLowerCase().includes(q));
  }, [normalizedSymbols, orderedSymbols, query]);
  const favoriteCount = useMemo(
    () => normalizedSymbols.filter((symbol) => favorites.has(symbol)).length,
    [favorites, normalizedSymbols]
  );
  const highlighted = showFavoritesOnly;
  const favoritesLabel = language === 'ko' ? '즐겨찾기' : 'Favorites';
  const searchLabel = language === 'ko' ? '즐겨찾기 종목 검색' : 'Search favorite symbols';
  const emptyLabel = language === 'ko' ? '종목 없음' : 'No symbols';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-9 min-w-[120px] shrink-0 justify-between gap-1.5 border-border bg-background px-2.5 text-xs font-normal',
            highlighted
              ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-700 focus-visible:!ring-yellow-400/30 dark:text-yellow-300'
              : 'text-muted-foreground hover:bg-muted/40',
            className
          )}
          aria-label={favoritesLabel}
          aria-expanded={open}
          role="combobox"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Star
              className={cn('h-3.5 w-3.5 shrink-0', highlighted && 'fill-current')}
              aria-hidden
            />
            <span className="truncate">{favoritesLabel}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {favoriteCount}/{normalizedSymbols.length}
            </span>
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
              placeholder={language === 'ko' ? '종목 검색' : 'Search symbol'}
              className="h-8 pl-8 pr-2 text-xs"
              aria-label={searchLabel}
            />
          </div>

          <div
            className="max-h-72 overflow-y-auto pr-1"
            role="listbox"
            aria-label={favoritesLabel}
          >
            {filteredSymbols.length > 0 ? (
              filteredSymbols.map((symbol) => {
                const selected = favorites.has(symbol);
                return (
                  <button
                    key={symbol}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => toggleFavorite(symbol)}
                    className={cn(
                      'flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-xs transition-colors',
                      selected
                        ? 'bg-yellow-400/12 text-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        selected ? 'fill-current text-yellow-400' : 'text-muted-foreground/40'
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono font-medium">{symbol}</span>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-yellow-500" aria-hidden />
                    ) : null}
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
