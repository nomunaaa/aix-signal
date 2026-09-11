import type { ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import type { ProofLanguage } from './proofFormat';
import { ScenarioBasisPanel } from './ScenarioBasisPanel';

export function ProofSimulatorCard({
  rows,
  seed,
  entryRatio,
  leverage,
  monthlyFeeUsd,
  yearlyFeeUsd,
  copy,
  language,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  seed: number;
  entryRatio: number;
  leverage: number;
  monthlyFeeUsd: number;
  yearlyFeeUsd: number;
  copy: ProofCopy;
  language: ProofLanguage;
}) {
  const [standard, discounted] = rows;

  return (
    <div className="rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="mb-3 text-sm font-bold text-foreground">{copy.simulator.step2Title}</div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScenarioBasisPanel
          title={copy.simulator.basisRecent30}
          standardSlice={standard.recent30}
          discountedSlice={discounted.recent30}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={monthlyFeeUsd}
          yearlyFeeUsd={yearlyFeeUsd}
          showYearProjection
          copy={copy}
          language={language}
        />
        <ScenarioBasisPanel
          title={copy.simulator.basisRecent3mo}
          standardSlice={standard.recent3mo}
          discountedSlice={discounted.recent3mo}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={monthlyFeeUsd}
          yearlyFeeUsd={yearlyFeeUsd}
          showYearProjection={false}
          copy={copy}
          language={language}
        />
      </div>
    </div>
  );
}
