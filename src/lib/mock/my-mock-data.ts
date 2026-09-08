// src/lib/mock/my-mock-data.ts
// AiXSignal /my 섹션 4페이지 Mock 실데이터
// 2026-04-20 · AIX-2 + AIX-3 + AIX-31 + AIX-32 구현용
// 스키마: src/lib/mock/my-mock.ts 참조

import type {
  Position,
  PositionEvent,
  MyProfitsPageMock,
  MyPositionsPageMock,
  MyHistoryPageMock,
  TradeEntryModalMock,
  SignalContext,
  TradeEntryScenario,
  SignalVsMePair,
  MyStrategyPerformance,
  UserCycleCandidate,
  StrategyKey,
  Direction,
  Engine,
  ProofPeriod,
} from './my-mock'

// ═══════════════════════════════════════════════════════════════════
// 시간 헬퍼
// ═══════════════════════════════════════════════════════════════════

const NOW = new Date('2026-04-20T09:05:00+09:00').getTime()

function tsAgo(seconds: number): string {
  return new Date(NOW - seconds * 1000).toISOString()
}

// ═══════════════════════════════════════════════════════════════════
// § /my/positions — 활성 포지션 4개
// 와이어프레임과 동일한 데이터 (XRP/SOL/BTC/DOGE)
// ═══════════════════════════════════════════════════════════════════

const activePositions: Position[] = [
  {
    id: 'pos-001',
    symbol: 'XRPUSDT',
    direction: 'LONG',
    leverage: 3,
    strategy: 'basic',
    engine: 'PULSE',
    barInterval: '1m',
    section: 'take_profit',
    state: 'partial_closed',
    entryPrice: 2.451,
    avgEntryPrice: 2.451,
    currentPrice: 2.552,
    exitPrice: null,
    openedAt: tsAgo(8280),                    // 2h 18m 전
    closedAt: null,
    holdSec: 8280,
    realizedPnlUsd: 28,
    unrealizedPnlUsd: 34,
    totalPnlUsd: 62,
    totalPnlPct: 4.12,
    freshness: 'normal',
    events: [
      { eventType: 'open', occurredAt: tsAgo(8280), price: 2.451, quantityPct: 100, label: '오픈 롱 3x @2.451' },
      { eventType: 'partial_exit', occurredAt: tsAgo(3600), price: 2.528, quantityPct: 50, label: '분할청산 50% @2.528' },
    ],
    eventSummary: '분할청산 완료 50%',
    engineMismatch: false,
    engineMismatchNote: null,
    signalRefPnlPct: 2.12,                    // 시그널 오리지널은 2.12%
  },
  {
    id: 'pos-002',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    leverage: 5,
    strategy: 'dca',
    engine: 'WAVE',
    barInterval: '10m',
    section: 'discount_entry',
    state: 'adding',
    entryPrice: 182.4,
    avgEntryPrice: 184.2,                     // 추가진입 후 평균
    currentPrice: 188.4,
    exitPrice: null,
    openedAt: tsAgo(20520),                   // 5h 42m 전
    closedAt: null,
    holdSec: 20520,
    realizedPnlUsd: 0,
    unrealizedPnlUsd: 84,
    totalPnlUsd: 84,
    totalPnlPct: 2.24,
    freshness: 'imminent',
    events: [
      { eventType: 'open', occurredAt: tsAgo(20520), price: 182.4, quantityPct: 100, label: '오픈 롱 5x @182.4' },
      { eventType: 'add', occurredAt: tsAgo(7200), price: 186.0, quantityPct: 50, label: '추가진입 +50% @186.0' },
    ],
    eventSummary: '추가진입 완료 +50%',
    engineMismatch: false,
    engineMismatchNote: null,
    signalRefPnlPct: 1.55,
  },
  {
    id: 'pos-003',
    symbol: 'BTCUSDT',
    direction: 'SHORT',
    leverage: 2,
    strategy: 'partial_exit',
    engine: 'PULSE',
    barInterval: '1m',
    section: 'take_profit',
    state: 'open',
    entryPrice: 95420,
    avgEntryPrice: 95420,
    currentPrice: 95728,
    exitPrice: null,
    openedAt: tsAgo(2880),                    // 48m 전
    closedAt: null,
    holdSec: 2880,
    realizedPnlUsd: 0,
    unrealizedPnlUsd: -18,
    totalPnlUsd: -18,
    totalPnlPct: -0.32,
    freshness: 'normal',
    events: [
      { eventType: 'open', occurredAt: tsAgo(2880), price: 95420, quantityPct: 100, label: '오픈 숏 2x @95,420' },
    ],
    eventSummary: '대기 중',
    engineMismatch: false,
    engineMismatchNote: null,
    signalRefPnlPct: -0.18,
  },
  {
    id: 'pos-004',
    symbol: 'DOGEUSDT',
    direction: 'LONG',
    leverage: 4,
    strategy: 'dca_partial',
    engine: 'PULSE',
    barInterval: '1m',
    section: 'non_trend',
    state: 'partial_closed',
    entryPrice: 0.1472,
    avgEntryPrice: 0.1472,
    currentPrice: 0.1499,
    exitPrice: null,
    openedAt: tsAgo(43200),                   // 12h 전
    closedAt: null,
    holdSec: 43200,
    realizedPnlUsd: 19,
    unrealizedPnlUsd: 35,
    totalPnlUsd: 54,
    totalPnlPct: 1.85,
    freshness: 'imminent',
    events: [
      { eventType: 'open', occurredAt: tsAgo(43200), price: 0.1472, quantityPct: 100, label: '오픈 롱 4x @0.1472' },
      { eventType: 'add', occurredAt: tsAgo(32400), price: 0.1460, quantityPct: 50, label: '추가진입 +50%' },
      { eventType: 'partial_exit', occurredAt: tsAgo(10800), price: 0.1510, quantityPct: 50, label: '분할청산 50%' },
    ],
    eventSummary: '분할청산 1회 +추가진입 1회',
    engineMismatch: true,
    engineMismatchNote: 'PULSE 롱 · WAVE 관망',
    signalRefPnlPct: 1.20,
  },
]

