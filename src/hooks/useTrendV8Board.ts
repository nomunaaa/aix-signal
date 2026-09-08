'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EngineMode } from '@/domain/trend/boardTypes';
import { useTrendBoard } from '@/hooks/useTrendBoard';
import type { SymbolAnalysis } from '@/lib/mock/trend-v8-mock';
import {
  engineModeToBarInterval,
  trendBoardCardToSymbolAnalysis,
} from '@/lib/trend-v8/trend-board-to-v8';
import {
  getHighConfidenceSymbols,
  sortCompactTrendRows,
  type CompactTrendSort,
  type TrendEngine,
} from '@/lib/trend-v8/compact-trend-board';
import {
  filterTrendV8ControlRows,
  type TrendConditionId,
  type TrendDirectionTab,
} from '@/lib/trend-v8/trend-v8-control-filters';
import { useSymbolStore } from '@/stores/symbolStore';
import { useThrottledSymbolStoreRevision } from '@/hooks/useThrottledSymbolStoreRevision';
import { BINANCE_API } from '@/config/api';

const TREND_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'APTUSDT', 'ARBUSDT', 'ATOMUSDT', 'AVAXUSDT',
  'BCHUSDT', 'DOGEUSDT', 'DOTUSDT', 'FILUSDT', 'GALAUSDT',
  'INJUSDT', 'LDOUSDT', 'LINKUSDT', 'LTCUSDT', 'NEARUSDT',
  'OPUSDT', 'POLUSDT', 'PYTHUSDT', 'SANDUSDT', 'SEIUSDT',
  'STXUSDT', 'SUIUSDT', 'TONUSDT', 'UNIUSDT', 'ZECUSDT',
] as const;

function trendEngineToMode(engine: TrendEngine): EngineMode {
  return engine === 'pulse' ? EngineMode.PULSE : EngineMode.WAVE;
}

async function fetchBinance24hQuoteVolumes(
  symbols: readonly string[]
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const res = await fetch(`${BINANCE_API.REST_FUTURES}/ticker/24hr`);
    if (!res.ok) return out;
    const rows = (await res.json()) as Array<{ symbol?: string; quoteVolume?: string }>;
    const wanted = new Set(symbols);
    for (const row of rows) {
      if (!row.symbol || !wanted.has(row.symbol)) continue;
      const vol = Number.parseFloat(String(row.quoteVolume ?? '0'));
      if (Number.isFinite(vol)) out.set(row.symbol, vol);
    }
  } catch {
    /* volume sort falls back to 0 */
  }
  return out;
}

export function useTrendV8Board(
  engine: TrendEngine,
  sort: CompactTrendSort,
  direction: TrendDirectionTab,
  conditions: ReadonlySet<TrendConditionId>,
  favorites: ReadonlySet<string>,
  allowedSymbols?: readonly string[]
) {
  const engineMode = trendEngineToMode(engine);
  const barInterval = engineModeToBarInterval(engineMode);
  const { cards, loading, error, refetch } = useTrendBoard(engineMode);
  const trendSymbols = useMemo(
    () => (allowedSymbols ?? TREND_SYMBOLS).filter((symbol) => TREND_SYMBOLS.includes(symbol as typeof TREND_SYMBOLS[number])),
    [allowedSymbols],
  );
  const trendSymbolSet = useMemo(() => new Set(trendSymbols), [trendSymbols]);

  const [volumes, setVolumes] = useState<Map<string, number>>(() => new Map());
  const [volumeReady, setVolumeReady] = useState(false);

  useEffect(() => {
    if (trendSymbols.length === 0) {
      setVolumes(new Map());
      setVolumeReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const map = await fetchBinance24hQuoteVolumes(trendSymbols);
      if (!cancelled) {
        setVolumes(map);
        setVolumeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trendSymbols]);

  const storeRevision = useThrottledSymbolStoreRevision();

  const symbolRows = useMemo((): SymbolAnalysis[] => {
    void storeRevision;
    const store = useSymbolStore.getState();
    return cards.filter((card) => trendSymbolSet.has(card.symbol)).map((card) => {
      const cycle = store.getSignalCycle(card.symbol, barInterval);
      const volume24hUsdt = volumes.get(card.symbol) ?? 0;
      return trendBoardCardToSymbolAnalysis(card, volume24hUsdt, cycle);
    });
  }, [cards, barInterval, volumes, storeRevision, trendSymbolSet]);

  const filteredRows = useMemo(
    () =>
      filterTrendV8ControlRows(symbolRows, {
        direction,
        conditions,
        favorites,
        engine,
      }),
    [symbolRows, direction, conditions, favorites, engine]
  );

  const rows = useMemo(
    () => sortCompactTrendRows(filteredRows, engine, sort),
    [filteredRows, engine, sort]
  );

  const highConfidenceSymbols = useMemo(
    () => getHighConfidenceSymbols(filteredRows, engine, sort),
    [filteredRows, engine, sort]
  );

  const updatedAtLabel = useMemo(() => {
    if (rows.length === 0) return '';
    const store = useSymbolStore.getState();
    const ts =
      barInterval === '1m'
        ? store.getSymbol(rows[0].symbol)?.trendTs1m
        : store.getSymbol(rows[0].symbol)?.trendTs10m;
    return ts || '';
  }, [rows, barInterval, storeRevision]);

  const refresh = useCallback(() => {
    if (trendSymbols.length === 0) return;
    void useSymbolStore.getState().initialize([...trendSymbols]);
    refetch();
    void fetchBinance24hQuoteVolumes(trendSymbols).then(setVolumes);
  }, [refetch, trendSymbols]);

  return {
    rows,
    highConfidenceSymbols,
    loading: trendSymbols.length > 0 && (loading || !volumeReady),
    error,
    updatedAtLabel,
    refresh,
  };
}
