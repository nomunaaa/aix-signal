import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SignalStreamOptionId } from '../types/pulse.types';
import { usePulseStore } from '../stores/pulseStore';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '../utils/streamSelector';
import { usePulseCopy } from '../utils/pulseTranslations';
import { useNavigate } from '@/lib/navigation-compat';

const GROUPS = [
  { name: 'Pulse', interval: '1m', options: ['P1', 'P2', 'P3'] as const, tone: 'red' },
  { name: 'Beat', interval: '—', options: ['B1', 'B2', 'B3'] as const, tone: 'emerald' },
  { name: 'Wave', interval: '10m', options: ['W1', 'W2', 'W3'] as const, tone: 'blue' },
] as const;

const TONES = {
  red: {
    row: 'hover:bg-red-500/5',
    interval: 'border-red-500/60 text-red-500',
    name: 'bg-red-500 text-white',
    option: 'border-red-500/60 bg-red-500/10 text-red-500',
  },
  emerald: {
    row: 'hover:bg-emerald-500/5',
    interval: 'border-emerald-500/60 text-emerald-500',
    name: 'bg-emerald-500 text-white',
    option: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500',
  },
  blue: {
    row: 'hover:bg-blue-500/5',
    interval: 'border-blue-500/60 text-blue-500',
    name: 'bg-blue-500 text-white',
    option: 'border-blue-500/60 bg-blue-500/10 text-blue-500',
  },
} as const;

export function StreamSelector({ className }: { className?: string }) {
  const { language } = usePulseCopy();
  const navigate = useNavigate();
  const filter = usePulseStore((state) => state.streamOptionFilter);
  const toggle = usePulseStore((state) => state.toggleStreamOptionFilter);
  const toggleGroup = usePulseStore((state) => state.toggleStreamOptionGroup);
  const selected = SIGNAL_STREAM_OPTION_IDS.filter((id) => filter[id]);
  const labels: Record<SignalStreamOptionId, string> =
    language === 'ko'
      ? {
          P1: '리버설',
          P2: '추세',
          P3: '비추세',
          B1: '리버설',
          B2: '추세',
          B3: '비추세',
          W1: '리버설',
          W2: '추세',
          W3: '비추세',
        }
      : {
          P1: 'Reversal',
          P2: 'Trend',
          P3: 'Non-trend',
          B1: 'Reversal',
          B2: 'Trend',
          B3: 'Non-trend',
          W1: 'Reversal',
          W2: 'Trend',
          W3: 'Non-trend',
        };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex min-h-9 w-[20rem] items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-left shadow-sm hover:bg-muted/30',
            className
          )}
          aria-label="Select signal streams"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-1">
            {selected.map((id) => {
              return (
                <span
                  key={id}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(id)]
                  )}
                >
                  {id}
                </span>
              );
            })}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-1rem))] p-2">
        <div className="space-y-1">
          {GROUPS.map((group) => {
            const tone = TONES[group.tone];
            return (
              <div
                key={group.name}
                className={cn(
                  'grid grid-cols-[2.5rem_3.75rem_1fr] items-center gap-1.5 rounded-md p-1.5',
                  tone.row
                )}
              >
                {group.name === 'Beat' ? (
                  <span
                    className={cn(
                      'flex h-8 items-center justify-center rounded border text-xs font-semibold',
                      tone.interval
                    )}
                  >
                    {group.interval}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(group.name === 'Pulse' ? '/chart1m' : '/chart10m')}
                    className={cn(
                      'flex h-8 items-center justify-center rounded border text-xs font-semibold transition-opacity hover:opacity-75',
                      tone.interval
                    )}
                    aria-label={`Open ${group.name} chart`}
                  >
                    {group.interval}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.options)}
                  className={cn(
                    'flex h-8 items-center justify-center rounded text-xs font-semibold transition-opacity hover:opacity-80',
                    tone.name
                  )}
                  aria-label={`Toggle all ${group.name} signals`}
                >
                  {group.name}
                </button>
                <div className="grid min-w-0 grid-cols-3 gap-1.5">
                  {group.options.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggle(id)}
                      aria-pressed={filter[id]}
                      className={cn(
                        'flex min-h-8 items-center justify-center rounded border px-1 text-[10px] font-semibold transition-colors sm:text-xs',
                        filter[id] ? SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(id)] : tone.option
                      )}
                    >
                      <span className="truncate">
                        {id} {labels[id]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
