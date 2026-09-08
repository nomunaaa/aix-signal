/**
 * trend_scanner 스키마 서비스 레이어
 *
 * trend_scanner 스키마의 테이블/뷰에 대한 CRUD 및 실시간 구독
 *
 * ## Supabase 설정 필수 사항
 *
 * 1. API 스키마 노출 (Dashboard > API Settings > Exposed Schemas에 'trend_scanner' 추가)
 *    또는 로컬 개발 시 config.toml:
 *    ```toml
 *    [api]
 *    schemas = ["public", "trend_scanner"]
 *    ```
 *
 * 2. Realtime 활성화 (SQL 실행):
 *    ```sql
 *    ALTER PUBLICATION supabase_realtime ADD TABLE trend_scanner.strategy_indicators_3m;
 *    ALTER PUBLICATION supabase_realtime ADD TABLE trend_scanner.universe_top30;
 *    ```
 *
 * @see https://supabase.com/docs/guides/api/using-custom-schemas
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type {
  UniverseTop30Row,
  UniverseTop30Insert,
  UniverseLayeredRow,
  Bars1mRow,
  Bars1mInsert,
  StrategyIndicators3mRow,
  StrategyIndicators3mInsert,
  VBars3mWithCountRow,
  VBars3mCompleteRow,
  BoardRowsLatestRow,
  BoardFilterOptions,
  BoardSortField,
  TrendScannerRealtimePayload,
} from '@/integrations/supabase/trend-scanner-types';

// =============================================================================
// Constants & Helpers
// =============================================================================

const SCHEMA = 'trend_scanner';

/**
 * trend_scanner 스키마에 접근하는 Supabase 클라이언트 헬퍼
 * 생성된 Database 타입에 trend_scanner가 없어 schema() 인자를 넓게 단언한다.
 */
function db(): SupabaseClient {
  return (supabase as unknown as { schema: (name: string) => SupabaseClient }).schema(SCHEMA);
}

// =============================================================================
// Universe Top30
// =============================================================================

/**
 * 유니버스 Top30 전체 조회
 */
export async function getUniverseTop30(): Promise<UniverseTop30Row[]> {
  const { data, error } = await db()
    .from('universe_top30')
    .select('*')
    .order('rank', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch universe_top30: ${error.message}`);
  }

  return data as UniverseTop30Row[];
}

/**
 * 유니버스 Top30 upsert (벌크)
 */
export async function upsertUniverseTop30(
  rows: UniverseTop30Insert[]
): Promise<void> {
  const { error } = await db()
    .from('universe_top30')
    .upsert(rows, { onConflict: 'symbol' });

  if (error) {
    throw new Error(`Failed to upsert universe_top30: ${error.message}`);
  }
}

/**
 * AIX-66: universe_layered 뷰 전체 (트렌드/인사이트 필터용)
 */
export async function getUniverseLayered(): Promise<UniverseLayeredRow[]> {
  const { data, error } = await db()
    .from('universe_layered')
    .select('*')
    .order('rank', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch universe_layered: ${error.message}`);
  }

  return data as UniverseLayeredRow[];
}

/**
 * AIX-66: 단일 심볼 레이어 (종목 상세 Zone fallback)
 */
export async function getUniverseLayeredRow(
  symbol: string
): Promise<UniverseLayeredRow | null> {
  const sym = symbol.toUpperCase();
  const { data, error } = await db()
    .from('universe_layered')
    .select('*')
    .eq('symbol', sym)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch universe_layered row: ${error.message}`);
  }

  return data as UniverseLayeredRow | null;
}

// =============================================================================
// Bars 1m
// =============================================================================

/**
 * 1분봉 데이터 조회 (심볼별, 최신 N개)
 */
export async function getBars1m(
  symbol: string,
  limit: number = 100
): Promise<Bars1mRow[]> {
  const { data, error } = await db()
    .from('bars_1m')
    .select('*')
    .eq('symbol', symbol)
    .order('ts_ms', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch bars_1m: ${error.message}`);
  }

  return data as Bars1mRow[];
}

