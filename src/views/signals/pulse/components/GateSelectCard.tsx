import { Check, CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { GateKpi30d } from '../types/pulse.types';
import { GateKpiTable, GATE_FONT } from './GateKpiTable';
import { usePulseCopy } from '../utils/pulseTranslations';

const STREAM_BADGE =
  'rounded-full border border-border bg-muted/35 px-2 py-0.5 text-caption font-medium text-muted-foreground';

const FEATURE_ON_DISCOUNT = 'rounded-full px-2 py-0.5 text-caption font-medium bg-amber-500/15 text-amber-400';
const FEATURE_OFF = 'rounded-full px-2 py-0.5 text-caption font-medium bg-muted/50 text-muted-foreground/45';
const FEATURE_ON_LOCKED = 'rounded-full px-2 py-0.5 text-caption font-medium bg-blue-500/15 text-blue-400';

export interface GateSelectCardProps {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  /** Lucide 등 — 제목 높이에 맞춰 부모에서 크기 지정 */
  icon: React.ReactNode;
  title: string;
  titleSuffix?: React.ReactNode;
  textBadges?: readonly string[];
  strategyFeatures?: { discount: boolean; locked: boolean };
  detailTitle: string;
  detailBody: string;
  metrics: GateKpi30d | null;
  metricsEmpty?: boolean;
  showRecommended?: boolean;
  popoverSide?: 'top' | 'bottom' | 'left' | 'right';
  highlightWinRate?: boolean;
}

/**
 * 한 줄: [아이콘] 제목 · 텍스트칩 · (?) — 상세는 Popover
 * 다음: KPI 테이블
 */
export function GateSelectCard({
  selected,
  disabled,
  onSelect,
  icon,
  title,
  titleSuffix,
  textBadges,
  strategyFeatures,
  detailTitle,
  detailBody,
  metrics,
  metricsEmpty,
  showRecommended,
  popoverSide = 'top',
  highlightWinRate,
}: GateSelectCardProps) {
  const { copy } = usePulseCopy();
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        GATE_FONT,
        'flex flex-col gap-2 rounded-xl border bg-card p-3 text-left outline-none transition-colors',
        disabled && 'cursor-not-allowed opacity-40',
        !disabled && 'cursor-pointer hover:bg-muted/30',
        selected ? 'border-foreground/35 ring-1 ring-foreground/15' : 'border-border',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="shrink-0">{icon}</div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-lg font-semibold leading-none tracking-tight text-foreground">{title}</span>
          {textBadges?.map((b) => (
            <span key={b} className={STREAM_BADGE}>
              {b}
            </span>
          ))}
          {strategyFeatures && (
            <>
              <span className={strategyFeatures.discount ? FEATURE_ON_DISCOUNT : FEATURE_OFF}>{copy.gate.featureDiscount}</span>
              <span className={strategyFeatures.locked ? FEATURE_ON_LOCKED : FEATURE_OFF}>{copy.gate.featureLocked}</span>
            </>
          )}
          {titleSuffix}
          {showRecommended && (
            <span className="rounded bg-muted px-1.5 py-px text-caption text-muted-foreground">{copy.gate.recommended}</span>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-0.5 inline-flex shrink-0 rounded-full p-0.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={copy.gate.detailAria(detailTitle)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <CircleHelp className="size-5" aria-hidden />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className={cn(
                'z-[80] max-w-[min(20rem,calc(100vw-2rem))] text-caption leading-relaxed',
                GATE_FONT,
              )}
              side={popoverSide}
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-semibold text-foreground">{detailTitle}</p>
              <p className="mt-1.5 whitespace-pre-line text-muted-foreground">{detailBody}</p>
            </PopoverContent>
          </Popover>
        </div>

        {selected && <Check className="size-4 shrink-0 text-foreground" aria-hidden />}
      </div>

      <GateKpiTable
        metrics={metrics}
        empty={!!metricsEmpty || !metrics}
        highlightWinRate={highlightWinRate}
      />
    </div>
  );
}
