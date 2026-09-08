import type { LongShortScale, SymbolAnalysis, VolatilityScale } from '@/lib/mock/trend-v8-mock';

export type TrendEngine = 'pulse' | 'wave';
export type CompactTrendSort = 'rating' | 'long' | 'short' | 'volume';

const RATING_SORT_ORDER: Record<LongShortScale, number> = {
  strong_long: 4,
  long: 3,
  neutral: 2,
  short: 1,
  strong_short: 0,
};

const KAIROS_MAX_SCORE = 24;
const KAIROS_STRONG_THRESHOLD = 18;
const HIGH_CONFIDENCE_RATIO = 0.2;
const INTENSITY_CAP_PERCENT = 20;

export function isLongRating(rating: LongShortScale) {
  return rating === 'long' || rating === 'strong_long';
}

export function isShortRating(rating: LongShortScale) {
  return rating === 'short' || rating === 'strong_short';
}

function directionVoteCount(row: SymbolAnalysis) {
  if (isLongRating(row.rating)) return row.ratingDistribution.longCount;
  if (isShortRating(row.rating)) return row.ratingDistribution.shortCount;
  return Math.max(row.ratingDistribution.longCount, row.ratingDistribution.shortCount);
}

function signalBonus(row: SymbolAnalysis) {
  if (row.signal.state === 'NONE') return 0;
  if (row.signal.state === 'WAIT') {
    if (row.signal.reliability === 'A') return 3;
    if (row.signal.reliability === 'B+') return 2;
    return 1;
  }
  if (row.signal.reliability === 'A') return 5;
  if (row.signal.reliability === 'B+') return 4;
  return 3;
}

function scaleAlignsWithRating(scale: LongShortScale, rating: LongShortScale) {
  return (
    (isLongRating(rating) && isLongRating(scale)) || (isShortRating(rating) && isShortRating(scale))
  );
}

function trendBonus(row: SymbolAnalysis, engine: TrendEngine) {
  const trend = engine === 'pulse' ? row.shortTermTrend.scale : row.longTermTrend.scale;
  if (!scaleAlignsWithRating(trend, row.rating)) return 0;
  return 3;
}

export function getKairosScore(row: SymbolAnalysis, engine: TrendEngine): number {
  if (typeof row.kairosScore === 'number' && Number.isFinite(row.kairosScore)) {
    return Math.min(KAIROS_MAX_SCORE, Math.max(0, Math.round(row.kairosScore)));
  }
  return Math.min(
    KAIROS_MAX_SCORE,
    directionVoteCount(row) + signalBonus(row) + trendBonus(row, engine)
  );
}

export function formatKairosScore(row: SymbolAnalysis, engine: TrendEngine): string {
  return `${getKairosScore(row, engine)} / ${KAIROS_MAX_SCORE}`;
}

function directionPriority(row: SymbolAnalysis, sort: CompactTrendSort) {
  if (sort === 'long') return isLongRating(row.rating) ? 1 : 0;
  if (sort === 'short') return isShortRating(row.rating) ? 1 : 0;
  return 0;
}

export function sortCompactTrendRows(
  rows: SymbolAnalysis[],
  engine: TrendEngine,
  sort: CompactTrendSort
): SymbolAnalysis[] {
  return [...rows].sort((a, b) => {
    if (sort === 'volume') return b.volume24hUsdt - a.volume24hUsdt;

    if (sort === 'rating') {
      const ra = RATING_SORT_ORDER[a.rating] ?? 0;
      const rb = RATING_SORT_ORDER[b.rating] ?? 0;
      const ratingCmp = rb - ra;
      if (ratingCmp !== 0) return ratingCmp;
      const scoreCmp = getKairosScore(b, engine) - getKairosScore(a, engine);
      if (scoreCmp !== 0) return scoreCmp;
      return b.volume24hUsdt - a.volume24hUsdt;
    }

    const directionCmp = directionPriority(b, sort) - directionPriority(a, sort);
    if (directionCmp !== 0) return directionCmp;

    const scoreCmp = getKairosScore(b, engine) - getKairosScore(a, engine);
    if (scoreCmp !== 0) return scoreCmp;

    return b.volume24hUsdt - a.volume24hUsdt;
  });
}

