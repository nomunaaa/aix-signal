import { cn } from '@/lib/utils';
import { winLossStripForSymbol } from '@/lib/mock/symbol-hub-winloss';
import type { CycleBarMock } from '@/lib/mock/symbol-detail-mock';
import { krPositionSideTextClass, krSignedBarFillClass, krSignedValueTextClass } from '@/lib/kr-display';
import type { ProofCycleBar } from '@/lib/proof-platform-aggregate';

type Bar = ProofCycleBar | CycleBarMock;

/** 심볼 목(mock 스트립) 또는 바 데이터 주입 */
export type CycleTimelineProps =
  | { symbol: string; bars?: never; title?: string }
  | { symbol?: never; bars: Bar[]; title?: string };

/** 최근 n건 수평 바 (방향 + PnL% + 보유시간) */
export function CycleTimeline(props: CycleTimelineProps) {
  const title = props.title ?? '최근 10건';

  if ('bars' in props) {
    const barList = props.bars;
    if (!barList?.length) {
      return (
        <div className="rounded-lg border border-border/50 bg-card/30 p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
          <p className="py-4 text-center text-xs text-muted-foreground">표시할 사이클이 없습니다.</p>
        </div>
      );
    }
    const pts = barList;
    return (
      <div className="rounded-lg border border-border/50 bg-card/30 p-3">
        <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {pts.map((p, i) => (
            <div key={i} className="flex min-w-[52px] flex-1 flex-col items-center gap-1">
              <span
                className={cn('text-[9px] font-bold', krPositionSideTextClass(p.dir === 'LONG' ? 'LONG' : 'SHORT'))}
              >
                {p.dir === 'LONG' ? 'L' : 'S'}
              </span>
              <div className="flex h-12 w-full max-w-[40px] flex-col justify-end rounded-sm bg-muted p-0.5">
                <div
                  className={cn('w-full rounded-sm', krSignedBarFillClass(p.pnlPct))}
                  style={{ height: `${Math.min(100, 22 + Math.abs(p.pnlPct) * 12)}%` }}
                />
              </div>
              <span className={cn('font-mono text-[9px] tabular-nums', krSignedValueTextClass(p.pnlPct))}>
                {p.pnlPct >= 0 ? '+' : ''}
                {p.pnlPct}%
              </span>
              <span className="text-[8px] text-muted-foreground">{p.holdMin}m</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const symbol = props.symbol ?? '';
  const pts = winLossStripForSymbol(symbol);
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-3">
      <p className="mb-2 text-xs font-semibold text-foreground">{title}</p>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {pts.map((p, i) => {
          const long = i % 2 === 0;
          const m = 12 + (i * 7) % 120;
          return (
            <div key={i} className="flex min-w-[52px] flex-1 flex-col items-center gap-1">
              <span className={cn('text-[9px] font-bold', krPositionSideTextClass(long ? 'LONG' : 'SHORT'))}>
                {long ? 'L' : 'S'}
              </span>
              <div className="flex h-12 w-full max-w-[40px] flex-col justify-end rounded-sm bg-muted p-0.5">
                <div
                  className={cn('w-full rounded-sm', krSignedBarFillClass(p.pnlPct))}
                  style={{ height: `${Math.min(100, 22 + Math.abs(p.pnlPct) * 12)}%` }}
                />
              </div>
              <span className={cn('font-mono text-[9px] tabular-nums', krSignedValueTextClass(p.pnlPct))}>
                {p.pnlPct >= 0 ? '+' : ''}
                {p.pnlPct}%
              </span>
              <span className="text-[8px] text-muted-foreground">{m}m</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
