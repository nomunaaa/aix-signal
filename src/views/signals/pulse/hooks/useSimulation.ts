/**
 * 시뮬레이션 + KAIROS 추천 훅 (V2).
 * 로그성장 최적화(Log-Growth Maximization) 기반 레버리지/자본비율 추천.
 * 핵심: 노출(exposure) x = r·L 을 통합 최적화 변수로 사용,
 * 전략별 α 계수로 추가매수(deep/full) 반영 후 분해.
 *
 * store의 simulationInput/selectedStrategy를 읽고,
 * KAIROS 계산 결과를 반환.
 */

import { useEffect, useMemo } from 'react';
import { usePulseStore } from '../stores/pulseStore';
import { readSharedSimulationInput, subscribeSharedSimulationInput } from '@/lib/simulationStorage';
import type {
  ClosedSignal,
  StrategyId,
  SimulationInput,
  KairosRecommendation,
} from '../types/pulse.types';
import { calculateHistorySimulationPnl } from '../utils/historyPnl';

export type { KairosRecommendation };

export interface SimulationCalcResult {
  /** 예상 손익 (USDT) */
  estimatedPnl: number;
  /** 예상 수익률 (%) */
  estimatedReturn: number;
  /** 최대 낙폭 (%) */
  maxDrawdown: number;
  /** 청산 예상가 (고레버리지 시) */
  liquidationPrice: number | null;
  /** 포지션 크기 (USDT) */
  positionSize: number;
  /** 자본 대비 비율 (%) */
  capitalRatioPercent: number;
}

export interface KellyBreakdown {
  /** 원본 켈리 비율 — x* (최적 노출, raw) */
  rawKelly: number;
  /** 보수적 적용 후 — xRec (backward compat) */
  safeKelly: number;
  /** Fractional Kelly 범위 [r_min%, r_max%] */
  fractionalRange: [number, number];
  /** 최적 자본비율 r_optimal (%) */
  optimalFraction: number;
  /** 공식 텍스트 */
  formula: string;
  /** MDD 기반 최대 안전 레버리지 */
  maxSafeLeverage: number;
  /** MDD (%) */
  mddPct: number;
  /** x* — 감쇠 전 최적 노출 */
  optimalExposure: number;
  /** xRec = ε × x* (cap 적용 후) */
  recommendedExposure: number;
  /** ε 값 (fractional Kelly 감쇠 계수) */
  epsilon: number;
  /** α — 추가매수 반영 계수 (0 for oneshot/safe) */
  alpha: number;
  /** g(xRec) — 트레이드당 기대 로그수익률 */
  logGrowthAtRec: number;
}

export interface UseSimulationReturn {
  result: SimulationCalcResult | null;
  kairos: KairosRecommendation | null;
  kellyBreakdown: KellyBreakdown | null;
  isCalculating: boolean;
  input: SimulationInput;
  setCapital: (v: number) => void;
  setCapitalRatio: (v: number) => void;
  setLeverage: (v: number) => void;
}

export interface UseSimulationOptions {
  historySignals?: ClosedSignal[];
}

// ── 전략별 기본 파라미터 (백테스트 기반) ──

const STRATEGY_PARAMS: Record<
  StrategyId,
  {
    p: number; // 승률
    a: number; // 승리 시 단위 노출당 평균 수익 (양수)
    b: number; // 패배 시 단위 노출당 평균 손실 (양수)
    alpha: number; // 추가매수 계수 (0: oneshot/safe, >0: deep/full)
  }
> = {
  oneshot: { p: 0.72, a: 0.042, b: 0.028, alpha: 0 },
  safe: { p: 0.78, a: 0.063, b: 0.022, alpha: 0 },
  deep: { p: 0.68, a: 0.087, b: 0.045, alpha: 0.5 },
  full: { p: 0.81, a: 0.112, b: 0.038, alpha: 0.5 },
};

