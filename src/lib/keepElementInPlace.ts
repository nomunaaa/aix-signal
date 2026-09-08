/**
 * 필터 토글처럼 "누른 컨트롤은 그대로 두고 그 아래 목록만 바뀌길" 기대하는 액션에서,
 * 액션 이후 위쪽 섹션들의 높이가 크게 변해도 사용자가 보던 위치를 지켜 준다.
 *
 * 절대 스크롤 좌표(window.scrollY)를 복원하면 페이지 전체 높이가 바뀐 경우 엉뚱한 곳으로
 * 가므로, 기준 엘리먼트의 "뷰포트 안에서의 위치"를 고정한다.
 *
 * 높이 변화가 클릭 직후가 아니라 1~2초 뒤(오픈 시그널 섹션의 비동기 로딩)에 오는 경우가
 * 많아, 고정된 짧은 시간이 아니라 레이아웃이 실제로 잠잠해질 때까지 ResizeObserver로
 * 따라가며 보정한다. 사용자가 직접 스크롤하면 즉시 손을 뗀다.
 */
export function keepElementInPlace(element: HTMLElement | null): void {
  if (typeof window === 'undefined' || !element) return;

  const IDLE_MS = 900; // 마지막 레이아웃 변화 후 이만큼 조용하면 종료
  const MAX_MS = 6000; // 안전 상한

  const targetViewportTop = element.getBoundingClientRect().top;
  const start = performance.now();
  let lastActivity = start;
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    observer?.disconnect();
    window.removeEventListener('wheel', stop);
    window.removeEventListener('touchmove', stop);
    window.removeEventListener('keydown', stop);
  };

  const correct = () => {
    if (stopped) return;
    if (!element.isConnected) {
      stop();
      return;
    }
    const drift = element.getBoundingClientRect().top - targetViewportTop;
    if (Math.abs(drift) > 1) {
      window.scrollBy(0, drift);
      lastActivity = performance.now();
    }
  };

  const observer =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          lastActivity = performance.now();
          correct();
        });
  observer?.observe(document.body);

  const timer = setInterval(() => {
    correct();
    const now = performance.now();
    if (now - lastActivity > IDLE_MS || now - start > MAX_MS) stop();
  }, 50);

  // 사용자가 스크롤을 시작하면 더 이상 개입하지 않는다.
  window.addEventListener('wheel', stop, { passive: true, once: true });
  window.addEventListener('touchmove', stop, { passive: true, once: true });
  window.addEventListener('keydown', stop, { once: true });
}
