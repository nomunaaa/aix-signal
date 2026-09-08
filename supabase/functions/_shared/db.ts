import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { normalizePlanCode } from './plans.ts';


export const supa = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function recordWebhook(
  source: string,
  event_type: string,
  dedupe_key: string,
  raw: any,
  status: string = 'received',
  error_message?: string,
  audit?: {
    request_id?: string;
    hmac_verified_at?: string | null;
    validation_passes?: string[];
    client_ip?: string;
  }
) {
  const { data } = await supa
    .from('webhook_logs')
    .select('id')
    .eq('dedupe_key', dedupe_key)
    .maybeSingle();

  if (data) return { duplicate: true };

  await supa.from('webhook_logs').insert({
    source,
    event_type,
    dedupe_key,
    raw,
    status,
    error_message,
    audit: audit ?? null,
  });

  return { duplicate: false };
}

export async function updateUserPlan(userId: string, planCode: string) {
  const normalizedPlan = normalizePlanCode(planCode);
  const nowIso = new Date().toISOString();
  const subscriptionPatch: Record<string, unknown> = {
    user_id: userId,
    plan_code: normalizedPlan,
    updated_at: nowIso,
  };

  if (normalizedPlan === 'free') {
    subscriptionPatch.status = 'free';
  }

  await supa.from('subscriptions').upsert(
    subscriptionPatch,
    { onConflict: 'user_id' },
  );
}

// Webhook error tracking constants
const ERROR_THRESHOLD = {
  '1m': 5 * 60 * 1000,  // 5 minutes
  '10m': 60 * 60 * 1000, // 60 minutes
  'unknown': 5 * 60 * 1000, // 5 minutes
} as const;

type BarInterval = '1m' | '10m' | 'unknown';

/**
 * @param webhookType - 'signal', 'trend_long', 'volatility',...
 * @param barinterval - Any string (will be normalized to '1m', '10m', or 'unknown')
 * @param errorMessage - Error message
 */
export async function trackWebhookErrorForBarinterval(
  webhookType: string,
  barinterval: string | undefined | null,
  errorMessage?: string
): Promise<void> {
  if (!barinterval) {
    await trackWebhookError(webhookType, 'unknown', errorMessage);
    return;
  }
  
  if (barinterval === '1m' || barinterval === '10m') {
    await trackWebhookError(webhookType, barinterval as '1m' | '10m', errorMessage);
  } else {
    await trackWebhookError(webhookType, 'unknown', errorMessage);
  }
}

/**
 * @param webhookType - 'signal', 'trend_long', 'volatility',...
 * @param barinterval - '1m', '10m', 'unknown'
 * @param errorMessage - Error message
 */
export async function trackWebhookError(
  webhookType: string,
  barinterval: BarInterval,
  errorMessage?: string
): Promise<void> {
  try {
    const now = new Date();
    const nowMs = now.getTime();
    
    const { data, error } = await supa
      .from('webhook_error_state')
      .select('*')
      .eq('webhook_type', webhookType)
      .eq('barinterval', barinterval)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching webhook_error_state:', error);
      return;
    }

    if (!data) {
      await supa.from('webhook_error_state').insert({
        webhook_type: webhookType,
        barinterval,
        first_error_at: now.toISOString(),
        last_error_at: now.toISOString(),
        error_count: 1,
        notified: false,
        error_message: errorMessage || null,
      });
      return;
    }

    const firstErrorMs = new Date(data.first_error_at).getTime();
    const duration = nowMs - firstErrorMs;
    const threshold = ERROR_THRESHOLD[barinterval];
    const updatedErrorMessage = errorMessage || data.error_message || null;
    
    if (duration >= threshold && !data.notified) {
      await sendAdminTelegramNotification(
        webhookType, 
        barinterval, 
        duration, 
        data.error_count + 1,
        updatedErrorMessage
      );
      
      await supa
        .from('webhook_error_state')
        .update({
          notified: true,
          last_error_at: now.toISOString(),
          error_count: data.error_count + 1,
          error_message: updatedErrorMessage,
        })
        .eq('webhook_type', webhookType)
        .eq('barinterval', barinterval);
    } else {
      await supa
        .from('webhook_error_state')
        .update({
          last_error_at: now.toISOString(),
          error_count: data.error_count + 1,
          error_message: updatedErrorMessage,
        })
        .eq('webhook_type', webhookType)
        .eq('barinterval', barinterval);
    }
  } catch (err) {
    console.error('Error tracking webhook error:', err);
  }
}

/**
 * @param webhookType - 'signal', 'trend_long', 'volatility',...
 * @param barinterval - Any string (will be normalized to '1m', '10m', or 'unknown')
 */
export async function clearWebhookErrorForBarinterval(
  webhookType: string,
  barinterval: string | undefined | null
): Promise<void> {
  if (!barinterval) {
    return;
  }
  
  if (barinterval === '1m' || barinterval === '10m') {
    await clearWebhookError(webhookType, barinterval as '1m' | '10m');
  }
}

/**
 * @param webhookType - 'signal', 'trend_long', 'volatility',...
 * @param barinterval - '1m', '10m', 'unknown'
 */
export async function clearWebhookError(
  webhookType: string,
  barinterval: BarInterval
): Promise<void> {
  try {
    await supa
      .from('webhook_error_state')
      .delete()
      .eq('webhook_type', webhookType)
      .or(`barinterval.eq.${barinterval},barinterval.eq.unknown`);
  } catch (err) {
    console.error('Error clearing webhook error state:', err);
  }
}

/**
 * Send Telegram notification
 */
async function sendAdminTelegramNotification(
  webhookType: string,
  barinterval: BarInterval,
  durationMs: number,
  errorCount: number,
  errorMessage?: string | null
): Promise<void> {
  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    
    if (!TELEGRAM_BOT_TOKEN) {
      console.warn('TELEGRAM_BOT_TOKEN not configured - skipping admin notification');
      return;
    }
    
    const TELEGRAM_GROUPS = {
      DEV: -1003321997325
    };

    const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

    const durationMinutes = Math.floor(durationMs / (60 * 1000));
    const durationHours = Math.floor(durationMinutes / 60);
    const durationText = durationHours > 0 
      ? `${durationHours}h ${durationMinutes % 60}m`
      : `${durationMinutes}m`;

    const errorMessageText = errorMessage ? `\n<b>Last Error:</b> ${errorMessage}` : '';
    
    const message = `<b>Continuous Webhook Error</b>

<b>Webhook Type:</b> ${webhookType}
<b>Bar Interval:</b> ${barinterval}
<b>Duration:</b> ${durationText}
<b>Error Count:</b> ${errorCount}${errorMessageText}.`;

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUPS.DEV,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send Telegram notification:', error);
    }
  } catch (err) {
    console.error('Error sending Telegram notification:', err);
  }
}
