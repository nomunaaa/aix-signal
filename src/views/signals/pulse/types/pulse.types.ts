import { colors } from '@/design-tokens/colors';
import type { SignalAction } from '@/types/signal-action';
import type { TradingCategory } from '@/lib/trading-category';
import type {
  EntryTrendDirection as SharedEntryTrendDirection,
  SignalTrendMode as SharedSignalTrendMode,
} from '@/lib/signal-trend-mode';
export { DEFAULT_SIGNAL_TREND_MODE_FILTER, SIGNAL_TREND_MODES } from '@/lib/signal-trend-mode';

// Strategy types
export type StrategyId = 'oneshot' | 'safe' | 'deep' | 'full';

/** 시그널 스트림 — 펄스(1m) / 웨이브(10m) */
export type SignalStreamId = 'pulse' | 'wave';

/** 게이트·요약 카드용 최근 30일 KPI (모킹 → 추후 API) */
export interface GateKpi30d {
  winRate: number;
  returnRate: number;
  /** 누적 손익 (USD, 표시용) */
  pnlUsd: number;
  mdd: number;
}

export interface StrategyConfig {
  id: StrategyId;
  name: string;
  nameEn: string;
  icon: string;
  tagline: string;
  description: string;
  color: string;
  features: {
    discount: boolean; // 추가매수 기능
    locked: boolean; // 분할청산 기능
  };
}

export interface StrategyStats {
  id: StrategyId;
  winRate: number;
  returnRate: number;
  sharpeRatio: number;
  totalTrades: number;
  maxDrawdown: number;
}

/** LIVE=진행 중 오픈 사이클, WAIT=진입 대기 — KPI·필터·뱃지 (AIX-85 / AIX-84) */
export type SignalCycleUiState = 'LIVE' | 'WAIT';

/** Pulse 상단 LIVE/WAIT 행 필터 — URL `signalState` 와 동기화 */
export type SignalStateFilter = 'all' | 'live' | 'wait';

export type SignalTrendMode = SharedSignalTrendMode;
export type SignalTrendModeFilter = Record<SignalTrendMode, boolean>;
export type EntryTrendDirection = SharedEntryTrendDirection;

/** Section/state for feed grouping — one signal appears in exactly one section. */
export type PulseSectionState =
  | 'NEW_SIGNAL'
  | 'TREND_DISCOUNT'
  | 'TREND_TP'
  | 'NON_TREND_SHORT'
  | 'NON_TREND_LONG'
  | 'REVERSAL'
  | 'CLOSED_RECENT'
  | 'WAITING_ENTRY';

/** 비추세 구분 타입 */
export type NonTrendType = 'short' | 'long' | 'both';

/** 신호대기 종목 통계 (Table 5) */
export interface WaitingSignal {
  id: string;
  symbol: string;
  dailyWinRate: number; // 1일-7일 승률 (%)
  dailyReturnRate: number; // 1일 수익률 (%) — legacy
  weeklyWinRate: number; // 7일-30일 승률 (%)
  weeklyReturnRate: number; // 7일 수익률 (%) — legacy
  avgDailySignals: number; // 일일평균 신호횟수 (30일)
  avgCycleTime: string; // 평균 사이클 타임 (e.g. "4시간 32분")
  lastCloseTime: Date | string; // 최근청산시간
  /** 추세/방향 컬럼용 */
  direction?: 'long' | 'short';
  /** 최근 5경기 승/패 (합 5) */
  recentFiveWins?: number;
  recentFiveLosses?: number;
  /** 신뢰등급 뱃지 */
  trustGrade?: 'S' | 'A' | 'B' | 'C';
  /** 최근 진입 시각 — 절대시간 MM/DD HH:MM */
  lastEntryTime?: Date | string;
  /** 보유시간(분) — `H시간 M분` 표시용 */
  lastHoldMinutes?: number;
  shortTrend?: 1 | -1 | 0;
  longTrend?: 1 | -1 | 0;
  lastEntryPrice?: number;
  lastExitPrice?: number;
  lastPnlAmount?: number;
  lastPnlPercent?: number;

