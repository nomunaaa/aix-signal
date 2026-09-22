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

// mapSignalCycleRow가 손익률을 구하는 데 실제로 쓰는 필드만 읽는다.
// barinterval·hold_sec·entry_time·flow는 여기서 쓰지 않는 필드로만 흘러가므로 뺐다
// (그래서 이 함수가 돌려주는 행의 engine/entryTime/holdSec은 신뢰할 수 없다 —
// 아래에서 곧바로 exitMs와 손익률만 뽑아 쓰는 이유다).
// current_price / partial_exit_percentage / partial_exit_event는 이 스키마에 없다.
// mapSignalCycleRow가 옵셔널로 읽으므로(없으면 exit_price·actions로 대체) 제외한다.
const CYCLE_SELECT_FIELDS = [
  'id',
  'symbol',
  'side',
  'entry_price',
  'exit_price',
  'realized_pnl_pct',
  'trading_category',
  'strategy_type',
  'added_entry_price',
  'partial_exit_price',
  'exit_time',
  'entry_trend_short',
  'entry_trend_long',
  'actions:signal_actions(*)',
].join(',');

/** PostgREST가 한 번에 돌려주는 최대 행 수 — 서버(db-max-rows)에서 막혀 있어 더 못 올린다. */
const PAGE_SIZE = 1000;
/** 동시에 던지는 페이지 요청 수 — 올릴수록 빠르지만 무거운 필터에서 statement timeout이 난다. */
const PAGE_CONCURRENCY = 12;
/** statement timeout은 동시 요청이 몰릴 때 간헐적으로 나므로 몇 번은 다시 시도한다. */
const TIMEOUT_RETRIES = 2;
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
  // 추세 모드도 쿼리에서 걸렀지만, 최종 판정은 화면 전체가 쓰는 trendMode()에
  // 맡긴다 — 아래 SQL 절은 어디까지나 '덜 읽기 위한' 사전 필터다.
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

// resolveSignalTrendModeFromEntryTrends를 SQL로 옮긴 것. 추세 모드를 서버에서
// 거르지 않으면 선택하지도 않은 모드의 사이클까지 전부 받아온 뒤 버리게 되는데,
// 그 차이가 매우 크다 (P1 기준 18만 행 → 9천 행).
//
// 값 표기는 parseEntryTrendSnapshot이 받아들이는 형태를 모두 넣어 둔다. 실제
// 데이터는 24개월 표본 전체가 UP/DOWN/NEUTRAL 하나뿐이었지만, 별칭이 섞여 들어와도
// 조용히 행이 빠지지 않도록 같이 적는다.
const UP_VALUES = 'UP,LONG,1';
const DOWN_VALUES = 'DOWN,SHORT,-1';
const NEUTRAL_VALUES = 'NEUTRAL,0';
const DIRECTIONAL_VALUES = `${UP_VALUES},${DOWN_VALUES}`;

const TREND_MODE_CLAUSE: Record<ProofStatsTrendMode, string> = {
  trend: `and(entry_trend_long.in.(${UP_VALUES}),entry_trend_short.in.(${DIRECTIONAL_VALUES}))`,
  reversal: `and(entry_trend_long.in.(${DOWN_VALUES}),entry_trend_short.in.(${DIRECTIONAL_VALUES}))`,
  nonTrend: `and(entry_trend_long.in.(${DIRECTIONAL_VALUES}),entry_trend_short.in.(${NEUTRAL_VALUES}))`,
};

type CycleQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

/**
 * 종목/카테고리/스트림/추세는 반드시 쿼리에 넣는다. 2년치 청산 사이클은 32만 건이라
 * 전부 받아와 JS에서 거르면 요청이 끝나지 않는다.
 */
function applyFilters(query: CycleQuery, sinceIso: string, filter: RiskAnalysisFilter): CycleQuery {
  let next = query.not('exit_time', 'is', null).gte('exit_time', sinceIso);

  const signalNames = filter.streams
    .map((stream) => SIGNAL_NAME_BY_STREAM[stream])
    .filter(Boolean);
  if (signalNames.length) next = next.in('signal_name', signalNames);

  if (filter.tradingCategories.length) {
    next = next.in('trading_category', filter.tradingCategories as string[]);
  }
  if (filter.symbols.length) next = next.in('symbol', filter.symbols as string[]);

  if (filter.trendModes.length) {
    next = next.or(filter.trendModes.map((mode) => TREND_MODE_CLAUSE[mode]).join(','));
  }
  return next;
}

function isStatementTimeout(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === '57014';
}

async function fetchPage(
  supabase: SupabaseClient,
  sinceIso: string,
  filter: RiskAnalysisFilter,
  from: number
): Promise<PlatformCycleRow[]> {
  for (let attempt = 0; ; attempt += 1) {
    const { data, error } = await applyFilters(
      supabase.from('signal_cycles').select(CYCLE_SELECT_FIELDS),
      sinceIso,
      filter
    )
      // exit_time만으로는 동률이 있을 때 순서가 정해지지 않아, 페이지를 병렬로 나눠
      // 읽으면 어떤 행은 두 번 오고 어떤 행은 빠질 수 있다. id로 순서를 확정한다.
      // (exit_time 인덱스를 그대로 타므로 이 보조 정렬은 사실상 공짜다.)
      .order('exit_time', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      if (isStatementTimeout(error) && attempt < TIMEOUT_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      throw error;
    }

    const rows: PlatformCycleRow[] = [];
    for (const raw of data ?? []) {
      const mapped = mapSignalCycleRow(raw as unknown as Record<string, unknown>);
      if (mapped) rows.push(mapped);
    }
    return rows;
  }
}

/**
 * 페이지를 순서대로 하나씩 받으면 왕복 횟수만큼 그대로 기다리게 된다 (10만 행이면
 * 100번). 한 번에 PAGE_CONCURRENCY개씩 묶어서 받고, 덜 찬 페이지가 나오면 거기서
 * 끝난 것이므로 멈춘다.
 *
 * 전체 건수를 먼저 세는 방법도 있지만, count는 같은 조건을 한 번 더 전부 훑는
 * 무거운 질의라 무거운 필터에서는 그 자체로 timeout이 났다. 덜 찬 페이지로 끝을
 * 판단하면 그 스캔이 통째로 없어진다.
 */
async function fetchClosedCycles(
  supabase: SupabaseClient,
  sinceIso: string,
  filter: RiskAnalysisFilter
): Promise<PlatformCycleRow[]> {
  const rows: PlatformCycleRow[] = [];

  for (let batchStart = 0; ; batchStart += PAGE_SIZE * PAGE_CONCURRENCY) {
    const offsets = Array.from(
      { length: PAGE_CONCURRENCY },
      (_, index) => batchStart + index * PAGE_SIZE
    );
    const pages = await Promise.all(
      offsets.map((from) => fetchPage(supabase, sinceIso, filter, from))
    );

    let reachedEnd = false;
    for (const page of pages) {
      rows.push(...page);
      // 덜 찬 페이지 뒤로는 데이터가 없다. 같은 묶음의 나머지는 빈 배열로 오므로
      // 그대로 더해도 안전하다.
      if (page.length < PAGE_SIZE) reachedEnd = true;
    }
    if (reachedEnd) return rows;
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
