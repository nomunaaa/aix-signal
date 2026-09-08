export type PaidStripeCheckoutInput = {
  userId: string;
  planCode: 'pro';
  successUrl: string;
  cancelUrl: string;
  referralCode?: string;
  couponTag?: string;
  amountCents: number;
  currency: string;
  paymentIntentId: string;
  replacesSubscriptionId?: string;
  customerEmail?: string;
};

export function stripeSuccessUrl(successUrl: string): string {
  const separator = successUrl.includes('?') ? '&' : '?';
  return `${successUrl}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

export function buildPaidStripeCheckoutParams(input: PaidStripeCheckoutInput) {
  const metadata = {
    userId: input.userId,
    planCode: input.planCode,
    referralCode: input.referralCode ?? '',
    paymentIntentId: input.paymentIntentId,
    replacesSubscriptionId: input.replacesSubscriptionId ?? '',
  };

  return {
    mode: 'subscription' as const,
    ...(input.customerEmail ? { customer_email: input.customerEmail } : {}),
    client_reference_id: input.userId,
    line_items: [
      {
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: input.amountCents,
          recurring: { interval: 'month' as const },
          product_data: {
            name: `AIXSignal ${input.planCode.toUpperCase()}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: stripeSuccessUrl(input.successUrl),
    cancel_url: input.cancelUrl,
    allow_promotion_codes: !input.couponTag,
    ...(input.couponTag ? { discounts: [{ coupon: input.couponTag }] } : {}),
    subscription_data: { metadata },
    metadata,
  };
}
