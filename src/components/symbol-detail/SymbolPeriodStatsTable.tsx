import { cn } from '@/lib/utils';
import type { PeriodStatsRow } from '@/lib/mock/symbol-detail-mock';

export function SymbolPeriodStatsTable({ rows }: { rows: PeriodStatsRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">지표</th>
            <th className="px-3 py-2 text-right font-mono font-semibold text-muted-foreground">1D</th>
            <th className="px-3 py-2 text-right font-mono font-semibold text-foreground bg-semantic-bull/5">7D ★</th>
            <th className="px-3 py-2 text-right font-mono font-semibold text-muted-foreground">30D</th>
            <th className="px-3 py-2 text-right font-mono font-semibold text-muted-foreground">90D</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.metric} className="border-b border-border/40">
              <td className="px-3 py-2 text-muted-foreground">{r.metric}</td>
              <td className={cn('px-3 py-2 text-right font-mono tabular-nums', cellTone(r.d1))}>{r.d1}</td>
              <td className={cn('px-3 py-2 text-right font-mono tabular-nums bg-semantic-bull/5', cellTone(r.d7))}>
                {r.d7}
              </td>
              <td className={cn('px-3 py-2 text-right font-mono tabular-nums', cellTone(r.d30))}>{r.d30}</td>
              <td className={cn('px-3 py-2 text-right font-mono tabular-nums', cellTone(r.d90))}>{r.d90}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cellTone(v: string): string {
  if (!v.includes('%')) return 'text-foreground';
  const n = parseFloat(v.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(n)) return 'text-foreground';
  if (n > 0) return 'text-semantic-bull';
  if (n < 0) return 'text-semantic-bear';
  return 'text-foreground';
}
