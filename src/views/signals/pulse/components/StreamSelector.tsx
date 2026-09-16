import { cn } from '@/lib/utils';
import type { SignalStreamOptionId } from '../types/pulse.types';
import { usePulseStore } from '../stores/pulseStore';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '../utils/streamSelector';

const INACTIVE_OPTION_CLASS: Record<ReturnType<typeof signalOptionTone>, string> = {
  pulse: 'border-red-500 bg-background text-red-700 dark:text-red-400',
  beat: 'border-emerald-500 bg-background text-emerald-700 dark:text-emerald-400',
  wave: 'border-blue-500 bg-background text-blue-700 dark:text-blue-400',
};

/** Direct multi-select stream controls shared by Signals, Proof, and History. */
export function StreamSelector({ className }: { className?: string }) {
  const filter = usePulseStore((state) => state.streamOptionFilter);
  const toggle = usePulseStore((state) => state.toggleStreamOptionFilter);

  return (
    <div
      className={cn(
        'flex min-h-14 flex-wrap items-center gap-1.5 rounded-lg p-2',
        className
      )}
      aria-label="Signal stream filters"
    >
      {SIGNAL_STREAM_OPTION_IDS.map((id: SignalStreamOptionId) => {
        const tone = signalOptionTone(id);
        const selected = filter[id];

        return (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            aria-pressed={selected}
            className={cn(
              'flex h-8 select-none items-center justify-center rounded border px-2 text-xs font-semibold transition-colors',
              selected ? SIGNAL_OPTION_BADGE_CLASS[tone] : INACTIVE_OPTION_CLASS[tone]
            )}
          >
            {id}
          </button>
        );
      })}
    </div>
  );
}
