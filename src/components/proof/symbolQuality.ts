import type { ProofCycleStatsSlice, ProofSymbolStatsRow } from '@/lib/mock/proof-mock';

export type ProofQualityPeriod = 'last30d' | 'last3mo';

function meetsQualityThresholds(
  slice: ProofCycleStatsSlice,
  winRateThreshold: number,
  riskRewardThreshold: number
): boolean {
  return (
    slice.cycleCount > 0 &&
    slice.winLossRatio != null &&
    slice.winRate * 100 >= winRateThreshold &&
    slice.winLossRatio >= riskRewardThreshold
  );
}

function qualitySliceForPeriod(
  row: ProofSymbolStatsRow,
  period: ProofQualityPeriod
): ProofCycleStatsSlice {
  return period === 'last30d' ? row.recent30Combined : row.recent3moCombined;
}

/** Keep a symbol only when the selected period satisfies both quality thresholds. */
export function meetsQualityThresholdsForPeriod(
  row: ProofSymbolStatsRow,
  winRateThreshold: number,
  riskRewardThreshold: number,
  period: ProofQualityPeriod
): boolean {
  return meetsQualityThresholds(
    qualitySliceForPeriod(row, period),
    winRateThreshold,
    riskRewardThreshold
  );
}

export function symbolsMeetingQualityThresholds(
  rows: readonly ProofSymbolStatsRow[],
  winRateThreshold: number,
  riskRewardThreshold: number,
  period: ProofQualityPeriod
): string[] {
  return rows
    .filter((row) =>
      meetsQualityThresholdsForPeriod(row, winRateThreshold, riskRewardThreshold, period)
    )
    .map((row) => row.symbol.trim().toUpperCase());
}
