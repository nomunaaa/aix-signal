import { Progress } from '@/components/ui/progress';
import type { SignalEvaluationMock } from '@/lib/mock/symbol-detail-mock';
import { cn } from '@/lib/utils';

function PeriodCol({
  label,
  winRate,
  returnPct,
}: {
  label: string;
  winRate: number;
  returnPct: number;
}) {
  const up = returnPct >= 0;
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-2 rounded-md border border-border/50 bg-muted/10 p-3">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div>
        <div className="text-xs text-muted-foreground">승률</div>
        <div className="font-mono text-lg font-semibold tabular-nums text-foreground">{winRate}%</div>
        <Progress value={Math.min(winRate, 100)} className="mt-1 h-1.5" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">수익률</div>
        <div className={cn('font-mono text-sm tabular-nums', up ? 'text-semantic-bull' : 'text-semantic-bear')}>
          {up ? '+' : ''}
          {returnPct.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export function SignalEvaluationCard({ data }: { data: SignalEvaluationMock }) {
  return (
    <div className="flex flex-wrap gap-3">
      <PeriodCol label="24h" winRate={data.h24.winRate} returnPct={data.h24.returnPct} />
      <PeriodCol label="72h" winRate={data.h72.winRate} returnPct={data.h72.returnPct} />
    </div>
  );
}
