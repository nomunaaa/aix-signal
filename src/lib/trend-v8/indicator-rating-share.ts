/**
 * 종목상세 Rating 뱃지 — 지표별 만점 대비 비중(%)
 * computeRating.ts: signal×3, trendStrength×2, 그 외 롱숏 스케일 ×1 (변동량·vol은 합산 미포함)
 *
 * 표시 점수 = (해당 지표의 만점 기여분 / 전체 만점 44) × 100
 * 변동량만 합산식에 없으므로 UI 20칸 중 1칸 비중으로 5% 표시
 */

/** 가격·시그널 합산식에 쓰이는 최대 가중 합 (computeRating maxScore) */
export const RATING_MAX_SCORE_WEIGHT = 44

/** 뱃지로 노출하는 지표 개수 (시그널~공탐) */
export const RATING_INDICATOR_BADGE_COUNT = 20

/**
 * 지표 ID → 만점 시 해당 슬롯이 차지하는 비중(0~100)
 */
export function indicatorSharePercentOfMaxRating(indicatorId: string): number {
  if (indicatorId === 'signal') {
    return (6 / RATING_MAX_SCORE_WEIGHT) * 100
  }
  if (indicatorId === 'trendStrength') {
    return (4 / RATING_MAX_SCORE_WEIGHT) * 100
  }
  if (indicatorId === 'volatility') {
    return (1 / RATING_INDICATOR_BADGE_COUNT) * 100
  }
  return (2 / RATING_MAX_SCORE_WEIGHT) * 100
}
