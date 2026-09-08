import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { krPositionSideTextClass, krSignedValueTextClass } from '@/lib/kr-display';

export interface MockOpenPosition {
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  pnlPct: number;
  pnlUsd: number;
  amountUsd: number;
  leverage: number;
  openedLabel: string;
}

export function PositionCard({ p }: { p: MockOpenPosition }) {
  const up = p.pnlPct >= 0;
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">내 활성 포지션</p>
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className={cn('font-bold', krPositionSideTextClass(p.side))}>{p.side}</span>
        <span className="text-muted-foreground">진입</span>
        <span className="font-mono text-foreground">${p.entryPrice.toLocaleString()}</span>
        <span className="text-muted-foreground">현재</span>
        <span className="font-mono text-foreground">${p.currentPrice.toLocaleString()}</span>
        <span className={cn('font-mono font-semibold', krSignedValueTextClass(p.pnlPct))}>
          {up ? '+' : ''}
          {p.pnlPct}% ({up ? '+' : ''}${p.pnlUsd.toFixed(2)})
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        ${p.amountUsd} ({p.leverage}x) · {p.openedLabel}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="h-8 text-xs">
          분할청산 50%
        </Button>
        <Button size="sm" variant="destructive" className="h-8 text-xs">
          전체청산
        </Button>
      </div>
    </div>
  );
}
