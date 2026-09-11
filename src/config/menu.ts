/**
 * AiXSignal 메뉴 설정 — SSOP 중심 플랫 네비게이션
 * @description 5개 1차 탭, 드롭다운 없음
 * @updated 2026-04-10
 */

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export type NavItem = {
  label: string;
  labelEn?: string;
  href: string;
  activeHrefs?: readonly string[];
  icon?: string;
  badge?: string;
  badgeVariant?: 'tm' | 'beta' | 'new' | 'live';
  disabled?: boolean;
  requiresAuth?: boolean;
  description?: string;
};

// ═══════════════════════════════════════════════════════════
// 메인 네비게이션 (플랫 1차 탭)
// ═══════════════════════════════════════════════════════════

export const MAIN_MENU: NavItem[] = [
  {
    label: '시그널 보드',
    labelEn: 'Signal Board',
    href: '/signals',
    icon: 'fa-bolt',
    description: 'PULSE + WAVE 전략 시그널',
  },
  {
    label: '추세 보드',
    labelEn: 'Trend Board',
    href: '/trend',
    icon: 'fa-arrow-trend-up',
    description: '시장 추세 보드',
  },
  {
    label: 'AIX 수익통계',
    labelEn: 'Proof',
    href: '/proof',
    icon: 'fa-trophy',
    description: '수익 통계·성과 보드',
  },
  {
    label: '히스토리',
    labelEn: 'History',
    href: '/history',
    icon: 'fa-clock-rotate-left',
    description: '시그널 히스토리',
  },
  {
    label: '차트',
    labelEn: 'Chart',
    href: '/chart',
    activeHrefs: ['/chart', '/chart1m', '/chart5m', '/chart10m', '/chart15m'],
    icon: 'fa-chart-line',
    description: '차트 · 모의매매 포함',
  },
  {
    label: '멀티차트',
    labelEn: 'Multichart',
    href: '/multichart',
    icon: 'fa-table-cells',
    description: '6종목 동시 차트',
  },
  {
    label: '모의매매 기록',
    labelEn: 'Mock Trade History',
    href: '/my/history',
    icon: 'fa-wallet',
    description: '모의매매 기록 히스토리',
  },
];

// ═══════════════════════════════════════════════════════════
// 더보기 페이지 링크 목록
// ═══════════════════════════════════════════════════════════

export const MORE_MENU: NavItem[] = [
  { label: '나의매매', labelEn: 'My Trades', href: '/my', icon: 'fa-wallet' },
  { label: '인사이트', labelEn: 'Insights', href: '/insights', icon: 'fa-lightbulb' },
  { label: '설정', labelEn: 'Settings', href: '/settings', icon: 'fa-gear' },
  { label: '플랜별 요금안내', labelEn: 'Plans', href: '/pricing', icon: 'fa-tags' },
  { label: '처음이신가요?', labelEn: 'Guide', href: '/support', icon: 'fa-book-open' },
  { label: '공지/이벤트', labelEn: 'Notice', href: '/notice', icon: 'fa-bullhorn' },
  { label: '문의하기', labelEn: 'Help', href: '/support', icon: 'fa-headset' },
];

// ═══════════════════════════════════════════════════════════
// Footer 메뉴
// ═══════════════════════════════════════════════════════════

export const footerMenu = {
  products: [
    { title: '시그널 보드', href: '/signals', description: 'PULSE + WAVE 전략 시그널' },
    { title: '추세 보드', href: '/trend', description: '시장 추세 보드' },
    { title: '차트', href: '/chart', description: '차트 · 모의매매 포함' },
    { title: 'AIX 수익통계', href: '/proof', description: '수익 통계·성과 보드' },
    { title: '모의 히스토리', href: '/my/history', description: '매매 기록 히스토리' },
    { title: '플랜/가격', href: '/pricing', description: '구독별 요금제' },
  ],
  resources: [
    { title: '첫 사용자 안내', href: '/support', description: '사용 가이드' },
    { title: '공지사항', href: '/notice', description: '공지 및 이벤트' },
    { title: '문의하기', href: '/support', description: '1:1 문의' },
  ],
  company: [
    { title: '서비스 소개', href: '/about', description: 'About Us' },
    { title: '이용약관', href: '/terms', description: 'Terms' },
    { title: '개인정보처리방침', href: '/privacy', description: 'Privacy' },
  ],
} as const;

// ═══════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════

/**
 * 활성 상태 확인 (현재 경로와 일치 여부)
 */
export const isNavItemActive = (item: NavItem, pathname: string): boolean => {
  if (item.disabled) return false;
  const activeHrefs = item.activeHrefs ?? [item.href];
  return activeHrefs.some((href) => pathname === href || pathname.startsWith(href + '/'));
};

/**
 * 활성화된 메뉴 아이템 목록 (disabled 제외)
 */
export const getActiveMenuItems = (): NavItem[] => {
  return MAIN_MENU.filter((item) => !item.disabled);
};

// ═══════════════════════════════════════════════════════════
// 레거시 호환 (기존 코드와의 호환성)
// ═══════════════════════════════════════════════════════════

export interface MenuItem {
  to?: string;
  label: string;
  icon?: string;
  badge?: string;
  badgeVariant?: 'tm' | 'beta';
  action?: 'logout';
  children?: MenuItem[];
  requiresAuth?: boolean;
  description?: string;
}

export interface MenuSection {
  id: string;
  label: string;
  icon?: string;
  items: MenuItem[];
  requiresAuth?: boolean;
}

/**
 * 레거시 menuConfig (Breadcrumb 호환)
 * @deprecated MAIN_MENU를 사용하세요
 */
export const menuConfig: MenuSection[] = MAIN_MENU.map((item) => ({
  id: item.label.toLowerCase().replace(/\s+/g, '-'),
  label: item.label,
  icon: item.icon,
  items: [
    {
      to: item.href,
      label: item.label,
      icon: item.icon,
      description: item.description,
    },
  ],
}));

/**
 * @deprecated isNavItemActive를 사용하세요
 */
export const isMenuItemActive = (item: MenuItem, pathname: string): boolean => {
  if (item.to && (pathname === item.to || pathname.startsWith(item.to + '/'))) {
    return true;
  }
  if (item.children) {
    return item.children.some((child) => isMenuItemActive(child, pathname));
  }
  return false;
};

/**
 * @deprecated isNavItemActive를 사용하세요
 */
export const isSectionActive = (section: MenuSection, pathname: string): boolean => {
  return section.items.some((item) => isMenuItemActive(item, pathname));
};

// Removed exports (backward compat): NavGroup, isNavGroupActive, getFirstLinkUrl
// These were only used internally and are no longer needed with flat navigation.
