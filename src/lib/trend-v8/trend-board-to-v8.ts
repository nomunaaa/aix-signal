import type { TrendBoardCard } from '@/domain/trend/boardTypes';
import { EngineMode, TrendDirection, VolatilityLevel } from '@/domain/trend/boardTypes';
import type { SignalCycle } from '@/stores/symbolStore';

const TREND_DIR_LABEL: Record<TrendDirection, string> = {
  [TrendDirection.UP]: '↑',
  [TrendDirection.DOWN]: '↓',
  [TrendDirection.FLAT]: '→',
};

const VOL_LABEL: Record<VolatilityLevel, string> = {
  [VolatilityLevel.LOW]: '낮',
  [VolatilityLevel.MEDIUM]: '중',
  [VolatilityLevel.HIGH]: '높',
};
import type {
  IndicatorScore,
  LongShortScale,
  SignalIndicator,
  SymbolAnalysis,
  VolatilityIndicator,
} from '@/lib/mock/trend-v8-mock';

const NEUTRAL_IND: IndicatorScore = { scale: 'neutral', rawValue: '—', displayLabel: '—' };
const NEUTRAL_VOL: VolatilityIndicator = { scale: 'mid', rawValue: 0, displayLabel: '—' };
const NONE_SIGNAL: SignalIndicator = {
  state: 'NONE',
  direction: null,
  reliability: null,
  cycleId: null,
  displayLabel: '—',
};

function trendDirectionToScale(dir: TrendDirection): LongShortScale {
  if (dir === TrendDirection.UP) return 'long';
  if (dir === TrendDirection.DOWN) return 'short';
  return 'neutral';
}

function directionToRating(dir: 'LONG' | 'SHORT' | 'NONE' | undefined): LongShortScale {
  if (dir === 'LONG') return 'long';
  if (dir === 'SHORT') return 'short';
  return 'neutral';
}

function volatilityLevelToScale(level: VolatilityLevel): VolatilityIndicator['scale'] {
  if (level === VolatilityLevel.LOW) return 'low';
  if (level === VolatilityLevel.HIGH) return 'high';
  return 'mid';
}

function signalFromCycle(cycle: SignalCycle | null): SignalIndicator {
  if (!cycle) return NONE_SIGNAL;
  const side = cycle.side?.toUpperCase();
  const direction = side === 'LONG' || side === 'SHORT' ? side : null;
  const state = cycle.is_open ? 'LIVE' : 'WAIT';
  const displayLabel = direction
    ? `${state === 'LIVE' ? 'LIVE' : 'WAIT'} ${direction}`
    : '—';
  return {
    state,
    direction,
    reliability: null,
    cycleId: cycle.id,
    displayLabel,
  };
}

function trendIndicator(dir: TrendDirection): IndicatorScore {
  const scale = trendDirectionToScale(dir);
  const label = TREND_DIR_LABEL[dir];
  return { scale, rawValue: label, displayLabel: label };
}

/**
 * TrendBoardCard (useTrendBoard / symbolStore) → SymbolAnalysis (v8 table row).
 * Coinglass / extended oscillators: neutral placeholders until wired.
 */
export function trendBoardCardToSymbolAnalysis(
  card: TrendBoardCard,
  volume24hUsdt: number,
  signalCycle: SignalCycle | null
): SymbolAnalysis {
  const rating = directionToRating(card.direction);
  const confidence = card.groupC.confidencePct;
  const isLong = rating === 'long' || rating === 'strong_long';
  const isShort = rating === 'short' || rating === 'strong_short';

  return {
    symbol: card.symbol,
    price: card.groupB.currentPriceUsd,
    priceChange24h: card.groupB.dailyChange ?? card.groupB.change24h ?? 0,
    volume24hUsdt,
    signal: signalFromCycle(signalCycle),
    trendStrength: {
      scale: rating,
      rawValue: confidence,
      displayLabel: `${confidence}%`,
    },
    shortTermTrend: trendIndicator(card.groupA.shortTermTrend),
    longTermTrend: trendIndicator(card.groupA.longTermTrend),
    volatility: {
      scale: volatilityLevelToScale(card.groupA.volatility),
      rawValue: card.groupA.noiseScore,
      displayLabel: VOL_LABEL[card.groupA.volatility],
    },
    rsi14: NEUTRAL_IND,
    stochK: NEUTRAL_IND,
    macd: NEUTRAL_IND,
    stochRsi: NEUTRAL_IND,
    williamsR: NEUTRAL_IND,
    ultimateOsc: NEUTRAL_IND,
    ema50: NEUTRAL_IND,
    ema200: NEUTRAL_IND,
    sma50: NEUTRAL_IND,
    sma200: NEUTRAL_IND,
    maSummary: NEUTRAL_IND,
    oiDirection: NEUTRAL_IND,
    fundingRate: NEUTRAL_IND,
    longShortRatio: NEUTRAL_IND,
    liquidationHeatmap: NEUTRAL_IND,
    fearGreed: NEUTRAL_IND,
    ratingScore: confidence,
    ratingScaleMax: 100,
    rating,
    ratingDistribution: {
      longCount: isLong ? 1 : 0,
      neutralCount: !isLong && !isShort ? 1 : 0,
      shortCount: isShort ? 1 : 0,
    },
  };
}

export function engineModeToBarInterval(engine: EngineMode): '1m' | '10m' {
  return engine === EngineMode.PULSE ? '1m' : '10m';
}
