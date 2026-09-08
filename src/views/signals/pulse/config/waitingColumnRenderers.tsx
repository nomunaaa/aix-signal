/**
 * 신호대기 전용 얇은 셀 렌더러 — sectionColumnDefs 분리(100줄 규칙)
 */
import type { ICellRendererParams } from 'ag-grid-community';
import type { WaitingSignal } from '../types/pulse.types';
import { cn } from '@/lib/utils';
import { formatHoldingTime } from '../utils/formatters';

export function WaitingFiveRecordRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const w = d.recentFiveWins ?? 0;
  const l = d.recentFiveLosses ?? 0;
  return (
    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
      {w}승 {l}패
    </span>
  );
}

export function WaitingTrustGradeRenderer(params: ICellRendererParams<WaitingSignal>) {
  const g = params.data?.trustGrade;
  if (!g) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span
      className={cn(
        'inline-flex min-w-[1.5rem] items-center justify-center rounded border px-1.5 py-0.5 text-[10px] font-bold',
        g === 'S' && 'border-amber-500/40 bg-amber-500/15 text-amber-300',
        g === 'A' && 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
        g === 'B' && 'border-sky-500/35 bg-sky-500/10 text-sky-300',
        g === 'C' && 'border-muted-foreground/40 bg-muted/40 text-muted-foreground',
      )}
    >
      {g}
    </span>
  );
}

export function WaitingHoldMinutesRenderer(params: ICellRendererParams<WaitingSignal>) {
  const m = params.data?.lastHoldMinutes;
  if (m === undefined || m === null) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
      {formatHoldingTime(m)}
    </span>
  );
}
