/**
 * Trend Board v2 Types
 * Pulse/Wave 통합 추세 보드
 */

// 엔진 모드
export enum EngineMode {
  PULSE = 'PULSE', // 1분봉
  WAVE = 'WAVE',   // 10분봉
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  FLAT = 'FLAT',
}

export enum VolatilityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

// PULSE 전용 시나리오
export enum PulseScenarioType {
  FLASH_BREAKOUT = 'FLASH_BREAKOUT',   // ⚡ 급등 돌파
  LIQUIDITY_HUNT = 'LIQUIDITY_HUNT',   // 💧 유동성 헌팅
  PANIC_SELLING = 'PANIC_SELLING',     // 💣 패닉 셀
  FOMO_ZONE = 'FOMO_ZONE',             // 🚀 FOMO 구간
}

// WAVE 전용 시나리오
export enum WaveScenarioType {
  TREND_SURFING = 'TREND_SURFING',     // 🏄‍♂️ 추세 서핑
  DEEP_ANCHOR = 'DEEP_ANCHOR',         // ⚓ 바닥 다지기
  STORM_BREWING = 'STORM_BREWING',     // 🌪 폭풍 전야
  TREND_REVERSAL = 'TREND_REVERSAL',   // 🛑 추세 전환
}

export type ScenarioType = PulseScenarioType | WaveScenarioType;

// 시나리오 메타데이터 (UI용)
export const SCENARIO_METADATA: Record<ScenarioType, { label: string; emoji: string }> = {
  [PulseScenarioType.FLASH_BREAKOUT]: { label: 'Flash Breakout', emoji: '⚡' },
  [PulseScenarioType.LIQUIDITY_HUNT]: { label: 'Liquidity Hunt', emoji: '💧' },
  [PulseScenarioType.PANIC_SELLING]: { label: 'Panic Selling', emoji: '💣' },
  [PulseScenarioType.FOMO_ZONE]: { label: 'FOMO Zone', emoji: '🚀' },
  [WaveScenarioType.TREND_SURFING]: { label: 'Trend Surfing', emoji: '🏄‍♂️' },
  [WaveScenarioType.DEEP_ANCHOR]: { label: 'Deep Anchor', emoji: '⚓' },
  [WaveScenarioType.STORM_BREWING]: { label: 'Storm Brewing', emoji: '🌪' },
  [WaveScenarioType.TREND_REVERSAL]: { label: 'Trend Reversal', emoji: '🛑' },
};

/**
 * Group A: X-고유 신호 (Technical Core)
 */
export interface XCoreSignals {
  noiseScore: number;              // 0~100
  ancActive: boolean;
  shortTermTrend: TrendDirection;
  longTermTrend: TrendDirection;
  volatility: VolatilityLevel;
}

/**
 * Group B: 가격 컨텍스트 (Price Context)
 */
export interface PriceContext {
  currentPriceUsd: number;
  midPrice30dUsd: number;          // (30D High + Low) / 2
  discountVs30dMidPct: number;     // (current - mid) / mid × 100
  vwapUsd: number;
  vwapGapPct: number;              // (current - vwap) / vwap × 100
  isBelowVwap: boolean;
  change24h?: number;              // 24h % change
  /** Populated by client store when distinct from `change24h`. */
  dailyChange?: number;
  highest24h?: number;             // 24h highest price
  lowest24h?: number;              // 24h lowest price
}

/**
 * Group C: 트렌드 인사이트 (AI Reasoning)
 */
export interface TrendInsight {
  confidencePct: number;           // 0~100
  upsidePotentialPct: number;      // 상승 여력 (%)
  engineMode: EngineMode;
  scenario: ScenarioType;
  
  // 정렬용 점수
  hotScore: number;                // confidence × upside
  safeScore: number;               // (100 - noise) × alignment
  highVolScore: number;            // volatility × upside
  discountScore: number;           // |discount| + |vwapGap|
}

/**
 * Trend Board Card (통합 뷰 모델)
 */
export interface TrendBoardCard {
  symbol: string;
  name?: string;
  engineMode: EngineMode;
  
  groupA: XCoreSignals;
  groupB: PriceContext;
  groupC: TrendInsight;
  
  lastUpdatedTs: string;
  isHolding: boolean;
  direction?: 'LONG' | 'SHORT' | 'NONE';
}

/**
 * 정렬 모드
 */
export enum SortMode {
  HOT_OPPORTUNITY = 'HOT_OPPORTUNITY',
  SAFE_HAVEN = 'SAFE_HAVEN',
  HIGH_VOL = 'HIGH_VOL',
  DISCOUNT_KING = 'DISCOUNT_KING',
}

/**
 * 필터
 */
export interface TrendBoardFilter {
  direction?: 'LONG' | 'SHORT';
  onlyActionable?: boolean;
  onlyHolding?: boolean;
  riskMode?: 'LOW_RISK' | 'HIGH_RETURN';
}

