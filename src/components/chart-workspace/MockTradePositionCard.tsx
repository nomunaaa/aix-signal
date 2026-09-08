/**
 * 모의매매 진입 중 포지션 카드 — useMockTrade의 기존 진입/청산/추가진입/분할청산 로직을
 * 그대로 사용하고, MockTradeDesktop의 낡은 UI만 새 디자인으로 교체한 것.
 */
import { formatPrice } from '@/lib/formatPrice';
import { CoinIcon } from '@/components/signals/CoinIcon';
import { formatSymbolPair } from '@/views/signals/pulse/utils/formatters';

export interface MockTradePositionCardProps {
  readonly symbol: string;
  readonly direction: 'long' | 'short';
  readonly entryPrice: number | null;
  readonly exitReferencePrice: number | null;
  readonly profitPct: number | null;
  readonly remainingPct: number;
  readonly realizedPnlUsd: number;
  readonly exitLocked: boolean;
  readonly saving: boolean;
  readonly lastPrice: number | null;
  readonly onAddEntry: () => void;
  readonly onPartialClose: (pct: number) => void;
  readonly onCloseAll: () => void;
}

export function MockTradePositionCard({
  symbol,
  direction,
  entryPrice,
  exitReferencePrice,
  profitPct,
  remainingPct,
  realizedPnlUsd,
  exitLocked,
  saving,
  lastPrice,
  onAddEntry,
  onPartialClose,
  onCloseAll,
}: MockTradePositionCardProps) {
  const isLong = direction === 'long';
  const isUp = (profitPct ?? 0) >= 0;
  const tone = isUp ? 'text-[hsl(var(--pnl-up))]' : 'text-[hsl(var(--pnl-down))]';

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
        <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
          <CoinIcon symbol={symbol} size={16} className="shrink-0" />
          <span className="font-mono">{formatSymbolPair(symbol)}</span>
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">진입 중</span>
      </div>

      <div className="flex items-center justify-between py-1 text-[13px]">
        <span className="text-muted-foreground">진입가</span>
        <span className="font-mono font-bold tabular-nums text-foreground">
          {entryPrice != null ? formatPrice(entryPrice) : '—'}
        </span>
      </div>
      <div className="flex items-center justify-between py-1 text-[13px]">
        <span className="text-muted-foreground">현재가</span>
        <span className="font-mono font-bold tabular-nums text-foreground">
          {exitReferencePrice != null ? formatPrice(exitReferencePrice) : '—'}
        </span>
      </div>
      <div className="flex items-center justify-between py-1 text-[13px]">
        <span className="text-muted-foreground">수익률</span>
        <span className={`font-mono font-bold tabular-nums ${tone}`}>
          {profitPct != null ? `${isUp ? '+' : ''}${profitPct.toFixed(2)}%` : '—'}
        </span>
      </div>

      {remainingPct < 100 && (
        <div className="mt-1.5 rounded-md bg-muted/40 py-1.5 text-center text-[11.5px] text-muted-foreground">
          잔여 {remainingPct}% · 확정손익 {formatPrice(realizedPnlUsd)}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onAddEntry}
          disabled={!lastPrice || saving}
          className="flex-1 rounded-lg border border-border bg-muted/40 py-2 text-xs font-bold text-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          추가진입
        </button>
        <button
          type="button"
          onClick={() => onPartialClose(50)}
          disabled={!entryPrice || !lastPrice || exitLocked || saving || remainingPct <= 0}
          className="flex-1 rounded-lg border border-border bg-muted/40 py-2 text-xs font-bold text-foreground transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          50% 청산
        </button>
        <button
          type="button"
          onClick={onCloseAll}
          disabled={!entryPrice || !lastPrice || exitLocked || saving}
          className="flex-1 rounded-lg bg-[hsl(var(--pnl-down))] py-2 text-xs font-bold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          전체청산
        </button>
      </div>
    </div>
  );
}
