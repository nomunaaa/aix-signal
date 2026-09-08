import type {
  ClosedSignal,
  CycleStrategyCompareKey,
  SimulationInput,
  Signal,
  StrategyId,
  StrategyVariantCompare,
} from '../types/pulse.types';
import type { SignalAction } from '@/types/signal-action';

export const FALLBACK_HISTORY_SIMULATION_INPUT: SimulationInput = {
  capital: 10000,
  capitalRatio: 2,
  leverage: 3,
};

const NORMALIZED_VARIANT_ENTRY_NOTIONAL = 1000;

const STRATEGY_VARIANT_BY_ID: Record<StrategyId, CycleStrategyCompareKey> = {
  oneshot: 'basic',
  deep: 'dca',
  safe: 'partial_exit',
  full: 'dca_partial',
};

export function historyVariantKeyForStrategy(strategyId: StrategyId): CycleStrategyCompareKey {
  return STRATEGY_VARIANT_BY_ID[strategyId];
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function positivePrice(value: unknown): number | null {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : null;
  return parsed != null && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizedPartialExitRatio(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0.5;
  const ratio = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, ratio));
}

function clampSimulationInput(input: SimulationInput | undefined): SimulationInput {
  const source = input ?? FALLBACK_HISTORY_SIMULATION_INPUT;
  const capital = Number.isFinite(source.capital)
    ? Math.max(0, source.capital)
    : FALLBACK_HISTORY_SIMULATION_INPUT.capital;
  const capitalRatio = Number.isFinite(source.capitalRatio)
    ? Math.min(100, Math.max(0, source.capitalRatio))
    : FALLBACK_HISTORY_SIMULATION_INPUT.capitalRatio;
  const leverage = Number.isFinite(source.leverage)
    ? Math.max(1, source.leverage)
    : FALLBACK_HISTORY_SIMULATION_INPUT.leverage;

  return { capital, capitalRatio, leverage };
}

function calculateCashflowPnl(params: {
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  additionalEntryPrice?: number | null;
  partialExitPrice?: number | null;
  partialExitPercent?: number | null;
  entryNotional: number;
}): {
  pnlAmount: number;
  pnlPercent: number;
  totalEntryNotional: number;
  averageEntryPrice: number;
} {
  const entryPrice = positivePrice(params.entryPrice);
  const exitPrice = positivePrice(params.exitPrice);
  const entryNotional = Number.isFinite(params.entryNotional)
    ? Math.max(0, params.entryNotional)
    : 0;

  if (entryPrice === null || exitPrice === null || entryNotional <= 0) {
    return {
      pnlAmount: 0,
      pnlPercent: 0,
      totalEntryNotional: 0,
      averageEntryPrice: entryPrice ?? 0,
    };
  }

  const entryPrices = [entryPrice];
  const additionalEntryPrice = positivePrice(params.additionalEntryPrice);
  if (additionalEntryPrice !== null) entryPrices.push(additionalEntryPrice);

  const totalEntryNotional = entryPrices.length * entryNotional;
  const totalQuantity = entryPrices.reduce((sum, price) => sum + entryNotional / price, 0);
  const averageEntryPrice = totalQuantity > 0 ? totalEntryNotional / totalQuantity : entryPrice;
  const partialExitPrice = positivePrice(params.partialExitPrice);
  const partialExitRatio =
    partialExitPrice === null ? 0 : normalizedPartialExitRatio(params.partialExitPercent);
  const exitValue =
    totalQuantity *
    ((partialExitPrice ?? 0) * partialExitRatio + exitPrice * (1 - partialExitRatio));
  const rawPnl =
    params.direction === 'long' ? exitValue - totalEntryNotional : totalEntryNotional - exitValue;

  return {
    pnlAmount: round4(rawPnl),
    pnlPercent: totalEntryNotional > 0 ? round4((rawPnl / totalEntryNotional) * 100) : 0,
    totalEntryNotional,
    averageEntryPrice,
  };
}

type OpenPnlSignal = Pick<Signal, 'direction' | 'entryPrice' | 'currentPrice'> &
  Partial<
    Pick<
      Signal,
      | 'actions'
      | 'additionalEntryPrice'
      | 'additionalEntryPending'
      | 'additionalBuyCount'
      | 'additionalEntryTime'
      | 'averageEntryPrice'
      | 'partialClosePrice'
      | 'partialExitPending'
      | 'partialExitTime'
      | 'partialExitPercent'
      | 'lockedAmount'
    >
  > & {
    lockedPercent?: number | null;
    partialExitPrice?: number | null;
    lockedExitPrice?: number | null;
  };

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function triggeredAction(
  actions: SignalAction[] | undefined,
  actionType: SignalAction['action_type']
): SignalAction | undefined {
  return actions?.find(
    (action) => action.action_type === actionType && action.status === 'triggered'
  );
}

