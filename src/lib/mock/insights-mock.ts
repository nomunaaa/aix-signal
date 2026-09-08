// src/lib/mock/insights-mock.ts
// AiXSignal 인사이트 페이지 스키마 타입 정의
// AIX-64 · 2026-04-20 / AIX-101 드리프트 동기화 · 2026-04-22
//
// 데이터 흐름:
//   Supabase kairos_narrative_history → history 섹션
//   Supabase kairos_faq_rotation → hero FAQ chips
//   KAIROS Haiku 실시간 추론 → hero headline/body, opportunities
//   CryptoPanic + n8n 분류 → events

// ═══════════════════════════════════════════════════════════════════
// § 공통 타입
// ═══════════════════════════════════════════════════════════════════

export type MarketRegime =
  | 'surge'                 // 급등
  | 'crash'                 // 급락
  | 'strong_consolidation'  // 강보합
  | 'weak_consolidation'    // 약보합
  | 'sideways'              // 횡보
  | 'mixed'                 // 혼조
  | 'watch'                 // 관망

export type VolatilityLevel = 'low' | 'mid' | 'high'
export type SentimentDirection = 'bullish' | 'bearish' | 'neutral'
export type Outcome = 'hit' | 'miss' | 'partial' | 'pending'
export type NarrativeOutcomeKind = Outcome
export type Side = 'LONG' | 'SHORT'
export type Importance = 'critical' | 'major' | 'info' | 'bullish' | 'bearish' | 'important' | 'neutral'

// ═══════════════════════════════════════════════════════════════════
// § 1. KAIROS 히어로 내러티브
// ═══════════════════════════════════════════════════════════════════

export interface KairosHero {
  generatedAt: string              // ISO
  generatedAtLabel: string         // "2026-04-20 09:00 KST · 업데이트 5분 전"
  headline: string                 // h1 한 문장
  body: string                     // 3~4문장 서술
  sidebarKpi: HeroKpi
  faqChips: FaqChip[]
}

export type KairosHeroNarrative = KairosHero

export interface HeroKpi {
  marketRegime: MarketRegime
  marketRegimeLabel?: string       // "약보합" (없으면 marketRegimeLabel() 헬퍼로 유도)
  alignmentPct: number             // 0~100
  volatility: VolatilityLevel
  volatilityLabel?: string         // "중" (없으면 volatilityLabel() 헬퍼로 유도)
  longShortRatio: number
}

export interface FaqChip {
  id: string
  question: string
  answer: string                   // 펼쳐질 때 나타나는 사전 생성 답변
  relatedSymbols?: string[]
  activeUntil: string              // ISO
  priority: number
}

// ═══════════════════════════════════════════════════════════════════
// § 2. 오늘의 기회 3종 카드
// ═══════════════════════════════════════════════════════════════════

export interface Opportunity {
  id: string
  symbol: string
  side: Side
  narrativeTag: string             // 'L1 내러티브' 등
  isConsensusSymbol: boolean       // 공감 종목 (좌측 accent bar on)
  price: number
  change24hPct: number             // 음수면 하락
  reasons: string[]                // 2~3 bullets
  newsMentionCount24h?: number
  newsMentionPercentile?: number   // 상위 N%
  riskText: string
  actions: CardAction[]
}

export type OpportunityCard = Opportunity

export interface CardAction {
  type: 'chart' | 'watchlist' | 'alert'
  label: string
  href?: string
  enabled: boolean
}

// ═══════════════════════════════════════════════════════════════════
// § 3. 과거 내러티브 히스토리
// ═══════════════════════════════════════════════════════════════════

export interface NarrativeHorizonEvaluation {
  evaluatedAt: string | null
  outcome: Outcome
  outcomeLabel: '적중' | '빗나감' | '부분' | '평가 대기'
  actualText: string
  actualChangePct?: number
}

export interface NarrativeHistoryEntry {
  id: string                       // UUID from kairos_narrative_history
  generatedAt: string              // ISO
  dateLabel: string                // "4/19 09:00"
  headline: string
  body?: string                    // 접기/펴기 시 노출 (선택)
  mentionedSymbols: string[]
  sentimentDirection: SentimentDirection
  horizon24h: NarrativeHorizonEvaluation
  horizon72h: NarrativeHorizonEvaluation
}

