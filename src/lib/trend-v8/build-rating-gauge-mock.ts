/**
 * SymbolAnalysis → RatingGaugeMock (XRP는 VEILE 고정 mock 우선)
 */

import type { LongShortScale, RatingGaugeMock, SymbolAnalysis, GaugeGroupSummary } from '@/lib/mock/trend-v8-mock'
import { v8SymbolAnalyses, xrpRatingGaugeMock } from '@/lib/mock/trend-v8-mock-data'
import { INDICATOR_TOOLTIPS } from '@/lib/trend-v8/indicator-tooltips'
import { computeRating, scaleToScore } from '@/lib/trend-v8/compute-rating'

function scoreToScale(n: number): LongShortScale {
  if (n >= 1.25) return 'strong_long'
  if (n >= 0.45) return 'long'
  if (n <= -1.25) return 'strong_short'
  if (n <= -0.45) return 'short'
  return 'neutral'
}

function groupRating(scales: LongShortScale[]): LongShortScale {
  if (scales.length === 0) return 'neutral'
  const avg = scales.reduce((a, s) => a + scaleToScore(s), 0) / scales.length
  return scoreToScale(avg)
}

/** AiXSignal 그룹은 시그널 환원 스케일 포함해 재계산 */
function buildGroupsFixed(a: SymbolAnalysis): GaugeGroupSummary[] {
  const sigScale: LongShortScale =
    a.signal.state === 'LIVE' && a.signal.direction === 'LONG'
      ? a.signal.reliability === 'A'
        ? 'strong_long'
        : 'long'
      : a.signal.state === 'LIVE' && a.signal.direction === 'SHORT'
        ? a.signal.reliability === 'A'
          ? 'strong_short'
          : 'short'
        : a.signal.state === 'WAIT'
          ? a.signal.direction === 'LONG'
            ? 'long'
            : 'short'
          : 'neutral'
  const aixScales: LongShortScale[] = [
    sigScale,
    a.trendStrength.scale,
    a.shortTermTrend.scale,
    a.longTermTrend.scale,
    a.fearGreed.scale,
  ]
  const osc = [a.rsi14.scale, a.stochK.scale, a.macd.scale, a.stochRsi.scale, a.williamsR.scale, a.ultimateOsc.scale]
  const ma = [a.ema50.scale, a.ema200.scale, a.sma50.scale, a.sma200.scale]
  const fut = [a.oiDirection.scale, a.fundingRate.scale, a.longShortRatio.scale, a.liquidationHeatmap.scale]
  return [
    {
      groupKey: 'aixsignal',
      displayName: 'AiXSignal 고유',
      indicatorCount: 5,
      rating: groupRating(aixScales),
      summaryText: `${a.signal.displayLabel} · 추세강도 ${a.trendStrength.displayLabel}`,
    },
    {
      groupKey: 'oscillators',
      displayName: 'Oscillators',
      indicatorCount: 6,
      rating: groupRating(osc),
      summaryText: '오실레이터 묶음',
    },
    {
      groupKey: 'ma',
      displayName: 'Moving Averages',
      indicatorCount: 4,
      rating: groupRating(ma),
      summaryText: a.maSummary.displayLabel,
    },
    {
      groupKey: 'futures',
      displayName: 'Futures',
      indicatorCount: 4,
      rating: groupRating(fut),
      summaryText: '선물 미시장',
    },
  ]
}

function sigScaleForRow(a: SymbolAnalysis): LongShortScale {
  if (a.signal.state === 'NONE' || !a.signal.direction) return 'neutral'
  if (a.signal.state === 'LIVE' && a.signal.direction === 'LONG')
    return a.signal.reliability === 'A' ? 'strong_long' : 'long'
  if (a.signal.state === 'LIVE' && a.signal.direction === 'SHORT')
    return a.signal.reliability === 'A' ? 'strong_short' : 'short'
  return a.signal.direction === 'LONG' ? 'long' : 'short'
}

