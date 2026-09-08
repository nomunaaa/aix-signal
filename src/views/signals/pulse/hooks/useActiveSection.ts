/**
 * Active section detection via IntersectionObserver.
 * Tracks which table section is most visible in the viewport.
 * The TableControlBar uses this to know which table it's controlling.
 */

import { useCallback, useEffect, useRef } from 'react';
import { usePulseStore } from '../stores/pulseStore';

interface UseActiveSectionReturn {
  /** Ref callback — attach to each section table wrapper div */
  registerRef: (id: string) => (el: HTMLElement | null) => void;
  /** Currently active table id (from store) */
  activeTableId: string | null;
}

export function useActiveSection(): UseActiveSectionReturn {
  const setActiveTableId = usePulseStore((s) => s.setActiveTableId);
  const activeTableId = usePulseStore((s) => s.activeTableId);
  const refsMap = useRef<Map<string, HTMLElement>>(new Map());
  const ratiosMap = useRef<Map<string, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-table-id');
          if (id) {
            ratiosMap.current.set(id, entry.intersectionRatio);
          }
        }

        // Find the most visible table
        let maxRatio = 0;
        let maxId: string | null = null;
        for (const [id, ratio] of ratiosMap.current.entries()) {
          if (ratio > maxRatio) {
            maxRatio = ratio;
            maxId = id;
          }
        }

        if (maxId && maxRatio > 0.1) {
          setActiveTableId(maxId);
        }
      },
      {
        root: null,
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe existing refs
    for (const [, el] of refsMap.current.entries()) {
      observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [setActiveTableId]);

  const registerRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      const prevEl = refsMap.current.get(id);
      if (prevEl && observerRef.current) {
        observerRef.current.unobserve(prevEl);
      }

      if (el) {
        el.setAttribute('data-table-id', id);
        refsMap.current.set(id, el);
        observerRef.current?.observe(el);
      } else {
        refsMap.current.delete(id);
        ratiosMap.current.delete(id);
      }
    },
    []
  );

  return { registerRef, activeTableId };
}
