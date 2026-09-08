/**
 * Signal API Types - ONE Signal and Scanning Signal
 */

export interface AIAnalysis {
  trend_long: 'up' | 'down' | 'neutral';
  trend_short: 'up' | 'down' | 'neutral';
  volatility: 'High' | 'Mid' | 'Low';
  analysis_text: string;
  risk_level: 'High' | 'Mid' | 'Low';
}

export interface OneSignal {
  asset: string;
  signal_type: 'ONE';
  direction: 'Long' | 'Short';
  entry_price: number;
  exit_price: number;
  expected_return_pct: number;
  risk_reward_ratio: number;
  strategy_id: number;
  strategy_name: string;
  strategy_cumulative_return_pct: number;
  timestamp: string;
  ai_analysis: AIAnalysis;
}

export interface ScanningSignal {
  asset: string;
  signal_type: 'Scanning';
  pattern_id: string;
  direction: 'Long' | 'Short';
  entry_price: number;
  exit_price: number;
  expected_win_rate_pct: number;
  pattern_match_rate_pct: number;
  pattern_occurrences_last_week: number;
  pattern_hits_last_week: number;
  timestamp: string;
  ai_analysis: AIAnalysis;
}

export interface OneSignalRequest {
  asset: string;
  limit?: number;
}

export interface ScanningSignalRequest {
  asset: string;
  limit?: number;
}

/**
 * 분류된 시그널 (UI용 확장 타입)
 */
export type SignalCategory =
  | 'RECENT_ENTRY'      // 최근진입
  | 'TREND_VALID_ENTRY' // 추세-유효진입
  | 'TREND_PROFITABLE'  // 추세-수익실현
  | 'COUNTER_STOPLOSS'  // 비추세-손절매
  | 'COUNTER_HOLD';     // 비추세-관망

export interface ClassifiedSignal extends OneSignal {
  /** 시그널 카테고리 */
  category: SignalCategory;
  /** 방향성 고려한 실질 변동률 */
  effectiveChange: number;
  /** 현재 가격 (실시간) */
  currentPrice: number;
}

// ========== 이벤트 타입 ==========
export type SignalEvent =
  | 'NEW_ENTRY'           // 신규 시그널 발생
  | 'TREND_CONFIRMED'     // 추세 확정 (neutral → up/down)
  | 'CATEGORY_MOVED'      // 카테고리 이동
  | 'PROFIT_ZONE'         // 수익 구간 진입
  | 'TARGET_REACHED'      // 목표가 도달
  | 'STOPLOSS_TRIGGERED'  // 손절 트리거
  | 'TREND_REVERSAL';     // 추세 역전

// ========== 이동 정보 ==========
export interface SignalMovement {
  /** 이전 카테고리 (null = 신규) */
  fromCategory: SignalCategory | null;
  /** 이동 시간 ISO */
  movedAt: string;
}

// ========== 확장된 분류 시그널 ==========
export interface ExtendedClassifiedSignal extends ClassifiedSignal {
  /** 이동 정보 */
  movement?: SignalMovement;
  /** 불일치 유형 (비추세용) */
  mismatchType?: 'long' | 'short';
  /** 고유 ID (추적용) */
  signalId: string;
}

// ========== 히스토리 항목 ==========
export interface SignalHistoryEntry {
  id: string;
  asset: string;
  direction: 'Long' | 'Short';
  entryPrice: number;
  exitPrice?: number;
  entryTime: string;
  exitTime?: string;
  pnlValue?: number;
  pnlPercent?: number;
  status: 'active' | 'closed';
}

// ========== 통계 상태 ==========
export interface SignalStatsState {
  /** 청산된 포지션들 (평균 시간 계산용) */
  closedPositions: {
    entryTime: Date;
    exitTime: Date;
  }[];
  /** 24시간 내 시그널 ID 목록 */
  signals24h: string[];
  /** 카테고리 이동 기록 */
  categoryMovements: {
    timestamp: Date;
    signalId: string;
    from: SignalCategory;
    to: SignalCategory;
  }[];
}

// ========== 이벤트 로그 ==========
export interface SignalEventLog {
  id: string;
  event: SignalEvent;
  category: SignalCategory;
  asset: string;
  message: string;
  timestamp: string;
}
