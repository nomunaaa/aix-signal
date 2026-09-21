'use client';

import { create } from 'zustand';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import { SIGNAL_STREAM_OPTION_IDS } from '@/views/signals/pulse/utils/streamSelector';

const STORAGE_KEY = 'stock-selection:selected-signals';

type SelectedSignalsByOption = Record<SignalStreamOptionId, Set<string>>;

function emptySelection(): SelectedSignalsByOption {
  return Object.fromEntries(
    SIGNAL_STREAM_OPTION_IDS.map((id) => [id, new Set<string>()])
  ) as SelectedSignalsByOption;
}

function readSelection(): SelectedSignalsByOption {
  const fallback = emptySelection();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Record<SignalStreamOptionId, unknown>>;
    for (const id of SIGNAL_STREAM_OPTION_IDS) {
      const values = parsed[id];
      fallback[id] = new Set(
        Array.isArray(values)
          ? values.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean)
          : []
      );
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function writeSelection(selection: SelectedSignalsByOption): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Object.fromEntries(SIGNAL_STREAM_OPTION_IDS.map((id) => [id, [...selection[id]]]))
      )
    );
  } catch {
    /* Local storage may be unavailable in private or restricted browser contexts. */
  }
}

type StockSelectionState = {
  selectedSignals: SelectedSignalsByOption;
  showSelectedOnly: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggleSelectedSignal: (optionId: SignalStreamOptionId, symbol: string) => void;
  setShowSelectedOnly: (show: boolean) => void;
};

export const useStockSelectionStore = create<StockSelectionState>((set) => ({
  selectedSignals: emptySelection(),
  showSelectedOnly: false,
  hydrated: false,
  hydrate: () =>
    set((state) => (state.hydrated ? state : { selectedSignals: readSelection(), hydrated: true })),
  toggleSelectedSignal: (optionId, symbol) =>
    set((state) => {
      const normalized = symbol.trim().toUpperCase();
      if (!normalized) return state;
      const selectedSignals = {
        ...state.selectedSignals,
        [optionId]: new Set(state.selectedSignals[optionId]),
      };
      const optionSymbols = selectedSignals[optionId];
      if (optionSymbols.has(normalized)) optionSymbols.delete(normalized);
      else optionSymbols.add(normalized);
      writeSelection(selectedSignals);
      return { selectedSignals };
    }),
  setShowSelectedOnly: (showSelectedOnly) => set({ showSelectedOnly }),
}));
