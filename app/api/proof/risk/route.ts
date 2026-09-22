import { fetchRiskAnalysis, type RiskAnalysisFilter } from '@/lib/proof/fetch-risk-analysis';
import type { ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';

// 필터 조합마다 결과가 달라지므로 응답 자체는 캐시하지 않는다. 대신 원본 스캔이
// 무거우므로 클라이언트에서 필터가 바뀔 때만 호출한다.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const STREAMS: ProofStatsStream[] = ['PULSE', 'WAVE'];
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
    return Response.json(await fetchRiskAnalysis(filter));
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
