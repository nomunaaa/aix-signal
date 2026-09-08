import { Link } from '@/lib/navigation-compat';
import { cn } from '@/lib/utils';
import type { CycleHistorySummaryMock } from '@/lib/mock/symbol-detail-mock';
import { zoneChartHref } from '@/lib/symbol-detail/zone-nav-href';

export function CycleHistoryCard({ symbol, data }: { symbol: string; data: CycleHistorySummaryMock }) {
  const chartHref = zoneChartHref(symbol);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-foreground">이전 사이클 (최근 5전)</h3>
        <Link
          to={chartHref}
          className="shrink-0 text-xs font-medium text-primary hover:underline"
        >
          라이브 사이클 차트에서 보기 →
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          {data.wins}승 {data.losses}패
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {data.dots.map((d, i) => (
          <span
            key={`${d.label}-${i}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              d.win ? 'bg-semantic-bull' : 'border-2 border-semantic-bear bg-transparent',
            )}
            aria-hidden
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: '수익률', v: `+${data.aggReturnPct.toFixed(1)}%` },
          { label: '승률', v: `${data.aggWinRate}%` },
          { label: 'PnL', v: `+$${data.pnlUsd}` },
          { label: '신뢰도', v: String(data.confidence) },
        ].map((x) => (
          <div key={x.label} className="rounded-md border border-border/40 bg-muted/10 px-2 py-1.5">
            <div className="text-[10px] text-muted-foreground">{x.label}</div>
            <div className="font-mono text-sm tabular-nums text-foreground">{x.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
