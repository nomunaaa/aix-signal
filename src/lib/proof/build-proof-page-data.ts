import {
  PERIOD_LABELS,
  type ProofPageMock,
  type ProofPeriod,
  type ProofStatsStream,
  type ProofStatsTrendMode,
} from '@/lib/mock/proof-mock';
import {
  buildSimulatorData,
  buildSymbolStats,
  buildTotalStats,
  filterStatsRows,
  symbolShortName,
  winRateDecimal,
} from '@/lib/proof/proof-stats';
import {
  buildProofBuckets,
  proofStatsRowsToBuckets,
  reconstructSymbolStats,
  reconstructTotalStats,
  type ProofBuckets,
  type ProofStatsAggregateRow,
} from '@/lib/proof/proof-buckets';
import {
  aggregateProofBoard,
  filterByPeriod,
  TRADING_CATEGORY_LABEL,
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_ACCENT,
  type PlatformCycleRow,
  type TradingCategory,
} from '@/lib/proof-platform-aggregate';

const TIMELINE_DISPLAY = 50;
const SYMBOL_RANK_COUNT = 5;
const ARCHIVE_TOP_COUNT = 19;
const DEFAULT_STATS_STREAMS: readonly ProofStatsStream[] = ['PULSE', 'WAVE'];
const DEFAULT_STATS_TREND_MODES: readonly ProofStatsTrendMode[] = ['trend', 'nonTrend', 'reversal'];
const EMPTY_BUCKETS: ProofBuckets = {
  total: {},
  recent30: {},
  recent3mo: {},
  bySymbolTotal: {},
  bySymbolRecent30: {},
  bySymbolRecent3mo: {},
};

function formatGeneratedAtLabel(): string {
  const formatted = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
  return `${formatted} KST 기준 · signal_cycles 전수 집계`;
}

function tradingCategoryStats(rows: PlatformCycleRow[]) {
  return TRADING_CATEGORY_ORDER.map((key: TradingCategory) => {
    const subset = rows.filter((r) => r.tradingCategory === key);
    if (subset.length === 0) {
      return {
        key,
        displayName: TRADING_CATEGORY_LABEL[key],
        accentColor: TRADING_CATEGORY_TO_ACCENT[key],
        winRate: 0,
        avgPnlPct: 0,
      };
    }
    const wins = subset.filter((r) => r.pnlPct > 0).length;
    const avgPnl = subset.reduce((sum, r) => sum + r.pnlPct, 0) / subset.length;
    return {
      key,
      displayName: TRADING_CATEGORY_LABEL[key],
      accentColor: TRADING_CATEGORY_TO_ACCENT[key],
      winRate: winRateDecimal(wins, subset.length),
      avgPnlPct: parseFloat(avgPnl.toFixed(2)),
    };
  });
}

function symbolRankings(rows: PlatformCycleRow[]) {
  const bySymbol = new Map<string, number[]>();
  for (const r of rows) {
    const arr = bySymbol.get(r.symbol) ?? [];
    arr.push(r.pnlPct);
    bySymbol.set(r.symbol, arr);
  }
  const ranked = Array.from(bySymbol.entries())
    .map(([symbol, pnls]) => ({
      symbol,
      avgPnlPct: parseFloat((pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)),
      cycleCount: pnls.length,
    }))
    .sort((a, b) => b.avgPnlPct - a.avgPnlPct);

  const top = ranked.slice(0, SYMBOL_RANK_COUNT).map((row, i) => ({
    rank: i + 1,
    symbol: row.symbol,
    avgPnlPct: row.avgPnlPct,
    cycleCount: row.cycleCount,
    hasProofLink: true,
  }));

  const bottom = ranked
    .slice(-SYMBOL_RANK_COUNT)
    .reverse()
    .map((row, i) => ({
      rank: i + 1,
      symbol: row.symbol,
      avgPnlPct: row.avgPnlPct,
      cycleCount: row.cycleCount,
      hasProofLink: true,
    }));

  return { top, bottom, ranked };
}

