import { create } from 'zustand';
import type {
  StrategyId,
  SimulationInput,
  FilterPreset,
  TableFilterPreset,
  ColumnDensity,
  SignalStreamId,
  PulseSortBy,
  SignalStateFilter,
  SignalTrendModeFilter,
} from '../types/pulse.types';
import { readSignalsEntryCookie, writeSignalsEntryCookie } from '../utils/signalsEntryCookie';
import { useStreamStore } from '@/stores/streamStore';
import { readSharedSimulationInput, writeSharedSimulationInput } from '@/lib/simulationStorage';
import {
  normalizeTradingCategory,
  TRADING_CATEGORY_ORDER,
  type TradingCategory,
} from '@/lib/trading-category';
import type { HistoryDatePeriod } from '../utils/historyDateRange';
import {
  DEFAULT_SIGNAL_TREND_MODE_FILTER,
  SIGNAL_TREND_MODES,
  hasAnySignalTrendModeSelected,
  isAllSignalTrendModesSelected,
} from '@/lib/signal-trend-mode';

const KAIROS_OPT_KEY = 'pulse:kairos-optimization';
const FAVORITES_STORAGE_KEY = 'pulse:favorites';
const FAVORITES_ONLY_STORAGE_KEY = 'pulse:show-favorites-only';
const STREAM_FILTER_STORAGE_KEY = 'pulse:stream-filter';
const TREND_MODE_FILTER_STORAGE_KEY = 'pulse:trend-mode-filter';
const TRADING_CATEGORY_FILTERS_STORAGE_KEY = 'pulse:trading-category-filters';
// Trend Board가 기존에 쓰던 키를 그대로 재사용 — 이미 저장된 사용자의 threshold 값이
// 이 store로 이전된 뒤에도 초기화되지 않고 그대로 이어지게 하기 위함.
const QUALITY_FILTERS_STORAGE_KEY = 'trend-board:v8:quality-filters';
const DEFAULT_QUALITY_WIN_RATE_THRESHOLD = 50;
const DEFAULT_QUALITY_RISK_REWARD_THRESHOLD = 2;
const HISTORY_DATE_PERIOD_STORAGE_KEY = 'pulse:history-date-period';

function readPulseStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readFavoritesFromStorage(): Set<string> {
  const raw = readPulseStorageItem(FAVORITES_STORAGE_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return new Set(
      Array.isArray(parsed)
        ? parsed.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean)
        : []
    );
  } catch {
    return new Set();
  }
}

function readBooleanFromStorage(key: string, fallback: boolean): boolean {
  const raw = readPulseStorageItem(key);
  if (raw == null) return fallback;
  return raw === 'true' || raw === '1';
}

function writePulseStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function writeFavoritesToStorage(favorites: Set<string>): void {
  writePulseStorageItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
}

function readStreamFilterFromStorage(): Record<SignalStreamId, boolean> {
  const fallback: Record<SignalStreamId, boolean> = { pulse: true, wave: true };
  const raw = readPulseStorageItem(STREAM_FILTER_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<SignalStreamId, unknown>>;
    const pulse = parsed?.pulse === true;
    const wave = parsed?.wave === true;
    return pulse || wave ? { pulse, wave } : fallback;
  } catch {
    return fallback;
  }
}

function readTrendModeFilterFromStorage(): SignalTrendModeFilter {
  const fallback: SignalTrendModeFilter = { ...DEFAULT_SIGNAL_TREND_MODE_FILTER };
  const raw = readPulseStorageItem(TREND_MODE_FILTER_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SignalTrendModeFilter>;
    const next: SignalTrendModeFilter = {
      trend: parsed?.trend !== false,
      nonTrend: parsed?.nonTrend !== false,
      reversal: parsed?.reversal !== false,
    };
    return hasAnySignalTrendModeSelected(next) ? next : fallback;
  } catch {
    return fallback;
  }
}

