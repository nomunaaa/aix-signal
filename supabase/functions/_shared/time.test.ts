import {
  bucket1m,
  bucket10m,
  bucketOpenFromClose,
  ONE_MINUTE,
  payloadTimestampMs,
  TEN_MINUTES,
} from './time';

describe('Supabase function timestamp helpers', () => {
  const boundaryTs = Date.parse('2026-08-26T10:20:00.000Z');
  const exactPayloadTs = Date.parse('2026-08-26T10:05:00.000Z');

  it('preserves payload timestamps exactly', () => {
    expect(payloadTimestampMs(exactPayloadTs)).toBe(exactPayloadTs);
    expect(payloadTimestampMs(exactPayloadTs / 1000)).toBe(exactPayloadTs);
  });

  it('floors interval buckets without close-time shifting', () => {
    expect(bucket1m(boundaryTs)).toBe(boundaryTs);
    expect(bucket10m(boundaryTs)).toBe(boundaryTs);
  });

  it('keeps close timestamp conversion explicit', () => {
    expect(bucketOpenFromClose(boundaryTs, ONE_MINUTE)).toBe(boundaryTs - ONE_MINUTE);
    expect(bucketOpenFromClose(boundaryTs, TEN_MINUTES)).toBe(boundaryTs - TEN_MINUTES);
  });
});