function buildArchiveLinks(ranked: ReturnType<typeof symbolRankings>['ranked']) {
  const links = ranked.slice(0, ARCHIVE_TOP_COUNT).map((row) => ({
    symbol: row.symbol,
    shortName: symbolShortName(row.symbol),
    avgPnlPct: row.avgPnlPct,
    href: `/proof/symbol/${row.symbol}`,
  }));

  if (ranked.length > ARCHIVE_TOP_COUNT) {
    links.push({
      symbol: 'MORE',
      shortName: `외 ${ranked.length - ARCHIVE_TOP_COUNT}종 →`,
      avgPnlPct: 0,
      href: '/proof/symbols',
    });
  } else if (links.length === 0) {
    links.push({
      symbol: 'MORE',
      shortName: '전체 목록 →',
      avgPnlPct: 0,
      href: '/proof/symbols',
    });
  }

  return links;
}

function buildTimeline(rows: PlatformCycleRow[]) {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime()
  );
  const slice = sorted.slice(-TIMELINE_DISPLAY);
  return {
    dots: slice.map((r) => ({
      cycleId: r.id,
      isWin: r.pnlPct > 0,
      pnlPct: parseFloat(r.pnlPct.toFixed(2)),
      symbol: r.symbol,
      closedAt: r.exitTime,
    })),
    total: rows.length,
    displayCount: slice.length,
  };
}

function timeintervalForPeriod(period: ProofPeriod): 'all_time' | 'last_30d' | 'last_3mo' {
  if (period === 'all') return 'all_time';
  if (period === '90d') return 'last_3mo';
  return 'last_30d';
}

