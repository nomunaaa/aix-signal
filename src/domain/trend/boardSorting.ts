/**
 * Trend Board Sorting & Filtering
 */

import type { TrendBoardCard, SortMode, TrendBoardFilter } from './boardTypes';

/**
 * 카드 정렬
 */
export function sortTrendCards(
  cards: TrendBoardCard[],
  mode: SortMode
): TrendBoardCard[] {
  switch (mode) {
    case 'HOT_OPPORTUNITY':
      return [...cards].sort((a, b) => b.groupC.hotScore - a.groupC.hotScore);
      
    case 'SAFE_HAVEN':
      return [...cards].sort((a, b) => b.groupC.safeScore - a.groupC.safeScore);
      
    case 'HIGH_VOL':
      return [...cards].sort((a, b) => b.groupC.highVolScore - a.groupC.highVolScore);
      
    case 'DISCOUNT_KING':
      return [...cards].sort((a, b) => b.groupC.discountScore - a.groupC.discountScore);
      
    default:
      return cards;
  }
}

/**
 * 카드 필터링
 */
export function filterTrendCards(
  cards: TrendBoardCard[],
  filter: TrendBoardFilter
): TrendBoardCard[] {
  return cards.filter((card) => {
    // Direction 필터
    if (filter.direction && card.direction !== filter.direction) {
      return false;
    }
    
    // 보유 중만
    if (filter.onlyHolding && !card.isHolding) {
      return false;
    }
    
    // Actionable만 (신뢰도 40% 이상)
    if (filter.onlyActionable && card.groupC.confidencePct < 40) {
      return false;
    }
    
    // 저위험 모드
    if (filter.riskMode === 'LOW_RISK') {
      if (card.groupA.noiseScore > 40) return false;
      if (card.groupA.volatility === 'HIGH') return false;
    }
    
    // 고수익 모드
    if (filter.riskMode === 'HIGH_RETURN') {
      if (card.groupC.upsidePotentialPct < 3) return false;
    }
    
    return true;
  });
}

