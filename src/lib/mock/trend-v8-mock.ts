// src/lib/mock/trend-v8-mock.ts
// AiXSignal 트렌드보드 v8 Mock 스키마
// 2026-04-20 · AIX-6 v8 구현용
//
// 20개 지표 × 30종목 × 5단계 롱/숏 환원 + 종합 Rating

// ═══════════════════════════════════════════════════════════════════
// 기본 타입
// ═══════════════════════════════════════════════════════════════════

export type LongShortScale = 
  | 'strong_short'    // -2
  | 'short'           // -1
  | 'neutral'         //  0
  | 'long'            // +1
  | 'strong_long'     // +2

export type VolatilityScale =
  | 'low'             // amber 연함
  | 'mid'             // amber 중간
  | 'high'            // amber 진함
  | 'extreme'         // 진한 빨

export type SignalReliability = 'A' | 'B+' | 'C' | null   // null = 없음

export type SignalState = 'LIVE' | 'WAIT' | 'NONE'

export type Direction = 'LONG' | 'SHORT'

// ═══════════════════════════════════════════════════════════════════
// 지표별 환산 구조
// ═══════════════════════════════════════════════════════════════════

export interface IndicatorScore {
  /** 환원된 롱/숏 스케일 */
  scale: LongShortScale
  /** 원본 수치 값 (툴팁에 표시) */
  rawValue: number | string
  /** 툴팁 표시 라벨 (예: "82", "과열", "↑↑", "정배열") */
  displayLabel: string
}

export interface VolatilityIndicator {
  scale: VolatilityScale
  rawValue: number           // ATR 또는 박스권 너비 %
  displayLabel: string       // "낮", "중", "높", "극"
}

export interface SignalIndicator {
  state: SignalState
  direction: Direction | null
  reliability: SignalReliability
  cycleId: string | null
  displayLabel: string       // "LIVE 롱 A", "WAIT 롱 B+", "—"
}

// ═══════════════════════════════════════════════════════════════════
// 종목별 전체 분석 데이터 (20지표)
// ═══════════════════════════════════════════════════════════════════

export interface SymbolAnalysis {
  // 기본 시장 데이터
  symbol: string
  price: number
  priceChange24h: number     // % 
  volume24hUsdt: number

  // AiXSignal 고유 5
  signal: SignalIndicator                    // 1
  trendStrength: IndicatorScore              // 2 (강/중/약)
  shortTermTrend: IndicatorScore             // 3 (↑↑/↑/→/↓/↓↓)
  longTermTrend: IndicatorScore              // 4
  volatility: VolatilityIndicator            // 5

  // Oscillators 6 (역상관 해석)
  rsi14: IndicatorScore                      // 6 (0-100, >70 숏 환산)
  stochK: IndicatorScore                     // 7
  macd: IndicatorScore                       // 8 (↑↓→)
  stochRsi: IndicatorScore                   // 9
  williamsR: IndicatorScore                  // 10
  ultimateOsc: IndicatorScore                // 11

  // Moving Averages 4 (정배열/역배열)
  ema50: IndicatorScore                      // 12
  ema200: IndicatorScore                     // 13
  sma50: IndicatorScore                      // 14
  sma200: IndicatorScore                     // 15
  /** MA 4개 종합 요약 (테이블 표시용) */
  maSummary: IndicatorScore                  // UI만, 계산은 4개 평균

  // Futures 고유 4
  oiDirection: IndicatorScore                // 16 (ΔOI × Δprice)
  fundingRate: IndicatorScore                // 17 (역상관, 높음 = 숏 환산)
  longShortRatio: IndicatorScore             // 18
  liquidationHeatmap: IndicatorScore         // 19 (롱/숏 청산 불균형)

  // 거시 1 (역상관)
  fearGreed: IndicatorScore                  // 20 (탐욕 = 숏 환산)

  // 종합 Rating
  ratingScore: number                        // 가중 합산 원본 점수
  ratingScaleMax: number                     // 최대 가능 점수 (정규화 분모)
  /** AIX-44 Mock 보드용 명시 KAIROS 점수(0~24). 없으면 지표 기반으로 계산 */
  kairosScore?: number
  rating: LongShortScale
  ratingDistribution: {
    longCount: number
    neutralCount: number
    shortCount: number
  }
}

// ═══════════════════════════════════════════════════════════════════
// 트렌드보드 페이지 데이터
// ═══════════════════════════════════════════════════════════════════