/** Fractional Kelly 감쇠 계수 — [0.25, 0.5] 범위 중심값 */
const EPSILON = 0.4;
/** 최대 노출 캡 (자본의 50%) */
const X_MAX = 0.5;
const SAMPLE_COUNT_BASE = 150;
const AVG_TRADES_PER_MONTH = 20;

/**
 * KAIROS 계산: 로그성장 최적화 기반 레버리지/자본비율 추천 + 시뮬레이션 결과.
 * g(x) = p·ln(1+xa) + q·ln(1-xb) → x* = (pa - qb) / (ab)
 * 노출(exposure) x = r·L 을 통합 최적화 변수로 사용.
 */
function calculateKairos(
  input: SimulationInput,
  strategy: StrategyId,
  historySignals?: ClosedSignal[]
): { result: SimulationCalcResult; kairos: KairosRecommendation; kellyBreakdown: KellyBreakdown } {
  const { p, a, b, alpha } = STRATEGY_PARAMS[strategy];
  const q = 1 - p;

  // ── Step 1: 최적 노출 (로그성장 극대화) ──
  // g'(x) = 0 → x* = (pa - qb) / (ab)
  const xStar = (p * a - q * b) / (a * b);

  // ── Step 2: Fractional Kelly 감쇠 + 캡 ──
  const xRec = Math.min(EPSILON * Math.max(0, xStar), X_MAX);

  // ── Step 3: MDD 기반 레버리지 범위 ──
  const mddRaw = b * 3; // MDD = 3 × 평균 손실
  const lMax = Math.min(50, 1 / (b * 3));
  const leverageMax = Math.max(2, Math.round(lMax));
  const leverageMin = Math.max(1, Math.round(lMax * 0.3));
  const optimalLeverage = Math.round((leverageMin + leverageMax) / 2);

  // ── Step 4: 전략별 자본비율 분해 ──
  // effective_x = r × (1+α) × L → r = xRec / ((1+α) × L)
  const denominator = 1 + alpha;
  const rOptimal = (xRec / (denominator * optimalLeverage)) * 100;
  const rMin = (xRec / (denominator * leverageMax)) * 100;
  const rMax = (xRec / (denominator * leverageMin)) * 100;

  const capitalRatioMin = Math.round(rMin * 10) / 10;
  const capitalRatioMax = Math.round(rMax * 10) / 10;
  const optimalCapitalRatio = Math.round(rOptimal * 10) / 10;

  // ── 시뮬레이션 결과 (사용자 입력 기반) ──
  const userCapitalRatio = input.capitalRatio / 100;
  const entryAmount = input.capital * userCapitalRatio;
  const positionSize = entryAmount * input.leverage;
  const capitalRatioPercent = input.capitalRatio;
  const historicalPnl =
    historySignals == null
      ? null
      : historySignals.reduce(
          (sum, signal) => sum + calculateHistorySimulationPnl(signal, input, strategy).pnlAmount,
          0
        );
  const estimatedPnl =
    historicalPnl == null ? entryAmount * (a * input.leverage * p) : historicalPnl;
  const estimatedReturn =
    historicalPnl == null
      ? a * input.leverage * p
      : entryAmount > 0
        ? historicalPnl / entryAmount
        : 0;
  const maxDrawdown = -b * input.leverage;
  const liquidationPrice = input.leverage >= 20 ? input.capital * 0.95 : null;

  // ── 로그성장률 기반 월 복리수익 ──
  // 사용자의 실제 노출에서의 로그성장률 계산
  const userExposure = userCapitalRatio * denominator * input.leverage;
  const safeUserExposure = Math.min(userExposure, 1 / b - 0.001); // 1/b 미만 보장
  const gUser =
    safeUserExposure > 0
      ? p * Math.log(1 + safeUserExposure * a) + q * Math.log(1 - safeUserExposure * b)
      : 0;
  const rawMonthly = (Math.pow(1 + Math.max(0, gUser), AVG_TRADES_PER_MONTH) - 1) * 100;
  const monthlyReturn = Math.max(-100, Math.min(200, rawMonthly));

  // 추천 노출에서의 로그성장률 (breakdown용)
  const gRec = xRec > 0 ? p * Math.log(1 + xRec * a) + q * Math.log(1 - xRec * b) : 0;

  // ── 리스크 레벨 ──
  let riskLevel: KairosRecommendation['riskLevel'] = 'LOW';
  const leverageExcess = input.leverage / (leverageMax || 1);
  const ratioExcess = input.capitalRatio / (capitalRatioMax || 1);
  const combinedRisk = leverageExcess * ratioExcess;
  if (combinedRisk > 3) riskLevel = 'EXTREME';
  else if (combinedRisk > 2) riskLevel = 'HIGH';
  else if (combinedRisk > 1) riskLevel = 'MEDIUM';

  // 신뢰도·표본: 모의 지표이므로 고정 표본 수만 사용 (난수 금지)
  const sampleSize = historySignals == null ? SAMPLE_COUNT_BASE + 50 : historySignals.length;
  const confidence = Math.min(100, Math.round(sampleSize / 2));

  // Kelly breakdown (tooltip용)
  const kellyBreakdown: KellyBreakdown = {
    rawKelly: Math.round(xStar * 100) / 100,
    safeKelly: Math.round(xRec * 100) / 100,
    fractionalRange: [capitalRatioMin, capitalRatioMax],
    optimalFraction: optimalCapitalRatio,
    formula: `g(x) = ${p}·ln(1+${a}x) + ${q.toFixed(2)}·ln(1-${b}x)`,
    maxSafeLeverage: Math.round(lMax * 10) / 10,
    mddPct: Math.round(mddRaw * 1000) / 10,
    optimalExposure: Math.round(xStar * 100) / 100,
    recommendedExposure: Math.round(xRec * 1000) / 1000,
    epsilon: EPSILON,
    alpha,
    logGrowthAtRec: Math.round(gRec * 100000) / 100000,
  };

  return {
    result: {
      estimatedPnl,
      estimatedReturn: estimatedReturn * 100,
      maxDrawdown: maxDrawdown * 100,
      liquidationPrice,
      positionSize,
      capitalRatioPercent,
    },
    kairos: {
      leverageMin,
      leverageMax,
      capitalRatioMin,
      capitalRatioMax,
      optimalCapitalRatio,
      optimalLeverage,
      riskLevel,
      expectedDD: maxDrawdown * 100,
      liquidationRisk: Math.min(100, (input.leverage / 125) * 100),
      confidence,
      estimatedMonthlyReturn: Math.round(monthlyReturn * 10) / 10,
      evidence: `최근 90일 · 표본 ${sampleSize}건`,
    },
    kellyBreakdown,
  };
}