export interface NarrativeHistoryStats {
  total: number
  hitCount: number
  missCount: number
  partialCount: number
  pendingCount: number
  hitRateLabel: string             // "적중률 2/5"
}

// ═══════════════════════════════════════════════════════════════════
// § 3.5 KAIROS AI 메타 (Panel용)
// ═══════════════════════════════════════════════════════════════════

export type KairosLayerAgreement =
  | 'external_bullish_internal_bullish'
  | 'external_bearish_internal_bearish'
  | 'divergence'
  | 'both_neutral'

export interface KairosAiMeta {
  modelLabel: string               // "Haiku 4.5"
  refreshIntervalMinutes: number   // 5
  layerAgreement: KairosLayerAgreement
  layerAgreementDescription: string
  externalLayerSummary: string
  internalLayerSummary: string
  topMoversLine: string
  pipeline: {
    heroNarrative: string
    opportunities: string
    historyEval: string
  }
}

// ═══════════════════════════════════════════════════════════════════
// § 4. 오늘의 주요 이벤트
// ═══════════════════════════════════════════════════════════════════

export interface MarketEvent {
  id: string
  headline: string
  importance: Importance
  importanceLabel: string
  publishedAt: string
  elapsedLabel: string             // "1h 전"
  sourceUrl?: string               // 원문 링크
  n8nClassifiedAs?: string
  // Optional rich fields populated by the news_articles pipeline
  // (RSS → Claude Haiku). Legacy entries leave these undefined.
  sourceLabel?: string             // 'TokenPost' / 'CoinDesk'
  aiComment?: string               // 자체 1줄 코멘트 (원문 본문 X)
  aiLang?: 'ko' | 'en'
  coinTags?: string[]              // ['BTCUSDT', 'ETHUSDT', ...]
}

// ═══════════════════════════════════════════════════════════════════
// § 최상위 페이지 Props
// ═══════════════════════════════════════════════════════════════════

export interface InsightsPageData {
  hero: KairosHero
  kairosAi: KairosAiMeta
  opportunities: Opportunity[]
  history: {
    entries: NarrativeHistoryEntry[]
    stats: NarrativeHistoryStats
  }
  events: MarketEvent[]

  lastUpdatedAt: string
  dataSources: DataSources
}

export type InsightsPageMock = InsightsPageData

export interface DataSources {
  narrative: string                // "KAIROS Haiku 4.5"
  priceData: string                // "Binance Futures"
  news: string                     // "CryptoPanic Pro"
  classification: string           // "n8n self-hosted"
}

// ═══════════════════════════════════════════════════════════════════
// § Constants
// ═══════════════════════════════════════════════════════════════════

export const UNIVERSE_30: readonly string[] = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT',
  'AVAXUSDT', 'LINKUSDT', 'DOTUSDT', 'MATICUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
  'APTUSDT', 'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'INJUSDT', 'TIAUSDT', 'FILUSDT',
  'TRXUSDT', 'BCHUSDT', 'XLMUSDT', 'HBARUSDT', 'VETUSDT', 'TONUSDT', 'SHIBUSDT',
  'WIFUSDT', 'PEPEUSDT',
] as const

export const NARRATIVE_TAGS = [
  'L1 내러티브', 'L2 확장', '오라클 · RWA', '밈', 'AI 코인',
  'DeFi', 'GameFi', '거버넌스', '관망', '뉴스 미확정',
] as const

export const REGIME_LABEL_KO: Record<MarketRegime, string> = {
  surge: '급등',
  crash: '급락',
  strong_consolidation: '강보합',
  weak_consolidation: '약보합',
  sideways: '횡보',
  mixed: '혼조',
  watch: '관망',
}

export const VOLATILITY_LABEL_KO: Record<VolatilityLevel, string> = {
  low: '하',
  mid: '중',
  high: '상',
}

export const OUTCOME_LABEL_KO: Record<Outcome, '적중' | '빗나감' | '부분' | '평가 대기'> = {
  hit: '적중',
  miss: '빗나감',
  partial: '부분',
  pending: '평가 대기',
}
