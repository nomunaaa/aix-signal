import { mapSignalCycleRow } from '@/lib/proof-platform-aggregate';
import { buildTotalStats } from '@/lib/proof/proof-stats';
import { formatProofPercent, formatWinRate } from '@/lib/proof/format-proof';
import {
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
