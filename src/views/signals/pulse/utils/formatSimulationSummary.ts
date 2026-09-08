import type { SimulationInput } from '../types/pulse.types';

/** USD 통화 문자열 (SimulationPanel / 액션바 공통). */
export function formatSimulationUsd(v: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

/** 한 줄 요약: `$10,000 · 2% · 3x` (진입비율 생략 시 기본 2%) */
export function formatSimulationSummaryLine(
  input: Pick<SimulationInput, 'capital' | 'leverage' | 'capitalRatio'>,
): string {
  const ratio = input.capitalRatio ?? 2;
  return `${formatSimulationUsd(input.capital)} · ${ratio}% · ${input.leverage}x`;
}
