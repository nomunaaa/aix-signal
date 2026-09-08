import type { ColDef, ColGroupDef } from 'ag-grid-community';
import { PULSE_GRID_COL, PULSE_OPEN_FIXED } from '../config/pulseGridColumnLayout';
import { isPulseMoneyColumn } from './pulseColumnAlignment';

export type PulseAdaptColItem<T> = ColDef<T> | ColGroupDef<T>;

/**
 * Pinned ☆ + 종목 (데스크톱과 동일한 최소 가독성; 합계 ≈ 32 + 종목폭) for viewports under 1024px.
 * Unpinned columns get floor minWidths so the center area scrolls without crushing.
 * 모바일: `pulse-mobile-cell--center` / `--numeric` + 헤더 짝(CSS는 PulseSectionTable).
 */

const PINNED_STAR_WIDTH = PULSE_GRID_COL.favoriteWidth;
/** 핀 종목 열 — 데스크톱 minWidth와 동기 */
const PINNED_SYMBOL_WIDTH = PULSE_GRID_COL.symbolNarrowPinned;

/** Prefer colId (stable across duplicate field names), then field. */
const NARROW_MIN_BY_KEY: Record<string, number> = {
  // Discount / profit / 비추세 — `PULSE_OPEN_FIXED` 데스크톱 고정 폭 이하로 깨지지 않게 바닥 유지
  direction: PULSE_GRID_COL.directionMin,
  dirProfit: PULSE_GRID_COL.directionMin,
  stream: 68,
  summaryDiscountRate: 58,
  summaryElapsed: 56,
  summaryPnlPercent: 64,
  profitLossAmount: 88,
  summaryAdditionalSignal: 104,
  summaryAdditionalEntry: PULSE_GRID_COL.priceMin,
  summaryPartialSignal: 104,
  summaryPartialExit: PULSE_GRID_COL.priceMin,
  currentPrice: PULSE_OPEN_FIXED.priceEntryCurrent,
  currentPriceProfit: PULSE_OPEN_FIXED.priceEntryCurrent,
  entryPrice: PULSE_OPEN_FIXED.priceEntryCurrent,
  entryPriceProfit: PULSE_OPEN_FIXED.priceEntryCurrent,
  discountUsd: PULSE_OPEN_FIXED.metricMoney,
  discountPct: PULSE_OPEN_FIXED.metricPct,
  discountElapsed: PULSE_OPEN_FIXED.elapsed,
  profitElapsed: PULSE_OPEN_FIXED.elapsed,
  discountAddSignal: PULSE_GRID_COL.additionalSignalMin,
  profitAddSignal: PULSE_GRID_COL.additionalSignalMin,
  additionalDca: PULSE_OPEN_FIXED.additionalDca,
  sellProfitUsd: PULSE_OPEN_FIXED.sellProfit,
  reflectedPnlDisc: PULSE_OPEN_FIXED.reflectedPnl,
  reflectedPnlProfit: PULSE_OPEN_FIXED.reflectedPnl,
  discSpark: PULSE_GRID_COL.sparkMin,
  profitSpark: PULSE_GRID_COL.sparkMin,
  discountFresh: PULSE_OPEN_FIXED.fresh,
  profitFresh: PULSE_OPEN_FIXED.fresh,
  discountConf: PULSE_OPEN_FIXED.confidence,
  profitConf: PULSE_OPEN_FIXED.confidence,
  pnlAmountProfit: PULSE_OPEN_FIXED.metricMoney,
  pnlPercentProfit: PULSE_OPEN_FIXED.metricPct,
  pnlAmount: PULSE_OPEN_FIXED.metricMoney,
  pnlPercent: PULSE_OPEN_FIXED.metricPct,
  // Non-trend
  ntElapsed: PULSE_OPEN_FIXED.elapsed,
  ntBandSignal: PULSE_GRID_COL.additionalSignalMin,
  ntHigh24: PULSE_OPEN_FIXED.ntHigh24,
  ntLow24: PULSE_OPEN_FIXED.ntLow24,
  ntSpark: PULSE_GRID_COL.sparkMin,
  ntFresh: PULSE_OPEN_FIXED.fresh,
  ntConf: PULSE_OPEN_FIXED.confidence,
  ntPnlAmount: PULSE_OPEN_FIXED.metricMoney,
  ntPnlPercent: PULSE_OPEN_FIXED.metricPct,
  // Waiting
  waitSpark: 100,
  waitRecentSide: 72,
  waitFiveDots: 80,
  waitFivePnls: 120,
  waitLiveWait: 88,
  waitAvgGap: 88,
  waitWin7d: 56,
  waitGrade7d: 52,
  waitPnl7d: 64,
  waitHold7d: 72,
  waitEntry: PULSE_GRID_COL.priceMin,
  waitExit: PULSE_GRID_COL.priceMin,
  waitPnlAmt: 68,
  waitPnlPct: 54,
  waitHold: 72,
  waitCloseTime: 108,
  // Legacy / alternate tables (sectionColumnDefs)
  discountEntryAmount: 80,
  discountGainPercent: 56,
  additionalEntryTime: 132,
  partialExitTime: 132,
  lockedAmount: 80,
  lockedPercent: 56,
  detailBtn: 56,
  detailBtnProfit: 56,
  // History (getHistoryColumns)
  histAddEntry: PULSE_GRID_COL.priceMin,
  histAvgEntry: PULSE_GRID_COL.priceMin,
  histPartialExit: PULSE_GRID_COL.priceMin,
  histPartialAvg: PULSE_GRID_COL.priceMin,
  histEntryTime: 108,
  histCloseTime: 108,
  histAddTime: 108,
  holdDuration: 72,
};

