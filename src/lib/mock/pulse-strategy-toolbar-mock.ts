/**
 * Pulse 액션바 — 전략 Collapsible용 MVP Mock KPI (추후 API).
 */

import type { StrategyId } from '@/views/signals/pulse/types/pulse.types';
import { getStrategyBoardWinRatePct } from '@/lib/mock/pulse-strategy-source';

export type DcaSignalState = 'pending' | 'triggered' | 'expired';

export interface StrategyToolbarMock {
  winRate: number;
  kpi2Label: string;
  kpi2Value: string;
  kpi3Label: string;
  kpi3Value: string;
  avgPnlPct?: number;
  avgHoldMin?: number;
  dcaTriggerPct?: number;
  entryImprovePct?: number;
  partialTriggerPct?: number;
  profitLockPct?: number;
  fullCyclePct?: number;
  dcaSignalState?: DcaSignalState;
  partialSignalState?: DcaSignalState;
  /** vs 원샷 한 줄 (원샷 제외) */
  vsOneshotLine: string | null;
  /** 추가 신호 블록 — 없으면 null */
  extraSignalsBlock: { title: string; lines: string[] } | null;
}

const MOCK_BY_STRATEGY: Record<StrategyId, StrategyToolbarMock> = {
  oneshot: {
    winRate: 72,
    kpi2Label: '평균 PnL%',
    kpi2Value: '+3.6%',
    kpi3Label: '평균 보유시간',
    kpi3Value: '48분',
    avgPnlPct: 3.6,
    avgHoldMin: 48,
    vsOneshotLine: null,
    extraSignalsBlock: null,
  },
  deep: {
    winRate: 74,
    kpi2Label: '추가진입 발동률',
    kpi2Value: '44%',
    kpi3Label: '평균 진입가 개선',
    kpi3Value: '+4.4%',
    dcaTriggerPct: 44,
    entryImprovePct: 3.1,
    dcaSignalState: 'pending',
    vsOneshotLine: 'DCA 전/후 승률 변화: 62% → 78%',
    extraSignalsBlock: {
      title: '이 전략의 추가 신호',
      lines: ['분할매수 1회 · 상태: pending / triggered / expired (모의)'],
    },
  },
  safe: {
    winRate: 71,
    kpi2Label: '분할청산 발동률',
    kpi2Value: '52%',
    kpi3Label: '평균 수익 확보율',
    kpi3Value: '+3.4%',
    partialTriggerPct: 52,
    profitLockPct: 2.0,
    partialSignalState: 'triggered',
    vsOneshotLine: '분할 후 잔여 포지션 평균 PnL: +1.2%',
    extraSignalsBlock: {
      title: '이 전략의 추가 신호',
      lines: ['분할청산 1회 · 상태: triggered'],
    },
  },
  full: {
    winRate: 69,
    kpi2Label: '추가진입 발동률',
    kpi2Value: '38%',
    kpi3Label: '분할청산 발동률',
    kpi3Value: '41%',
    dcaTriggerPct: 38,
    partialTriggerPct: 41,
    dcaSignalState: 'triggered',
    partialSignalState: 'expired',
    vsOneshotLine: '풀사이클 완주율: 45% (두 신호 모두 발동된 비율)',
    extraSignalsBlock: {
      title: '이 전략의 추가 신호',
      lines: ['분할매수 1회 · 상태: triggered', '분할청산 1회 · 상태: expired'],
    },
  },
};

export function getStrategyToolbarMock(id: StrategyId): StrategyToolbarMock {
  const base = MOCK_BY_STRATEGY[id];
  const win = getStrategyBoardWinRatePct(id);
  return {
    ...base,
    winRate: Math.round(win * 10) / 10,
  };
}

export const STRATEGY_RISK_COPY: Record<StrategyId, string> = {
  oneshot: '손절 기준: -3%에서 자동 청산',
  deep: '추가 자금 필요 (시뮬레이션 금액의 2배)',
  safe: '조기 청산 시 남은 포지션 리스크',
  full: '최대 투입 자금 (시뮬레이션 금액의 2배)',
};

export const STRATEGY_ONE_LINE: Record<StrategyId, string> = {
  oneshot: '1회 진입, 1회 청산. 가장 심플한 전략',
  deep: '하락 시 1회 추가 매수로 평균 단가를 낮추는 전략',
  safe: '수익 구간에서 1회 분할 청산으로 수익을 확보하는 전략',
  full: '추가 매수 + 분할 청산을 모두 사용하는 풀 전략',
};
