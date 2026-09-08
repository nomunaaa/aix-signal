/**
 * useTrendBoard Hook
 * Trend Board v2 data provider
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSymbolStore } from '@/stores/symbolStore';
import { 
  TrendBoardCard, 
  EngineMode, 
  SortMode, 
  TrendBoardFilter,
  PulseScenarioType,
  WaveScenarioType,
  TrendDirection,
  VolatilityLevel,
} from '@/domain/trend/boardTypes';
import { sortTrendCards, filterTrendCards } from '@/domain/trend/boardSorting';

// useTrendBoard(PULSE)/useTrendBoard(WAVE)가 동시에 마운트되면 이 RPC를 완전히
// 동일한 인자로 두 번 호출한다(30일 통계는 engine과 무관). 분(1분) 단위로 키를
// 묶어 거의 동시에 발생하는 두 호출이 하나의 in-flight promise를 공유하게 한다.
type PriceStats30d = Map<string, { highest: number; lowest: number; vwap: number }>;
let priceStats30dCacheKey: string | null = null;
let priceStats30dPromise: Promise<PriceStats30d> | null = null;

async function fetchPriceStats30dShared(
  symbols: readonly string[],
  thirtyDaysAgo: number
): Promise<PriceStats30d> {
  const cacheKey = `${symbols.join(',')}|${Math.floor(thirtyDaysAgo / 60_000)}`;
  if (cacheKey === priceStats30dCacheKey && priceStats30dPromise) {
    return priceStats30dPromise;
  }

  priceStats30dCacheKey = cacheKey;
  priceStats30dPromise = (async () => {
    const priceRanges: PriceStats30d = new Map();
    try {
      const { data: stats, error } = await (supabase.rpc as any)('get_price_stats_30d', {
        p_symbols: symbols,
        p_thirty_days_ago: thirtyDaysAgo,
      });

      if (!error && stats && Array.isArray(stats)) {
        stats.forEach((stat: any) => {
          if (stat.symbol) {
            priceRanges.set(stat.symbol, {
              highest: parseFloat(stat.highest30d) || 0,
              lowest: parseFloat(stat.lowest30d) || 0,
              vwap: parseFloat(stat.vwap30d) || 0,
            });
          }
        });
      } else if (error) {
        console.warn('Failed to fetch 30d price stats:', error);
      }
    } catch (err) {
      console.warn('Error fetching 30d price stats:', err);
    }
    return priceRanges;
  })();

  return priceStats30dPromise;
}

export interface UseTrendBoardReturn {
  cards: TrendBoardCard[];
  loading: boolean;
  error: string | null;
  sortMode: SortMode;
  filters: TrendBoardFilter;
  setSortMode: (mode: SortMode) => void;
  setFilters: (filters: TrendBoardFilter) => void;
  refetch: () => void;
}

/**
 * Trend Board
 */
