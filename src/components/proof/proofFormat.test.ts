import { mapSignalCycleRow } from '@/lib/proof-platform-aggregate';
import { buildTotalStats } from '@/lib/proof/proof-stats';
import { formatProofPercent, formatWinRate } from '@/lib/proof/format-proof';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import {
  combineProofCycleStats,
  formatPct,
  formatRatio,
  formatSignedUsd,
  formatUsd,
  projectedCyclePct,
  projectedCycleUsd,
  projectedPct,
  projectedUsd,
} from './proofFormat';

describe('proof projection formatting math', () => {
  it('uses the compact dollar prefix for displayed money values', () => {
    expect(formatUsd(1188)).toBe('$1,188');
    expect(formatSignedUsd(86.3908, true)).toBe('+$86');
    expect(formatSignedUsd(-12.5, true)).toBe('-$13');
  });

  it('displays proof percentages and ratios with two decimal places by default', () => {
    expect(formatPct(0.0863908, true)).toBe('+0.09%');
    expect(formatProofPercent(2)).toBe('+2.00%');
    expect(formatWinRate(0.64)).toBe('64.00%');
    expect(formatRatio(1.234, true)).toBe('1.23');
  });

  it('projects DCA plus partial-exit cycles from entry-notional rate like the XLS model', () => {
    const row = mapSignalCycleRow({
      id: '20260710-104900',
      symbol: 'XRPUSDT',
      side: 'LONG',
      entry_price: 1.1075,
      added_entry_price: 1.1029,
      partial_exit_price: 1.1091,
      exit_price: 1.1032,
      partial_exit_percentage: 50,
      trading_category: 'E2X2',
      exit_time: '2026-07-10T10:49:00Z',
      entry_time: '2026-07-10T10:00:00Z',
      barinterval: '1m',
    });

    expect(row).not.toBeNull();

    const [standard] = buildTotalStats(row ? [row] : []);
    const slice = standard.total;
    const seed = 100000;
    const entryRatio = 5;
    const leverage = 10;

    expect(row?.pnlPct).toBeCloseTo(0.0864, 4);
    expect(slice.pnlPerEntryNotionalRateSum).toBeCloseTo(86.3908 / 50000, 8);
    expect(projectedUsd(slice, seed, entryRatio, leverage)).toBeCloseTo(86.3908, 3);
    expect(projectedPct(slice, seed, entryRatio, leverage)).toBeCloseTo(0.0863908, 6);
    expect(
      projectedCycleUsd(slice.maxPnlPerEntryNotionalRate, seed, entryRatio, leverage)
    ).toBeCloseTo(86.3908, 3);
    expect(
      projectedCyclePct(slice.maxPnlPerEntryNotionalRate, seed, entryRatio, leverage)
    ).toBeCloseTo(0.0863908, 6);
  });
});

describe('combineProofCycleStats', () => {
  // 손익비는 (평균 수익 / 평균 손실)이다. 슬라이스별 비율을 가중평균하면 전체
  // 비율이 되지 않아, 상단 합계와 아래 종목 행이 같은 조건·같은 종목인데도 서로
  // 다른 손익비를 보여 주게 된다. 승률은 그 방식으로도 맞아떨어져서 손익비만
  // 어긋나 보였다.
  const slice = (
    winCount: number,
    winSum: number,
    lossCount: number,
    lossAbsSum: number
  ): ProofCycleStatsSlice => ({
    cycleCount: winCount + lossCount,
    asOfIso: null,
    pnlPctSum: 0,
    pnlPerEntryNotionalRateSum: winSum - lossAbsSum,
    entryLegCountSum: winCount + lossCount,
    maxPnlPct: 0,
    minPnlPct: 0,
    maxPnlPerEntryNotionalRate: 0,
    minPnlPerEntryNotionalRate: 0,
    winRate: (winCount + lossCount) > 0 ? winCount / (winCount + lossCount) : 0,
    winLossRatio: lossCount > 0 && winCount > 0 ? (winSum / winCount) / (lossAbsSum / lossCount) : null,
    winCount,
    lossCount,
    winsPerEntryNotionalRateSum: winSum,
    lossesPerEntryNotionalRateAbsSum: lossAbsSum,
    avgHoldSec: null,
  });

  it('matches the ratio computed over the pooled trades, not the average of the parts', () => {
    // A: 9 wins totalling 0.09 (avg 0.01), 1 loss of 0.10  -> ratio 0.10
    // B: 1 win of 0.10,                    9 losses of 0.09 -> ratio 10.00
    const a = slice(9, 0.09, 1, 0.1);
    const b = slice(1, 0.1, 9, 0.09);
    expect(a.winLossRatio).toBeCloseTo(0.1, 6);
    expect(b.winLossRatio).toBeCloseTo(10, 6);

    const combined = combineProofCycleStats([a, b]);

    // Pooled: 10 wins summing 0.19 (avg 0.019), 10 losses summing 0.19 (avg 0.019) -> 1.00
    expect(combined.winLossRatio).toBeCloseTo(1, 6);
    // The old cycle-count-weighted average of the two ratios would have been ~5.05.
    expect(combined.winLossRatio).not.toBeCloseTo(5.05, 1);
  });

  it('keeps win rate exact while fixing the ratio', () => {
    const combined = combineProofCycleStats([slice(9, 0.09, 1, 0.1), slice(1, 0.1, 9, 0.09)]);
    expect(combined.cycleCount).toBe(20);
    expect(combined.winRate).toBeCloseTo(0.5, 6);
  });

  it('carries the additive parts through so combining stays associative', () => {
    const a = slice(3, 0.06, 2, 0.02);
    const b = slice(4, 0.08, 1, 0.01);
    const c = slice(2, 0.04, 5, 0.05);

    const leftFirst = combineProofCycleStats([combineProofCycleStats([a, b]), c]);
    const rightFirst = combineProofCycleStats([a, combineProofCycleStats([b, c])]);
    const flat = combineProofCycleStats([a, b, c]);

    expect(leftFirst.winLossRatio).toBeCloseTo(flat.winLossRatio!, 6);
    expect(rightFirst.winLossRatio).toBeCloseTo(flat.winLossRatio!, 6);
  });
});
