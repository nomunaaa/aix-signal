import {
  normalizeTradingCategory,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import type { SignalAction } from '@/types/signal-action';
import { buildHistoryStrategyVariants, historyVariantKeyForStrategy } from './historyPnl';
import { formatDuration } from './formatters';
import type { ClosedSignal, EntryTrendDirection, StrategyId } from '../types/pulse.types';

export type ClosedSignalCycleRow = Record<string, unknown>;

export const HISTORY_CLOSED_CYCLE_COLUMNS =
  'id,cycle_id,symbol,side,entry_price,exit_price,entry_time,exit_time,hold_sec,realized_pnl_pct,barinterval,trading_category,strategy_type,flow,is_open,entry_trend_short,entry_trend_long,added_entry_event_id,added_entry_cycle_id,added_entry_price,added_entry_timestamp,partial_exit_event_id,partial_exit_cycle_id,partial_exit_price,partial_exit_timestamp';

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function normalizeIso(value: unknown): string | undefined {
  if (!value) return undefined;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : undefined;
}

function normalizeDirection(value: unknown): 'long' | 'short' {
  return String(value ?? '').toUpperCase() === 'SHORT' ? 'short' : 'long';
}

function normalizeBarInterval(value: unknown): '1m' | '10m' {
  return value === '10m' ? '10m' : '1m';
}

function normalizeStrategyId(value: unknown): StrategyId | undefined {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === 'oneshot' || raw === 'basic') return 'oneshot';
  if (raw === 'deep' || raw === 'dca') return 'deep';
  if (raw === 'safe' || raw === 'partial_exit') return 'safe';
  if (raw === 'full' || raw === 'dca_partial') return 'full';
  return undefined;
}

function strategyIdFromCycle(cycle: ClosedSignalCycleRow): StrategyId | undefined {
  const category = normalizeTradingCategory(cycle.trading_category);
  if (category) return TRADING_CATEGORY_TO_STRATEGY[category];
  return normalizeStrategyId(cycle.strategy_type);
}

function normalizeTrendSnapshot(value: unknown): EntryTrendDirection | null {
  if (typeof value === 'string') {
    const normalized = value.trim().toUpperCase();
    if (normalized === 'UP' || normalized === 'LONG') return 'UP';
    if (normalized === 'DOWN' || normalized === 'SHORT') return 'DOWN';
    if (normalized === 'NEUTRAL' || normalized === '0') return 'NEUTRAL';
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 0) return 'UP';
  if (parsed < 0) return 'DOWN';
  return 'NEUTRAL';
}

function hasCycleEventValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

function eventFromCycle(
  cycle: ClosedSignalCycleRow,
  key: 'added_entry_event' | 'partial_exit_event'
): Record<string, unknown> | null {
  const event = cycle[key];
  return event && typeof event === 'object' ? (event as Record<string, unknown>) : null;
}

function mapSignalActionsFromEmbed(raw: unknown): SignalAction[] {
  if (!Array.isArray(raw)) return [];

  const actions: SignalAction[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const item = row as Record<string, unknown>;
    const actionType = item.action_type;
    const status = item.status;
    const price = toPositiveNumber(item.price);

    if (actionType !== 'additional_entry' && actionType !== 'partial_exit') continue;
    if (status !== 'pending' && status !== 'triggered' && status !== 'expired') continue;
    if (price === null) continue;

    actions.push({
      action_type: actionType,
      price,
      status,
      triggered_at: item.triggered_at == null ? null : String(item.triggered_at),
    });
  }

  return actions;
}

function triggeredActionPrice(
  actions: SignalAction[],
  actionType: SignalAction['action_type']
): number | null {
  const triggered = actions.find(
    (action) => action.action_type === actionType && action.status === 'triggered'
  );
  const fallback = actions.find((action) => action.action_type === actionType);
  return toPositiveNumber(triggered?.price) ?? toPositiveNumber(fallback?.price);
}

function lifecyclePrice(
  cycle: ClosedSignalCycleRow,
  eventKey: 'added_entry_event' | 'partial_exit_event',
  snapshotKey: 'added_entry_price' | 'partial_exit_price',
  actions: SignalAction[],
  actionType: SignalAction['action_type']
): number | null {
  return (
    toPositiveNumber(eventFromCycle(cycle, eventKey)?.price) ??
    triggeredActionPrice(actions, actionType) ??
    toPositiveNumber(cycle[snapshotKey])
  );
}

