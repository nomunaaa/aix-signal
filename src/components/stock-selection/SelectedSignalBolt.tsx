'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBilingualText } from '@/hooks/useBilingualText';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import { useStockSelectionStore } from './stockSelectionStore';

export function SelectedSignalBolt({
  optionId,
  symbol,
  className,
}: {
  optionId: SignalStreamOptionId;
  symbol: string;
  className?: string;
}) {
  const selected = useStockSelectionStore((state) => state.selectedSignals[optionId].has(symbol));
  const toggle = useStockSelectionStore((state) => state.toggleSelectedSignal);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        toggle(optionId, symbol);
      }}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors',
        selected
          ? 'text-yellow-400 hover:bg-yellow-400/10'
          : 'text-yellow-500/55 hover:bg-yellow-400/10 hover:text-yellow-400',
        className
      )}
      aria-pressed={selected}
      aria-label={selected ? `Unselect ${optionId} ${symbol}` : `Select ${optionId} ${symbol}`}
    >
      <Zap className={cn('h-4 w-4', selected && 'fill-current')} aria-hidden />
    </button>
  );
}

export function SelectedSignalScope({ className }: { className?: string }) {
  const { isKo } = useBilingualText();
  const showSelectedOnly = useStockSelectionStore((state) => state.showSelectedOnly);
  const setShowSelectedOnly = useStockSelectionStore((state) => state.setShowSelectedOnly);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={showSelectedOnly}
      onClick={() => setShowSelectedOnly(!showSelectedOnly)}
      className={cn(
        'flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
        showSelectedOnly
          ? 'border-yellow-400/45 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300'
          : 'border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground',
        className
      )}
    >
      <Zap
        className={cn('h-4 w-4 text-yellow-400', showSelectedOnly && 'fill-current')}
        aria-hidden
      />
      <span>{isKo ? '선택 시그널' : 'Selected'}</span>
    </button>
  );
}
