import { useRef } from 'react';
import { Star } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { keepElementInPlace } from '@/lib/keepElementInPlace';
import { usePulseStore } from '../stores/pulseStore';
import { usePulseCopy } from '../utils/pulseTranslations';
import { FavoriteSymbolsCombobox } from './FavoriteSymbolsCombobox';

interface FavoriteScopeControlsProps {
  readonly symbols: readonly string[];
  readonly className?: string;
  /** '전체(종목)' 선택 시 추가로 정리할 것이 있는 소비처(예: 히스토리의 개별 종목 드릴다운 필터)를 위한 훅. */
  readonly onSelectAll?: () => void;
}

export function FavoriteScopeControls({ symbols, className, onSelectAll }: FavoriteScopeControlsProps) {
  const { language, copy } = usePulseCopy();
  const showFavoritesOnly = usePulseStore((s) => s.showFavoritesOnly);
  const setShowFavoritesOnly = usePulseStore((s) => s.setShowFavoritesOnly);
  const favoriteFilterLabel = showFavoritesOnly
    ? language === 'ko'
      ? '즐겨찾기'
      : 'Favorites'
    : copy.tableControls.allSymbols;

  // 전체/즐겨찾기 전환 시 위쪽 시그널 섹션들의 높이가 크게 달라진다(빈 상태 ↔ 목록).
  // 이 컨트롤 자체를 화면상 같은 자리에 붙들어, 보고 있던 히스토리 위치를 유지한다.
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootRef} className={cn('flex shrink-0 items-center gap-2', className)}>
      <Select
        value={showFavoritesOnly ? 'favorites' : 'all'}
        onValueChange={(v) => {
          keepElementInPlace(rootRef.current);
          const isAll = v !== 'favorites';
          setShowFavoritesOnly(!isAll);
          if (isAll) onSelectAll?.();
        }}
      >
        <SelectTrigger
          className={cn(
            'h-9 w-[110px] shrink-0 gap-1.5 border-border bg-background px-2 text-xs',
            showFavoritesOnly &&
              '!border-yellow-400/40 bg-yellow-400/10 text-yellow-700 focus:!ring-yellow-400/30 focus:!ring-offset-0 data-[state=open]:!border-yellow-400/40 dark:text-yellow-300'
          )}
          aria-label={copy.tableControls.showFavoritesOnly}
        >
          <Star
            className={cn('h-3.5 w-3.5 shrink-0', showFavoritesOnly && 'fill-current')}
            aria-hidden
          />
          <SelectValue>{favoriteFilterLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all" className="text-xs">
            {copy.tableControls.allSymbols}
          </SelectItem>
          <SelectItem value="favorites" className="text-xs">
            {language === 'ko' ? '즐겨찾기' : 'Favorites'}
          </SelectItem>
        </SelectContent>
      </Select>
      <FavoriteSymbolsCombobox symbols={symbols} />
    </div>
  );
}
