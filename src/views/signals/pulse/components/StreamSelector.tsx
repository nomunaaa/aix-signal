import { cn } from '@/lib/utils';
import type { SignalStreamOptionId } from '../types/pulse.types';
import { usePulseStore } from '../stores/pulseStore';
import {
  SIGNAL_OPTION_BADGE_CLASS,
  SIGNAL_OPTION_OUTLINE_CLASS,
  SIGNAL_STREAM_OPTION_IDS,
  signalOptionTone,
} from '../utils/streamSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type GlossaryKey, getGlossaryItem } from '@/config/glossary';
import { useBilingualText } from '@/hooks/useBilingualText';

/** Direct multi-select stream controls shared by Signals, Proof, and History. */
export function StreamSelector({ className }: { className?: string }) {
  const filter = usePulseStore((state) => state.streamOptionFilter);
  const toggle = usePulseStore((state) => state.toggleStreamOptionFilter);
  const { isKo } = useBilingualText();

  return (
    <TooltipProvider delayDuration={200}>
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
          const glossaryItem = getGlossaryItem(`signal-${id.toLowerCase()}` as GlossaryKey);
          const definition = glossaryItem
            ? isKo
              ? glossaryItem.definition
              : (glossaryItem.definitionEn ?? glossaryItem.definition)
            : null;

          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex h-8 select-none items-center justify-center rounded border px-2 text-xs font-semibold transition-colors',
                    selected ? SIGNAL_OPTION_BADGE_CLASS[tone] : SIGNAL_OPTION_OUTLINE_CLASS[tone]
                  )}
                >
                  {id}
                </button>
              </TooltipTrigger>
              {definition && (
                <TooltipContent
                  side="top"
                  align="center"
                  className="max-w-xs p-3 text-sm bg-popover border border-border shadow-lg"
                >
                  <p className="text-muted-foreground leading-relaxed">{definition}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
