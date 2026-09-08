import { useEffect, useRef } from 'react';
import { useSignalStore } from '../stores/signalStore';
import type { FeedSignal } from '../utils/section';

/**
 * 시그널 데이터를 signalStore에 주입하고 섹션 전환을 감지한다.
 * highlight 자동 해제 (2초) 포함.
 */
export function useSignalTransitions(signals: FeedSignal[]) {
  const updateSignals = useSignalStore((s) => s.updateSignals);
  const classifiedSignals = useSignalStore((s) => s.classifiedSignals);
  const clearTransitionHighlight = useSignalStore((s) => s.clearTransitionHighlight);
  const highlightTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Feed incoming signals into the store
  useEffect(() => {
    if (signals.length > 0) {
      updateSignals(signals);
    }
  }, [signals, updateSignals]);

  // Schedule highlight cleanup for transitioning signals
  useEffect(() => {
    for (const [id, classified] of classifiedSignals) {
      if (classified.isTransitioning && !highlightTimers.current.has(id)) {
        const timer = setTimeout(() => {
          clearTransitionHighlight(id);
          highlightTimers.current.delete(id);
        }, 2000);
        highlightTimers.current.set(id, timer);
      }
    }

    // Cleanup timers on unmount
    return () => {
      for (const timer of highlightTimers.current.values()) {
        clearTimeout(timer);
      }
    };
  }, [classifiedSignals, clearTransitionHighlight]);

  return {
    classifiedSignals,
    liveEvents: useSignalStore((s) => s.liveEvents),
  };
}
