/**
 * trend_scanner 스키마 타입 정의
 *
 * Supabase에서 자동 생성되지 않는 trend_scanner 스키마용 수동 타입
 * DB 마이그레이션: 20260119001706_create_trend_scanner_schema.sql 참조
 */

// =============================================================================
// Table Types
// =============================================================================

/**
 * trend_scanner.universe_top30 - USDT Top 30 종목
 */
export interface UniverseTop30Row {
  symbol: string;           // PK, 예: BTCUSDT
  rank: number;             // 거래량 순위 (1~30)
  quote_volume_usdt: number | null;  // 24h USDT 거래량
  updated_at: string;       // ISO timestamp
}

export interface UniverseTop30Insert {
  symbol: string;
  rank: number;
  quote_volume_usdt?: number | null;
  updated_at?: string;
}

export interface UniverseTop30Update {
  symbol?: string;
  rank?: number;
  quote_volume_usdt?: number | null;
  updated_at?: string;
}

/**
 * trend_scanner.core_subset_symbols — AIX-66 API 커버리지
 */
export interface CoreSubsetSymbolsRow {
  symbol: string;
  base_asset: string;
  coingecko_id: string | null;
  coingecko_rank: number | null;
  coingecko_top200: boolean;
  santiment_covered: boolean;
  lunarcrush_covered: boolean;
  kaito_covered: boolean;
  messari_covered: boolean;
  is_core: boolean;
  last_verified_at: string | null;
  notes: string | null;
}

/** universe_layered 뷰 layer 컬럼 */
export type UniverseLayer = 'core' | 'outlier';

/**
 * trend_scanner.universe_layered 뷰 — universe_top30 + core_subset
 */
export interface UniverseLayeredRow {
  symbol: string;
  rank: number;
  quote_volume_usdt: number | null;
  updated_at: string;
  is_futures: boolean;
  added_at: string;
  last_signal_at: string | null;
  coingecko_id: string | null;
  coingecko_rank: number | null;
  coingecko_top200: boolean;
  santiment_covered: boolean;
  lunarcrush_covered: boolean;
  kaito_covered: boolean;
  messari_covered: boolean;
  is_core: boolean;
  layer: UniverseLayer;
}

/**
 * trend_scanner.bars_1m - 1분봉 OHLCV
 */
export interface Bars1mRow {
  symbol: string;           // 심볼
  ts_ms: number;            // open time (밀리초 Unix timestamp), PK
  ts_utc: string;           // 자동 생성 UTC 타임스탬프 (GENERATED)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: string;           // 기본값: 'binance'
  inserted_at: string;      // ISO timestamp
}

export interface Bars1mInsert {
  symbol: string;
  ts_ms: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source?: string;
  inserted_at?: string;
}

/**
 * trend_scanner.strategy_indicators_3m - 3분봉 지표
 */
export interface StrategyIndicators3mRow {
  symbol: string;           // PK
  ts_ms: number;            // 3분봉 시작 시간 (ms), PK
  ts_utc: string | null;

  // 가격 정보
  price_now: number | null;
  anchor_price: number | null;

  // 추세 상태
  short_trend: TrendDirection;   // UP, DOWN, RANGE, UNKNOWN
  long_trend: TrendDirection;    // UP, DOWN, RANGE, UNKNOWN

  // 저고점
  short_low: number | null;
  short_high: number | null;
  long_low: number | null;
  long_high: number | null;

  // 급등/급락 라인
  spike_up_line: number | null;
  spike_down_line: number | null;

  // 시그널
  signal_active: boolean;
  signal_at: string | null;

  // 메타
  indicator_source: string;      // 기본값: 'proxy_v1'
  calc_version: string;          // 기본값: 'proxy_v1'
  calc_at: string;               // ISO timestamp
}

