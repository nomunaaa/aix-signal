import type { MyProfitsSummary } from '@/lib/my/fetch-profits';

interface Props {
  summary: MyProfitsSummary;
}

const PERIOD_LABEL: Record<MyProfitsSummary['period'], string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '90일',
  all: '전체',
};

function fmt(usd: number): string {
  const sign = usd >= 0 ? '+' : '';
  return `${sign}${usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`;
}

function PnlValue({ value }: { value: number }) {
  const colorClass = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-muted-foreground';
  return <span className={`font-mono text-sm font-semibold ${colorClass}`}>{fmt(value)}</span>;
}

export function ProfitsKpiBar({ summary }: Props) {
  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">{PERIOD_LABEL[summary.period]} 손익</span>
        <PnlValue value={summary.periodPnlUsd} />
      </div>

      <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">{PERIOD_LABEL[summary.period]} 거래</span>
        <span className="font-mono text-sm font-semibold text-foreground">{summary.periodTradeCount}건</span>
      </div>

      <div className="flex flex-col gap-0.5 rounded-md border border-border bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">{PERIOD_LABEL[summary.period]} 승률</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {(summary.periodWinRate * 100).toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-col gap-0.5 rounded-md border border-primary/40 bg-card px-3 py-2">
        <span className="text-xs text-muted-foreground">총 누적 손익 (전체 기간)</span>
        <PnlValue value={summary.totalPnlUsd} />
      </div>
    </div>
  );
}
