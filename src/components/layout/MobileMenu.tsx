/**
 * 모바일 메뉴 컴포넌트 — SSOP 플랫 네비게이션
 * Sheet + 플랫 링크 리스트 (그룹 아코디언 제거)
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@/lib/navigation-compat';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { MAIN_MENU, MORE_MENU, isNavItemActive } from '@/config/menu';
import { SETTINGS_SECTIONS } from '@/config/settings';
import { FAIcon } from '@/components/icons/FAIcon';
import { LogOut } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { publicBrandLogoSrc } from '@/lib/brand-logos';
import { cn } from '@/lib/utils';
import { resolveBrowserStream, useStreamStore } from '@/stores/streamStore';

interface MobileMenuProps {
  onOpenChange: (open: boolean) => void;
}

const PROFILE_SETTINGS_SECTION = SETTINGS_SECTIONS.find((section) => section.id === 'profile')!;

/** `Sheet` 루트는 Header에서 감싸고, 여기서는 `SheetContent`만 렌더합니다 (Radix Trigger와 동일 트리). */
export function MobileMenu({ onOpenChange }: MobileMenuProps) {
  const { user, phoneVerified, signOut } = useAuth();
  const isFullyLoggedIn = Boolean(user) && phoneVerified;
  const { theme } = useTheme();
  const pathname = usePathname() ?? '';
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const stream = useStreamStore((s) => s.stream);
  const [isKoLanguage, setIsKoLanguage] = useState(true);
  const [resolvedStream, setResolvedStream] = useState(stream);
  const ProfileIcon = PROFILE_SETTINGS_SECTION.icon;

  const mainTabs = MAIN_MENU.filter((item) => !item.disabled).map((item) =>
    item.href === '/chart'
      ? { ...item, href: resolvedStream === 'wave' ? '/chart10m' : '/chart1m' }
      : item
  );

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

  useEffect(() => {
    setResolvedStream(resolveBrowserStream(stream));
  }, [pathname, stream]);

  const handleNavigation = useCallback(
    (href: string) => {
      navigate(href);
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    onOpenChange(false);
    navigate('/');
  }, [signOut, onOpenChange, navigate]);

  return (
    <SheetContent
      side="left"
      className="flex w-[300px] flex-col bg-background p-0"
      style={{ zIndex: 'var(--z-mobile-drawer)' }}
    >
      <SheetHeader className="sr-only">
        <SheetTitle>{isKoLanguage ? '메뉴' : 'Menu'}</SheetTitle>
      </SheetHeader>

      {/* Header: 로고 */}
      <div className="flex items-center border-b border-border/50 px-4 py-4">
        <Link to="/" onClick={() => onOpenChange(false)} className="flex items-center gap-2">
          <img
            src={publicBrandLogoSrc(theme)}
            alt="AiXSignal"
            className="h-6 w-auto max-w-[200px] object-contain object-left"
          />
        </Link>
      </div>

      {/* 스크롤 가능한 메뉴 영역 */}
      <ScrollArea className="flex-1">
        <div className="py-2">
          {/* 메인 탭 (플랫 리스트) */}
          <div className="px-4 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {isKoLanguage ? '메인' : 'Main'}
            </span>
          </div>

          <div className="space-y-0.5 px-2">
            {mainTabs.map((item) => {
              const isActive = isNavItemActive(item, pathname);
              const label = isKoLanguage ? item.label : (item.labelEn ?? item.label);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                    'cursor-pointer text-sm font-medium transition-colors',
                    'hover:bg-accent/50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    isActive ? 'bg-primary/10 text-primary' : 'text-foreground'
                  )}
                >
                  {item.icon && (
                    <FAIcon
                      icon={item.icon}
                      className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')}
                    />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* 더보기 링크 */}
          <Separator className="my-3" />
          <div className="px-4 py-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {isKoLanguage ? '더보기' : 'More'}
            </span>
          </div>
          <div className="space-y-0.5 px-2">
            {MORE_MENU.map((item) => {
              const isActive = isNavItemActive(item, pathname);
              const label = isKoLanguage ? item.label : (item.labelEn ?? item.label);

              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleNavigation(item.href)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5',
                    'cursor-pointer text-sm transition-colors',
                    'hover:bg-accent/50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
                    isActive ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
                  )}
                >
                  {item.icon && (
                    <FAIcon icon={item.icon} className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* 로그인 유저: 계정 메뉴 */}
          {isFullyLoggedIn && (
            <>
              <Separator className="my-3" />
              <div className="px-4 py-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {isKoLanguage ? '계정' : 'Account'}
                </span>
              </div>
              <div className="space-y-0.5 px-2">
                <button
                  type="button"
                  onClick={() => handleNavigation(PROFILE_SETTINGS_SECTION.path)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
                >
                  <ProfileIcon className="size-4 text-muted-foreground" />
                  <span>
                    {isKoLanguage
                      ? PROFILE_SETTINGS_SECTION.label
                      : PROFILE_SETTINGS_SECTION.labelEn}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  <span>{isKoLanguage ? '로그아웃' : 'Log out'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer: 비로그인 시 로그인/회원가입 버튼 */}
      {!isFullyLoggedIn && (
        <div className="space-y-2 border-t border-border/50 p-4">
          <Button
            className="w-full"
            onClick={() => {
              navigate('/pricing');
              onOpenChange(false);
            }}
          >
            {isKoLanguage ? '회원가입' : 'Sign up'}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              navigate('/auth');
              onOpenChange(false);
            }}
          >
            {isKoLanguage ? '로그인' : 'Log in'}
          </Button>
        </div>
      )}
    </SheetContent>
  );
}

export default MobileMenu;