export interface StrategyIndicators3mInsert {
  symbol: string;
  ts_ms: number;
  ts_utc?: string | null;
  price_now?: number | null;
  anchor_price?: number | null;
  short_trend?: TrendDirection;
  long_trend?: TrendDirection;
  short_low?: number | null;
  short_high?: number | null;
  long_low?: number | null;
  long_high?: number | null;
  spike_up_line?: number | null;
  spike_down_line?: number | null;
  signal_active?: boolean;
  signal_at?: string | null;
  indicator_source?: string;
  calc_version?: string;
  calc_at?: string;
}

// =============================================================================
// View Types
// =============================================================================

/**
 * trend_scanner.v_bars_3m_with_count - 3분봉 집계 (bar_count 포함)
 */
export interface VBars3mWithCountRow {
  symbol: string;
  ts_ms_3m: number;         // 3분 버킷 시작 시간
  ts_utc_3m: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  bar_count: number;        // 버킷 내 1분봉 개수
}

/**
 * trend_scanner.v_bars_3m_complete - 완성된 3분봉만 (bar_count=3)
 */
export interface VBars3mCompleteRow {
  symbol: string;
  ts_ms: number;
  ts_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * trend_scanner.board_rows_latest - 보드용 뷰 (심볼별 최신 1행)
 */
export interface BoardRowsLatestRow {
  symbol: string;
  ts_ms: number;
  ts_utc: string | null;
  price_now: number | null;
  anchor_price: number | null;

  // 파생 필드
  basis_match_side: BasisMatchSide;  // 'buy' | 'sell' | 'neutral'
  basis_match_pct: number;           // 0~100, 소수점 2자리

  // 추세
  short_trend: TrendDirection;
  long_trend: TrendDirection;

  // 저고점
  short_low: number | null;
  short_high: number | null;
  long_low: number | null;
  long_high: number | null;

  // 급등/급락 라인
  spike_up_line: number | null;
  spike_down_line: number | null;

  // 시그널
  signal_active: boolean;
  signal_at: string | null;

  // 스코어 (placeholder)
  basis_pressure_score: number;         // 0~100
  direction_match_score: number;        // 0~100
  basis_trend_strength_gauge: number;   // 0~100
  rank_score: number;                   // 유니버스 순위 기반

  // 메타
  indicator_source: string;
  calc_version: string;
  calc_at: string;
}

// =============================================================================
// Enum Types
// =============================================================================

export type TrendDirection = 'UP' | 'DOWN' | 'RANGE' | 'UNKNOWN';
export type BasisMatchSide = 'buy' | 'sell' | 'neutral';

// =============================================================================
// Database Schema Definition (for Supabase client)
// =============================================================================

export interface TrendScannerSchema {
  Tables: {
    universe_top30: {
      Row: UniverseTop30Row;
      Insert: UniverseTop30Insert;
      Update: UniverseTop30Update;
    };
    bars_1m: {
      Row: Bars1mRow;
      Insert: Bars1mInsert;
      Update: Partial<Bars1mInsert>;
    };
    strategy_indicators_3m: {
      Row: StrategyIndicators3mRow;
      Insert: StrategyIndicators3mInsert;
      Update: Partial<StrategyIndicators3mInsert>;
    };
  };
  Views: {
    v_bars_3m_with_count: {
      Row: VBars3mWithCountRow;
    };
    v_bars_3m_complete: {
      Row: VBars3mCompleteRow;
    };
    board_rows_latest: {
      Row: BoardRowsLatestRow;
    };
  };
}

// =============================================================================
// Helper Types for Frontend
// =============================================================================

/**
 * 보드 테이블에서 사용할 정렬 기준
 */
export type BoardSortField =
  | 'symbol'
  | 'price_now'
  | 'basis_match_pct'
  | 'short_trend'
  | 'long_trend'
  | 'rank_score'
  | 'signal_active';

/**
 * 보드 필터 옵션
 */
export interface BoardFilterOptions {
  trends?: TrendDirection[];
  signalActive?: boolean;
  minBasisMatchPct?: number;
  maxBasisMatchPct?: number;
  symbols?: string[];
}

/**
 * 실시간 업데이트 페이로드
 */
export interface TrendScannerRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'universe_top30' | 'bars_1m' | 'strategy_indicators_3m';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}