  /** PULSE=1m / WAVE=10m — 목·API 공통 */
  barinterval?: '1m' | '10m';
  /** 24h 미니차트 (다운샘플 가격 배열) */
  sparkline24h?: number[];
  /** 최근 5전 승패 — 좌측이 최근 */
  recent5WinsList?: boolean[];
  recent5PnlsPct?: number[];
  /** 마지막 청산 이후 경과(초) — 대기시간 실시간 갱신 기준 */
  waitingSec?: number;
  /** 30d 평균 사이클 간격(초) */
  avgWaitingSec?: number;
  /** 7일 승률 0~1 */
  winRate7d?: number;
  /** 7일 신뢰도 등급 */
  grade7d?: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | string;
  /** 7일 누적 수익률 % */
  pnl7dPct?: number;
  /** 7일 평균 보유(초) */
  avgHoldSec7d?: number;
  /** 마지막 청산 시각 ISO */
  lastExitTimeIso?: string;
  /** 대기 테이블 행은 기본 WAIT */
  signalState?: SignalCycleUiState;
}

// Signal types
export interface Signal {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  pnlPercent: number;
  enteredAt: Date | string;
  status: 'open' | 'closing' | 'closed';
  /** Assigned by API; used for feed section (one signal → one section). */
  section?: PulseSectionState;
  /** API `section_time` — 신선도·표시용 시각 기준 */
  sectionTime?: string;
  /** Timestamp when signal last moved between sections */
  movedAt?: Date | string;
  /** 비추세 구분 (비추세 테이블에서만 사용) */
  nonTrendType?: NonTrendType;
  /** 단기 추세 1=상승 -1=하락 0=중립 */
  shortTrend?: 1 | -1 | 0;
  /** 장기 추세 */
  longTrend?: 1 | -1 | 0;
  /** Entry-time short trend snapshot; stable until the cycle closes. */
  entryTrendShort?: EntryTrendDirection;
  /** Entry-time long trend snapshot; stable until the cycle closes. */
  entryTrendLong?: EntryTrendDirection;
  /** 24h 고가 */
  high24h?: number;
  /** 24h 저가 */
  low24h?: number;
  /** 24h 등락률 % (변동성 구간 분류) */
  volatility24hPct?: number;
  /** 분할매수 대기 (추가신호 UI) */
  additionalEntryPending?: boolean;
  /** 분할청산 대기 */
  partialExitPending?: boolean;
  /** API 분할매수(추가) 진입가 */
  additionalEntryPrice?: number;
  /** 분할청산(이익실현) 기준가 */
  partialClosePrice?: number;
  /** Partial-exit ratio (% or 0~1). Defaults to 50% when omitted. */
  partialExitPercent?: number;
  /** 부분 청산(확정) 금액 — 추가신호·행 */
  lockedAmount?: number;
  /** 할인 구간 평균 진입가 */
  averageEntryPrice?: number;
  /** 분할매수 누적 횟수 */
  additionalBuyCount?: number;
  /** 분할매수 체결 시각 (ISO) */
  additionalEntryTime?: string;
  /** 분할청산 체결 시각 (ISO) */
  partialExitTime?: string;
  /** 평균 사이클 길이 (분) — 남은율 계산 */
  avgCycleTimeMinutes?: number;
  /** 24h 미니차트용 가격 시계열 */
  sparkline24h?: number[];
  /** API `discount_rate` — 할인율 정렬·표시 */
  discountRate?: number;
  /** API `quote_volume_24h` — 24h 거래대금 */
  quoteVolume24h?: number;
  /** Edge/API `signal_state` — 없으면 정규화 단계에서 추론 */
  signalState?: SignalCycleUiState;
  /** PULSE=1m / WAVE=10m */
  barinterval?: '1m' | '10m';
  /** signal_cycles.trading_category */
  tradingCategory?: TradingCategory;
  /** Planned action rows from signal_actions for this open cycle. */
  actions?: SignalAction[];
}

export interface DiscountedSignal extends Signal {
  averageEntryPrice: number;
  discountRate: number;
  discountGain: number;
  additionalBuyCount: number;
}

export interface LockedSignal extends Signal {
  lockedPercent: number;
  lockedAmount: number;
  lockedExitPrice: number;
}

export interface ClosingSignal extends Signal {
  closeProbability: number;
  estimatedCloseIn: string;
}

/** 히스토리 4전략 비교(사이클 단위) */
export type CycleStrategyCompareKey = 'basic' | 'dca' | 'partial_exit' | 'dca_partial';

