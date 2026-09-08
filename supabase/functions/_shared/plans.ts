export type PlanCode = 'free' | 'pro';

type SubscriptionLike = {
  plan_code?: unknown;
  status?: unknown;
  current_period_end?: string | null;
};

export function normalizePlanCode(value: unknown): PlanCode {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'free' || raw === 'pro') return raw;
  return 'free';
}

export function isSubscriptionActive(
  subscription: SubscriptionLike | null | undefined,
  now = new Date(),
): boolean {
  const status = String(subscription?.status ?? '').trim().toLowerCase();
  if (status !== 'active' && status !== 'trialing') return false;

  const periodEnd = subscription?.current_period_end;
  if (!periodEnd) return true;

  const periodEndTime = new Date(periodEnd).getTime();
  if (Number.isNaN(periodEndTime)) return true;

  return periodEndTime >= now.getTime();
}

export function effectivePlanCode(
  subscription: SubscriptionLike | null | undefined,
  now = new Date(),
): PlanCode {
  if (!isSubscriptionActive(subscription, now)) return 'free';
  return normalizePlanCode(subscription?.plan_code);
}
