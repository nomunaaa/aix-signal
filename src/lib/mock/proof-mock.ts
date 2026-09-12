// AiXSignal 수익인증 페이지 Mock 데이터 스키마 — AIX-4 + AIX-52

import type { StrategyAccentColor } from '@/lib/strategy-display';
import type { TradingCategory } from '@/lib/proof-platform-aggregate';
import type { ProofBuckets } from '@/lib/proof/proof-buckets';
import type { SignalTrendMode } from '@/lib/signal-trend-mode';

export type ProofPeriod = '7d' | '30d' | '90d' | 'all';

export const PERIOD_LABELS: Record<ProofPeriod, string> = {
  '7d': '7일',
  '30d': '30일',
  '90d': '3개월',
  all: '전체',
};

export interface ProofHeader {
  generatedAtLabel: string;
  headline: string;
  subtitle: string;
  currentPeriod: ProofPeriod;
}

export interface ProofKpi {
  winRate: {
    value: number;
    winCount: number;
    lossCount: number;
    total: number;
  };
  avgPnlPct: number;
  totalCycles: number;
  bestSymbol: {
    symbol: string;
    avgPnlPct: number;
    cycleCount: number;
  };
}

export interface EngineStats {
  engine: 'PULSE' | 'WAVE';
  barInterval: '1m' | '10m';
  subtitle: string;
  winRate: number;
  avgPnlPct: number;
  cycleCount: number;
}

export interface StrategyStats {
  key: TradingCategory;
  displayName: string;
  accentColor: StrategyAccentColor;
  winRate: number;
  avgPnlPct: number;
}

export interface SymbolPerformance {
  rank: number;
  symbol: string;
  avgPnlPct: number;
  cycleCount: number;
  hasProofLink: boolean;
}

export interface CycleDot {
  cycleId: string;
  isWin: boolean;
  pnlPct: number;
  symbol: string;
  closedAt: string;
}

export interface CycleTimeline {
  dots: CycleDot[];
  total: number;
  displayCount: number;
}

export interface SymbolArchiveLink {
  symbol: string;
  shortName: string;
  avgPnlPct: number;
  href: string;
}

export type ProofStatsRowKey = 'standard' | 'discounted';
export type ProofStatsStream = 'PULSE' | 'WAVE';
export type ProofStatsTrendMode = SignalTrendMode;

export interface ProofCycleStatsSlice {
  cycleCount: number;
  asOfIso?: string | null;
  pnlPctSum: number;
  /**
   * Sum of each cycle's realized PnL divided by the configured single-entry
   * notional. This preserves DCA cycles as two notional legs for USD projection.
   */
  pnlPerEntryNotionalRateSum: number;
  entryLegCountSum: number;
  maxPnlPct: number;
  minPnlPct: number;
  maxPnlPerEntryNotionalRate: number;
  minPnlPerEntryNotionalRate: number;
  winRate: number;
  winLossRatio: number | null;
  avgHoldSec: number | null;
}

export interface ProofSimulatorScenario {
  key: ProofStatsRowKey;
  label: string;
  badge: string;
  recent30: ProofCycleStatsSlice;
}

export interface ProofTotalStatsRow {
  key: ProofStatsRowKey;
  label: string;
  recent30: ProofCycleStatsSlice;
  recent3mo: ProofCycleStatsSlice;
  total: ProofCycleStatsSlice;
}

export interface ProofSymbolStatsRow {
  symbol: string;
  shortName: string;
  recent30Total: ProofCycleStatsSlice;
  recent3moTotal: ProofCycleStatsSlice;
  recent30Discounted: ProofCycleStatsSlice;
  recent3moDiscounted: ProofCycleStatsSlice;
  recent30Combined: ProofCycleStatsSlice;
  recent3moCombined: ProofCycleStatsSlice;
  standard: ProofCycleStatsSlice;
  discounted: ProofCycleStatsSlice;
  combined: ProofCycleStatsSlice;
}

export interface ProofSimulationData {
  monthlyFeeUsd: number;
  yearlyFeeUsd: number;
  scenarios: [ProofSimulatorScenario, ProofSimulatorScenario];
}

export interface ProofPageMock {
  header: ProofHeader;
  kpi: ProofKpi;
  engines: [EngineStats, EngineStats];
  strategies: StrategyStats[];
  topSymbols: SymbolPerformance[];
  bottomSymbols: SymbolPerformance[];
  timeline: CycleTimeline;
  archiveLinks: SymbolArchiveLink[];
  simulator: ProofSimulationData;
  totalStats: [ProofTotalStatsRow, ProofTotalStatsRow];
  symbolStats: ProofSymbolStatsRow[];
  /** Small additive stats cube (stream x trendMode x category x window) — client
   * reconstructs totalStats/symbolStats/simulator for any filter combo by summing
   * the matching buckets, instead of the server shipping/precomputing every
   * combination up front. See src/lib/proof/proof-buckets.ts. */
  buckets: ProofBuckets;
  footerNote: string;
}
