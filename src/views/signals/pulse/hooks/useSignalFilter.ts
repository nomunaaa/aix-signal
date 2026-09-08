import { useMemo } from 'react';
import { usePulseStore } from '../stores/pulseStore';
import { sortSignals } from '../utils/strategyEngine';
import {
  STRATEGY_CONFIGS,
  type Signal,
  type StrategyId,
} from '../types/pulse.types';
import {
  isAllSignalTrendModesSelected,
  resolveSignalTrendModeFromEntryTrends,
} from '@/lib/signal-trend-mode';
import {
  normalizeTradingCategory,
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';

function isFavoriteSymbol(favorites: Set<string>, symbol: string): boolean {
  return favorites.has(symbol.trim().toUpperCase());
}

function isAllTradingCategoriesSelected(filters: readonly TradingCategory[]): boolean {
  return filters.length === TRADING_CATEGORY_ORDER.length;
}

function strategyHasFeature(strategyId: StrategyId, feature: 'discount' | 'locked'): boolean {
  return STRATEGY_CONFIGS.find((strategy) => strategy.id === strategyId)?.features[feature] ?? false;
}

function tradingCategoryHasFeature(
  category: TradingCategory,
  feature: 'discount' | 'locked'
): boolean {
  return strategyHasFeature(TRADING_CATEGORY_TO_STRATEGY[category], feature);
}

export interface UseSignalFilterReturn<T extends Signal = Signal> {
  filtered: T[];
  totalCount: number;
  activeFilterCount: number;
  showDiscount: boolean;
  showLocked: boolean;
}

export function useSignalFilter<T extends Signal>(signals: T[]): UseSignalFilterReturn<T> {
  const filterPreset = usePulseStore((s) => s.filterPreset);
  const searchQuery = usePulseStore((s) => s.searchQuery);
  const directionFilter = usePulseStore((s) => s.directionFilter);
  const sortBy = usePulseStore((s) => s.sortBy);
  const sortDir = usePulseStore((s) => s.sortDir);
  const tableFilterPreset = usePulseStore((s) => s.tableFilterPreset);
  const trendModeFilter = usePulseStore((s) => s.trendModeFilter);
  const tradingCategoryFilters = usePulseStore((s) => s.tradingCategoryFilters);
  const favorites = usePulseStore((s) => s.favorites);
  const showFavoritesOnly = usePulseStore((s) => s.showFavoritesOnly);

  const showDiscount = tradingCategoryFilters.some((category) =>
    tradingCategoryHasFeature(category, 'discount')
  );
  const showLocked = tradingCategoryFilters.some((category) =>
    tradingCategoryHasFeature(category, 'locked')
  );

  const filtered = useMemo(() => {
    let result = signals;

    if (!isAllTradingCategoriesSelected(tradingCategoryFilters)) {
      const selectedCategories = new Set(tradingCategoryFilters);
      result = result.filter((signal) => {
        const category = normalizeTradingCategory(signal.tradingCategory);
        return category ? selectedCategories.has(category) : false;
      });
    }

    // 1. FilterPreset 적용
    switch (filterPreset) {
      case 'action':
        result = result.filter((s) => s.status === 'open');
        break;
      case 'new': {
        const fiveMinAgo = Date.now() - 5 * 60_000;
        result = result.filter((s) => {
          if (!s.enteredAt) return false;
          const t =
            typeof s.enteredAt === 'string'
              ? new Date(s.enteredAt).getTime()
              : s.enteredAt.getTime();
          return !isNaN(t) && t >= fiveMinAgo;
        });
        break;
      }
      case 'discount':
        result = result.filter(
          (s) => 'discountGain' in s && (s as Record<string, unknown>).discountGain
        );
        break;
      case 'tp':
        result = result.filter(
          (s) => 'lockedAmount' in s && (s as Record<string, unknown>).lockedAmount
        );
        break;
      case 'nontrend':
        result = result.filter(
          (s) =>
            resolveSignalTrendModeFromEntryTrends({
              direction: s.direction,
              shortTrend: s.entryTrendShort,
              longTrend: s.entryTrendLong,
            }) === 'nonTrend'
        );
        break;
      case 'closed':
        result = result.filter((s) => s.status === 'closed' || s.section === 'CLOSED_RECENT');
        break;
      case 'favorites':
        result = result.filter((s) => isFavoriteSymbol(favorites, s.symbol));
        break;
    }

    // 2. 검색어 필터
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => s.symbol.toLowerCase().includes(q));
    }

    // 3. 방향 필터
    if (directionFilter !== 'all') {
      result = result.filter((s) => s.direction === directionFilter);
    }

    if (!isAllSignalTrendModesSelected(trendModeFilter)) {
      result = result.filter((s) => {
        const mode = resolveSignalTrendModeFromEntryTrends({
          direction: s.direction,
          shortTrend: s.entryTrendShort,
          longTrend: s.entryTrendLong,
        });
        return mode == null ? false : trendModeFilter[mode];
      });
    }

    // 4. Temporal filter (TableFilterPreset)
    if (tableFilterPreset !== 'all') {
      const now = Date.now();
      switch (tableFilterPreset) {
        case 'latest': {
          const tenMinAgo = now - 10 * 60_000;
          result = result.filter((s) => {
            if (!s.enteredAt) return false;
            const t =
              typeof s.enteredAt === 'string'
                ? new Date(s.enteredAt).getTime()
                : s.enteredAt.getTime();
            return !isNaN(t) && t >= tenMinAgo;
          });
          break;
        }
        case 'changing': {
          const tenMinAgo = now - 10 * 60_000;
          result = result.filter((s) => {
            const movedAt = (s as Signal & { movedAt?: Date | string }).movedAt;
            if (!movedAt) return false;
            const t = typeof movedAt === 'string' ? new Date(movedAt).getTime() : movedAt.getTime();
            return !isNaN(t) && t >= tenMinAgo;
          });
          break;
        }
        case 'fixed': {
          const oneHourAgo = now - 60 * 60_000;
          result = result.filter((s) => {
            if (!s.enteredAt) return false;
            const t =
              typeof s.enteredAt === 'string'
                ? new Date(s.enteredAt).getTime()
                : s.enteredAt.getTime();
            return !isNaN(t) && t <= oneHourAgo;
          });
          break;
        }
      }
    }

    // 5. 즐겨찾기만 보기 (테이블 컨트롤)
    if (showFavoritesOnly) {
      result = result.filter((s) => isFavoriteSymbol(favorites, s.symbol));
    }

    // 6. 정렬
    result = sortSignals(result, sortBy, sortDir) as T[];

    return result;
  }, [
    signals,
    tradingCategoryFilters,
    filterPreset,
    searchQuery,
    directionFilter,
    sortBy,
    sortDir,
    favorites,
    tableFilterPreset,
    trendModeFilter,
    showFavoritesOnly,
  ]);

  const activeFilterCount = [
    filterPreset !== 'action',
    searchQuery.trim().length > 0,
    directionFilter !== 'all',
    !isAllSignalTrendModesSelected(trendModeFilter),
    !isAllTradingCategoriesSelected(tradingCategoryFilters),
    tableFilterPreset !== 'all',
    showFavoritesOnly,
  ].filter(Boolean).length;

  return { filtered, totalCount: signals.length, activeFilterCount, showDiscount, showLocked };
}
