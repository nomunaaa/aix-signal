// src/lib/mock/my-mock.ts
// AiXSignal /my 섹션 4페이지 공유 Mock 스키마
// 2026-04-20 · AIX-2 + AIX-3 + AIX-31 + AIX-32 구현용
//
// 페이지 매핑:
// - /my/profits      → MyProfitsPageMock     (AIX-3)
// - /my/positions    → MyPositionsPageMock   (AIX-31)
// - /my/history      → MyHistoryPageMock     (AIX-32)
// - 매매 입력 Modal  → TradeEntryModalMock   (AIX-2)

import type { ProofPeriod } from './proof-mock'
import type { CycleStrategyKey, StrategyAccentColor } from '@/lib/strategy-display'

export type StrategyKey = CycleStrategyKey
export type { StrategyAccentColor, ProofPeriod }

// ═══════════════════════════════════════════════════════════════════
// 전략 표시 메타 — strategy-display.ts가 Single Source Of Truth
// ═══════════════════════════════════════════════════════════════════

export { STRATEGY_DISPLAY, STRATEGY_ACCENT_HEX } from '@/lib/strategy-display'

// ═══════════════════════════════════════════════════════════════════
// 공용 도메인 타입 (4페이지 공유)
// ═══════════════════════════════════════════════════════════════════

export type Direction = 'LONG' | 'SHORT'
export type Engine = 'PULSE' | 'WAVE'
export type BarInterval = '1m' | '10m'
export type SignalSection = 'discount_entry' | 'take_profit' | 'non_trend' | 'waiting'
export type PositionState = 'open' | 'adding' | 'partial_closed' | 'closed'
export type FreshnessTier = 'normal' | 'imminent' | 'past'

export const SECTION_LABEL_KR: Record<SignalSection, string> = {
  discount_entry: '할인진입',
  take_profit: '수익실현',
  non_trend: '비추세',
  waiting: '대기신호',
}

export const FRESHNESS_LABEL_KR: Record<FreshnessTier, string> = {
  normal: '정상',
  imminent: '임박',
  past: '지남',
}

// ═══════════════════════════════════════════════════════════════════
// 공유 엔티티: Position (활성 + 청산 완료 양쪽에서 사용)
// ═══════════════════════════════════════════════════════════════════

export interface PositionEvent {
  eventType: 'open' | 'add' | 'partial_exit' | 'close'
  occurredAt: string                          // ISO
  price: number
  quantityPct: number                         // 50 (분할/추가) | 100 (최초/전량)
  label: string                               // "추가 50%" | "분할 50%" 등
}

export interface Position {
  id: string                                  // cycle_id
  symbol: string                              // 'XRPUSDT'
  direction: Direction
  leverage: number                            // 3
  strategy: StrategyKey                       // 'basic' | 'dca' | ...
  engine: Engine                              // 'PULSE' | 'WAVE'
  barInterval: BarInterval
  section: SignalSection                      // 진입 시점 섹션
  state: PositionState                        // 'open' | 'closed' 등
  
  // 가격·시간
  entryPrice: number                          // 최초 진입가
  avgEntryPrice: number                       // 평균단가 (추가 있으면 갱신)
  currentPrice: number | null                 // 활성만. 청산 완료 시 null
  exitPrice: number | null                    // 청산 완료만
  openedAt: string                            // ISO
  closedAt: string | null                     // 청산 완료만
  holdSec: number                             // 보유시간 (초, 계산값)
  
  // PnL (USDT 기준)
  realizedPnlUsd: number                      // 확정 (분할청산분)
  unrealizedPnlUsd: number                    // 미확정 (잔여, 활성만 > 0)
  totalPnlUsd: number                         // 확정 + 미확정
  totalPnlPct: number                         // %
  
  // 상태
  freshness: FreshnessTier
  events: PositionEvent[]                     // 발생한 이벤트 시퀀스
  eventSummary: string                        // "분할청산 완료 50%" | "대기 중" | "추가 1회" 등 (UI용 단일 라벨)
  engineMismatch: boolean                     // PULSE/WAVE 불일치 여부
  engineMismatchNote: string | null           // "PULSE 롱 · WAVE 관망" 등
  
  // 시그널 원본 (시그널 vs 나 비교용)
  signalRefPnlPct: number                     // 같은 사이클의 시그널 기본 전략 PnL%
}

// ═══════════════════════════════════════════════════════════════════
// § AIX-3 /my/profits 페이지 데이터
// ═══════════════════════════════════════════════════════════════════

export interface SignalVsMePair {
  symbol: string
  signalPnlPct: number                        // 시그널 원본 평균 수익률
  myPnlPct: number                            // 내 실제 평균 수익률
  diffPp: number                              // myPnlPct - signalPnlPct (%p)
  tradeCount: number                          // 해당 종목 매매 수
}

