import type { ProofCycleStatsSlice, ProofSymbolStatsRow } from '@/lib/mock/proof-mock';
import {
  meetsQualityThresholdsForPeriod,
  symbolsMeetingQualityThresholds,
  symbolsWithPositiveLongTermProfit,
} from './symbolQuality';

function slice(overrides: Partial<ProofCycleStatsSlice> = {}): ProofCycleStatsSlice {
  return {
    cycleCount: 1,
    asOfIso: null,
    pnlPctSum: 0,
    pnlPerEntryNotionalRateSum: 0,
    entryLegCountSum: 1,
    maxPnlPct: 0,
    minPnlPct: 0,
    maxPnlPerEntryNotionalRate: 0,
    minPnlPerEntryNotionalRate: 0,
    winRate: 0,
    winLossRatio: null,
    winCount: 0,
    lossCount: 0,
    winsPerEntryNotionalRateSum: 0,
    lossesPerEntryNotionalRateAbsSum: 0,
    avgHoldSec: null,
    ...overrides,
  };
}

function row(overrides: Partial<ProofSymbolStatsRow> = {}): ProofSymbolStatsRow {
  return {
    symbol: 'BCHUSDT',
    shortName: 'BCH',
    recent30Total: slice({ winRate: 1, winLossRatio: null }),
    recent3moTotal: slice({ winRate: 0.7, winLossRatio: 1.4 }),
    recent30Discounted: slice({ winRate: 1, winLossRatio: null }),
    recent3moDiscounted: slice({ winRate: 0.7, winLossRatio: 1.4 }),
    recent30Combined: slice({ winRate: 1, winLossRatio: null }),
    recent3moCombined: slice({ winRate: 0.7, winLossRatio: 1.4 }),
    standard: slice({ winRate: 0.65, winLossRatio: 1.2 }),
    discounted: slice(),
    combined: slice(),
    ...overrides,
  };
}

describe('proof symbol quality filter', () => {
  it('filters against only the selected period', () => {
    expect(meetsQualityThresholdsForPeriod(row(), 60, 1, 'last30d')).toBe(false);
    expect(meetsQualityThresholdsForPeriod(row(), 60, 1, 'last3mo')).toBe(true);
  });

  it('requires win rate and P/L ratio to pass in the same period', () => {
    const mixedPeriods = row({
      recent3moTotal: slice({ winRate: 0.7, winLossRatio: 0.8 }),
      standard: slice({ winRate: 0.5, winLossRatio: 1.5 }),
    });

    expect(meetsQualityThresholdsForPeriod(mixedPeriods, 60, 1, 'last3mo')).toBe(false);
  });

  it('does not treat a missing P/L ratio as a qualifying zero', () => {
    const missingRatios = row({
      recent3moTotal: slice({ winRate: 0.7, winLossRatio: null }),
      standard: slice({ winRate: 0.7, winLossRatio: null }),
    });

    expect(meetsQualityThresholdsForPeriod(missingRatios, 60, 1, 'last3mo')).toBe(false);
  });

  it('returns the same qualifying symbol set used by the pinned aggregate', () => {
    const rejected = row({
      symbol: 'XRPUSDT',
      recent30Total: slice({ winRate: 0.5, winLossRatio: 0.8 }),
      recent3moTotal: slice({ winRate: 0.5, winLossRatio: 0.8 }),
      standard: slice({ winRate: 0.5, winLossRatio: 0.8 }),
    });

    expect(symbolsMeetingQualityThresholds([row(), rejected], 60, 1, 'last3mo')).toEqual([
      'BCHUSDT',
    ]);
  });

  it('keeps a recent loss when both long-term returns are profitable', () => {
    const recentLoss = row({
      recent30Total: slice({ pnlPerEntryNotionalRateSum: -0.1 }),
      recent3moTotal: slice({ pnlPerEntryNotionalRateSum: 0.2 }),
      standard: slice({ pnlPerEntryNotionalRateSum: 0.3 }),
    });
    const threeMonthLoss = row({
      symbol: 'XRPUSDT',
      recent3moTotal: slice({ pnlPerEntryNotionalRateSum: -0.1 }),
      standard: slice({ pnlPerEntryNotionalRateSum: 0.3 }),
    });
    const cumulativeLoss = row({
      symbol: 'ETHUSDT',
      recent3moTotal: slice({ pnlPerEntryNotionalRateSum: 0.2 }),
      standard: slice({ pnlPerEntryNotionalRateSum: -0.1 }),
    });

    expect(symbolsWithPositiveLongTermProfit([recentLoss, threeMonthLoss, cumulativeLoss])).toEqual([
      'BCHUSDT',
    ]);
  });

});
