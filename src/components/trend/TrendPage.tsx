'use client';

import { isMockTrendV8Enabled } from '@/lib/trend-v8/mock-trend-flag';
import { TrendV8PageContent } from '@/components/trend/v8/TrendV8PageContent';

/**
 * /trend — v8 Deep Scanner.
 * Mock: `USE_MOCK_TREND` / `NEXT_PUBLIC_USE_MOCK_TREND`. Off: symbolStore + useTrendBoard.
 */
export default function TrendPage() {
  return <TrendV8PageContent useMock={isMockTrendV8Enabled()} />;
}