export const myPositionsMock: MyPositionsPageMock = {
  generatedAtLabel: '실시간 5초 갱신 · Binance Futures 기준가',
  kpi: {
    activeCount: 4,
    unrealizedPnlUsd: 182,
    realizedPnlUsd: 47,
    totalPnlUsd: 229,
  },
  positions: activePositions,
  sortKey: 'pnl',
}

// ═══════════════════════════════════════════════════════════════════
// § /my/history — 청산 완료 50건 생성
// ═══════════════════════════════════════════════════════════════════

const HISTORY_SEED: Array<{
  symbol: string
  dir: Direction
  strategy: StrategyKey
  engine: Engine
  entry: number
  exit: number
  holdSec: number
  hoursAgo: number
  events: PositionEvent[]
  eventSummary: string
  signalRefPct: number
}> = [
  { symbol: 'XRPUSDT', dir: 'LONG', strategy: 'dca', engine: 'PULSE', entry: 2.412, exit: 2.548, holdSec: 12240, hoursAgo: 0.4,
    events: [
      { eventType: 'open', occurredAt: '', price: 2.412, quantityPct: 100, label: '오픈' },
      { eventType: 'add', occurredAt: '', price: 2.380, quantityPct: 50, label: '추가 50%' },
      { eventType: 'close', occurredAt: '', price: 2.548, quantityPct: 100, label: '전량 청산' },
    ], eventSummary: '추가 1회', signalRefPct: 4.12 },
  { symbol: 'SOLUSDT', dir: 'LONG', strategy: 'partial_exit', engine: 'PULSE', entry: 182.4, exit: 188.2, holdSec: 4320, hoursAgo: 2.8,
    events: [
      { eventType: 'open', occurredAt: '', price: 182.4, quantityPct: 100, label: '오픈' },
      { eventType: 'partial_exit', occurredAt: '', price: 187.0, quantityPct: 50, label: '분할 50%' },
      { eventType: 'close', occurredAt: '', price: 188.2, quantityPct: 100, label: '전량' },
    ], eventSummary: '분할 1회', signalRefPct: 2.65 },
  { symbol: 'BTCUSDT', dir: 'SHORT', strategy: 'basic', engine: 'WAVE', entry: 95842, exit: 94220, holdSec: 10080, hoursAgo: 10,
    events: [
      { eventType: 'open', occurredAt: '', price: 95842, quantityPct: 100, label: '오픈' },
      { eventType: 'close', occurredAt: '', price: 94220, quantityPct: 100, label: '전량' },
    ], eventSummary: '—', signalRefPct: 1.40 },
  { symbol: 'DOGEUSDT', dir: 'LONG', strategy: 'dca_partial', engine: 'PULSE', entry: 0.1484, exit: 0.1512, holdSec: 19800, hoursAgo: 15,
    events: [
      { eventType: 'open', occurredAt: '', price: 0.1484, quantityPct: 100, label: '오픈' },
      { eventType: 'partial_exit', occurredAt: '', price: 0.1508, quantityPct: 50, label: '분할' },
      { eventType: 'add', occurredAt: '', price: 0.1470, quantityPct: 50, label: '추가' },
      { eventType: 'close', occurredAt: '', price: 0.1512, quantityPct: 100, label: '전량' },
    ], eventSummary: '분할+추가', signalRefPct: 1.02 },
  { symbol: 'LINKUSDT', dir: 'LONG', strategy: 'basic', engine: 'PULSE', entry: 18.42, exit: 18.84, holdSec: 7080, hoursAgo: 18.7,
    events: [
      { eventType: 'open', occurredAt: '', price: 18.42, quantityPct: 100, label: '오픈' },
      { eventType: 'close', occurredAt: '', price: 18.84, quantityPct: 100, label: '전량' },
    ], eventSummary: '—', signalRefPct: 1.85 },
  { symbol: 'AVAXUSDT', dir: 'LONG', strategy: 'dca', engine: 'WAVE', entry: 38.42, exit: 37.88, holdSec: 15120, hoursAgo: 24,
    events: [
      { eventType: 'open', occurredAt: '', price: 38.42, quantityPct: 100, label: '오픈' },
      { eventType: 'add', occurredAt: '', price: 38.10, quantityPct: 50, label: '추가 1' },
      { eventType: 'add', occurredAt: '', price: 37.80, quantityPct: 50, label: '추가 2' },
      { eventType: 'close', occurredAt: '', price: 37.88, quantityPct: 100, label: '전량' },
    ], eventSummary: '추가 2회', signalRefPct: -0.82 },
  { symbol: 'ETHUSDT', dir: 'LONG', strategy: 'partial_exit', engine: 'PULSE', entry: 3284, exit: 3302, holdSec: 2880, hoursAgo: 30,
    events: [
      { eventType: 'open', occurredAt: '', price: 3284, quantityPct: 100, label: '오픈' },
      { eventType: 'partial_exit', occurredAt: '', price: 3296, quantityPct: 50, label: '분할' },
      { eventType: 'close', occurredAt: '', price: 3302, quantityPct: 100, label: '전량' },
    ], eventSummary: '분할 1회', signalRefPct: 0.40 },
  { symbol: 'SUIUSDT', dir: 'LONG', strategy: 'basic', engine: 'PULSE', entry: 4.24, exit: 4.35, holdSec: 8040, hoursAgo: 36,
    events: [
      { eventType: 'open', occurredAt: '', price: 4.24, quantityPct: 100, label: '오픈' },
      { eventType: 'close', occurredAt: '', price: 4.35, quantityPct: 100, label: '전량' },
    ], eventSummary: '—', signalRefPct: 1.90 },
]