function numberFromStats(value: number | string | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function standardStatsRowsForPeriod(
  rows: ProofStatsAggregateRow[],
  period: ProofPeriod
): ProofStatsAggregateRow[] {
  const timeinterval = timeintervalForPeriod(period);
  return rows.filter(
    (row) =>
      row.scope === 'all_symbols' &&
      row.category === 'standard' &&
      row.timeinterval === timeinterval
  );
}

function aggregateStatsRows(rows: ProofStatsAggregateRow[]) {
  const totalCycles = rows.reduce((sum, row) => sum + numberFromStats(row.entries), 0);
  const wins = rows.reduce((sum, row) => sum + numberFromStats(row.win_count), 0);
  const pnlPctSum = rows.reduce((sum, row) => sum + numberFromStats(row.pnl_pct_sum), 0);

  return {
    totalCycles,
    wins,
    avgPnl: totalCycles > 0 ? parseFloat((pnlPctSum / totalCycles).toFixed(2)) : 0,
  };
}

function buildEnginesFromStats(
  rows: ProofStatsAggregateRow[],
  period: ProofPeriod
): ProofPageMock['engines'] {
  const periodRows = standardStatsRowsForPeriod(rows, period);
  const pulse = aggregateStatsRows(periodRows.filter((row) => row.barinterval === '1m'));
  const wave = aggregateStatsRows(periodRows.filter((row) => row.barinterval === '10m'));

  return [
    {
      engine: 'PULSE' as const,
      barInterval: '1m' as const,
      subtitle: '1분 봉 · 단기',
      winRate: winRateDecimal(pulse.wins, pulse.totalCycles),
      avgPnlPct: pulse.avgPnl,
      cycleCount: pulse.totalCycles,
    },
    {
      engine: 'WAVE' as const,
      barInterval: '10m' as const,
      subtitle: '10분 봉 · 중기',
      winRate: winRateDecimal(wave.wins, wave.totalCycles),
      avgPnlPct: wave.avgPnl,
      cycleCount: wave.totalCycles,
    },
  ];
}

function tradingCategoryStatsFromStats(rows: ProofStatsAggregateRow[], period: ProofPeriod) {
  const periodRows = standardStatsRowsForPeriod(rows, period);

  return TRADING_CATEGORY_ORDER.map((key: TradingCategory) => {
    const aggregate = aggregateStatsRows(periodRows.filter((row) => row.trading_category === key));

    return {
      key,
      displayName: TRADING_CATEGORY_LABEL[key],
      accentColor: TRADING_CATEGORY_TO_ACCENT[key],
      winRate: winRateDecimal(aggregate.wins, aggregate.totalCycles),
      avgPnlPct: aggregate.avgPnl,
    };
  });
}

function symbolRankingsFromStats(rows: ProofStatsAggregateRow[], period: ProofPeriod) {
  const timeinterval = timeintervalForPeriod(period);
  const bySymbol = new Map<string, { entries: number; pnlPctSum: number }>();

  for (const row of rows) {
    if (
      row.scope !== 'symbol' ||
      row.category !== 'standard' ||
      row.timeinterval !== timeinterval ||
      !row.symbol
    ) {
      continue;
    }

    const symbol = row.symbol.trim().toUpperCase();
    const current = bySymbol.get(symbol) ?? { entries: 0, pnlPctSum: 0 };
    current.entries += numberFromStats(row.entries);
    current.pnlPctSum += numberFromStats(row.pnl_pct_sum);
    bySymbol.set(symbol, current);
  }

  const ranked = Array.from(bySymbol.entries())
    .map(([symbol, stats]) => ({
      symbol,
      avgPnlPct: stats.entries > 0 ? parseFloat((stats.pnlPctSum / stats.entries).toFixed(2)) : 0,
      cycleCount: stats.entries,
    }))
    .filter((row) => row.cycleCount > 0)
    .sort((a, b) => b.avgPnlPct - a.avgPnlPct);

  const top = ranked.slice(0, SYMBOL_RANK_COUNT).map((row, i) => ({
    rank: i + 1,
    symbol: row.symbol,
    avgPnlPct: row.avgPnlPct,
    cycleCount: row.cycleCount,
    hasProofLink: true,
  }));

  const bottom = ranked
    .slice(-SYMBOL_RANK_COUNT)
    .reverse()
    .map((row, i) => ({
      rank: i + 1,
      symbol: row.symbol,
      avgPnlPct: row.avgPnlPct,
      cycleCount: row.cycleCount,
      hasProofLink: true,
    }));

  return { top, bottom, ranked };
}

export function buildEmptyProofPage(period: ProofPeriod): ProofPageMock {
  const totalStats = buildTotalStats([]);

  return {
    header: {
      generatedAtLabel: '데이터 없음',
      headline: '집계할 청산 사이클이 없습니다',
      subtitle: `선택 기간(${PERIOD_LABELS[period]})에 signal_cycles 청산 기록이 없습니다`,
      currentPeriod: period,
    },
    kpi: {
      winRate: { value: 0, winCount: 0, lossCount: 0, total: 0 },
      avgPnlPct: 0,
      totalCycles: 0,
      bestSymbol: { symbol: '—', avgPnlPct: 0, cycleCount: 0 },
    },
    engines: [
      {
        engine: 'PULSE',
        barInterval: '1m',
        subtitle: '1분 봉 · 단기',
        winRate: 0,
        avgPnlPct: 0,
        cycleCount: 0,
      },
      {
        engine: 'WAVE',
        barInterval: '10m',
        subtitle: '10분 봉 · 중기',
        winRate: 0,
        avgPnlPct: 0,
        cycleCount: 0,
      },
    ],
    strategies: TRADING_CATEGORY_ORDER.map((key) => ({
      key,
      displayName: TRADING_CATEGORY_LABEL[key],
      accentColor: TRADING_CATEGORY_TO_ACCENT[key],
      winRate: 0,
      avgPnlPct: 0,
    })),
    topSymbols: [],
    bottomSymbols: [],
    timeline: { dots: [], total: 0, displayCount: 0 },
    archiveLinks: [
      {
        symbol: 'MORE',
        shortName: '전체 목록 →',
        avgPnlPct: 0,
        href: '/proof/symbols',
      },
    ],
    simulator: buildSimulatorData(totalStats),
    totalStats,
    symbolStats: [],
    buckets: EMPTY_BUCKETS,
    footerNote: 'signal_cycles 청산 데이터가 누적되면 여기에 표시됩니다',
  };
}

export function buildProofPageData(rows: PlatformCycleRow[], period: ProofPeriod): ProofPageMock {
  if (rows.length === 0) {
    return buildEmptyProofPage(period);
  }

  const periodRows = filterByPeriod(rows, period);
  const defaultRows = filterStatsRows(rows, ['PULSE', 'WAVE'], ['trend', 'nonTrend', 'reversal']);
  const totalStats = buildTotalStats(defaultRows);
  const symbolStats = buildSymbolStats(defaultRows);
  const stats = aggregateProofBoard(periodRows);
  const { top, bottom, ranked } = symbolRankings(periodRows);
  const overall = stats.overall;
  const lossCount = overall.totalCycles - overall.wins;
  const best = ranked[0];

  return {
    header: {
      generatedAtLabel: formatGeneratedAtLabel(),
      headline: '우리 시그널이 실제로 어떻게 작동했나',
      subtitle: '모든 사이클은 오픈/청산 시점이 기록되며, 손실 사이클도 그대로 포함됩니다',
      currentPeriod: period,
    },
    kpi: {
      winRate: {
        value: winRateDecimal(overall.wins, overall.totalCycles),
        winCount: overall.wins,
        lossCount,
        total: overall.totalCycles,
      },
      avgPnlPct: overall.avgPnl,
      totalCycles: overall.totalCycles,
      bestSymbol: best
        ? {
            symbol: best.symbol,
            avgPnlPct: best.avgPnlPct,
            cycleCount: best.cycleCount,
          }
        : { symbol: '—', avgPnlPct: 0, cycleCount: 0 },
    },
    engines: [
      {
        engine: 'PULSE',
        barInterval: '1m',
        subtitle: '1분 봉 · 단기',
        winRate: winRateDecimal(stats.pulse.wins, stats.pulse.totalCycles),
        avgPnlPct: stats.pulse.avgPnl,
        cycleCount: stats.pulse.totalCycles,
      },
      {
        engine: 'WAVE',
        barInterval: '10m',
        subtitle: '10분 봉 · 중기',
        winRate: winRateDecimal(stats.wave.wins, stats.wave.totalCycles),
        avgPnlPct: stats.wave.avgPnl,
        cycleCount: stats.wave.totalCycles,
      },
    ],
    strategies: tradingCategoryStats(periodRows),
    topSymbols: top,
    bottomSymbols: bottom,
    timeline: buildTimeline(periodRows),
    archiveLinks: buildArchiveLinks(ranked),
    simulator: buildSimulatorData(totalStats),
    totalStats,
    symbolStats,
    buckets: buildProofBuckets(rows),
    footerNote: '모든 사이클은 signal_cycles 청산 기록 기준 · 엔진 PULSE(1분 봉) · WAVE(10분 봉)',
  };
}

export function buildProofPageDataFromStats(
  statsRows: ProofStatsAggregateRow[],
  period: ProofPeriod
): ProofPageMock {
  const buckets = proofStatsRowsToBuckets(statsRows);
  if (Object.keys(buckets.total).length === 0) {
    return buildEmptyProofPage(period);
  }

  const totalStats = reconstructTotalStats(
    buckets,
    DEFAULT_STATS_STREAMS,
    DEFAULT_STATS_TREND_MODES,
    TRADING_CATEGORY_ORDER
  );
  const symbolStats = reconstructSymbolStats(
    buckets,
    DEFAULT_STATS_STREAMS,
    DEFAULT_STATS_TREND_MODES,
    TRADING_CATEGORY_ORDER
  );
  const periodRows = standardStatsRowsForPeriod(statsRows, period);
  const overall = aggregateStatsRows(periodRows);
  const { top, bottom, ranked } = symbolRankingsFromStats(statsRows, period);
  const best = ranked[0];

  return {
    header: {
      generatedAtLabel: formatGeneratedAtLabel(),
      headline: '우리 시그널이 실제로 어떻게 작동했나',
      subtitle: '모든 사이클은 오픈/청산 시점이 기록되며, 손실 사이클도 그대로 포함됩니다',
      currentPeriod: period,
    },
    kpi: {
      winRate: {
        value: winRateDecimal(overall.wins, overall.totalCycles),
        winCount: overall.wins,
        lossCount: overall.totalCycles - overall.wins,
        total: overall.totalCycles,
      },
      avgPnlPct: overall.avgPnl,
      totalCycles: overall.totalCycles,
      bestSymbol: best
        ? {
            symbol: best.symbol,
            avgPnlPct: best.avgPnlPct,
            cycleCount: best.cycleCount,
          }
        : { symbol: '-', avgPnlPct: 0, cycleCount: 0 },
    },
    engines: buildEnginesFromStats(statsRows, period),
    strategies: tradingCategoryStatsFromStats(statsRows, period),
    topSymbols: top,
    bottomSymbols: bottom,
    timeline: { dots: [], total: overall.totalCycles, displayCount: 0 },
    archiveLinks: buildArchiveLinks(ranked),
    simulator: buildSimulatorData(totalStats),
    totalStats,
    symbolStats,
    buckets,
    footerNote: '모든 사이클은 proof_stats 집계 기준 · 엔진 PULSE(1분 봉) · WAVE(10분 봉)',
  };
}
