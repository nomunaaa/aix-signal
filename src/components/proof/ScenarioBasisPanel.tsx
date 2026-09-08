import { useState } from 'react';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import type { ProofLanguage } from './proofFormat';
import { ScenarioBoxCard } from './ScenarioBoxCard';
import { ScenarioDetailTable } from './ScenarioDetailTable';
import { YearProjectionBar } from './YearProjectionBar';

/** 시뮬레이터 카드 ②의 한 컬럼 — "최근 30일 기준" 또는 "총 누적 기준". */
export function ScenarioBasisPanel({
  title,
  standardSlice,
  discountedSlice,
  seed,
  entryRatio,
  leverage,
  monthlyFeeUsd,
  yearlyFeeUsd,
  showYearProjection,
  copy,
  language,
}: {
  title: string;
  standardSlice: ProofCycleStatsSlice;
  discountedSlice: ProofCycleStatsSlice;
  seed: number;
  entryRatio: number;
  leverage: number;
  monthlyFeeUsd: number;
  yearlyFeeUsd: number;
  showYearProjection: boolean;
  copy: ProofCopy;
  language: ProofLanguage;
}) {
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-extrabold text-foreground">{title}</h3>
        <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {copy.simulator.basisTag}
        </span>
      </div>

      <div className="space-y-2.5">
        <ScenarioBoxCard
          scenarioKey="standard"
          title={copy.scenarios.standard.title}
          slice={standardSlice}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={monthlyFeeUsd}
          copy={copy}
          language={language}
        />
        <ScenarioBoxCard
          scenarioKey="discounted"
          title={copy.scenarios.discounted.title}
          slice={discountedSlice}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={monthlyFeeUsd}
          copy={copy}
          language={language}
        />
      </div>

      <div className="mt-2.5">
        <ScenarioDetailTable
          standardSlice={standardSlice}
          discountedSlice={discountedSlice}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={monthlyFeeUsd}
          copy={copy}
          language={language}
          showAll={showAll}
        />
      </div>

      {showYearProjection ? (
        <div className="mt-2.5">
          <YearProjectionBar
            seed={seed}
            entryRatio={entryRatio}
            leverage={leverage}
            yearlyFeeUsd={yearlyFeeUsd}
            standardSlice={standardSlice}
            discountedSlice={discountedSlice}
            copy={copy}
          />
        </div>
      ) : (
        <div className="mt-2.5 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5">
          <div className="text-xs font-bold text-foreground">{copy.simulator.annualTitle}</div>
          <div className="text-[11px] text-muted-foreground">
            {copy.simulator.annualUnavailable}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll((current) => !current)}
        className="mt-2.5 flex w-full items-center justify-center rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {showAll ? copy.simulator.showLess : copy.simulator.showAll}
      </button>
    </div>
  );
}
