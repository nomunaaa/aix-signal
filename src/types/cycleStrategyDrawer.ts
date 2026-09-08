/**
 * AIX-54: CycleStrategyDrawer 공유 타입 (히스토리 드로어 · 종목상세 Zone 5)
 */

export type StrategyVariantId = 'original' | 'variant_dca' | 'variant_partial' | 'variant_both';

/** 4전략 매트릭스 중 한 행 */
export interface StrategyVariant {
  id: StrategyVariantId;
  labelKo: string;
  hasDca: boolean;
  hasPartial: boolean;
  pnlPercent: number;
  pnlUsd: number;
  win: boolean;
  note?: string;
}

/** 드로어 헤더용 최소 사이클 정보 */
export interface CycleDrawerCycle {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  enteredAt: string;
  closedAt: string;
  /** 예: "3시간 32분" */
  holdDurationLabel: string;
}
