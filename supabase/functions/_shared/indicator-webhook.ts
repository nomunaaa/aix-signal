import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { validateWebhookSignature } from './auth.ts';
import { logger } from './logger.ts';
import {
  recordWebhook,
  trackWebhookErrorForBarinterval,
  clearWebhookErrorForBarinterval,
} from './db.ts';
import { getClientIP } from './rate-limit.ts';
import { payloadTimestampMs, isValidTimestamp, ONE_MINUTE, TEN_MINUTES } from './time.ts';
import {
  webhookCorsHeaders as corsHeaders,
  webhookSuccess,
  webhookFail,
} from './webhook-response.ts';
import {
  processIndicatorWebhook,
  type IndicatorWebhookKind,
  type IndicatorPayload,
} from './indicator-processing.ts';

type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { errors?: unknown; message?: string } };

type WebhookSchema<T> = {
  safeParse: (payload: unknown) => SafeParseResult<T>;
};

type IndicatorWebhookOptions<T extends IndicatorPayload> = {
  kind: IndicatorWebhookKind;
  schema: WebhookSchema<T>;
};

function buildDedupeKey(kind: IndicatorWebhookKind, payload: any): string {
  return payload?.symbol && payload?.timestamp && payload?.barinterval
    ? `${kind}:${payload.symbol}_${payload.timestamp}_${payload.barinterval}`
    : `${kind}:unknown:${Date.now()}`;
}

function collectSafeRequestHeaders(req: Request): Record<string, string> {
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (
      !normalized.includes('authorization') &&
      !normalized.includes('cookie') &&
      !normalized.includes('x-signature')
    ) {
      requestHeaders[key] = value;
    }
  });
  return requestHeaders;
}

function logReceived(
  kind: IndicatorWebhookKind,
  req: Request,
  payload: any,
  dedupeKey: string
): void {
  logger.info(`${kind.toUpperCase()} webhook ===== RECEIVED =====> `, {
    requestMetadata: {
      clientIP: getClientIP(req),
      userAgent: req.headers.get('user-agent') || 'unknown',
      referer: req.headers.get('referer') || 'unknown',
      origin: req.headers.get('origin') || 'unknown',
      contentType: req.headers.get('content-type') || 'unknown',
      url: req.url,
      method: req.method,
      requestTimestamp: new Date().toISOString(),
      headers: collectSafeRequestHeaders(req),
      signatureProvided: Boolean(req.headers.get('x-signature')),
    },
    payload: {
      symbol: payload?.symbol,
      timestamp: payload?.timestamp,
      barinterval: payload?.barinterval,
      dedupeKey,
    },
  });
}

function logFailure(
  kind: IndicatorWebhookKind,
  dedupeKey: string,
  payload: any,
  errorMessage: string
): void {
  recordWebhook('strategy-server', kind, dedupeKey, payload, 'failed', errorMessage).catch(
    (error) => {
      logger.warn('Failed to record webhook log (non-critical)', {
        dedupeKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  );
  trackWebhookErrorForBarinterval(kind, payload?.barinterval, errorMessage).catch(() => {});
}

export async function handleIndicatorWebhook<T extends IndicatorPayload>(
  req: Request,
  options: IndicatorWebhookOptions<T>
): Promise<Response> {
  const { kind, schema } = options;

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    trackWebhookErrorForBarinterval(kind, 'unknown', 'Method Not Allowed').catch(() => {});
    return webhookFail('Method Not Allowed', 405);
  }

  let payload: any = null;
  let dedupeKey = `${kind}:unknown:${Date.now()}`;

  try {
    const rawPayload = await req.text();

    try {
      payload = JSON.parse(rawPayload);
    } catch (parseError) {
      logger.error('Invalid JSON payload', {
        error: parseError,
        rawPayload: rawPayload.substring(0, 100),
      });
      logFailure(kind, `${kind}:invalid-json:${Date.now()}`, payload, 'Invalid JSON format');
      return webhookFail('Invalid JSON format', 400, { code: 'INVALID_JSON' });
    }

    if (!payload || typeof payload !== 'object') {
      logger.error('Invalid payload structure', { payload });
      logFailure(
        kind,
        `${kind}:invalid-payload:${Date.now()}`,
        payload,
        'Invalid payload structure'
      );
      return webhookFail('Invalid payload structure', 400, { code: 'VALIDATION_FAILED' });
    }

    dedupeKey = buildDedupeKey(kind, payload);
    logReceived(kind, req, payload, dedupeKey);

    const isValidSignature = await validateWebhookSignature(req, rawPayload);
    if (!isValidSignature) {
      logger.warn('Invalid HMAC signature', { dedupeKey });
      logFailure(kind, dedupeKey, payload, 'Invalid HMAC signature');
      return webhookFail('Invalid signature', 401, { code: 'INVALID_SIGNATURE' });
    }

    const validationResult = schema.safeParse(payload);
    if (!validationResult.success) {
      logger.warn('Validation failed', { dedupeKey, errors: validationResult.error.errors });
      logFailure(kind, dedupeKey, payload, 'Schema validation failed');
      return webhookFail('Schema validation failed', 400, {
        code: 'VALIDATION_FAILED',
        details: validationResult.error.errors ?? validationResult.error.message,
      });
    }

    const data = validationResult.data;
    const { symbol, timestamp, barinterval } = data;
    const tsMs = payloadTimestampMs(timestamp);

    if (!tsMs || !isValidTimestamp(tsMs)) {
      logger.error('Invalid timestamp', { dedupeKey, timestamp, barinterval, tsMs });
      logFailure(kind, dedupeKey, payload, `Invalid timestamp: ${tsMs}`);
      return webhookFail(`Invalid timestamp: ${timestamp}`, 400, { code: 'VALIDATION_FAILED' });
    }

    if (barinterval === '1m' && tsMs % ONE_MINUTE !== 0) {
      logger.warn('Timestamp not aligned to 1 minute interval', { dedupeKey, timestamp, tsMs });
    } else if (barinterval === '10m' && tsMs % TEN_MINUTES !== 0) {
      logger.warn('Timestamp not aligned to 10-minute interval', { dedupeKey, timestamp, tsMs });
    }

    const idempotencyKey = `${kind}:${symbol}_${tsMs}_${barinterval}`;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const result = await processIndicatorWebhook(supabase, kind, data, idempotencyKey);

    logger.info(`${kind.toUpperCase()} webhook ===== PROCESSED =====> `, {
      dedupeKey,
      idempotencyKey,
      eventId: result.eventId,
      duplicate: result.duplicate,
    });

    clearWebhookErrorForBarinterval(kind, barinterval).catch(() => {});
    return webhookSuccess({ success: true }, 200);
  } catch (error) {
    logger.error('Error processing webhook', { kind, error });
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logFailure(kind, dedupeKey, payload, errorMessage);

    return webhookFail(errorMessage, 500);
  }
}
