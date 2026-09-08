/**
 * Global Stream Store — PULSE/WAVE 전역 상태
 *
 * REB-168: 시그널/차트/트렌드 페이지가 동일 스트림 상태를 공유.
 * URL searchParams (?stream=pulse|wave) 양방향 동기화.
 */

import { create } from 'zustand';

export type Stream = 'pulse' | 'wave';

interface StreamState {
  stream: Stream;
  setStream: (stream: Stream) => void;
  toggle: () => void;
  hydrateFromBrowser: () => void;
}

/**
 * URL/cookie에서 stream 값 읽기. URL이 우선이며, 없으면 signals entry cookie를 따른다.
 */
export function resolveBrowserStream(fallback: Stream = 'pulse'): Stream {
  if (typeof window === 'undefined') return fallback;
  const params = new URLSearchParams(window.location.search);
  const value = params.get('stream');
  if (value === 'wave') return 'wave';
  if (value === 'pulse') return 'pulse';

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )aixsignal_signals_entry=([^;]*)/);
    if (match?.[1]) {
      try {
        const parsed = JSON.parse(decodeURIComponent(match[1])) as { stream?: unknown };
        if (parsed.stream === 'wave') return 'wave';
      } catch {
        /* ignore malformed cookie */
      }
    }
  }

  return fallback;
}

/**
 * URL searchParams에 stream 반영 (history.replaceState)
 */
function syncToUrl(stream: Stream) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (stream === 'pulse') {
    url.searchParams.delete('stream');
  } else {
    url.searchParams.set('stream', stream);
  }
  window.history.replaceState(null, '', url.toString());
}

export const useStreamStore = create<StreamState>((set) => ({
  stream: resolveBrowserStream('pulse'),

  setStream: (stream) => {
    syncToUrl(stream);
    set({ stream });
  },

  toggle: () => {
    set((state) => {
      const next = state.stream === 'pulse' ? 'wave' : 'pulse';
      syncToUrl(next);
      return { stream: next };
    });
  },

  hydrateFromBrowser: () => {
    if (typeof window === 'undefined') return;
    set((state) => {
      const stream = resolveBrowserStream(state.stream);
      return state.stream === stream ? state : { stream };
    });
  },
}));
