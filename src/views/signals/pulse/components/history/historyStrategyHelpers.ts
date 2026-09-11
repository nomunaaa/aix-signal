import { getStrategyVariantsForCycleId } from '@/lib/mock/history-cycles-mock';
import type {
  ClosedSignal,
  CycleStrategyCompareKey,
  StrategyVariantCompare,
} from '../../types/pulse.types';

const ORDER: CycleStrategyCompareKey[] = ['basic', 'dca', 'partial_exit', 'dca_partial'];

export function strategiesForExpand(s: ClosedSignal): StrategyVariantCompare[] {
  if (s.strategyVariants) {
    return ORDER.map((k) => s.strategyVariants![k]).filter(Boolean) as StrategyVariantCompare[];
  }
  return getStrategyVariantsForCycleId(s.id);
}
