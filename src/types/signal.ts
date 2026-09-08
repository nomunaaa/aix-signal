/**
 * Signal Card Types - 혼조(Mixed Trend) 전략 시스템
 */

import type { EnhancedSignal } from '@/types/enhanced-signal';
import type { TradingCategory } from '@/lib/trading-category';
import type { SignalAction, SignalActionStatus, SignalActionType, StrategyType } from '@/types/signal-action';

export type Regime = 'low' | 'mid' | 'high' | 'extreme';
export type Preset = '조정 매수' | '조정 매도' | '부분 익절' | '관망';
export type TrendGranularity = '완전' | '장기' | '단기' | '혼조/장우선' | '혼조/단우선';

export type TrendType = "trend_long" | "trend_short";
export interface RecentSignalEvent {
  id: string;
  symbol: string;
  signal_type: "entry" | "exit";
  direction: "long" | "short";
  price: number;
  timestamp_ms: number;
  timestamp: number;
  created_at: string;
}
export interface Candle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RecentTrendEvent {
  id: string;
  symbol: string;
  timeframe: string;
  type: TrendType;
  value: number; // -100 | 0 | 100
  ts: string;
  tsMs: number;
}

export interface RecentTopBottomEvent {
  id: string;
  symbol: string;
  barinterval: string;
  top_bottom: 'top' | 'bottom';
  timestamp_ms: number;
  source: string;
  indicator_name: string;
  unique_key: string;
  created_at?: string | null;
}

// ─── PULSE API (MSW mock contract) ─────────────────────────────────────────

/** Section/state for PULSE signal board — one signal, one section (no duplicates) */
export type PulseSection =
  | 'NEW_SIGNAL'
  | 'TREND_DISCOUNT'
  | 'TREND_TP'
  | 'NON_TREND_SHORT'
  | 'NON_TREND_LONG'
  | 'REVERSAL'
  | 'CLOSED_RECENT'
  | 'WAITING_ENTRY';

/** Strategy ID: S1=oneshot, S2=safe, S3=deep, S4=full */
export type PulseStrategyId = 'S1' | 'S2' | 'S3' | 'S4';
export type PulseTrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

/** Per-section optional fields (extend as needed per section) */
export interface PulseSectionFields {
  /** TREND_DISCOUNT: average entry after discount */
  average_entry_price?: number;
  /** TREND_TP / CLOSED_RECENT: locked amount in USDT */
  locked_amount?: number;
  /** WAITING_ENTRY: countdown seconds until entry window */
  countdown_sec?: number;
  /** CLOSED_RECENT: hold duration string */
  hold_duration?: string;
  discount_price?: number;
  discount_rate?: number;
  additional_entry_price?: number;
  additional_discount_amount?: number;
  discount_gain_percent?: number;
  partial_close_price?: number;
  locked_profit_amount?: number;
  locked_profit_percent?: number;
  short_trend?: 'up' | 'down' | 'neutral';
  long_trend?: 'up' | 'down' | 'neutral';
  entry_trend_short?: PulseTrendDirection | Lowercase<PulseTrendDirection> | -100 | -1 | 0 | 1 | 100;
  entry_trend_long?: PulseTrendDirection | Lowercase<PulseTrendDirection> | -100 | -1 | 0 | 1 | 100;
  flow?: string | null;
  cycle_id?: string | null;
  nontrend_duration?: number;
  volatility?: 'LOW' | 'MID' | 'HIGH';
  pnl_1d_amount?: number;
  pnl_1d_percent?: number;
  pnl_7d_amount?: number;
  pnl_7d_percent?: number;
  last_close_time?: string;
  today_signal_count?: number;
  avg_cycle_time?: number;
  close_price?: number;
  invest_pnl_amount?: number;
  invest_pnl_percent?: number;
  cycle_time?: number;
  /** 24h 고가 (비추세·변동성) */
  high_24h?: number;
  /** 24h 저가 */
  low_24h?: number;
  /** 24h (고-저)/중간가 ×100 등 시뮬된 등락률 % */
  price_change_pct_24h?: number;
  /** 분할매수 신호 대기 (UI) */
  additional_entry_pending?: boolean;
  /** 분할매수 누적 횟수 (목/API) */
  additional_buy_count?: number;
  /** 분할매수 체결 시각 */
  additional_entry_time?: string;
  /** 분할청산 신호 대기 (UI) */
  partial_exit_pending?: boolean;
  /** 분할청산 체결 시각 */
  partial_exit_time?: string;
  /**
   * 24h 구간 **가격** 샘플(오래된 값 → 최근 값 권장). OHLCV 캔들이 아님.
   * 프론트는 길이 ≥ 3의 유한 숫자만 API 시리즈로 인정한다 (`resolvePriceSeriesForPulse`).
   * 계약: `docs/api/pulse-signals.md`
   */
  sparkline_24h?: number[];
  /** 24h 거래대금(USDT 등) — 정렬·표시용 */
  quote_volume_24h?: number;
  /** LIVE/WAIT — KPI·필터 (AIX-84) */
  signal_state?: 'LIVE' | 'WAIT';
}

export interface PulseApiSignal {
  cycle_id: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number;
  current_price: number;
  profit_amount: number;
  profit_rate: number;
  entry_time: string;
  section_time: string;
  section: PulseSection;
  entry_trend_short?: PulseTrendDirection | Lowercase<PulseTrendDirection> | -100 | -1 | 0 | 1 | 100;
  entry_trend_long?: PulseTrendDirection | Lowercase<PulseTrendDirection> | -100 | -1 | 0 | 1 | 100;
  strategy_id?: PulseStrategyId;
  trading_category?: TradingCategory | string | null;
  barinterval?: '1m' | '10m';
  /** Per-section optional fields */
  section_fields?: PulseSectionFields;
  extra_signal?: string | null;
  remaining_time?: number;
  /** 사이클 UI 상태 — 없을 때 프론트 정규화 */
  signal_state?: 'LIVE' | 'WAIT';
}

export interface PulseApiResponse {
  as_of: string;
  strategy_id: string;
  signals: PulseApiSignal[];
}

// ─────────────────────────────────────────────────────────────────────────────

export interface SignalCard {
  section: 'valid_entry' | 'positioning' | 'trend' | 'contrarian';
  symbol: string;
  side: 'long' | 'short';
  barinterval: '10m';
  trend_badge: {
    alignment: '추세형' | '역추세형' | '중립형';
    granularity: TrendGranularity;
  };
  entry_price: number;
  current_price: number;
  pnl: number;
  pnl_pct: number;
  signal_strength: number;
  volatility_regime: Regime;
  updated_at: string;
  strategy_preset?: Preset;
  regime_warning?: Regime;
  key_levels?: {
    entry?: [number, number];
    stop?: number;
    tp1?: number;
  };
}

// ─── REB-177: signal_actions + strategy_type (signal_cycles) ──────────────

export type ActionType = SignalActionType;
export type ActionStatus = SignalActionStatus;
export type { StrategyType, SignalAction };

/** Open cycle row with required strategy + planned actions (0–2 rows in signal_actions) */
export type Signal = EnhancedSignal & {
  strategy_type: StrategyType;
  actions: SignalAction[];
};