function analysisToGauge(a: SymbolAnalysis): RatingGaugeMock {
  const computed = computeRating(a)
  const scoreNormalized = Math.max(-1, Math.min(1, computed.normalized))

  const indicators: RatingGaugeMock['indicators'] = [
    {
      id: 'signal',
      displayName: '시그널',
      scale: sigScaleForRow(a),
      displayLabel: a.signal.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.signal,
        currentValue: a.signal.displayLabel,
        interpretation: '시그널 상태 및 신뢰도',
      },
    },
    {
      id: 'trendStrength',
      displayName: '추세강도',
      scale: a.trendStrength.scale,
      displayLabel: a.trendStrength.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.trendStrength,
        currentValue: String(a.trendStrength.rawValue),
        interpretation: a.trendStrength.displayLabel,
      },
    },
    {
      id: 'shortTermTrend',
      displayName: '단기',
      scale: a.shortTermTrend.scale,
      displayLabel: a.shortTermTrend.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.shortTermTrend,
        currentValue: String(a.shortTermTrend.rawValue),
        interpretation: a.shortTermTrend.displayLabel,
      },
    },
    {
      id: 'longTermTrend',
      displayName: '장기',
      scale: a.longTermTrend.scale,
      displayLabel: a.longTermTrend.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.longTermTrend,
        currentValue: String(a.longTermTrend.rawValue),
        interpretation: a.longTermTrend.displayLabel,
      },
    },
    {
      id: 'volatility',
      displayName: '변동량',
      scale: a.volatility.scale,
      displayLabel: a.volatility.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.volatility,
        currentValue: `${a.volatility.rawValue}%`,
        interpretation: a.volatility.displayLabel,
      },
    },
    {
      id: 'rsi14',
      displayName: 'RSI',
      scale: a.rsi14.scale,
      displayLabel: a.rsi14.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.rsi14,
        currentValue: String(a.rsi14.rawValue),
        interpretation: a.rsi14.displayLabel,
      },
    },
    {
      id: 'stochK',
      displayName: 'Stoch',
      scale: a.stochK.scale,
      displayLabel: a.stochK.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.stochK,
        currentValue: String(a.stochK.rawValue),
        interpretation: a.stochK.displayLabel,
      },
    },
    {
      id: 'macd',
      displayName: 'MACD',
      scale: a.macd.scale,
      displayLabel: a.macd.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.macd,
        currentValue: a.macd.displayLabel,
        interpretation: a.macd.displayLabel,
      },
    },
    {
      id: 'stochRsi',
      displayName: 'StochRSI',
      scale: a.stochRsi.scale,
      displayLabel: a.stochRsi.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.stochRsi,
        currentValue: String(a.stochRsi.rawValue),
        interpretation: a.stochRsi.displayLabel,
      },
    },
    {
      id: 'williamsR',
      displayName: 'Williams',
      scale: a.williamsR.scale,
      displayLabel: a.williamsR.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.williamsR,
        currentValue: String(a.williamsR.rawValue),
        interpretation: a.williamsR.displayLabel,
      },
    },
    {
      id: 'ultimateOsc',
      displayName: 'Ultimate',
      scale: a.ultimateOsc.scale,
      displayLabel: a.ultimateOsc.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.ultimateOsc,
        currentValue: String(a.ultimateOsc.rawValue),
        interpretation: a.ultimateOsc.displayLabel,
      },
    },
    {
      id: 'ema50',
      displayName: 'EMA50',
      scale: a.ema50.scale,
      displayLabel: a.ema50.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.ema50,
        currentValue: String(a.ema50.rawValue),
        interpretation: a.ema50.displayLabel,
      },
    },
    {
      id: 'ema200',
      displayName: 'EMA200',
      scale: a.ema200.scale,
      displayLabel: a.ema200.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.ema200,
        currentValue: String(a.ema200.rawValue),
        interpretation: a.ema200.displayLabel,
      },
    },
    {
      id: 'sma50',
      displayName: 'SMA50',
      scale: a.sma50.scale,
      displayLabel: a.sma50.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.sma50,
        currentValue: String(a.sma50.rawValue),
        interpretation: a.sma50.displayLabel,
      },
    },
    {
      id: 'sma200',
      displayName: 'SMA200',
      scale: a.sma200.scale,
      displayLabel: a.sma200.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.sma200,
        currentValue: String(a.sma200.rawValue),
        interpretation: a.sma200.displayLabel,
      },
    },
    {
      id: 'oiDirection',
      displayName: 'OI',
      scale: a.oiDirection.scale,
      displayLabel: a.oiDirection.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.oiDirection,
        currentValue: String(a.oiDirection.rawValue),
        interpretation: a.oiDirection.displayLabel,
      },
    },
    {
      id: 'fundingRate',
      displayName: '펀딩',
      scale: a.fundingRate.scale,
      displayLabel: a.fundingRate.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.fundingRate,
        currentValue: String(a.fundingRate.rawValue),
        interpretation: a.fundingRate.displayLabel,
      },
    },
    {
      id: 'longShortRatio',
      displayName: 'L/S',
      scale: a.longShortRatio.scale,
      displayLabel: a.longShortRatio.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.longShortRatio,
        currentValue: String(a.longShortRatio.rawValue),
        interpretation: a.longShortRatio.displayLabel,
      },
    },
    {
      id: 'liquidationHeatmap',
      displayName: '청산',
      scale: a.liquidationHeatmap.scale,
      displayLabel: a.liquidationHeatmap.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.liquidationHeatmap,
        currentValue: String(a.liquidationHeatmap.rawValue),
        interpretation: a.liquidationHeatmap.displayLabel,
      },
    },
    {
      id: 'fearGreed',
      displayName: '공탐',
      scale: a.fearGreed.scale,
      displayLabel: a.fearGreed.displayLabel,
      tooltip: {
        ...INDICATOR_TOOLTIPS.fearGreed,
        currentValue: String(a.fearGreed.rawValue),
        interpretation: a.fearGreed.displayLabel,
      },
    },
  ]

  return {
    symbol: a.symbol,
    overall: {
      rating: computed.rating,
      scoreNormalized,
      longCount: a.ratingDistribution.longCount,
      neutralCount: a.ratingDistribution.neutralCount,
      shortCount: a.ratingDistribution.shortCount,
    },
    groups: buildGroupsFixed(a),
    indicators,
  }
}

export function getRatingGaugeForSymbol(symbol: string): RatingGaugeMock {
  const norm = symbol.toUpperCase()
  if (norm === 'XRPUSDT') return xrpRatingGaugeMock
  const row = v8SymbolAnalyses.find((s) => s.symbol.toUpperCase() === norm)
  if (!row) return analysisToGauge(v8SymbolAnalyses[0]!)
  return analysisToGauge(row)
}