// 시드를 반복 확장해서 50건 만들기
function buildHistory(): Position[] {
  const rows: Position[] = []
  for (let i = 0; i < 50; i++) {
    const seed = HISTORY_SEED[i % HISTORY_SEED.length]
    const hoursAgo = seed.hoursAgo + (i >= HISTORY_SEED.length ? (i - HISTORY_SEED.length + 1) * 6 : 0)
    const closedAt = tsAgo(hoursAgo * 3600)
    const openedAt = tsAgo(hoursAgo * 3600 + seed.holdSec)
    
    const notional = 1500 + (i % 7) * 400
    const pnlPct = ((seed.exit - seed.entry) / seed.entry * 100) * (seed.dir === 'LONG' ? 1 : -1)
    const totalPnlUsd = Math.round(notional * pnlPct / 100)
    
    // events 시간 재계산
    const segments = seed.events.length
    const eventsWithTime: PositionEvent[] = seed.events.map((e, idx) => ({
      ...e,
      occurredAt: tsAgo(hoursAgo * 3600 + seed.holdSec * (1 - idx / (segments - 1))),
    }))
    
    rows.push({
      id: `hist-${String(i + 1).padStart(3, '0')}`,
      symbol: seed.symbol,
      direction: seed.dir,
      leverage: 3,
      strategy: seed.strategy,
      engine: seed.engine,
      barInterval: seed.engine === 'PULSE' ? '1m' : '10m',
      section: 'take_profit',
      state: 'closed',
      entryPrice: seed.entry,
      avgEntryPrice: seed.entry,
      currentPrice: null,
      exitPrice: seed.exit,
      openedAt,
      closedAt,
      holdSec: seed.holdSec,
      realizedPnlUsd: totalPnlUsd,
      unrealizedPnlUsd: 0,
      totalPnlUsd,
      totalPnlPct: Number(pnlPct.toFixed(2)),
      freshness: 'past',
      events: eventsWithTime,
      eventSummary: seed.eventSummary,
      engineMismatch: false,
      engineMismatchNote: null,
      signalRefPnlPct: seed.signalRefPct,
    })
  }
  return rows.sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''))
}

