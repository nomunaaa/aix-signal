/** 비추세 액션 카드 — REB-212 / action-recommendations 매핑용 */

export type ActionCategory = 'ENTRY' | 'EXIT' | 'HEDGE' | 'WAIT' | 'META';

export type ActionRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ActionCard {
  category: ActionCategory;
  label: string;
  detail: string;
  risk: ActionRiskLevel;
}

export type TrendSide = 'up' | 'down';

export interface ActionRecommendationInput {
  shortTrend: TrendSide;
  longTrend: TrendSide;
  /** getVolatilityType 결과와 동일 */
  volatility: 'high' | 'low' | 'none';
}

export interface ActionRecommendationResult {
  primary: ActionCard;
  alternatives: ActionCard[];
}
