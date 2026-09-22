'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
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
  const value = showSelectedOnly ? 'selected' : 'all';
  const label = showSelectedOnly
    ? isKo
      ? '선택시그널'
      : 'Selected'
    : isKo
      ? '전체시그널'
      : 'All';

  return (
    <Select
      value={value}
      onValueChange={(next) => setShowSelectedOnly(next === 'selected')}
    >
      <SelectTrigger
        aria-label={isKo ? '시그널 범위' : 'Signal scope'}
        className={cn(
          'h-8 w-[7.5rem] shrink-0 gap-1 px-2 py-0 text-xs font-medium',
          '[&>span]:line-clamp-none [&>span]:!inline-flex [&>span]:!items-center [&>span]:!gap-1 [&>span]:!whitespace-nowrap',
          showSelectedOnly
            ? 'border-yellow-400/45 bg-yellow-400/10 text-yellow-700 dark:text-yellow-300'
            : 'border-border bg-background text-muted-foreground',
          className
        )}
      >
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Zap
            className={cn('size-3.5 shrink-0 text-yellow-400', showSelectedOnly && 'fill-current')}
            aria-hidden
          />
          <span>{label}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{isKo ? '전체시그널' : 'All'}</SelectItem>
        <SelectItem value="selected">{isKo ? '선택시그널' : 'Selected'}</SelectItem>
      </SelectContent>
    </Select>
  );
}
