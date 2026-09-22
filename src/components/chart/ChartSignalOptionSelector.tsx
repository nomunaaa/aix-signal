'use client';

import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_OPTION_OUTLINE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '@/views/signals/pulse/utils/streamSelector';
import { cn } from '@/lib/utils';

interface ChartSignalOptionSelectorProps {
  readonly selectedOptions: readonly SignalStreamOptionId[];
  readonly onSelect: (option: SignalStreamOptionId) => void;
}

export function parseChartSignalOptions(value: string | null): SignalStreamOptionId[] {
  const requested = new Set((value ?? '').split(','));
  return SIGNAL_STREAM_OPTION_IDS.filter((option) => requested.has(option));
}

export function ChartSignalOptionSelector({
  selectedOptions,
  onSelect,
}: ChartSignalOptionSelectorProps) {
  const selected = new Set(selectedOptions);

  return (
    <div
      className="flex min-h-14 flex-wrap items-center gap-1.5 rounded-lg p-2"
      role="group"
      aria-label="Signal filters"
    >
      {SIGNAL_STREAM_OPTION_IDS.map((option) => {
        const tone = signalOptionTone(option);
        const active = selected.has(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={active}
            className={cn(
              'flex h-8 select-none items-center justify-center rounded border px-2 text-xs font-semibold transition-colors',
              active ? SIGNAL_OPTION_BADGE_CLASS[tone] : SIGNAL_OPTION_OUTLINE_CLASS[tone]
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
