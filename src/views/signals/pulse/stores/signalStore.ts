import { create } from 'zustand';
import type { PulseSectionState } from '../types/pulse.types';
import { type FeedSignal, getSectionId, SECTIONS } from '../utils/section';

/** Signal with classification metadata */
export interface ClassifiedSignal {
  signal: FeedSignal;
  section: PulseSectionState;
  movedAt: Date;
  previousSection: PulseSectionState | null;
  /** True for 2 seconds after a section change */
  isTransitioning: boolean;
}

/** Live event emitted on section transitions */
export interface LiveEvent {
  id: string;
  signalId: string;
  symbol: string;
  type: 'section_change' | 'entry' | 'exit';
  message: string;
  timestamp: string;
  fromSection?: string;
  toSection?: string;
}

interface SignalStoreState {
  /** Canonical classified signals (id -> ClassifiedSignal) */
  classifiedSignals: Map<string, ClassifiedSignal>;
  /** Live events (most recent first, max 50) */
  liveEvents: LiveEvent[];
  /** Last classification run timestamp */
  lastClassifiedAt: Date | null;

  // Actions
  /** Process incoming signals — detect transitions, update classifications */
  updateSignals: (incoming: FeedSignal[]) => void;
  /** Clear transition highlight after timeout */
  clearTransitionHighlight: (signalId: string) => void;
  /** Clear all events */
  clearEvents: () => void;
  /** Get sorted classified signals (with movedAt fallback) */
  getClassifiedArray: () => ClassifiedSignal[];
}

export const useSignalStore = create<SignalStoreState>((set, get) => ({
  classifiedSignals: new Map(),
  liveEvents: [],
  lastClassifiedAt: null,

  updateSignals: (incoming) => {
    set((state) => {
      const prevMap = state.classifiedSignals;
      const nextMap = new Map<string, ClassifiedSignal>();
      const newEvents: LiveEvent[] = [];
      const now = new Date();

      for (const signal of incoming) {
        const newSection = getSectionId(signal);
        const existing = prevMap.get(signal.id);

        if (!existing) {
          // New signal — classify and emit entry event
          nextMap.set(signal.id, {
            signal,
            section: newSection,
            movedAt: 'movedAt' in signal && signal.movedAt
              ? new Date(signal.movedAt)
              : now,
            previousSection: null,
            isTransitioning: false,
          });
          newEvents.push({
            id: `${signal.id}-entry-${now.getTime()}`,
            signalId: signal.id,
            symbol: signal.symbol,
            type: 'entry',
            message: `${signal.symbol} ${signal.direction === 'long' ? 'Long' : 'Short'} 진입`,
            timestamp: now.toISOString(),
          });
        } else if (existing.section !== newSection) {
          // Section changed — update movedAt, emit transition event
          const fromLabel = SECTIONS.find(s => s.id === existing.section)?.label ?? existing.section;
          const toLabel = SECTIONS.find(s => s.id === newSection)?.label ?? newSection;

          nextMap.set(signal.id, {
            signal,
            section: newSection,
            movedAt: now,
            previousSection: existing.section,
            isTransitioning: true,
          });
          newEvents.push({
            id: `${signal.id}-move-${now.getTime()}`,
            signalId: signal.id,
            symbol: signal.symbol,
            type: 'section_change',
            message: `${signal.symbol} ${fromLabel} → ${toLabel}`,
            timestamp: now.toISOString(),
            fromSection: existing.section,
            toSection: newSection,
          });
        } else {
          // Same section — update signal data, keep classification
          nextMap.set(signal.id, {
            ...existing,
            signal, // update with latest data (price changes, etc.)
          });
        }
      }

      const incomingSymbols = new Set(incoming.map((s) => s.symbol));

      // Detect removed signals (exits) — 동일 심볼이 다른 id로 남아 있으면 포지션 연속으로 보고 청산 이벤트 생략
      for (const [id, classified] of prevMap) {
        if (!nextMap.has(id)) {
          if (incomingSymbols.has(classified.signal.symbol)) continue;
          newEvents.push({
            id: `${id}-exit-${now.getTime()}`,
            signalId: id,
            symbol: classified.signal.symbol,
            type: 'exit',
            message: `${classified.signal.symbol} 청산 완료`,
            timestamp: now.toISOString(),
          });
        }
      }

      // Merge events (newest first, cap at 50)
      const allEvents = [...newEvents, ...state.liveEvents].slice(0, 50);

      return {
        classifiedSignals: nextMap,
        liveEvents: allEvents,
        lastClassifiedAt: now,
      };
    });
  },

  clearTransitionHighlight: (signalId) => {
    set((state) => {
      const nextMap = new Map(state.classifiedSignals);
      const entry = nextMap.get(signalId);
      if (entry) {
        nextMap.set(signalId, { ...entry, isTransitioning: false });
      }
      return { classifiedSignals: nextMap };
    });
  },

  clearEvents: () => set({ liveEvents: [] }),

  getClassifiedArray: () => {
    const map = get().classifiedSignals;
    return Array.from(map.values()).sort((a, b) => {
      // Primary: section order
      const aOrder = SECTIONS.find(s => s.id === a.section)?.order ?? 99;
      const bOrder = SECTIONS.find(s => s.id === b.section)?.order ?? 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Fallback: movedAt (most recent first)
      return b.movedAt.getTime() - a.movedAt.getTime();
    });
  },
}));