export interface MyKpiSummary {
  // 핵심 차별화 지표 (최상단 박스)
  // 상대비 공식: (myAvgPnl - signalAvgPnl) / |signalAvgPnl| * 100
  // 양수 = 시그널을 초과, 음수 = 시그널에 미달 (ORIGIN 고객 이해: 대부분 음수)
  excessReturnPct: number                     // "+5%" | "-17%"
  myAvgPnlPct: number                         // 2.1 (내 평균 수익률)
  signalAvgPnlPct: number                     // 2.0 (시그널 평균 수익률, 비교 근거)
  excessTradeRatio: {                         // "50건 중 32건이 시그널을 초과"
    beatCount: number
    missCount: number
    total: number
  }
  
  // 보조 KPI 4종
  totalPnlUsd: number                         // +2,847 USDT
  totalTrades: number                         // 50
  myWinRate: number                           // 0.76
  signalWinRate: number                       // 0.72
  winRateDiffPp: number                       // +4
  maxProfitUsd: number                        // +312
  maxLossUsd: number                          // -128
  myAvgHoldSec: number                        // 2h 14m
  signalAvgHoldSec: number                    // 1h 48m
}

export interface MyStrategyPerformance {
  key: StrategyKey
  displayName: string
  accentColor: StrategyAccentColor
  winRate: number                             // 0.72
  tradeCount: number                          // 18
  avgPnlPct: number                           // 2.1
}

export interface UserCycleCandidate {
  cycleId: string
  symbol: string
  direction: Direction
  strategy: StrategyKey
  closedAt: string
  pnlPct: number
  eligible: boolean                           // 발행 가능 여부
  closedAtLabel: string                       // "3h 전" | "1d 전"
}

export interface MyProfitsPageMock {
  generatedAtLabel: string
  currentPeriod: ProofPeriod
  kpi: MyKpiSummary
  symbolComparison: SignalVsMePair[]          // 상위 8종목
  strategyPerformance: MyStrategyPerformance[] // 4전략
  publishCandidates: UserCycleCandidate[]     // 발행 가능 매매 (2-3개)
}

// ═══════════════════════════════════════════════════════════════════
// § AIX-31 /my/positions 페이지 데이터
// ═══════════════════════════════════════════════════════════════════

export type PositionsSortKey = 'pnl' | 'opened_at' | 'freshness'

export interface MyPositionsKpi {
  activeCount: number                         // 4
  unrealizedPnlUsd: number                    // +182
  realizedPnlUsd: number                      // +47 (오늘 누적 분할청산분)
  totalPnlUsd: number                         // +229
}

export interface MyPositionsPageMock {
  generatedAtLabel: string
  kpi: MyPositionsKpi
  positions: Position[]                       // state !== 'closed' 인 포지션들
  sortKey: PositionsSortKey
}

// ═══════════════════════════════════════════════════════════════════
// § AIX-32 /my/history 페이지 데이터
// ═══════════════════════════════════════════════════════════════════

export type HistorySortKey = 'closed_at' | 'pnl' | 'hold_sec'

export interface HistoryFilters {
  period: ProofPeriod
  symbol: string | 'ALL'                      // 'ALL' | 'BTCUSDT' | ...
  strategy: StrategyKey | 'ALL'
  engine: Engine | 'ALL'
  signalCycleId?: string | 'ALL'               // 'ALL' | 시그널 cycle id (모의매매 전용 필터)
}

export interface MyHistoryKpi {
  total: number                               // 46
  wins: number                                // 34
  losses: number                              // 12
  winRate: number                             // 0.74
}

export interface MyHistoryPageMock {
  generatedAtLabel: string
  kpi: MyHistoryKpi
  filters: HistoryFilters
  sortKey: HistorySortKey
  rows: Position[]                            // state === 'closed' 인 포지션들
  hasMore: boolean
  remainingCount: number                      // "38건 남음"
}

// ═══════════════════════════════════════════════════════════════════
// § AIX-2 매매 입력 Modal 데이터
// ═══════════════════════════════════════════════════════════════════

export interface SignalContext {
  cycleId: string                             // 시그널 사이클 id
  symbol: string
  direction: Direction
  engine: Engine
  section: SignalSection
  signalPrice: number                         // 시그널 진입가
  currentPrice: number                        // 현재 시장가 (슬리피지 확인)
  kairosObservation: string                   // 관찰자 톤 2-3문장
  invalidationPrice: number                   // 시그널 무효 기준가
  targetPrice: number                         // 목표가
  generatedAt: string                         // 시그널 발생 시각
  generatedAtLabel: string                    // "2m 전 발생"
}

export interface TradeEntryScenario {
  targetProfitUsd: number                     // +81
  targetProfitPct: number                     // +16.2 (레버리지 반영)
  stopLossUsd: number                         // -55
  stopLossPct: number                         // -11.0
  liquidationPrice: number                    // 1.634
  liquidationPct: number                      // -33.3
}

export interface TradeEntryModalMock {
  signal: SignalContext
  // 폼 기본값
  defaultEntryPrice: number                   // = signal.signalPrice
  defaultInvestmentUsd: number                // 500
  defaultLeverage: number                     // 3
  defaultStrategy: StrategyKey                // 'basic'
  investmentQuickChips: number[]              // [100, 500, 1000, 5000]
  // 초기 시나리오 계산값 (전략·레버리지 변경 시 클라이언트에서 재계산)
  scenario: TradeEntryScenario
}
