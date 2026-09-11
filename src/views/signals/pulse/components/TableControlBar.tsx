/**
 * TableControlBar — shared control bar for section tables.
 * Attaches to the currently focused section table via activeTableId.
 * Provides: search, combined temporal + direction filter, sort presets, favorites-only, density, column picker.
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import { Search, ArrowUpDown, Rows3, Rows4, Filter, Wifi, ChevronDown, Star, Settings2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePulseStore } from '../stores/pulseStore';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ColumnPicker, type ColumnConfig } from './ColumnPicker';
import { FavoriteScopeControls } from './FavoriteScopeControls';
import { SimulationEditorBody } from './SimulationEditorBody';
import { useSimulation } from '../hooks/useSimulation';
import { formatSimulationUsd } from '../utils/formatSimulationSummary';
import { COLUMN_LABELS } from '../config/columnLabels';
import { PRESET_COLUMN_MAP, PRESET_COLUMNS } from '../config/presetColumns';
import type {
  FilterPresetId,
  PulseSortBy,
  SignalStateFilter,
  SignalStreamId,
  ClosedSignal,
  TableFilterPreset,
} from '../types/pulse.types';
import {
  formatPulseLastUpdated,
  localizePulseColumnLabel,
  localizePulsePresetLabel,
  usePulseCopy,
} from '../utils/pulseTranslations';

/** 시간 필터 + 방향을 한 메뉴에서 선택 (value: `tablePreset|direction`) */
const COMBINED_TABLE_FILTER_VALUES = [
  'all|all',
  'latest|all',
  'changing|all',
  'fixed|all',
  'all|long',
  'all|short',
  'latest|long',
  'latest|short',
  'changing|long',
  'changing|short',
  'fixed|long',
  'fixed|short',
] as const;

// Base (non-optional) columns that are always shown
const BASE_COLUMN_IDS = new Set([
  'symbol',
  'direction',
  'entryPrice',
  'currentPrice',
  'pnlPercent',
]);

export type SignalDatePeriod = '30d' | '90d' | 'all';

interface TableControlBarProps {
  /** Active table/section ID for column picker context */
  activeTableId?: string | null;
  /** 열 구성 프리셋 (필터 프리셋 칩 + 컬럼 피커 옆) */
  columnPresetId?: FilterPresetId;
  onColumnPresetChange?: (id: FilterPresetId) => void;
  /** Column IDs available for the current preset */
  availableColumns?: string[];
  /** Which columns are currently empty (have no data) */
  emptyColumns?: Set<string>;
  className?: string;
  /** 시그널/가격 피드 기준 갱신 시각 (필터 바 우측, 오픈·대기 옆) */
  lastUpdate?: Date;
  isReconnecting?: boolean;
  /** 열린 포지션 수 (액션바에서 이동) */
  totalOpenPositions?: number;
  /** 신호 대기 종목 수 */
  waitingCount?: number;
  secondaryCount?: number;
  secondaryCountLabel?: string;
  datePeriod?: SignalDatePeriod;
  onDatePeriodChange?: (period: SignalDatePeriod) => void;
  showSignalStateFilter?: boolean;
  favoriteSymbols?: readonly string[];
  streamWinRates?: Partial<Record<SignalStreamId, number>>;
  simulationHistorySignals?: ClosedSignal[];
}

function parseCombinedFilterValue(v: string): {
  table: TableFilterPreset;
  direction: 'all' | 'long' | 'short';
} {
  const [table, direction] = v.split('|');
  const t = (
    ['all', 'latest', 'changing', 'fixed'].includes(table) ? table : 'all'
  ) as TableFilterPreset;
  const d = (['all', 'long', 'short'].includes(direction) ? direction : 'all') as
    | 'all'
    | 'long'
    | 'short';
  return { table: t, direction: d };
}

