/**
 * Zone 5 — 클릭 가능한 최근 사이클 줄 → 드로어 트리거 (SRD-002 v5)
 */
import { cn } from '@/lib/utils';
import { getCellStyle } from '@/lib/color-scale';
import type { CycleBarMock } from '@/lib/mock/symbol-detail-mock';

export function Zone5CycleStrip({
  cycles,
  onSelect,
}: {
  cycles: CycleBarMock[];
  onSelect: (index: number) => void;
}) {
  const row = cycles.slice(0, 8);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">사이클 선택 (전략)</h3>
      <div className="flex flex-col gap-1">
        {row.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              'flex min-h-[44px] w-full items-center gap-2 rounded-md border border-border/50 bg-muted/5 px-2 py-1.5 text-left text-[11px]',
              'transition-colors hover:bg-muted/20',
            )}
          >
            <span
              className={cn(
                'w-11 shrink-0 font-mono font-bold',
                c.dir === 'LONG' ? 'text-semantic-bull' : 'text-semantic-bear',
              )}
            >
              {c.dir}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-muted/40">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${Math.min(Math.abs(c.pnlPct) * 10, 100)}%`,
                  backgroundColor: getCellStyle(c.pnlPct, 'positive_good').backgroundColor,
                }}
              />
            </div>
            <span
              className={cn(
                'w-11 shrink-0 text-right font-mono tabular-nums font-semibold',
                getCellStyle(c.pnlPct, 'positive_good').textClass,
              )}
            >
              {c.pnlPct >= 0 ? '+' : ''}
              {c.pnlPct.toFixed(1)}%
            </span>
            <span className="w-10 shrink-0 text-right text-muted-foreground">{c.holdMin}분</span>
          </button>
        ))}
      </div>
    </div>
  );
}
