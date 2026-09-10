'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import Header from './Header';
import Footer from './Footer';
import { MainContent } from './MainContent';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  fullWidth?: boolean;
  contentClassName?: string;
  /** App Router group layout can pass this so shell state matches route segments. */
  shellPathname?: string;
}

const NO_APP_NAV_PATHS = [
  '/',
  '/auth',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/signup-complete',
  '/about',
  '/terms',
  '/privacy',
  '/landing',
];

function shouldShowAppNav(pathname: string): boolean {
  return !NO_APP_NAV_PATHS.some(
    (p) => pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
  );
}

/** MainLayout 상단: 플랫 메인 탭 + 햄버거 메뉴를 쓸 경로 (그 외는 미니멀 헤더) */
function shouldShowLandingStyleHeaderNav(pathname: string): boolean {
  return pathname === '/' || pathname === '/landing' || pathname.startsWith('/landing/');
}

const MainLayout = ({
  children,
  fullWidth = false,
  contentClassName,
  shellPathname,
}: MainLayoutProps) => {
  const pathnameFromNav = usePathname() ?? '';
  const raw = shellPathname ?? pathnameFromNav;
  const pathname = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
  const showMainNav = shouldShowAppNav(pathname) || shouldShowLandingStyleHeaderNav(pathname);
  const isChartRoute =
    pathname.startsWith('/chart1m') ||
    pathname.startsWith('/chart10m') ||
    pathname.startsWith('/chart5m') ||
    pathname.startsWith('/chart15m') ||
    pathname === '/chart';

  return (
    <div
      className={
        isChartRoute
          ? 'flex h-dvh min-h-0 w-full flex-col overflow-hidden'
          : 'flex min-h-screen w-full flex-col'
      }
    >
      <Header fixed hideMobileMenu={false} hideLogo={false} showMainNav={showMainNav} />

      <main
        className={cn(
          // 차트 라우트는 뷰포트 높이에 맞춘 앱 셸이지만, Chart1m 내부가
          // min-h-[900px]를 요구한다. overflow-hidden이면 창이 그보다 낮을 때
          // 상단 필터 바가 잘린 채 스크롤로도 닿지 않는다 → auto로 열어 둔다.
          isChartRoute
            ? 'flex h-full min-h-0 flex-1 flex-col overflow-y-auto'
            : 'flex min-h-0 flex-1 flex-col',
          'pt-[var(--header-height)]'
        )}
        style={{ background: 'hsl(var(--background))' }}
      >
        {isChartRoute ? (
          <div
            className={cn(
              'mx-auto flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col',
              contentClassName
            )}
          >
            {children}
          </div>
        ) : (
          <MainContent fullWidth={fullWidth} className={contentClassName}>
            {children}
          </MainContent>
        )}
        {!isChartRoute ? <Footer /> : null}
      </main>
    </div>
  );
};

export default MainLayout;