const allHistory = buildHistory()

export const myHistoryMock: MyHistoryPageMock = {
  generatedAtLabel: '청산 완료된 매매 기록 · 2026-04-20 09:05 KST 갱신',
  kpi: {
    total: 46,
    wins: 34,
    losses: 12,
    winRate: 0.74,
  },
  filters: {
    period: '7d',
    symbol: 'ALL',
    strategy: 'ALL',
    engine: 'ALL',
  },
  sortKey: 'closed_at',
  rows: allHistory.slice(0, 8),               // 첫 페이지 8건
  hasMore: true,
  remainingCount: 38,
}

// 전체 히스토리 export (필터/정렬 적용용)
export const myHistoryAllRows: Position[] = allHistory

// ═══════════════════════════════════════════════════════════════════
// § /my/profits — 7d/30d/90d/all 4기간
// ═══════════════════════════════════════════════════════════════════

function makeStrategyPerformance(
  wins: [number, number, number, number],
  counts: [number, number, number, number],
  avgs: [number, number, number, number]
): MyStrategyPerformance[] {
  return [
    { key: 'basic', displayName: '오리지널', accentColor: 'teal', winRate: wins[0], tradeCount: counts[0], avgPnlPct: avgs[0] },
    { key: 'dca', displayName: '물타기', accentColor: 'amber', winRate: wins[1], tradeCount: counts[1], avgPnlPct: avgs[1] },
    { key: 'partial_exit', displayName: '분할청산', accentColor: 'purple', winRate: wins[2], tradeCount: counts[2], avgPnlPct: avgs[2] },
    { key: 'dca_partial', displayName: '모두', accentColor: 'rose', winRate: wins[3], tradeCount: counts[3], avgPnlPct: avgs[3] },
  ]
}

