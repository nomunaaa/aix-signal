import { cn } from '@/lib/utils';
import { formatPriceWithDollar } from '@/lib/format-price';
import type { StrategyVariant, StrategyVariantId } from '@/types/cycleStrategyDrawer';

const BORDER: Record<StrategyVariantId, string> = {
  original: 'border-l-teal-500',
  variant_dca: 'border-l-amber-500',
  variant_partial: 'border-l-purple-500',
  variant_both: 'border-l-rose-500',
};

export function StrategyVariantCard({
  v,
  rank,
  showCrown,
}: {
  v: StrategyVariant;
  rank: number;
  showCrown: boolean;
}) {
  const pos = v.pnlPercent >= 0;
  return (
    <div
      className={cn(
        'relative rounded-lg border border-border/50 bg-card/40 pl-3',
        BORDER[v.id]
      )}
    >
      <div className="flex flex-col gap-1 py-2.5 pr-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-foreground">
            {rank}. {v.labelKo}
            {showCrown ? <span className="ml-1" aria-label="최고 PnL">👑</span> : null}
          </span>
          <span
            className={cn(
              'font-mono text-sm font-bold tabular-nums',
              pos ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {pos ? '+' : ''}
            {v.pnlPercent.toFixed(2)}%
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
          <span>
            PnL {pos ? '+' : ''}
            {formatPriceWithDollar(v.pnlUsd, { variant: 'tableCell' })}
          </span>
          {v.hasDca ? <span className="text-amber-400/90">물타기</span> : null}
          {v.hasPartial ? <span className="text-violet-400/90">분할청산</span> : null}
        </div>
        {v.note ? <p className="text-[10px] leading-snug text-muted-foreground">{v.note}</p> : null}
      </div>
    </div>
  );
}