function matchesSortDirection(row: SymbolAnalysis, sort: CompactTrendSort) {
  if (sort === 'long') return isLongRating(row.rating);
  if (sort === 'short') return isShortRating(row.rating);
  if (sort === 'rating' || sort === 'volume') return true;
  return true;
}

export function getHighConfidenceSymbols(
  rows: SymbolAnalysis[],
  engine: TrendEngine,
  sort: CompactTrendSort = 'long'
): Set<string> {
  const maxCount = Math.max(1, Math.ceil(rows.length * HIGH_CONFIDENCE_RATIO));
  const symbols = sortCompactTrendRows(rows, engine, sort)
    .filter((row) => matchesSortDirection(row, sort))
    .filter((row) => getKairosScore(row, engine) >= KAIROS_STRONG_THRESHOLD)
    .sort((a, b) => getKairosScore(b, engine) - getKairosScore(a, engine))
    .slice(0, maxCount)
    .map((row) => row.symbol);

  return new Set(symbols);
}

export type TrendPercentIntensity = {
  tone: 'subtle' | 'light' | 'strong';
  backgroundAlpha: number;
};

export function getTrendDirectionArrow(value: number | null | undefined): '↑' | '↓' | '→' {
  if (value == null || !Number.isFinite(value) || value === 0) return '→';
  return value > 0 ? '↑' : '↓';
}

export function getTrendPercentIntensity(value: number | null | undefined): TrendPercentIntensity {
  const abs = value == null || !Number.isFinite(value) ? 0 : Math.abs(value);
  const capped = Math.min(abs, INTENSITY_CAP_PERCENT);

  if (abs < 3) return { tone: 'subtle', backgroundAlpha: 0.035 };
  if (abs < 10) return { tone: 'light', backgroundAlpha: 0.07 };

  return {
    tone: 'strong',
    backgroundAlpha: Number((0.11 + ((capped - 10) / 10) * 0.03).toFixed(3)),
  };
}

export function getTrendScaleArrow(scale: LongShortScale): '↑' | '↓' | '→' {
  if (scale === 'strong_long') return '↑';
  if (scale === 'long') return '↑';
  if (scale === 'short') return '↓';
  if (scale === 'strong_short') return '↓';
  return '→';
}

function volatilityDots(scale: VolatilityScale) {
  if (scale === 'extreme' || scale === 'high') return '●●●';
  if (scale === 'mid') return '●●';
  if (scale === 'low') return '●';
  return '';
}

export function getPullbackPct(row: SymbolAnalysis): number {
  const explicit = (row as SymbolAnalysis & { pullbackPct?: number }).pullbackPct;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) return explicit;

  const ema50 = Number(row.ema50.rawValue);
  if (!Number.isFinite(ema50) || row.price <= 0) return 0;
  return Math.abs(((row.price - ema50) / row.price) * 100);
}

export function getRatingBadgeLabel(rating: LongShortScale): 'LONG' | 'SHORT' | '중립' {
  if (isLongRating(rating)) return 'LONG';
  if (isShortRating(rating)) return 'SHORT';
  return '중립';
}

export function getCompactTrendMeta(row: SymbolAnalysis) {
  return {
    shortArrow: getTrendScaleArrow(row.shortTermTrend.scale),
    longArrow: getTrendScaleArrow(row.longTermTrend.scale),
    volatilityDots: volatilityDots(row.volatility.scale),
    pullbackPct: getPullbackPct(row),
    ratingBadge: getRatingBadgeLabel(row.rating),
  };
}

export function isDirectionalRating(rating: LongShortScale) {
  return isLongRating(rating) || isShortRating(rating);
}
