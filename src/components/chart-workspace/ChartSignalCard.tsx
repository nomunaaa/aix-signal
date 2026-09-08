/**
 * 현재 종목 시그널 — 차트 워크스페이스 우측 사이드바 카드.
 * 목표가/손절가/R:R은 DB(signal_cycles·signal_events)에 없으므로 렌더하지 않는다
 * (CLAUDE.md §5.1). 실제 존재하는 필드만 표시한다.
 */
import { formatPrice } from '@/lib/formatPrice';

export interface ChartSignalCardProps {
  readonly symbol: string;
  readonly barInterval: string;
  readonly direction: 'long' | 'short' | null;
  readonly entryPrice: number | null;
  readonly confidencePct: number | null;
}

export function ChartSignalCard({
  symbol,
  barInterval,
  direction,
  entryPrice,
  confidencePct,
}: ChartSignalCardProps) {
  if (!direction || entryPrice == null) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">이 종목의 최근 시그널이 없습니다.</p>
      </div>
    );
  }

  const isLong = direction === 'long';

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={
            isLong
              ? 'rounded-md bg-[hsl(var(--pnl-up)/0.15)] px-2.5 py-1 text-xs font-extrabold text-[hsl(var(--pnl-up))]'
              : 'rounded-md bg-[hsl(var(--pnl-down)/0.15)] px-2.5 py-1 text-xs font-extrabold text-[hsl(var(--pnl-down))]'
          }
        >
          {isLong ? 'LONG' : 'SHORT'}
        </span>
        <span className="text-sm font-bold text-foreground">
          {symbol} <span className="font-normal text-muted-foreground">· {barInterval}</span>
        </span>
      </div>

      <div className="flex items-center justify-between py-1.5 text-[13px]">
        <span className="text-muted-foreground">진입가</span>
        <span className="font-mono font-bold tabular-nums text-foreground">
          {formatPrice(entryPrice)}
        </span>
      </div>

      {confidencePct != null && (
        <div className="mt-2.5 rounded-md bg-muted/40 py-1.5 text-center text-[11.5px] text-muted-foreground">
          신뢰도 {Math.round(confidencePct)}%
        </div>
      )}
    </div>
  );
}
