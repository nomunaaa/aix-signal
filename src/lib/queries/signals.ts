import { supabase } from '@/integrations/supabase/client';
import { applyTradingCategoryFilter, type TradingCategory } from '@/lib/trading-category';
import type { SignalAction } from '@/types/signal-action';

export type SignalStream = 'pulse' | 'wave';

export type FetchOpenSignalCyclesOptions = {
  symbols?: string[];
  tradingCategory?: TradingCategory;
};

type SignalCycleLifecycleRow = Record<string, unknown> & {
  actions?: SignalAction[];
  added_entry_event_id?: unknown;
  added_entry_price?: unknown;
  added_entry_timestamp?: unknown;
  partial_exit_event_id?: unknown;
  partial_exit_price?: unknown;
  partial_exit_timestamp?: unknown;
};

type SignalLifecycleEventRow = {
  id?: unknown;
  signal_type?: unknown;
  price?: unknown;
  percentage?: unknown;
  timestamp?: unknown;
  timestamp_ms?: unknown;
  created_at?: unknown;
};

const STREAM_TO_BAR: Record<SignalStream, '1m' | '10m'> = {
  pulse: '1m',
  wave: '10m',
};

const LIFECYCLE_EVENT_CHUNK_SIZE = 100;

function normalizeFetchOptions(
  options?: string[] | FetchOpenSignalCyclesOptions,
): FetchOpenSignalCyclesOptions {
  return Array.isArray(options) ? { symbols: options } : options ?? {};
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function eventId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function lifecycleEventTimeIso(event: SignalLifecycleEventRow): string | null {
  const timestampMs = toNumber(event.timestamp_ms);
  const timestamp = toNumber(event.timestamp);
  const rawTs = timestampMs ?? timestamp;

  if (rawTs !== null) {
    const ms = rawTs > 9_999_999_999 ? rawTs : rawTs * 1000;
    const date = new Date(ms);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }

  if (typeof event.created_at === 'string' && event.created_at.trim()) {
    const date = new Date(event.created_at);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }

  return null;
}

function isoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function lifecycleEventFromSnapshot(
  row: SignalCycleLifecycleRow,
  signalType: 'added_entry' | 'partial_exit',
): SignalLifecycleEventRow | null {
  const price =
    signalType === 'added_entry'
      ? toNumber(row.added_entry_price)
      : toNumber(row.partial_exit_price);
  if (price === null || price <= 0) return null;

  const timestamp =
    signalType === 'added_entry'
      ? isoTimestamp(row.added_entry_timestamp)
      : isoTimestamp(row.partial_exit_timestamp);

  return {
    id:
      signalType === 'added_entry'
        ? eventId(row.added_entry_event_id)
        : eventId(row.partial_exit_event_id),
    signal_type: signalType,
    price,
    created_at: timestamp,
  };
}

function lifecycleActionFromEvent(event: SignalLifecycleEventRow | null): SignalAction | null {
  if (!event) return null;
  const signalType = typeof event.signal_type === 'string' ? event.signal_type : '';
  const actionType =
    signalType === 'added_entry'
      ? 'additional_entry'
      : signalType === 'partial_exit'
        ? 'partial_exit'
        : null;
  const price = toNumber(event.price);

  if (!actionType || price === null || price <= 0) return null;

  return {
    action_type: actionType,
    price,
    status: 'triggered',
    triggered_at: lifecycleEventTimeIso(event),
  };
}

function mergeLifecycleActions(
  existingActions: unknown,
  lifecycleActions: SignalAction[],
): SignalAction[] {
  const actionsByType = new Map<SignalAction['action_type'], SignalAction>();

  if (Array.isArray(existingActions)) {
    for (const action of existingActions) {
      if (
        action &&
        typeof action === 'object' &&
        (action as SignalAction).action_type &&
        (action as SignalAction).price
      ) {
        actionsByType.set((action as SignalAction).action_type, action as SignalAction);
      }
    }
  }

  for (const action of lifecycleActions) {
    actionsByType.set(action.action_type, action);
  }

  return Array.from(actionsByType.values());
}

export async function enrichSignalCyclesWithLifecycleActions<
  T extends SignalCycleLifecycleRow,
>(rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;

  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => [eventId(row.added_entry_event_id), eventId(row.partial_exit_event_id)])
        .filter(Boolean),
    ),
  );

  const eventsById = new Map<string, SignalLifecycleEventRow>();
  if (ids.length > 0) {
    const eventResults = await Promise.all(
      chunkValues(ids, LIFECYCLE_EVENT_CHUNK_SIZE).map((eventIdChunk) =>
        supabase
          .from('signal_events')
          .select('id,signal_type,price,percentage,timestamp,timestamp_ms,created_at')
          .in('id', eventIdChunk),
      ),
    );

    for (const { data, error } of eventResults) {
      if (error) {
        console.warn('[signals query] lifecycle signal_events fetch failed:', error);
        continue;
      }

      for (const row of data ?? []) {
        const id = eventId(row.id);
        if (id) eventsById.set(id, row as SignalLifecycleEventRow);
      }
    }
  }

  return rows.map((row) => {
    const addedEntryEvent =
      eventsById.get(eventId(row.added_entry_event_id)) ??
      lifecycleEventFromSnapshot(row, 'added_entry');
    const partialExitEvent =
      eventsById.get(eventId(row.partial_exit_event_id)) ??
      lifecycleEventFromSnapshot(row, 'partial_exit');
    const lifecycleActions = [addedEntryEvent, partialExitEvent]
      .map(lifecycleActionFromEvent)
      .filter((action): action is SignalAction => Boolean(action));

    return {
      ...row,
      actions: mergeLifecycleActions(row.actions, lifecycleActions),
      added_entry_event: addedEntryEvent,
      partial_exit_event: partialExitEvent,
    };
  });
}

export async function fetchSignals(
  stream: SignalStream,
  options?: string[] | FetchOpenSignalCyclesOptions,
) {
  const barinterval = STREAM_TO_BAR[stream];
  return fetchOpenSignalCyclesWithActions(barinterval, options);
}

/** Same as {@link fetchSignals} but accepts the stored `barinterval` directly. */
export async function fetchOpenSignalCyclesWithActions(
  barinterval: '1m' | '10m',
  options?: string[] | FetchOpenSignalCyclesOptions,
) {
  const { symbols, tradingCategory } = normalizeFetchOptions(options);

  if (symbols && symbols.length === 0) {
    return { data: [], error: null };
  }

  let query = supabase
    .from('signal_cycles')
    .select('*')
    .eq('is_open', true)
    .eq('barinterval', barinterval)
    .order('entry_time', { ascending: false });

  query = applyTradingCategoryFilter(query, tradingCategory);

  if (symbols && symbols.length > 0) {
    query = query.in('symbol', symbols);
  }

  const cyclesRes = await query;

  if (cyclesRes.error) {
    return cyclesRes;
  }

  const rows = cyclesRes.data ?? [];
  if (rows.length === 0) {
    return cyclesRes;
  }

  const merged = await enrichSignalCyclesWithLifecycleActions(rows);

  return { data: merged, error: null };
}
