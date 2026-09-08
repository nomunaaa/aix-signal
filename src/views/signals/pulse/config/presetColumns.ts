import type { FilterPresetId } from '../types/pulse.types';

export interface PresetColumnConfig {
  id: FilterPresetId;
  label: string;
  columns: string[];
}

export const PRESET_COLUMNS: PresetColumnConfig[] = [
  {
    id: 'active',
    label: '기본',
    columns: ['symbol', 'direction', 'currentPrice', 'entryPrice', 'pnlPercent', 'extraSignal', 'remainingTime'],
  },
  {
    id: 'new',
    label: '최근진입',
    columns: ['symbol', 'direction', 'currentPrice', 'entryPrice', 'remainingTime', 'extraSignal'],
  },
  {
    id: 'discount',
    label: '할인진입',
    columns: ['symbol', 'direction', 'entryPrice', 'discountPrice', 'discountRate', 'additionalEntryPrice', 'additionalDiscountAmount', 'discountGainPercent', 'extraSignal'],
  },
  {
    id: 'tp',
    label: '수익실현',
    columns: ['symbol', 'direction', 'entryPrice', 'partialClosePrice', 'lockedProfitAmount', 'lockedProfitPercent', 'pnlPercent', 'extraSignal'],
  },
  {
    id: 'nontrend_st',
    label: '단기비추세',
    columns: ['symbol', 'direction', 'shortTrend', 'longTrend', 'nontrendDuration', 'volatility', 'pnlPercent', 'extraSignal'],
  },
  {
    id: 'nontrend_lt',
    label: '장기비추세',
    columns: ['symbol', 'direction', 'shortTrend', 'longTrend', 'nontrendDuration', 'volatility', 'pnlPercent', 'extraSignal'],
  },
  {
    id: 'waiting',
    label: '대기종목',
    columns: ['symbol', 'direction', 'entryPrice', 'pnl1dAmount', 'pnl1dPercent', 'pnl7dAmount', 'pnl7dPercent', 'lastCloseTime', 'todaySignalCount', 'avgCycleTime', 'remainingTime'],
  },
  {
    id: 'history',
    label: '히스토리',
    columns: ['symbol', 'direction', 'entryPrice', 'closePrice', 'investPnlAmount', 'investPnlPercent', 'cycleTime', 'lastCloseTime'],
  },
];

export const PRESET_COLUMN_MAP: Record<FilterPresetId, PresetColumnConfig> = PRESET_COLUMNS.reduce(
  (acc, preset) => {
    acc[preset.id] = preset;
    return acc;
  },
  {} as Record<FilterPresetId, PresetColumnConfig>
);
