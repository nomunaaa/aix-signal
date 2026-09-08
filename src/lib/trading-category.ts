export type TradingCategory = 'E1X1' | 'E1X2' | 'E2X1' | 'E2X2';

export type StrategyTradingCategoryKey = 'oneshot' | 'deep' | 'safe' | 'full';

export const TRADING_CATEGORY_ORDER: TradingCategory[] = ['E1X1', 'E1X2', 'E2X1', 'E2X2'];

export const STRATEGY_TO_TRADING_CATEGORY: Record<StrategyTradingCategoryKey, TradingCategory> = {
  oneshot: 'E1X1',
  deep: 'E2X1',
  safe: 'E1X2',
  full: 'E2X2',
};

export const TRADING_CATEGORY_TO_STRATEGY: Record<TradingCategory, StrategyTradingCategoryKey> = {
  E1X1: 'oneshot',
  E1X2: 'safe',
  E2X1: 'deep',
  E2X2: 'full',
};

const TRADING_CATEGORY_SET = new Set<string>(TRADING_CATEGORY_ORDER);

export function normalizeTradingCategory(value: unknown): TradingCategory | undefined {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return TRADING_CATEGORY_SET.has(normalized) ? (normalized as TradingCategory) : undefined;
}

export function tradingCategoryForStrategy(strategy: StrategyTradingCategoryKey): TradingCategory {
  return STRATEGY_TO_TRADING_CATEGORY[strategy];
}

export function applyTradingCategoryFilter<T>(query: T, tradingCategory?: TradingCategory): T {
  if (!tradingCategory) return query;
  return (query as { eq: (column: string, value: string) => T }).eq('trading_category', tradingCategory);
}

/**
 * Chart는 한 번에 하나의 전략만 표시할 수 있어(신호 오버레이가 종목당 1개),
 * 다중 선택이 가능한 다른 화면(Signal Board/Trend Board/AIX 수익통계)의 선택값을
 * 이 우선순위로 하나로 좁힌다: E2X2 > E2X1 > E1X2 > E1X1.
 */
export const TRADING_CATEGORY_DISPLAY_PRIORITY: TradingCategory[] = [
  'E2X2',
  'E2X1',
  'E1X2',
  'E1X1',
];

export function resolveSingleTradingCategory(
  categories: readonly TradingCategory[]
): TradingCategory {
  return (
    TRADING_CATEGORY_DISPLAY_PRIORITY.find((category) => categories.includes(category)) ?? 'E2X2'
  );
}