const symbolComparison7d: SignalVsMePair[] = [
  { symbol: 'XRPUSDT', signalPnlPct: 2.8, myPnlPct: 4.8, diffPp: 2.0, tradeCount: 7 },
  { symbol: 'SOLUSDT', signalPnlPct: 2.2, myPnlPct: 3.8, diffPp: 1.6, tradeCount: 6 },
  { symbol: 'BTCUSDT', signalPnlPct: 1.7, myPnlPct: 2.2, diffPp: 0.5, tradeCount: 8 },
  { symbol: 'DOGEUSDT', signalPnlPct: 3.0, myPnlPct: 2.4, diffPp: -0.6, tradeCount: 5 },
  { symbol: 'LINKUSDT', signalPnlPct: 2.7, myPnlPct: 3.8, diffPp: 1.1, tradeCount: 4 },
  { symbol: 'ETHUSDT', signalPnlPct: -0.5, myPnlPct: 0.4, diffPp: 0.9, tradeCount: 6 },
  { symbol: 'AVAXUSDT', signalPnlPct: -1.2, myPnlPct: -0.8, diffPp: 0.4, tradeCount: 3 },
  { symbol: 'SUIUSDT', signalPnlPct: 1.9, myPnlPct: 2.8, diffPp: 0.9, tradeCount: 3 },
]

const publishCandidates: UserCycleCandidate[] = [
  {
    cycleId: 'hist-002',
    symbol: 'XRPUSDT',
    direction: 'LONG',
    strategy: 'dca',
    closedAt: tsAgo(10800),
    pnlPct: 4.2,
    eligible: true,
    closedAtLabel: '3h 전',
  },
  {
    cycleId: 'hist-005',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    strategy: 'partial_exit',
    closedAt: tsAgo(86400),
    pnlPct: 3.1,
    eligible: true,
    closedAtLabel: '1d 전',
  },
]

export const myProfitsMock7d: MyProfitsPageMock = {
  generatedAtLabel: '2026-04-20 09:05 KST · 내 매매 50건 기준',
  currentPeriod: '7d',
  kpi: {
    excessReturnPct: 5,                       // 내 2.1% vs 시그널 2.0% = +5% 상대비
    myAvgPnlPct: 2.1,
    signalAvgPnlPct: 2.0,
    excessTradeRatio: { beatCount: 26, missCount: 24, total: 50 },  // 초과 절반 조금 넘음
    totalPnlUsd: 2847,
    totalTrades: 50,
    myWinRate: 0.74,
    signalWinRate: 0.72,
    winRateDiffPp: 2,
    maxProfitUsd: 312,
    maxLossUsd: -128,
    myAvgHoldSec: 2 * 3600 + 14 * 60,         // 2h 14m
    signalAvgHoldSec: 1 * 3600 + 48 * 60,     // 1h 48m
  },
  symbolComparison: symbolComparison7d,
  strategyPerformance: makeStrategyPerformance([0.72, 0.81, 0.75, 0.67], [18, 12, 14, 6], [2.1, 2.6, 1.8, 1.9]),
  publishCandidates,
}

export const myProfitsMock30d: MyProfitsPageMock = {
  ...myProfitsMock7d,
  currentPeriod: '30d',
  kpi: {
    ...myProfitsMock7d.kpi,
    excessReturnPct: -17,                     // 내 1.5% vs 시그널 1.8% = -17% (미달)
    myAvgPnlPct: 1.5,
    signalAvgPnlPct: 1.8,
    excessTradeRatio: { beatCount: 82, missCount: 118, total: 200 },  // 대부분 미달
    totalPnlUsd: 6320,
    totalTrades: 200,
    myWinRate: 0.67,
    signalWinRate: 0.68,
    winRateDiffPp: -1,
    maxProfitUsd: 584,
    maxLossUsd: -240,
  },
  strategyPerformance: makeStrategyPerformance([0.68, 0.77, 0.72, 0.64], [72, 48, 58, 22], [1.7, 2.2, 1.5, 1.6]),
}

export const myProfitsMock90d: MyProfitsPageMock = {
  ...myProfitsMock7d,
  currentPeriod: '90d',
  kpi: {
    ...myProfitsMock7d.kpi,
    excessReturnPct: -20,                     // 내 1.2% vs 시그널 1.5% = -20% (미달)
    myAvgPnlPct: 1.2,
    signalAvgPnlPct: 1.5,
    excessTradeRatio: { beatCount: 224, missCount: 376, total: 600 },  // 1/3만 초과
    totalPnlUsd: 14250,
    totalTrades: 600,
    myWinRate: 0.63,
    signalWinRate: 0.65,
    winRateDiffPp: -2,
    maxProfitUsd: 842,
    maxLossUsd: -420,
  },
  strategyPerformance: makeStrategyPerformance([0.65, 0.73, 0.70, 0.61], [210, 145, 175, 70], [1.4, 1.9, 1.3, 1.4]),
}