/**
 * 1분봉 데이터 삽입 (벌크)
 */
export async function insertBars1m(rows: Bars1mInsert[]): Promise<void> {
  const { error } = await db()
    .from('bars_1m')
    .upsert(rows, { onConflict: 'symbol,ts_ms' });

  if (error) {
    throw new Error(`Failed to insert bars_1m: ${error.message}`);
  }
}

/**
 * 최신 1분봉 조회 (전체 심볼)
 */
export async function getLatestBars1m(): Promise<Bars1mRow[]> {
  // RPC 또는 직접 쿼리로 각 심볼의 최신 1분봉 조회
  const { data, error } = await db()
    .from('bars_1m')
    .select('*')
    .order('ts_ms', { ascending: false })
    .limit(30); // Top 30 심볼 기준

  if (error) {
    throw new Error(`Failed to fetch latest bars_1m: ${error.message}`);
  }

  return data as Bars1mRow[];
}

// =============================================================================
// 3분봉 뷰
// =============================================================================

/**
 * 3분봉 집계 조회 (bar_count 포함)
 */
export async function getVBars3mWithCount(
  symbol: string,
  limit: number = 100
): Promise<VBars3mWithCountRow[]> {
  const { data, error } = await db()
    .from('v_bars_3m_with_count')
    .select('*')
    .eq('symbol', symbol)
    .order('ts_ms_3m', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch v_bars_3m_with_count: ${error.message}`);
  }

  return data as VBars3mWithCountRow[];
}

/**
 * 완성된 3분봉만 조회
 */
export async function getVBars3mComplete(
  symbol: string,
  limit: number = 100
): Promise<VBars3mCompleteRow[]> {
  const { data, error } = await db()
    .from('v_bars_3m_complete')
    .select('*')
    .eq('symbol', symbol)
    .order('ts_ms', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch v_bars_3m_complete: ${error.message}`);
  }

  return data as VBars3mCompleteRow[];
}

// =============================================================================
// Strategy Indicators 3m
// =============================================================================

/**
 * 지표 데이터 조회 (심볼별, 최신 N개)
 */
export async function getStrategyIndicators3m(
  symbol: string,
  limit: number = 100
): Promise<StrategyIndicators3mRow[]> {
  const { data, error } = await db()
    .from('strategy_indicators_3m')
    .select('*')
    .eq('symbol', symbol)
    .order('ts_ms', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch strategy_indicators_3m: ${error.message}`);
  }

  return data as StrategyIndicators3mRow[];
}

/**
 * 지표 데이터 upsert
 */
export async function upsertStrategyIndicators3m(
  rows: StrategyIndicators3mInsert[]
): Promise<void> {
  const { error } = await db()
    .from('strategy_indicators_3m')
    .upsert(rows, { onConflict: 'symbol,ts_ms' });

  if (error) {
    throw new Error(`Failed to upsert strategy_indicators_3m: ${error.message}`);
  }
}

/**
 * 활성 시그널만 조회
 */
export async function getActiveSignals(): Promise<StrategyIndicators3mRow[]> {
  const { data, error } = await db()
    .from('strategy_indicators_3m')
    .select('*')
    .eq('signal_active', true)
    .order('signal_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch active signals: ${error.message}`);
  }

  return data as StrategyIndicators3mRow[];
}

// =============================================================================
// Board Rows Latest (Main View)
// =============================================================================

/**
 * 보드 데이터 조회 (심볼별 최신 1행)
 */
