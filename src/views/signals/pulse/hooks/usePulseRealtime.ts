/**
 * PULSE 실시간 구독 훅.
 * Supabase Realtime (Broadcast) 구독 시 테이블 자동 갱신. Phase 4: 백엔드 연동 시 채널 구독.
 * cleanup 필수 (unmount 시 구독 해제).
 */

import { useEffect, useState, useRef } from 'react';

export interface UsePulseRealtimeOptions {
  /** refetch from usePulseApi — 호출 시 쿼리 갱신 */
  refetch?: () => void;
  /** 구독 활성화 (false면 구독 안 함) */
  enabled?: boolean;
}

export function usePulseRealtime({ refetch, enabled = true }: UsePulseRealtimeOptions = {}) {
  const [isReconnecting, _setIsReconnecting] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Phase 4: Supabase Realtime channel — 폴링으로 임시 운영
    const interval = refetch
      ? setInterval(() => refetch(), 30_000)
      : undefined;
    cleanupRef.current = () => {
      if (interval) clearInterval(interval);
    };

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [enabled, refetch]);

  return { isReconnecting };
}
