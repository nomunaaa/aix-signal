import { useSyncExternalStore } from 'react';

/**
 * 렌더에서 Date.now()를 직접 쓰지 않고 상대 시간을 계산할 때 사용한다.
 * intervalMs마다 갱신되어 "N분 전" 등이 시간에 맞게 바뀐다.
 *
 * 같은 intervalMs를 쓰는 모든 호출(예: 시그널 테이블의 행마다)이 setInterval
 * 하나를 공유한다 — 행마다 독립 타이머를 두면 행 수만큼 타이머가 생겨
 * 스크롤 중 불필요한 리렌더가 누적된다.
 */
type Clock = { value: number; timer: ReturnType<typeof setInterval> | null; listeners: Set<() => void> };

const clocks = new Map<number, Clock>();

function getClock(intervalMs: number): Clock {
  let clock = clocks.get(intervalMs);
  if (!clock) {
    clock = { value: Date.now(), timer: null, listeners: new Set() };
    clocks.set(intervalMs, clock);
  }
  return clock;
}

function subscribe(intervalMs: number, onStoreChange: () => void) {
  const clock = getClock(intervalMs);
  clock.listeners.add(onStoreChange);
  if (clock.listeners.size === 1) {
    clock.timer = setInterval(() => {
      clock.value = Date.now();
      clock.listeners.forEach((listener) => listener());
    }, intervalMs);
  }
  return () => {
    clock.listeners.delete(onStoreChange);
    if (clock.listeners.size === 0 && clock.timer !== null) {
      clearInterval(clock.timer);
      clock.timer = null;
    }
  };
}

export function useNowMs(intervalMs: number): number {
  return useSyncExternalStore(
    (onStoreChange) => subscribe(intervalMs, onStoreChange),
    () => getClock(intervalMs).value,
    () => getClock(intervalMs).value
  );
}
