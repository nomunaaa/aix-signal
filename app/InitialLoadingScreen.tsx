'use client';

import { useEffect, useState } from 'react';

type Phase = 'visible' | 'fade' | 'done';

/**
 * 초기 주사위 스플래시.
 * `return null`로 언마운트하지 않음 — `body` 안 `next/script` 등과 형제일 때
 * React가 removeChild 시 트리 불일치로 터지는 경우가 있어, 숨김만 처리한다.
 */
export function InitialLoadingScreen() {
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    setPhase('fade');
    const t = window.setTimeout(() => setPhase('done'), 250);
    return () => window.clearTimeout(t);
  }, []);

  const done = phase === 'done';

  return (
    <div
      /* .initial-splash: CSS 애니메이션이 ~0.75s 후 무조건 숨김 —
         JS 번들이 느린 기기에서 hydration을 기다리지 않고 LCP를 풀어준다 */
      className="initial-splash"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: done ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'hsl(240, 6%, 6%)',
        fontFamily:
          "'Pretendard Variable', 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        opacity: phase === 'fade' || done ? 0 : 1,
        transition: phase === 'visible' ? undefined : 'opacity 0.2s ease-out',
        /* fade 이후에는 시각적으로만 사라지고 포인터는 여전히 상단을 가로막지 않게 함(첫 클릭 내비 실패 방지) */
        pointerEvents: phase === 'visible' ? 'auto' : 'none',
      }}
      aria-hidden={phase !== 'visible'}
      aria-busy={phase === 'visible'}
    >
      <div className="dice-loader-wrapper" style={{ width: 120, height: 120, position: 'relative' }}>
        <div className="dice-glow" />
        <div className="dice-scene">
          <div className="dice-cube">
            <div className="dice-face dice-front">
              <img src="/dice-face-4.svg" alt="" />
            </div>
            <div className="dice-face dice-back">
              <img src="/dice-face-5.svg" alt="" />
            </div>
            <div className="dice-face dice-right">
              <img src="/dice-face-6.svg" alt="" />
            </div>
            <div className="dice-face dice-left">
              <img src="/dice-face-7.svg" alt="" />
            </div>
            <div className="dice-face dice-top">
              <img src="/dice-face-8.svg" alt="" />
            </div>
            <div className="dice-face dice-bottom">
              <img src="/dice-face-4.svg" alt="" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