export function useTrendBoard(engineMode: EngineMode): UseTrendBoardReturn {
  const [allCards, setAllCards] = useState<TrendBoardCard[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>(SortMode.HOT_OPPORTUNITY);
  const [filters, setFilters] = useState<TrendBoardFilter>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const symbols = useMemo(() => {
    return [
      'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
      'ADAUSDT', 'APTUSDT', 'ARBUSDT', 'ATOMUSDT', 'AVAXUSDT',
      'BCHUSDT', 'DOGEUSDT', 'DOTUSDT', 'FILUSDT', 'GALAUSDT',
      'INJUSDT', 'LDOUSDT', 'LINKUSDT', 'LTCUSDT', 'NEARUSDT',
      'OPUSDT', 'POLUSDT', 'PYTHUSDT', 'SANDUSDT', 'SEIUSDT',
      'STXUSDT', 'SUIUSDT', 'TONUSDT', 'UNIUSDT', 'ZECUSDT',
    ];
  }, []);

  const [storeInitialized, setStoreInitialized] = useState(false);
  
  useEffect(() => {
    const initStore = async () => {
      try {
        await useSymbolStore.getState().initialize(symbols);
        setStoreInitialized(true);
      } catch {
        setError('Store initialization failed');
      }
    };
    
    initStore();
  }, [symbols]);

  const fetchData = useCallback(async () => {
    if (!storeInitialized) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const barInterval = engineMode === EngineMode.PULSE ? '1m' : '10m';
      
      // Store-аас функцүүдийг шууд авах
      const store = useSymbolStore.getState();
      const storeGetTrend = store.getTrend;
      const storeGetVolatility = store.getVolatility;
      const storeGetPrice = store.getPrice;
      const storeGetDailyChange = store.getDailyChange;
      const storeGetHighest24h = store.getHighest24h;
      const storeGetLowest24h = store.getLowest24h;
      const storeGetSymbol = store.getSymbol;

      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      // engine과 무관한 통계이므로 pulse/wave 두 인스턴스가 동시에 호출해도
      // 공유 캐시(fetchPriceStats30dShared)가 실제 RPC 호출을 한 번으로 묶는다.
      const priceRanges = await fetchPriceStats30dShared(symbols, thirtyDaysAgo);

      // Бодит датагаар cards үүсгэх
      const cards: TrendBoardCard[] = symbols.map((symbol) => {
        const symbolData = storeGetSymbol(symbol);
        const trendShort = storeGetTrend(symbol, barInterval, 'short');
        const trendLong = storeGetTrend(symbol, barInterval, 'long');
        const volatility = storeGetVolatility(symbol, barInterval);
        const currentPrice = storeGetPrice(symbol);
        const dailyChange = storeGetDailyChange(symbol) || 0;
        const highest24h = storeGetHighest24h(symbol) || 0;
        const lowest24h = storeGetLowest24h(symbol) || 0;
        const priceRange = priceRanges.get(symbol);
        
        // Trend direction
        const shortTermTrend = trendShort !== null ? valueToTrendDirection(trendShort) : TrendDirection.FLAT;
        const longTermTrend = trendLong !== null ? valueToTrendDirection(trendLong) : TrendDirection.FLAT;
        const volatilityLevel = volatility !== null ? volatilityValueToLevel(Math.abs(volatility)) : VolatilityLevel.MEDIUM;
        
        // Price context
        const midPrice30d = priceRange ? (priceRange.highest + priceRange.lowest) / 2 : (currentPrice || 0);
        const vwap = priceRange?.vwap || (currentPrice || 0);
        const discountVs30dMidPct = currentPrice && midPrice30d > 0 
          ? ((currentPrice - midPrice30d) / midPrice30d) * 100 
          : 0;
        const vwapGapPct = currentPrice && vwap > 0 
          ? ((currentPrice - vwap) / vwap) * 100 
          : 0;
        
        // Noise score (volatility-аас тооцоолох)
        const volatilityValue = volatility !== null ? Math.abs(volatility) : 50;
        const noiseScore = Math.min(100, Math.max(0, volatilityValue));
        
        // Confidence & Upside calculation
        const trendAligned = shortTermTrend === longTermTrend && shortTermTrend !== TrendDirection.FLAT;
        const baseConfidence = 100 - noiseScore;
        const alignmentBonus = trendAligned ? 10 : 0;
        const confidence = Math.max(1, Math.min(100, baseConfidence + alignmentBonus));
        
        const pricePosition = highest24h > 0 && lowest24h > 0 && currentPrice
          ? (currentPrice - lowest24h) / (highest24h - lowest24h)
          : 0.5;
        const upsidePotentialPct = Math.round((1 - pricePosition) * 100);
        
        // Scenario determination
        const scenario = engineMode === EngineMode.PULSE 
          ? determinePulseScenario(upsidePotentialPct, confidence, vwapGapPct, volatilityValue)
          : determineWaveScenario(upsidePotentialPct, confidence, shortTermTrend, longTermTrend);
        
        // Direction (trend-ээс тодорхойлох)
        let direction: 'LONG' | 'SHORT' | 'NONE' = 'NONE';
        if (shortTermTrend === TrendDirection.UP && longTermTrend === TrendDirection.UP) {
          direction = 'LONG';
        } else if (shortTermTrend === TrendDirection.DOWN && longTermTrend === TrendDirection.DOWN) {
          direction = 'SHORT';
        } else {
          direction = 'NONE';
        }
        
        return {
          symbol,
          name: symbol.replace('USDT', ''),
          engineMode,
          groupA: {
            noiseScore,
            ancActive: noiseScore < 60,
            shortTermTrend,
            longTermTrend,
            volatility: volatilityLevel,
          },
          groupB: {
            currentPriceUsd: currentPrice || 0,
            midPrice30dUsd: midPrice30d,
            discountVs30dMidPct,
            vwapUsd: vwap,
            vwapGapPct,
            isBelowVwap: currentPrice ? currentPrice < vwap : false,
            change24h: dailyChange,
            dailyChange,
            highest24h,
            lowest24h,
          },
          groupC: {
            confidencePct: confidence,
            upsidePotentialPct,
            engineMode,
            scenario,
            hotScore: (confidence * Math.max(upsidePotentialPct, 0)) / 100,
            safeScore: (100 - noiseScore) * (trendAligned ? 1.2 : 0.8),
            highVolScore: (volatilityValue * upsidePotentialPct) / 100,
            discountScore: Math.abs(discountVs30dMidPct) + Math.abs(vwapGapPct),
          },
          lastUpdatedTs: barInterval === '1m' 
            ? (symbolData?.trendTs1m || new Date().toISOString())
            : (symbolData?.trendTs10m || new Date().toISOString()),
          isHolding: false, // дараа нь бодит дата оруулах
          direction,
        };
      });
      
      setAllCards(cards);
      
    } catch (err) {
      console.error('Trend board error:', err);
      setError('데이터를 불러올 수 없습니다.');
      setAllCards([]);
    } finally {
      setLoading(false);
    }
  }, [engineMode, symbols, storeInitialized]);

  // Symbol өөрчлөгдөхөд дата шинэчлэх (зөвхөн trend өөрчлөгдвөл)
  useEffect(() => {
    const barInterval = engineMode === EngineMode.PULSE ? '1m' : '10m';
    const onSymbolChange = useSymbolStore.getState().onSymbolChange;
    
    const unsubscribe = onSymbolChange((_symbol: string, data: Partial<import('@/stores/symbolStore').SymbolData>) => {
      const hasTrendChange = 
        (barInterval === '1m' && (data.trendShort1m !== undefined || data.trendLong1m !== undefined)) ||
        (barInterval === '10m' && (data.trendShort10m !== undefined || data.trendLong10m !== undefined));
      
      if (hasTrendChange) {
        fetchData();
      }
    });
    
    return unsubscribe;
  }, [engineMode, fetchData]);

  useEffect(() => {
    if (storeInitialized) {
      fetchData();
    }
  }, [engineMode, fetchData, storeInitialized]);

  // 정렬 & 필터 적용
  const filteredCards = filterTrendCards(allCards, filters);
  const sortedCards = sortTrendCards(filteredCards, sortMode);

  return {
    cards: sortedCards,
    loading,
    error,
    sortMode,
    filters,
    setSortMode,
    setFilters,
    refetch: fetchData,
  };
}

