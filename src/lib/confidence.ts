import { getGradeColors } from './color-scale';

// === Types (signal board confidence — separate from signal_actions StrategyType) ===

export type MarketType = 'trending' | 'ranging' | 'volatile' | 'crash';
export type ConfidenceStrategyType = 'basic' | 'dca' | 'partial_exit' | 'dca_partial';

export interface StreamConfidence {
  score: number;
  win_rate: number;
  streak: number;
  avg_pnl: number;
  sample_size: number;
  grade: 'high' | 'medium' | 'low';
}

export interface StrategyConfidence {
  score: number;
  win_rate: number;
  unique_effect: number;
  unique_label: string;
  sample_size: number;
  grade: 'high' | 'medium' | 'low';
}

export interface MarketFitness {
  score: number;
  market_type: MarketType;
  market_label: string;
  strategy_win_in_market: number;
  overall_win: number;
  grade: 'fit' | 'neutral' | 'unfit';
}

export function getConfidenceGrade(score: number): 'high' | 'medium' | 'low' {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

/** 경과 분 기준 신선도 등급 (짧을수록 신선) */
export function getFreshnessGradeFromMinutes(minutes: number): 'high' | 'medium' | 'low' {
  if (minutes < 15) return 'high';
  if (minutes < 45) return 'medium';
  return 'low';
}

export function getFitnessGrade(score: number): 'fit' | 'neutral' | 'unfit' {
  if (score >= 100) return 'fit';
  if (score >= 80) return 'neutral';
  return 'unfit';
}

export function getConfidenceColor(grade: 'high' | 'medium' | 'low') {
  const g = getGradeColors(grade);
  return { dot: g.dot, text: g.text, bg: g.pillBg };
}

/**
 * Market fitness grade → color set. Fitness is a quality metric, not a
 * directional one, so it lives on the VIS-002 score axis (no red).
 */
export function getFitnessColor(grade: 'fit' | 'neutral' | 'unfit') {
  return {
    fit: { dot: 'bg-score-excellent', text: 'text-score-excellent', label: '적합' },
    neutral: { dot: 'bg-score-neutral', text: 'text-score-neutral', label: '보통' },
    unfit: { dot: 'bg-score-bad', text: 'text-score-bad', label: '부적합' },
  }[grade];
}

export const MARKET_TYPE_LABELS: Record<MarketType, string> = {
  trending: '추세장',
  ranging: '횡보장',
  volatile: '고변동장',
  crash: '급락장',
};

export const STRATEGY_LABELS: Record<
  ConfidenceStrategyType,
  { name: string; desc: string }
> = {
  basic: { name: '원샷', desc: '1회 진입, 1회 청산' },
  dca: { name: '딥바이', desc: '하락 시 1회 추가 매수' },
  partial_exit: { name: '세이프', desc: '수익 구간 1회 분할 청산' },
  dca_partial: { name: '올플랜', desc: '추가 매수 + 분할 청산' },
};

export const STRATEGY_UNIQUE_LABELS: Record<ConfidenceStrategyType, string> = {
  basic: '시간 효율',
  dca: 'DCA 반등률',
  partial_exit: '청산 보호율',
  dca_partial: '풀사이클 완주율',
};
