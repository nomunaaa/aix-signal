// src/lib/mock/trend-v8-mock-data.ts
// 트렌드보드 v8 Mock 데이터 — 9종 샘플 + 20지표 전 구간 커버
// 2026-04-20 · AIX-6 v8 + AIX-82 구현용

import type {
  SymbolAnalysis,
  TrendV8PageMock,
  RatingGaugeMock,
  LongShortScale,
  SignalReliability,
  Direction,
  IndicatorScore,
  SignalIndicator,
  GaugeGroupSummary,
} from './trend-v8-mock'

import { INDICATOR_TOOLTIPS } from '@/lib/trend-v8/indicator-tooltips'
import { computeRating, scaleToScore } from '@/lib/trend-v8/compute-rating'

export { INDICATOR_TOOLTIPS } from '@/lib/trend-v8/indicator-tooltips'
export { computeRating, scaleToScore }

// ═══════════════════════════════════════════════════════════════════
// 9종 샘플 분석 데이터
// ═══════════════════════════════════════════════════════════════════

// 헬퍼: 지표 점수 빠르게 생성
function ind(scale: LongShortScale, rawValue: number | string, displayLabel: string): IndicatorScore {
  return { scale, rawValue, displayLabel }
}

function sig(
  state: 'LIVE' | 'WAIT' | 'NONE',
  direction: Direction | null,
  reliability: SignalReliability,
  cycleId: string | null,
  displayLabel: string
): SignalIndicator {
  return { state, direction, reliability, cycleId, displayLabel }
}