export type PresetFilter = 
  | 'all'
  | 'strong_long'
  | 'strong_short'
  | 'signal_live'
  | 'signal_wait'
  | 'overheated'        // RSI/Stoch 과열
  | 'high_volatility'

export type SortKey = 
  | 'rating'
  | 'signal'
  | 'price_change_24h'
  | 'volume'
  | 'symbol'

export interface MarketKpi {
  regimeLabel: string                       // "상승 추세"
  regimeDetail: string                      // "BTC 돌파 + 알트 뒤따라가는 국면으로 관찰됨"
  alignmentRate: number                     // 0.73 = 73% 종목이 추세 정렬
  activeSignalCount: number
  ratingDistribution: {
    strongLong: number
    long: number
    neutral: number
    short: number
    strongShort: number
  }
}

export interface TrendV8PageMock {
  generatedAtLabel: string
  kpi: MarketKpi
  activePreset: PresetFilter
  sortKey: SortKey
  symbols: SymbolAnalysis[]                 // universe_top30
  cycleSimulation: {
    enabled: boolean
    intervalMinutes: number
  }
  /** v7 토글 on 시 사용할 원본 수치 (MVP에는 빈 객체) */
  v7DetailsVisible: boolean
}

// ═══════════════════════════════════════════════════════════════════
// 종목상세 Rating 게이지 데이터 (AIX-82)
// ═══════════════════════════════════════════════════════════════════

export interface GaugeGroupSummary {
  groupKey: 'aixsignal' | 'oscillators' | 'ma' | 'futures' | 'ma_futures'
  displayName: string
  indicatorCount: number
  /** 진영 내 지표들의 평균 스케일 */
  rating: LongShortScale
  summaryText: string         // "LIVE 시그널 A · 강세 정렬"
}

export interface RatingGaugeMock {
  symbol: string
  overall: {
    rating: LongShortScale
    scoreNormalized: number   // -1.0 ~ +1.0
    longCount: number
    neutralCount: number
    shortCount: number
  }
  groups: GaugeGroupSummary[]
  indicators: {
    id: string
    displayName: string
    scale: LongShortScale | VolatilityScale
    displayLabel: string
    tooltip: {
      title: string           // "RSI (14)"
      subtitle: string        // "Relative Strength Index · 상대강도지수"
      formula: string
      currentValue: string
      scaleExplain: string
      interpretation: string
    }
  }[]
}

// ═══════════════════════════════════════════════════════════════════
// 색상 매핑 헬퍼 (컴포넌트에서 사용)
// ═══════════════════════════════════════════════════════════════════

export const LONG_SHORT_COLORS: Record<LongShortScale, { bg: string; text: string }> = {
  strong_long:  { bg: '#0F6E56', text: '#FFFFFF' },
  long:         { bg: '#1D9E75', text: '#FFFFFF' },
  neutral:      { bg: '#5F5E5A', text: '#FFFFFF' },
  short:        { bg: '#A32D2D', text: '#FFFFFF' },
  strong_short: { bg: '#791F1F', text: '#FFFFFF' },
}

export const SIGNAL_RELIABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  'LIVE_A':    { bg: '#0F6E56', text: '#FFFFFF' },
  'LIVE_B+':   { bg: '#1D9E75', text: '#FFFFFF' },
  'LIVE_C':    { bg: '#5DCAA5', text: '#04342C' },
  'WAIT_A':    { bg: '#9FE1CB', text: '#085041' },
  'WAIT_B+':   { bg: '#9FE1CB', text: '#085041' },
  'WAIT_C':    { bg: '#9FE1CB', text: '#085041' },
  'NONE':      { bg: '#5F5E5A', text: '#D3D1C7' },
}

export const VOLATILITY_COLORS: Record<VolatilityScale, { bg: string; text: string }> = {
  low:     { bg: '#EF9F27', text: '#412402' },
  mid:     { bg: '#F59E0B', text: '#412402' },
  high:    { bg: '#BA7517', text: '#FFFFFF' },
  extreme: { bg: '#791F1F', text: '#FFFFFF' },
}

export const LONG_SHORT_LABEL_KR: Record<LongShortScale, string> = {
  strong_long: 'STRONG 롱',
  long: '롱',
  neutral: '중립',
  short: '숏',
  strong_short: 'STRONG 숏',
}
