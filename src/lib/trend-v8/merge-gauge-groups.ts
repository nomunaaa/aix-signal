/**
 * 진영 mini 게이지 3슬롯 — MA + Futures 병합 (4그룹 → 3개 표시)
 */

import type { GaugeGroupSummary, LongShortScale } from '@/lib/mock/trend-v8-mock'
import { scaleToScore } from '@/lib/trend-v8/compute-rating'

function scoreToScale(n: number): LongShortScale {
  if (n >= 1.25) return 'strong_long'
  if (n >= 0.45) return 'long'
  if (n <= -1.25) return 'strong_short'
  if (n <= -0.45) return 'short'
  return 'neutral'
}

function avgRating(a: LongShortScale, b: LongShortScale): LongShortScale {
  const avg = (scaleToScore(a) + scaleToScore(b)) / 2
  return scoreToScale(avg)
}

/** 4그룹일 때 MA·선물 병합, 3 이하·이미 3슬롯이면 그대로 */
export function mergeGroupsForThreeMinis(groups: GaugeGroupSummary[]): GaugeGroupSummary[] {
  if (groups.length <= 3) return groups
  const [aix, osc, ma, fut] = groups
  if (!fut) return groups.slice(0, 3)
  const merged: GaugeGroupSummary = {
    groupKey: 'ma_futures',
    displayName: 'MA · 선물',
    indicatorCount: ma.indicatorCount + fut.indicatorCount,
    rating: avgRating(ma.rating, fut.rating),
    summaryText: `${ma.summaryText} · ${fut.summaryText}`,
  }
  return [aix, osc, merged]
}
