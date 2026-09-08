import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CycleDrawerCycle } from '@/types/cycleStrategyDrawer';
import { formatPriceWithDollar } from '@/lib/format-price';
import { formatMmDdSlashHm } from '@/lib/format-cycle-times';
import { formatSymbolPair } from '@/views/signals/pulse/utils/formatters';

export function CycleStrategyHeader({ cycle }: { cycle: CycleDrawerCycle }) {
  const long = cycle.direction === 'long';
  return (
    <div className="space-y-2 border-b border-border/50 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold text-foreground">
          {formatSymbolPair(cycle.symbol)}
        </span>
        <Badge
          variant={long ? 'default' : 'destructive'}
          className={cn(
            'text-[10px] font-semibold',
            long ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
          )}
        >
          {long ? 'LONG' : 'SHORT'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">진입</p>
          <p className="font-mono tabular-nums text-foreground">
            {formatPriceWithDollar(cycle.entryPrice, { variant: 'tableCell' })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">청산</p>
          <p className="font-mono tabular-nums text-foreground">
            {formatPriceWithDollar(cycle.exitPrice, { variant: 'tableCell' })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">진입시각</p>
          <p className="font-mono text-xs tabular-nums text-foreground">{formatMmDdSlashHm(cycle.enteredAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">청산시각</p>
          <p className="font-mono text-xs tabular-nums text-foreground">{formatMmDdSlashHm(cycle.closedAt)}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        보유 <span className="font-mono text-foreground">{cycle.holdDurationLabel}</span>
      </p>
    </div>
  );
}
