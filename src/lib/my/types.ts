// Domain SST for /my section — adapter-ready for real DB transition
// Mirrors src/lib/mock/my-mock.ts shapes; add DB adapter mapping here when needed.

export type {
  Direction,
  Engine,
  BarInterval,
  SignalSection,
  PositionState,
  FreshnessTier,
  PositionEvent,
  Position,
  SignalContext,
  TradeEntryScenario,
  SignalVsMePair,
  MyKpiSummary,
  MyStrategyPerformance,
  UserCycleCandidate,
  MyProfitsPageMock,
  MyPositionsKpi,
  MyPositionsPageMock,
  HistoryFilters,
  MyHistoryKpi,
  MyHistoryPageMock,
  TradeEntryModalMock,
  PositionsSortKey,
  HistorySortKey,
} from '@/lib/mock/my-mock'

export type { StrategyKey, StrategyAccentColor, ProofPeriod } from '@/lib/mock/my-mock'

export interface TradeEntryFormData {
  entryPrice: number
  investmentUsd: number
  leverage: number
  strategy: import('@/lib/mock/my-mock').StrategyKey
}

export type TradeAction = 'open' | 'add' | 'partial' | 'close'
