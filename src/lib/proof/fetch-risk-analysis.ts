import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mapSignalCycleRow, type PlatformCycleRow } from '@/lib/proof-platform-aggregate';
import { trendMode } from '@/lib/proof/proof-stats';
import type { ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';
import {
  computeRiskAnalysisByPeriod,
  type RiskAnalysisByPeriod,
  type RiskCycleInput,
} from '@/lib/proof/risk-analysis';

/**
 * 연속 거래/리스크 지표는 proof_stats(합계 테이블)로는 만들 수 없어서 — 순서에
 * 의존하기 때문 — 여기서만 원본 signal_cycles를 청산 시각 순으로 읽는다.
 *
 * 손익률은 mapSignalCycleRow를 그대로 재사용한다. 직접 다시 계산하면 위쪽 카드와
 * 미세하게 어긋난 숫자가 나올 수 있는데, 같은 화면에서 두 값이 다르면 버그로
 * 보인다. 같은 함수를 쓰면 그 위험이 없다.
 */

// mapSignalCycleRow가 읽는 필드 + 부분청산 계산에 필요한 actions 임베드.
// current_price / partial_exit_percentage / partial_exit_event는 이 스키마에 없다.
// mapSignalCycleRow가 옵셔널로 읽으므로(없으면 exit_price·actions로 대체) 제외한다.
const CYCLE_SELECT_FIELDS = [
  'id',
  'symbol',
  'side',
  'entry_price',
  'exit_price',
  'realized_pnl_pct',
  'barinterval',
  'trading_category',
  'strategy_type',
  'added_entry_price',
  'partial_exit_price',
  'hold_sec',
  'entry_time',
  'exit_time',
  'flow',
  'entry_trend_short',
  'entry_trend_long',
  'actions:signal_actions(*)',
].join(',');

const PAGE_SIZE = 1000;
/** 화면의 '누적'은 2년 기준이므로 그보다 오래된 사이클은 읽지 않는다. */
const LOOKBACK_MS = 2 * 365 * 86_400_000;

export interface RiskAnalysisFilter {
  streams: readonly ProofStatsStream[];
  trendModes: readonly ProofStatsTrendMode[];
  tradingCategories: readonly TradingCategory[];
  /** 비어 있으면 종목 제한 없음. */
  symbols: readonly string[];
}

function createProofSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing for proof risk analysis');

  const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}

function matchesFilter(row: PlatformCycleRow, filter: RiskAnalysisFilter): boolean {
  // 스트림은 쿼리에서 signal_name으로 이미 걸렀다. 여기서 row.engine으로 다시
  // 확인하면 안 된다 — engine은 barinterval에서 나오므로 BEAT가 PULSE로 보여
  // BEAT만 선택했을 때 전부 탈락한다.
  if (filter.tradingCategories.length) {
    if (!row.tradingCategory) return false;
    if (!filter.tradingCategories.includes(row.tradingCategory)) return false;
  }
  if (filter.symbols.length) {
    if (!filter.symbols.includes(row.symbol.trim().toUpperCase())) return false;
  }
  if (filter.trendModes.length) {
    const mode = trendMode(row);
    if (!mode || !filter.trendModes.includes(mode)) return false;
  }
  return true;
}

/**
 * 스트림은 barinterval이 아니라 signal_name으로 거른다 — BEAT와 PULSE가 둘 다
 * 1분봉이라 barinterval로는 구분되지 않는다. proof_stats의 streamFromSignalName과
 * 같은 값을 쓴다.
 */
const SIGNAL_NAME_BY_STREAM: Record<ProofStatsStream, string> = {
  PULSE: 'pulse_signal-1',
  BEAT: 'beat_signal-1',
  WAVE: 'wave_signal-1',
};

/**
 * 종목/카테고리/봉 간격은 반드시 쿼리에 넣는다. 2년치 청산 사이클은 30만 건이 넘어서
 * 전부 받아와 JS에서 거르면 요청이 끝나지 않는다. 선택된 조건으로 좁히면 보통 수천 건이다.
 * (추세 모드는 저장된 컬럼이 아니라 파생 값이라 아래에서 JS로 거른다.)
 */
async function fetchClosedCycles(
  supabase: SupabaseClient,
  sinceIso: string,
  filter: RiskAnalysisFilter
): Promise<PlatformCycleRow[]> {
  const rows: PlatformCycleRow[] = [];
  const signalNames = filter.streams
    .map((stream) => SIGNAL_NAME_BY_STREAM[stream])
    .filter(Boolean);

  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase
      .from('signal_cycles')
      .select(CYCLE_SELECT_FIELDS)
      .not('exit_time', 'is', null)
      .gte('exit_time', sinceIso);

    if (signalNames.length) query = query.in('signal_name', signalNames);
    if (filter.tradingCategories.length) {
      query = query.in('trading_category', filter.tradingCategories as string[]);
    }
    if (filter.symbols.length) query = query.in('symbol', filter.symbols as string[]);

    const { data, error } = await query
      .order('exit_time', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = data ?? [];
    for (const raw of page) {
      const mapped = mapSignalCycleRow(raw as unknown as Record<string, unknown>);
      if (mapped) rows.push(mapped);
    }
    if (page.length < PAGE_SIZE) return rows;
  }
}

export async function fetchRiskAnalysis(
  filter: RiskAnalysisFilter,
  nowMs: number = Date.now()
): Promise<RiskAnalysisByPeriod> {
  const supabase = createProofSupabaseClient();
  const sinceIso = new Date(nowMs - LOOKBACK_MS).toISOString();
  const cycles = await fetchClosedCycles(supabase, sinceIso, filter);

  const inputs: RiskCycleInput[] = cycles
    .filter((row) => matchesFilter(row, filter))
    .map((row) => ({
      exitMs: Date.parse(row.exitTime),
      pnlPerEntryNotionalRate: row.pnlPerEntryNotionalRate,
    }))
    .filter((input) => Number.isFinite(input.exitMs));

  return computeRiskAnalysisByPeriod(inputs, nowMs);
}
