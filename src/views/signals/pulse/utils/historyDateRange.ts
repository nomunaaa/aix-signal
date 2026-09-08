export type HistoryDatePeriod = '30d' | '90d' | 'all';

const DAY_MS = 86_400_000;

export function closedAtMs(value: Date | string): number {
  const ms = typeof value === 'string' ? new Date(value).getTime() : value.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function isoTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function normalizeIsoTimestamp(value: string | null | undefined): string | null {
  const ms = isoTimestampMs(value);
  return ms === null ? null : new Date(ms).toISOString();
}

function subtractUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() - months;
  const day = date.getUTCDate();
  const result = new Date(
    Date.UTC(
      year,
      month,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function exactHistoryPeriodRange(
  period: HistoryDatePeriod,
  asOfIso: string | null | undefined
): { fromIso: string | null; toIso: string } | null {
  const normalizedAsOf = normalizeIsoTimestamp(asOfIso);
  if (!normalizedAsOf) return null;
  if (period === 'all') {
    return {
      fromIso: null,
      toIso: normalizedAsOf,
    };
  }

  const asOf = new Date(normalizedAsOf);
  const from =
    period === '90d' ? subtractUtcMonths(asOf, 3) : new Date(asOf.getTime() - 30 * DAY_MS);

  return {
    fromIso: from.toISOString(),
    toIso: normalizedAsOf,
  };
}

export function historyPeriodStartMs(period: HistoryDatePeriod, now = new Date()): number | null {
  if (period === 'all') return null;
  const start = new Date(now);
  if (period === '90d') start.setMonth(start.getMonth() - 3);
  else start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

export function matchesHistoryDatePeriod(
  closedAt: Date | string,
  period: HistoryDatePeriod,
  now = new Date()
): boolean {
  const startMs = historyPeriodStartMs(period, now);
  return startMs === null || closedAtMs(closedAt) >= startMs;
}

function parseDateInputParts(value: string): [number, number, number] | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(day)) {
    return null;
  }
  return [year, monthIndex, day];
}

export function dateInputStartMs(value: string): number | null {
  const parts = parseDateInputParts(value);
  if (!parts) return null;
  return new Date(parts[0], parts[1], parts[2]).getTime();
}

export function dateInputEndExclusiveMs(value: string): number | null {
  const parts = parseDateInputParts(value);
  if (!parts) return null;
  return new Date(parts[0], parts[1], parts[2] + 1).getTime();
}
