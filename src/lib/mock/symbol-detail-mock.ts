/**
 * 종목상세 전용 Mock — StrategyDashboard / WinLoss / 통계 테이블 (SRD-002)
 */
import type { SectionBadgeId } from '@/types/section-badge';
import {
  ALL_SIGNALS,
  PERIOD_RETURNS,
  SYMBOL_LIST,
  SYMBOL_STATS,
  mockBasePriceRow,
  type MockSignal,
} from '@/lib/mock/realistic-data';

export function findMockSignalForSymbol(symbol: string): MockSignal | undefined {
  return ALL_SIGNALS.find((s) => s.symbol === symbol);
}

export interface StrategyCardMock {
  id: string;
  label: string;
  winPct: number;
  retPct: number;
  count: number;
  /** 신뢰도 점수 0–150 스케일 */
  confidence: number;
  bestFit: boolean;
}

export interface StrategyDashboardMock {
  longPct: number;
  shortPct: number;
  headlineConfidence: number;
  winRate: number;
  winLabel: string;
  periodReturnPct: number;
  cards: StrategyCardMock[];
  hint: string;
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getStrategyDashboardMock(symbol: string): StrategyDashboardMock {
  const h = hashSymbol(symbol);
  const longPct = 52 + (h % 36);
  const shortPct = 100 - longPct;
  const st = SYMBOL_STATS[symbol];
  const wr = st?.win_rate ?? 65;
  const trades = st?.total_trades ?? 20;
  const wins = Math.round((trades * wr) / 100);
  const pr = PERIOD_RETURNS[symbol]?.['7d'] ?? 2.1;
  const hc = 70 + (h % 45);

  const cards: StrategyCardMock[] = [
    { id: 'oneshot', label: '원샷', winPct: 70, retPct: 1.8, count: 8, confidence: 95, bestFit: false },
    { id: 'deepbuy', label: '딥바이', winPct: 78, retPct: 2.5, count: 6, confidence: 120, bestFit: true },
    { id: 'safe', label: '세이프', winPct: 74, retPct: 2.1, count: 7, confidence: 88, bestFit: false },
    { id: 'allin', label: '올플랜', winPct: 65, retPct: 1.2, count: 4, confidence: 72, bestFit: false },
  ];

  return {
    longPct,
    shortPct,
    headlineConfidence: hc,
    winRate: wr,
    winLabel: `${wins}/${trades}`,
    periodReturnPct: pr,
    cards,
    hint: '현재 시장(횡보장)에서 딥바이 전략이 가장 적합합니다',
  };
}

export interface WinLossDotMock {
  win: boolean;
  pnlPct: number;
  label: string;
}

export function getWinLossTimelineMock(symbol: string): { dots: WinLossDotMock[]; wins: number; losses: number } {
  const h = hashSymbol(symbol);
  const pattern: boolean[] = [true, true, false, true, false, true, true, false, false, true];
  const dots: WinLossDotMock[] = pattern.map((win, i) => {
    const pnlPct = win
      ? +((1.2 + ((h + i * 3) % 20) / 10).toFixed(1))
      : +(-(0.5 + ((h + i) % 8) / 10).toFixed(1));
    const d = new Date();
    d.setDate(d.getDate() - (9 - i));
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    return { win, pnlPct, label };
  });
  const wins = dots.filter((d) => d.win).length;
  return { dots, wins, losses: dots.length - wins };
}

/** 로그인 시 BTCUSDT만 데모 포지션 (MVP Mock) — PositionCard MockOpenPosition과 필드 정합 */
export function getMockOpenPosition(
  symbol: string,
  isLoggedIn: boolean,
): import('@/components/shared/PositionCard').MockOpenPosition | null {
  if (!isLoggedIn || symbol !== 'BTCUSDT') return null;
  const entryPrice = 72200;
  const currentPrice = mockBasePriceRow(symbol)?.price ?? 72800;
  const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
  const amountUsd = 200;
  const pnlUsd = (amountUsd * pnlPct) / 100;
  return {
    side: 'LONG',
    entryPrice,
    currentPrice,
    pnlPct: +pnlPct.toFixed(2),
    pnlUsd: +pnlUsd.toFixed(2),
    amountUsd,
    leverage: 3,
    openedLabel: '2시간 전',
  };
}

export type PeriodCol = '1D' | '7D' | '30D' | '90D';

export interface PeriodStatsRow {
  metric: string;
  d1: string;
  d7: string;
  d30: string;
  d90: string;
}

export interface CycleBarMock {
  dir: 'LONG' | 'SHORT';
  pnlPct: number;
  holdMin: number;
}

export function getCycleTimelineMock(symbol: string): CycleBarMock[] {
  const h = hashSymbol(symbol);
  return Array.from({ length: 10 }, (_, i) => ({
    dir: (h + i) % 3 === 0 ? ('SHORT' as const) : ('LONG' as const),
    pnlPct: +((((h + i * 7) % 17) - 8) / 3).toFixed(1),
    holdMin: 12 + ((h + i * 11) % 180),
  }));
}

export function getOverviewKpis(symbol: string): {
  win7: number;
  ret7: number;
  signals7: number;
  pnl7: number;
} {
  const st = SYMBOL_STATS[symbol];
  const pr = PERIOD_RETURNS[symbol]?.['7d'] ?? 0;
  return {
    win7: st?.win_rate ?? 0,
    ret7: pr,
    signals7: st?.total_trades ?? 0,
    pnl7: st?.avg_pnl ?? 0,
  };
}

/** Zone 1-2 시그널 평가 — 24h → 72h 순서 (SRD-002) */
export interface SignalEvaluationPeriodMock {
  winRate: number;
  returnPct: number;
}

export interface SignalEvaluationMock {
  h24: SignalEvaluationPeriodMock;
  h72: SignalEvaluationPeriodMock;
}

export function getSignalEvaluationMock(symbol: string): SignalEvaluationMock {
  const h = hashSymbol(symbol);
  return {
    h24: {
      winRate: 55 + (h % 12),
      returnPct: +((0.3 + (h % 17) / 10).toFixed(1)),
    },
    h72: {
      winRate: 60 + (h % 18),
      returnPct: +((1.2 + (h % 23) / 10).toFixed(1)),
    },
  };
}

/** Zone 3 시장 데이터 한 행 Mock (Fear&Greed 제외) */
export interface MarketDataRowMock {
  volume24h: string;
  low24h: string;
  high24h: string;
  openInterest: string;
  fundingPct: string;
  longShort: string;
}

export function getMarketDataRowMock(symbol: string): MarketDataRowMock {
  const row = mockBasePriceRow(symbol);
  const h = hashSymbol(symbol);
  const lo = row?.dailyRange[0] ?? 70000;
  const hi = row?.dailyRange[1] ?? 73000;
  return {
    volume24h: row?.dailyVolume ?? '—',
    low24h: `$${lo.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    high24h: `$${hi.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    openInterest: `${18 + (h % 8)}B`,
    fundingPct: `${((h % 20) / 100 - 0.05).toFixed(2)}%`,
    longShort: `${52 + (h % 8)}/${48 - (h % 8)}`,
  };
}

/** Zone 5 이전 사이클 요약 Mock */
export interface CycleHistorySummaryMock {
  dots: WinLossDotMock[];
  wins: number;
  losses: number;
  aggReturnPct: number;
  aggWinRate: number;
  pnlUsd: number;
  confidence: number;
}

export function getCycleHistorySummaryMock(symbol: string): CycleHistorySummaryMock {
  const { dots: all } = getWinLossTimelineMock(symbol);
  const dots = all.slice(0, 5);
  const wins = dots.filter((d) => d.win).length;
  const h = hashSymbol(symbol);
  return {
    dots,
    wins,
    losses: dots.length - wins,
    aggReturnPct: +((2.1 + (h % 15) / 10).toFixed(1)),
    aggWinRate: 55 + (h % 20),
    pnlUsd: 120 + (h % 200),
    confidence: 70 + (h % 25),
  };
}

/** MockSignal.section → 5뱃지 활성 키 */
export function mapSignalSectionToBadgeId(section: MockSignal['section'] | undefined): SectionBadgeId {
  if (section === 'non_trend') return 'non_trend';
  if (section === 'profit_taking') return 'profit_taking';
  if (section === 'discount_entry') return 'discount_entry';
  return 'waiting_entry';
}

/** 신선도 2축 + 점수 (SRD-002 v5 목업) */
export function getFreshnessBarMock(symbol: string): {
  score: number;
  axisALabel: string;
  axisAValue: number;
  axisBLabel: string;
  axisBValue: number;
} {
  const h = hashSymbol(symbol);
  return {
    score: 42 + (h % 48),
    axisALabel: '시간 감쇠',
    axisAValue: 35 + (h % 45),
    axisBLabel: '시장 반응',
    axisBValue: 30 + ((h * 3) % 55),
  };
}

/** Zone 1 헤드라인 신뢰도 0–150 */
export function getZone1ConfidenceScore(symbol: string): number {
  return getStrategyDashboardMock(symbol).headlineConfidence;
}

export function getPeriodStatsTable(symbol: string): PeriodStatsRow[] {
  const row = mockBasePriceRow(symbol);
  const st = SYMBOL_STATS[symbol];
  const pr = PERIOD_RETURNS[symbol];
  const list = SYMBOL_LIST.find((s) => s.symbol === symbol);
  const d1r = list?.change24h ?? 0.67;
  const d7 = pr?.['7d'] ?? 8.79;
  const d30 = pr?.['30d'] ?? 3.8;
  const d90 = pr?.['90d'] ?? -19.52;

  const vol1 = row?.dailyVolume ?? '—';
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

  const sig1 = 1 + (hashSymbol(symbol) % 4);
  const sig7 = st?.total_trades ?? 25;
  const sig30 = Math.round(sig7 * 3.8);
  const sig90 = Math.round(sig7 * 11.2);

  const wr1 = 55 + (hashSymbol(symbol) % 12);
  const wr7 = st?.win_rate ?? 72;
  const wr30 = wr7 - (hashSymbol(symbol) % 6);
  const wr90 = wr30 - (hashSymbol(symbol) % 5);

  const ap1 = +(1 + (hashSymbol(symbol) % 8) / 10).toFixed(1);
  const ap7 = st?.avg_pnl ?? 2.1;

  return [
    { metric: '수익률', d1: fmtPct(Number(d1r)), d7: fmtPct(d7), d30: fmtPct(d30), d90: fmtPct(d90) },
    { metric: '거래량', d1: vol1, d7: '62.3B', d30: '267B', d90: '801B' },
    { metric: '시그널 수', d1: String(sig1), d7: String(sig7), d30: String(sig30), d90: String(sig90) },
    { metric: '승률', d1: `${wr1}%`, d7: `${wr7}%`, d30: `${wr30}%`, d90: `${wr90}%` },
    { metric: '평균 PnL', d1: `+${ap1}%`, d7: `+${ap7}%`, d30: `+${(ap7 * 0.85).toFixed(1)}%`, d90: `+${(ap7 * 0.7).toFixed(1)}%` },
  ];
}
