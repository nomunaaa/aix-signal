import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.0';
import { payloadTimestampMs, isValidTimestamp } from './time.ts';
import {
  normalizeTrendDirection,
  normalizeVolatilityStrength,
  generateUniqueKey,
} from './normalize.ts';
import {
  broadcastToCharts,
  type TrendLongBroadcast,
  type TrendShortBroadcast,
  type VolatilityBroadcast,
} from './broadcast.ts';
import { logger } from './logger.ts';
import { recordWebhook } from './db.ts';
import type { TrendLongPayload, TrendShortPayload, VolatilityPayload } from './zod.ts';

export type IndicatorWebhookKind = 'trend_long' | 'trend_short' | 'volatility';

export type IndicatorPayload = TrendLongPayload | TrendShortPayload | VolatilityPayload;

export type IndicatorProcessingResult = {
  processed: boolean;
  duplicate: boolean;
  eventId: string | null;
  idempotencyKey: string;
  uniqueKey: string | null;
  normalizedValue: -200 | -100 | 0 | 100 | 200 | null;
  tsMs: number | null;
};

function requireTrendPayload(
  kind: IndicatorWebhookKind,
  data: IndicatorPayload
): asserts data is TrendLongPayload | TrendShortPayload {
  if (kind === 'volatility') return;
  if (!('direction' in data) || data.direction === undefined) {
    throw new Error('Invalid payload: missing required direction');
  }
}

function requireVolatilityPayload(
  kind: IndicatorWebhookKind,
  data: IndicatorPayload
): asserts data is VolatilityPayload {
  if (kind !== 'volatility') return;
  if (!('strength' in data) || data.strength === undefined) {
    throw new Error('Invalid payload: missing required strength');
  }
}

function directionLabel(value: -100 | 0 | 100): 'UP' | 'DOWN' | 'NEUTRAL' {
  if (value > 0) return 'UP';
  if (value < 0) return 'DOWN';
  return 'NEUTRAL';
}

function volatilityLabel(value: -200 | 0 | 200): 'HIGH' | 'LOW' | 'MID' {
  if (value > 0) return 'HIGH';
  if (value < 0) return 'LOW';
  return 'MID';
}

async function alreadyProcessed(
  supabase: SupabaseClient,
  idempotencyKey: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('processed_webhooks')
    .select('key')
    .eq('key', idempotencyKey)
    .maybeSingle();

  if (error) {
    logger.warn('Failed to check processed_webhooks; continuing sync processing', {
      idempotencyKey,
      error,
    });
    return false;
  }

  return Boolean(data);
}

async function markProcessed(supabase: SupabaseClient, idempotencyKey: string): Promise<void> {
  const { error } = await supabase.from('processed_webhooks').insert({
    key: idempotencyKey,
    ts: Date.now(),
  });

  if (error) {
    logger.warn('Failed to save idempotency key (might be duplicate)', {
      idempotencyKey,
      error,
    });
  }
}

