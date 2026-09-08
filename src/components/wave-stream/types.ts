/**
 * One-Card System Types
 */

export type OneCardSide = 'LONG' | 'SHORT' | null;
export type OneCardTrendLabel = 'TREND' | 'RANGE' | 'SHOCK';
export type OneCardCounterTrend = 'NONE' | 'SHORT_TERM' | 'FULL';
export type OneCardBadge = 'Quiet' | 'Align' | 'Noise' | 'CT-Short' | 'CT-Full';
export type OneCardState = 'closed' | 'peek' | 'open' | 'focus' | 'disabled';
export type OneCardCTA = 'execute' | 'keep' | 'wait';

export interface SparkDataPoint {
  t: string; // ISO8601 timestamp
  v: number; // value
  marker?: 'entry' | 'exit' | 'switch';
}

export interface OneCardProps {
  asset: string; // 예: 'BTCUSDT'
  side: OneCardSide;
  entryScore: number; // 0–100
  pnlScore: number; // -100–100
  trendLabel: OneCardTrendLabel;
  counterTrend: OneCardCounterTrend;
  badges?: OneCardBadge[];
  spark: SparkDataPoint[];
  explanation: string; // 한 문장 해설
  timestamp: string; // ISO8601
  disabled?: boolean;
  onExecute?: () => void;
  onWait?: () => void;
  onKeep?: () => void;
  // Internal state
  state?: OneCardState;
  onStateChange?: (state: OneCardState) => void;
  // Focus management
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface OneCardExplanation {
  id: number;
  template: string;
  params?: Record<string, string | number>;
}

// 12종 해설 템플릿
export const EXPLANATION_TEMPLATES = {
  VALID_ENTRY: '유효진입 {entryScore}% · 지금 체결 여지 있음.',
  PNL_KEEP: 'PnL {pnlScore} · 흐름 유지, 재진입 금지.',
  COUNTER_TREND_SHORT: '단기 역추세 유효 · 방어 우선.',
  COUNTER_TREND_FULL: '완전 역추세 유효 · 방어 우선.',
  NOISE_WAIT: '소음 구간 · 대기 권장.',
  ALIGNED_POSITION: '정렬 완료 · 한 포지션만 유지.',
  SPREAD_EXCESS: '스프레드 과다 · 체결 지연 예상.',
  DEPTH_INSUFFICIENT: '깊이 부족 · 유동성 확인 후 진행.',
  COOLDOWN: '쿨다운 {seconds}초 남음 · 재진입 차단.',
  NARRATIVE_OVERHEAT: '내러티브 과열 · 신호 노출 지연.',
  INTEGRITY_RECHECK: '정합 재확인 필요 · 다음 분봉 대기.',
  NO_SIGNAL: '신호 없음 · 지금은 소음입니다.',
} as const;