export interface StrategyVariantCompare {
  key: CycleStrategyCompareKey;
  entryPrice: number;
  averageEntryPrice?: number;
  dcaPrice: number | null;
  partialExitPrice: number | null;
  exitPrice: number;
  pnlUsd: number;
  pnlPct: number;
  isWin: boolean;
  note?: string;
}

export interface ClosedSignal {
  id: string;
  cycle_id?: string | null;
  symbol: string;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  holdDuration: string;
  closedAt: Date | string;
  discountGain: number;
  lockedAmount: number;
  strategyId?: StrategyId;
  /** 추가매수 여부 */
  hasAdditionalBuy?: boolean;
  /** 중간청산 여부 */
  hasPartialClose?: boolean;
  /** 평균진입가 (추가매수 포함) */
  averageEntryPrice?: number;
  /** 청산시 섹션 (어느 테이블에 있었는지) */
  closedFromSection?: string;
  /** Raw signal_cycles.flow value */
  flow?: string | null;
  /** Entry-time short trend snapshot; source of truth for closed trend filtering. */
  entryTrendShort?: EntryTrendDirection | null;
  /** Entry-time long trend snapshot; source of truth for closed trend filtering. */
  entryTrendLong?: EntryTrendDirection | null;
  /** 진입시간 */
  enteredAt?: Date | string;
  /** 추가진입가 */
  additionalEntryPrice?: number;
  /** 추가진입시간 */
  additionalEntryTime?: string;
  /** 분할청산가 */
  partialExitPrice?: number;
  /** 분할청산 비율 (% 또는 0~1). 없으면 50% */
  partialExitPercent?: number;
  /** 분할평단가 */
  partialAvgPrice?: number;
  /** 4전략 비교(모의·추후 signal_actions) */
  strategyVariants?: Record<CycleStrategyCompareKey, StrategyVariantCompare>;
  /** 청산 시점 시장 추세 (표시용) */
  shortTrendAtClose?: 1 | -1 | 0;
  longTrendAtClose?: 1 | -1 | 0;
  /** 한 사이클에 진입·중간진입·중간청산·청산 등 단계 요약 */
  cyclePhaseSummary?: string;
  /** PULSE=1m / WAVE=10m */
  barinterval?: '1m' | '10m';
  /** signal_cycles.trading_category */
  tradingCategory?: TradingCategory;
  /** Raw hold duration in seconds when available from signal_cycles */
  holdSeconds?: number;
}

// API Response types
export interface PulseSignalResponse {
  justEntered: Signal[];
  discounted: DiscountedSignal[];
  profitLocked: LockedSignal[];
  closingSoon: ClosingSignal[];
  recentlyClosed: ClosedSignal[];
}

export interface HistoryResponse {
  items: ClosedSignal[];
  total: number;
  page: number;
  totalPages: number;
}

export interface HistoryFilterState {
  symbol: string;
  direction: '' | 'long' | 'short';
  minReturn: string;
  maxReturn: string;
  dateFrom: string;
  dateTo: string;
  exactDateFromIso?: string | null;
  exactDateToIso?: string | null;
}

export type HistorySortBy = 'time' | 'symbol';
export type HistorySortDirection = 'asc' | 'desc';

export type HistorySortState = {
  by: HistorySortBy;
  dir: HistorySortDirection;
};

export type HistoryQueryState = {
  filter: HistoryFilterState;
  showFavoritesOnly: boolean;
  sort: HistorySortState;
};

export interface SimulationInput {
  capital: number;
  capitalRatio: number; // 진입 비율 (%), 0.1 ~ 100
  leverage: number;
}

// ── 기간별 전략 통계 (수정4) ──

export interface StrategyStatsWithPeriod {
  period: '24h' | '7d' | '30d';
  winRate: number;
  returnRate: number;
  mdd: number;
  sharpeRatio: number;
  totalTrades: number;
  avgReturn: number;
  avgLoss: number;
}

// Ticker event for live feed (Charlie Ticker용)
export interface TickerEvent {
  id: string;
  type: 'entry' | 'exit' | 'target_hit' | 'stop_hit';
  symbol: string;
  direction: 'long' | 'short';
  price: number;
  timestamp: string;
  message: string;
}

// Filter presets for signal table
export type FilterPreset =
  | 'action'
  | 'new'
  | 'discount'
  | 'tp'
  | 'nontrend'
  | 'closed'
  | 'favorites';