function dcaPriceFromAverageEntry(entryPrice: number, averageEntryPrice: number): number | null {
  const reciprocal = 2 / averageEntryPrice - 1 / entryPrice;
  if (!Number.isFinite(reciprocal) || reciprocal <= 0) return null;
  return positivePrice(1 / reciprocal);
}

function triggeredOpenAdditionalEntryPrice(signal: OpenPnlSignal): number | null {
  const actionPrice = positivePrice(triggeredAction(signal.actions, 'additional_entry')?.price);
  if (actionPrice !== null) return actionPrice;
  if (signal.additionalEntryPending === true) return null;

  const hasTriggeredHint =
    (Number(signal.additionalBuyCount) || 0) > 0 || hasText(signal.additionalEntryTime);
  if (!hasTriggeredHint) return null;

  const directPrice = positivePrice(signal.additionalEntryPrice);
  if (directPrice !== null) return directPrice;

  const entryPrice = positivePrice(signal.entryPrice);
  const averageEntryPrice = positivePrice(signal.averageEntryPrice);
  return entryPrice !== null && averageEntryPrice !== null
    ? dcaPriceFromAverageEntry(entryPrice, averageEntryPrice)
    : null;
}

function triggeredOpenPartialExitPrice(signal: OpenPnlSignal): number | null {
  const actionPrice = positivePrice(triggeredAction(signal.actions, 'partial_exit')?.price);
  if (actionPrice !== null) return actionPrice;

  const hasTriggeredHint =
    hasText(signal.partialExitTime) ||
    (Number(signal.lockedAmount) || 0) > 0 ||
    (Number(signal.lockedPercent) || 0) > 0;
  if (signal.partialExitPending === true && !hasTriggeredHint) return null;
  if (!hasTriggeredHint) return null;

  return (
    positivePrice(signal.partialExitPrice) ??
    positivePrice(signal.partialClosePrice) ??
    positivePrice(signal.lockedExitPrice)
  );
}

export function calculateOpenSignalPnl(
  signal: OpenPnlSignal,
  input?: SimulationInput
): {
  pnlAmount: number;
  pnlPercent: number;
  entryMargin: number;
  positionSize: number;
  totalEntryNotional: number;
  totalEntryMargin: number;
  averageEntryPrice: number;
} {
  const sim = clampSimulationInput(input);
  const entryMargin = sim.capital * (sim.capitalRatio / 100);
  const positionSize = entryMargin * sim.leverage;
  const cashflow = calculateCashflowPnl({
    direction: signal.direction,
    entryPrice: signal.entryPrice,
    exitPrice: signal.currentPrice,
    additionalEntryPrice: triggeredOpenAdditionalEntryPrice(signal),
    partialExitPrice: triggeredOpenPartialExitPrice(signal),
    partialExitPercent: signal.partialExitPercent,
    entryNotional: positionSize,
  });
  const totalEntryNotional = cashflow.totalEntryNotional || positionSize;
  const totalEntryMargin = sim.leverage > 0 ? totalEntryNotional / sim.leverage : 0;

  return {
    pnlAmount: cashflow.pnlAmount,
    pnlPercent: cashflow.pnlPercent,
    entryMargin,
    positionSize,
    totalEntryNotional,
    totalEntryMargin,
    averageEntryPrice: cashflow.averageEntryPrice,
  };
}

function makeVariant(params: {
  key: CycleStrategyCompareKey;
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  dcaPrice: number | null;
  partialExitPrice: number | null;
  partialExitPercent: number | null | undefined;
  entryNotional?: number;
}): StrategyVariantCompare {
  const cashflow = calculateCashflowPnl({
    direction: params.direction,
    entryPrice: params.entryPrice,
    exitPrice: params.exitPrice,
    additionalEntryPrice: params.dcaPrice,
    partialExitPrice: params.partialExitPrice,
    partialExitPercent: params.partialExitPercent,
    entryNotional: params.entryNotional ?? NORMALIZED_VARIANT_ENTRY_NOTIONAL,
  });

  return {
    key: params.key,
    entryPrice: params.entryPrice,
    averageEntryPrice: cashflow.averageEntryPrice,
    dcaPrice: params.dcaPrice,
    partialExitPrice: params.partialExitPrice,
    exitPrice: params.exitPrice,
    pnlUsd: cashflow.pnlAmount,
    pnlPct: cashflow.pnlPercent,
    isWin: cashflow.pnlAmount >= 0,
  };
}