export function TableControlBar({
  activeTableId,
  columnPresetId = 'active',
  onColumnPresetChange,
  availableColumns,
  emptyColumns = new Set(),
  className,
  lastUpdate,
  isReconnecting = false,
  totalOpenPositions = 0,
  waitingCount = 0,
  secondaryCount,
  secondaryCountLabel,
  datePeriod,
  onDatePeriodChange,
  showSignalStateFilter = true,
  favoriteSymbols = [],
  streamWinRates = {},
  simulationHistorySignals,
}: TableControlBarProps) {
  const { language, copy } = usePulseCopy();
  const searchQuery = usePulseStore((s) => s.searchQuery);
  const setSearchQuery = usePulseStore((s) => s.setSearchQuery);
  const favorites = usePulseStore((s) => s.favorites);
  const toggleFavorite = usePulseStore((s) => s.toggleFavorite);
  const directionFilter = usePulseStore((s) => s.directionFilter);
  const setDirectionFilter = usePulseStore((s) => s.setDirectionFilter);
  const sortBy = usePulseStore((s) => s.sortBy);
  const setSortBy = usePulseStore((s) => s.setSortBy);
  const tableFilterPreset = usePulseStore((s) => s.tableFilterPreset);
  const setTableFilterPreset = usePulseStore((s) => s.setTableFilterPreset);
  const columnDensity = usePulseStore((s) => s.columnDensity);
  const setColumnDensity = usePulseStore((s) => s.setColumnDensity);
  const sectionColumnVisibility = usePulseStore((s) => s.sectionColumnVisibility);
  const toggleSectionColumn = usePulseStore((s) => s.toggleSectionColumn);
  const signalStateFilter = usePulseStore((s) => s.signalStateFilter);
  const setSignalStateFilter = usePulseStore((s) => s.setSignalStateFilter);
  const streamFilter = usePulseStore((s) => s.streamFilter);
  const toggleStreamFilter = usePulseStore((s) => s.toggleStreamFilter);
  const qualityWinRateThreshold = usePulseStore((s) => s.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((s) => s.qualityRiskRewardThreshold);
  const setQualityWinRateThreshold = usePulseStore((s) => s.setQualityWinRateThreshold);
  const setQualityRiskRewardThreshold = usePulseStore((s) => s.setQualityRiskRewardThreshold);
  const { input: simulationInput } = useSimulation({ historySignals: simulationHistorySignals });
  const [simulationOpen, setSimulationOpen] = useState(false);

  const sectionId = activeTableId ?? 'default';
  const sectionOverrides = sectionColumnVisibility[sectionId] ?? {};

  const columnConfigs: ColumnConfig[] = useMemo(() => {
    const cols = availableColumns ?? PRESET_COLUMN_MAP['active']?.columns ?? [];
    return cols.map((colId) => {
      const isOptional = !BASE_COLUMN_IDS.has(colId);
      const isEmpty = emptyColumns.has(colId);
      const defaultVisible = isOptional ? !isEmpty : true;
      const overridden = sectionOverrides[colId];
      const visible = overridden !== undefined ? overridden : defaultVisible;

      return {
        id: colId,
        label: localizePulseColumnLabel(colId, COLUMN_LABELS[colId] ?? colId, language),
        isOptional,
        isEmpty,
        visible,
      };
    });
  }, [availableColumns, emptyColumns, language, sectionOverrides]);

  const handleColumnToggle = useCallback(
    (columnId: string) => {
      toggleSectionColumn(sectionId, columnId);
    },
    [sectionId, toggleSectionColumn]
  );

  const handleDensityToggle = useCallback(() => {
    setColumnDensity(columnDensity === 'compact' ? 'normal' : 'compact');
  }, [columnDensity, setColumnDensity]);

  const combinedFilterValue = `${tableFilterPreset}|${directionFilter}`;
  const resolvedSecondaryCount = secondaryCount ?? waitingCount;
  const resolvedSecondaryLabel = secondaryCountLabel ?? copy.tableControls.waiting;

  const handleCombinedFilterChange = useCallback(
    (v: string) => {
      const { table, direction } = parseCombinedFilterValue(v);
      setTableFilterPreset(table);
      setDirectionFilter(direction);
    },
    [setDirectionFilter, setTableFilterPreset]
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const queryTrimmed = searchQuery.trim();
  const searchExpanded = searchPanelOpen || queryTrimmed.length > 0;

  const combinedFilterLabel = useMemo(() => {
    return copy.tableControls.filterOptions[combinedFilterValue] ?? copy.tableControls.filter;
  }, [combinedFilterValue, copy.tableControls]);
  const columnPresetLabel = useMemo(() => {
    const label = PRESET_COLUMN_MAP[columnPresetId]?.label ?? columnPresetId;
    return localizePulsePresetLabel(columnPresetId, label, language);
  }, [columnPresetId, language]);

  const handleSearchToggle = useCallback(() => {
    if (searchExpanded && queryTrimmed === '' && searchPanelOpen) {
      setSearchPanelOpen(false);
      return;
    }
    setSearchPanelOpen(true);
    queueMicrotask(() => searchInputRef.current?.focus());
  }, [queryTrimmed, searchExpanded, searchPanelOpen]);

  return (
    <div
      className={cn(
        'flex min-h-[40px] flex-wrap items-center gap-2 px-4 py-2',
        className
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-1.5 overflow-hidden transition-[max-width] duration-200 ease-out',
          searchExpanded ? 'max-w-xs flex-1 sm:max-w-md' : 'max-w-9'
        )}
      >
        <button
          type="button"
          onClick={handleSearchToggle}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors',
            'hover:bg-muted/50 hover:text-foreground',
            searchExpanded && 'border-primary/40 text-primary'
          )}
          aria-expanded={searchExpanded}
          aria-controls={searchExpanded ? 'pulse-table-search' : undefined}
          aria-label={copy.tableControls.search}
          title={copy.tableControls.search}
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
        {searchExpanded && (
          <input
            ref={searchInputRef}
            id="pulse-table-search"
            type="search"
            placeholder={copy.tableControls.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && !searchQuery.trim()) {
                setSearchPanelOpen(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="h-9 min-w-[100px] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary sm:min-w-[140px]"
            aria-label={copy.tableControls.search}
          />
        )}
        {searchExpanded && queryTrimmed && (
          <button
            type="button"
            onClick={() => toggleFavorite(queryTrimmed.toUpperCase())}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors hover:bg-muted/50',
              favorites.has(queryTrimmed.toUpperCase())
                ? 'text-primary'
                : 'text-muted-foreground/45 hover:text-primary'
            )}
            aria-label={
              favorites.has(queryTrimmed.toUpperCase())
                ? `Remove ${queryTrimmed.toUpperCase()} from favorites`
                : `Add ${queryTrimmed.toUpperCase()} to favorites`
            }
            title={favorites.has(queryTrimmed.toUpperCase()) ? 'Unfavorite' : 'Favorite'}
          >
            <Star
              className={cn('h-4 w-4', favorites.has(queryTrimmed.toUpperCase()) && 'fill-current')}
              aria-hidden
            />
          </button>
        )}
      </div>

      {/* 열 구성 + 시간·방향 — 단일 Popover (프리셋 UI 통합) */}
      <div className="hidden">
      {onColumnPresetChange ? (
        <Popover open={presetOpen} onOpenChange={setPresetOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-0 max-w-[min(100%,20rem)] shrink gap-1.5 border-border px-2.5 text-xs font-normal"
              aria-label={copy.tableControls.viewPreset}
            >
              <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 truncate text-left">
                <span className="font-medium text-foreground">{columnPresetLabel}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-muted-foreground">{combinedFilterLabel}</span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
            <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
              <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
                {copy.tableControls.columnConfig}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLUMNS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onColumnPresetChange(preset.id);
                      setPresetOpen(false);
                    }}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                      columnPresetId === preset.id
                        ? 'border-primary bg-primary/15 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {localizePulsePresetLabel(preset.id, preset.label, language)}
                  </button>
                ))}
              </div>
              <div className="my-2 h-px bg-border" />
              <p className="px-1 pb-1.5 text-[11px] font-medium text-muted-foreground">
                {copy.tableControls.timeDirection}
              </p>
              <div className="flex flex-col gap-0.5">
                {COMBINED_TABLE_FILTER_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      handleCombinedFilterChange(value);
                      setPresetOpen(false);
                    }}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-left text-xs transition-colors',
                      combinedFilterValue === value
                        ? 'bg-primary/15 font-medium text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {copy.tableControls.filterOptions[value]}
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Select value={combinedFilterValue} onValueChange={handleCombinedFilterChange}>
          <SelectTrigger className="h-9 w-auto min-w-[100px] max-w-[200px] gap-1 border-border bg-background text-xs">
            <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={copy.tableControls.filter} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-[11px] text-muted-foreground">
                {copy.tableControls.timeDirection}
              </SelectLabel>
              {COMBINED_TABLE_FILTER_VALUES.slice(0, 4).map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {copy.tableControls.filterOptions[value]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] text-muted-foreground">
                {copy.tableControls.direction}
              </SelectLabel>
              {COMBINED_TABLE_FILTER_VALUES.slice(4, 6).map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {copy.tableControls.filterOptions[value]}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] text-muted-foreground">
                {copy.tableControls.directionTime}
              </SelectLabel>
              {COMBINED_TABLE_FILTER_VALUES.slice(6).map((value) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {copy.tableControls.filterOptions[value]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
      </div>

      <div className="hidden">
        <ColumnPicker columns={columnConfigs} onToggle={handleColumnToggle} className="shrink-0" />
      </div>

      <button
        type="button"
        onClick={() => setMoreSheetOpen(true)}
        className="hidden"
        aria-haspopup="dialog"
        aria-label={language === 'ko' ? '더 보기' : 'More options'}
      >
        <Settings2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{language === 'ko' ? '더보기' : 'More'}</span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        <FavoriteScopeControls symbols={favoriteSymbols} />
        <div className="flex min-w-[10rem] shrink-0 items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-muted/20 p-0.5" role="group" aria-label="Pulse Wave filter">
          {(['pulse', 'wave'] as SignalStreamId[]).map((stream) => (
            <button key={stream} type="button" onClick={() => toggleStreamFilter(stream)} role="checkbox" aria-checked={streamFilter[stream]} className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold leading-none tracking-wide transition-colors hover:bg-muted/35 active:bg-muted/50">
              <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors', streamFilter[stream] ? 'border-foreground bg-foreground text-background shadow-sm' : 'border-muted-foreground/55 bg-background text-transparent')}>✓</span>
              <span className={cn('whitespace-nowrap', streamFilter[stream] ? 'text-foreground' : 'text-muted-foreground')}>{stream === 'pulse' ? 'PULSE' : 'WAVE'}</span>
              <span className="ml-1 whitespace-nowrap font-mono text-[11px] font-semibold text-muted-foreground">{typeof streamWinRates[stream] === 'number' ? `${streamWinRates[stream]!.toFixed(0)}%` : '—'}</span>
            </button>
          ))}
        </div>
      </div>

      {datePeriod && onDatePeriodChange ? (
        <div className="shrink-0">
          <Select value={datePeriod} onValueChange={(value) => {
              if (value === '30d' || value === '90d' || value === 'all') {
                onDatePeriodChange(value);
              }
            }}>
            <SelectTrigger className="h-9 w-[132px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">{language === 'ko' ? '최근 30일' : 'Last 30 days'}</SelectItem>
              <SelectItem value="90d">{language === 'ko' ? '최근 3개월' : 'Last 3 months'}</SelectItem>
              <SelectItem value="all">{language === 'ko' ? '누적' : 'All time'}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-nowrap items-center gap-2 rounded-lg border border-border bg-card/50 p-2.5">
        <label className="flex w-[7.5rem] min-w-[7.5rem] flex-col gap-1 text-xs"><span className="flex items-center justify-between text-muted-foreground"><span>Win Rate</span><b className="font-mono text-foreground">{qualityWinRateThreshold}%</b></span><input className="h-1.5 w-full cursor-pointer accent-primary" type="range" min="35" max="100" step="1" value={qualityWinRateThreshold} onChange={(e) => setQualityWinRateThreshold(Number(e.target.value))} /></label>
        <label className="flex w-[7.5rem] min-w-[7.5rem] flex-col gap-1 text-xs"><span className="flex items-center justify-between text-muted-foreground"><span>Risk/Reward</span><b className="font-mono text-foreground">{qualityRiskRewardThreshold.toFixed(1)}</b></span><input className="h-1.5 w-full cursor-pointer accent-primary" type="range" min="0.6" max="5" step="0.1" value={qualityRiskRewardThreshold} onChange={(e) => setQualityRiskRewardThreshold(Number(e.target.value))} /></label>
      </div>
      <Popover open={simulationOpen} onOpenChange={setSimulationOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 min-w-[240px] justify-between gap-2 text-left text-xs">
            <span className="font-medium text-muted-foreground">{copy.actionBar.simulationTitle}</span>
            <span className="font-mono tabular-nums">{formatSimulationUsd(simulationInput.capital)} · {simulationInput.capitalRatio}% · {simulationInput.leverage}x</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-4">
          <SimulationEditorBody historySignals={simulationHistorySignals} />
        </PopoverContent>
      </Popover>

      {showSignalStateFilter ? (
        <div className="hidden shrink-0 items-center gap-1.5 border-l border-border pl-2 sm:flex">
          <span className="hidden text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:inline">
            {copy.tableControls.rowFilter}
          </span>
          <ToggleGroup
            type="single"
            value={signalStateFilter}
            onValueChange={(v) => {
              if (v === 'all' || v === 'live' || v === 'wait')
                setSignalStateFilter(v as SignalStateFilter);
            }}
            variant="outline"
            size="sm"
            className="h-9 shrink-0 data-[state=on]:border-input"
            aria-label="LIVE·WAIT row filter"
          >
            <ToggleGroupItem value="all" className="px-2 text-[11px]">
              {copy.tableControls.all}
            </ToggleGroupItem>
            <ToggleGroupItem value="live" className="px-2 text-[11px]">
              LIVE
            </ToggleGroupItem>
            <ToggleGroupItem value="wait" className="px-2 text-[11px]">
              WAIT
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      ) : null}

      <div className="hidden">
        <FavoriteScopeControls symbols={favoriteSymbols} />
      </div>

      <div className="hidden">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as PulseSortBy)}>
          <SelectTrigger
            className={cn(
              'h-9 gap-1 border-border bg-background px-2 text-xs',
              'w-9 shrink-0 min-[400px]:w-auto min-[400px]:min-w-[90px] min-[400px]:max-w-[130px]'
            )}
            aria-label={copy.tableControls.sortAria}
          >
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <SelectValue
              placeholder={copy.tableControls.sortPlaceholder}
              className="hidden min-[400px]:inline min-[400px]:min-w-0"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time" className="text-xs">
              {copy.tableControls.sortItems.time}
            </SelectItem>
            <SelectItem value="symbol" className="text-xs">
              {copy.tableControls.sortItems.symbol}
            </SelectItem>
            <SelectItem value="volume" className="text-xs">
              {copy.tableControls.sortItems.volume}
            </SelectItem>
            <SelectItem value="discount" className="text-xs">
              {copy.tableControls.sortItems.discount}
            </SelectItem>
            <SelectItem value="pnl" className="text-xs">
              {copy.tableControls.sortItems.pnl}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="hidden">
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-semantic-bull"
            aria-hidden
          />
          <span className="font-medium text-semantic-bull">
            {copy.tableControls.open} {totalOpenPositions}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs">
          <span
            className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
            aria-hidden
          />
          <span className="font-medium text-amber-400">
            {resolvedSecondaryLabel} {resolvedSecondaryCount}
          </span>
        </span>
        {lastUpdate != null ? (
          <>
            <span className="hidden h-3 w-px shrink-0 bg-border sm:block" aria-hidden />
            <span
              className="flex min-w-0 shrink items-center gap-1 text-[11px] tabular-nums text-muted-foreground"
              title={copy.tableControls.updateTitle}
            >
              <Wifi
                className={cn(
                  'h-3.5 w-3.5 shrink-0',
                  isReconnecting ? 'animate-pulse text-amber-500' : 'text-emerald-500/85'
                )}
                aria-hidden
              />
              <span className="max-w-[10rem] truncate whitespace-nowrap">
                {isReconnecting
                  ? copy.tableControls.reconnecting
                  : formatPulseLastUpdated(lastUpdate, language)}
              </span>
            </span>
          </>
        ) : null}
        <button
          type="button"
          onClick={handleDensityToggle}
          className={cn(
            'hidden min-h-[36px] items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs transition-colors sm:flex',
            'hover:bg-muted/50'
          )}
          title={
            columnDensity === 'compact'
              ? copy.tableControls.normalDensity
              : copy.tableControls.compactDensity
          }
        >
          {columnDensity === 'compact' ? (
            <Rows4 className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>

      <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-foreground">
              {language === 'ko' ? '더보기' : 'More options'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {copy.columnPicker.trigger}
              </p>
              <div className="rounded-md border border-border p-2">
                <p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {copy.columnPicker.base}
                </p>
                {columnConfigs
                  .filter((col) => !col.isOptional)
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-not-allowed items-center gap-2 rounded px-2 py-1.5 opacity-60"
                    >
                      <Checkbox checked disabled />
                      <span className="text-xs text-foreground">{col.label}</span>
                      <Lock className="ml-auto h-3 w-3 text-muted-foreground" />
                    </label>
                  ))}
                <div className="my-2 border-t border-border" />
                <p className="mb-1 px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {copy.columnPicker.optional}
                </p>
                {columnConfigs
                  .filter((col) => col.isOptional)
                  .map((col) => (
                    <label
                      key={col.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50"
                    >
                      <Checkbox checked={col.visible} onCheckedChange={() => handleColumnToggle(col.id)} />
                      <span className="text-xs text-foreground">{col.label}</span>
                      {col.isEmpty ? (
                        <span className="ml-auto rounded bg-muted px-1 text-[10px] text-muted-foreground">
                          {copy.columnPicker.empty}
                        </span>
                      ) : null}
                    </label>
                  ))}
              </div>
            </div>

            {datePeriod && onDatePeriodChange ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {language === 'ko' ? '기간' : 'Date'}
                </p>
                <RadioGroup
                  value={datePeriod}
                  onValueChange={(value) => {
                    if (value === '30d' || value === '90d' || value === 'all') {
                      onDatePeriodChange(value);
                    }
                  }}
                  className="grid grid-cols-3 gap-2"
                  aria-label={language === 'ko' ? '히스토리 기간' : 'History date range'}
                >
                  {(
                    [
                      ['30d', language === 'ko' ? '최근 30일' : '30D'],
                      ['90d', language === 'ko' ? '최근 3개월' : '3M'],
                      ['all', language === 'ko' ? '누적' : 'All'],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={cn(
                        'flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
                        datePeriod === value
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      )}
                    >
                      <RadioGroupItem value={value} className="sr-only" />
                      <span>{label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ) : null}

            {showSignalStateFilter ? (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {copy.tableControls.rowFilter}
                </p>
                <ToggleGroup
                  type="single"
                  value={signalStateFilter}
                  onValueChange={(v) => {
                    if (v === 'all' || v === 'live' || v === 'wait')
                      setSignalStateFilter(v as SignalStateFilter);
                  }}
                  variant="outline"
                  className="grid w-full grid-cols-3 gap-2"
                  aria-label="LIVE·WAIT row filter"
                >
                  <ToggleGroupItem value="all" className="h-10 w-full text-xs">
                    {copy.tableControls.all}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="live" className="h-10 w-full text-xs">
                    LIVE
                  </ToggleGroupItem>
                  <ToggleGroupItem value="wait" className="h-10 w-full text-xs">
                    WAIT
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            ) : null}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {language === 'ko' ? '즐겨찾기' : 'Favorites'}
              </p>
              <FavoriteScopeControls symbols={favoriteSymbols} className="w-full" />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {copy.tableControls.sortAria}
              </p>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as PulseSortBy)}>
                <SelectTrigger className="h-10 w-full gap-2 border-border bg-background text-sm">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={copy.tableControls.sortPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time">{copy.tableControls.sortItems.time}</SelectItem>
                  <SelectItem value="symbol">{copy.tableControls.sortItems.symbol}</SelectItem>
                  <SelectItem value="volume">{copy.tableControls.sortItems.volume}</SelectItem>
                  <SelectItem value="discount">{copy.tableControls.sortItems.discount}</SelectItem>
                  <SelectItem value="pnl">{copy.tableControls.sortItems.pnl}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {language === 'ko' ? '밀도' : 'Density'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setColumnDensity('normal')}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
                    columnDensity === 'normal'
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  <Rows3 className="h-3.5 w-3.5" aria-hidden />
                  {copy.tableControls.normalDensity}
                </button>
                <button
                  type="button"
                  onClick={() => setColumnDensity('compact')}
                  className={cn(
                    'flex h-10 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
                    columnDensity === 'compact'
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  <Rows4 className="h-3.5 w-3.5" aria-hidden />
                  {copy.tableControls.compactDensity}
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
