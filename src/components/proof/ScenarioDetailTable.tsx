import { formatWinRate } from '@/lib/proof/format-proof';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import {
  formatHoldSec,
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

interface DetailRow {
  key: string;
  label: string;
  standard: string;
  discounted: string;
  /** 위 6-box 카드와 중복되는 항목 — 기본적으로 숨긴다. */
  dup: boolean;
}

function buildRows(
  slice: ProofCycleStatsSlice,
  seed: number,
  entryRatio: number,
  leverage: number,
  monthlyFeeUsd: number,
  language: ProofLanguage
) {
  const present = hasData(slice);
  const pct = projectedPct(slice, seed, entryRatio, leverage);
  const profit = projectedUsd(slice, seed, entryRatio, leverage);
  const maxProfitUsd = projectedCycleUsd(
    slice.maxPnlPerEntryNotionalRate,
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
  const maxLossUsd = projectedCycleUsd(
    slice.minPnlPerEntryNotionalRate,
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
  return {
    entries: present ? String(slice.cycleCount) : '—',
    pnlUsd: formatSignedUsd(profit, present),
    pnlPct: formatPct(pct, present),
    maxProfit: formatSignedUsd(maxProfitUsd, present),
    maxProfitPct: formatPct(maxProfitPct, present),
    maxLoss: formatSignedUsd(maxLossUsd, present),
    maxLossPct: formatPct(maxLossPct, present),
    winRate: present ? formatWinRate(slice.winRate) : '—',
    avgRatio: formatRatio(slice.winLossRatio, present),
    avgHoldTime: formatHoldSec(slice.avgHoldSec, present, language),
    recovery: recoveryTime(profit, monthlyFeeUsd, language),
  };
}

/** 시뮬레이터 카드 ②의 세로형 상세 테이블 — 항목(행) x 일반/할인적용(열), 카드와 중복되는 항목은 접는다. */
export function ScenarioDetailTable({
  standardSlice,
  discountedSlice,
  seed,
  entryRatio,
  leverage,
  monthlyFeeUsd,
  copy,
  language,
  showAll,
}: {
  standardSlice: ProofCycleStatsSlice;
  discountedSlice: ProofCycleStatsSlice;
  seed: number;
  entryRatio: number;
  leverage: number;
  monthlyFeeUsd: number;
  copy: ProofCopy;
  language: ProofLanguage;
  showAll: boolean;
}) {
  const standard = buildRows(standardSlice, seed, entryRatio, leverage, monthlyFeeUsd, language);
  const discounted = buildRows(
    discountedSlice,
    seed,
    entryRatio,
    leverage,
    monthlyFeeUsd,
    language
  );

  const rows: DetailRow[] = [
    {
      key: 'entries',
      label: copy.table.entries,
      standard: standard.entries,
      discounted: discounted.entries,
      dup: false,
    },
    {
      key: 'pnlUsd',
      label: copy.table.pnlUsd,
      standard: standard.pnlUsd,
      discounted: discounted.pnlUsd,
      dup: true,
    },
    {
      key: 'pnlPct',
      label: copy.table.pnlPct,
      standard: standard.pnlPct,
      discounted: discounted.pnlPct,
      dup: true,
    },
    {
      key: 'maxProfit',
      label: copy.table.maxProfit,
      standard: standard.maxProfit,
      discounted: discounted.maxProfit,
      dup: true,
    },
    {
      key: 'maxProfitPct',
      label: copy.table.maxProfitPct,
      standard: standard.maxProfitPct,
      discounted: discounted.maxProfitPct,
      dup: true,
    },
    {
      key: 'maxLoss',
      label: copy.table.maxLoss,
      standard: standard.maxLoss,
      discounted: discounted.maxLoss,
      dup: true,
    },
    {
      key: 'maxLossPct',
      label: copy.table.maxLossPct,
      standard: standard.maxLossPct,
      discounted: discounted.maxLossPct,
      dup: true,
    },
    {
      key: 'winRate',
      label: copy.table.avgWinRate,
      standard: standard.winRate,
      discounted: discounted.winRate,
      dup: true,
    },
    {
      key: 'avgRatio',
      label: copy.table.avgRatio,
      standard: standard.avgRatio,
      discounted: discounted.avgRatio,
      dup: false,
    },
    {
      key: 'avgHoldTime',
      label: copy.table.avgHoldTime,
      standard: standard.avgHoldTime,
      discounted: discounted.avgHoldTime,
      dup: false,
    },
    {
      key: 'recovery',
      label: copy.table.recovery,
      standard: standard.recovery,
      discounted: discounted.recovery,
      dup: true,
    },
  ];

  const visibleRows = showAll ? rows : rows.filter((row) => !row.dup);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full table-fixed border-collapse text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="w-[44%] px-3 py-2 text-left font-extrabold text-foreground">
              {copy.table.category}
            </th>
            <th className="px-3 py-2 text-right font-bold text-amber-600 dark:text-amber-400">
              {copy.table.standard}
            </th>
            <th className="px-3 py-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
              {copy.table.discounted}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {visibleRows.map((row) => (
            <tr key={row.key} className="hover:bg-muted/30">
              <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                {row.standard}
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                {row.discounted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
