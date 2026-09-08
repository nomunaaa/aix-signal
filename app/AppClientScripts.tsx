'use client';

import { useEffect } from 'react';

function scriptAlreadyInjected(src: string): boolean {
  return [...document.querySelectorAll('script')].some((el) => {
    const a = el.getAttribute('src');
    if (a === src) return true;
    if (src.startsWith('http') && el.src === src) return true;
    return false;
  });
}

/**
 * next/script 대신 네이티브 script 주입 — Next 16 일부 경로에서
 * 로드 실패 시 `Error: loading script` 미처리 Promise 거부가 남는 이슈 회피.
 * React body 형제는 건드리지 않고 document.head에만 붙인다.
 */
export function AppClientScripts() {
  useEffect(() => {
    const add = (src: string, onLoad?: () => void) => {
      if (scriptAlreadyInjected(src)) return;
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      if (onLoad) s.onload = onLoad;
      s.onerror = () => {};
      document.head.appendChild(s);
    };

    add('/ab-test.js');
    add('/mobile-nav-fix.js');
  }, []);

  return null;
}