// BTCUSDT — STRONG 롱 (LIVE A 시그널 + 강세 정렬 + RSI 과열)
const btc: SymbolAnalysis = {
  symbol: 'BTCUSDT',
  price: 95728,
  priceChange24h: 1.24,
  volume24hUsdt: 32480000000,
  signal: sig('LIVE', 'LONG', 'A', 'sig-btc-042', 'LIVE 롱 A'),
  trendStrength: ind('strong_long', 92, '강'),
  shortTermTrend: ind('long', 0.8, '↑'),
  longTermTrend: ind('strong_long', 2.4, '↑↑'),
  volatility: { scale: 'mid', rawValue: 3.8, displayLabel: '중' },
  rsi14: ind('long', 62, '62'),
  stochK: ind('short', 78, '78'),
  macd: ind('strong_long', 0, '↑'),
  stochRsi: ind('short', 82, '82'),
  williamsR: ind('short', -15, '-15'),
  ultimateOsc: ind('neutral', 58, '58'),
  ema50: ind('long', 94200, '↑'),
  ema200: ind('strong_long', 89400, '↑'),
  sma50: ind('long', 93800, '↑'),
  sma200: ind('strong_long', 72400, '↑'),
  maSummary: ind('strong_long', 0, '정배열'),
  oiDirection: ind('long', 0.4, '롱'),
  fundingRate: ind('neutral', 0.01, '+0.01'),
  longShortRatio: ind('long', 1.28, '1.28'),
  liquidationHeatmap: ind('short', -0.3, '과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 17,
  ratingScaleMax: 32,
  rating: 'strong_long',
  ratingDistribution: { longCount: 14, neutralCount: 3, shortCount: 3 },
}

// ETHUSDT — 숏 (시그널 없음 + 단기 중립 + 장기 약세)
const eth: SymbolAnalysis = {
  symbol: 'ETHUSDT',
  price: 3284,
  priceChange24h: -0.58,
  volume24hUsdt: 18200000000,
  signal: sig('NONE', null, null, null, '—'),
  trendStrength: ind('neutral', 50, '중'),
  shortTermTrend: ind('neutral', 0.1, '→'),
  longTermTrend: ind('short', -0.9, '↓'),
  volatility: { scale: 'low', rawValue: 1.8, displayLabel: '낮' },
  rsi14: ind('neutral', 48, '48'),
  stochK: ind('neutral', 52, '52'),
  macd: ind('short', 0, '↓'),
  stochRsi: ind('neutral', 55, '55'),
  williamsR: ind('neutral', -55, '-55'),
  ultimateOsc: ind('neutral', 50, '50'),
  ema50: ind('short', 3350, '↓'),
  ema200: ind('short', 3420, '↓'),
  sma50: ind('short', 3340, '↓'),
  sma200: ind('short', 3380, '↓'),
  maSummary: ind('short', 0, '역배열'),
  oiDirection: ind('short', -0.2, '숏'),
  fundingRate: ind('neutral', -0.002, '-0.00'),
  longShortRatio: ind('neutral', 0.98, '0.98'),
  liquidationHeatmap: ind('neutral', 0.1, '중립'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: -7,
  ratingScaleMax: 32,
  rating: 'short',
  ratingDistribution: { longCount: 0, neutralCount: 9, shortCount: 11 },
}

// SOLUSDT — 롱 (WAIT B+ 시그널 + 강세 + 고변동)
const sol: SymbolAnalysis = {
  symbol: 'SOLUSDT',
  price: 188.42,
  priceChange24h: 3.20,
  volume24hUsdt: 4820000000,
  signal: sig('WAIT', 'LONG', 'B+', 'sig-sol-018', 'WAIT 롱 B+'),
  trendStrength: ind('strong_long', 88, '강'),
  shortTermTrend: ind('strong_long', 1.5, '↑↑'),
  longTermTrend: ind('long', 1.2, '↑'),
  volatility: { scale: 'high', rawValue: 6.4, displayLabel: '높' },
  rsi14: ind('short', 78, '78'),
  stochK: ind('short', 85, '85'),
  macd: ind('long', 0, '↑'),
  stochRsi: ind('strong_short', 94, '94'),
  williamsR: ind('short', -8, '-8'),
  ultimateOsc: ind('long', 68, '68'),
  ema50: ind('strong_long', 175.2, '↑'),
  ema200: ind('long', 168.4, '↑'),
  sma50: ind('long', 172.8, '↑'),
  sma200: ind('strong_long', 148.2, '↑'),
  maSummary: ind('strong_long', 0, '정배열'),
  oiDirection: ind('strong_long', 0.8, '강롱'),
  fundingRate: ind('long', 0.02, '+0.02'),
  longShortRatio: ind('strong_long', 1.82, '1.82'),
  liquidationHeatmap: ind('short', -0.4, '과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 9,
  ratingScaleMax: 32,
  rating: 'long',
  ratingDistribution: { longCount: 10, neutralCount: 2, shortCount: 8 },
}

// XRPUSDT — STRONG 롱 (LIVE A + 극과열)
const xrp: SymbolAnalysis = {
  symbol: 'XRPUSDT',
  price: 2.552,
  priceChange24h: 4.12,
  volume24hUsdt: 8240000000,
  signal: sig('LIVE', 'LONG', 'A', 'sig-xrp-003', 'LIVE 롱 A'),
  trendStrength: ind('strong_long', 95, '강'),
  shortTermTrend: ind('strong_long', 2.1, '↑↑'),
  longTermTrend: ind('strong_long', 2.8, '↑↑'),
  volatility: { scale: 'mid', rawValue: 4.2, displayLabel: '중' },
  rsi14: ind('strong_short', 82, '82'),
  stochK: ind('strong_short', 92, '92'),
  macd: ind('strong_long', 0, '↑'),
  stochRsi: ind('strong_short', 96, '96'),
  williamsR: ind('strong_short', -4, '-4'),
  ultimateOsc: ind('short', 72, '72'),
  ema50: ind('strong_long', 2.38, '↑'),
  ema200: ind('strong_long', 2.12, '↑'),
  sma50: ind('strong_long', 2.32, '↑'),
  sma200: ind('strong_long', 1.58, '↑'),
  maSummary: ind('strong_long', 0, '정배열'),
  oiDirection: ind('strong_long', 0.9, '강롱'),
  fundingRate: ind('long', 0.03, '+0.03'),
  longShortRatio: ind('strong_long', 2.14, '2.14'),
  liquidationHeatmap: ind('strong_short', -0.7, '극과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 15,
  ratingScaleMax: 32,
  rating: 'strong_long',
  ratingDistribution: { longCount: 12, neutralCount: 1, shortCount: 7 },
}

// DOGEUSDT — 중립 (LIVE C + 혼조)
const doge: SymbolAnalysis = {
  symbol: 'DOGEUSDT',
  price: 0.1499,
  priceChange24h: 1.85,
  volume24hUsdt: 2820000000,
  signal: sig('LIVE', 'LONG', 'C', 'sig-doge-011', 'LIVE 롱 C'),
  trendStrength: ind('neutral', 55, '중'),
  shortTermTrend: ind('long', 0.6, '↑'),
  longTermTrend: ind('neutral', 0.2, '→'),
  volatility: { scale: 'high', rawValue: 5.8, displayLabel: '높' },
  rsi14: ind('neutral', 55, '55'),
  stochK: ind('neutral', 58, '58'),
  macd: ind('neutral', 0, '→'),
  stochRsi: ind('neutral', 62, '62'),
  williamsR: ind('neutral', -42, '-42'),
  ultimateOsc: ind('neutral', 54, '54'),
  ema50: ind('long', 0.1482, '↑'),
  ema200: ind('neutral', 0.1495, '→'),
  sma50: ind('long', 0.1478, '↑'),
  sma200: ind('short', 0.1520, '↓'),
  maSummary: ind('neutral', 0, '혼조'),
  oiDirection: ind('short', -0.3, '숏'),
  fundingRate: ind('neutral', -0.01, '-0.01'),
  longShortRatio: ind('long', 1.18, '1.18'),
  liquidationHeatmap: ind('neutral', 0.0, '중립'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 3,
  ratingScaleMax: 32,
  rating: 'neutral',
  ratingDistribution: { longCount: 7, neutralCount: 8, shortCount: 5 },
}

// AVAXUSDT — STRONG 숏
const avax: SymbolAnalysis = {
  symbol: 'AVAXUSDT',
  price: 37.88,
  priceChange24h: -2.42,
  volume24hUsdt: 1420000000,
  signal: sig('NONE', null, null, null, '—'),
  trendStrength: ind('short', 38, '약'),
  shortTermTrend: ind('short', -0.7, '↓'),
  longTermTrend: ind('strong_short', -2.2, '↓↓'),
  volatility: { scale: 'mid', rawValue: 4.5, displayLabel: '중' },
  rsi14: ind('long', 28, '28'),
  stochK: ind('strong_long', 18, '18'),
  macd: ind('strong_short', 0, '↓↓'),
  stochRsi: ind('long', 22, '22'),
  williamsR: ind('long', -82, '-82'),
  ultimateOsc: ind('short', 38, '38'),
  ema50: ind('strong_short', 41.2, '↓'),
  ema200: ind('strong_short', 44.8, '↓'),
  sma50: ind('strong_short', 40.5, '↓'),
  sma200: ind('strong_short', 48.2, '↓'),
  maSummary: ind('strong_short', 0, '역배열'),
  oiDirection: ind('strong_short', -0.8, '강숏'),
  fundingRate: ind('short', -0.04, '-0.04'),
  longShortRatio: ind('short', 0.72, '0.72'),
  liquidationHeatmap: ind('short', -0.5, '과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: -13,
  ratingScaleMax: 32,
  rating: 'strong_short',
  ratingDistribution: { longCount: 4, neutralCount: 1, shortCount: 15 },
}

// WIFUSDT — STRONG 숏 (극한 하락)
const wif: SymbolAnalysis = {
  symbol: 'WIFUSDT',
  price: 0.842,
  priceChange24h: -5.80,
  volume24hUsdt: 480000000,
  signal: sig('NONE', null, null, null, '—'),
  trendStrength: ind('strong_short', 15, '강약'),
  shortTermTrend: ind('strong_short', -2.8, '↓↓'),
  longTermTrend: ind('strong_short', -3.5, '↓↓'),
  volatility: { scale: 'extreme', rawValue: 10.2, displayLabel: '극' },
  rsi14: ind('strong_long', 22, '22'),
  stochK: ind('strong_long', 12, '12'),
  macd: ind('strong_short', 0, '↓↓'),
  stochRsi: ind('strong_long', 8, '8'),
  williamsR: ind('strong_long', -92, '-92'),
  ultimateOsc: ind('short', 32, '32'),
  ema50: ind('strong_short', 0.95, '↓'),
  ema200: ind('strong_short', 1.12, '↓'),
  sma50: ind('strong_short', 0.98, '↓'),
  sma200: ind('strong_short', 1.24, '↓'),
  maSummary: ind('strong_short', 0, '역배열'),
  oiDirection: ind('strong_short', -0.9, '강숏'),
  fundingRate: ind('strong_short', -0.08, '-0.08'),
  longShortRatio: ind('strong_short', 0.42, '0.42'),
  liquidationHeatmap: ind('strong_short', -0.8, '극과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: -16,
  ratingScaleMax: 32,
  rating: 'strong_short',
  ratingDistribution: { longCount: 5, neutralCount: 0, shortCount: 15 },
}

// LINKUSDT — 롱 (안정적 추세)
const link: SymbolAnalysis = {
  symbol: 'LINKUSDT',
  price: 18.84,
  priceChange24h: 2.14,
  volume24hUsdt: 920000000,
  signal: sig('WAIT', 'LONG', 'C', 'sig-link-022', 'WAIT 롱 C'),
  trendStrength: ind('long', 68, '중'),
  shortTermTrend: ind('long', 0.9, '↑'),
  longTermTrend: ind('long', 1.1, '↑'),
  volatility: { scale: 'low', rawValue: 2.1, displayLabel: '낮' },
  rsi14: ind('long', 62, '62'),
  stochK: ind('neutral', 68, '68'),
  macd: ind('long', 0, '↑'),
  stochRsi: ind('short', 75, '75'),
  williamsR: ind('neutral', -32, '-32'),
  ultimateOsc: ind('long', 62, '62'),
  ema50: ind('long', 18.22, '↑'),
  ema200: ind('long', 17.48, '↑'),
  sma50: ind('long', 18.02, '↑'),
  sma200: ind('long', 16.20, '↑'),
  maSummary: ind('long', 0, '정배열'),
  oiDirection: ind('long', 0.3, '롱'),
  fundingRate: ind('neutral', 0.008, '+0.01'),
  longShortRatio: ind('long', 1.32, '1.32'),
  liquidationHeatmap: ind('neutral', 0.0, '중립'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 8,
  ratingScaleMax: 32,
  rating: 'long',
  ratingDistribution: { longCount: 12, neutralCount: 5, shortCount: 3 },
}

// SUIUSDT — 롱
const sui: SymbolAnalysis = {
  symbol: 'SUIUSDT',
  price: 4.32,
  priceChange24h: 2.88,
  volume24hUsdt: 680000000,
  signal: sig('NONE', null, null, null, '—'),
  trendStrength: ind('long', 72, '중'),
  shortTermTrend: ind('long', 1.1, '↑'),
  longTermTrend: ind('strong_long', 2.2, '↑↑'),
  volatility: { scale: 'mid', rawValue: 3.9, displayLabel: '중' },
  rsi14: ind('long', 65, '65'),
  stochK: ind('short', 72, '72'),
  macd: ind('long', 0, '↑'),
  stochRsi: ind('short', 78, '78'),
  williamsR: ind('neutral', -28, '-28'),
  ultimateOsc: ind('long', 64, '64'),
  ema50: ind('long', 4.12, '↑'),
  ema200: ind('strong_long', 3.48, '↑'),
  sma50: ind('long', 4.08, '↑'),
  sma200: ind('strong_long', 2.82, '↑'),
  maSummary: ind('strong_long', 0, '정배열'),
  oiDirection: ind('long', 0.4, '롱'),
  fundingRate: ind('long', 0.015, '+0.02'),
  longShortRatio: ind('long', 1.42, '1.42'),
  liquidationHeatmap: ind('short', -0.3, '과열'),
  fearGreed: ind('short', 72, '탐욕'),
  ratingScore: 10,
  ratingScaleMax: 32,
  rating: 'long',
  ratingDistribution: { longCount: 13, neutralCount: 2, shortCount: 5 },
}

/** 보드·게이지 모두 동일한 computeRating() 결과로 노출 */
function withComputedRating(a: SymbolAnalysis): SymbolAnalysis {
  const c = computeRating(a)
  return {
    ...a,
    ratingScore: c.score,
    ratingScaleMax: c.maxScore,
    rating: c.rating,
  }
}

const rawV8SymbolAnalyses: SymbolAnalysis[] = [btc, eth, sol, xrp, doge, avax, wif, link, sui]
export const v8SymbolAnalyses: SymbolAnalysis[] = rawV8SymbolAnalyses.map(withComputedRating)

// ═══════════════════════════════════════════════════════════════════
// 트렌드보드 페이지 전체 데이터
// ═══════════════════════════════════════════════════════════════════

export const trendV8PageMock: TrendV8PageMock = {
  generatedAtLabel: '2026-04-20 09:05 KST · 5분마다 갱신 · universe_top9 (Mock)',
  kpi: {
    regimeLabel: '상승 우위 추세',
    regimeDetail: 'BTC·XRP 주도 상승 국면으로 관찰됨. 알트 중 SOL·LINK·SUI 동반, ETH·AVAX는 이탈',
    alignmentRate: 0.68,                                // 9종 중 6종 롱 이상
    activeSignalCount: 3,                               // BTC · SOL(WAIT) · DOGE · XRP · LINK(WAIT)
    ratingDistribution: {
      strongLong: 2,    // BTC, XRP
      long: 3,          // SOL, LINK, SUI
      neutral: 1,       // DOGE
      short: 1,         // ETH
      strongShort: 2,   // AVAX, WIF
    },
  },
  activePreset: 'all',
  sortKey: 'rating',
  symbols: v8SymbolAnalyses,
  cycleSimulation: { enabled: true, intervalMinutes: 5 },
  v7DetailsVisible: false,
}

// ═══════════════════════════════════════════════════════════════════
// 종목상세 게이지 Mock (XRP 예시)
// ═══════════════════════════════════════════════════════════════════

const xrpGaugeGroups: GaugeGroupSummary[] = [
  {
    groupKey: 'aixsignal',
    displayName: 'AiXSignal 고유',
    indicatorCount: 5,
    rating: 'strong_long',
    summaryText: 'LIVE 시그널 A · 강세 정렬',
  },
  {
    groupKey: 'oscillators',
    displayName: 'Oscillators',
    indicatorCount: 6,
    rating: 'short',
    summaryText: 'RSI 82 과열 · Stoch RSI 극과열',
  },
  {
    groupKey: 'ma',
    displayName: 'Moving Averages',
    indicatorCount: 4,
    rating: 'strong_long',
    summaryText: 'EMA 50·200 · SMA 50·200 정배열',
  },
]

export const xrpRatingGaugeMock: RatingGaugeMock = {
  symbol: 'XRPUSDT',
  overall: {
    rating: 'strong_long',
    scoreNormalized: 0.47,   // 15/32
    longCount: 12,
    neutralCount: 1,
    shortCount: 7,
  },
  groups: xrpGaugeGroups,
  indicators: [
    { id: 'signal', displayName: '시그널', scale: 'strong_long', displayLabel: 'LIVE 롱 A',
      tooltip: { ...INDICATOR_TOOLTIPS.signal, currentValue: 'LIVE + 신뢰도 A', interpretation: '진행 중인 고신뢰 롱 시그널로 관찰됨' } },
    { id: 'trendStrength', displayName: '추세강도', scale: 'strong_long', displayLabel: '강',
      tooltip: { ...INDICATOR_TOOLTIPS.trendStrength, currentValue: '95/100', interpretation: '4개 EMA 완전 정배열' } },
    { id: 'shortTermTrend', displayName: '단기추세', scale: 'strong_long', displayLabel: '↑↑',
      tooltip: { ...INDICATOR_TOOLTIPS.shortTermTrend, currentValue: 'EMA 간격 2.1%', interpretation: '강한 단기 상승 관찰됨' } },
    { id: 'longTermTrend', displayName: '장기추세', scale: 'strong_long', displayLabel: '↑↑',
      tooltip: { ...INDICATOR_TOOLTIPS.longTermTrend, currentValue: '가격 > SMA200', interpretation: '장기 정배열 지속' } },
    { id: 'volatility', displayName: '변동량', scale: 'mid', displayLabel: '중',
      tooltip: { ...INDICATOR_TOOLTIPS.volatility, currentValue: '4.2%', interpretation: '일반 범위 변동성' } },
    { id: 'rsi14', displayName: 'RSI', scale: 'strong_short', displayLabel: '82',
      tooltip: { ...INDICATOR_TOOLTIPS.rsi14, currentValue: '82', interpretation: '과열 구간 · 역상관으로 숏 기회 관찰' } },
    { id: 'stochK', displayName: 'Stoch %K', scale: 'strong_short', displayLabel: '92',
      tooltip: { ...INDICATOR_TOOLTIPS.stochK, currentValue: '92', interpretation: '극과열' } },
    { id: 'macd', displayName: 'MACD', scale: 'strong_long', displayLabel: '↑',
      tooltip: { ...INDICATOR_TOOLTIPS.macd, currentValue: '골든크로스 지속', interpretation: '상승 모멘텀 유지' } },
    { id: 'stochRsi', displayName: 'Stoch RSI', scale: 'strong_short', displayLabel: '96',
      tooltip: { ...INDICATOR_TOOLTIPS.stochRsi, currentValue: '96', interpretation: '극과열 · 조정 임박 가능성' } },
    { id: 'williamsR', displayName: 'Williams %R', scale: 'strong_short', displayLabel: '-4',
      tooltip: { ...INDICATOR_TOOLTIPS.williamsR, currentValue: '-4', interpretation: '과열 상단' } },
    { id: 'ultimateOsc', displayName: 'Ultimate', scale: 'short', displayLabel: '72',
      tooltip: { ...INDICATOR_TOOLTIPS.ultimateOsc, currentValue: '72', interpretation: '과열 진입' } },
    { id: 'ema50', displayName: 'EMA 50', scale: 'strong_long', displayLabel: '↑',
      tooltip: { ...INDICATOR_TOOLTIPS.ema50, currentValue: '2.38', interpretation: '가격 > EMA50 유지' } },
    { id: 'ema200', displayName: 'EMA 200', scale: 'strong_long', displayLabel: '↑',
      tooltip: { ...INDICATOR_TOOLTIPS.ema200, currentValue: '2.12', interpretation: '장기 롱 배열' } },
    { id: 'sma50', displayName: 'SMA 50', scale: 'strong_long', displayLabel: '↑',
      tooltip: { ...INDICATOR_TOOLTIPS.sma50, currentValue: '2.32', interpretation: '50일 평균 상회' } },
    { id: 'sma200', displayName: 'SMA 200', scale: 'strong_long', displayLabel: '↑',
      tooltip: { ...INDICATOR_TOOLTIPS.sma200, currentValue: '1.58', interpretation: '200일 평균 대비 +61%' } },
    { id: 'oiDirection', displayName: 'OI', scale: 'strong_long', displayLabel: '강롱',
      tooltip: { ...INDICATOR_TOOLTIPS.oiDirection, currentValue: 'OI↑ + 가격↑', interpretation: '매수우세 명확' } },
    { id: 'fundingRate', displayName: '펀딩비', scale: 'strong_short', displayLabel: '+0.03',
      tooltip: { ...INDICATOR_TOOLTIPS.fundingRate, currentValue: '+0.03%', interpretation: '롱 과밀 · 숏 압력 임박 관찰' } },
    { id: 'longShortRatio', displayName: 'L/S', scale: 'strong_long', displayLabel: '2.14',
      tooltip: { ...INDICATOR_TOOLTIPS.longShortRatio, currentValue: '2.14', interpretation: '상위 계정 롱 편중' } },
    { id: 'liquidationHeatmap', displayName: '청산', scale: 'strong_short', displayLabel: '극과열',
      tooltip: { ...INDICATOR_TOOLTIPS.liquidationHeatmap, currentValue: '숏 청산 70%', interpretation: '숏 포지션 대량 청산 중' } },
    { id: 'fearGreed', displayName: '공포/탐욕', scale: 'short', displayLabel: '72',
      tooltip: { ...INDICATOR_TOOLTIPS.fearGreed, currentValue: '72', interpretation: '탐욕 구간 · 역상관 숏 기회' } },
  ],
}

