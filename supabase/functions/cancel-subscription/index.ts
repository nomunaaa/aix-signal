import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.103.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CANCEL-SUBSCRIPTION] ${step}${detailsStr}`);
};

/**
 * 구독 취소 — 즉시 해지가 아니라 현재 결제 기간 끝에 종료(cancel_at_period_end).
 * UI 문구가 "현재 결제 기간이 끝나면 자동으로 종료됩니다"이므로 이에 맞춘다.
 *
 * 상태 반영은 이 함수가 직접 하지 않는다. Stripe가 customer.subscription.updated를
 * 쏘면 stripe-webhook이 subscriptions 테이블을 upsert한다(단일 경로 유지).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    // 저장된 stripe_subscription_id를 먼저 쓰고, 없으면 이메일로 되짚는다.
    // (웹훅이 한 번도 안 돈 계정 등 로컬 행이 비어 있는 경우 대비)
    const { data: localSub } = await supabaseClient
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let subscriptionId = localSub?.stripe_subscription_id ?? null;

    if (!subscriptionId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) throw new Error("No Stripe customer found for this user");

      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 1,
      });
      if (subs.data.length === 0) throw new Error("No active subscription found");
      subscriptionId = subs.data[0].id;
    }
    logStep("Resolved subscription", { subscriptionId });

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    logStep("Subscription set to cancel at period end", {
      subscriptionId: updated.id,
      currentPeriodEnd: updated.current_period_end,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        cancel_at_period_end: updated.cancel_at_period_end,
        current_period_end: updated.current_period_end,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in cancel-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
