import type { ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import type { ProofLanguage } from './proofFormat';
import { ExpectedReturnDashboard } from './ExpectedReturnDashboard';
import { RiskAnalysisPanel } from './RiskAnalysisPanel';
import { emptyRiskAnalysis, type RiskAnalysisByPeriod } from '@/lib/proof/risk-analysis';

export function ProofSimulatorCard({
  rows,
  seed,
  entryRatio,
  leverage,
  copy,
  language,
  risk,
}: {
  rows: [ProofTotalStatsRow, ProofTotalStatsRow];
  seed: number;
  entryRatio: number;
  leverage: number;
  copy: ProofCopy;
  language: ProofLanguage;
  /** 아직 값이 없으면 undefined — 패널은 그대로 두고 '—'로 그린다. */
  risk?: RiskAnalysisByPeriod;
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
          {/* 위쪽 기간 카드들과 같이 자리를 항상 지킨다. 조건부로 넣고 빼면 데이터가
              도착하는 순간 패널이 튀어나오면서 아래 내용이 밀린다. 값이 없을 때는
              패널이 스스로 '—'를 그리므로 빈 결과만 넘기면 된다. */}
          <RiskAnalysisPanel
            result={column.risk ?? emptyRiskAnalysis()}
            seed={seed}
            entryRatio={entryRatio}
            leverage={leverage}
            language={language}
          />
        </div>
      ))}
    </div>
  );
}
