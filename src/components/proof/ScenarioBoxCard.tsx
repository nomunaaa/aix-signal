import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWinRate } from '@/lib/proof/format-proof';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import {
  formatPct,
  formatRatio,
  formatSignedUsd,
  hasData,
  projectedCyclePct,
  projectedCycleUsd,
  projectedPct,
  projectedUsd,
  recoveryTime,
  type ProofLanguage,
} from './proofFormat';

function Box({
  label,
  icon,
  value,
  tone,
}: {
  label: React.ReactNode;
  icon?: React.ReactNode;
  value: string;
  tone?: 'pos' | 'neg';
}) {
  return (
    <div className="flex min-h-[64px] flex-col justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          'text-right font-mono text-base font-extrabold tabular-nums leading-tight',
          tone === 'pos' && 'text-emerald-500',
          tone === 'neg' && 'text-rose-400'
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** 시뮬레이터 카드 ②의 시나리오 카드 — mockup의 .scn 6-box 그리드에 대응. */
export function ScenarioBoxCard({
  scenarioKey,
  title,
  slice,
  seed,
  entryRatio,
  leverage,
  monthlyFeeUsd,
  copy,
  language,
}: {
  scenarioKey: 'standard' | 'discounted';
  title: string;
  slice: ProofCycleStatsSlice;
  seed: number;
  entryRatio: number;
  leverage: number;
  monthlyFeeUsd: number;
  copy: ProofCopy;
  language: ProofLanguage;
}) {
  const isDiscounted = scenarioKey === 'discounted';
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
  const maxProfitPct = projectedCyclePct(
    slice.maxPnlPerEntryNotionalRate,
    seed,
    entryRatio,
    leverage
  );
  const maxLossPct = projectedCyclePct(
    slice.minPnlPerEntryNotionalRate,
    seed,
    entryRatio,
    leverage
  );

  return (
    <div
      className={cn(
        'rounded-lg border p-3.5',
        isDiscounted
          ? 'border-emerald-500/45 bg-emerald-500/[0.02]'
          : 'border-amber-400/45 bg-amber-400/[0.02]'
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-sm',
            isDiscounted ? 'bg-emerald-500' : 'bg-amber-400'
          )}
          aria-hidden
        />
        <h4 className="text-sm font-extrabold text-foreground">{title}</h4>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <Box
          label={copy.metric.winRate}
          value={present ? formatWinRate(slice.winRate) : '—'}
          tone={isDiscounted ? undefined : undefined}
        />
        <Box
          label={copy.quality.riskReward}
          value={formatRatio(slice.winLossRatio, present)}
        />
        <Box
          label={copy.metric.maxProfit}
          value={`${formatSignedUsd(maxProfitUsd, present)} (${formatPct(maxProfitPct, present)})`}
          tone="pos"
        />
        <Box
          label={copy.metric.maxLoss}
          value={`${formatSignedUsd(maxLossUsd, present)} (${formatPct(maxLossPct, present)})`}
          tone="neg"
        />
        <Box
          icon={<Clock3 className="h-3 w-3" />}
          label={copy.metric.recovery}
          value={recoveryTime(profit, monthlyFeeUsd, language)}
        />
        <Box
          label={copy.scenarios[scenarioKey].returnLabel}
          value={formatPct(pct, present)}
          tone={present ? (pct >= 0 ? 'pos' : 'neg') : undefined}
        />
        <Box
          label={copy.scenarios[scenarioKey].profitLabel}
          value={formatSignedUsd(profit, present)}
          tone={present ? (profit >= 0 ? 'pos' : 'neg') : undefined}
        />
      </div>
    </div>
  );
}