const DEFAULT_UNPINNED_MIN = 44;

function appendClass(existing: string | undefined, tag: string): string {
  return existing ? `${existing} ${tag}`.trim() : tag;
}

/** 모바일 우측 정렬: `type: 'rightAligned'` 열(금액·$가격 등) */
function isNumericPulseColumn(def: ColDef): boolean {
  return isPulseMoneyColumn(def);
}

function pulseMobileAlignmentFor(def: ColDef): { cell: string; header: string } {
  if (def.field === 'symbol') {
    return { cell: 'pulse-mobile-cell--symbol', header: 'pulse-mobile-header--center' };
  }
  if (def.pinned === 'left') {
    return { cell: 'pulse-mobile-cell--center', header: 'pulse-mobile-header--center' };
  }
  if (isNumericPulseColumn(def)) {
    return { cell: 'pulse-mobile-cell--numeric', header: 'pulse-mobile-header--numeric' };
  }
  return { cell: 'pulse-mobile-cell--center', header: 'pulse-mobile-header--center' };
}

function mergeCellClass(def: ColDef, tag: string): ColDef['cellClass'] {
  const cc = def.cellClass;
  if (typeof cc === 'function') return cc;
  if (Array.isArray(cc)) return [...cc.map(String), tag];
  if (typeof cc === 'string') return appendClass(cc, tag);
  return tag;
}

function mergeHeaderClass(def: ColDef, tag: string): ColDef['headerClass'] {
  const hc = def.headerClass;
  if (typeof hc === 'function') return hc;
  if (Array.isArray(hc)) return [...hc.map(String), tag];
  if (typeof hc === 'string') return appendClass(hc, tag);
  return tag;
}

function withPulseMobileAlignment<T>(def: ColDef<T>): ColDef<T> {
  if (typeof def.cellClass === 'function') {
    return def;
  }
  const { cell, header } = pulseMobileAlignmentFor(def);
  return {
    ...def,
    cellClass: mergeCellClass(def, cell),
    headerClass: mergeHeaderClass(def, header),
  };
}

function narrowMinForLeaf<T>(def: ColDef<T>): number {
  const key = def.colId ?? def.field;
  if (key && typeof key === 'string' && NARROW_MIN_BY_KEY[key] != null) {
    return NARROW_MIN_BY_KEY[key]!;
  }
  if (def.field && typeof def.field === 'string' && NARROW_MIN_BY_KEY[def.field] != null) {
    return NARROW_MIN_BY_KEY[def.field]!;
  }
  return Math.max(def.minWidth ?? 0, DEFAULT_UNPINNED_MIN);
}

function adaptLeaf<T>(def: ColDef<T>): ColDef<T> {
  if (def.pinned === 'left') {
    if (def.field === 'id' || def.colId === 'favorite' || def.colId === 'favProfit') {
      return withPulseMobileAlignment({
        ...def,
        width: PINNED_STAR_WIDTH,
        minWidth: PINNED_STAR_WIDTH,
        maxWidth: PINNED_STAR_WIDTH,
        suppressSizeToFit: true,
        suppressAutoSize: true,
      });
    }
    if (def.field === 'symbol') {
      return withPulseMobileAlignment({
        ...def,
        width: PINNED_SYMBOL_WIDTH,
        minWidth: PINNED_SYMBOL_WIDTH,
        maxWidth: PINNED_SYMBOL_WIDTH,
        suppressSizeToFit: true,
        suppressAutoSize: true,
      });
    }
    return withPulseMobileAlignment({ ...def });
  }

  const floor = narrowMinForLeaf(def);
  const nextMin = Math.max(def.minWidth ?? 0, floor);
  return withPulseMobileAlignment({
    ...def,
    minWidth: nextMin,
  });
}

export function adaptPulseColumnDefsForNarrow<T>(defs: PulseAdaptColItem<T>[]): PulseAdaptColItem<T>[] {
  return defs.map((def) => {
    const children = 'children' in def && def.children ? (def.children as PulseAdaptColItem<T>[]) : undefined;
    if (children?.length) {
      return { ...def, children: adaptPulseColumnDefsForNarrow(children) } as PulseAdaptColItem<T>;
    }
    return adaptLeaf(def as ColDef<T>);
  });
}
