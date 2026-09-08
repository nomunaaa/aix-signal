/**
 * 오픈 베타(공개 테스트) 기간 스위치.
 *
 * 정식 출시 전 실사용 테스트를 도는 동안:
 *   - 플랜 결제를 막고 안내 팝업을 띄운다
 *   - 무료 체험을 "기간 제한 없음"으로 안내한다
 *
 * 출시하면 NEXT_PUBLIC_BETA_TEST=0 으로 끄면 결제가 다시 열리고
 * 체험 문구도 원래대로 돌아온다.
 *
 * ── 체험 기간을 실제로 늘리는 건 코드가 아니라 설정이다 ────────────────
 * 체험 일수는 admin_panel_plan_settings.trial_days 하나가 결정한다.
 * 신규 가입 트리거(apply_configured_trial_days_to_new_user)가
 * make_interval(days => trial_days)로 current_period_end를 잡고,
 * 화면과 check-subscription도 같은 값을 읽는다.
 *
 * 그래서 "테스트 동안 무제한"은 관리자 패널 > Subscriptions 에서 Pro의
 * trial days를 크게(예: 3650) 저장하면 끝이고, 출시 후 3으로 되돌리면 된다.
 * 사용자별로 무제한 권한을 따로 발급하는 방식보다 이쪽이 훨씬 단순하고,
 * 되돌릴 때도 값 하나만 고치면 되어 위험이 적다. 배포도 필요 없다.
 *
 * 이 파일은 그 설정을 대신하지 않는다 — 안내 문구와 결제 차단만 담당한다.
 */
export const BETA_TEST = process.env.NEXT_PUBLIC_BETA_TEST !== '0';

/** 체험 일수가 이 값을 넘으면 화면에 날짜 대신 "무제한"으로 표시한다. */
export const UNLIMITED_TRIAL_DAYS_THRESHOLD = 365;

export const BETA_MESSAGES = {
  purchaseBlockedTitle: '테스트 기간입니다',
  purchaseBlocked: '테스트 기간이 진행 중이라 이 기능을 사용할 수 없습니다.',
  trialUnlimited: '테스트 기간이라 기간 제한 없이 이용하실 수 있습니다.',
} as const;
