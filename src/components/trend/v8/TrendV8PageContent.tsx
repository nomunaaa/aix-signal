'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Star } from 'lucide-react';
import type { SymbolAnalysis } from '@/lib/mock/trend-v8-mock';
import { trendV8PageMock } from '@/lib/mock/trend-v8-mock-data';
import { type CompactTrendSort, type TrendEngine } from '@/lib/trend-v8/compact-trend-board';
import {
  calculateTrendBoardPoint,
  signalOpenCount,
  signalPoint,
  trendBaseScore,
  trendKind,
  trendSignalAdjustmentPoint,
  type TrendBoardSignalKind as StreamSignalKind,
  type TrendBoardTrendKind as TrendKind,
} from '@/lib/trend-v8/trend-board-points';
import type { TrendConditionId, TrendDirectionTab } from '@/lib/trend-v8/trend-v8-control-filters';
import { useTrendV8Board } from '@/hooks/useTrendV8Board';
import {
  trendBoardHistoricalQualityKey,
  useTrendBoardHistoricalQuality,
  type TrendBoardHistoricalQualityLookup,
  type TrendBoardHistoricalQualityStat,
  type TrendBoardHistoricalTrendMode,
} from '@/hooks/useTrendBoardHistoricalQuality';
import { useThrottledSymbolStoreRevision } from '@/hooks/useThrottledSymbolStoreRevision';
import { TrendBoardSkeletonRows } from '@/components/trend/v8/TrendBoardSkeletonRows';
import { useAuth } from '@/contexts/AuthContext';
import { getAllowedSymbols, getSymbolsFromEnv } from '@/config/symbols';
import { cn } from '@/lib/utils';
import { useNavigate } from '@/lib/navigation-compat';
import { useSymbolStore, type SignalCycle } from '@/stores/symbolStore';
import { CoinIcon } from '@/components/signals/CoinIcon';
import {
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { FavoriteScopeControls } from '@/views/signals/pulse/components/FavoriteScopeControls';
import {
  SIGNAL_TREND_MODES,
  STRATEGY_CONFIGS,
  type SignalTrendMode,
  type SignalTrendModeFilter,
  type StrategyId,
} from '@/views/signals/pulse/types/pulse.types';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';
import {
  PULSE_MOCK_STATS_7D,
  PULSE_MOCK_STATS_30D_BY_STRATEGY,
  PULSE_MOCK_STATS_30D_BY_STREAM,
  PULSE_MOCK_STRATEGY_STATS_LIST,
} from '@/lib/mock/pulse-strategy-source';

const AUTO_REFRESH_MS = 10_000;

type TrendV8PageContentProps = {
  useMock?: boolean;
};

type TrendFrontLanguage = 'ko' | 'en';
type TrendClass = 'trend' | 'counter' | 'nontrend';
type VolatilityDot = 1 | 2 | 3;
type TrendQualityPeriod = 'last30d' | 'all';
type SymbolSortDirection = 'asc' | 'desc' | null;

type SignalQualityMetrics = {
  winRatePct: number | null;
  riskRewardRatio: number | null;
  source?: 'open' | 'history';
  sampleSize?: number;
};

type SignalQualitySet = Record<TrendQualityPeriod, SignalQualityMetrics>;

const EMPTY_SIGNAL_QUALITY: SignalQualityMetrics = {
  winRatePct: null,
  riskRewardRatio: null,
};

type StreamTrendView = {
  analysis: SymbolAnalysis | null;
  signal: StreamSignalKind;
  cycleId: string | null;
  tradingCategory: TradingCategory | null;
  /** Open-cycle trend mode from entry-time short/long trend snapshots. */
  trendMode: SignalTrendMode | null;
  unrealizedPnlPct: number | null;
  shortTrend: TrendKind;
  longTrend: TrendKind;
  point: number | null;
  quality: SignalQualitySet;
  /** 시그널(사이클) 발생 시점부터 경과한 시간(초). 활성 시그널이 없으면 null. */
  elapsedSec: number | null;
};

type CombinedTrendViewRow = {
  symbol: string;
  analysis: SymbolAnalysis;
  tradingCategory: TradingCategory | null;
  isStrategySubRow: boolean;
  pulse: StreamTrendView;
  wave: StreamTrendView;
  signalOpenCount: number;
  signalPoint: number;
  trendAdjustmentPoint: number;
  sortPoint: number;
};

type RankedTrendViewRow = {
  row: CombinedTrendViewRow;
  qualityMatched: boolean;
  winRatePct: number;
  riskRewardRatio: number;
};

type GroupedRankedTrendViewRow = RankedTrendViewRow & {
  isFirstInSymbolGroup: boolean;
  symbolGroupSize: number;
};

type TrendFrontCopy = {
  pageTitle: string;
  filterAria: string;
  streamLabel: string;
  sortLabel: string;
  sortScore: string;
  sortKairos: string;
  sortPullback: string;
  updatedPrefix: string;
  autoRefresh: string;
  headers: {
    symbol: string;
    change24h: string;
    kairos: string;
    volatility: string;
    shortTrend: string;
    longTrend: string;
    trendClass: string;
    confidence: string;
    pullback: string;
  };
  upgradeTitle: string;
  upgradeDescription: string;
  emptyRows: string;
  trendLabels: Record<TrendKind, string>;
  trendClassLabels: Record<TrendClass, string>;
  scoreSuffix: string;
  volatilityLevels: Record<VolatilityDot, string>;
  logicTitle: string;
  priorityTitle: string;
  rank1: string;
  rank2: string;
  rank3: string;
  priority1: string;
  priority2: string;
  priority3: string;
  metricTitle: string;
  metricHeaders: {
    metric: string;
    up: string;
    down: string;
    none: string;
  };
  metricRows: {
    shortTrend: string;
    longTrend: string;
    otherTrend: string;
  };
  formulaBonusLead: string;
  formulaBonusText: string;
  formulaTotal: string;
};

const TREND_FRONT_COPY: Record<TrendFrontLanguage, TrendFrontCopy> = {
  ko: {
    pageTitle: '추세보드',
    filterAria: '추세보드 필터',
    streamLabel: '스트림',
    sortLabel: '정렬',
    sortScore: '추세 신뢰점수 내림차순',
    sortKairos: '중요지표 내림차순',
    sortPullback: '눌림목지수 내림차순',
    updatedPrefix: '데이터 갱신',
    autoRefresh: '10초 자동 갱신',
    headers: {
      symbol: '종목',
      change24h: '24h%',
      kairos: 'KAIROS ★',
      volatility: '변동성',
      shortTrend: '단기추세선',
      longTrend: '장기추세선',
      trendClass: '추세 구분',
      confidence: '신뢰점수',
      pullback: '눌림목지수',
    },
    upgradeTitle: '업그레이드 필요',
    upgradeDescription:
      '무료 플랜은 종목 시장 데이터를 포함하지 않습니다. Pro로 업그레이드하면 추세 스캐너 행을 볼 수 있습니다.',
    emptyRows: '표시할 종목이 없습니다',
    trendLabels: { up: '상승', down: '하락', none: '없음' },
    trendClassLabels: { trend: '추세', counter: '역추세', nontrend: '비추세' },
    scoreSuffix: '점',
    volatilityLevels: {
      1: '낮은 변동성',
      2: '보통 변동성',
      3: '높은 변동성',
    },
    logicTitle: '신뢰점수 산정 방식',
    priorityTitle: '추세 구분별 우선순위',
    rank1: '1순위',
    rank2: '2순위',
    rank3: '3순위',
    priority1: '단기·장기 방향 일치',
    priority2: '단기·장기 방향 불일치',
    priority3: '단기 또는 장기선 없음',
    metricTitle: '지표별 배점',
    metricHeaders: {
      metric: '지표 (변수값)',
      up: '상승',
      down: '하락',
      none: '없으면',
    },
    metricRows: {
      shortTrend: '단기추세 a',
      longTrend: '장기추세 b',
      otherTrend: '단기·장기가 아닌 추세',
    },
    formulaBonusLead: '가산점수 c = 3점',
    formulaBonusText: 'a·b의 방향성이 2개 동시에 맞으면 부여 (총 9점)',
    formulaTotal: '총점수 = a + b + c',
  },
  en: {
    pageTitle: 'Trend Board',
    filterAria: 'Trend board filters',
    streamLabel: 'Stream',
    sortLabel: 'Sort',
    sortScore: 'Trend trust score descending',
    sortKairos: 'Key metrics descending',
    sortPullback: 'Pullback index descending',
    updatedPrefix: 'Last updated',
    autoRefresh: '10s auto refresh',
    headers: {
      symbol: 'Symbol',
      change24h: '24h%',
      kairos: 'KAIROS ★',
      volatility: 'Volatility',
      shortTrend: 'Short trend',
      longTrend: 'Long trend',
      trendClass: 'Trend type',
      confidence: 'Trust score',
      pullback: 'Pullback index',
    },
    upgradeTitle: 'Upgrade required',
    upgradeDescription:
      'Free plan does not include symbol market data. Choose Pro to view trend scanner rows.',
    emptyRows: 'No symbols to display',
    trendLabels: { up: 'Up', down: 'Down', none: 'None' },
    trendClassLabels: { trend: 'Trend', counter: 'Counter', nontrend: 'Non-trend' },
    scoreSuffix: ' pts',
    volatilityLevels: {
      1: 'Low volatility',
      2: 'Medium volatility',
      3: 'High volatility',
    },
    logicTitle: 'Trust Score Logic',
    priorityTitle: 'Trend Type Priority',
    rank1: 'Rank 1',
    rank2: 'Rank 2',
    rank3: 'Rank 3',
    priority1: 'Short and long directions aligned',
    priority2: 'Short and long directions diverge',
    priority3: 'Short or long trend line missing',
    metricTitle: 'Metric Scoring',
    metricHeaders: {
      metric: 'Metric (variable)',
      up: 'Up',
      down: 'Down',
      none: 'Missing',
    },
    metricRows: {
      shortTrend: 'Short trend a',
      longTrend: 'Long trend b',
      otherTrend: 'Other trend signal',
    },
    formulaBonusLead: 'Bonus score c = 3 pts',
    formulaBonusText: 'applied when a and b align in the same direction (total 9 pts)',
    formulaTotal: 'Total score = a + b + c',
  },
};

function baseSymbol(symbol: string): string {
  return symbol.replace(/USDT$/u, '');
}

function symbolPairLabel(symbol: string): string {
  const base = baseSymbol(symbol);
  return symbol.endsWith('USDT') ? `${base}/USDT` : symbol;
}

function SortableTrendSymbolHeader({
  label,
  count,
  direction,
  onClick,
}: {
  label: string;
  count: number;
  direction: SymbolSortDirection;
  onClick: () => void;
}) {
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      className="trend-front-sortable-head"
      onClick={onClick}
      aria-label={`${label} sort`}
    >
      <span>
        {label}({count})
      </span>
      <Icon className={!direction ? 'trend-front-sortable-head-muted' : undefined} aria-hidden />
    </button>
  );
}

