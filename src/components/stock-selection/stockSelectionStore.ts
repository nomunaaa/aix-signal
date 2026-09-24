'use client';

import { create } from 'zustand';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import { SIGNAL_STREAM_OPTION_IDS } from '@/views/signals/pulse/utils/streamSelector';

// 저장하는 값은 '켠 것'이 아니라 '끈 것'이다. 기본값이 전체 선택이라, 빈 집합이
// 그대로 '모두 켜짐'이 되어 종목 목록을 미리 알 필요가 없다.
// 예전 키(selected-signals)는 의미가 반대라 그대로 읽으면 안 되므로 새 키를 쓴다.
const STORAGE_KEY = 'stock-selection:excluded-signals';

type ExcludedSignalsByOption = Record<SignalStreamOptionId, Set<string>>;

function noExclusions(): ExcludedSignalsByOption {
  return Object.fromEntries(
    SIGNAL_STREAM_OPTION_IDS.map((id) => [id, new Set<string>()])
  ) as ExcludedSignalsByOption;
}

function readExclusions(): ExcludedSignalsByOption {
  const fallback = noExclusions();
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

function writeExclusions(selection: ExcludedSignalsByOption): void {
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
  /** 통계에서 빼기로 한 (옵션, 종목) 조합. 비어 있으면 전부 켜진 상태다. */
  excludedSignals: ExcludedSignalsByOption;
  showSelectedOnly: boolean;
  hydrated: boolean;
  hydrate: () => void;
  toggleSelectedSignal: (optionId: SignalStreamOptionId, symbol: string) => void;
  setShowSelectedOnly: (show: boolean) => void;
};

/** 해제하지 않은 것은 모두 켜진 것으로 본다. */
export function isSignalSelected(
  excluded: ExcludedSignalsByOption,
  optionId: SignalStreamOptionId,
  symbol: string
): boolean {
  return !excluded[optionId].has(symbol.trim().toUpperCase());
}

export const useStockSelectionStore = create<StockSelectionState>((set) => ({
  excludedSignals: noExclusions(),
  showSelectedOnly: false,
  hydrated: false,
  hydrate: () =>
    set((state) =>
      state.hydrated ? state : { excludedSignals: readExclusions(), hydrated: true }
    ),
  toggleSelectedSignal: (optionId, symbol) =>
    set((state) => {
      const normalized = symbol.trim().toUpperCase();
      if (!normalized) return state;
      const excludedSignals = {
        ...state.excludedSignals,
        [optionId]: new Set(state.excludedSignals[optionId]),
      };
      const optionSymbols = excludedSignals[optionId];
      // 켜져 있던 것을 누르면 제외 목록에 넣고, 꺼져 있던 것은 도로 뺀다.
      if (optionSymbols.has(normalized)) optionSymbols.delete(normalized);
      else optionSymbols.add(normalized);
      writeExclusions(excludedSignals);
      return { excludedSignals };
    }),
  setShowSelectedOnly: (showSelectedOnly) => set({ showSelectedOnly }),
}));
