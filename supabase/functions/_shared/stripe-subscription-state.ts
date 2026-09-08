export type StoredSubscription = {
  plan_code?: string | null;
  status?: string | null;
  provider?: string | null;
  stripe_subscription_id?: string | null;
  current_period_end?: string | null;
};

export function isCurrentPaidSubscription(
  subscription: StoredSubscription | null,
  nowMs = Date.now()
): boolean {
  if (subscription?.plan_code !== 'pro' || subscription.status !== 'active') return false;
  if (!subscription.current_period_end) return true;

  const periodEnd = new Date(subscription.current_period_end).getTime();
  return Number.isNaN(periodEnd) || periodEnd >= nowMs;
}

export function replacementStripeSubscriptionId(
  subscription: StoredSubscription | null,
  nowMs = Date.now()
): string | undefined {
  if (
    subscription?.provider !== 'stripe' ||
    !subscription.stripe_subscription_id ||
    isCurrentPaidSubscription(subscription, nowMs)
  ) {
    return undefined;
  }

  return subscription.stripe_subscription_id;
}

export function isStaleStripeSubscriptionEvent(input: {
  currentSubscriptionId: string | null;
  incomingSubscriptionId: string;
  replacesSubscriptionId: string | null;
}): boolean {
  return Boolean(
    input.currentSubscriptionId &&
    input.currentSubscriptionId !== input.incomingSubscriptionId &&
    input.replacesSubscriptionId !== input.currentSubscriptionId
  );
}
