'use client';

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** 클라이언트 하트비트 주기. RPC 쪽 1분 스로틀보다 넉넉해 매 호출이 실제 쓰기로 이어진다. */
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;

/**
 * 로그인한 사용자의 "마지막 접속 시각"을 주기적으로 갱신한다.
 *
 * profiles.last_seen_at을 갱신하는 touch_last_seen() RPC를 부른다. 실제 쓰기는
 * RPC 안의 1분 스로틀이 막아 주므로 여기서는 호출 빈도를 신경 쓰지 않아도 된다.
 *
 * user가 없으면(로그아웃 상태, 공개 열람 방문자) 아무것도 하지 않는다 —
 * 하트비트는 신원이 있어야 의미가 있고, RPC도 auth.uid()가 없으면 조용히 넘어간다.
 */
export function useLastSeenHeartbeat(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;

    const touch = () => {
      try {
        // 반드시 클라이언트를 캐스팅해 **메서드로** 호출한다.
        //   const rpc = supabase.rpc; rpc('...')   ← 이렇게 떼어내면 안 된다.
        // SupabaseClient.rpc()는 내부에서 `return this.rest.rpc(...)`를 하므로,
        // 메서드를 분리하면 ES 모듈(strict mode)에서 this가 undefined가 되어
        // "Cannot read properties of undefined (reading 'rest')"로 즉시 throw한다.
        // 이 훅은 (app) 레이아웃에 걸려 있어 그 예외가 앱 전체를 에러 화면으로
        // 떨어뜨렸다(로그인 상태에서만 재현 — userId가 없으면 위에서 return).
        //
        // touch_last_seen()은 이번 마이그레이션에서 새로 생겨 아직 생성된 Supabase
        // 타입에 없다. 마이그레이션 적용 후 타입을 재생성하면 캐스팅을 걷어낼 수 있다.
        const db = supabase as unknown as {
          rpc: (fn: string) => Promise<{ error: { message: string } | null }>;
        };

        void db
          .rpc('touch_last_seen')
          .then(({ error }) => {
            if (error) {
              console.error('[useLastSeenHeartbeat] touch_last_seen failed:', error.message);
            }
          })
          .catch((e: unknown) => {
            console.error('[useLastSeenHeartbeat] touch_last_seen threw:', e);
          });
      } catch (e) {
        // 접속 통계는 부가 기능이다. 어떤 이유로든 이 훅이 앱 렌더링을 막아서는 안 된다.
        console.error('[useLastSeenHeartbeat] unexpected error:', e);
      }
    };

    touch();
    const interval = setInterval(touch, HEARTBEAT_INTERVAL_MS);

    // 탭이 다시 보이면 즉시 한 번 갱신한다 — 오래 백그라운드에 있다가 돌아온
    // 사용자를 인터벌이 돌 때까지 기다리지 않고 바로 '접속 중'으로 반영한다.
    const onVisible = () => {
      if (document.visibilityState === 'visible') touch();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);
}
