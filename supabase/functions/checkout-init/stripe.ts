import Stripe from 'npm:stripe@17.5.0';

import { buildPaidStripeCheckoutParams, type PaidStripeCheckoutInput } from './session-params.ts';

export type CheckoutInitInput = PaidStripeCheckoutInput & {
  idempotencyKey: string;
};

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY is not set');

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

// Build Stripe price data from admin plan settings so manual changes apply immediately.
export const stripeProvider = {
  async createCheckoutSession(input: CheckoutInitInput) {
    const params = buildPaidStripeCheckoutParams(input) as Stripe.Checkout.SessionCreateParams;
    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey: input.idempotencyKey,
    });

    return { url: session.url!, sessionId: session.id };
  },
};