export function buildHistoryStrategyVariants(params: {
  direction: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  additionalEntryPrice?: number | null;
  partialExitPrice?: number | null;
  partialExitPercent?: number | null;
}): Record<CycleStrategyCompareKey, StrategyVariantCompare> {
  const dcaPrice = positivePrice(params.additionalEntryPrice);
  const partialExitPrice = positivePrice(params.partialExitPrice);

  return {
    basic: makeVariant({
      key: 'basic',
      direction: params.direction,
      entryPrice: params.entryPrice,
      exitPrice: params.exitPrice,
      dcaPrice: null,
      partialExitPrice: null,
      partialExitPercent: null,
    }),
    dca: makeVariant({
      key: 'dca',
      direction: params.direction,
      entryPrice: params.entryPrice,
      exitPrice: params.exitPrice,
      dcaPrice,
      partialExitPrice: null,
      partialExitPercent: null,
    }),
    partial_exit: makeVariant({
      key: 'partial_exit',
      direction: params.direction,
      entryPrice: params.entryPrice,
      exitPrice: params.exitPrice,
      dcaPrice: null,
      partialExitPrice,
      partialExitPercent: params.partialExitPercent,
    }),
    dca_partial: makeVariant({
      key: 'dca_partial',
      direction: params.direction,
      entryPrice: params.entryPrice,
      exitPrice: params.exitPrice,
      dcaPrice,
      partialExitPrice,
      partialExitPercent: params.partialExitPercent,
    }),
  };
}

function variantsForSignal(
  signal: ClosedSignal
): Record<CycleStrategyCompareKey, StrategyVariantCompare> {
  return (
    signal.strategyVariants ??
    buildHistoryStrategyVariants({
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      exitPrice: signal.exitPrice,
      additionalEntryPrice: signal.additionalEntryPrice,
      partialExitPrice: signal.partialExitPrice,
      partialExitPercent: signal.partialExitPercent,
    })
  );
}

export function historyPnlPercentForStrategy(
  signal: ClosedSignal,
  selectedStrategy?: StrategyId
): number {
  const variantKey = historyVariantKeyForStrategy(
    signal.strategyId ?? selectedStrategy ?? 'oneshot'
  );
  const variant = variantsForSignal(signal)[variantKey];
  return Number.isFinite(variant?.pnlPct)
    ? variant.pnlPct
    : Number.isFinite(signal.pnlPercent)
      ? signal.pnlPercent
      : 0;
}

export function calculateHistorySimulationPnl(
  signal: ClosedSignal,
  input: SimulationInput | undefined,
  selectedStrategy?: StrategyId
): {
  pnlAmount: number;
  pnlPercent: number;
  entryMargin: number;
  positionSize: number;
  totalEntryNotional: number;
  totalEntryMargin: number;
  rawPnlPercent: number;
} {
  const sim = clampSimulationInput(input);
  const variantKey = historyVariantKeyForStrategy(
    signal.strategyId ?? selectedStrategy ?? 'oneshot'
  );
  const variant = variantsForSignal(signal)[variantKey];
  const usesAdditionalEntry = variant?.dcaPrice != null;
  const rawPnlPercent = historyPnlPercentForStrategy(signal, selectedStrategy);
  const entryMargin = sim.capital * (sim.capitalRatio / 100);
  const positionSize = entryMargin * sim.leverage;
  const cashflow = calculateCashflowPnl({
    direction: signal.direction,
    entryPrice: signal.entryPrice,
    exitPrice: signal.exitPrice,
    additionalEntryPrice: usesAdditionalEntry ? signal.additionalEntryPrice : null,
    partialExitPrice: variant?.partialExitPrice ?? null,
    partialExitPercent: signal.partialExitPercent,
    entryNotional: positionSize,
  });
  const pnlAmount =
    cashflow.totalEntryNotional > 0
      ? cashflow.pnlAmount
      : round4(positionSize * (rawPnlPercent / 100));
  const totalEntryNotional = cashflow.totalEntryNotional || positionSize;
  const totalEntryMargin = sim.leverage > 0 ? totalEntryNotional / sim.leverage : 0;

  return {
    pnlAmount,
    pnlPercent: cashflow.totalEntryNotional > 0 ? cashflow.pnlPercent : rawPnlPercent,
    entryMargin,
    positionSize,
    totalEntryNotional,
    totalEntryMargin,
    rawPnlPercent,
  };
}