export async function processIndicatorWebhook(
  supabase: SupabaseClient,
  kind: IndicatorWebhookKind,
  data: IndicatorPayload,
  idempotencyKey: string
): Promise<IndicatorProcessingResult> {
  if (!idempotencyKey) {
    throw new Error('Missing idempotencyKey');
  }

  if (!data.symbol || !data.timestamp) {
    throw new Error('Invalid payload: missing required fields');
  }

  if (data.barinterval !== '1m' && data.barinterval !== '10m') {
    throw new Error(`Invalid barinterval: ${data.barinterval}. Expected '1m' or '10m'`);
  }

  logger.info(`Processing ${kind} webhook synchronously`, {
    idempotencyKey,
    symbol: data.symbol,
  });

  if (await alreadyProcessed(supabase, idempotencyKey)) {
    logger.info('Already processed, skipping sync upsert', { idempotencyKey });
    return {
      processed: false,
      duplicate: true,
      eventId: null,
      idempotencyKey,
      uniqueKey: null,
      normalizedValue: null,
      tsMs: null,
    };
  }

  const tsMs = payloadTimestampMs(data.timestamp);
  if (!tsMs || !isValidTimestamp(tsMs)) {
    throw new Error(`Invalid timestamp: ${tsMs}`);
  }

  const uniqueKey = generateUniqueKey(data.symbol, data.barinterval, tsMs, data.indicator_name);
  const tsIso = new Date(tsMs).toISOString();

  if (kind === 'volatility') {
    requireVolatilityPayload(kind, data);
    const normalizedValue = normalizeVolatilityStrength(data.strength);

    const { data: existingEvent } = await supabase
      .from('volatility_events')
      .select('id, value, raw_strength')
      .eq('unique_key', uniqueKey)
      .maybeSingle();

    if (existingEvent) {
      logger.info('Replacing existing volatility event', {
        idempotencyKey,
        symbol: data.symbol,
        before: {
          value: existingEvent.value,
          raw_strength: existingEvent.raw_strength,
        },
        after: { value: normalizedValue, raw_strength: data.strength },
      });
    }

    const { error: upsertError, data: upsertedData } = await supabase
      .from('volatility_events')
      .upsert(
        {
          symbol: data.symbol,
          barinterval: data.barinterval,
          value: normalizedValue,
          raw_strength: data.strength,
          source: data.source,
          indicator_name: data.indicator_name,
          ts: tsIso,
          unique_key: uniqueKey,
        },
        {
          onConflict: 'unique_key',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (upsertError) {
      throw new Error(`Failed to upsert volatility_events: ${upsertError.message}`);
    }

    const { error: updateError } = await supabase.from('chart_states').upsert(
      {
        symbol: data.symbol,
        bar_interval: data.barinterval,
        volatility: volatilityLabel(normalizedValue),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'symbol,bar_interval' }
    );

    if (updateError) {
      logger.warn('Failed to update chart_states volatility', { error: updateError });
    }

    const broadcastPayload: VolatilityBroadcast = {
      kind: 'volatility',
      symbol: data.symbol,
      barinterval: data.barinterval,
      value: normalizedValue,
      raw_strength: data.strength,
      ts: tsMs,
      indicator_name: data.indicator_name,
    };

    try {
      await broadcastToCharts(supabase, data.symbol, broadcastPayload);
    } catch (broadcastError) {
      logger.error('Broadcast failed (non-critical)', {
        idempotencyKey,
        symbol: data.symbol,
        error: broadcastError,
      });
    }

    await markProcessed(supabase, idempotencyKey);
    recordWebhookSuccess(kind, data, idempotencyKey, tsMs);

    return {
      processed: true,
      duplicate: false,
      eventId: upsertedData?.id ?? null,
      idempotencyKey,
      uniqueKey,
      normalizedValue,
      tsMs,
    };
  }

  requireTrendPayload(kind, data);
  const normalizedValue = normalizeTrendDirection(data.direction);
  const timeframe = kind === 'trend_long' ? 'long' : 'short';
  const chartStatePatch =
    kind === 'trend_long'
      ? { trend_long: directionLabel(normalizedValue) }
      : { trend_short: directionLabel(normalizedValue) };

  const { data: existingEvent } = await supabase
    .from('trend_events')
    .select('id, value, raw_direction')
    .eq('unique_key', uniqueKey)
    .maybeSingle();

  if (existingEvent) {
    logger.info(`Replacing existing ${kind} event`, {
      idempotencyKey,
      symbol: data.symbol,
      before: {
        value: existingEvent.value,
        raw_direction: existingEvent.raw_direction,
      },
      after: { value: normalizedValue, raw_direction: data.direction },
    });
  }

  const { error: upsertError, data: upsertedData } = await supabase
    .from('trend_events')
    .upsert(
      {
        timeframe,
        symbol: data.symbol,
        barinterval: data.barinterval,
        value: normalizedValue,
        raw_direction: data.direction,
        type: kind,
        source: data.source,
        indicator_name: data.indicator_name,
        ts: tsIso,
        unique_key: uniqueKey,
      },
      {
        onConflict: 'unique_key',
        ignoreDuplicates: false,
      }
    )
    .select('id')
    .single();

  if (upsertError) {
    throw new Error(`Failed to upsert trend_events: ${upsertError.message}`);
  }

  const { error: updateError } = await supabase.from('chart_states').upsert(
    {
      symbol: data.symbol,
      bar_interval: data.barinterval,
      ...chartStatePatch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'symbol,bar_interval' }
  );

  if (updateError) {
    logger.warn(`Failed to update chart_states ${kind}`, { error: updateError });
  }

  const broadcastPayload: TrendLongBroadcast | TrendShortBroadcast =
    kind === 'trend_long'
      ? {
          kind: 'trend_long',
          symbol: data.symbol,
          barinterval: data.barinterval,
          value: normalizedValue,
          raw_direction: data.direction,
          ts: tsMs,
          indicator_name: data.indicator_name,
        }
      : {
          kind: 'trend_short',
          symbol: data.symbol,
          barinterval: data.barinterval,
          value: normalizedValue,
          raw_direction: data.direction,
          ts: tsMs,
          indicator_name: data.indicator_name,
        };

  try {
    await broadcastToCharts(supabase, data.symbol, broadcastPayload);
  } catch (broadcastError) {
    logger.error('Broadcast failed (non-critical)', {
      idempotencyKey,
      symbol: data.symbol,
      error: broadcastError,
    });
  }

  await markProcessed(supabase, idempotencyKey);
  recordWebhookSuccess(kind, data, idempotencyKey, tsMs);

  return {
    processed: true,
    duplicate: false,
    eventId: upsertedData?.id ?? null,
    idempotencyKey,
    uniqueKey,
    normalizedValue,
    tsMs,
  };
}

function recordWebhookSuccess(
  kind: IndicatorWebhookKind,
  data: IndicatorPayload,
  idempotencyKey: string,
  tsMs: number
): void {
  const dedupeKey = `${kind}:${data.symbol}_${tsMs}_${data.barinterval}`;
  const raw =
    kind === 'volatility'
      ? {
          symbol: data.symbol,
          barinterval: data.barinterval,
          strength: (data as VolatilityPayload).strength,
          timestamp: data.timestamp,
          source: data.source,
          indicator_name: data.indicator_name,
        }
      : {
          symbol: data.symbol,
          barinterval: data.barinterval,
          direction: (data as TrendLongPayload | TrendShortPayload).direction,
          timestamp: data.timestamp,
          source: data.source,
          indicator_name: data.indicator_name,
        };

  recordWebhook('strategy-server', kind, dedupeKey, raw, 'success').catch((error) => {
    logger.warn('Failed to record webhook log (non-critical)', {
      idempotencyKey,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}
