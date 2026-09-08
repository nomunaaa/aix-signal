// supabase/functions/checkout-init/index.ts
import { createClient } from "npm:@supabase/supabase-js@2.103.0";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import { stripeProvider } from "./stripe.ts";
import { heleketProvider } from "../_shared/providers/heleket.ts";
import { logger } from "../_shared/logger.ts";
import { lookupPartnerCouponByCode } from "../_shared/partner-coupon.ts";
import {
  isCurrentPaidSubscription,
  replacementStripeSubscriptionId,
} from "../_shared/stripe-subscription-state.ts";

type Provider = "stripe" | "bank" | "heleket";
type PlanCode = "pro";

type Body = {
  planCode: PlanCode;
  provider: Provider;
  referralCode?: string;
  couponCode?: string;
  pointsUsed?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || "";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function mustPlan(p: unknown): PlanCode {
  if (p === "pro") return "pro";
  throw new Error("Invalid planCode");
}

type PlanPricing = {
  displayName: string;
  monthlyPriceCents: number;
  currency: string;
};

type StoreReferralCode = {
  id: string;
  referral_code: string;
};

const DEFAULT_PLAN_PRICING: Record<PlanCode, PlanPricing> = {
  pro: {
    displayName: "Pro",
    monthlyPriceCents: 30000,
    currency: "USD",
  },
};

function computeFinalAmountCents(input: {
  baseAmountCents: number;
  referralCode?: string;
  couponDiscountCents?: number;
  pointsUsed?: number;
  provider: Provider;
}) {
  const base = Math.max(0, Math.floor(input.baseAmountCents));

  const referralDiscount = input.referralCode ? Math.round(base * 0.5) : 0;
  const couponDiscount = Math.min(
    Math.max(0, Math.floor(Number(input.couponDiscountCents || 0))),
    Math.max(0, base - referralDiscount)
  );

  const points = Math.max(0, Math.floor(Number(input.pointsUsed || 0)));
  const afterDiscounts = Math.max(0, base - referralDiscount - couponDiscount);
  const pointsApplied = Math.min(points, afterDiscounts);

  let subtotal = Math.max(0, afterDiscounts - pointsApplied);

  if (input.provider === "heleket" && subtotal > 0) {
    const cryptoDiscount = Math.round(subtotal * 0.05);
    subtotal = Math.max(0, subtotal - cryptoDiscount);
  }

  return {
    base,
    referralDiscount,
    couponDiscount,
    pointsApplied,
    final: subtotal,
  };
}

function resolveBaseUrl(req: Request) {
  if (SITE_URL) return SITE_URL.replace(/\/$/, "");

  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");

  return "https://app.aixsignal.com";
}

type ServiceClient = ReturnType<typeof createClient>;

async function loadPlanPricing(
  supabaseSrv: ServiceClient,
  planCode: PlanCode
): Promise<PlanPricing> {
  const fallback = DEFAULT_PLAN_PRICING[planCode];

  const { data, error } = await supabaseSrv
    .from("admin_panel_plan_settings")
    .select("display_name, monthly_price_cents, currency, is_active")
    .eq("plan_code", planCode)
    .maybeSingle();

  if (error || !data || data.is_active === false) return fallback;

  const monthlyPriceCents = Number(data.monthly_price_cents);
  const currency = String(data.currency ?? fallback.currency).trim().toUpperCase();

  return {
    displayName: String(data.display_name ?? fallback.displayName),
    monthlyPriceCents: Number.isFinite(monthlyPriceCents)
      ? Math.max(0, Math.round(monthlyPriceCents))
      : fallback.monthlyPriceCents,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : fallback.currency,
  };
}

async function loadCurrentSubscription(supabaseSrv: ServiceClient, userId: string) {
  const { data, error } = await supabaseSrv
    .from("subscriptions")
    .select("plan_code, status, provider, stripe_subscription_id, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("current subscription lookup failed", { error, userId });
    throw new Error("Subscription validation failed");
  }

  return data;
}

async function resolveActiveStoreReferralCode(
  supabaseSrv: ServiceClient,
  rawCode?: string
): Promise<string | null> {
  const code = rawCode?.trim().toUpperCase();
  if (!code) return null;

  const { data, error } = await supabaseSrv
    .from("partner_accounts")
    .select("id, referral_code")
    .eq("tier", "store")
    .eq("status", "active")
    .eq("referral_code", code)
    .maybeSingle();

  if (error) {
    logger.error("store referral lookup failed", { error });
    throw new Error("Referral code validation failed");
  }

  const row = data as StoreReferralCode | null;
  return row?.referral_code?.trim().toUpperCase() ?? null;
}

async function upsertHeleketPendingSubscription(
  supabaseSrv: ServiceClient,
  userId: string,
  planCode: PlanCode,
  orderId: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: existingSub } = await supabaseSrv
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id, cancel_at_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const { error: subErr } = await supabaseSrv.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: existingSub?.stripe_customer_id ?? null,
      stripe_subscription_id: existingSub?.stripe_subscription_id ?? null,
      cancel_at_period_end: existingSub?.cancel_at_period_end ?? false,
      provider: "heleket",
      plan_code: planCode,
      heleket_invoice_id: orderId,
      status: "pending",
      updated_at: nowIso,
    },
    { onConflict: "user_id" }
  );

  if (subErr) {
    logger.error("subscriptions upsert (heleket pending) failed", { subErr });
    throw new Error(subErr.message || "subscriptions upsert failed");
  }
}

