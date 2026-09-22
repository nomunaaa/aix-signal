import type { ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import type { ProofLanguage } from './proofFormat';
import { ExpectedReturnDashboard } from './ExpectedReturnDashboard';
import { RiskAnalysisPanel, RiskAnalysisPanelSkeleton } from './RiskAnalysisPanel';
import type { RiskAnalysisByPeriod } from '@/lib/proof/risk-analysis';

export function ProofSimulatorCard({
  rows,
  seed,
  entryRatio,
  leverage,
  copy,
  language,
  risk,
  riskLoading = false,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  seed: number;
  entryRatio: number;
  leverage: number;
  copy: ProofCopy;
  language: ProofLanguage;
  /** 아직 로딩 중이면 undefined — 그동안 리스크 패널은 그리지 않는다. */
  risk?: RiskAnalysisByPeriod;
  riskLoading?: boolean;
}) {
  // rows[0]/rows[1] (standard/discounted) are two accounting bases over the SAME
  // closed cycles, not two disjoint trade sets — summing them (as this used to)
  // double-counted cycleCount, e.g. showing "56 entries" when only 28 trades
  // closed. Use the standard basis, matching what the symbol table below sums to.
  const [standardRow] = rows;
  const recent30 = standardRow.recent30;
  const recent3mo = standardRow.recent3mo;
  const total = standardRow.total;

  const columns = [
    { period: copy.simulator.basisRecent30, slice: recent30, risk: risk?.recent30 },
    { period: copy.simulator.basisRecent3mo, slice: recent3mo, risk: risk?.recent3mo },
    { period: copy.simulator.basisTotal, slice: total, risk: risk?.total },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {columns.map((column) => (
        <div key={column.period} className="flex min-w-0 flex-col gap-3">
          <ExpectedReturnDashboard
            language={language}
            period={column.period}
            slice={column.slice}
            seed={seed}
            entryRatio={entryRatio}
            leverage={leverage}
          />
          {column.risk ? (
            <RiskAnalysisPanel
              result={column.risk}
              seed={seed}
              entryRatio={entryRatio}
              leverage={leverage}
              language={language}
            />
          ) : riskLoading ? (
            <RiskAnalysisPanelSkeleton />
          ) : null}
        </div>
      ))}
    </div>
  );
}
