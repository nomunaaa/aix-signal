import type { ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import type { ProofLanguage } from './proofFormat';
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
  const [, discounted] = rows;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <ExpectedReturnDashboard
        language={language}
        period={copy.simulator.basisRecent30}
        slice={discounted.recent30}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
      />
      <ExpectedReturnDashboard
        language={language}
        period={copy.simulator.basisRecent3mo}
        slice={discounted.recent3mo}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
      />
    </div>
  );
}
