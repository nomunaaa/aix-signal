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
  // rows[0]/rows[1] (standard/discounted) are two accounting bases over the SAME
  // closed cycles, not two disjoint trade sets — summing them (as this used to)
  // double-counted cycleCount, e.g. showing "56 entries" when only 28 trades
  // closed. Use the standard basis, matching what the symbol table below sums to.
  const [standardRow] = rows;
  const recent30 = standardRow.recent30;
  const recent3mo = standardRow.recent3mo;
  const total = standardRow.total;

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
