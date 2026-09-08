/**
 * Section/state-based grouping for PULSE feed.
 * Each signal is assigned to exactly one section (no duplicates).
 * API returns a single list with section/state per signal.
 */

import type {
  Signal,
  DiscountedSignal,
  LockedSignal,
  ClosedSignal,
  PulseSectionState,
} from '../types/pulse.types';
import { derivePulseOpenSectionFromTrendsPnl } from './sectionRules';

export type { PulseSectionState };

export type SectionId = PulseSectionState;

export interface SectionConfig {
  id: SectionId;
  label: string;
  order: number;
}

/** Display order and labels for section states. */
export const SECTIONS: SectionConfig[] = [
  { id: 'NEW_SIGNAL', label: '신규 진입', order: 0 },
  { id: 'TREND_TP', label: '청산 임박', order: 1 },
  { id: 'TREND_DISCOUNT', label: '추가매수 구간', order: 2 },
  { id: 'NON_TREND_LONG', label: '롱 진행', order: 3 },
  { id: 'NON_TREND_SHORT', label: '숏 진행', order: 4 },
  { id: 'WAITING_ENTRY', label: '진입 대기', order: 5 },
  { id: 'CLOSED_RECENT', label: '최근 청산', order: 6 },
];

/** 4-section tab (기획 초안): UI only; maps to single PulseSectionState per tab. */
export type FourSectionId = 'trend_discount' | 'trend_profit' | 'short_trend_long_nontrend' | 'short_nontrend_long_trend';

export interface FourSectionConfig {
  id: FourSectionId;
  label: string;
  /** Single state shown in this tab. */
  state: PulseSectionState;
  order: number;
}

export const FOUR_SECTIONS: FourSectionConfig[] = [
  { id: 'trend_discount', label: '추세할인', state: 'TREND_DISCOUNT', order: 0 },
  { id: 'trend_profit', label: '추세수익', state: 'TREND_TP', order: 1 },
  { id: 'short_trend_long_nontrend', label: '단기추세-장기비추세', state: 'NON_TREND_SHORT', order: 2 },
  { id: 'short_nontrend_long_trend', label: '단기비추세-장기추세', state: 'NON_TREND_LONG', order: 3 },
];

/** Get signals for a 4-section tab (open + closed filtered by that tab's state). */
export function getSignalsForFourSection(
  grouped: GroupedBySection,
  fourSectionId: FourSectionId
): FeedSignal[] {
  const config = FOUR_SECTIONS.find((s) => s.id === fourSectionId);
  if (!config) return [];
  const list = grouped[config.state];
  return (list ?? []) as FeedSignal[];
}

/** Open signal (may have section from API). */
export type OpenSignal = Signal | DiscountedSignal | LockedSignal;

/** Feed row: open or closed; section comes from API or fallback. */
export type FeedSignal = OpenSignal | (ClosedSignal & { section?: PulseSectionState });

/**
 * 오픈 시그널의 표시 섹션. `WAITING_ENTRY` 만 API/상태 그대로 유지하고,
 * 나머지는 **방향·단기·장기 추세·손익** 규칙으로 항상 산출한다 (`sectionRules`).
 */
export function getSectionForOpenSignal(signal: OpenSignal): PulseSectionState {
  if (signal.section === 'WAITING_ENTRY') return 'WAITING_ENTRY';
  const s = signal as Signal;
  return derivePulseOpenSectionFromTrendsPnl({
    direction: signal.direction,
    shortTrend: s.entryTrendShort,
    longTrend: s.entryTrendLong,
    pnlPercent: signal.pnlPercent ?? 0,
  });
}

/**
 * Closed signals use CLOSED_RECENT (or section from API if present).
 */
export function getSectionForClosedSignal(signal: ClosedSignal): PulseSectionState {
  return (signal as ClosedSignal & { section?: PulseSectionState }).section ?? 'CLOSED_RECENT';
}

/**
 * Section id for any feed signal — one signal, one section.
 */
export function getSectionId(signal: FeedSignal): SectionId {
  if (isClosedSignal(signal)) return getSectionForClosedSignal(signal);
  return getSectionForOpenSignal(signal);
}

function isClosedSignal(s: FeedSignal): s is ClosedSignal {
  return 'exitPrice' in s && (s as ClosedSignal).exitPrice !== null && (s as ClosedSignal).exitPrice !== undefined;
}

export interface GroupedBySection {
  [key: string]: OpenSignal[] | ClosedSignal[];
}

/**
 * Groups signals by section. Each signal appears in exactly one bucket.
 */
export function groupSignalsBySection(
  openSignals: OpenSignal[],
  closedSignals: (ClosedSignal & { section?: PulseSectionState })[]
): GroupedBySection {
  const groups: GroupedBySection = {};
  for (const s of openSignals) {
    const id = getSectionForOpenSignal(s);
    if (!groups[id]) groups[id] = [];
    (groups[id] as OpenSignal[]).push(s);
  }
  for (const s of closedSignals) {
    const id = getSectionForClosedSignal(s);
    if (!groups[id]) groups[id] = [];
    (groups[id] as ClosedSignal[]).push(s);
  }
  return groups;
}

/**
 * Ordered list of section ids for rendering (by SECTIONS order).
 */
export function getOrderedSectionIds(): SectionId[] {
  return [...SECTIONS].sort((a, b) => a.order - b.order).map((s) => s.id);
}

/**
 * Filters open signals by section.
 */
export function filterBySection(
  signals: OpenSignal[],
  section: PulseSectionState
): OpenSignal[] {
  return signals.filter((s) => getSectionForOpenSignal(s) === section);
}
