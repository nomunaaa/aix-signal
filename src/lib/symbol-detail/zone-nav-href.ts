/** 종목상세 Zone 본진 링크 — Zone 래퍼는 `<a href>`만 사용 (SRD-002) */

export function zoneSignalsHref(): string {
  return '/signals';
}

export function zoneChartHref(symbol: string): string {
  return `/chart?symbol=${encodeURIComponent(symbol)}`;
}

export function zoneTrendHref(): string {
  return '/trend';
}

export function zoneInsightsHref(): string {
  return '/insights';
}
