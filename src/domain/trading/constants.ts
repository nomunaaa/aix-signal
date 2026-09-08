/**
 * Trading Constants
 * FE/BE 공유 상수 (도메인 전반에서 사용)
 */

/**
 * 시뮬레이션 기본값
 * BE와 FE에서 동일하게 사용
 */
export const DEFAULT_SIMULATION_CONSTANTS = {
  BASE_CAPITAL: 10000, // $10,000
  ENTRY_FRACTION: 0.04, // 4%
  DEFAULT_LEVERAGE: 10, // 10x
  MAX_LEVERAGE: 125,
  MIN_LEVERAGE: 1,
  STOP_LOSS_PERCENT: 2, // 2%
  TAKE_PROFIT_PERCENT: 5, // 5%
} as const;

/**
 * 수수료 설정
 */
export const FEE_CONSTANTS = {
  MAKER_FEE: 0.0002, // 0.02%
  TAKER_FEE: 0.0004, // 0.04%
  DEFAULT_USE_TAKER: true,
} as const;

/**
 * 범위 분석 임계값
 */
export const RANGE_CONSTANTS = {
  BOTTOM_THRESHOLD: 0.33, // 0-33%: 하단 존
  TOP_THRESHOLD: 0.66, // 66-100%: 상단 존
  EPSILON: 0.0001, // 0 나누기 방지
} as const;

/**
 * 추세 타입
 */
export type TrendType = 'UP' | 'DOWN' | 'FLAT';

/**
 * 변동성 레벨
 */
export type VolatilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * 범위 존
 */
export type RangeZone = 'BOTTOM' | 'MID' | 'TOP';

