import { cn } from '@/lib/utils';
import { FavoriteSymbolsCombobox } from './FavoriteSymbolsCombobox';

interface FavoriteScopeControlsProps {
  readonly symbols: readonly string[];
  readonly className?: string;
  readonly onSelectAll?: () => void;
}

export function FavoriteScopeControls({
  symbols,
  className,
  onSelectAll,
}: FavoriteScopeControlsProps) {
  return (
    <div className={cn('flex shrink-0 items-center', className)}>
      <FavoriteSymbolsCombobox symbols={symbols} onSelectAll={onSelectAll} />
    </div>
  );
}
