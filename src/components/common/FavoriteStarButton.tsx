'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';

/** 종목 앞에 붙는 즐겨찾기 별 — pulseStore.favorites를 직접 읽고 토글한다. */
export function FavoriteStarButton({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  const favorites = usePulseStore((s) => s.favorites);
  const toggleFavorite = usePulseStore((s) => s.toggleFavorite);
  const key = symbol.trim().toUpperCase();
  const isFav = favorites.has(key);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggleFavorite(key);
      }}
      className={cn(
        'flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-colors',
        isFav ? 'text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400/50',
        className
      )}
      aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <Star className={cn('h-3.5 w-3.5', isFav && 'fill-current')} aria-hidden />
    </button>
  );
}
