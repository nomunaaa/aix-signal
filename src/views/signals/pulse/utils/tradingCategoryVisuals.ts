import {
  normalizeTradingCategory,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import { STRATEGY_CONFIGS } from '../types/pulse.types';

const STRATEGY_COLOR_BY_CATEGORY: Record<TradingCategory, string> = Object.fromEntries(
  Object.entries(TRADING_CATEGORY_TO_STRATEGY).map(([category, strategyId]) => [
    category,
    STRATEGY_CONFIGS.find((strategy) => strategy.id === strategyId)?.color ?? '#94a3b8',
  ])
) as Record<TradingCategory, string>;

export function tradingCategoryColor(value: unknown): string | undefined {
  const category = normalizeTradingCategory(value);
  return category ? STRATEGY_COLOR_BY_CATEGORY[category] : undefined;
}