function readTradingCategoryFiltersFromStorage(): TradingCategory[] {
  const fallback = [...TRADING_CATEGORY_ORDER];
  const raw = readPulseStorageItem(TRADING_CATEGORY_FILTERS_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    const parsedSet = new Set(
      parsed
        .map((item) => normalizeTradingCategory(String(item)))
        .filter((item): item is TradingCategory => Boolean(item))
    );
    const next = TRADING_CATEGORY_ORDER.filter((item) => parsedSet.has(item));
    return next.length > 0 ? next : fallback;
  } catch {
    return fallback;
  }
}

function readHistoryDatePeriodFromStorage(): HistoryDatePeriod {
  const saved = readPulseStorageItem(HISTORY_DATE_PERIOD_STORAGE_KEY);
  if (saved === 'all' || saved === '90d') return saved;
  return '30d';
}

export type QualityPeriod = 'last30d' | 'all';

function clampQualityNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readQualityFiltersFromStorage(): {
  qualityWinRateThreshold: number;
  qualityRiskRewardThreshold: number;
  qualityPeriod: QualityPeriod;
} {
  const fallback = {
    qualityWinRateThreshold: DEFAULT_QUALITY_WIN_RATE_THRESHOLD,
    qualityRiskRewardThreshold: DEFAULT_QUALITY_RISK_REWARD_THRESHOLD,
    qualityPeriod: 'last30d' as QualityPeriod,
  };
  const raw = readPulseStorageItem(QUALITY_FILTERS_STORAGE_KEY);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, unknown>>;
    return {
      qualityWinRateThreshold: clampQualityNumber(
        parsed.winRateThreshold,
        0,
        100,
        DEFAULT_QUALITY_WIN_RATE_THRESHOLD
      ),
      qualityRiskRewardThreshold: clampQualityNumber(
        parsed.riskRewardThreshold,
        0,
        5,
        DEFAULT_QUALITY_RISK_REWARD_THRESHOLD
      ),
      qualityPeriod: parsed.qualityPeriod === 'all' ? 'all' : 'last30d',
    };
  } catch {
    return fallback;
  }
}

function writeQualityFiltersToStorage(filters: {
  qualityWinRateThreshold: number;
  qualityRiskRewardThreshold: number;
  qualityPeriod: QualityPeriod;
}): void {
  writePulseStorageItem(
    QUALITY_FILTERS_STORAGE_KEY,
    JSON.stringify({
      winRateThreshold: filters.qualityWinRateThreshold,
      riskRewardThreshold: filters.qualityRiskRewardThreshold,
      qualityPeriod: filters.qualityPeriod,
    })
  );
}

const initialFromCookie = typeof document !== 'undefined' ? readSignalsEntryCookie() : null;

if (typeof document !== 'undefined' && initialFromCookie) {
  try {
    localStorage.setItem('aix-onboarded', '1');
  } catch {
    /* ignore */
  }
}