function formatPrice(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return '-';
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return `$${price.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
}

function signalKindFromSide(side: string | null | undefined): StreamSignalKind {
  const normalized = side?.toUpperCase();
  if (normalized === 'LONG') return 'long';
  if (normalized === 'SHORT') return 'short';
  return 'none';
}

function signalKindFromCycle(cycle: SignalCycle | null): StreamSignalKind {
  if (!cycle?.is_open) return 'none';
  return signalKindFromSide(cycle.side);
}

function signalKindFromAnalysis(row: SymbolAnalysis): StreamSignalKind {
  if (row.signal.state !== 'LIVE') return 'none';
  return signalKindFromSide(row.signal.direction);
}

function streamSignalLabel(kind: StreamSignalKind, language: TrendFrontLanguage): string {
  if (kind === 'long') return language === 'en' ? 'Buy' : '매수';
  if (kind === 'short') return language === 'en' ? 'Sell' : '매도';
  return language === 'en' ? 'No signal' : '신호없음';
}

function formatUnrealizedPnlPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function streamUnrealizedPnlPrefix(signal: StreamSignalKind, language: TrendFrontLanguage): string {
  return signal !== 'none'
    ? streamSignalLabel(signal, language)
    : language === 'en'
      ? 'P&L'
      : '평가';
}

function streamUnrealizedPnlTitle(
  value: number,
  signal: StreamSignalKind,
  language: TrendFrontLanguage
): string {
  const label = language === 'en' ? 'Unrealized P&L' : '평가손익';
  const direction = signal === 'long' ? 'LONG' : signal === 'short' ? 'SHORT' : '';
  return `${label}${direction ? ` · ${direction}` : ''} ${formatUnrealizedPnlPct(value)}`;
}

function unrealizedPnlTextClass(value: number): string {
  if (value > 0) return 'trend-front-signal-pnl-text-up';
  if (value < 0) return 'trend-front-signal-pnl-text-down';
  return 'trend-front-signal-pnl-text-flat';
}

function formatWinRatePct(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(0)}%`;
}

function formatRiskRewardRatio(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '-' : `${value.toFixed(1)}x`;
}

function SignalQualityMini({
  quality,
  className,
}: {
  quality: SignalQualityMetrics;
  className?: string;
}) {
  return (
    <span className={cn('trend-front-signal-quality', className)}>
      <span>
        WR<b>{formatWinRatePct(quality.winRatePct)}</b>
      </span>
      <span>
        R/R<b>{formatRiskRewardRatio(quality.riskRewardRatio)}</b>
      </span>
    </span>
  );
}

function StreamSignalBadge({
  view,
  language,
  quality,
  onClick,
  muted = false,
}: {
  view: StreamTrendView;
  language: TrendFrontLanguage;
  quality?: SignalQualityMetrics;
  onClick: () => void;
  /** 상단 필터(전략/추세 여부)와 일치하지 않는 스트림 신호를 흐리게 표시한다. */
  muted?: boolean;
}) {
  const hasQualityBadge = quality != null;
  const qualityBadge = hasQualityBadge ? <SignalQualityMini quality={quality} /> : null;

  if (view.unrealizedPnlPct != null) {
    const pnlText = formatUnrealizedPnlPct(view.unrealizedPnlPct);

    return (
      <button
        type="button"
        className={cn(
          'trend-front-signal trend-front-signal-pnl trend-front-signal-pnl-up',
          !hasQualityBadge && 'trend-front-signal-no-quality',
          muted && 'opacity-35 grayscale'
        )}
        title={streamUnrealizedPnlTitle(view.unrealizedPnlPct, view.signal, language)}
        onClick={onClick}
      >
        <span className="trend-front-signal-main">
          <span className="trend-front-signal-pnl-label">
            {streamUnrealizedPnlPrefix(view.signal, language)}
          </span>
          <span className={unrealizedPnlTextClass(view.unrealizedPnlPct)}>{pnlText}</span>
        </span>
        {qualityBadge}
      </button>
    );
  }

  const signalLabel = streamSignalLabel(view.signal, language);
  return (
    <button
      type="button"
      className={cn(
        'trend-front-signal',
        `trend-front-signal-${view.signal}`,
        !hasQualityBadge && 'trend-front-signal-no-quality',
        muted && 'opacity-35 grayscale'
      )}
      onClick={onClick}
    >
      <span className="trend-front-signal-main">{signalLabel}</span>
      {qualityBadge}
    </button>
  );
}

function trendValueLabel(kind: TrendKind, language: TrendFrontLanguage): string {
  if (kind === 'up') return language === 'en' ? 'Up' : '상승';
  if (kind === 'down') return language === 'en' ? 'Down' : '하락';
  return language === 'en' ? 'None' : '없음';
}

