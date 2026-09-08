import type { ColDef } from 'ag-grid-community';

/**
 * Pulse 섹션 그리드: 우측 정렬은 `type: 'rightAligned'` 열
 * (USD 금액·진입가·현재가 등 $ 표시 숫자).
 */
export function isPulseMoneyColumn(def: ColDef): boolean {
  return def.type === 'rightAligned';
}