function lifecyclePercent(
  cycle: ClosedSignalCycleRow,
  eventKey: 'partial_exit_event'
): number | null {
  return toNumber(eventFromCycle(cycle, eventKey)?.percentage);
}

export function mapCycleRowsToClosedSignals(rows: ClosedSignalCycleRow[]): ClosedSignal[] {
  return rows.map((cycle) => {
    const entryTimeIso = normalizeIso(cycle.entry_time) ?? new Date().toISOString();
    const exitTimeIso = normalizeIso(cycle.exit_time) ?? entryTimeIso;
    const entryPrice = toPositiveNumber(cycle.entry_price) ?? 0;
    const exitPrice = toPositiveNumber(cycle.exit_price) ?? entryPrice;
    const direction = normalizeDirection(cycle.side);
    const realizedPnlPct = toNumber(cycle.realized_pnl_pct);
    const actions = Array.isArray(cycle.actions)
      ? mapSignalActionsFromEmbed(cycle.actions)
      : mapSignalActionsFromEmbed(cycle.signal_actions);
    const additionalEntryPrice = lifecyclePrice(
      cycle,
      'added_entry_event',
      'added_entry_price',
      actions,
      'additional_entry'
    );
    const partialExitPrice = lifecyclePrice(
      cycle,
      'partial_exit_event',
      'partial_exit_price',
      actions,
      'partial_exit'
    );
    const partialExitPercent = lifecyclePercent(cycle, 'partial_exit_event');
    const strategyId = strategyIdFromCycle(cycle);
    const strategyVariants = buildHistoryStrategyVariants({
      direction,
      entryPrice,
      exitPrice,
      additionalEntryPrice,
      partialExitPrice,
      partialExitPercent,
    });
    const hasLifecycleAdjustment = additionalEntryPrice !== null || partialExitPrice !== null;
    const strategyVariantKey = historyVariantKeyForStrategy(strategyId ?? 'oneshot');
    const pnlPercent = hasLifecycleAdjustment
      ? strategyVariants[strategyVariantKey].pnlPct
      : (realizedPnlPct ?? strategyVariants.basic.pnlPct);
    const holdSeconds = toNumber(cycle.hold_sec) ?? 0;
    const tradingCategory = normalizeTradingCategory(cycle.trading_category);

    return {
      id: String(cycle.id ?? ''),
      cycle_id: typeof cycle.cycle_id === 'string' ? cycle.cycle_id : null,
      symbol: String(cycle.symbol ?? '').toUpperCase(),
      direction,
      entryPrice,
      exitPrice,
      pnlPercent,
      holdDuration: formatDuration(holdSeconds),
      closedAt: exitTimeIso,
      enteredAt: entryTimeIso,
      discountGain: 0,
      lockedAmount: 0,
      hasAdditionalBuy:
        hasCycleEventValue(cycle.added_entry_event_id) ||
        hasCycleEventValue(cycle.added_entry_cycle_id) ||
        additionalEntryPrice !== null,
      hasPartialClose:
        hasCycleEventValue(cycle.partial_exit_event_id) ||
        hasCycleEventValue(cycle.partial_exit_cycle_id) ||
        partialExitPrice !== null,
      additionalEntryPrice: additionalEntryPrice ?? undefined,
      partialExitPrice: partialExitPrice ?? undefined,
      partialExitPercent: partialExitPercent ?? undefined,
      averageEntryPrice:
        additionalEntryPrice == null ? undefined : strategyVariants.dca.averageEntryPrice,
      strategyId,
      strategyVariants: hasLifecycleAdjustment ? strategyVariants : undefined,
      barinterval: normalizeBarInterval(cycle.barinterval),
      tradingCategory: tradingCategory as TradingCategory | undefined,
      holdSeconds,
      flow: typeof cycle.flow === 'string' ? cycle.flow : null,
      entryTrendShort: normalizeTrendSnapshot(cycle.entry_trend_short),
      entryTrendLong: normalizeTrendSnapshot(cycle.entry_trend_long),
    };
  });
}