function formatElapsed(seconds: number | null, language: TrendFrontLanguage): string {
  if (seconds == null) return '—';
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (language === 'en') {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  return `${minutes}분`;
}

function trendTableHeader(
  key:
    | 'symbol'
    | 'strategy'
    | 'pulse'
    | 'pulseElapsed'
    | 'wave'
    | 'waveElapsed'
    | 'pulseShortTrend'
    | 'pulseLongTrend'
    | 'waveShortTrend'
    | 'waveLongTrend'
    | 'point',
  language: TrendFrontLanguage
): string {
  if (language === 'en') {
    if (key === 'symbol') return 'Symbol';
    if (key === 'strategy') return 'Strategy';
    if (key === 'pulse') return 'Pulse';
    if (key === 'pulseElapsed') return 'Pulse Elapsed';
    if (key === 'wave') return 'Wave';
    if (key === 'waveElapsed') return 'Wave Elapsed';
    if (key === 'pulseShortTrend') return 'Pulse Short trend';
    if (key === 'pulseLongTrend') return 'Pulse Long trend';
    if (key === 'waveShortTrend') return 'Wave Short trend';
    if (key === 'waveLongTrend') return 'Wave Long trend';
    return 'Point';
  }

  if (key === 'symbol') return '종목';
  if (key === 'strategy') return '전략';
  if (key === 'pulse') return '펄스';
  if (key === 'pulseElapsed') return '펄스 경과시간';
  if (key === 'wave') return '웨이브';
  if (key === 'waveElapsed') return '웨이브 경과시간';
  if (key === 'pulseShortTrend') return '펄스 단기 추세';
  if (key === 'pulseLongTrend') return '펄스 장기 추세';
  if (key === 'waveShortTrend') return '웨이브 단기 추세';
  if (key === 'waveLongTrend') return '웨이브 장기 추세';
  return '추세점수';
}

function streamEngineToBarInterval(engine: TrendEngine): '1m' | '10m' {
  return engine === 'pulse' ? '1m' : '10m';
}

function resolveStreamSignal(
  symbol: string,
  row: SymbolAnalysis | null,
  targetEngine: TrendEngine,
  useMock: boolean,
  openCycle?: SignalCycle | null
): StreamSignalKind {
  if (useMock) {
    return row ? signalKindFromAnalysis(row) : 'none';
  }

  if (openCycle !== undefined) {
    return signalKindFromCycle(openCycle);
  }

  return signalKindFromCycle(
    useSymbolStore.getState().getSignalCycle(symbol, streamEngineToBarInterval(targetEngine))
  );
}

function resolveOpenSignalCycles(symbol: string, targetEngine: TrendEngine): SignalCycle[] {
  return useSymbolStore
    .getState()
    .getSignalCycles(symbol, streamEngineToBarInterval(targetEngine))
    .filter((cycle) => cycle.is_open);
}

function positiveFinite(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

const RELIABILITY_SIGNAL_QUALITY: Record<'A' | 'B+' | 'C', SignalQualityMetrics> = {
  A: { winRatePct: 74, riskRewardRatio: 2.4 },
  'B+': { winRatePct: 66, riskRewardRatio: 1.9 },
  C: { winRatePct: 58, riskRewardRatio: 1.4 },
};

function finiteMetric(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function firstFiniteMetric(values: unknown[]): number | null {
  for (const value of values) {
    const parsed = finiteMetric(value);
    if (parsed != null) return parsed;
  }
  return null;
}

function normalizeWinRatePct(value: number | null): number | null {
  if (value == null) return null;
  const pct = value <= 1 ? value * 100 : value;
  return Math.min(100, Math.max(0, pct));
}

function normalizeRiskRewardRatio(value: number | null): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function strategyWinRateFallback(
  engine: TrendEngine,
  category: TradingCategory | null,
  period: TrendQualityPeriod
): number | null {
  if (!category) return null;
  const strategy = TRADING_CATEGORY_TO_STRATEGY[category];

  if (period === 'all') {
    return PULSE_MOCK_STRATEGY_STATS_LIST.find((item) => item.id === strategy)?.winRate ?? null;
  }

  return PULSE_MOCK_STATS_30D_BY_STRATEGY[engine][strategy]?.winRate ?? null;
}

function riskRewardRatioForTradingCategory(category: TradingCategory | null): number | null {
  if (!category) return null;
  const strategy = TRADING_CATEGORY_TO_STRATEGY[category];
  const stats = PULSE_MOCK_STATS_7D[strategy];
  return normalizeRiskRewardRatio(stats.avgReturn / Math.abs(stats.avgLoss));
}

function fallbackSignalQuality(
  engine: TrendEngine,
  tradingCategory: TradingCategory | null,
  row: SymbolAnalysis | null,
  period: TrendQualityPeriod
): SignalQualityMetrics {
  const strategyWinRatePct = strategyWinRateFallback(engine, tradingCategory, period);
  const reliability = row?.signal.reliability;
  const reliabilityQuality =
    reliability === 'A' || reliability === 'B+' || reliability === 'C'
      ? RELIABILITY_SIGNAL_QUALITY[reliability]
      : null;

  return {
    winRatePct: normalizeWinRatePct(
      strategyWinRatePct ??
        reliabilityQuality?.winRatePct ??
        PULSE_MOCK_STATS_30D_BY_STREAM[engine].winRate
    ),
    riskRewardRatio:
      riskRewardRatioForTradingCategory(tradingCategory) ??
      reliabilityQuality?.riskRewardRatio ??
      (engine === 'pulse' ? 1.8 : 2),
  };
}

function cycleWinRateForPeriod(
  openCycle: SignalCycle | null,
  period: TrendQualityPeriod
): number | null {
  if (period === 'last30d') {
    return firstFiniteMetric([
      openCycle?.win_rate_30d,
      openCycle?.expected_win_rate_pct,
      openCycle?.win_rate_pct,
      openCycle?.win_rate,
    ]);
  }

  return firstFiniteMetric([
    openCycle?.win_rate_all,
    openCycle?.expected_win_rate_pct,
    openCycle?.win_rate_pct,
    openCycle?.win_rate,
  ]);
}

function cycleRiskRewardRatioForPeriod(
  openCycle: SignalCycle | null,
  period: TrendQualityPeriod
): number | null {
  if (period === 'last30d') {
    return firstFiniteMetric([openCycle?.risk_reward_ratio_30d, openCycle?.risk_reward_ratio]);
  }

  return firstFiniteMetric([openCycle?.risk_reward_ratio_all, openCycle?.risk_reward_ratio]);
}

function resolveStreamQualityForPeriod(
  openCycle: SignalCycle | null,
  row: SymbolAnalysis | null,
  engine: TrendEngine,
  tradingCategory: TradingCategory | null,
  period: TrendQualityPeriod
): SignalQualityMetrics {
  if (!openCycle?.is_open) {
    return {
      winRatePct: null,
      riskRewardRatio: null,
    };
  }

  const fallback = fallbackSignalQuality(engine, tradingCategory, row, period);
  return {
    winRatePct:
      normalizeWinRatePct(cycleWinRateForPeriod(openCycle, period)) ?? fallback.winRatePct,
    riskRewardRatio:
      normalizeRiskRewardRatio(cycleRiskRewardRatioForPeriod(openCycle, period)) ??
      fallback.riskRewardRatio,
    source: 'open',
  };
}

function resolveStreamQuality(
  openCycle: SignalCycle | null,
  row: SymbolAnalysis | null,
  engine: TrendEngine,
  tradingCategory: TradingCategory | null
): SignalQualitySet {
  return {
    last30d: resolveStreamQualityForPeriod(openCycle, row, engine, tradingCategory, 'last30d'),
    all: resolveStreamQualityForPeriod(openCycle, row, engine, tradingCategory, 'all'),
  };
}

function resolveCurrentPrice(symbol: string, row: SymbolAnalysis | null): number | null {
  return positiveFinite(useSymbolStore.getState().getPrice(symbol)) ?? positiveFinite(row?.price);
}

function calculateUnrealizedPnlPct(
  cycle: SignalCycle | null,
  currentPrice: number | null
): number | null {
  if (!cycle?.is_open) return null;

  const entryPrice = positiveFinite(cycle.entry_price);
  const side = cycle.side?.toUpperCase();

  if (entryPrice == null || currentPrice == null) return null;
  if (side === 'LONG') return ((currentPrice - entryPrice) / entryPrice) * 100;
  if (side === 'SHORT') return ((entryPrice - currentPrice) / entryPrice) * 100;

  return null;
}

function resolveStreamTrendMode(cycle: SignalCycle | null): SignalTrendMode | null {
  if (!cycle?.is_open) return null;
  return resolveSignalTrendModeFromEntryTrends({
    direction: cycle.side,
    shortTrend: cycle.entry_trend_short,
    longTrend: cycle.entry_trend_long,
  });
}

function buildStreamTrendView(
  symbol: string,
  row: SymbolAnalysis | null,
  engine: TrendEngine,
  useMock: boolean,
  openCycleOverride?: SignalCycle | null,
  tradingCategoryOverride?: TradingCategory | null
): StreamTrendView {
  const shortTrend = row ? trendKind(row.shortTermTrend.scale) : 'none';
  const longTrend = row ? trendKind(row.longTermTrend.scale) : 'none';
  const openCycle = useMock
    ? null
    : openCycleOverride === undefined
      ? (resolveOpenSignalCycles(symbol, engine)[0] ?? null)
      : openCycleOverride;
  const signal = resolveStreamSignal(symbol, row, engine, useMock, openCycle);
  const tradingCategory = openCycle?.trading_category ?? tradingCategoryOverride ?? null;
  const unrealizedPnlPct = calculateUnrealizedPnlPct(openCycle, resolveCurrentPrice(symbol, row));
  const elapsedSec = openCycle
    ? Math.max(0, Math.floor((Date.now() - new Date(openCycle.created_at).getTime()) / 1000))
    : null;

  return {
    analysis: row,
    signal,
    cycleId: openCycle?.id ?? null,
    tradingCategory,
    trendMode: resolveStreamTrendMode(openCycle),
    unrealizedPnlPct,
    shortTrend,
    longTrend,
    point: row ? trendBaseScore(shortTrend, longTrend) : null,
    quality: resolveStreamQuality(openCycle, row, engine, tradingCategory),
    elapsedSec,
  };
}

function scoreClass(score: number): string {
  if (score >= 24) return 'trend-front-s9';
  if (score >= 12) return 'trend-front-s6';
  return 'trend-front-s3';
}

function formatScore(score: number, copy: TrendFrontCopy): string {
  return `${score}${copy.scoreSuffix}`;
}

function trendFrontLanguage(language: string | undefined): TrendFrontLanguage {
  return language?.toLowerCase().startsWith('en') ? 'en' : 'ko';
}

function chartPathForEngine(
  engine: TrendEngine,
  symbol: string,
  tradingCategory?: TradingCategory | null
): string {
  const base = engine === 'wave' ? '/chart10m' : '/chart1m';
  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() });
  if (tradingCategory) params.set('tradingCategory', tradingCategory);
  return `${base}?${params.toString()}`;
}

/** 종목 클릭 시 어느 엔진(펄스/웨이브) 차트로 보낼지 정한다 — 열린 시그널이 있는 쪽을 우선하고, 없으면 펄스로 기본. */
function chartEngineForRow(row: CombinedTrendViewRow): TrendEngine {
  const pulseOpen = row.pulse.signal !== 'none';
  const waveOpen = row.wave.signal !== 'none';
  if (waveOpen && !pulseOpen) return 'wave';
  return 'pulse';
}

function signalBoardPathForEngine(
  engine: TrendEngine,
  tradingCategory: TradingCategory | null
): string {
  const params = new URLSearchParams();
  params.set('stream', engine);

  if (tradingCategory) {
    params.set('strategy', TRADING_CATEGORY_TO_STRATEGY[tradingCategory]);
  }

  return `/signals?${params.toString()}`;
}

function ScoreLogicSection({ language }: { language: TrendFrontLanguage }) {
  const copy =
    language === 'en'
      ? {
          title: 'Score Calculation Logic',
          trendTitle: 'Trend Points',
          metric: 'Category / Metric',
          up: 'Up',
          down: 'Down',
          none: 'Missing',
          shortTrend: 'Short-term trend (a)',
          longTrend: 'Long-term trend (b)',
          bothMissing: 'Short and long trends both missing',
          signalTitle: 'Signals and Bonus',
          pulseOpen: 'Pulse open signal (c)',
          waveOpen: 'Wave open signal (d)',
          signalBonus: 'Bonus point (6 pts)',
          signalBonusDesc: 'Pulse and Wave are both open at the same time.',
          trendBonus: 'Bonus point (3 pts)',
          trendBonusDesc: 'a and b trend directions match the Buy/Sell (Long/Short) direction.',
          trendPenalty: 'Penalty (-6 pts)',
          trendPenaltyDesc:
            'a and b have the same direction, but that direction conflicts with Buy/Sell (Long/Short).',
          finalTitle: 'Final Score',
          totalScore: 'Total score',
          formula: 'Pulse trend + Wave trend + c + d + bonus/penalty points',
          zero: '0 pts',
          three: '3 pts',
          four: '4 pts',
        }
      : {
          title: '점수 계산 로직',
          trendTitle: '추세 점수',
          metric: '분류 / 지표',
          up: '상승',
          down: '하락',
          none: '없음',
          shortTrend: '단기 추세 (a)',
          longTrend: '장기 추세 (b)',
          bothMissing: '단기·장기 추세 모두 없음',
          signalTitle: '신호 및 보너스',
          pulseOpen: '펄스 신호 발생 (c)',
          waveOpen: '웨이브 신호 발생 (d)',
          signalBonus: '보너스 점수 (6점)',
          signalBonusDesc: '펄스와 웨이브가 동시에 발생',
          trendBonus: '보너스 점수 (3점)',
          trendBonusDesc: 'a와 b 추세 방향이 Buy/Sell(Long/Short) 방향과 일치',
          trendPenalty: '패널티 (-6점)',
          trendPenaltyDesc: 'a와 b 추세 방향이 같지만 Buy/Sell(Long/Short) 방향과 충돌',
          finalTitle: '최종 점수',
          totalScore: '총점수',
          formula: '펄스 추세 + 웨이브 추세 + c + d + 보너스/패널티 점수',
          zero: '0점',
          three: '3점',
          four: '4점',
        };

  return (
    <section className="trend-front-sec" aria-label={copy.title}>
      <h2 className="trend-front-sec-h">{copy.title}</h2>
      <div className="trend-front-scorelogic-grid">
        <div className="trend-front-scorelogic-panel">
          <h3 className="trend-front-card-h">{copy.trendTitle}</h3>
          <table className="trend-front-mini-tbl">
            <thead>
              <tr>
                <th>{copy.metric}</th>
                <th>{copy.up}</th>
                <th>{copy.down}</th>
                <th>{copy.none}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{copy.shortTrend}</td>
                <td>{copy.three}</td>
                <td>{copy.three}</td>
                <td>{copy.zero}</td>
              </tr>
              <tr>
                <td>{copy.longTrend}</td>
                <td>{copy.three}</td>
                <td>{copy.three}</td>
                <td>{copy.zero}</td>
              </tr>
              <tr>
                <td>{copy.bothMissing}</td>
                <td>{copy.zero}</td>
                <td>{copy.zero}</td>
                <td>{copy.zero}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="trend-front-scorelogic-panel trend-front-scorelogic-panel-wide">
          <h3 className="trend-front-card-h">{copy.signalTitle}</h3>
          <table className="trend-front-mini-tbl">
            <tbody>
              <tr>
                <th>{copy.pulseOpen}</th>
                <td>{copy.four}</td>
              </tr>
              <tr>
                <th>{copy.waveOpen}</th>
                <td>{copy.four}</td>
              </tr>
              <tr>
                <th>{copy.signalBonus}</th>
                <td>{copy.signalBonusDesc}</td>
              </tr>
              <tr>
                <th>{copy.trendBonus}</th>
                <td>{copy.trendBonusDesc}</td>
              </tr>
              <tr>
                <th>{copy.trendPenalty}</th>
                <td>{copy.trendPenaltyDesc}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="trend-front-formula">
        <b>{copy.finalTitle}</b>
        <span>
          {copy.totalScore}: {copy.formula}
        </span>
      </div>
    </section>
  );
}

function SortPrioritySection({ language }: { language: TrendFrontLanguage }) {
  const copy =
    language === 'en'
      ? {
          title: 'Sort Priority',
          rank: 'Rank',
          rule: 'Rule',
          rank1: '1st',
          rank2: '2nd',
          rank3: '3rd',
          rule1: 'Pulse and Wave are both open',
          rule2: 'Either Pulse or Wave is open',
          rule3: 'Score descending',
        }
      : {
          title: '정렬 기준',
          rank: '순위',
          rule: '기준',
          rank1: '1순위',
          rank2: '2순위',
          rank3: '3순위',
          rule1: '펄스와 웨이브가 모두 발생',
          rule2: '펄스 또는 웨이브 중 하나가 발생',
          rule3: '점수 내림차순',
        };

  return (
    <section className="trend-front-sort-priority" aria-label={copy.title}>
      <h2 className="trend-front-sec-h">{copy.title}</h2>
      <table className="trend-front-mini-tbl">
        <thead>
          <tr>
            <th>{copy.rank}</th>
            <th>{copy.rule}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{copy.rank1}</td>
            <td>{copy.rule1}</td>
          </tr>
          <tr>
            <td>{copy.rank2}</td>
            <td>{copy.rule2}</td>
          </tr>
          <tr>
            <td>{copy.rank3}</td>
            <td>{copy.rule3}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function trendQualityCopy(language: TrendFrontLanguage) {
  return language === 'en'
    ? {
        title: 'Signal Quality Filter',
        winRate: 'Win Rate',
        riskReward: 'Risk/Reward Ratio',
        periodGroup: 'Stats period',
        last30d: 'Last 30day',
        all: 'All',
      }
    : {
        title: '승률/손익비 필터',
        winRate: '승률',
        riskReward: '손익비',
        periodGroup: '통계 기간',
        last30d: '30일',
        all: '전체',
      };
}

function trendBoardFilterCopy(language: TrendFrontLanguage) {
  return language === 'en'
    ? {
        title: 'Trend board filters',
        favorites: 'Favorites',
        strategy: 'Strategy',
        mode: 'Trend',
        day: 'Day',
      }
    : {
        title: '추세보드 필터',
        favorites: '즐겨찾기',
        strategy: '전략',
        mode: '추세',
        day: '기간',
      };
}

function TrendQualitySlider({
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <label className="trend-front-quality-control">
      <span className="trend-front-quality-control-head">
        <span>{label}</span>
        <b>{valueLabel}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="trend-front-quality-range"
        style={{
          background: `linear-gradient(90deg, var(--tf-gold) ${progress}%, var(--tf-field) ${progress}%)`,
        }}
      />
    </label>
  );
}

function TrendBoardFilterPanel({
  language,
  winRateThreshold,
  riskRewardThreshold,
  period,
  favoriteSymbols,
  tradingCategoryFilters,
  trendModeFilter,
  onWinRateChange,
  onRiskRewardChange,
  onPeriodChange,
  onToggleTradingCategory,
  onToggleTrendMode,
}: {
  language: TrendFrontLanguage;
  winRateThreshold: number;
  riskRewardThreshold: number;
  period: TrendQualityPeriod;
  favoriteSymbols: readonly string[];
  tradingCategoryFilters: readonly TradingCategory[];
  trendModeFilter: SignalTrendModeFilter;
  onWinRateChange: (value: number) => void;
  onRiskRewardChange: (value: number) => void;
  onPeriodChange: (value: TrendQualityPeriod) => void;
  onToggleTradingCategory: (category: TradingCategory) => void;
  onToggleTrendMode: (mode: keyof SignalTrendModeFilter) => void;
}) {
  const qualityCopy = trendQualityCopy(language);
  const filterCopy = trendBoardFilterCopy(language);
  const trendLabels = trendFilterLabels(language);

  return (
    <section className="trend-front-filter-panel" aria-label={filterCopy.title}>
      <div className="trend-front-filter-row trend-front-filter-row-primary">
        <TrendQualitySlider
          label={qualityCopy.winRate}
          value={winRateThreshold}
          min={0}
          max={100}
          step={1}
          valueLabel={formatWinRatePct(winRateThreshold)}
          onChange={onWinRateChange}
        />
        <TrendQualitySlider
          label={qualityCopy.riskReward}
          value={riskRewardThreshold}
          min={0}
          max={5}
          step={0.1}
          valueLabel={formatRiskRewardRatio(riskRewardThreshold)}
          onChange={onRiskRewardChange}
        />
      </div>

      <div className="trend-front-filter-row trend-front-filter-row-secondary">
        <div className="trend-front-control-group" role="group" aria-label={filterCopy.favorites}>
          <span className="trend-front-lab">{filterCopy.favorites}</span>
          <FavoriteScopeControls
            symbols={favoriteSymbols}
            className="trend-front-favorite-control"
          />
        </div>

        <div className="trend-front-control-group" role="group" aria-label={filterCopy.strategy}>
          <span className="trend-front-lab">{filterCopy.strategy}</span>
          {TRADING_CATEGORY_ORDER.map((category) => {
            const on = tradingCategoryFilters.includes(category);
            const config = strategyConfigForCategory(category);
            return (
              <button
                key={category}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggleTradingCategory(category)}
                className={cn('trend-front-filter-chip', on && 'trend-front-filter-chip-on')}
              >
                <span className="trend-front-filter-check" aria-hidden>
                  {on ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                </span>
                <span className="font-mono">{category}</span>
                {config ? (
                  <span
                    className="trend-front-strategy-dot"
                    style={{ backgroundColor: config.color }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="trend-front-control-group" role="group" aria-label={filterCopy.mode}>
          <span className="trend-front-lab">{filterCopy.mode}</span>
          {SIGNAL_TREND_MODES.map((mode) => {
            const on = trendModeFilter[mode];
            return (
              <button
                key={mode}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onToggleTrendMode(mode)}
                className={cn('trend-front-filter-chip', on && 'trend-front-filter-chip-on')}
              >
                <span className="trend-front-filter-check" aria-hidden>
                  {on ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                </span>
                <span>{trendLabels[mode]}</span>
              </button>
            );
          })}
        </div>

        <div
          className="trend-front-control-group"
          role="group"
          aria-label={qualityCopy.periodGroup}
        >
          <span className="trend-front-lab">{filterCopy.day}</span>
          {(['last30d', 'all'] as const).map((value) => {
            const checked = period === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={checked}
                onClick={() => onPeriodChange(value)}
                className={cn('trend-front-filter-chip', checked && 'trend-front-filter-chip-on')}
              >
                <span className="trend-front-filter-check" aria-hidden>
                  {checked ? <Check className="h-3 w-3 stroke-[3]" /> : null}
                </span>
                <span>{value === 'last30d' ? qualityCopy.last30d : qualityCopy.all}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type TrendBoardQualityFilterContext = {
  tradingCategoryFilters: readonly TradingCategory[];
  trendModeFilter: SignalTrendModeFilter;
  historicalQuality: TrendBoardHistoricalQualityLookup;
};

type CompleteSignalQuality = SignalQualityMetrics & {
  winRatePct: number;
  riskRewardRatio: number;
};

function isCompleteSignalQuality(
  quality: SignalQualityMetrics | null | undefined
): quality is CompleteSignalQuality {
  return quality?.winRatePct != null && quality.riskRewardRatio != null;
}

function isAllTradingCategoriesSelected(filters: readonly TradingCategory[]): boolean {
  return filters.length === TRADING_CATEGORY_ORDER.length;
}

function categoryMatchesTrendBoardFilters(
  category: TradingCategory | null,
  filters: readonly TradingCategory[]
): boolean {
  if (category == null) return true;
  if (isAllTradingCategoriesSelected(filters)) return true;
  return filters.includes(category);
}

function trendModeForView(view: StreamTrendView): SignalTrendMode | null {
  return view.trendMode;
}

function trendModeMatchesFilter(view: StreamTrendView, filter: SignalTrendModeFilter): boolean {
  const mode = trendModeForView(view);
  return mode == null ? true : filter[mode];
}

function bestSignalQuality(
  qualities: readonly SignalQualityMetrics[]
): CompleteSignalQuality | null {
  return (
    [...qualities].filter(isCompleteSignalQuality).sort((a, b) => {
      const winRateDelta = b.winRatePct - a.winRatePct;
      if (winRateDelta !== 0) return winRateDelta;
      return b.riskRewardRatio - a.riskRewardRatio;
    })[0] ?? null
  );
}

function filteredHistoricalCategories(
  row: CombinedTrendViewRow,
  engine: TrendEngine,
  filters: readonly TradingCategory[]
): TradingCategory[] {
  const category = row.tradingCategory ?? row[engine].tradingCategory;
  if (category) {
    return categoryMatchesTrendBoardFilters(category, filters) ? [category] : [];
  }

  if (isAllTradingCategoriesSelected(filters)) {
    return TRADING_CATEGORY_ORDER;
  }

  return TRADING_CATEGORY_ORDER.filter((item) => filters.includes(item));
}

function filteredHistoricalTrendModes(
  filter: SignalTrendModeFilter
): TrendBoardHistoricalTrendMode[] {
  const modes: TrendBoardHistoricalTrendMode[] = [];
  if (filter.trend) modes.push('trend');
  if (filter.nonTrend) modes.push('nonTrend');
  if (filter.reversal) modes.push('reversal');
  return modes;
}

function combineHistoricalQualityStats(
  stats: readonly TrendBoardHistoricalQualityStat[]
): SignalQualityMetrics | undefined {
  const sampleSize = stats.reduce((sum, item) => sum + item.sampleSize, 0);
  if (sampleSize <= 0) return undefined;

  const winCount = stats.reduce((sum, item) => sum + item.winCount, 0);
  const lossCount = stats.reduce((sum, item) => sum + item.lossCount, 0);
  const winPnlSum = stats.reduce((sum, item) => sum + item.winPnlSum, 0);
  const lossPnlAbsSum = stats.reduce((sum, item) => sum + item.lossPnlAbsSum, 0);
  const avgWin = winCount > 0 ? winPnlSum / winCount : null;
  const avgLoss = lossCount > 0 ? lossPnlAbsSum / lossCount : null;
  const riskRewardRatio =
    avgWin != null && avgLoss != null && avgLoss > 0 ? avgWin / avgLoss : null;

  return {
    winRatePct: normalizeWinRatePct((winCount / sampleSize) * 100),
    riskRewardRatio: normalizeRiskRewardRatio(riskRewardRatio),
    source: 'history',
    sampleSize,
  };
}

function historicalQualityForView(
  row: CombinedTrendViewRow,
  engine: TrendEngine,
  period: TrendQualityPeriod,
  context: TrendBoardQualityFilterContext
): SignalQualityMetrics | undefined {
  const categories = filteredHistoricalCategories(row, engine, context.tradingCategoryFilters);
  const trendModes = filteredHistoricalTrendModes(context.trendModeFilter);
  if (categories.length === 0 || trendModes.length === 0) return undefined;

  const stats: TrendBoardHistoricalQualityStat[] = [];
  for (const category of categories) {
    for (const trendMode of trendModes) {
      const stat = context.historicalQuality.get(
        trendBoardHistoricalQualityKey(row.symbol, engine, category, trendMode, period)
      );
      if (stat) stats.push(stat);
    }
  }

  return combineHistoricalQualityStats(stats);
}

function displayQualityForView(
  row: CombinedTrendViewRow,
  engine: TrendEngine,
  period: TrendQualityPeriod,
  context: TrendBoardQualityFilterContext
): SignalQualityMetrics | undefined {
  const view = row[engine];
  if (view.signal === 'none') {
    return historicalQualityForView(row, engine, period, context) ?? EMPTY_SIGNAL_QUALITY;
  }
  return view.quality[period];
}

function streamMutedByFilters(
  row: CombinedTrendViewRow,
  engine: TrendEngine,
  context: TrendBoardQualityFilterContext
): boolean {
  const view = row[engine];
  if (
    !categoryMatchesTrendBoardFilters(
      row.tradingCategory ?? view.tradingCategory,
      context.tradingCategoryFilters
    )
  ) {
    return true;
  }
  if (view.signal === 'none') return false;
  return !trendModeMatchesFilter(view, context.trendModeFilter);
}

function qualityMetricsForView(
  row: CombinedTrendViewRow,
  engine: TrendEngine,
  period: TrendQualityPeriod,
  context: TrendBoardQualityFilterContext
): SignalQualityMetrics[] {
  const view = row[engine];

  if (view.signal === 'none') {
    const historicalQuality = historicalQualityForView(row, engine, period, context);
    return historicalQuality ? [historicalQuality] : [];
  }

  if (!categoryMatchesTrendBoardFilters(view.tradingCategory, context.tradingCategoryFilters)) {
    return [];
  }
  if (!trendModeMatchesFilter(view, context.trendModeFilter)) {
    return [];
  }

  return [view.quality[period]];
}

function qualityMatchesThreshold(
  quality: SignalQualityMetrics | null,
  winRateThreshold: number,
  riskRewardThreshold: number
): quality is SignalQualityMetrics & { winRatePct: number; riskRewardRatio: number } {
  return (
    isCompleteSignalQuality(quality) &&
    quality.winRatePct >= winRateThreshold &&
    quality.riskRewardRatio >= riskRewardThreshold
  );
}

function bestRowQuality(
  row: CombinedTrendViewRow,
  period: TrendQualityPeriod,
  winRateThreshold: number,
  riskRewardThreshold: number,
  context: TrendBoardQualityFilterContext
): Pick<RankedTrendViewRow, 'qualityMatched' | 'winRatePct' | 'riskRewardRatio'> {
  const qualities = (['pulse', 'wave'] as const).flatMap((engine) =>
    qualityMetricsForView(row, engine, period, context)
  );
  const matched = qualities.filter((quality) =>
    qualityMatchesThreshold(quality, winRateThreshold, riskRewardThreshold)
  );
  const candidates = matched.length > 0 ? matched : qualities;
  const best = bestSignalQuality(candidates);

  return {
    qualityMatched: matched.length > 0,
    winRatePct: best?.winRatePct ?? -1,
    riskRewardRatio: best?.riskRewardRatio ?? -1,
  };
}

const EMPTY_CONDITIONS = new Set<TrendConditionId>();
const EMPTY_FAVORITES = new Set<string>();
const DEFAULT_DIRECTION: TrendDirectionTab = 'all';
const BOARD_SORT: CompactTrendSort = 'rating';
// 승률/손익비 threshold + 통계 기간은 usePulseStore(qualityWinRateThreshold 등)에
// 저장된다 — /proof 페이지의 종목별 통계 필터와 값을 공유하기 위함(둘 다 같은
// localStorage 키 'trend-board:v8:quality-filters'를 그대로 사용).

function strategyConfigForCategory(category: TradingCategory | null) {
  if (!category) return null;
  const strategyId: StrategyId = TRADING_CATEGORY_TO_STRATEGY[category];
  return STRATEGY_CONFIGS.find((strategy) => strategy.id === strategyId) ?? null;
}

function strategyLabelForCategory(
  category: TradingCategory | null,
  language: TrendFrontLanguage
): string {
  const config = strategyConfigForCategory(category);
  if (!category || !config) return language === 'en' ? 'All' : '전체';
  return language === 'en' ? config.nameEn : config.name;
}

function strategyCellLabel(category: TradingCategory | null): string {
  return category ?? '-';
}

function strategyCellTitle(category: TradingCategory | null, language: TrendFrontLanguage): string {
  if (!category) {
    return '-';
  }
  return `${category} - ${strategyLabelForCategory(category, language)}`;
}

function strategyColorForCategory(category: TradingCategory | null): string | undefined {
  return strategyConfigForCategory(category)?.color;
}

function categorySortIndex(category: TradingCategory | null): number {
  if (category == null) return TRADING_CATEGORY_ORDER.length;
  const index = TRADING_CATEGORY_ORDER.indexOf(category);
  return index >= 0 ? index : TRADING_CATEGORY_ORDER.length;
}

function signalCycleCategory(cycle: SignalCycle): TradingCategory | null {
  return cycle.trading_category ?? null;
}

function trendBoardDisplayCategories(
  pulseCycles: readonly SignalCycle[],
  waveCycles: readonly SignalCycle[]
): Array<TradingCategory | null> {
  const hasUncategorizedSignal = [...pulseCycles, ...waveCycles].some(
    (cycle) => signalCycleCategory(cycle) == null
  );

  return hasUncategorizedSignal ? [...TRADING_CATEGORY_ORDER, null] : [...TRADING_CATEGORY_ORDER];
}

function signalCycleForCategory(
  cycles: readonly SignalCycle[],
  category: TradingCategory | null
): SignalCycle | null {
  return cycles.find((cycle) => signalCycleCategory(cycle) === category) ?? null;
}

function compareRankedTrendRows(a: RankedTrendViewRow, b: RankedTrendViewRow): number {
  if (a.qualityMatched !== b.qualityMatched) return a.qualityMatched ? -1 : 1;

  const pointDelta = b.row.sortPoint - a.row.sortPoint;
  if (pointDelta !== 0) return pointDelta;

  const signalDelta = b.row.signalOpenCount - a.row.signalOpenCount;
  if (signalDelta !== 0) return signalDelta;

  const winRateDelta = b.winRatePct - a.winRatePct;
  if (winRateDelta !== 0) return winRateDelta;

  const riskRewardDelta = b.riskRewardRatio - a.riskRewardRatio;
  if (riskRewardDelta !== 0) return riskRewardDelta;

  const symbolDelta = baseSymbol(a.row.symbol).localeCompare(baseSymbol(b.row.symbol));
  if (symbolDelta !== 0) return symbolDelta;

  return categorySortIndex(a.row.tradingCategory) - categorySortIndex(b.row.tradingCategory);
}

function groupRankedRowsBySymbol(
  rows: readonly RankedTrendViewRow[],
  symbolSortDirection: SymbolSortDirection = null
): GroupedRankedTrendViewRow[] {
  const groups = new Map<string, RankedTrendViewRow[]>();
  for (const ranked of rows) {
    const list = groups.get(ranked.row.symbol) ?? [];
    list.push(ranked);
    groups.set(ranked.row.symbol, list);
  }

  return [...groups.values()]
    .map((group) => [...group].sort(compareRankedTrendRows))
    .sort((a, b) => {
      const firstA = a[0];
      const firstB = b[0];
      if (!firstA || !firstB) return a.length - b.length;
      if (symbolSortDirection) {
        const symbolDelta = baseSymbol(firstA.row.symbol).localeCompare(
          baseSymbol(firstB.row.symbol)
        );
        if (symbolDelta !== 0) {
          return symbolSortDirection === 'asc' ? symbolDelta : -symbolDelta;
        }
      }
      return compareRankedTrendRows(firstA, firstB);
    })
    .flatMap((group) =>
      group.map((ranked, index) => ({
        ...ranked,
        isFirstInSymbolGroup: index === 0,
        symbolGroupSize: group.length,
      }))
    );
}

function trendFilterLabels(
  language: TrendFrontLanguage
): Record<keyof SignalTrendModeFilter, string> {
  return language === 'en'
    ? { trend: 'Trend', nonTrend: 'Non-Trend', reversal: 'Reversal' }
    : { trend: '추세', nonTrend: '비추세', reversal: '역추세' };
}

export function TrendV8PageContent({ useMock = false }: TrendV8PageContentProps) {
  const [renderTick, setRenderTick] = useState(() => Date.now());
  const [symbolSortDirection, setSymbolSortDirection] = useState<SymbolSortDirection>(null);
  const winRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const riskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const qualityPeriod = usePulseStore((state) => state.qualityPeriod);
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const activeLanguage = trendFrontLanguage(i18n.resolvedLanguage ?? i18n.language);
  const copy = TREND_FRONT_COPY[activeLanguage];
  const { subscription } = useAuth();
  const allowedSymbols = useMemo(() => getAllowedSymbols(subscription.plan), [subscription.plan]);
  const favoriteSymbols = useMemo(() => getSymbolsFromEnv(), []);
  const allowedSymbolSet = useMemo(() => new Set(allowedSymbols), [allowedSymbols]);

  const livePulseBoard = useTrendV8Board(
    'pulse',
    BOARD_SORT,
    DEFAULT_DIRECTION,
    EMPTY_CONDITIONS,
    EMPTY_FAVORITES,
    allowedSymbols
  );
  const liveWaveBoard = useTrendV8Board(
    'wave',
    BOARD_SORT,
    DEFAULT_DIRECTION,
    EMPTY_CONDITIONS,
    EMPTY_FAVORITES,
    allowedSymbols
  );
  const refreshPulseBoard = livePulseBoard.refresh;
  const refreshWaveBoard = liveWaveBoard.refresh;
  const storeRevision = useThrottledSymbolStoreRevision();
  const favorites = usePulseStore((state) => state.favorites);
  const toggleFavorite = usePulseStore((state) => state.toggleFavorite);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const tradingCategoryFilters = usePulseStore((state) => state.tradingCategoryFilters);
  const toggleTradingCategoryFilter = usePulseStore((state) => state.toggleTradingCategoryFilter);
  const trendModeFilter = usePulseStore((state) => state.trendModeFilter);
  const setTrendModeFilter = usePulseStore((state) => state.setTrendModeFilter);

  const isSymbolLocked = allowedSymbols.length === 0;
  const historicalQuality = useTrendBoardHistoricalQuality(
    allowedSymbols,
    !useMock && !isSymbolLocked
  );

  const setWinRateThreshold = usePulseStore((state) => state.setQualityWinRateThreshold);
  const setRiskRewardThreshold = usePulseStore((state) => state.setQualityRiskRewardThreshold);
  const setQualityPeriod = usePulseStore((state) => state.setQualityPeriod);
  const toggleSymbolSort = useCallback(() => {
    setSymbolSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleTrendMode = useCallback(
    (mode: keyof SignalTrendModeFilter) => {
      const next = { ...trendModeFilter, [mode]: !trendModeFilter[mode] };
      if (!next.trend && !next.nonTrend && !next.reversal) return;
      setTrendModeFilter(next);
    },
    [setTrendModeFilter, trendModeFilter]
  );

  const pulseSourceRows = useMock ? trendV8PageMock.symbols : livePulseBoard.rows;
  const waveSourceRows = useMock ? trendV8PageMock.symbols : liveWaveBoard.rows;
  const pulseRows = useMemo(
    () => pulseSourceRows.filter((row) => allowedSymbolSet.has(row.symbol)),
    [allowedSymbolSet, pulseSourceRows]
  );
  const waveRows = useMemo(
    () => waveSourceRows.filter((row) => allowedSymbolSet.has(row.symbol)),
    [allowedSymbolSet, waveSourceRows]
  );

  const displayRows = useMemo(() => {
    void storeRevision;
    const pulseBySymbol = new Map(pulseRows.map((row) => [row.symbol, row]));
    const waveBySymbol = new Map(waveRows.map((row) => [row.symbol, row]));

    return allowedSymbols
      .flatMap((symbol): CombinedTrendViewRow[] => {
        const pulseAnalysis = pulseBySymbol.get(symbol) ?? null;
        const waveAnalysis = waveBySymbol.get(symbol) ?? null;
        const analysis = pulseAnalysis ?? waveAnalysis;

        if (!analysis) return [];

        const pulseCycles = useMock ? [] : resolveOpenSignalCycles(symbol, 'pulse');
        const waveCycles = useMock ? [] : resolveOpenSignalCycles(symbol, 'wave');
        const categories = trendBoardDisplayCategories(pulseCycles, waveCycles);

        return categories.map((category, index) => {
          const pulseCycle = signalCycleForCategory(pulseCycles, category);
          const waveCycle = signalCycleForCategory(waveCycles, category);
          const pulse = buildStreamTrendView(
            symbol,
            pulseAnalysis,
            'pulse',
            useMock,
            pulseCycle,
            category
          );
          const wave = buildStreamTrendView(
            symbol,
            waveAnalysis,
            'wave',
            useMock,
            waveCycle,
            category
          );
          const openCount = signalOpenCount(pulse.signal, wave.signal);
          const openSignalPoint = signalPoint(pulse.signal, wave.signal);
          const trendAdjustmentPoint =
            trendSignalAdjustmentPoint(pulse) + trendSignalAdjustmentPoint(wave);

          return {
            symbol,
            analysis,
            tradingCategory: category,
            isStrategySubRow: categories.length > 1 && index > 0,
            pulse,
            wave,
            signalOpenCount: openCount,
            signalPoint: openSignalPoint,
            trendAdjustmentPoint,
            sortPoint: calculateTrendBoardPoint({ pulse, wave }),
          };
        });
      })
      .sort((a, b) => {
        const signalDelta = b.signalOpenCount - a.signalOpenCount;
        if (signalDelta !== 0) return signalDelta;

        const pointDelta = b.sortPoint - a.sortPoint;
        if (pointDelta !== 0) return pointDelta;

        const symbolDelta = baseSymbol(a.symbol).localeCompare(baseSymbol(b.symbol));
        if (symbolDelta !== 0) return symbolDelta;

        return categorySortIndex(a.tradingCategory) - categorySortIndex(b.tradingCategory);
      })
      .filter((row) => !showFavoritesOnly || favorites.has(row.symbol.trim().toUpperCase()));
  }, [allowedSymbols, favorites, pulseRows, showFavoritesOnly, storeRevision, useMock, waveRows]);

  const qualityFilterContext = useMemo(
    () => ({ tradingCategoryFilters, trendModeFilter, historicalQuality }),
    [historicalQuality, tradingCategoryFilters, trendModeFilter]
  );

  const rankedDisplayRows = useMemo(
    () =>
      groupRankedRowsBySymbol(
        displayRows.map(
          (row): RankedTrendViewRow => ({
            row,
            ...bestRowQuality(
              row,
              qualityPeriod,
              winRateThreshold,
              riskRewardThreshold,
              qualityFilterContext
            ),
          })
        ),
        symbolSortDirection
      ),
    [
      displayRows,
      qualityFilterContext,
      qualityPeriod,
      riskRewardThreshold,
      symbolSortDirection,
      winRateThreshold,
    ]
  );
  const visibleSymbolCount = useMemo(
    () =>
      new Set(rankedDisplayRows.map(({ row }) => row.symbol.trim().toUpperCase()).filter(Boolean))
        .size,
    [rankedDisplayRows]
  );

  const showLoading =
    !useMock &&
    (livePulseBoard.loading || liveWaveBoard.loading) &&
    displayRows.length === 0 &&
    !isSymbolLocked;
  const boardError = [livePulseBoard.error, liveWaveBoard.error].filter(Boolean).join(' / ');

  useEffect(() => {
    const id = window.setInterval(() => {
      setRenderTick(Date.now());
      if (!useMock && !isSymbolLocked) {
        refreshPulseBoard();
        refreshWaveBoard();
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(id);
  }, [isSymbolLocked, refreshPulseBoard, refreshWaveBoard, useMock]);

  const handleNavigateTrendChart = useCallback(
    (
      symbol: string,
      targetEngine: TrendEngine = 'pulse',
      tradingCategory?: TradingCategory | null
    ) => {
      if (!isSymbolLocked) {
        navigate(chartPathForEngine(targetEngine, symbol, tradingCategory));
      }
    },
    [isSymbolLocked, navigate]
  );

  const handleNavigateSignalBoard = useCallback(
    (targetEngine: TrendEngine, tradingCategory: TradingCategory | null) => {
      if (!isSymbolLocked) {
        navigate(signalBoardPathForEngine(targetEngine, tradingCategory));
      }
    },
    [isSymbolLocked, navigate]
  );

  const handleSymbolClick = useCallback(
    (row: CombinedTrendViewRow) => {
      const engine = chartEngineForRow(row);
      handleNavigateTrendChart(row.symbol, engine, row[engine].tradingCategory);
    },
    [handleNavigateTrendChart]
  );

  return (
    // 배경/글자색을 하드코딩하면 라이트 모드에서도 새까만 보드가 남는다 → 팔레트 변수로.
    <div
      className="trend-front min-h-[calc(100vh-var(--header-height))]"
      style={{ background: 'var(--tf-bg)', color: 'var(--tf-text)' }}
    >
      <style>{TREND_FRONT_STYLES}</style>
      <main className="trend-front-wrap">
        <TrendBoardFilterPanel
          language={activeLanguage}
          winRateThreshold={winRateThreshold}
          riskRewardThreshold={riskRewardThreshold}
          period={qualityPeriod}
          favoriteSymbols={favoriteSymbols}
          tradingCategoryFilters={tradingCategoryFilters}
          trendModeFilter={trendModeFilter}
          onWinRateChange={setWinRateThreshold}
          onRiskRewardChange={setRiskRewardThreshold}
          onPeriodChange={setQualityPeriod}
          onToggleTradingCategory={toggleTradingCategoryFilter}
          onToggleTrendMode={toggleTrendMode}
        />

        {!useMock && boardError ? (
          <div className="trend-front-pair-note">
            <span className="trend-front-error">{boardError}</span>
          </div>
        ) : null}

        <div className="trend-front-tbl-wrap">
          <table className="trend-front-dt" data-render-tick={renderTick}>
            <colgroup>
              <col className="trend-front-col-symbol" />
              <col className="trend-front-col-strategy" />
              <col className="trend-front-col-signal" />
              <col className="trend-front-col-elapsed" />
              <col className="trend-front-col-signal" />
              <col className="trend-front-col-elapsed" />
              <col className="trend-front-col-trend" />
              <col className="trend-front-col-trend" />
              <col className="trend-front-col-trend" />
              <col className="trend-front-col-trend" />
              <col className="trend-front-col-point" />
            </colgroup>
            <thead>
              <tr>
                <th
                  aria-sort={
                    symbolSortDirection === 'asc'
                      ? 'ascending'
                      : symbolSortDirection === 'desc'
                        ? 'descending'
                        : 'none'
                  }
                >
                  <SortableTrendSymbolHeader
                    label={trendTableHeader('symbol', activeLanguage)}
                    count={visibleSymbolCount}
                    direction={symbolSortDirection}
                    onClick={toggleSymbolSort}
                  />
                </th>
                <th>{trendTableHeader('strategy', activeLanguage)}</th>
                <th>{trendTableHeader('pulse', activeLanguage)}</th>
                <th>{trendTableHeader('pulseElapsed', activeLanguage)}</th>
                <th>{trendTableHeader('wave', activeLanguage)}</th>
                <th>{trendTableHeader('waveElapsed', activeLanguage)}</th>
                <th>{trendTableHeader('pulseShortTrend', activeLanguage)}</th>
                <th>{trendTableHeader('pulseLongTrend', activeLanguage)}</th>
                <th>{trendTableHeader('waveShortTrend', activeLanguage)}</th>
                <th>{trendTableHeader('waveLongTrend', activeLanguage)}</th>
                <th>{trendTableHeader('point', activeLanguage)}</th>
              </tr>
            </thead>
            <tbody>
              {isSymbolLocked ? (
                <tr>
                  <td colSpan={11}>
                    <div className="trend-front-empty">
                      <p>{copy.upgradeTitle}</p>
                      <span>{copy.upgradeDescription}</span>
                    </div>
                  </td>
                </tr>
              ) : showLoading ? (
                <TrendBoardSkeletonRows />
              ) : rankedDisplayRows.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="trend-front-empty">
                      <p>{copy.emptyRows}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rankedDisplayRows.map(
                  ({ row: viewRow, qualityMatched, isFirstInSymbolGroup, symbolGroupSize }) => {
                    const row = viewRow.analysis;
                    const isFavorite = favorites.has(row.symbol.trim().toUpperCase());
                    const rowKey = [
                      row.symbol,
                      viewRow.tradingCategory ?? 'all',
                      viewRow.pulse.cycleId ?? 'no-pulse',
                      viewRow.wave.cycleId ?? 'no-wave',
                    ].join(':');
                    const strategyColor = strategyColorForCategory(viewRow.tradingCategory);
                    const pulseQuality = displayQualityForView(
                      viewRow,
                      'pulse',
                      qualityPeriod,
                      qualityFilterContext
                    );
                    const waveQuality = displayQualityForView(
                      viewRow,
                      'wave',
                      qualityPeriod,
                      qualityFilterContext
                    );
                    const pulseMuted = streamMutedByFilters(viewRow, 'pulse', qualityFilterContext);
                    const waveMuted = streamMutedByFilters(viewRow, 'wave', qualityFilterContext);

                    return (
                      <tr
                        key={rowKey}
                        className={cn(
                          qualityMatched && 'trend-front-row-quality-match',
                          !isFirstInSymbolGroup && 'trend-front-sub-row',
                          isFirstInSymbolGroup &&
                            symbolGroupSize > 1 &&
                            'trend-front-group-row-start'
                        )}
                      >
                        {isFirstInSymbolGroup ? (
                          <td
                            rowSpan={symbolGroupSize}
                            className="trend-front-symbol-cell trend-front-grouped-cell"
                          >
                            <div
                              className="trend-front-symbol"
                              role="button"
                              tabIndex={0}
                              onClick={() => handleSymbolClick(viewRow)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleSymbolClick(viewRow);
                                }
                              }}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleFavorite(row.symbol.trim().toUpperCase());
                                }}
                                className={cn(
                                  'flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-colors',
                                  isFavorite
                                    ? 'text-yellow-400'
                                    : 'text-muted-foreground/40 hover:text-yellow-400/50'
                                )}
                                aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                              >
                                <Star
                                  className={cn('h-3.5 w-3.5', isFavorite && 'fill-current')}
                                  aria-hidden
                                />
                              </button>
                              <CoinIcon
                                symbol={row.symbol}
                                size={22}
                                className="trend-front-symbol-icon"
                              />
                              <span className="trend-front-symbol-text">
                                <span className="trend-front-symbol-main">
                                  <span
                                    className="trend-front-symbol-code"
                                    title={symbolPairLabel(row.symbol)}
                                  >
                                    {baseSymbol(row.symbol)}
                                  </span>
                                  <em className="trend-front-symbol-price">
                                    {formatPrice(row.price)}
                                  </em>
                                </span>
                              </span>
                            </div>
                          </td>
                        ) : null}
                        <td
                          className={cn(
                            'trend-front-strategy-cell',
                            symbolGroupSize > 1 && 'trend-front-strategy-branch-cell'
                          )}
                        >
                          <span
                            className={cn(
                              'trend-front-strategy-pill',
                              !viewRow.tradingCategory && 'trend-front-strategy-pill-all'
                            )}
                            title={strategyCellTitle(viewRow.tradingCategory, activeLanguage)}
                          >
                            {strategyColor ? (
                              <span
                                className="trend-front-strategy-dot"
                                style={{ backgroundColor: strategyColor }}
                                aria-hidden
                              />
                            ) : null}
                            <span className="trend-front-strategy-name">
                              {strategyCellLabel(viewRow.tradingCategory)}
                            </span>
                          </span>
                        </td>
                        <td>
                          <div className="trend-front-signal-cell">
                            <StreamSignalBadge
                              view={viewRow.pulse}
                              language={activeLanguage}
                              quality={pulseQuality}
                              muted={pulseMuted}
                              onClick={() =>
                                handleNavigateSignalBoard('pulse', viewRow.pulse.tradingCategory)
                              }
                            />
                          </div>
                        </td>
                        <td className="trend-front-muted">
                          {formatElapsed(viewRow.pulse.elapsedSec, activeLanguage)}
                        </td>
                        <td>
                          <div className="trend-front-signal-cell">
                            <StreamSignalBadge
                              view={viewRow.wave}
                              language={activeLanguage}
                              quality={waveQuality}
                              muted={waveMuted}
                              onClick={() =>
                                handleNavigateSignalBoard('wave', viewRow.wave.tradingCategory)
                              }
                            />
                          </div>
                        </td>
                        <td className="trend-front-muted">
                          {formatElapsed(viewRow.wave.elapsedSec, activeLanguage)}
                        </td>
                        {isFirstInSymbolGroup ? (
                          <>
                            <td
                              rowSpan={symbolGroupSize}
                              className={cn(
                                `trend-front-${viewRow.pulse.shortTrend}`,
                                'trend-front-grouped-cell'
                              )}
                            >
                              {trendValueLabel(viewRow.pulse.shortTrend, activeLanguage)}
                            </td>
                            <td
                              rowSpan={symbolGroupSize}
                              className={cn(
                                `trend-front-${viewRow.pulse.longTrend}`,
                                'trend-front-grouped-cell'
                              )}
                            >
                              {trendValueLabel(viewRow.pulse.longTrend, activeLanguage)}
                            </td>
                            <td
                              rowSpan={symbolGroupSize}
                              className={cn(
                                `trend-front-${viewRow.wave.shortTrend}`,
                                'trend-front-grouped-cell'
                              )}
                            >
                              {trendValueLabel(viewRow.wave.shortTrend, activeLanguage)}
                            </td>
                            <td
                              rowSpan={symbolGroupSize}
                              className={cn(
                                `trend-front-${viewRow.wave.longTrend}`,
                                'trend-front-grouped-cell'
                              )}
                            >
                              {trendValueLabel(viewRow.wave.longTrend, activeLanguage)}
                            </td>
                          </>
                        ) : null}
                        {isFirstInSymbolGroup ? (
                          <td rowSpan={symbolGroupSize} className="trend-front-grouped-cell">
                            <span
                              className={cn('trend-front-score', scoreClass(viewRow.sortPoint))}
                              title={`Trend ${(viewRow.pulse.point ?? 0) + (viewRow.wave.point ?? 0)} + Signal ${viewRow.signalPoint} + Adj ${viewRow.trendAdjustmentPoint}`}
                            >
                              {formatScore(viewRow.sortPoint, copy)}
                            </span>
                          </td>
                        ) : null}
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        <SortPrioritySection language={activeLanguage} />
        <ScoreLogicSection language={activeLanguage} />
      </main>
    </div>
  );
}

const TREND_FRONT_STYLES = `
  .trend-front {
    --tf-bg: #0D0D0D;
    --tf-panel: #171717;
    --tf-field: #202020;
    --tf-border: #2A2A2A;
    --tf-border-2: #3A3A3A;
    --tf-head: #141414;
    --tf-text: #EAEAEA;
    --tf-muted: #8C8C8C;
    --tf-dim: #8A8A8A; /* 새 UI의 옅은 색 행(예: #311C1F) 위에서 #666은 2.76이라 상향 */
    --tf-green: #0ECB81;
    --tf-red: #F6465D;
    --tf-gold: #F0B90B;
    --tf-blue: #5B8DEF;
    font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
    font-size: 13px;
    -webkit-font-smoothing: antialiased;
  }
  /* 이 보드는 목업 팔레트를 그대로 하드코딩해서, 라이트 모드에서도 페이지 한가운데에
     새까만 표가 통째로 남아 있었다. 디자인 언어(역할별 변수)는 그대로 두고 라이트용
     값만 덮어써서 같은 레이아웃이 밝은 테마로 렌더되게 한다.
     색상 값은 흰 배경 대비 4.5 이상이 되도록 골랐다(green 4.9 / red 5.4 / gold 5.3 /
     blue 5.2 / dim 4.5). */
  :root:not(.dark) .trend-front {
    --tf-bg: #F5F5F5;
    --tf-panel: #FFFFFF;
    --tf-field: #F1F1F1;
    --tf-border: #DCDCDC;
    --tf-border-2: #C4C4C4;
    --tf-head: #F4F4F4;
    --tf-text: #141414;
    --tf-muted: #5A5A5A;
    --tf-dim: #666666; /* 새 UI가 추가한 옅은 색 행(예: #FDE8EB) 위에서도 4.9 */
    --tf-green: #047857;
    --tf-red: #BE123C;
    --tf-gold: #854D0E;
    --tf-blue: #1D4ED8;
  }
  :root:not(.dark) .trend-front * { scrollbar-color: #c9c9c9 transparent; }
  :root:not(.dark) .trend-front *::-webkit-scrollbar-thumb { background: #c9c9c9; background-clip: padding-box; }
  :root:not(.dark) .trend-front *::-webkit-scrollbar-thumb:hover { background: #b0b0b0; background-clip: padding-box; }
  .trend-front * { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: #2b2b2b transparent; }
  .trend-front *::-webkit-scrollbar { width: 9px; height: 9px; }
  .trend-front *::-webkit-scrollbar-thumb { background: #2b2b2b; border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }
  .trend-front *::-webkit-scrollbar-thumb:hover { background: #3a3a3a; background-clip: padding-box; }
  .trend-front-wrap { width: 100%; max-width: 1400px; margin: 0 auto; padding: 30px var(--header-padding-x) 80px; }
  .trend-front-page-h { font-size: 18px; font-weight: 800; margin-top: 1.625rem; margin-bottom: 18px; letter-spacing: 0; color: var(--tf-text); }
  .trend-front-filter-panel { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; border: 1px solid var(--tf-border); border-radius: 8px; background: var(--tf-panel); padding: 12px; }
  .trend-front-filter-row { display: flex; width: 100%; min-width: 0; align-items: center; gap: 10px 14px; flex-wrap: wrap; }
  .trend-front-filter-row-primary { display: grid; grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr); gap: 12px; align-items: end; }
  .trend-front-filter-row-secondary { align-items: flex-start; }
  .trend-front-quality-control { display: flex; min-width: 0; flex-direction: column; gap: 8px; }
  .trend-front-quality-control-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--tf-muted); font-size: 11.5px; font-weight: 700; }
  .trend-front-quality-control-head b { color: var(--tf-gold); font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-variant-numeric: tabular-nums; }
  .trend-front-quality-range { height: 8px; width: 100%; appearance: none; border: 1px solid var(--tf-border); border-radius: 999px; outline: none; cursor: pointer; }
  .trend-front-quality-range::-webkit-slider-thumb { height: 18px; width: 18px; appearance: none; border: 2px solid var(--tf-bg); border-radius: 999px; background: var(--tf-gold); box-shadow: 0 0 0 1px rgba(240,185,11,.5); }
  .trend-front-quality-range::-moz-range-thumb { height: 16px; width: 16px; border: 2px solid var(--tf-bg); border-radius: 999px; background: var(--tf-gold); box-shadow: 0 0 0 1px rgba(240,185,11,.5); }
  .trend-front-control-group { display: flex; min-width: 0; align-items: center; gap: 7px; flex-wrap: wrap; }
  .trend-front-filter-chip { display: inline-flex; height: 32px; align-items: center; gap: 6px; border: 1px solid var(--tf-border); border-radius: 7px; background: var(--tf-field); padding: 0 10px; color: var(--tf-muted); font-family: inherit; font-size: 12px; font-weight: 700; cursor: pointer; transition: color .15s, border-color .15s, background-color .15s; }
  .trend-front-filter-chip:hover { color: var(--tf-text); border-color: var(--tf-border-2); }
  .trend-front-filter-chip-on { border-color: rgba(240,185,11,.58); background: rgba(240,185,11,.12); color: var(--tf-text); }
  .trend-front-filter-check { display: inline-flex; height: 15px; width: 15px; align-items: center; justify-content: center; border: 1px solid var(--tf-border-2); border-radius: 4px; color: var(--tf-gold); }
  .trend-front-filter-chip-on .trend-front-filter-check { border-color: var(--tf-gold); background: rgba(240,185,11,.14); }
  .trend-front-strategy-dot { display: inline-block; width: 7px; height: 7px; flex: 0 0 auto; border-radius: 999px; }
  .trend-front-sortbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .trend-front-lab { font-size: 12px; color: var(--tf-dim); margin-right: 2px; }
  .trend-front-sort-lab { margin-left: 10px; }
  .trend-front-sortbtn {
    display: inline-flex; align-items: center; gap: 7px; height: 36px; padding: 0 14px;
    background: var(--tf-field); border: 1px solid var(--tf-border); border-radius: 9px;
    color: var(--tf-muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: color .15s, border-color .15s, background-color .15s;
  }
  .trend-front-sortbtn:hover { color: var(--tf-text); border-color: var(--tf-border-2); }
  .trend-front-sortbtn.trend-front-on { color: #fff; background: rgba(91,141,239,.12); border-color: var(--tf-blue); }
  /* 라이트 모드에서는 옅은 파란 틴트 위에 흰 글자라 선택된 탭이 안 보였다. */
  :root:not(.dark) .trend-front-sortbtn.trend-front-on { color: var(--tf-blue); background: rgba(29,78,216,.10); }
  .trend-front-pair-note { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 11.5px; color: var(--tf-dim); margin: 0 2px 14px; }
  .trend-front-error { color: var(--tf-red); }
  .trend-front-tbl-wrap { overflow-x: auto; border: 1px solid var(--tf-border); border-radius: 12px; background: var(--tf-panel); }
  table.trend-front-dt { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 12.5px; min-width: 1180px; }
  .trend-front-col-symbol { width: 12%; }
  .trend-front-col-strategy { width: 6%; }
  .trend-front-col-signal { width: 15%; }
  .trend-front-col-elapsed { width: 4.5%; }
  .trend-front-col-trend { width: 7.5%; }
  .trend-front-col-point { width: 7%; }
  .trend-front-dt th, .trend-front-dt td { padding: 9px 8px; border-bottom: 1px solid var(--tf-border); text-align: center; vertical-align: middle; }
  .trend-front-dt thead th { background: var(--tf-head); color: var(--tf-muted); font-weight: 600; white-space: normal; line-height: 1.2; }
  .trend-front-sortable-head { display: inline-flex; width: 100%; min-width: 0; align-items: center; justify-content: center; gap: 4px; border: 0; background: transparent; color: inherit; font: inherit; font-weight: inherit; cursor: pointer; }
  .trend-front-sortable-head:hover { color: var(--tf-text); }
  .trend-front-sortable-head svg { width: 13px; height: 13px; flex: 0 0 auto; }
  .trend-front-sortable-head-muted { opacity: .5; }
  .trend-front-dt tbody td { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .trend-front-dt thead tr:first-child th { border-bottom-color: var(--tf-border-2); }
  .trend-front-stream-head { color: var(--tf-text); text-transform: uppercase; letter-spacing: .06em; }
  .trend-front-stream-head-pulse { color: #67E8F9; }
  .trend-front-stream-head-wave { color: #C4B5FD; border-left: 1px solid var(--tf-border-2); }
  .trend-front-group-start { border-left: 1px solid var(--tf-border-2); }
  .trend-front-dt tbody tr:last-child td { border-bottom: none; }
  .trend-front-dt tbody tr:hover td { background: #151515; }
  .trend-front-dt th:first-child { font-weight: 700; }
  .trend-front-symbol-cell { text-align: left; font-weight: 700; }
  .trend-front-dt tbody td.trend-front-strategy-cell { text-align: center; white-space: normal; }
  .trend-front-grouped-cell { vertical-align: middle; }
  .trend-front-group-row-start td { border-top: 1px solid var(--tf-border-2); }
  .trend-front-highlight td { background: rgba(14, 203, 129, .035); }
  .trend-front-dt tbody tr.trend-front-row-quality-match td { background: rgba(240, 185, 11, .16); }
  .trend-front-dt tbody tr.trend-front-row-quality-match:hover td { background: rgba(240, 185, 11, .22); }
  :root:not(.dark) .trend-front-dt tbody tr.trend-front-row-quality-match td { background: rgba(254, 240, 138, .72); }
  :root:not(.dark) .trend-front-dt tbody tr.trend-front-row-quality-match:hover td { background: rgba(254, 240, 138, .88); }
  .trend-front-symbol { display: inline-flex; width: 100%; min-width: 0; align-items: center; gap: 8px; background: transparent; border: 0; padding: 0; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .trend-front-symbol:hover .trend-front-symbol-code { color: var(--tf-blue); }
  .trend-front-symbol-icon { box-shadow: 0 0 0 1px rgba(255,255,255,.08); }
  .trend-front-symbol-text { display: inline-flex; min-width: 0; align-items: center; }
  .trend-front-symbol-main { display: inline-flex; min-width: 0; align-items: center; gap: 7px; }
  .trend-front-symbol-code { min-width: 0; overflow: hidden; text-overflow: ellipsis; color: #fff; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 800; line-height: 1.15; }
  .trend-front-symbol-price { flex-shrink: 0; color: var(--tf-text); font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-style: normal; font-weight: 800; line-height: 1.15; opacity: .86; }
  .trend-front-strategy-branch-cell { box-shadow: inset 2px 0 0 rgba(240,185,11,.32); }
  .trend-front-strategy-pill { display: inline-flex; max-width: 100%; min-width: 42px; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--tf-border); border-radius: 7px; background: var(--tf-field); padding: 3px 8px; color: var(--tf-text); font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; font-weight: 800; }
  .trend-front-strategy-pill-all { color: var(--tf-muted); }
  .trend-front-strategy-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trend-front-strategy-pill-all .trend-front-strategy-name { color: var(--tf-muted); }
  .trend-front-up { color: var(--tf-green); font-weight: 700; }
  .trend-front-down { color: var(--tf-red); font-weight: 700; }
  .trend-front-none { color: var(--tf-dim); }
  .trend-front-signal-cell { display: flex; min-width: 0; align-items: center; justify-content: center; }
  .trend-front-signal {
    display: inline-flex; width: 100%; max-width: 210px; min-width: 0; height: 28px; align-items: center; justify-content: space-between; gap: 5px; padding: 0 7px;
    border-radius: 6px; border: 1px solid var(--tf-border); background: var(--tf-field);
    font-family: inherit; font-size: 11.5px; font-weight: 700; white-space: nowrap; cursor: pointer; overflow: hidden;
  }
  .trend-front-signal:hover { border-color: var(--tf-blue); }
  .trend-front-signal-no-quality { justify-content: center; }
  .trend-front-signal-long { color: var(--tf-green); border-color: rgba(14,203,129,.28); background: rgba(14,203,129,.08); }
  .trend-front-signal-short { color: var(--tf-green); border-color: rgba(14,203,129,.28); background: rgba(14,203,129,.08); }
  .trend-front-signal-none { color: var(--tf-dim); }
  .trend-front-signal-main { display: inline-flex; min-width: 0; align-items: center; gap: 4px; overflow: hidden; text-overflow: ellipsis; }
  .trend-front-signal-pnl { font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-variant-numeric: tabular-nums; letter-spacing: 0; }
  .trend-front-signal-pnl-up { color: var(--tf-green); border-color: rgba(14,203,129,.36); background: rgba(14,203,129,.10); }
  .trend-front-signal-pnl-down { color: var(--tf-red); border-color: rgba(246,70,93,.36); background: rgba(246,70,93,.10); }
  .trend-front-signal-pnl-flat { color: var(--tf-dim); border-color: var(--tf-border-2); background: var(--tf-field); }
  .trend-front-signal-pnl-label { color: var(--tf-green); }
  .trend-front-signal-pnl-text-up { color: var(--tf-green); }
  .trend-front-signal-pnl-text-down { color: var(--tf-red); }
  .trend-front-signal-pnl-text-flat { color: var(--tf-dim); }
  .trend-front-signal-quality { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 4px; color: var(--tf-muted); font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
  .trend-front-signal-quality span { display: inline-flex; align-items: baseline; gap: 2px; }
  .trend-front-signal-quality b { color: var(--tf-text); font-weight: 800; }
  .trend-front-gold { color: var(--tf-gold); }
  .trend-front-muted { color: var(--tf-muted); }
  .trend-front-badge { display: inline-block; font-size: 11.5px; font-weight: 700; padding: 3px 10px; border-radius: 6px; }
  .trend-front-b-trend { color: var(--tf-green); background: rgba(14,203,129,.14); }
  .trend-front-b-counter { color: var(--tf-gold); background: rgba(240,185,11,.14); }
  .trend-front-b-nontrend { color: var(--tf-muted); background: var(--tf-field); }
  .trend-front-score { display: inline-flex; align-items: center; justify-content: center; min-width: 40px; font-weight: 800; font-variant-numeric: tabular-nums; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .trend-front-s9 { color: var(--tf-green); }
  .trend-front-s6 { color: var(--tf-gold); }
  .trend-front-s3 { color: var(--tf-muted); }
  .trend-front-pull { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 120px; }
  .trend-front-pull-bar { display: inline-block; width: 74px; height: 6px; border-radius: 3px; background: var(--tf-field); overflow: hidden; }
  .trend-front-pull-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--tf-blue), var(--tf-green)); }
  .trend-front-pull-fill-down { background: linear-gradient(90deg, var(--tf-blue), var(--tf-red)); }
  .trend-front-pull-v { min-width: 42px; text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .trend-front-vol { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; font-weight: 800; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .trend-front-vol-dots { display: inline-flex; align-items: center; justify-content: center; gap: 4px; width: 38px; height: 18px; }
  .trend-front-vol-dot { width: 6px; height: 6px; border-radius: 999px; background: currentColor; border: 1px solid currentColor; }
  .trend-front-vol-dot-on { background: currentColor; border-color: currentColor; }
  .trend-front-vol-high { color: var(--tf-red); }
  .trend-front-vol-mid { color: var(--tf-gold); }
  .trend-front-vol-low { color: var(--tf-muted); }
  .trend-front-vol-gray { color: var(--tf-muted); }
  .trend-front-empty { min-height: 132px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--tf-muted); text-align: center; }
  .trend-front-empty p { color: var(--tf-text); font-size: 14px; font-weight: 700; }
  .trend-front-empty span { color: var(--tf-muted); font-size: 12px; font-weight: 400; }
  .trend-front-sec { margin-top: 44px; margin-bottom: 44px; }
  .trend-front-sec-h { font-size: 15px; font-weight: 800; margin: 0 2px 14px; color: var(--tf-text); }
  .trend-front-sort-priority { margin-top: 18px; border: 1px solid var(--tf-border); border-radius: 12px; background: var(--tf-panel); padding: 14px; }
  .trend-front-sort-priority .trend-front-mini-tbl th:first-child,
  .trend-front-sort-priority .trend-front-mini-tbl td:first-child { width: 110px; }
  .trend-front-logic-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .trend-front-scorelogic-grid { display: grid; grid-template-columns: minmax(280px, .78fr) minmax(0, 1.22fr); gap: 18px; }
  .trend-front-scorelogic-panel { border: 1px solid var(--tf-border); border-radius: 12px; background: var(--tf-panel); padding: 14px; overflow-x: auto; }
  .trend-front-scorelogic-panel-wide .trend-front-mini-tbl th,
  .trend-front-scorelogic-panel-wide .trend-front-mini-tbl td { white-space: nowrap; }
  .trend-front-card { background: var(--tf-panel); border: 1px solid var(--tf-border); border-radius: 12px; padding: 16px 18px; }
  .trend-front-card-h { font-size: 13px; font-weight: 800; margin-bottom: 12px; color: var(--tf-text); }
  .trend-front-tier { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--tf-border); }
  .trend-front-tier:last-child { border-bottom: none; }
  .trend-front-rank { font-size: 11px; font-weight: 700; color: var(--tf-dim); width: 42px; }
  .trend-front-desc { flex: 1; font-size: 12.5px; color: var(--tf-text); }
  .trend-front-pt { font-weight: 800; font-variant-numeric: tabular-nums; font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace; }
  .trend-front-mini-tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
  .trend-front-mini-tbl th, .trend-front-mini-tbl td { padding: 8px 10px; border-bottom: 1px solid var(--tf-border); text-align: center; }
  .trend-front-mini-tbl th { color: var(--tf-muted); font-weight: 600; background: var(--tf-head); }
  .trend-front-mini-tbl td:first-child, .trend-front-mini-tbl th:first-child { text-align: left; font-weight: 700; }
  .trend-front-mini-tbl tr:last-child td { border-bottom: none; }
  .trend-front-formula { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; font-size: 12px; color: var(--tf-muted); background: var(--tf-field); border-radius: 8px; padding: 10px 12px; line-height: 1.7; }
  .trend-front-formula b { color: var(--tf-text); }
  @media (max-width: 900px) {
    .trend-front-wrap { padding-top: 24px; padding-bottom: 72px; }
    .trend-front-filter-row-primary { grid-template-columns: 1fr; }
    table.trend-front-dt { min-width: 1120px; }
    .trend-front-logic-grid { grid-template-columns: 1fr; }
    .trend-front-scorelogic-grid { grid-template-columns: 1fr; }
  }
`;