async function completeHeleketCheckout(
  supabaseSrv: ServiceClient,
  input: {
    userId: string;
    planCode: PlanCode;
    body: Body;
    calcFinal: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
    intentId: string;
    storeReferralCode: string | null;
  }
) {
  const envErr = heleketProvider.validateEnv();
  if (envErr) return json({ error: envErr }, 500);

  const orderId = crypto.randomUUID();

  const out = await heleketProvider.createCheckoutSession({
    userId: input.userId,
    planCode: input.planCode,
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    referralCode: input.storeReferralCode ?? undefined,
    couponCode: input.body.couponCode,
    pointsUsed: input.body.pointsUsed,
    idempotencyKey: orderId,
    amountCents: input.calcFinal,
    currency: input.currency,
  });

  await supabaseSrv
    .from("payment_intents")
    .update({ provider_invoice_id: out.invoiceUuid, status: "redirected" })
    .eq("id", input.intentId);

  await upsertHeleketPendingSubscription(supabaseSrv, input.userId, input.planCode, orderId);

  return json({ url: out.url, invoiceId: out.invoiceUuid });
}

async function handleCheckoutPost(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);
  const jwt = authHeader.slice("Bearer ".length);

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401);
  const user = userRes.user;

  const body = (await req.json()) as Body;
  const planCode = mustPlan(body.planCode);
  const provider = body.provider;

  const baseUrl = resolveBaseUrl(req);
  const successUrl = `${baseUrl}/checkout?plan=${planCode}&success=true`;
  const cancelUrl = `${baseUrl}/checkout?plan=${planCode}&canceled=true`;

  const supabaseSrv = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
    auth: { persistSession: false },
  });
  const planPricing = await loadPlanPricing(supabaseSrv, planCode);
  const currentSubscription = await loadCurrentSubscription(supabaseSrv, user.id);

  if (isCurrentPaidSubscription(currentSubscription)) {
    return json({ error: "An active Pro subscription already exists" }, 409);
  }

  const replacesSubscriptionId = replacementStripeSubscriptionId(currentSubscription);
  const storeReferralCode = await resolveActiveStoreReferralCode(supabaseSrv, body.referralCode);

  if (body.referralCode?.trim() && !storeReferralCode) {
    return json({ error: "Invalid referral code" }, 400);
  }

  let couponDiscountCents = 0;
  if (body.couponCode?.trim()) {
    const row = await lookupPartnerCouponByCode(supabaseSrv, body.couponCode);
    if (row) {
      if (row.discount_percent_bps != null) {
        const base = planPricing.monthlyPriceCents;
        couponDiscountCents = Math.round((base * row.discount_percent_bps) / 10000);
      } else if (row.discount_amount_cents != null) {
        couponDiscountCents = row.discount_amount_cents;
      }
    }
  }

  const calc = computeFinalAmountCents({
    baseAmountCents: planPricing.monthlyPriceCents,
    referralCode: storeReferralCode ?? undefined,
    pointsUsed: body.pointsUsed,
    provider,
    couponDiscountCents,
  });

  const { data: intentRow, error: intentErr } = await supabaseSrv
    .from("payment_intents")
    .insert({
      user_id: user.id,
      provider,
      plan_code: planCode,
      referral_code: storeReferralCode,
      coupon_code: body.couponCode ?? null,
      points_used: Number(body.pointsUsed || 0),
      status: "created",
    })
    .select("id")
    .single();

  if (intentErr || !intentRow?.id) {
    logger.error("payment_intents insert failed", { intentErr });
    throw new Error(intentErr?.message || "payment_intents insert failed");
  }

  if (calc.final === 0) {
    return json({ url: `${successUrl}&paid=points` });
  }

  if (provider === "stripe") {
    const out = await stripeProvider.createCheckoutSession({
      userId: user.id,
      planCode,
      successUrl,
      cancelUrl,
      referralCode: storeReferralCode ?? undefined,
      couponTag: undefined,
      amountCents: calc.final,
      currency: planPricing.currency,
      paymentIntentId: intentRow.id,
      replacesSubscriptionId,
      idempotencyKey: intentRow.id,
      customerEmail: user.email ?? undefined,
    });

    const { error: intentUpdateError } = await supabaseSrv
      .from("payment_intents")
      .update({ provider_invoice_id: out.sessionId, status: "redirected" })
      .eq("id", intentRow.id);

    if (intentUpdateError) {
      logger.error("Stripe payment intent correlation failed", {
        error: intentUpdateError,
        intentId: intentRow.id,
        sessionId: out.sessionId,
      });
    }

    return json(out);
  }

  if (provider === "heleket") {
    return await completeHeleketCheckout(supabaseSrv, {
      userId: user.id,
      planCode,
      body,
      calcFinal: calc.final,
      currency: planPricing.currency,
      successUrl,
      cancelUrl,
      intentId: intentRow.id,
      storeReferralCode,
    });
  }

  return json({ error: "Provider not implemented" }, 400);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  try {
    return await handleCheckoutPost(req);
  } catch (e) {
    logger.error("checkout-init error", { err: e instanceof Error ? e.message : String(e) });
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
