// Enhanced Signal Types - 프로덕션 최소화 버전

import type { SignalAction, StrategyType } from '@/types/signal-action';
import type { TradingCategory } from '@/lib/trading-category';

export type FlowLabel = 'ENTRY_DISCOUNT' | 'POSITIONING';
export type Side = 'LONG' | 'SHORT';
export type Section = 'trend_entry' | 'trend_pos' | 'ct_entry' | 'ct_pos';
export type EntryTrendDirection = 'UP' | 'DOWN' | 'NEUTRAL';

export interface EnhancedSignal {
  // 필수 식별 필드
  id: string;
  symbol: string;
  side: Side;
  price: number; // 현재 시장가

  // 섹션 분류
  flow: FlowLabel;
  section?: Section; // ✅ Edge Function에서 반환하는 섹션 정보

  // 시간 필드
  elapsed_sec?: number; // 진입 후 경과 시간 (초)

  // 손익 필드 (계산 함수로 구현)
  pnl_pct?: number; // 수익률 (%)
  entry_rate?: number; // 진입율 (%) = -pnl_pct
  hasRealtimePrice?: boolean;
  priceSource?: 'symbol_store' | 'manual' | 'cycle' | 'unknown';
  trendShort?: number | null;
  trendLong?: number | null;
  trendAligned?: boolean | null;
  /** signal_cycles entry-time trend snapshot; stable for the whole cycle. */
  entryTrendShort?: EntryTrendDirection | null;
  entryTrendLong?: EntryTrendDirection | null;
  entryTrendAligned?: boolean | null;

  // 청산 시그널 전용
  realized_pnl_pct?: number; // 실현 손익률 (%)

  // 메타데이터
  entry_time?: string; // 진입시간 (ISO8601)
  exit_time?: string; // 청산시간 (ISO8601)

  // 기타 (닫힌 포지션용)
  noData?: boolean; // 데이터 없음 플래그
  entryPrice?: number; // 진입가
  exitPrice?: number; // 청산가
  entryTimestamp?: number; // 진입 타임스탬프
  exitTimestamp?: number; // 청산 타임스탬프
  hold_sec?: number; // 보유 시간 (초)
  barinterval?: string; // Bar interval ('15s' | '10m' | '1m')

  /** Per-position strategy (from signal_cycles.strategy_type) */
  strategy_type?: StrategyType;
  /** Strategy domain category from signal_cycles.trading_category */
  trading_category?: TradingCategory;
  /** Planned actions from signal_actions (joined) */
  actions?: SignalAction[];
  /** Partial-exit ratio (% or 0~1). Defaults to 50% when omitted. */
  partialExitPercent?: number;
}