export interface PulseStoreState {
  hasCompletedGate: boolean;
  kairosOptimization: boolean;
  selectedStream: SignalStreamId;
  /** 액션바 종목 셀렉터·요약 KPI 기준 심볼 */
  contextSymbol: string;
  selectedStrategy: StrategyId;
  directionFilter: 'all' | 'long' | 'short';
  /** LIVE/WAIT 행 필터 — URL `signalState` (AIX-85) */
  signalStateFilter: SignalStateFilter;
  trendModeFilter: SignalTrendModeFilter;
  tradingCategoryFilters: TradingCategory[];
  /**
   * History 탭 기간 필터 — 페이지 간 공유되는 소스 오브 트루스.
   * useSignalCycles가 이 값으로 exit_time 하한을 SQL에 밀어넣기 때문에 로컬
   * state가 아니라 store에 있어야 한다(로컬이면 전체 히스토리를 내려받은 뒤
   * 클라이언트에서 걸러내게 된다).
   */
  historyDatePeriod: HistoryDatePeriod;
  /** PULSE/WAVE 동시 다중선택 필터 — 즐겨찾기·시뮬레이터처럼 페이지 간 공유되는 소스 오브 트루스 */
  streamFilter: Record<SignalStreamId, boolean>;
  sortBy: PulseSortBy;
  sortDir: 'asc' | 'desc';
  /** 테이블에서 즐겨찾기 심볼만 표시 */
  showFavoritesOnly: boolean;
  /** Drawer 등에서 시뮬 편집으로 스크롤·펼침 유도 시 증가 */
  simulationEditorFocusToken: number;
  isKairosOpen: boolean;
  isStrategyDrawerOpen: boolean;
  simulationInput: SimulationInput;
  searchQuery: string;
  filterPreset: FilterPreset;
  tableFilterPreset: TableFilterPreset;
  columnDensity: ColumnDensity;
  activeTableId: string | null;
  /** @deprecated Replaced by buildColumnDefs() in columnRegistry.ts. Keep for non-trend tables. */
  sectionColumnVisibility: Record<string, Record<string, boolean>>;
  favorites: Set<string>;
  /** 승률/손익비 품질 필터 — Trend Board와 Proof 종목별 통계가 공유하는 threshold */
  qualityWinRateThreshold: number;
  qualityRiskRewardThreshold: number;
  qualityPeriod: QualityPeriod;
}

export interface PulseStoreActions {
  completeGate: (strategy: StrategyId, kairosOptimization: boolean, stream: SignalStreamId) => void;
  setKairosOptimization: (enabled: boolean) => void;
  setContextSymbol: (symbol: string) => void;
  setStrategy: (strategy: StrategyId) => void;
  setStream: (stream: SignalStreamId) => void;
  setDirectionFilter: (direction: 'all' | 'long' | 'short') => void;
  setSignalStateFilter: (filter: SignalStateFilter) => void;
  setTrendModeFilter: (filter: SignalTrendModeFilter) => void;
  setHistoryDatePeriod: (period: HistoryDatePeriod) => void;
  toggleTradingCategoryFilter: (category: TradingCategory) => void;
  setTradingCategoryFilters: (categories: TradingCategory[]) => void;
  toggleStreamFilter: (stream: SignalStreamId) => void;
  setSortBy: (sortBy: PulseSortBy) => void;
  setSortDir: (sortDir: 'asc' | 'desc') => void;
  setShowFavoritesOnly: (only: boolean) => void;
  focusSimulationEditor: () => void;
  setKairosOpen: (open: boolean) => void;
  setStrategyDrawerOpen: (open: boolean) => void;
  setSimulationInput: (partial: Partial<SimulationInput>) => void;
  setSearchQuery: (query: string) => void;
  setFilterPreset: (preset: FilterPreset) => void;
  setTableFilterPreset: (preset: TableFilterPreset) => void;
  setColumnDensity: (density: ColumnDensity) => void;
  setActiveTableId: (id: string | null) => void;
  toggleSectionColumn: (sectionId: string, columnId: string) => void;
  resetSectionColumns: (sectionId: string) => void;
  syncFromURL: (params: URLSearchParams) => void;
  toURLParams: () => URLSearchParams;
  toggleFavorite: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
  setQualityWinRateThreshold: (value: number) => void;
  setQualityRiskRewardThreshold: (value: number) => void;
  setQualityPeriod: (period: QualityPeriod) => void;
}

export type PulseStore = PulseStoreState & PulseStoreActions;

