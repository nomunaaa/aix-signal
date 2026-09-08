import {
  isCurrentPaidSubscription,
  isStaleStripeSubscriptionEvent,
  replacementStripeSubscriptionId,
} from './stripe-subscription-state';

const now = new Date('2026-08-11T00:00:00.000Z').getTime();

describe('Stripe subscription replacement state', () => {
  it('blocks checkout for a current paid Pro subscription', () => {
    expect(
      isCurrentPaidSubscription(
        {
          plan_code: 'pro',
          status: 'active',
          current_period_end: '2026-09-11T00:00:00.000Z',
        },
        now
      )
    ).toBe(true);
  });

  it.each(['trialing', 'canceled', 'past_due', 'free'])(
    'replaces an existing Stripe %s subscription after paid checkout',
    (status) => {
      expect(
        replacementStripeSubscriptionId(
          {
            plan_code: status === 'free' ? 'free' : 'pro',
            status,
            provider: 'stripe',
            stripe_subscription_id: 'sub_old',
          },
          now
        )
      ).toBe('sub_old');
    }
  );

  it('accepts the paid replacement event and rejects a later stale event', () => {
    expect(
      isStaleStripeSubscriptionEvent({
        currentSubscriptionId: 'sub_old',
        incomingSubscriptionId: 'sub_paid',
        replacesSubscriptionId: 'sub_old',
      })
    ).toBe(false);
    expect(
      isStaleStripeSubscriptionEvent({
        currentSubscriptionId: 'sub_paid',
        incomingSubscriptionId: 'sub_old',
        replacesSubscriptionId: null,
      })
    ).toBe(true);
  });
});