export function useSimulation(options: UseSimulationOptions = {}): UseSimulationReturn {
  const selectedStrategy = usePulseStore((s) => s.selectedStrategy);
  const simulationInput = usePulseStore((s) => s.simulationInput);
  const setSimulationInput = usePulseStore((s) => s.setSimulationInput);

  useEffect(() => {
    usePulseStore.setState({ simulationInput: readSharedSimulationInput() });
    return subscribeSharedSimulationInput((input) => {
      usePulseStore.setState({ simulationInput: input });
    });
  }, []);

  const { result, kairos, kellyBreakdown } = useMemo(
    () => calculateKairos(simulationInput, selectedStrategy, options.historySignals),

    [
      simulationInput.capital,
      simulationInput.capitalRatio,
      simulationInput.leverage,
      selectedStrategy,
      options.historySignals,
    ]
  );

  return {
    result,
    kairos,
    kellyBreakdown,
    isCalculating: false, // 동기 계산
    input: simulationInput,
    setCapital: (v: number) => setSimulationInput({ capital: v }),
    setCapitalRatio: (v: number) => {
      const r = Number.isFinite(v) ? Math.round(v) : 100;
      setSimulationInput({ capitalRatio: Math.min(100, Math.max(1, r)) });
    },
    setLeverage: (v: number) => setSimulationInput({ leverage: v }),
  };
}