/** Filter preset IDs for column configurations */
export type FilterPresetId =
  | 'active'
  | 'new'
  | 'discount'
  | 'tp'
  | 'nontrend_st'
  | 'nontrend_lt'
  | 'waiting'
  | 'history';

/** Temporal filter presets for TableControlBar */
export type TableFilterPreset = 'all' | 'latest' | 'changing' | 'fixed';

/** 테이블 정렬 키 (TableControlBar) */
export type PulseSortBy = 'time' | 'pnl' | 'symbol' | 'volume' | 'discount';

/** Column density mode */
export type ColumnDensity = 'compact' | 'normal';

export interface SimulationResult {
  strategyId: StrategyId;
  capital: number;
  finalCapital: number;
  returnRate: number;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  profitFactor: number;
}

// Strategy config constants
export const STRATEGY_CONFIGS: StrategyConfig[] = [
  {
    id: 'oneshot',
    name: '원샷',
    nameEn: 'One Shot',
    icon: '',
    tagline: '단일 진입/청산',
    description: '한종목에 진입과 청산 단일 시그널을 생성하며 대부분의 분들에게 추천합니다.',
    color: colors.strategy.oneshot,
    features: { discount: false, locked: false },
  },
  {
    id: 'deep',
    name: '딥바이',
    nameEn: 'Deep Buy',
    icon: '',
    tagline: '추가매수로 평단↓',
    description: '할인구간에서 추가 매수하여 평단가를 낮추어 이익을 개선합니다.',
    color: colors.strategy.deep,
    features: { discount: true, locked: false },
  },
  {
    id: 'safe',
    name: '세이프',
    nameEn: 'Safe',
    icon: '',
    tagline: '분할매도로 안정↑',
    description: '수익실현 구간에서 분할매도하여 투자 안정성을 높입니다.',
    color: colors.strategy.safe,
    features: { discount: false, locked: true },
  },
  {
    id: 'full',
    name: '올플랜',
    nameEn: 'All Plan',
    icon: '',
    tagline: '추가매수 + 분할매도',
    description: '할인 시 추가매수, 수익 시 분할매도로 자본 유연성을 극대화합니다.',
    color: colors.strategy.full,
    features: { discount: true, locked: true },
  },
];

// ── V2 Foundation Patch 타입 ──────────────────────

/** 시그널 섹션 (v2 UI 그룹핑 — 6개 버킷) */
export type SignalSection = 'active' | 'new' | 'discount' | 'tp' | 'nontrend' | 'closed';

/** Column Picker용 컬럼 설정 (canonical 타입) */
export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  isOptional: boolean;
  isEmpty: boolean;
  width: number;
}

/** KAIROS 권장값 (canonical 타입) */
export interface KairosRecommendation {
  /** 권장 최소 레버리지 */
  leverageMin: number;
  /** 권장 최대 레버리지 */
  leverageMax: number;
  /** 권장 최소 자본비율 (%) */
  capitalRatioMin: number;
  /** 권장 최대 자본비율 (%) */
  capitalRatioMax: number;
  /** 정확한 최적 자본비율 (%) */
  optimalCapitalRatio: number;
  /** 정확한 최적 레버리지 (x) */
  optimalLeverage: number;
  /** 리스크 레벨 */
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  /** 예상 최대 낙폭 (%) */
  expectedDD: number;
  /** 청산 위험도 (0-100) */
  liquidationRisk: number;
  /** 신뢰도 (0-100) */
  confidence: number;
  /** 예상 월 복리수익 (%) */
  estimatedMonthlyReturn: number;
  /** 근거 텍스트 */
  evidence: string;
}

/** Row 아코디언 확장 데이터 */
export interface SignalExpansionData {
  signalId: string;
  /** 진입 근거 텍스트 */
  entryReason: string;
  /** 활성 모멘텀 플래그 (TS, TL, VS 등) */
  momentumFlags: string[];
  /** 차트 스냅샷 URL */
  chartSnapshot?: string;
  /** 관련 뉴스 */
  relatedNews?: {
    title: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    url: string;
  }[];
  /** 전략별 상세 이력 */
  strategyDetail: {
    discountHistory?: { price: number; timestamp: string }[];
    lockedHistory?: { amount: number; exitPrice: number; timestamp: string }[];
  };
}
