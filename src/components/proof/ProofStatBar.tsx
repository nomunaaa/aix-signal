import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ProofCycleStatsSlice, ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import { formatWinRate } from '@/lib/proof/format-proof';
import type { ProofCopy } from './proofCopy';
import {
  formatPct,
  formatRatio,
  formatSignedUsd,
  hasData,
  projectedCycleUsd,
  projectedPct,
  projectedUsd,
} from './proofFormat';

const STAT_LABEL_PARTS: Record<string, string[]> = {
  'Account Profit': ['Account', 'Profit'],
  'Account P/L Ratio': ['Account', 'P/L Ratio'],
};

function StatLabel({ label }: { label: string }) {
  const parts = STAT_LABEL_PARTS[label] ?? [label];

  return (
    <span className="flex min-w-0 flex-col text-[10px] font-medium leading-tight text-muted-foreground">
      {parts.map((part) => (
        <span key={part} className="truncate">
          {part}
        </span>
      ))}
    </span>
  );
}

function StatItem({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5 px-1.5">
      <StatLabel label={label} />
      <span
        className={cn(
          'whitespace-nowrap font-mono text-sm font-extrabold tabular-nums',
          tone === 'pos' && 'text-emerald-500',
          tone === 'neg' && 'text-rose-400'
        )}
      >
        {value}
      </span>
    </span>
  );
}

function StatColumn({
  title,
  rows,
  slicePicker,
  seed,
  entryRatio,
  leverage,
  copy,
}: {
  title: string;
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  slicePicker: (row: ProofTotalStatsRow) => ProofCycleStatsSlice;
  seed: number;
  entryRatio: number;
  leverage: number;
  copy: ProofCopy;
}) {
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-center text-xs font-extrabold text-foreground">
        {title}
      </div>
      <div className="grid grid-cols-2 divide-x divide-border">
        {rows.map((row) => {
          const slice = slicePicker(row);
          const present = hasData(slice);
          const pct = projectedPct(slice, seed, entryRatio, leverage);
          const profit = projectedUsd(slice, seed, entryRatio, leverage);
          const maxProfitUsd = projectedCycleUsd(
            slice.maxPnlPerEntryNotionalRate,
            seed,
            entryRatio,
            leverage
          );
          const maxLossUsd = projectedCycleUsd(
            slice.minPnlPerEntryNotionalRate,
            seed,
            entryRatio,
            leverage
          );
          const isDiscounted = row.key === 'discounted';
          return (
            <div key={row.key} className="min-w-0 overflow-x-auto px-2 py-2">
              <div
                className={cn(
                  'mb-1.5 rounded px-1.5 py-0.5 text-center text-[11px] font-extrabold',
                  isDiscounted
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                )}
              >
                {copy.table[row.key]}
              </div>
              <div className="flex items-center justify-between gap-1">
                <StatItem
                  label={copy.metric.winRate}
                  value={present ? formatWinRate(slice.winRate) : '—'}
                />
                <StatItem
                  label={copy.metric.maxProfit}
                  value={formatSignedUsd(maxProfitUsd, present)}
                  tone="pos"
                />
                <StatItem
                  label={copy.metric.maxLoss}
                  value={formatSignedUsd(maxLossUsd, present)}
                  tone="neg"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-dashed border-border pt-1.5">
                <StatItem
                  label={copy.table.pnlPct}
                  value={formatPct(pct, present)}
                  tone={present ? (pct >= 0 ? 'pos' : 'neg') : undefined}
                />
                <StatItem
                  label={copy.table.accountProfit}
                  value={formatSignedUsd(profit, present)}
                  tone={present ? (profit >= 0 ? 'pos' : 'neg') : undefined}
                />
                <StatItem
                  label={copy.table.accountRatio}
                  value={formatRatio(slice.winLossRatio, present)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 스크롤 시 표시되는 축약형 통계 바 — 기간별 일반·할인적용 요약. */
export function ProofStatBar({
  rows,
  seed,
  entryRatio,
  leverage,
  copy,
  stickyTopOffsetPx,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  seed: number;
  entryRatio: number;
  leverage: number;
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
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <StatColumn
          title={copy.table.recent30}
          rows={rows}
          slicePicker={(row) => row.recent30}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          copy={copy}
        />
        <StatColumn
          title={copy.table.recent3mo}
          rows={rows}
          slicePicker={(row) => row.recent3mo}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          copy={copy}
        />
      </div>
    </div>
  );
}
