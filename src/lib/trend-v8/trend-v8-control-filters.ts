import type { SymbolAnalysis } from '@/lib/mock/trend-v8-mock';
import { getKairosScore, isLongRating, isShortRating, type TrendEngine } from '@/lib/trend-v8/compact-trend-board';

/** 방향 탭 — 전체 / 롱·숏 추세 / 중립 */
export type TrendDirectionTab = 'all' | 'long_trend' | 'short_trend' | 'neutral';

/** 조건 칩 — 즐겨찾기는 필터링(즐겨찾기만 보기), 정렬은 별도 처리 */
export type TrendConditionId = 'favorite' | 'strong_signal' | 'volatility_caution' | 'surge';

const KAIROS_STRONG = 18;
const SURGE_PCT = 6;

export function filterTrendV8ControlRows(
  rows: SymbolAnalysis[],
  opts: {
    direction: TrendDirectionTab;
    conditions: ReadonlySet<TrendConditionId>;
    favorites: ReadonlySet<string>;
    engine: TrendEngine;
  },
): SymbolAnalysis[] {
  let out = rows;
  const { direction, conditions, favorites, engine } = opts;

  if (direction === 'long_trend') out = out.filter((r) => isLongRating(r.rating));
  else if (direction === 'short_trend') out = out.filter((r) => isShortRating(r.rating));
  else if (direction === 'neutral') out = out.filter((r) => r.rating === 'neutral');

  for (const c of conditions) {
    if (c === 'favorite') {
      out = out.filter((r) => favorites.has(r.symbol));
    } else if (c === 'strong_signal') {
      out = out.filter((r) => getKairosScore(r, engine) >= KAIROS_STRONG);
    } else if (c === 'volatility_caution') {
      out = out.filter((r) => r.volatility.scale === 'high' || r.volatility.scale === 'extreme');
    } else if (c === 'surge') {
      out = out.filter((r) => Math.abs(r.priceChange24h) >= SURGE_PCT);
    }
  }

  return out;
}
