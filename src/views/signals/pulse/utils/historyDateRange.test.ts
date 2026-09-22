import { describe, expect, it } from 'vitest';
import { exactHistoryPeriodRange } from './historyDateRange';

describe('exactHistoryPeriodRange', () => {
  it('uses asOfIso as both ends when asOfFromIso is omitted', () => {
    const asOf = '2026-09-22T12:00:00.000Z';
    const range = exactHistoryPeriodRange('30d', asOf);
    expect(range).toEqual({
      fromIso: '2026-08-23T12:00:00.000Z',
      toIso: asOf,
    });
  });

  it('anchors the lower bound on the earliest contributing asOf', () => {
    const asOfTo = '2026-09-22T12:00:00.000Z';
    const asOfFrom = '2026-09-20T12:00:00.000Z';
    const range = exactHistoryPeriodRange('30d', asOfTo, asOfFrom);
    expect(range).toEqual({
      fromIso: '2026-08-21T12:00:00.000Z',
      toIso: asOfTo,
    });
  });
});