export const usePulseStore = create<PulseStore>((set, get) => ({
  hasCompletedGate: true,
  kairosOptimization: readPulseStorageItem(KAIROS_OPT_KEY) !== 'false',
  selectedStream: initialFromCookie?.stream ?? 'pulse',
  contextSymbol: 'BTCUSDT',
  selectedStrategy: initialFromCookie?.strategy ?? 'oneshot',
  directionFilter: 'all',
  signalStateFilter: 'all',
  trendModeFilter: readTrendModeFilterFromStorage(),
  tradingCategoryFilters: readTradingCategoryFiltersFromStorage(),
  historyDatePeriod: readHistoryDatePeriodFromStorage(),
  streamFilter: readStreamFilterFromStorage(),
  sortBy: 'time',
  sortDir: 'desc',
  showFavoritesOnly: readBooleanFromStorage(FAVORITES_ONLY_STORAGE_KEY, false),
  simulationEditorFocusToken: 0,
  isKairosOpen: false,
  isStrategyDrawerOpen: false,
  simulationInput: readSharedSimulationInput(),
  searchQuery: '',
  filterPreset: 'action' as FilterPreset,
  tableFilterPreset: 'all' as TableFilterPreset,
  columnDensity: 'normal' as ColumnDensity,
  activeTableId: null,
  sectionColumnVisibility: {},
  favorites: readFavoritesFromStorage(),
  ...readQualityFiltersFromStorage(),

  completeGate: (strategy, kairosOpt, stream) => {
    localStorage.setItem(KAIROS_OPT_KEY, String(kairosOpt));
    writeSignalsEntryCookie({ stream, strategy });
    try {
      // 온보딩 게이트(onboarding-gate)와 동일 플래그 — 펄스 게이트만 완료해도 앱 전역 온보딩 통과로 간주
      localStorage.setItem('aix-onboarded', '1');
    } catch {
      /* ignore */
    }
    set({
      hasCompletedGate: true,
      selectedStrategy: strategy,
      selectedStream: stream,
      kairosOptimization: kairosOpt,
    });
  },
  setKairosOptimization: (enabled) => {
    localStorage.setItem(KAIROS_OPT_KEY, String(enabled));
    set({ kairosOptimization: enabled });
  },
  setContextSymbol: (symbol) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    set({ contextSymbol: normalized });
  },
  setStrategy: (strategy) => {
    set({ selectedStrategy: strategy });
    const { hasCompletedGate, selectedStream } = get();
    if (hasCompletedGate) writeSignalsEntryCookie({ stream: selectedStream, strategy });
  },
  setStream: (stream) => {
    set({ selectedStream: stream });
    const { hasCompletedGate, selectedStrategy } = get();
    if (hasCompletedGate) writeSignalsEntryCookie({ stream, strategy: selectedStrategy });
    // Sync global streamStore so Sidebar/BottomNav chart link follows PULSE/WAVE selection
    useStreamStore.getState().setStream(stream);
  },
  setDirectionFilter: (direction) => set({ directionFilter: direction }),
  setSignalStateFilter: (signalStateFilter) => set({ signalStateFilter }),
  setTrendModeFilter: (trendModeFilter) => {
    writePulseStorageItem(TREND_MODE_FILTER_STORAGE_KEY, JSON.stringify(trendModeFilter));
    set({ trendModeFilter });
  },
  setHistoryDatePeriod: (historyDatePeriod) => {
    writePulseStorageItem(HISTORY_DATE_PERIOD_STORAGE_KEY, historyDatePeriod);
    set({ historyDatePeriod });
  },
  toggleTradingCategoryFilter: (category) =>
    set((state) => {
      const current = state.tradingCategoryFilters;
      const exists = current.includes(category);
      if (exists && current.length === 1) return {};
      const next = exists
        ? current.filter((item) => item !== category)
        : TRADING_CATEGORY_ORDER.filter((item) => item === category || current.includes(item));
      writePulseStorageItem(TRADING_CATEGORY_FILTERS_STORAGE_KEY, JSON.stringify(next));
      return { tradingCategoryFilters: next };
    }),
  setTradingCategoryFilters: (categories) => {
    const next = TRADING_CATEGORY_ORDER.filter((item) => categories.includes(item));
    if (next.length === 0) return;
    writePulseStorageItem(TRADING_CATEGORY_FILTERS_STORAGE_KEY, JSON.stringify(next));
    set({ tradingCategoryFilters: next });
  },
  toggleStreamFilter: (stream) =>
    set((state) => {
      const next = !state.streamFilter[stream];
      if (!next) {
        const other: SignalStreamId = stream === 'pulse' ? 'wave' : 'pulse';
        if (!state.streamFilter[other]) return {};
      }
      const nextFilter = { ...state.streamFilter, [stream]: next };
      writePulseStorageItem(STREAM_FILTER_STORAGE_KEY, JSON.stringify(nextFilter));
      return { streamFilter: nextFilter };
    }),
  setSortBy: (sortBy) =>
    set({
      sortBy,
      sortDir: sortBy === 'discount' ? 'asc' : sortBy === 'symbol' ? 'asc' : 'desc',
    }),
  setSortDir: (sortDir) => set({ sortDir }),
  setShowFavoritesOnly: (only) => {
    writePulseStorageItem(FAVORITES_ONLY_STORAGE_KEY, String(only));
    set({ showFavoritesOnly: only });
  },
  focusSimulationEditor: () =>
    set((state) => ({ simulationEditorFocusToken: state.simulationEditorFocusToken + 1 })),
  setKairosOpen: (open) => set({ isKairosOpen: open }),
  setStrategyDrawerOpen: (open) => set({ isStrategyDrawerOpen: open }),
  setSimulationInput: (partial) => {
    let nextInput: SimulationInput = readSharedSimulationInput();
    set((state) => {
      nextInput = writeSharedSimulationInput({ ...state.simulationInput, ...partial });
      return { simulationInput: nextInput };
    });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterPreset: (preset) => set({ filterPreset: preset }),
  setTableFilterPreset: (preset) => set({ tableFilterPreset: preset }),
  setColumnDensity: (density) => set({ columnDensity: density }),
  setActiveTableId: (id) => set({ activeTableId: id }),
  toggleSectionColumn: (sectionId, columnId) =>
    set((state) => {
      const current = state.sectionColumnVisibility[sectionId] ?? {};
      return {
        sectionColumnVisibility: {
          ...state.sectionColumnVisibility,
          [sectionId]: { ...current, [columnId]: !current[columnId] },
        },
      };
    }),
  resetSectionColumns: (sectionId) =>
    set((state) => {
      const { [sectionId]: _, ...rest } = state.sectionColumnVisibility;
      return { sectionColumnVisibility: rest };
    }),

  syncFromURL: (params) => {
    const updates: Partial<PulseStoreState> = {};

    const strategy = params.get('strategy');
    if (strategy && ['oneshot', 'safe', 'deep', 'full'].includes(strategy)) {
      updates.selectedStrategy = strategy as StrategyId;
    }
    const stream = params.get('stream');
    if (stream === 'pulse' || stream === 'wave') {
      updates.selectedStream = stream;
    }
    const symbol = params.get('symbol');
    const search = params.get('search');
    if (symbol) {
      const sym = symbol.trim().toUpperCase();
      updates.searchQuery = sym;
      updates.contextSymbol = sym;
    } else if (search) {
      updates.searchQuery = search;
    } else {
      // URL이 searchQuery의 소스 오브 트루스다 — symbol/search가 없으면 이전
      // 네비게이션에서 남은 검색어를 지워야 "전체 보기" 링크가 실제로 전체를 보여준다.
      updates.searchQuery = '';
    }

    const direction = params.get('direction');
    if (direction && ['all', 'long', 'short'].includes(direction)) {
      updates.directionFilter = direction as 'all' | 'long' | 'short';
    }
    const sort = params.get('sort');
    if (sort && ['time', 'pnl', 'symbol', 'volume', 'discount'].includes(sort)) {
      updates.sortBy = sort as PulseSortBy;
    }
    const favOnly = params.get('favOnly');
    if (favOnly === '1' || favOnly === 'true') {
      updates.showFavoritesOnly = true;
    }
    const sortDir = params.get('sortDir');
    if (sortDir && ['asc', 'desc'].includes(sortDir)) {
      updates.sortDir = sortDir as 'asc' | 'desc';
    }
    const signalState = params.get('signalState');
    if (signalState === 'live' || signalState === 'wait' || signalState === 'all') {
      updates.signalStateFilter = signalState;
    }
    const trendMode = params.get('trendMode');
    if (trendMode) {
      const modes = new Set(trendMode.split(',').map((mode) => mode.trim()));
      const next: SignalTrendModeFilter = {
        trend: modes.has('trend'),
        nonTrend: modes.has('nonTrend'),
        reversal: modes.has('reversal'),
      };
      if (hasAnySignalTrendModeSelected(next)) {
        updates.trendModeFilter = next;
      }
    }
    const categories = params.get('categories');
    if (categories) {
      const parsed = categories
        .split(',')
        .map((item) => normalizeTradingCategory(item))
        .filter((item): item is TradingCategory => Boolean(item));
      if (parsed.length > 0) {
        const parsedSet = new Set(parsed);
        updates.tradingCategoryFilters = TRADING_CATEGORY_ORDER.filter((item) =>
          parsedSet.has(item)
        );
      }
    }

    if (Object.keys(updates).length > 0) set(updates);
  },

  toURLParams: () => {
    const state = get();
    const params = new URLSearchParams();
    if (state.selectedStrategy !== 'oneshot') params.set('strategy', state.selectedStrategy);
    if (state.selectedStream !== 'pulse') params.set('stream', state.selectedStream);
    if (state.searchQuery.trim()) params.set('search', state.searchQuery.trim());
    if (state.directionFilter !== 'all') params.set('direction', state.directionFilter);
    if (state.sortBy !== 'time') params.set('sort', state.sortBy);
    if (state.sortDir !== 'desc') params.set('sortDir', state.sortDir);
    if (state.showFavoritesOnly) params.set('favOnly', '1');
    if (state.signalStateFilter !== 'all') params.set('signalState', state.signalStateFilter);
    if (!isAllSignalTrendModesSelected(state.trendModeFilter)) {
      params.set(
        'trendMode',
        SIGNAL_TREND_MODES.filter((mode) => state.trendModeFilter[mode]).join(',')
      );
    }
    if (state.tradingCategoryFilters.length !== TRADING_CATEGORY_ORDER.length) {
      params.set('categories', state.tradingCategoryFilters.join(','));
    }
    return params;
  },

  toggleFavorite: (symbol) => {
    const normalized = symbol.trim().toUpperCase();
    if (!normalized) return;
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(normalized)) {
        next.delete(normalized);
      } else {
        next.add(normalized);
      }
      writeFavoritesToStorage(next);
      return { favorites: next };
    });
  },

  isFavorite: (symbol) => get().favorites.has(symbol.trim().toUpperCase()),

  setQualityWinRateThreshold: (value) =>
    set((state) => {
      writeQualityFiltersToStorage({
        qualityWinRateThreshold: value,
        qualityRiskRewardThreshold: state.qualityRiskRewardThreshold,
        qualityPeriod: state.qualityPeriod,
      });
      return { qualityWinRateThreshold: value };
    }),
  setQualityRiskRewardThreshold: (value) =>
    set((state) => {
      writeQualityFiltersToStorage({
        qualityWinRateThreshold: state.qualityWinRateThreshold,
        qualityRiskRewardThreshold: value,
        qualityPeriod: state.qualityPeriod,
      });
      return { qualityRiskRewardThreshold: value };
    }),
  setQualityPeriod: (period) =>
    set((state) => {
      writeQualityFiltersToStorage({
        qualityWinRateThreshold: state.qualityWinRateThreshold,
        qualityRiskRewardThreshold: state.qualityRiskRewardThreshold,
        qualityPeriod: period,
      });
      return { qualityPeriod: period };
    }),
}));
