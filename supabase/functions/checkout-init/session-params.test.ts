import { buildPaidStripeCheckoutParams, stripeSuccessUrl } from './session-params';

describe('paid Stripe checkout parameters', () => {
  it('builds a paid subscription without an automatic trial', () => {
    const params = buildPaidStripeCheckoutParams({
      userId: 'user-1',
      planCode: 'pro',
      successUrl: 'https://app.aixsignal.com/checkout?plan=pro&success=true',
      cancelUrl: 'https://app.aixsignal.com/checkout?plan=pro&canceled=true',
      referralCode: 'STORE01',
      amountCents: 44000,
      currency: 'USD',
      paymentIntentId: 'intent-1',
      replacesSubscriptionId: 'sub_trial',
      customerEmail: 'member@example.com',
    });

    expect(params.mode).toBe('subscription');
    expect(params.line_items[0].price_data.unit_amount).toBe(44000);
    expect(params.subscription_data).toEqual({
      metadata: expect.objectContaining({
        userId: 'user-1',
        planCode: 'pro',
        paymentIntentId: 'intent-1',
        replacesSubscriptionId: 'sub_trial',
      }),
    });
    expect(params.subscription_data).not.toHaveProperty('trial_period_days');
    expect(params.success_url).toContain('session_id={CHECKOUT_SESSION_ID}');
  });

  it('adds the Stripe session placeholder with the correct separator', () => {
    expect(stripeSuccessUrl('https://app.aixsignal.com/checkout')).toBe(
      'https://app.aixsignal.com/checkout?session_id={CHECKOUT_SESSION_ID}'
    );
    expect(stripeSuccessUrl('https://app.aixsignal.com/checkout?success=true')).toBe(
      'https://app.aixsignal.com/checkout?success=true&session_id={CHECKOUT_SESSION_ID}'
    );
  });
});
