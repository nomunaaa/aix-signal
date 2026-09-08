'use client';

import { useMemo, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ACCOUNT_MAX_W, isAccountPath } from '@/config/page-width';
import { PUBLIC_BROWSING } from '@/config/access';
import { useLastSeenHeartbeat } from '@/hooks/useLastSeenHeartbeat';

const CHART_MAIN_CONTENT_CLASS = 'flex h-full min-h-0 flex-1 flex-col !min-h-0 !p-0 !py-0';

// Pages that must always render regardless of phone verification status.
const PUBLIC_PATHS = ['/auth', '/auth/callback', '/signup'];

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [phoneChecked, setPhoneChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  // 접속 통계(admin_get_access_stats)의 기반. (app) 그룹이 모든 앱 화면을
  // 감싸므로 여기 한 곳에서만 하트비트를 걸면 전체 로그인 사용자를 잡는다.
  useLastSeenHeartbeat(user?.id);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || isPublic) return;

    supabase
      .from('profiles')
      .select('phone_verified')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        // Fail open: never brick the app if the check errors out.
        if (error) {
          setPhoneChecked(true);
          return;
        }
        // 공개 열람 중에는 전화번호 미인증이어도 화면을 막지 않는다.
        // (인증을 요구하는 실제 동작들은 각 handler에서 그대로 확인한다.)
        if (!data?.phone_verified && !PUBLIC_BROWSING) router.replace('/signup');
        else setPhoneChecked(true);
      });
  }, [isLoading, isAuthenticated, user, pathname, router, isPublic]);

  const { fullWidth, contentClassName } = useMemo(() => {
    if (pathname === '/signals') {
      return {
        fullWidth: true,
        contentClassName: '!w-full !max-w-none !px-0 !py-0' as string | undefined,
      };
    }
    if (pathname === '/chart') {
      return { fullWidth: true, contentClassName: CHART_MAIN_CONTENT_CLASS };
    }
    if (
      pathname === '/trend' ||
      pathname === '/positions' ||
      pathname === '/portfolio' ||
      pathname === '/proof' ||
      pathname === '/history'
    ) {
      return { fullWidth: true, contentClassName: '!px-0 !py-0' as string | undefined };
    }
    if (pathname === '/notifications') {
      return {
        fullWidth: false,
        contentClassName: '!px-[var(--header-padding-x)]' as string | undefined,
      };
    }
    if (
      pathname === '/trend/feed' ||
      pathname === '/insight/dashboard' ||
      pathname === '/insight' ||
      pathname === '/insights'
    ) {
      return { fullWidth: true, contentClassName: '!px-0 !py-0' as string | undefined };
    }
    // 내 정보 계열은 콘텐츠가 적어 보드(1400px)보다 좁게 통일한다.
    // 폭은 여기서만 정하고 각 페이지는 자기 max-w를 두지 않는다.
    // MainContent가 cn()(tailwind-merge)으로 합치므로 뒤에 오는 max-w가 기본값을 덮는다.
    if (isAccountPath(pathname)) {
      return { fullWidth: false, contentClassName: ACCOUNT_MAX_W as string | undefined };
    }
    return { fullWidth: false, contentClassName: undefined as string | undefined };
  }, [pathname]);

  // Only hold rendering for an authenticated user on a protected page while the
  // phone check is in flight. Logged-out users and public pages always render.
  if (isAuthenticated && user && !isPublic && !phoneChecked) return null;

  return (
    <MainLayout fullWidth={fullWidth} contentClassName={contentClassName} shellPathname={pathname}>
      {children}
    </MainLayout>
  );
}
