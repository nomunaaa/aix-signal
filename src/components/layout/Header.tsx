/**
 * Header 컴포넌트 — SSOP 플랫 네비게이션
 * Desktop: Logo + 5개 플랫 링크 + 액션 아이콘 + Auth
 * Mobile: Hamburger + Logo + 액션 아이콘
 */

import { useState, useMemo, memo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@/lib/navigation-compat';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Bell, ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { FAIcon } from '@/components/icons/FAIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MAIN_MENU, isNavItemActive } from '@/config/menu';
import { SETTINGS_SECTIONS } from '@/config/settings';
import { publicBrandLogoSrc } from '@/lib/brand-logos';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { ThemeSwitcherButton } from '@/components/ui/theme-switcher-button';
import { cn } from '@/lib/utils';
import { resolveBrowserStream, useStreamStore } from '@/stores/streamStore';

const Header = memo(function Header({
  hideMobileMenu = false,
  hideLogo = false,
  /** false: 로고·테마·언어·액션만 (플랫 메인 네비 + 모바일 햄버거 숨김) */
  showMainNav = true,
  fixed = false,
}: {
  hideMobileMenu?: boolean;
  hideLogo?: boolean;
  showMainNav?: boolean;
  fixed?: boolean;
}) {
  const { user, phoneVerified, signOut } = useAuth();
  // 소셜 로그인 직후처럼 세션은 있지만 아직 추가 정보 입력(전화번호 인증)을 마치지
  // 않은 상태에서는 로그인 UI(알림/아바타)를 보여주지 않는다 — /signup의 Form 2를
  // 완료하기 전까지는 아직 가입이 끝난 회원이 아니다.
  const isFullyLoggedIn = Boolean(user) && phoneVerified;
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const pathname = usePathname() ?? '';
  const stream = useStreamStore((s) => s.stream);
  const hydrateStreamFromBrowser = useStreamStore((s) => s.hydrateFromBrowser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isKoLanguage, setIsKoLanguage] = useState(true);
  const [resolvedStream, setResolvedStream] = useState(stream);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    hydrateStreamFromBrowser();
    setResolvedStream(resolveBrowserStream(stream));
  }, [hydrateStreamFromBrowser, pathname, stream]);

  useEffect(() => {
    const syncLanguage = (language?: string) => {
      setIsKoLanguage((language ?? i18n.language ?? 'ko').toLowerCase().startsWith('ko'));
    };

    syncLanguage();
    i18n.on('languageChanged', syncLanguage);
    return () => {
      i18n.off('languageChanged', syncLanguage);
    };
  }, [i18n]);

  const userName = useMemo(() => {
    if (!user) return null;
    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name;
    if (displayName) return displayName;
    const email = user.email;
    if (email) return email.split('@')[0];
    return '회원';
  }, [user]);

  const navItems = useMemo(() => {
    const chartPath = resolvedStream === 'wave' ? '/chart10m' : '/chart1m';
    return MAIN_MENU.filter((item) => !item.disabled).map((item) =>
      item.href === '/chart' ? { ...item, href: chartPath } : item
    );
  }, [resolvedStream]);

  const headerEl = (
    <header
      className={cn(
        fixed ? 'fixed left-0 right-0 top-0' : 'sticky top-0',
        'w-full bg-background/95 font-sans backdrop-blur-md transition-all duration-300 supports-[backdrop-filter]:bg-background/85',
        (fixed || isScrolled) && 'border-b border-border/50'
      )}
      style={{ zIndex: 'var(--z-header)' }}
    >
      <div
        className="container mx-auto"
        style={{
          paddingLeft: 'var(--header-padding-x)',
          paddingRight: 'var(--header-padding-x)',
        }}
      >
        <div
          className="flex items-center justify-between gap-4"
          style={{ height: 'var(--header-height)' }}
        >
          {/* 왼쪽: 햄버거(모바일, 사이드바 없을 때만) + 로고 */}
          <div className="flex flex-shrink-0 items-center gap-2">
            {!hideMobileMenu && showMainNav && (
              <div className="lg:hidden">
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'min-h-[44px] min-w-[44px] shrink-0',
                      'text-muted-foreground hover:text-primary',
                      'focus-visible:ring-2 focus-visible:ring-primary',
                      'motion-reduce:transition-none'
                    )}
                    aria-label={mobileMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                  >
                    {mobileMenuOpen ? (
                      <X className="h-5 w-5" aria-hidden />
                    ) : (
                      <Menu className="h-5 w-5" aria-hidden />
                    )}
                  </Button>
                </SheetTrigger>
              </div>
            )}
            {/* 사이드바 활성 시 lg에서 로고 숨김 (사이드바에 로고 있음) */}
            <Link to="/" className={cn('flex flex-shrink-0 items-center', hideLogo && 'lg:hidden')}>
              <img
                src={publicBrandLogoSrc(theme)}
                alt="AiXSignal"
                style={{
                  height: 'var(--header-logo-height)',
                  minHeight: 'var(--header-logo-height)',
                }}
              />
            </Link>
          </div>

          {/* 중앙: Desktop Navigation — 플랫 링크 (랜딩 등에서만) */}
          {showMainNav ? (
            <nav
              className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto px-2 lg:flex"
              style={{ gap: 'var(--header-gap)' }}
            >
              {navItems.map((item) => {
                const label = isKoLanguage ? item.label : (item.labelEn ?? item.label);
                const active = isNavItemActive(item, pathname);

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors xl:px-3 xl:text-sm',
                      'hover:bg-accent/50 hover:text-foreground',
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                    )}
                    style={{ height: 'var(--header-button-height)' }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {item.icon && (
                      <FAIcon icon={item.icon} className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {/* 오른쪽: 액션 아이콘 + Auth */}
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <ThemeSwitcherButton />

            {isFullyLoggedIn ? (
              <NotificationDropdown />
            ) : (
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-md',
                  'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'transition-colors duration-200'
                )}
                aria-label={isKoLanguage ? '알림' : 'Notifications'}
              >
                <Bell className="h-[18px] w-[18px]" />
              </button>
            )}

            <LanguageSwitcher />

            <div className="ml-1 hidden items-center gap-2 lg:flex">
              {isFullyLoggedIn ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1',
                        'text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                      )}
                      aria-label={isKoLanguage ? '계정 메뉴' : 'Account menu'}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                          {user?.email?.[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate whitespace-nowrap text-sm font-medium">
                        {userName}{isKoLanguage ? '님' : ''}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium text-foreground">
                          {userName}{isKoLanguage ? '님' : ''}
                        </span>
                        {user?.email ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        ) : null}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {SETTINGS_SECTIONS.map((section) => {
                      const Icon = section.icon;

                      return (
                        <DropdownMenuItem
                          key={section.id}
                          className="cursor-pointer"
                          onClick={() => navigate(section.path)}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                          <span>{isKoLanguage ? section.label : section.labelEn}</span>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                      onClick={async () => {
                        await signOut();
                        navigate('/');
                      }}
                    >
                      <LogOut className="h-4 w-4" width={16} height={16} aria-hidden />
                      <span>{isKoLanguage ? '로그아웃' : 'Log out'}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/auth"
                    className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {isKoLanguage ? '로그인' : 'Log in'}
                  </Link>
                  <Button
                    asChild
                    size="sm"
                    className="whitespace-nowrap bg-[hsl(var(--semantic-bear))] font-semibold text-white hover:bg-[hsl(var(--semantic-bear))]/90"
                  >
                    <Link to="/signup">{isKoLanguage ? '회원가입' : 'Sign up'}</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  if (hideMobileMenu || !showMainNav) {
    return headerEl;
  }

  return (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      {headerEl}
      <MobileMenu onOpenChange={setMobileMenuOpen} />
    </Sheet>
  );
});

export default Header;
