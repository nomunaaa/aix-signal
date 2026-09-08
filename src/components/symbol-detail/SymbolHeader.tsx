import { cn } from '@/lib/utils';
import { mockBasePriceRow } from '@/lib/mock/realistic-data';
import { krMidPositiveFillClass, krSignedValueTextClass } from '@/lib/kr-display';

export function SymbolHeader({ symbol }: { symbol: string }) {
  const row = mockBasePriceRow(symbol);
  const price = row?.price ?? 0;
  const [lo, hi] = row?.dailyRange ?? [price * 0.99, price * 1.01];
  const mid = (lo + hi) / 2;
  const ch = price - mid;
  const chPct = mid !== 0 ? (ch / mid) * 100 : 0;
  const pos = hi > lo ? Math.min(100, Math.max(0, ((price - lo) / (hi - lo)) * 100)) : 50;

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-card/30 p-3">
      <div className="flex flex-wrap items-baseline gap-2 text-sm">
        <span className="text-amber-400">★</span>
        <span className="font-mono font-bold text-foreground">{symbol}</span>
        <span className="text-muted-foreground">· Binance</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-2xl font-bold tabular-nums text-foreground">${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className={cn('font-mono text-sm', krSignedValueTextClass(ch))}>
          {ch >= 0 ? '+' : ''}${ch.toFixed(2)} ({chPct >= 0 ? '+' : ''}
          {chPct.toFixed(2)}%)
        </span>
      </div>
      <div className="space-y-1">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-all', krMidPositiveFillClass(ch >= 0))}
            style={{ width: `${pos}%` }}
          />
        </div>
        <p className="font-mono text-[11px] text-muted-foreground">
          24h ${lo.toLocaleString()} ~ ${hi.toLocaleString()}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        거래량 {row?.dailyVolume ?? '—'} · 시총 {row?.marketCap ?? '—'}
      </p>
    </div>
  );
}
