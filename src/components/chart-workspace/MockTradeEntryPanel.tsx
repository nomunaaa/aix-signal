/**
 * 모의매매 진입 패널 — 위쪽 시뮬레이터 설정에서 정한 비중·레버리지로 롱/숏 진입.
 * 원금은 MOCK_BASE_CAPITAL로 고정이며 증거금 = 원금 × 비중%.
 */
import { formatPrice } from '@/lib/formatPrice';
import { MOCK_BASE_CAPITAL } from '@/lib/mockTradeCapital';

export interface MockTradeEntryPanelProps {
  readonly symbol: string;
  readonly lastPrice: number | null;
  readonly pct: number;
  readonly leverage: number;
  readonly onEnter: (direction: 'long' | 'short') => void;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
}

export function MockTradeEntryPanel({
  symbol,
  lastPrice,
  pct,
  leverage,
  onEnter,
  disabled = false,
  disabledReason,
}: MockTradeEntryPanelProps) {
  const margin = Math.round((MOCK_BASE_CAPITAL * pct) / 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEnter('long')}
          className="flex-1 rounded-lg bg-[hsl(var(--pnl-up))] py-3 text-sm font-extrabold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          매수 · 롱
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onEnter('short')}
          className="flex-1 rounded-lg bg-[hsl(var(--pnl-down))] py-3 text-sm font-extrabold text-background transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          매도 · 숏
        </button>
      </div>

      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        {disabled && disabledReason
          ? disabledReason
          : `${symbol} · ${lastPrice != null ? formatPrice(lastPrice) : '—'} 진입 예정 · 증거금 ${formatPrice(margin)} · ${leverage}x`}
      </p>
    </div>
  );
}
