import type { SignalStreamOptionFilter, SignalStreamOptionId } from '../types/pulse.types';

export const HISTORY_QUERY_PARAM_KEYS = [
  'historySymbol',
  'historySymbols',
  'historyLimit',
  'historyPeriod',
  'historyFromIso',
  'historyToIso',
  'historyStreams',
  'historyTrendMode',
  'historyStreamOptions',
  'historyCategories',
  'historySort',
  'historyFocus',
] as const;

export function parseHistorySymbolsParam(value: string | null): string[] {
  if (!value?.trim()) return [];
  return Array.from(
    new Set(value.split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))
  );
}

export function parseHistoryStreamOptionsParam(value: string | null): SignalStreamOptionFilter | null {
  if (!value) return null;
  const requested = new Set(value.split(','));
  const validIds: SignalStreamOptionId[] = ['P1', 'P2', 'P3', 'B1', 'B2', 'B3', 'W1', 'W2', 'W3'];
  if (!validIds.some((id) => requested.has(id))) return null;
  return Object.fromEntries(
    validIds.map((id) => [id, requested.has(id)])
  ) as SignalStreamOptionFilter;
}

/** Merge pulse filter params with live history drill-down params from the address bar. */
export function mergePulseUrlWithHistoryParams(
  filterParams: URLSearchParams,
  historyParams: URLSearchParams
): URLSearchParams {
  const merged = new URLSearchParams(filterParams);
  for (const key of HISTORY_QUERY_PARAM_KEYS) {
    const value = historyParams.get(key);
    if (value) merged.set(key, value);
  }
  return merged;
}
