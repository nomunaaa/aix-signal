import { USE_MOCK_TREND } from '@/lib/env/mock'

/** 마스터 또는 `NEXT_PUBLIC_USE_MOCK_TREND=true` 일 때 Mock */
export function isMockTrendV8Enabled(): boolean {
  return USE_MOCK_TREND
}
