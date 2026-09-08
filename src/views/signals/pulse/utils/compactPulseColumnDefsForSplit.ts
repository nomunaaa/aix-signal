import type { ColDef, ColGroupDef } from 'ag-grid-community';
import type { PulseAdaptColItem } from './adaptPulseColumnDefsNarrow';

type SplitWidth = {
  minWidth: number;
  width: number;
};

const SPLIT_WIDTH_BY_KEY: Record<string, SplitWidth> = {
  favorite: { minWidth: 28, width: 28 },
  favProfit: { minWidth: 28, width: 28 },
  symbol: { minWidth: 62, width: 70 },
  stream: { minWidth: 42, width: 48 },
  direction: { minWidth: 58, width: 64 },
  dirProfit: { minWidth: 58, width: 64 },
  summaryDiscountRate: { minWidth: 40, width: 48 },
  summaryElapsed: { minWidth: 38, width: 46 },
  summaryPnlPercent: { minWidth: 44, width: 52 },
  profitLossAmount: { minWidth: 76, width: 86 },
  summaryAdditionalSignal: { minWidth: 62, width: 86 },
  summaryAdditionalEntry: { minWidth: 50, width: 58 },
  summaryPartialSignal: { minWidth: 62, width: 86 },
  summaryPartialExit: { minWidth: 50, width: 58 },
  currentPrice: { minWidth: 50, width: 64 },
  currentPriceProfit: { minWidth: 50, width: 64 },
  entryPrice: { minWidth: 50, width: 64 },
  entryPriceProfit: { minWidth: 50, width: 64 },
  discountUsd: { minWidth: 50, width: 58 },
  discountPct: { minWidth: 38, width: 44 },
  pnlAmount: { minWidth: 50, width: 58 },
  pnlPercent: { minWidth: 38, width: 44 },
  pnlAmountProfit: { minWidth: 50, width: 58 },
  pnlPercentProfit: { minWidth: 38, width: 44 },
  ntPnlAmount: { minWidth: 50, width: 58 },
  ntPnlPercent: { minWidth: 38, width: 44 },
  discountElapsed: { minWidth: 36, width: 42 },
  profitElapsed: { minWidth: 36, width: 42 },
  ntElapsed: { minWidth: 36, width: 42 },
  discountFresh: { minWidth: 32, width: 36 },
  profitFresh: { minWidth: 32, width: 36 },
  ntFresh: { minWidth: 32, width: 36 },
  discountConf: { minWidth: 32, width: 38 },
  profitConf: { minWidth: 32, width: 38 },
  ntConf: { minWidth: 32, width: 38 },
  discountAddSignal: { minWidth: 62, width: 86 },
  profitAddSignal: { minWidth: 62, width: 86 },
  ntBandSignal: { minWidth: 62, width: 86 },
  additionalDca: { minWidth: 50, width: 58 },
  sellProfitUsd: { minWidth: 50, width: 58 },
  reflectedPnlDisc: { minWidth: 42, width: 50 },
  reflectedPnlProfit: { minWidth: 42, width: 50 },
  ntHigh24: { minWidth: 50, width: 58 },
  ntLow24: { minWidth: 50, width: 58 },
  waitRecentSide: { minWidth: 64, width: 70 },
  waitExpectedRemain: { minWidth: 50, width: 60 },
  waitFiveWinPct: { minWidth: 42, width: 48 },
  waitFivePnlSum: { minWidth: 54, width: 64 },
  waitTrust: { minWidth: 34, width: 40 },
  waitEntry: { minWidth: 50, width: 60 },
  waitLastExit: { minWidth: 50, width: 60 },
  waitEntryTime: { minWidth: 58, width: 70 },
  waitHold: { minWidth: 44, width: 54 },
  waitCloseTime: { minWidth: 58, width: 70 },
};

const DEFAULT_SPLIT_WIDTH: SplitWidth = { minWidth: 36, width: 44 };
const OMIT_SPLIT_COL_KEYS = new Set([
  'discSpark',
  'profitSpark',
  'ntSpark',
  'waitSpark',
  'discountConf',
  'profitConf',
  'ntConf',
  'ntBandSignal',
  'waitTrust',
]);

function compactKeyFor<T>(def: ColDef<T>): string | undefined {
  if (def.colId) return def.colId;
  return typeof def.field === 'string' ? def.field : undefined;
}

function splitWidthFor<T>(def: ColDef<T>): SplitWidth {
  const key = compactKeyFor(def);
  if (key && SPLIT_WIDTH_BY_KEY[key]) return SPLIT_WIDTH_BY_KEY[key];
  if (def.field === 'symbol') return SPLIT_WIDTH_BY_KEY.symbol;
  if (def.field === 'id') return SPLIT_WIDTH_BY_KEY.favorite;
  if (def.type === 'rightAligned') return { minWidth: 48, width: 56 };
  return DEFAULT_SPLIT_WIDTH;
}

function compactLeaf<T>(def: ColDef<T>): ColDef<T> | null {
  const key = compactKeyFor(def);
  if (key && OMIT_SPLIT_COL_KEYS.has(key)) return null;

  const { flex: _flex, maxWidth: _maxWidth, ...rest } = def;
  const width = splitWidthFor(def);
  const fixedWidth = rest.pinned === 'left' || def.field === 'id' || key === 'favorite' || key === 'favProfit';
  return {
    ...rest,
    minWidth: width.minWidth,
    width: width.width,
    flex: fixedWidth ? undefined : width.width,
    suppressAutoSize: true,
  };
}

export function compactPulseColumnDefsForSplit<T>(
  defs: PulseAdaptColItem<T>[],
): PulseAdaptColItem<T>[] {
  const compacted: PulseAdaptColItem<T>[] = [];

  for (const def of defs) {
    const children = 'children' in def && def.children ? (def.children as PulseAdaptColItem<T>[]) : undefined;
    if (children?.length) {
      const compactChildren = compactPulseColumnDefsForSplit(children);
      if (compactChildren.length > 0) {
        compacted.push({
          ...(def as ColGroupDef<T>),
          children: compactChildren,
        } as PulseAdaptColItem<T>);
      }
      continue;
    }

    const compactDef = compactLeaf(def as ColDef<T>);
    if (compactDef) compacted.push(compactDef);
  }

  return compacted;
}
