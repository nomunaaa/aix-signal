/**
 * Zone 6 — 심볼 이벤트 피드 한 줄
 */
import { symbolFeedKindLabel, type SymbolFeedEventRow, type SymbolFeedEventKind } from '@/lib/mock/symbol-event-feed-mock';
import { cn } from '@/lib/utils';

function kindTone(kind: SymbolFeedEventKind): string {
  if (kind === 'signal_cycle') return 'border-l-primary/60 bg-primary/5';
  if (kind === 'price_tick') return 'border-l-info/50 bg-muted/10';
  return 'border-l-violet-500/40 bg-muted/10';
}

export function Zone6EventFeedRow({ row }: { row: SymbolFeedEventRow }) {
  const t = new Date(row.atMs).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <li className={cn('rounded-md border border-l-4 border-border/40 py-2 pl-3 pr-2', kindTone(row.kind))}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{t}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{symbolFeedKindLabel(row.kind)}</span>
      </div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{row.title}</div>
      <div className="text-[11px] text-muted-foreground">{row.detail}</div>
    </li>
  );
}
