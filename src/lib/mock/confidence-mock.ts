import {
  type StreamConfidence,
  type StrategyConfidence,
  type MarketFitness,
  type MarketType,
  type ConfidenceStrategyType,
  getConfidenceGrade,
  getFitnessGrade,
  STRATEGY_UNIQUE_LABELS,
  MARKET_TYPE_LABELS,
} from '@/lib/confidence';
import { SYMBOL_STATS } from '@/lib/mock/realistic-data';

const MARKET_ROTATION: MarketType[] = ['ranging', 'trending', 'volatile', 'ranging'];

export function getCurrentMarketType(): MarketType {
  const idx = Math.floor(Date.now() / 600000) % MARKET_ROTATION.length;
  return MARKET_ROTATION[idx];
}

/** 최근 3일 롤링 평균 기준 목 승률·모멘텀 (추후 API 교체) */
export function getStreamConfidence(stream: 'pulse' | 'wave'): StreamConfidence {
  const data = {
    pulse: { win_rate: 86, streak: 4, avg_pnl: 3.2, sample_size: 24 },
    wave: { win_rate: 74, streak: 1, avg_pnl: 2.6, sample_size: 22 },
  }[stream];

  const momentumNorm = Math.max(0, Math.min(100, ((data.streak + 5) / 10) * 100));
  const pnlNorm = Math.min(100, Math.max(0, (data.avg_pnl / 3) * 100));
  const score = Math.round(data.win_rate * 0.4 + momentumNorm * 0.3 + pnlNorm * 0.3);

  return {
    ...data,
    score,
    grade: getConfidenceGrade(score),
  };
}

const STRATEGY_MOCK_DATA: Record<
  ConfidenceStrategyType,
  { win_rate: number; unique_effect: number; sample_size: number }
> = {
  basic: { win_rate: 68, unique_effect: 72, sample_size: 45 },
  dca: { win_rate: 74, unique_effect: 65, sample_size: 32 },
  partial_exit: { win_rate: 71, unique_effect: 58, sample_size: 28 },
  dca_partial: { win_rate: 66, unique_effect: 45, sample_size: 15 },
};

export function getStrategyConfidence(strategy: ConfidenceStrategyType): StrategyConfidence {
  const d = STRATEGY_MOCK_DATA[strategy];
  const sampleScore = Math.min(d.sample_size / 20, 1) * 100;
  const score = Math.round(d.win_rate * 0.5 + d.unique_effect * 0.3 + sampleScore * 0.2);

  return {
    score,
    win_rate: d.win_rate,
    unique_effect: d.unique_effect,
    unique_label: STRATEGY_UNIQUE_LABELS[strategy],
    sample_size: d.sample_size,
    grade: getConfidenceGrade(score),
  };
}

/** MVP: 기획안과 동일한 시장 적합도 스코어 (추후 signal_cycles 기반으로 교체) */
const MVP_MARKET_FITNESS_SCORE: Record<ConfidenceStrategyType, number> = {
  basic: 95,
  dca: 120,
  partial_exit: 110,
  dca_partial: 85,
};

export function getMarketFitness(strategy: ConfidenceStrategyType): MarketFitness {
  const market = getCurrentMarketType();
  const overallWin = STRATEGY_MOCK_DATA[strategy].win_rate;
  const score = MVP_MARKET_FITNESS_SCORE[strategy];
  const ratio = overallWin === 0 ? 1 : score / 100;
  const strategyWinInMarket = Math.min(96, Math.round(overallWin * ratio + (strategy === 'dca' ? 12 : 6)));

  return {
    score,
    market_type: market,
    market_label: MARKET_TYPE_LABELS[market],
    strategy_win_in_market: strategyWinInMarket,
    overall_win: overallWin,
    grade: getFitnessGrade(score),
  };
}

export function getStrategyRisk(strategy: ConfidenceStrategyType, simAmount: number): string {
  return {
    basic: '손절 기준: -3%에서 자동 청산',
    dca: `추가 자금 필요: $${simAmount.toLocaleString('en-US')} (총 $${(simAmount * 2).toLocaleString('en-US')})`,
    partial_exit: '조기 청산 시 남은 포지션 리스크',
    dca_partial: `최대 투입 자금: $${(simAmount * 2).toLocaleString('en-US')}`,
  }[strategy];
}

export function getStrategyComparison(strategy: ConfidenceStrategyType): string | null {
  return {
    basic: null,
    dca: 'DCA 전/후 승률 변화: 62% → 78%',
    partial_exit: '분할 후 잔여 포지션 평균 PnL: +1.2%',
    dca_partial: '풀사이클 완주율: 45%',
  }[strategy];
}

export function getRecentResults(symbol: string): ('W' | 'L')[] {
  return SYMBOL_STATS[symbol]?.recent_results ?? ['W', 'L', 'W', 'L', 'W'];
}

/** Pulse UI strategy id → confidence mock strategy type */
export function pulseStrategyIdToConfidenceType(
  id: 'oneshot' | 'safe' | 'deep' | 'full',
): ConfidenceStrategyType {
  const m: Record<typeof id, ConfidenceStrategyType> = {
    oneshot: 'basic',
    deep: 'dca',
    safe: 'partial_exit',
    full: 'dca_partial',
  };
  return m[id];
}
