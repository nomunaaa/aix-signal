/**
 * 페이지 본문 폭 단일 진실 원천.
 *
 * 그동안 각 페이지가 제각각 max-w를 들고 있어서(1280 / 1152 / 1024 / 512 …) 같은 카테고리
 * 안에서도 폭이 달랐다. 폭은 **레이아웃이 정하고 페이지는 자기 폭을 정하지 않는다**는
 * 규칙으로 통일한다.
 *
 * - board   : 시그널/추세/차트/성과/인사이트/히스토리 등 데이터 보드 → 1400px
 * - account : 내 정보(프로필·설정·알림·결제) → 콘텐츠가 적어 1024px
 *
 * 주의: Tailwind JIT가 클래스를 스캔하려면 리터럴이 소스에 그대로 있어야 한다
 * (tailwind.config.ts content: ./src/**, ./app/**). 그래서 문자열을 조립하지 않고
 * 완성된 클래스명을 그대로 둔다.
 */

/** 데이터 보드 계열 본문 최대 폭 */
export const BOARD_MAX_W = 'max-w-[1400px]';

/** 내 정보 계열 본문 최대 폭 */
export const ACCOUNT_MAX_W = 'max-w-[1024px]';

/**
 * 내 정보 계열 라우트. app/(app)/layout.tsx가 이 목록을 보고 ACCOUNT_MAX_W를 적용한다.
 * 여기에 추가하기만 하면 폭이 맞춰지므로 페이지에서 max-w를 따로 두지 않는다.
 */
export const ACCOUNT_PATHS: readonly string[] = [
  '/profile',
  '/settings',
  '/alerts',
  '/alerts/matrix',
  '/link-channels',
  '/notifications',
  '/billing',
  '/checkout',
  '/support',
  '/referral',
  '/referral/dashboard',
];

export function isAccountPath(pathname: string): boolean {
  return ACCOUNT_PATHS.includes(pathname);
}
