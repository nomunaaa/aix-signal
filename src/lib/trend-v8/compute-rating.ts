/**
 * Rating 가중 합산 — 트렌드보드 v8 · 종목상세 게이지 공용 (AIX-6 · AIX-82)
 * 시그널 ×3 + 추세강도 ×2 + 나머지 17지표 ×1 (변동량 제외)
 */

import type { LongShortScale, SymbolAnalysis } from '@/lib/mock/trend-v8-mock'

export function scaleToScore(scale: LongShortScale): number {
  switch (scale) {
    case 'strong_long':
      return 2
    case 'long':
      return 1
    case 'neutral':
      return 0
    case 'short':
      return -1
    case 'strong_short':
      return -2
  }
}

/**
 * Rating 가중 합산 후 정규화 단계까지
 */
export function computeRating(analysis: SymbolAnalysis): { score: number; rating: LongShortScale; maxScore: number; normalized: number } {
  let score = 0
  let maxScore = 0

  const signalScale: LongShortScale =
    analysis.signal.state === 'LIVE' && analysis.signal.direction === 'LONG'
      ? analysis.signal.reliability === 'A'
        ? 'strong_long'
        : 'long'
      : analysis.signal.state === 'LIVE' && analysis.signal.direction === 'SHORT'
        ? analysis.signal.reliability === 'A'
          ? 'strong_short'
          : 'short'
        : analysis.signal.state === 'WAIT'
          ? analysis.signal.direction === 'LONG'
            ? 'long'
            : 'short'
          : 'neutral'
  score += scaleToScore(signalScale) * 3
  maxScore += 2 * 3

  score += scaleToScore(analysis.trendStrength.scale) * 2
  maxScore += 2 * 2

  const others: LongShortScale[] = [
    analysis.shortTermTrend.scale,
    analysis.longTermTrend.scale,
    analysis.rsi14.scale,
    analysis.stochK.scale,
    analysis.macd.scale,
    analysis.stochRsi.scale,
    analysis.williamsR.scale,
    analysis.ultimateOsc.scale,
    analysis.ema50.scale,
    analysis.ema200.scale,
    analysis.sma50.scale,
    analysis.sma200.scale,
    analysis.oiDirection.scale,
    analysis.fundingRate.scale,
    analysis.longShortRatio.scale,
    analysis.liquidationHeatmap.scale,
    analysis.fearGreed.scale,
  ]
  for (const s of others) {
    score += scaleToScore(s)
    maxScore += 2
  }

  const normalized = maxScore > 0 ? score / maxScore : 0
  const rating: LongShortScale =
    normalized >= 0.6
      ? 'strong_long'
      : normalized >= 0.2
        ? 'long'
        : normalized <= -0.6
          ? 'strong_short'
          : normalized <= -0.2
            ? 'short'
            : 'neutral'

  return { score, rating, maxScore, normalized }
}
