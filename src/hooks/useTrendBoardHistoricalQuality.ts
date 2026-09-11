import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { TrendEngine } from '@/lib/trend-v8/compact-trend-board';
import {
  normalizeTradingCategory,
  type TradingCategory,
} from '@/lib/trading-category';
import {
  normalizeSignalTrendMode,
  type SignalTrendMode,
} from '@/lib/signal-trend-mode';

export type TrendBoardHistoricalTrendMode = SignalTrendMode;

export type TrendBoardHistoricalQualityStat = {
  symbol: string;
  engine: TrendEngine;
  tradingCategory: TradingCategory;
  trendMode: TrendBoardHistoricalTrendMode;
  period: 'last30d' | 'last3mo' | 'all';
  sampleSize: number;
  winCount: number;
  lossCount: number;
  winPnlSum: number;
  lossPnlAbsSum: number;
};

export type TrendBoardHistoricalQualityLookup = Map<string, TrendBoardHistoricalQualityStat>;

type HistoricalQualityRpcRow = {
  symbol?: unknown;
  barinterval?: unknown;
  trading_category?: unknown;
  trend?: unknown;
  timeinterval?: unknown;
  entries?: unknown;
  win_count?: unknown;
  loss_count?: unknown;
  wins_pnl_pct_sum?: unknown;
  losses_pnl_pct_abs_sum?: unknown;
};

const HISTORICAL_QUALITY_REFRESH_MS = 60_000;
const EMPTY_HISTORICAL_QUALITY = new Map<string, TrendBoardHistoricalQualityStat>();

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveInteger(value: unknown): number {
  return Math.max(0, Math.trunc(finiteNumber(value)));
}

function engineFromBarinterval(value: unknown): TrendEngine | null {
  if (value === '1m') return 'pulse';
  if (value === '10m') return 'wave';
  return null;
}

function trendModeFromValue(value: unknown): TrendBoardHistoricalTrendMode | null {
  return normalizeSignalTrendMode(value);
}

function periodFromValue(value: unknown): 'last30d' | 'last3mo' | 'all' | null {
  if (value === 'last_30d') return 'last30d';
  if (value === 'last_3mo') return 'last3mo';
  if (value === 'all_time') return 'all';
  return null;
}

export function trendBoardHistoricalQualityKey(
  symbol: string,
  engine: TrendEngine,
  tradingCategory: TradingCategory,
  trendMode: TrendBoardHistoricalTrendMode,
  period: 'last30d' | 'last3mo' | 'all'
): string {
  return [
    symbol.trim().toUpperCase(),
    engine,
    tradingCategory,
    trendMode,
    period,
  ].join('|');
}

function mapHistoricalQualityRow(raw: HistoricalQualityRpcRow): TrendBoardHistoricalQualityStat | null {
  const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim().toUpperCase() : '';
  const engine = engineFromBarinterval(raw.barinterval);
  const tradingCategory = normalizeTradingCategory(raw.trading_category);
  const trendMode = trendModeFromValue(raw.trend);
  const period = periodFromValue(raw.timeinterval);

  if (!symbol || !engine || !tradingCategory || !trendMode || !period) return null;

  return {
    symbol,
    engine,
    tradingCategory,
    trendMode,
    period,
    sampleSize: positiveInteger(raw.entries),
    winCount: positiveInteger(raw.win_count),
    lossCount: positiveInteger(raw.loss_count),
    winPnlSum: finiteNumber(raw.wins_pnl_pct_sum),
    lossPnlAbsSum: finiteNumber(raw.losses_pnl_pct_abs_sum),
  };
}

function buildHistoricalQualityLookup(rows: readonly HistoricalQualityRpcRow[]): TrendBoardHistoricalQualityLookup {
  const lookup = new Map<string, TrendBoardHistoricalQualityStat>();

  for (const raw of rows) {
    const row = mapHistoricalQualityRow(raw);
    if (!row) continue;
    const key = trendBoardHistoricalQualityKey(
      row.symbol,
      row.engine,
      row.tradingCategory,
      row.trendMode,
      row.period
    );
    const existing = lookup.get(key);
    lookup.set(
      key,
      existing
        ? {
            ...row,
            sampleSize: existing.sampleSize + row.sampleSize,
            winCount: existing.winCount + row.winCount,
            lossCount: existing.lossCount + row.lossCount,
            winPnlSum: existing.winPnlSum + row.winPnlSum,
            lossPnlAbsSum: existing.lossPnlAbsSum + row.lossPnlAbsSum,
          }
        : row
    );
  }

  return lookup;
}

function normalizeSymbols(symbols: readonly string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))].sort();
}

export function useTrendBoardHistoricalQuality(
  symbols: readonly string[],
  enabled: boolean
): TrendBoardHistoricalQualityLookup {
  const symbolKey = useMemo(() => normalizeSymbols(symbols).join('|'), [symbols]);
  const [qualityLookup, setQualityLookup] =
    useState<TrendBoardHistoricalQualityLookup>(EMPTY_HISTORICAL_QUALITY);

  useEffect(() => {
    const symbolList = symbolKey ? symbolKey.split('|') : [];
    if (!enabled || symbolList.length === 0) {
      setQualityLookup(EMPTY_HISTORICAL_QUALITY);
      return;
    }

    let cancelled = false;

    async function loadHistoricalQuality() {
      const { data, error } = await supabase
        .from('proof_stats')
        .select(
          'symbol,barinterval,trading_category,trend,timeinterval,entries,win_count,loss_count,wins_pnl_pct_sum,losses_pnl_pct_abs_sum'
        )
        .eq('scope', 'symbol')
        .in('category', ['standard', 'discounted'])
        .eq('trading_category', 'E2X2')
        .eq('trend', 'reversal')
        .in('timeinterval', ['last_30d', 'last_3mo', 'all_time'])
        .in('symbol', symbolList);

      if (cancelled) return;

      if (error) {
        console.warn('[useTrendBoardHistoricalQuality] failed to load proof_stats:', error);
        setQualityLookup(EMPTY_HISTORICAL_QUALITY);
        return;
      }

      setQualityLookup(
        buildHistoricalQualityLookup(Array.isArray(data) ? (data as HistoricalQualityRpcRow[]) : [])
      );
    }

    void loadHistoricalQuality();
    const intervalId = window.setInterval(() => {
      void loadHistoricalQuality();
    }, HISTORICAL_QUALITY_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [enabled, symbolKey]);

  return qualityLookup;
}