// Helper Functions

function valueToTrendDirection(value: number): TrendDirection {
  if (value > 0) return TrendDirection.UP;
  if (value < 0) return TrendDirection.DOWN;
  return TrendDirection.FLAT;
}

function volatilityValueToLevel(value: number): VolatilityLevel {
  if (value < 40) return VolatilityLevel.LOW;
  if (value < 70) return VolatilityLevel.MEDIUM;
  return VolatilityLevel.HIGH;
}


function determinePulseScenario(
  upside: number, 
  confidence: number, 
  vwapGap: number, 
  volatility: number
): PulseScenarioType {
  if (confidence > 70 && vwapGap > 2 && volatility > 60) return PulseScenarioType.FLASH_BREAKOUT;
  if (upside > 80 && volatility > 70) return PulseScenarioType.PANIC_SELLING;
  if (upside < 30 && confidence < 50) return PulseScenarioType.FOMO_ZONE;
  return PulseScenarioType.LIQUIDITY_HUNT;
}

function determineWaveScenario(
  upside: number, 
  confidence: number, 
  trendShort: TrendDirection, 
  trendLong: TrendDirection
): WaveScenarioType {
  if (trendShort === trendLong && trendShort !== 'FLAT' && confidence > 70) return WaveScenarioType.TREND_SURFING;
  if (upside > 80 && trendShort === 'UP') return WaveScenarioType.DEEP_ANCHOR;
  if (trendShort !== trendLong && trendShort !== 'FLAT' && trendLong !== 'FLAT') return WaveScenarioType.TREND_REVERSAL;
  return WaveScenarioType.STORM_BREWING;
}

