import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import Stripe from 'npm:stripe@17.5.0';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

import { supa, updateUserPlan } from '../_shared/db.ts';
import { logger } from '../_shared/logger.ts';
import { recordPayment } from '../_shared/payments-ledger.ts';
import { recordPartnerCommissionEventFromStripe } from '../_shared/partner-stripe-payment.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function idFromExpandable(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Missing auth' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) return json({ error: 'Stripe is not configured' }, 500);

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: authData, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

    const body = (await req.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();
    if (!sessionId?.startsWith('cs_')) return json({ error: 'Invalid checkout session' }, 400);

    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'subscription.latest_invoice'],
    });

    const sessionUserId = session.client_reference_id ?? session.metadata?.userId ?? null;
    if (sessionUserId !== authData.user.id) return json({ error: 'Forbidden' }, 403);

    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      return json({ paid: false, status: session.payment_status ?? session.status }, 202);
    }

    if (!session.subscription || typeof session.subscription === 'string') {
      return json({ paid: false, status: 'subscription_pending' }, 202);
    }

    const subscription = session.subscription;
    if (subscription.status !== 'active') {
      return json({ paid: false, status: subscription.status }, 202);
    }

    const planCode = subscription.metadata?.planCode ?? session.metadata?.planCode;
    if (planCode !== 'pro') return json({ error: 'Invalid subscription plan' }, 409);

    const currentPeriodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null;
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

    const { error: subscriptionError } = await supa.from('subscriptions').upsert(
      {
        user_id: authData.user.id,
        provider: 'stripe',
        plan_code: 'pro',
        status: 'active',
        stripe_customer_id: idFromExpandable(subscription.customer),
        stripe_subscription_id: subscription.id,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (subscriptionError) throw new Error(subscriptionError.message);

    await updateUserPlan(authData.user.id, 'pro');

    const paymentIntentId =
      subscription.metadata?.paymentIntentId ?? session.metadata?.paymentIntentId;
    let paymentIntentUpdate = supa
      .from('payment_intents')
      .update({ provider_invoice_id: session.id, status: 'paid' })
      .eq('user_id', authData.user.id)
      .eq('provider', 'stripe');
    paymentIntentUpdate = paymentIntentId
      ? paymentIntentUpdate.eq('id', paymentIntentId)
      : paymentIntentUpdate.eq('provider_invoice_id', session.id);
    const { error: paymentIntentError } = await paymentIntentUpdate;
    if (paymentIntentError) {
      logger.error('checkout-status payment intent update failed', {
        error: paymentIntentError.message,
        sessionId: session.id,
      });
    }

    const invoice =
      subscription.latest_invoice && typeof subscription.latest_invoice !== 'string'
        ? subscription.latest_invoice
        : null;
    if (invoice?.id && invoice.amount_paid > 0) {
      await recordPayment({
        userId: authData.user.id,
        provider: 'stripe',
        providerRef: invoice.id,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        planCode: 'pro',
      });
      await recordPartnerCommissionEventFromStripe(
        authData.user.id,
        invoice.amount_paid,
        invoice.id,
        'checkout.session.completed.reconcile'
      );
    }

    const replacesSubscriptionId =
      subscription.metadata?.replacesSubscriptionId ?? session.metadata?.replacesSubscriptionId;
    if (replacesSubscriptionId && replacesSubscriptionId !== subscription.id) {
      try {
        await stripe.subscriptions.cancel(replacesSubscriptionId);
      } catch (error) {
        logger.error('checkout-status old trial cancellation failed', {
          replacesSubscriptionId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return json({ paid: true, status: 'active', plan: 'pro' });
  } catch (error) {
    logger.error('checkout-status failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return json({ error: 'Unable to verify checkout' }, 500);
  }
});
