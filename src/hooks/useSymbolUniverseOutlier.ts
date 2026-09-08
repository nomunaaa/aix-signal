import { useQuery } from '@tanstack/react-query';
import { getUniverseLayeredRow, getUniverseTop30 } from '@/services/trendScannerService';
import type { UniverseLayer } from '@/integrations/supabase/trend-scanner-types';
import { BASE_PRICES } from '@/lib/mock/realistic-data';

/** DB 비어 있거나 조회 실패 시 목 목록으로 top30 멤버십 폴백 (로컬 개발용) */
function fallbackUniverseSymbolSet(): Set<string> {
  return new Set(Object.keys(BASE_PRICES));
}

/** AIX-66: top30 밖은 external — 뷰의 core|outlier와 구분 */
export type SymbolUniverseLayer = UniverseLayer | 'external';

/**
 * 종목 상세 Zone fallback용: layer === 'core'일 때만 풀 데이터.
 * isOutlier === true 는 core가 아님(external 포함).
 */
export function useSymbolUniverseOutlier(symbol: string): {
  isOutlier: boolean;
  layer: SymbolUniverseLayer;
  inTop30: boolean;
  universeLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['trend_scanner', 'universe_layer', symbol],
    queryFn: async (): Promise<{
      layer: SymbolUniverseLayer;
      isOutlier: boolean;
      inTop30: boolean;
    }> => {
      try {
        const row = await getUniverseLayeredRow(symbol);
        if (row) {
          return {
            layer: row.layer,
            isOutlier: row.layer !== 'core',
            inTop30: true,
          };
        }
        const top30 = await getUniverseTop30();
        if (top30.length > 0) {
          const inSet = new Set(top30.map((r) => r.symbol.toUpperCase()));
          if (!inSet.has(symbol.toUpperCase())) {
            return { layer: 'external', isOutlier: true, inTop30: false };
          }
          return { layer: 'outlier', isOutlier: true, inTop30: true };
        }
        const fallback = fallbackUniverseSymbolSet();
        if (!fallback.has(symbol.toUpperCase())) {
          return { layer: 'external', isOutlier: true, inTop30: false };
        }
        return { layer: 'outlier', isOutlier: true, inTop30: true };
      } catch {
        const fallback = fallbackUniverseSymbolSet();
        if (!fallback.has(symbol.toUpperCase())) {
          return { layer: 'external', isOutlier: true, inTop30: false };
        }
        return { layer: 'outlier', isOutlier: true, inTop30: true };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    isOutlier: data?.isOutlier ?? true,
    layer: data?.layer ?? 'external',
    inTop30: data?.inTop30 ?? false,
    universeLoading: isLoading,
  };
}
