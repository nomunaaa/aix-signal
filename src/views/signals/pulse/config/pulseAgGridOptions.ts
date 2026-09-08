import type { AutoSizeStrategy } from 'ag-grid-community';

/**
 * 컬럼 너비를 셀·헤더 텍스트에 맞춤(상한은 과도한 가로 확장 방지).
 * 오픈 3테이블은 `suppressAutoSize: true` 고정 열이 대부분이라 실질 autosize 대상은 제한적이다.
 * 긴 문구 열은 ColDef의 maxWidth로 개별 상한을 둔다.
 */
export const PULSE_AUTO_SIZE_STRATEGY: AutoSizeStrategy = {
  type: 'fitCellContents',
  skipHeader: false,
  defaultMinWidth: 40,
  defaultMaxWidth: 160,
};

export const PULSE_SPLIT_AUTO_SIZE_STRATEGY: AutoSizeStrategy = {
  type: 'fitGridWidth',
  defaultMinWidth: 32,
};

export const PULSE_HISTORY_AUTO_SIZE_STRATEGY: AutoSizeStrategy = {
  type: 'fitGridWidth',
  defaultMinWidth: 52,
};
