'use client';

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { INVESTMENT_QUOTES } from '@/lib/investment-quotes';
import { REFERRAL_STORAGE_KEY } from '@/lib/auth/referral-navigation';

/** 라우트 Suspense 폴백은 SSR·CSR 동일 문자열 필요 — 랜덤 명언은 하이드레이션 불일치로 Next 기본 global-error 유발 */
const ROUTE_LOADING_QUOTE = INVESTMENT_QUOTES[0];
import { AuthProvider } from '@/contexts/AuthContext';
import { CryptoIconProvider } from '@/contexts/CryptoIconContext';
import { validateEnv } from '@/config/env';
import { initThemeFromStorage } from '@/utils/theme';
import { syncI18nLanguageFromBrowser } from '@/i18n/config';

const queryClient = new QueryClient();

const RouteFallback = () => {
  const quote = ROUTE_LOADING_QUOTE;
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'hsl(240, 6%, 6%)' }}
      aria-busy="true"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2rem',
          maxWidth: 400,
          padding: '0 1.5rem',
        }}
      >
        <div className="dice-loader-wrapper">
          <div className="dice-glow" />
          <div className="dice-scene">
            <div className="dice-cube">
              <div className="dice-face dice-front">
                <img src="/dice-face-4.svg" alt="4" />
              </div>
              <div className="dice-face dice-back">
                <img src="/dice-face-5.svg" alt="5" />
              </div>
              <div className="dice-face dice-right">
                <img src="/dice-face-6.svg" alt="6" />
              </div>
              <div className="dice-face dice-left">
                <img src="/dice-face-7.svg" alt="7" />
              </div>
              <div className="dice-face dice-top">
                <img src="/dice-face-8.svg" alt="8" />
              </div>
              <div className="dice-face dice-bottom">
                <img src="/dice-face-4.svg" alt="4" />
              </div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.6,
              marginBottom: '0.5rem',
            }}
          >
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{ fontSize: '0.75rem', color: 'hsl(217, 33%, 45%)', fontWeight: 500 }}>
            - {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
};

function MswDevBootstrap() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    /** Playwright webServer에서 주입 — SW 없이 fetch가 나가야 page.route로 모킹 가능 */
    if (process.env.NEXT_PUBLIC_DISABLE_MSW === '1') return;
    const MSW_START_TIMEOUT_MS = 12_000;
    void (async () => {
      try {
        await Promise.race([
          (async () => {
            const { worker, devStartOptions } = await import('@/mocks/browser');
            await worker.start(devStartOptions);
          })(),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, MSW_START_TIMEOUT_MS);
          }),
        ]);
      } catch {
        /* MSW 실패 시에도 앱은 계속 */
      }
    })();
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    syncI18nLanguageFromBrowser();
    initThemeFromStorage();
    validateEnv();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, refCode.toUpperCase());
    }
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('code='))) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth/callback') {
        window.location.href = `/auth/callback${hash}`;
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MswDevBootstrap />
        <CryptoIconProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>{children}</Suspense>
            </ErrorBoundary>
          </TooltipProvider>
        </CryptoIconProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
