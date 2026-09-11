/**
 * 사이클당 4전략 비교 — 히스토리 인라인 / 드로어(sheet) 공통
 */
import { Crown, X } from 'lucide-react';
import type {
  CycleStrategyCompareKey,
  StrategyVariantCompare,
} from '@/views/signals/pulse/types/pulse.types';
import { STRATEGY_BORDER_L_CLASS, STRATEGY_LABEL_KO } from '@/lib/strategy-display';
import { formatPriceWithFixedDecimals, formatSignedDollarAmount } from '@/lib/format-price';
import { formatPercent } from '@/views/signals/pulse/utils/formatters';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const LABEL: Record<CycleStrategyCompareKey, string> = STRATEGY_LABEL_KO;
const BORDER: Record<CycleStrategyCompareKey, string> = STRATEGY_BORDER_L_CLASS;
const HISTORY_PNL_FRACTION_DIGITS = 1;

export interface CycleStrategyCardsProps {
  strategies: StrategyVariantCompare[];
  layout: 'inline' | 'sheet';
  highlightBest?: boolean;
  onClose?: () => void;
  className?: string;
}

export function CycleStrategyCards({
  strategies,
  layout,
  highlightBest = true,
  onClose,
  className,
}: CycleStrategyCardsProps) {
  const sorted = [...strategies].sort((a, b) => b.pnlUsd - a.pnlUsd);
  const bestKey = highlightBest && sorted[0] ? sorted[0].key : null;

  const pad = layout === 'sheet' ? 'px-4 pb-6' : 'px-2 py-2';

  return (
    <div className={cn('space-y-2', pad, className)}>
      {onClose ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <ul className="space-y-2">
        {sorted.map((row) => {
          const isBest = row.key === bestKey;
          const chain = formatPriceChain(row);
          const signedUsd = formatSignedDollarAmount(row.pnlUsd, {
            positiveSign: true,
            fractionDigits: HISTORY_PNL_FRACTION_DIGITS,
          });
          return (
            <li
              key={row.key}
              className={cn(
                'rounded-lg border border-l-4 border-border/60 bg-card/50 py-2.5 pl-3 pr-3',
                BORDER[row.key]
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      {LABEL[row.key]}
                    </span>
                    {isBest ? (
                      <Crown
                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-label="최고 수익"
                      />
                    ) : null}
                  </div>
                  <p className="break-words font-mono text-[11px] leading-snug text-muted-foreground">
                    {chain}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      'font-mono text-sm font-bold tabular-nums',
                      row.pnlPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {formatPercent(row.pnlPct, HISTORY_PNL_FRACTION_DIGITS)}
                  </span>
                  <div className="font-mono text-xs tabular-nums text-muted-foreground">
                    {signedUsd}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatPriceChain(v: StrategyVariantCompare): string {
  const fmt = (n: number) => formatPriceWithFixedDecimals(n);
  const parts: string[] = [fmt(v.entryPrice)];
  if (v.dcaPrice != null) parts.push(fmt(v.dcaPrice));
  if (v.partialExitPrice != null) parts.push(fmt(v.partialExitPrice));
  parts.push(fmt(v.exitPrice));
  return parts.join(' → ');
}
