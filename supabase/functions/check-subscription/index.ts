import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'npm:stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { corsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

type PlanCode = 'free' | 'pro';

type LocalSubscription = {
  plan_code: string | null;
  status: string | null;
  current_period_end: string | null;
};

function normalizePlanCode(value: unknown): PlanCode {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'free' || raw === 'pro') return raw;
  return 'free';
}

function isCurrentSubscription(subscription: LocalSubscription | null | undefined) {
  const status = String(subscription?.status ?? '')
    .trim()
    .toLowerCase();
  if (status !== 'active' && status !== 'trialing') return false;

  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return true;

  const endTime = new Date(periodEnd).getTime();
  return Number.isNaN(endTime) || endTime >= Date.now();
}

function jsonSubscriptionResponse(
  req: Request,
  payload: {
    subscribed: boolean;
    in_trial: boolean;
    product_id: string | null;
    subscription_end: string | null;
    plan: PlanCode;
  }
) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    status: 200,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    logStep('Function started');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    logStep('Authorization header found');

    const token = authHeader.replace('Bearer ', '');
    logStep('Authenticating user with token');

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id, email: user.email });

    const { data: localSubscription, error: localSubscriptionError } = await supabaseClient
      .from('subscriptions')
      .select('plan_code, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (localSubscriptionError) {
      logStep('Local subscription lookup failed', { message: localSubscriptionError.message });
    }

    const localStatus = String(localSubscription?.status ?? '')
      .trim()
      .toLowerCase();
    const localPlan = normalizePlanCode(localSubscription?.plan_code);

    if (localSubscription && localPlan === 'free') {
      logStep('Using explicit local free subscription', {
        status: localStatus,
        current_period_end: localSubscription.current_period_end,
      });

      return jsonSubscriptionResponse(req, {
        subscribed: false,
        in_trial: false,
        product_id: null,
        subscription_end: null,
        plan: 'free',
      });
    }

    if (localSubscription && isCurrentSubscription(localSubscription)) {
      logStep('Using local subscription', {
        plan: localPlan,
        status: localStatus,
        current_period_end: localSubscription.current_period_end,
      });

      return jsonSubscriptionResponse(req, {
        subscribed: localPlan !== 'free',
        in_trial: localStatus === 'trialing',
        product_id: null,
        subscription_end: localSubscription.current_period_end,
        plan: localPlan,
      });
    }

    if (
      localStatus === 'trialing' &&
      localSubscription?.current_period_end &&
      new Date(localSubscription.current_period_end).getTime() < Date.now()
    ) {
      await supabaseClient
        .from('subscriptions')
        .update({
          plan_code: 'free',
          status: 'free',
          current_period_start: null,
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('status', 'trialing');
      logStep('Expired local trial downgraded to free', { userId: user.id });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      logStep('Stripe key missing; returning local free state');
      return new Response(JSON.stringify({ subscribed: false, in_trial: false, plan: 'free' }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    logStep('Stripe key verified');

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep('No customer found, updating unsubscribed state');
      return new Response(JSON.stringify({ subscribed: false, plan: 'free' }), {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep('Found Stripe customer', { customerId });

    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });

    let isTrialing = false;
    if (subscriptions.data.length === 0) {
      const trialSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'trialing',
        limit: 1,
      });
      if (trialSubs.data.length > 0) {
        subscriptions = trialSubs;
        isTrialing = true;
      }
    }

    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let plan = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep('Subscription found', {
        subscriptionId: subscription.id,
        endDate: subscriptionEnd,
        isTrialing,
      });

      productId = subscription.items.data[0].price.product as string;
      const priceId = subscription.items.data[0].price.id;

      // Map price ID to plan
      const proPriceId = Deno.env.get('STRIPE_PRICE_PRO');
      const metadataPlan = normalizePlanCode(
        subscription.metadata?.planCode ?? subscription.metadata?.plan_code
      );

      if (metadataPlan === 'pro' || priceId === proPriceId) plan = 'pro';

      logStep('Determined subscription plan', { productId, priceId, plan });
    } else {
      logStep('No active or trialing subscription found');
    }

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        in_trial: isTrialing,
        product_id: productId,
        subscription_end: subscriptionEnd,
        plan: plan,
      }),
      {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in check-subscription', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