export const myProfitsMockAll: MyProfitsPageMock = {
  ...myProfitsMock90d,
  currentPeriod: 'all',
}

export function getMyProfitsMockForPeriod(period: ProofPeriod): MyProfitsPageMock {
  switch (period) {
    case '7d': return myProfitsMock7d
    case '30d': return myProfitsMock30d
    case '90d': return myProfitsMock90d
    case 'all': return myProfitsMockAll
  }
}

// ═══════════════════════════════════════════════════════════════════
// § 매매 입력 Modal — 샘플 시그널 컨텍스트
// ═══════════════════════════════════════════════════════════════════

const sampleSignalXrp: SignalContext = {
  cycleId: 'signal-xrp-2026-04-20-09-03',
  symbol: 'XRPUSDT',
  direction: 'LONG',
  engine: 'PULSE',
  section: 'take_profit',
  signalPrice: 2.451,
  currentPrice: 2.455,
  kairosObservation:
    '롱 모멘텀과 거래량이 동반 확장되는 구간으로 관찰됩니다. 단기 저항 2.58 부근이 목표 영역이며, 2.42 하회 시 시그널 무효로 처리됩니다.',
  invalidationPrice: 2.42,
  targetPrice: 2.58,
  generatedAt: tsAgo(120),
  generatedAtLabel: '2m 전 발생',
}

function calculateScenario(
  entryPrice: number,
  targetPrice: number,
  invalidationPrice: number,
  investmentUsd: number,
  leverage: number,
  direction: Direction
): TradeEntryScenario {
  const quantity = (investmentUsd * leverage) / entryPrice
  
  const profitPctRaw = direction === 'LONG'
    ? (targetPrice - entryPrice) / entryPrice
    : (entryPrice - targetPrice) / entryPrice
  const stopPctRaw = direction === 'LONG'
    ? (invalidationPrice - entryPrice) / entryPrice
    : (entryPrice - invalidationPrice) / entryPrice
  
  const targetProfitUsd = Math.round(quantity * entryPrice * profitPctRaw)
  const stopLossUsd = Math.round(quantity * entryPrice * stopPctRaw)
  
  // 간이 청산가 공식 (실제 거래소 공식과 차이 있음)
  const liquidationPriceRaw = direction === 'LONG'
    ? entryPrice * (1 - 1 / leverage)
    : entryPrice * (1 + 1 / leverage)
  
  return {
    targetProfitUsd,
    targetProfitPct: Number((profitPctRaw * leverage * 100).toFixed(1)),
    stopLossUsd,
    stopLossPct: Number((stopPctRaw * leverage * 100).toFixed(1)),
    liquidationPrice: Number(liquidationPriceRaw.toFixed(3)),
    liquidationPct: Number(((liquidationPriceRaw - entryPrice) / entryPrice * 100).toFixed(1)),
  }
}

export const tradeEntryModalMock: TradeEntryModalMock = {
  signal: sampleSignalXrp,
  defaultEntryPrice: sampleSignalXrp.signalPrice,
  defaultInvestmentUsd: 500,
  defaultLeverage: 3,
  defaultStrategy: 'basic',
  investmentQuickChips: [100, 500, 1000, 5000],
  scenario: calculateScenario(2.451, 2.58, 2.42, 500, 3, 'LONG'),
}

// 실시간 재계산용 헬퍼 (Modal 컴포넌트에서 사용)
export function recalcTradeScenario(
  entryPrice: number,
  investmentUsd: number,
  leverage: number,
  direction: Direction,
  targetPrice: number,
  invalidationPrice: number
): TradeEntryScenario {
  return calculateScenario(entryPrice, targetPrice, invalidationPrice, investmentUsd, leverage, direction)
}
