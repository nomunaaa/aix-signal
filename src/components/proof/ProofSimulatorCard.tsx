import type { ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import { combineProofCycleStats, type ProofLanguage } from './proofFormat';
import { ExpectedReturnDashboard } from './ExpectedReturnDashboard';

export function ProofSimulatorCard({
  rows,
  seed,
  entryRatio,
  leverage,
  copy,
  language,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  seed: number;
  entryRatio: number;
  leverage: number;
  copy: ProofCopy;
  language: ProofLanguage;
}) {
  const recent30 = combineProofCycleStats(rows.map((row) => row.recent30));
  const recent3mo = combineProofCycleStats(rows.map((row) => row.recent3mo));
  const total = combineProofCycleStats(rows.map((row) => row.total));

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <ExpectedReturnDashboard
        language={language}
        period={copy.simulator.basisRecent30}
        slice={recent30}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
      />
      <ExpectedReturnDashboard
        language={language}
        period={copy.simulator.basisRecent3mo}
        slice={recent3mo}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
      />
      <ExpectedReturnDashboard
        language={language}
        period={copy.simulator.basisTotal}
        slice={total}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
      />
    </div>
  );
}
