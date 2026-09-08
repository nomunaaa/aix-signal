// supabase/functions/checkout-init/providers/stripe.ts
import Stripe from "npm:stripe@17.5.0";

type CheckoutInitInput = {
  userId: string;
  planCode: "pro";
  successUrl: string;
  cancelUrl: string;
  referralCode?: string;
  couponTag?: string; // must be Stripe coupon id if used
  idempotencyKey: string;
  customerEmail?: string;
};

const stripeSecret =
  Deno.env.get("STRIPE_SECRET_KEY")

if (!stripeSecret) throw new Error("STRIPE_SECRET_KEY is not set");

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const priceMap: Record<string, string> = {
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
};

function mustPrice(planCode: string) {
  const p = priceMap[planCode];
  if (!p) throw new Error(`Stripe price missing for planCode=${planCode}`);
  return p;
}

export const stripeProvider = {
  async createCheckoutSession(input: CheckoutInitInput) {
    const priceId = mustPrice(input.planCode);

    const discounts = input.couponTag ? [{ coupon: input.couponTag }] : undefined;

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
        client_reference_id: input.userId,

        line_items: [{ price: priceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,

        // show "Add promotion code" only when a coupon was not pre-applied
        allow_promotion_codes: !input.couponTag,

        discounts,

        subscription_data: {
          metadata: {
            userId: input.userId,
            planCode: input.planCode,
            referralCode: input.referralCode ?? "",
          },
        },

        metadata: {
          userId: input.userId,
          planCode: input.planCode,
          referralCode: input.referralCode ?? "",
        },
      },
      { idempotencyKey: input.idempotencyKey }
    );

    return { url: session.url! };
  },
};
