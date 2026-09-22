import { fetchRiskAnalysis, type RiskAnalysisFilter } from '@/lib/proof/fetch-risk-analysis';
import type { ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// 기본 함수 제한(10~15초)으로는 넓은 필터에서 응답을 내기 전에 잘린다 — 화면에서는
// 그냥 '계속 로딩'으로 보인다. 아래 캐시가 대부분을 받아 주지만 첫 요청은 오래 걸린다.
export const maxDuration = 60;

// 사용자별 데이터가 아니라 전체 시그널 집계라서 공유 캐시에 담아도 된다. 원본
// 스캔이 무거운 만큼, 필터를 껐다 켜며 오가는 흔한 경우에 다시 스캔하지 않는
// 것만으로도 체감이 크게 달라진다. stale-while-revalidate 덕에 만료된 뒤에도
// 기다리지 않고 바로 이전 값을 받는다.
const CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600';

// BEAT가 빠져 있으면 B1~B3만 고른 요청에서 streams가 빈 배열이 되고, 그러면
// signal_name 조건이 통째로 사라져 전 스트림을 훑는다 — 숫자도 틀리고 가장 느리다.
const STREAMS: ProofStatsStream[] = ['PULSE', 'BEAT', 'WAVE'];
const TREND_MODES: ProofStatsTrendMode[] = ['trend', 'nonTrend', 'reversal'];
const CATEGORIES: TradingCategory[] = ['E1X1', 'E1X2', 'E2X1', 'E2X2'];

/** 화이트리스트에 있는 값만 통과시킨다 — 쿼리스트링을 그대로 신뢰하지 않는다. */
function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  const wanted = new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
  return allowed.filter((value) => wanted.has(value));
}

function parseSymbols(raw: string | null): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(',')
        .map((value) => value.trim().toUpperCase())
        .filter((value) => /^[A-Z0-9]{2,20}$/.test(value))
    ),
  ];
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filter: RiskAnalysisFilter = {
    streams: parseList(params.get('streams'), STREAMS),
    trendModes: parseList(params.get('trendModes'), TREND_MODES),
    tradingCategories: parseList(params.get('categories'), CATEGORIES),
    symbols: parseSymbols(params.get('symbols')),
  };

  try {
    return Response.json(await fetchRiskAnalysis(filter), {
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    // Supabase 에러 객체는 그냥 찍으면 {}로 보이므로 필드를 펼쳐서 남긴다.
    const detail =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : (error as Record<string, unknown>);
    console.error('[proof] risk analysis failed:', JSON.stringify(detail));
    return Response.json({ error: 'risk_analysis_failed' }, { status: 500 });
  }
}
