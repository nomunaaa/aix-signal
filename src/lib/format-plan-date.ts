import { BETA_TEST, UNLIMITED_TRIAL_DAYS_THRESHOLD } from '@/config/beta';

/** 플랜/구독 종료일시 표시 — 날짜만으로는 정확한 종료 시점을 알 수 없어 시/분도 함께 표기한다. */
export function formatPlanEndDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getDaysRemaining(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * 체험 기간 안내 문구.
 *
 * 베타 기간에는 관리자 패널에서 trial days를 크게 잡아 사실상 무제한으로 운영한다.
 * 그 상태에서 "2036년 8월 11일 종료"처럼 먼 날짜를 그대로 보여 주면 오히려
 * 혼란스러우므로, 남은 기간이 임계치를 넘으면 날짜 대신 무제한 안내로 바꾼다.
 *
 * 임계치를 쓰는 이유: 코드가 "지금 무제한 운영 중인지"를 따로 알 필요 없이
 * 실제 구독 종료일 하나만 보고 판단할 수 있어, 설정과 화면이 어긋나지 않는다.
 */
export function describeTrialPeriod(
  subscriptionEnd: string | null | undefined
): { unlimited: boolean; endDate: string | null; daysRemaining: number | null } {
  const daysRemaining = getDaysRemaining(subscriptionEnd);
  const unlimited =
    BETA_TEST && daysRemaining !== null && daysRemaining > UNLIMITED_TRIAL_DAYS_THRESHOLD;

  return {
    unlimited,
    endDate: unlimited ? null : formatPlanEndDate(subscriptionEnd),
    daysRemaining: unlimited ? null : daysRemaining,
  };
}
