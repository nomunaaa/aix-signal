export const REFERRAL_STORAGE_KEY = 'aixsignal_referral_code';

export function normalizeReferralCode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

export function buildAuthCallbackUrl(origin: string, referralCode?: string | null) {
  const callbackUrl = new URL('/auth/callback', origin);
  const normalizedReferralCode = normalizeReferralCode(referralCode);

  if (normalizedReferralCode) {
    callbackUrl.searchParams.set('ref', normalizedReferralCode);
  }

  return callbackUrl.toString();
}

export function buildSignupReferralPath(referralCode?: string | null) {
  const normalizedReferralCode = normalizeReferralCode(referralCode);
  if (!normalizedReferralCode) return '/signup';

  const searchParams = new URLSearchParams({ ref: normalizedReferralCode });
  return `/signup?${searchParams.toString()}`;
}
