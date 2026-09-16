import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProofCycleStatsSlice, ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import { formatWinRate } from '@/lib/proof/format-proof';
import type { ProofCopy } from './proofCopy';
import { combineProofCycleStats, formatRatio } from './proofFormat';

function StatItem({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'warn' }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 px-3 text-center">
      <span className="truncate text-xs font-bold text-muted-foreground sm:text-sm">{label}</span>
      <span
        className={cn(
          'truncate whitespace-nowrap font-mono text-xl font-black tabular-nums sm:text-2xl',
          tone === 'pos' && 'text-emerald-500',
          tone === 'warn' && 'text-amber-500'
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatColumn({
  title,
  rows,
  slicePicker,
  copy,
}: {
  title: string;
  rows: readonly ProofTotalStatsRow[];
  slicePicker: (row: ProofTotalStatsRow) => ProofCycleStatsSlice;
  copy: ProofCopy;
}) {
  const slice = combineProofCycleStats(rows.map(slicePicker));
  const present = slice.cycleCount > 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-3 py-2 text-center text-sm font-black text-foreground">
        {title}
      </div>
      <div className="grid grid-cols-3 divide-x divide-border py-3">
        <StatItem
          label={copy.table.entries}
          value={present ? slice.cycleCount.toLocaleString('en-US') : '—'}
        />
        <StatItem
          label={copy.metric.winRate}
          value={present ? formatWinRate(slice.winRate) : '—'}
          tone="pos"
        />
        <StatItem
          label={copy.quality.riskReward}
          value={formatRatio(slice.winLossRatio, present)}
          tone="warn"
        />
      </div>
    </div>
  );
}

/** Scroll үед Standard + Discounted нийлбэрээр харуулах 3-KPI статистик бар. */
export function ProofStatBar({
  rows,
  copy,
  stickyTopOffsetPx,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  copy: ProofCopy;
  stickyTopOffsetPx: number;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!scrolled) return null;

  return (
    <div
      className="sticky z-30 -mx-4 border-b border-border bg-background/95 px-4 py-2 shadow-md backdrop-blur duration-200 animate-in fade-in slide-in-from-top-1 md:-mx-5 md:px-5"
      style={{ top: `calc(var(--header-height) + ${stickyTopOffsetPx}px)` }}
    >
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <StatColumn
          title={copy.table.recent30}
          rows={rows}
          slicePicker={(row) => row.recent30}
          copy={copy}
        />
        <StatColumn
          title={copy.table.recent3mo}
          rows={rows}
          slicePicker={(row) => row.recent3mo}
          copy={copy}
        />
        <StatColumn
          title={copy.table.cumulative}
          rows={rows}
          slicePicker={(row) => row.total}
          copy={copy}
        />
      </div>
    </div>
  );
}
