/**
 * Demo metadata for open signals (strategy_type + actions) when API rows omit them.
 * Used in development / until signal_cycles.strategy_type + signal_actions are populated.
 * Action 가격은 `BASE_PRICES` 스팟에 맞춘 근사치 (2026-04 목업 스토리).
 */

import type { EnhancedSignal } from '@/types/enhanced-signal';
import type { SignalAction, StrategyType } from '@/types/signal-action';
import { BASE_PRICES, getPrecision, roundPrice } from '@/lib/mock/realistic-data';

function spot(sym: keyof typeof BASE_PRICES): number {
  return BASE_PRICES[sym].price;
}

const DEMO_BY_SYMBOL: Partial<
  Record<
    string,
    { strategy_type: StrategyType; actions: SignalAction[] }
  >
> = {
  BTCUSDT: { strategy_type: 'basic', actions: [] },
  ETHUSDT: {
    strategy_type: 'dca',
    actions: [
      {
        action_type: 'additional_entry',
        price: roundPrice(spot('ETHUSDT') * 0.985, getPrecision(spot('ETHUSDT'))),
        status: 'pending',
        triggered_at: null,
      },
    ],
  },
  SOLUSDT: {
    strategy_type: 'partial_exit',
    actions: [
      {
        action_type: 'partial_exit',
        price: roundPrice(spot('SOLUSDT') * 1.022, getPrecision(spot('SOLUSDT'))),
        status: 'triggered',
        triggered_at: '2026-04-11T12:00:00.000Z',
      },
    ],
  },
  DOGEUSDT: {
    strategy_type: 'dca_partial',
    actions: [
      {
        action_type: 'additional_entry',
        price: roundPrice(spot('DOGEUSDT') * 0.97, getPrecision(spot('DOGEUSDT'))),
        status: 'pending',
        triggered_at: null,
      },
      {
        action_type: 'partial_exit',
        price: roundPrice(spot('DOGEUSDT') * 1.04, getPrecision(spot('DOGEUSDT'))),
        status: 'pending',
        triggered_at: null,
      },
    ],
  },
};

/** Merge demo strategy/actions for known symbols when API rows omit them. */
export function applyDemoSignalStrategyFields(signals: EnhancedSignal[]): EnhancedSignal[] {
  return signals.map((s) => {
    const demo = DEMO_BY_SYMBOL[s.symbol];
    if (!demo) return s;
    return {
      ...s,
      strategy_type: s.strategy_type ?? demo.strategy_type,
      actions: s.actions && s.actions.length > 0 ? s.actions : demo.actions,
    };
  });
}
