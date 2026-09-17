import type { ProofCycleStatsSlice, ProofSymbolStatsRow } from '@/lib/mock/proof-mock';

export type ProofQualityPeriod = 'last30d' | 'last3mo' | 'all';

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
  return period === 'last30d'
    ? row.recent30Combined
    : period === 'last3mo'
      ? row.recent3moCombined
      : row.combined;
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

/**
 * Proof aggregates use only symbols whose displayed long-term returns are positive.
 * A recent 30-day loss is allowed; both the three-month and cumulative return must
 * remain above zero before the symbol can contribute to any Proof summary.
 */
export function hasPositiveLongTermProfit(row: ProofSymbolStatsRow): boolean {
  return (
    row.recent3moTotal.pnlPerEntryNotionalRateSum > 0 &&
    row.standard.pnlPerEntryNotionalRateSum > 0
  );
}

export function symbolsWithPositiveLongTermProfit(rows: readonly ProofSymbolStatsRow[]): string[] {
  return rows
    .filter(hasPositiveLongTermProfit)
    .map((row) => row.symbol.trim().toUpperCase());
}
