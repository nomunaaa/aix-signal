import type { ProofCycleStatsSlice, ProofSymbolStatsRow } from '@/lib/mock/proof-mock';
import { meetsQualityThresholdsForPeriod, symbolsMeetingQualityThresholds } from './symbolQuality';

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
    standard: slice({ winRate: 0.65, winLossRatio: 1.2 }),
    discounted: slice(),
    ...overrides,
  };
}

describe('proof symbol quality filter', () => {
  it('filters against only the selected period', () => {
    expect(meetsQualityThresholdsForPeriod(row(), 60, 1, 'last30d')).toBe(false);
    expect(meetsQualityThresholdsForPeriod(row(), 60, 1, 'last3mo')).toBe(true);
    expect(meetsQualityThresholdsForPeriod(row(), 60, 1, 'all')).toBe(true);
  });

  it('requires win rate and P/L ratio to pass in the same period', () => {
    const mixedPeriods = row({
      recent3moDiscounted: slice({ winRate: 0.7, winLossRatio: 0.8 }),
      discounted: slice({ winRate: 0.5, winLossRatio: 1.5 }),
    });

    expect(meetsQualityThresholdsForPeriod(mixedPeriods, 60, 1, 'last3mo')).toBe(false);
    expect(meetsQualityThresholdsForPeriod(mixedPeriods, 60, 1, 'all')).toBe(false);
  });

  it('does not treat a missing P/L ratio as a qualifying zero', () => {
    const missingRatios = row({
      recent3moDiscounted: slice({ winRate: 0.7, winLossRatio: null }),
      discounted: slice({ winRate: 0.7, winLossRatio: null }),
    });

    expect(meetsQualityThresholdsForPeriod(missingRatios, 60, 0, 'all')).toBe(false);
  });

  it('returns the same qualifying symbol set used by the pinned aggregate', () => {
    const rejected = row({
      symbol: 'XRPUSDT',
      recent30Discounted: slice({ winRate: 0.5, winLossRatio: 0.8 }),
      recent3moDiscounted: slice({ winRate: 0.5, winLossRatio: 0.8 }),
      discounted: slice({ winRate: 0.5, winLossRatio: 0.8 }),
    });

    expect(symbolsMeetingQualityThresholds([row(), rejected], 60, 1, 'last3mo')).toEqual([
      'BCHUSDT',
    ]);
  });
});
