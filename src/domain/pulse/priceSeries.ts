/**
 * Single resolver for Pulse mini price series (grid + detail VM).
 * See docs/api/pulse-signals.md for API contract.
 */

import { buildMockSparkline24h } from '@/lib/sparkline24h';
import { readPulseChartSourceEnv } from '@/domain/pulse/readPulseChartSourceEnv';

export type PulsePriceSeriesSource = 'api' | 'synthetic' | 'empty';

const MIN_API_POINTS = 3;

/** Grid column copy — keep in sync with columnRegistry / sectionColumnDefs */
export const PULSE_PRICE_FLOW_GRID = {
  headerName: '24h 차트',
  headerTooltip:
    '최근 구간 가격 샘플(24h). API 제공 시 실제 샘플이며, 합성(참고)일 때는 실시간 OHLCV와 다를 수 있습니다.',
} as const;

function readChartSourceEnv(): string | undefined {
  return readPulseChartSourceEnv();
}

/** `api-only` | `api_only`: no synthetic fallback. Otherwise synthetic allowed when API missing. */
export function getPulseChartMode(): 'allow_synthetic' | 'api_only' {
  const raw = readChartSourceEnv()?.trim().toLowerCase().replace(/_/g, '-') ?? '';
  return raw === 'api-only' ? 'api_only' : 'allow_synthetic';
}

export function isValidApiSparkline(arr: unknown): arr is number[] {
  if (!Array.isArray(arr) || arr.length < MIN_API_POINTS) return false;
  return arr.every((x) => typeof x === 'number' && Number.isFinite(x));
}

export interface ResolvePulsePriceSeriesInput {
  apiSeries?: number[] | null | undefined;
  symbol: string;
  anchorPrice: number;
}

export interface ResolvedPulsePriceSeries {
  points: number[];
  source: PulsePriceSeriesSource;
}

export function resolvePriceSeriesForPulse(input: ResolvePulsePriceSeriesInput): ResolvedPulsePriceSeries {
  if (isValidApiSparkline(input.apiSeries)) {
    return { points: input.apiSeries, source: 'api' };
  }
  if (getPulseChartMode() === 'api_only') {
    return { points: [], source: 'empty' };
  }
  return {
    points: buildMockSparkline24h(input.symbol, input.anchorPrice),
    source: 'synthetic',
  };
}
