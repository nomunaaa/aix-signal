import { useEffect, useRef, useState } from 'react';
import { useSymbolStore } from '@/stores/symbolStore';

/**
 * symbolStore.updatePrice는 가격 틱마다 새 Map을 만들어 set한다(Zustand가 변경을
 * 감지하려면 참조가 바뀌어야 하기 때문). Trend Board처럼 30개 심볼 전체를 매번
 * 재계산·재정렬하는 화면에서 그 원본 Map을 그대로 리렌더 트리거로 쓰면, 화면에
 * 보이는 변화량과 무관하게 모든 가격 틱마다 무거운 재계산이 도는 문제가 생긴다.
 * 대신 store 변경을 구독만 하고, intervalMs당 최대 한 번만 리비전을 올린다.
 */
export function useThrottledSymbolStoreRevision(intervalMs = 500): number {
  const [revision, setRevision] = useState(0);
  const pendingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = useSymbolStore.subscribe(() => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setTimeout(() => {
        pendingRef.current = false;
        setRevision((r) => r + 1);
      }, intervalMs);
    });
    return unsubscribe;
  }, [intervalMs]);

  return revision;
}
