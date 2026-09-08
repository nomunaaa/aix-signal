import type { TfKey5m } from '@/views/Multiplecharts/constants';

/** SRD-002 인라인 차트 가시 범위 — 5m 봉 기준 TfKey 매핑 */
export type SymbolChartRangePreset = '4h' | '12h' | '24h' | '3d' | '7d';

export const SYMBOL_CHART_RANGE_PRESETS: { id: SymbolChartRangePreset; label: string; tf: TfKey5m }[] = [
  { id: '4h', label: '4h', tf: '6H' },
  { id: '12h', label: '12h', tf: '12H' },
  { id: '24h', label: '24h', tf: '1D' },
  { id: '3d', label: '3d', tf: '3D' },
  { id: '7d', label: '7d', tf: '5D' },
];

export function defaultSymbolChartPreset(): SymbolChartRangePreset {
  return '24h';
}