export async function getBoardRowsLatest(
  options?: {
    filter?: BoardFilterOptions;
    sortBy?: BoardSortField;
    sortAsc?: boolean;
    limit?: number;
  }
): Promise<BoardRowsLatestRow[]> {
  let query = db()
    .from('board_rows_latest')
    .select('*');

  // 필터 적용
  if (options?.filter) {
    const { trends, signalActive, minBasisMatchPct, maxBasisMatchPct, symbols } = options.filter;

    if (trends && trends.length > 0) {
      query = query.in('short_trend', trends);
    }
    if (signalActive !== undefined) {
      query = query.eq('signal_active', signalActive);
    }
    if (minBasisMatchPct !== undefined) {
      query = query.gte('basis_match_pct', minBasisMatchPct);
    }
    if (maxBasisMatchPct !== undefined) {
      query = query.lte('basis_match_pct', maxBasisMatchPct);
    }
    if (symbols && symbols.length > 0) {
      query = query.in('symbol', symbols);
    }
  }

  // 정렬 적용
  if (options?.sortBy) {
    query = query.order(options.sortBy, { ascending: options.sortAsc ?? false });
  } else {
    query = query.order('rank_score', { ascending: true });
  }

  // 제한
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch board_rows_latest: ${error.message}`);
  }

  return data as BoardRowsLatestRow[];
}

/**
 * 단일 심볼의 보드 데이터 조회
 */
export async function getBoardRowBySymbol(
  symbol: string
): Promise<BoardRowsLatestRow | null> {
  const { data, error } = await db()
    .from('board_rows_latest')
    .select('*')
    .eq('symbol', symbol)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    throw new Error(`Failed to fetch board row for ${symbol}: ${error.message}`);
  }

  return data as BoardRowsLatestRow;
}

// =============================================================================
// Realtime Subscriptions
// =============================================================================

/**
 * trend_scanner 실시간 구독
 *
 * 주의: Realtime 구독이 작동하려면 Supabase에서 trend_scanner 스키마가
 * supabase_realtime publication에 추가되어 있어야 합니다.
 * SQL: ALTER PUBLICATION supabase_realtime ADD TABLE trend_scanner.strategy_indicators_3m;
 */
export function subscribeTrendScanner(
  onUpdate: (payload: TrendScannerRealtimePayload) => void
): () => void {
  const channel = supabase
    .channel('trend_scanner_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: SCHEMA,
        table: 'strategy_indicators_3m',
      },
      (payload) => {
        onUpdate({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          table: 'strategy_indicators_3m',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: SCHEMA,
        table: 'universe_top30',
      },
      (payload) => {
        onUpdate({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          table: 'universe_top30',
          new: payload.new,
          old: payload.old,
        });
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('[TrendScanner] Realtime connected');
      }
    });

  // 구독 해제 함수 반환
  return () => {
    channel.unsubscribe();
  };
}

/**
 * 특정 심볼의 실시간 구독
 */
export function subscribeSymbolIndicators(
  symbol: string,
  onUpdate: (data: StrategyIndicators3mRow) => void
): () => void {
  const channel = supabase
    .channel(`trend_scanner_${symbol}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: SCHEMA,
        table: 'strategy_indicators_3m',
        filter: `symbol=eq.${symbol}`,
      },
      (payload) => {
        onUpdate(payload.new as StrategyIndicators3mRow);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: SCHEMA,
        table: 'strategy_indicators_3m',
        filter: `symbol=eq.${symbol}`,
      },
      (payload) => {
        onUpdate(payload.new as StrategyIndicators3mRow);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 심볼 목록 조회 (유니버스 기준)
 */
export async function getSymbolList(): Promise<string[]> {
  const { data, error } = await db()
    .from('universe_top30')
    .select('symbol')
    .order('rank', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch symbol list: ${error.message}`);
  }

  return (data || []).map((row) => row.symbol);
}

/**
 * 데이터 신선도 확인 (마지막 업데이트 시간)
 */
export async function getLastUpdateTime(): Promise<Date | null> {
  const { data, error } = await db()
    .from('strategy_indicators_3m')
    .select('calc_at')
    .order('calc_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch last update time: ${error.message}`);
  }

  return data?.calc_at ? new Date(data.calc_at) : null;
}
