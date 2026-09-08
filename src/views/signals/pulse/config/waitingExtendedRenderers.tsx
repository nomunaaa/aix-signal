/**
 * 신호대기 확장 칼럼 렌더러 — 스파크/7d/5전 도트 등
 */
import type { ICellRendererParams } from 'ag-grid-community';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { WaitingSignal } from '../types/pulse.types';
import { cn } from '@/lib/utils';
import { formatDuration, formatHoldingTime, formatPercent } from '../utils/formatters';
import { WaitingSparklineCell } from '../components/WaitingSparklineCell';
import { WaitingElapsedLive } from '../components/WaitingElapsedLive';

export function WaitingSparklineRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const side = d.direction ?? 'long';
  return <WaitingSparklineCell data={d.sparkline24h} side={side} />;
}

export function WaitingRecentSideRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  if (d.direction !== 'long' && d.direction !== 'short') {
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  }
  const long = d.direction !== 'short';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-semibold text-xs',
        long ? 'text-emerald-500' : 'text-rose-500',
      )}
    >
      {long ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />}
      {long ? 'LONG' : 'SHORT'}
    </span>
  );
}

export function WaitingFiveDotsRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const list = d.recent5WinsList;
  if (list && list.length === 5) {
    return (
      <span className="flex justify-center gap-0.5 font-mono text-[10px] tabular-nums">
        {list.map((win, i) => (
          <span
            key={i}
            className={win ? 'text-emerald-500' : 'text-rose-500'}
            aria-label={win ? '승' : '패'}
          >
            ●
          </span>
        ))}
      </span>
    );
  }
  const w = d.recentFiveWins ?? 0;
  const l = d.recentFiveLosses ?? 0;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {w}승 {l}패
    </span>
  );
}

export function WaitingFivePnlsRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const pnls = d.recent5PnlsPct;
  if (!pnls || pnls.length !== 5) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="max-w-[140px] truncate font-mono text-[10px] leading-tight text-muted-foreground tabular-nums">
      {pnls.map((p, i) => (
        <span key={i} className={cn(p >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
          {i > 0 ? '/' : ''}
          {p > 0 ? '+' : ''}
          {p.toFixed(1)}%
        </span>
      ))}
    </span>
  );
}

/** 최근 5전 승률 (%) */
export function WaitingFiveWinRatePctRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const sampleSize = d.recent5WinsList?.length ?? ((d.recentFiveWins ?? 0) + (d.recentFiveLosses ?? 0));
  if (sampleSize <= 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const w = d.recentFiveWins ?? d.recent5WinsList?.filter(Boolean).length ?? 0;
  const pct = (w / sampleSize) * 100;
  return (
    <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
      {pct.toFixed(0)}%
    </span>
  );
}

/** 5전 누적 수익률(통합) — 5회 % 합산 */
export function WaitingFivePnlIntegratedRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const pnls = d.recent5PnlsPct;
  if (!pnls || pnls.length === 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const sum = pnls.reduce((a, b) => a + b, 0);
  return (
    <span className={cn('font-mono text-xs font-semibold tabular-nums', sum >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
      {sum >= 0 ? '+' : ''}
      {sum.toFixed(1)}%
    </span>
  );
}

/**
 * 7일 기준 평균 신호 간격(avgWaitingSec) 대비, 마지막 청산 이후 경과(waitingSec)를 빼 잔여 예상 대기.
 */
export function WaitingExpectedRemainRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const avg = d.avgWaitingSec ?? 0;
  const elapsed = d.waitingSec ?? 0;
  const remainSec = Math.max(0, avg - elapsed);
  const m = Math.ceil(remainSec / 60);
  if (avg <= 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  if (remainSec <= 60) {
    return <span className="whitespace-nowrap font-mono text-xs text-amber-500">곧</span>;
  }
  return (
    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-foreground" title="7일 평균 간격 기준 잔여(분)">
      ~{m}분
    </span>
  );
}

export function WaitingDurationLiveRenderer(params: ICellRendererParams<WaitingSignal>) {
  const d = params.data;
  if (!d) return null;
  const exitIso = d.lastExitTimeIso ?? d.lastCloseTime;
  return <WaitingElapsedLive exitIso={exitIso} />;
}

export function WaitingAvgGapRenderer(params: ICellRendererParams<WaitingSignal>) {
  const sec = params.data?.avgWaitingSec;
  if (sec === undefined || sec === null) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
      {formatDuration(sec)}
    </span>
  );
}

export function WinRate7dRenderer(params: ICellRendererParams<WaitingSignal>) {
  const r = params.data?.winRate7d;
  if (r === undefined || r === null) {
    const legacy = params.data?.weeklyWinRate;
    if (legacy === undefined) return <span className="text-muted-foreground">{'\u2014'}</span>;
    return <span className="font-mono text-xs tabular-nums">{legacy.toFixed(0)}%</span>;
  }
  const pct = r * 100;
  const tier = pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'rose';
  return (
    <span
      className={cn(
        'font-mono text-xs font-semibold tabular-nums',
        tier === 'emerald' && 'text-emerald-500',
        tier === 'amber' && 'text-amber-500',
        tier === 'rose' && 'text-rose-500',
      )}
    >
      {pct.toFixed(0)}%
    </span>
  );
}

export function Grade7dRenderer(params: ICellRendererParams<WaitingSignal>) {
  const g = params.data?.grade7d ?? params.data?.trustGrade;
  if (!g) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] font-bold text-foreground">
      {g}
    </span>
  );
}

export function Pnl7dRenderer(params: ICellRendererParams<WaitingSignal>) {
  const v = params.data?.pnl7dPct ?? params.data?.weeklyReturnRate;
  if (v === undefined || v === null) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className={cn('font-mono text-xs font-semibold tabular-nums', v >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
      {formatPercent(v)}
    </span>
  );
}

export function HoldSec7dRenderer(params: ICellRendererParams<WaitingSignal>) {
  const sec = params.data?.avgHoldSec7d;
  if (sec === undefined || sec === null) {
    const legacy = params.data?.avgCycleTime;
    return <span className="text-xs text-muted-foreground">{legacy ?? '\u2014'}</span>;
  }
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground tabular-nums">
      {formatHoldingTime(sec / 60)}
    </span>
  );
}
