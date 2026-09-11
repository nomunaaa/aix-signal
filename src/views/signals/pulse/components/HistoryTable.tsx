/**
 * HistoryTable — AG Grid-based closed signal history table.
 * Preserves independent filter bar, CSV export, and pagination.
 * Includes checkbox columns for 추가매수/중간청산 and CoinIcon.
 * Scroll position preserved on pagination (no scroll-to-top).
 */

import { useMemo, useState, useCallback, useRef, useEffect, type MouseEvent } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeAlpine,
  colorSchemeDark,
  type CellClickedEvent,
  type ColDef,
  type GetRowIdParams,
  type IHeaderParams,
  type ICellRendererParams,
} from 'ag-grid-community';

const agDarkTheme = themeAlpine.withPart(colorSchemeDark).withParams({
  backgroundColor: 'transparent',
  headerBackgroundColor: 'rgba(255,255,255,0.03)',
  rowHoverColor: 'transparent',
  borderColor: 'hsl(var(--border))',
  foregroundColor: 'hsl(var(--foreground))',
  oddRowBackgroundColor: 'transparent',
});
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  Download,
  History,
  QrCode,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { CoinIcon } from './CoinIcon';
import {
  type ClosedSignal,
  type HistoryQueryState,
  type SimulationInput,
  type StrategyId,
} from '../types/pulse.types';
import { formatPriceWithFixedDecimals, formatSignedDollarAmount } from '@/lib/format-price';
import {
  formatDuration,
  formatHoldDurationFromLabel,
  formatPercent,
  formatSymbolPair,
  formatTimestamp,
} from '../utils/formatters';
import { sortClosedSignals } from '../utils/strategyEngine';
import { chartAbsoluteLinkForSignal } from '../utils/chartLink';
import { PULSE_HISTORY_AUTO_SIZE_STRATEGY } from '../config/pulseAgGridOptions';
import { PULSE_CELL_CLASS, PULSE_GRID_COL } from '../config/pulseGridColumnLayout';
import {
  DirectionRenderer as EntryTrendDirectionRenderer,
  FavoriteStarRenderer,
} from '../config/sectionColumnDefs';
import {
  localizePulseColumnDefs,
  localizePulseText,
  usePulseCopy,
  type PulseLanguage,
} from '../utils/pulseTranslations';
import { usePulseStore } from '../stores/pulseStore';
import { tradingCategoryColor } from '../utils/tradingCategoryVisuals';
import {
  dateInputEndExclusiveMs,
  dateInputStartMs,
  isoTimestampMs,
  normalizeIsoTimestamp,
  type HistoryDatePeriod,
} from '../utils/historyDateRange';
import {
  calculateHistorySimulationPnl,
  FALLBACK_HISTORY_SIMULATION_INPUT,
  historyPnlPercentForStrategy,
} from '../utils/historyPnl';

// AG Grid Community 모듈 등록
ModuleRegistry.registerModules([AllCommunityModule]);

type HistoryExactDateRange = {
  fromIso?: string | null;
  toIso?: string | null;
};

export interface HistoryTableProps {
  signals: ClosedSignal[];
  /** 페이지네이션 적용 전 전체 목록 — CSV 내보내기가 현재 페이지가 아닌 전체 필터 결과를 담도록 쓴다. */
  allSignals?: ClosedSignal[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  serverPaginated?: boolean;
  /** 외부에서 종목 필터를 주입 (관계형 조회: 라이브 시그널 -> 히스토리) */
  externalSymbolFilter?: string;
  /** externalSymbolFilter를 심어준 상위(URL) 상태를 정리 — 사용자가 종목 스코프를 전체로 되돌릴 때 호출 */
  onClearExternalSymbolFilter?: () => void;
  externalDatePeriod?: HistoryDatePeriod;
  externalDateRange?: HistoryExactDateRange;
  onClearExternalDateRange?: () => void;
  pageSize?: number;
  className?: string;
  /** 행 클릭 시 전략 드로어 등 (AIX-54) */
  onRowClick?: (row: ClosedSignal) => void;
  /** LIVE/WAIT 행 필터가 전체가 아닐 때 톤·접힘 (AIX-85) */
  signalFilterActive?: boolean;
  /** Paid-plan gate: keep table chrome visible and show the lock copy in the table body. */
  upgradeRequired?: boolean;
  /** Profit simulation settings shared from the top action bar. */
  simulationInput: SimulationInput;
  selectedStrategy: StrategyId;
  onFilteredSignalsChange?: (signals: ClosedSignal[]) => void;
  onHistoryQueryChange?: (queryState: HistoryQueryState) => void;
}

// 독립 필터 상태 (메인 테이블 pulseStore에 영향 없음) — 단, 전략(trading category)/추세 여부는
// 상단 바(pulseStore.tradingCategoryFilters/trendModeFilter)에서 이미 signals를 선필터링해
// 내려주므로, 여기서 중복으로 다시 필터링하지 않는다 (안 그러면 상단 값과 어긋나 동기화가 깨진다).
interface HistoryFilter {
  symbol: string;
  direction: '' | 'long' | 'short';
  minReturn: string;
  maxReturn: string;
  dateFrom: string;
  dateTo: string;
  exactDateFromIso?: string | null;
  exactDateToIso?: string | null;
}

const INITIAL_FILTER: HistoryFilter = {
  symbol: '',
  direction: '',
  minReturn: '',
  maxReturn: '',
  dateFrom: '',
  dateTo: '',
};

// 필터 바(심볼/방향/전략/수익률/날짜)를 목록에 적용한다. 화면 그리드(현재 페이지)와
// CSV 내보내기(전체 페이지) 양쪽에서 같은 기준으로 재사용한다.
const FALLBACK_SIMULATION_INPUT = FALLBACK_HISTORY_SIMULATION_INPUT;
const HISTORY_PAGE_SIZE = 10;
const HISTORY_PNL_FRACTION_DIGITS = 2;

function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateInputFromIso(value: string | null): string {
  if (!value) return '';
  return formatDateInputValue(new Date(value));
}

function defaultHistoryFilter(
  symbol = '',
  period: HistoryDatePeriod = '30d',
  exactRange?: HistoryExactDateRange
): HistoryFilter {
  const exactDateFromIso = normalizeIsoTimestamp(exactRange?.fromIso);
  const exactDateToIso = normalizeIsoTimestamp(exactRange?.toIso);

  if (period === 'all') {
    return {
      ...INITIAL_FILTER,
      symbol,
      exactDateFromIso,
      exactDateToIso,
    };
  }

  const end = exactDateToIso ? new Date(exactDateToIso) : new Date();
  const start = exactDateFromIso ? new Date(exactDateFromIso) : new Date(end);
  if (!exactDateFromIso) {
    if (period === '90d') start.setMonth(start.getMonth() - 3);
    else start.setDate(start.getDate() - 30);
  }
  return {
    ...INITIAL_FILTER,
    symbol,
    dateFrom: exactDateFromIso
      ? formatDateInputFromIso(exactDateFromIso)
      : formatDateInputValue(start),
    dateTo: exactDateToIso ? formatDateInputFromIso(exactDateToIso) : formatDateInputValue(end),
    exactDateFromIso,
    exactDateToIso,
  };
}

type HistoryGridContext = {
  pulseLanguage?: PulseLanguage;
  simulationInput?: SimulationInput;
  selectedStrategy?: StrategyId;
};

type HistorySortBy = 'time' | 'symbol';
type HistorySortDirection = 'asc' | 'desc';
type HistorySortState = {
  by: HistorySortBy;
  dir: HistorySortDirection;
};

type HistorySymbolHeaderParams = IHeaderParams<ClosedSignal> & {
  visibleSymbolCount?: number;
  sortDirection?: HistorySortDirection | null;
  onToggleSort?: () => void;
};

function HistorySymbolHeader(params: HistorySymbolHeaderParams) {
  const sortDirection = params.sortDirection ?? null;
  const Icon =
    sortDirection === 'asc' ? ArrowUp : sortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <button
      type="button"
      className="flex h-full w-full min-w-0 items-center justify-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      onClick={params.onToggleSort}
      aria-label={`${params.displayName} sort`}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'
      }
    >
      <span className="min-w-0 truncate">
        {params.displayName}({params.visibleSymbolCount ?? 0})
      </span>
      <Icon className={cn('h-3.5 w-3.5 shrink-0', !sortDirection && 'opacity-50')} aria-hidden />
    </button>
  );
}

function holdSecondsFor(signal: ClosedSignal): number {
  if (typeof signal.holdSeconds === 'number' && Number.isFinite(signal.holdSeconds)) {
    return Math.max(0, signal.holdSeconds);
  }
  if (!signal.enteredAt || !signal.closedAt) return 0;
  const enteredMs =
    typeof signal.enteredAt === 'string'
      ? new Date(signal.enteredAt).getTime()
      : signal.enteredAt.getTime();
  const closedMs =
    typeof signal.closedAt === 'string'
      ? new Date(signal.closedAt).getTime()
      : signal.closedAt.getTime();
  if (!Number.isFinite(enteredMs) || !Number.isFinite(closedMs)) return 0;
  return Math.max(0, Math.floor((closedMs - enteredMs) / 1000));
}

function historyContext(params: ICellRendererParams<ClosedSignal>): HistoryGridContext {
  return (params.context ?? {}) as HistoryGridContext;
}

function applyHistoryFilter(
  list: ClosedSignal[],
  filter: HistoryFilter,
  simulationInput?: SimulationInput,
  selectedStrategy?: StrategyId,
  favorites?: ReadonlySet<string>,
  showFavoritesOnly?: boolean
): ClosedSignal[] {
  let result = list;
  if (filter.symbol.trim()) {
    const q = filter.symbol.toLowerCase();
    result = result.filter((s) => s.symbol.toLowerCase().includes(q));
  }
  if (showFavoritesOnly) {
    result = result.filter((s) => favorites?.has(s.symbol.trim().toUpperCase()));
  }
  if (filter.direction) {
    result = result.filter((s) => s.direction === filter.direction);
  }
  if (filter.minReturn) {
    const min = parseFloat(filter.minReturn);
    if (!isNaN(min)) {
      result = result.filter(
        (s) => calculateHistorySimulationPnl(s, simulationInput, selectedStrategy).pnlPercent >= min
      );
    }
  }
  if (filter.maxReturn) {
    const max = parseFloat(filter.maxReturn);
    if (!isNaN(max)) {
      result = result.filter(
        (s) => calculateHistorySimulationPnl(s, simulationInput, selectedStrategy).pnlPercent <= max
      );
    }
  }
  const exactFrom = isoTimestampMs(filter.exactDateFromIso);
  const from = exactFrom ?? dateInputStartMs(filter.dateFrom);
  if (from !== null) {
    result = result.filter((s) => {
      const t =
        typeof s.closedAt === 'string' ? new Date(s.closedAt).getTime() : s.closedAt.getTime();
      return t >= from;
    });
  }
  const exactTo = isoTimestampMs(filter.exactDateToIso);
  if (exactTo !== null) {
    result = result.filter((s) => {
      const t =
        typeof s.closedAt === 'string' ? new Date(s.closedAt).getTime() : s.closedAt.getTime();
      return t <= exactTo;
    });
  } else if (filter.dateTo) {
    const to = dateInputEndExclusiveMs(filter.dateTo);
    if (to !== null) {
      result = result.filter((s) => {
        const t =
          typeof s.closedAt === 'string' ? new Date(s.closedAt).getTime() : s.closedAt.getTime();
        return t < to;
      });
    }
  }
  return result;
}

// ─── Cell Renderers ───────────────────────────────────────────────────

function HistoryQrInfoRow({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between border-b border-border px-[13px] py-2 text-[12.5px] last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn('font-bold tabular-nums', tone)}>{v}</span>
    </div>
  );
}

function HistoryQrCell(params: ICellRendererParams<ClosedSignal>) {
  const [open, setOpen] = useState(false);
  if (!params.data) return null;
  const signal = params.data;
  const isLong = signal.direction === 'long';
  const context = historyContext(params);
  const { pnlPercent } = calculateHistorySimulationPnl(
    signal,
    context.simulationInput,
    context.selectedStrategy
  );
  const pnlTone =
    pnlPercent > 0
      ? 'text-semantic-bull'
      : pnlPercent < 0
        ? 'text-semantic-bear'
        : 'text-muted-foreground';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="flex h-full w-full items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        aria-label="QR 코드 보기"
        title="QR 코드 보기"
      >
        <QrCode className="h-4 w-4" />
      </button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="w-[320px] max-w-[calc(100vw-40px)] gap-0 rounded-2xl p-[22px] text-center">
            <DialogTitle className="text-[15px] font-extrabold">진입 · 청산 차트</DialogTitle>
            <div className="mt-[3px] text-[12.5px] text-muted-foreground">
              {formatSymbolPair(signal.symbol)}
              <span
                className={cn(
                  'ml-1 inline-block rounded-[6px] px-[9px] py-[3px] text-[11px] font-bold',
                  isLong
                    ? 'bg-semantic-bull/15 text-semantic-bull'
                    : 'bg-semantic-bear/15 text-semantic-bear'
                )}
              >
                {isLong ? '롱' : '숏'}
              </span>
            </div>
            <div className="mx-auto mb-[14px] mt-[18px] flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-3">
              <QRCodeSVG value={chartAbsoluteLinkForSignal(signal)} size={176} level="M" />
            </div>
            <p className="mb-[14px] text-xs text-muted-foreground">
              QR을 스캔하면 진입·청산 차트로 이동합니다.
            </p>
            <div className="mb-1 overflow-hidden rounded-[10px] border border-border text-left">
              <HistoryQrInfoRow k="진입가" v={formatPriceWithFixedDecimals(signal.entryPrice)} />
              <HistoryQrInfoRow k="청산가" v={formatPriceWithFixedDecimals(signal.exitPrice)} />
              <HistoryQrInfoRow
                k="손익율"
                v={formatPercent(pnlPercent, HISTORY_PNL_FRACTION_DIGITS)}
                tone={pnlTone}
              />
              <HistoryQrInfoRow k="보유시간" v={formatHoldDurationFromLabel(signal.holdDuration)} />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function SymbolRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const label = formatSymbolPair(params.data.symbol);
  return (
    <div className="flex w-full min-w-0 items-center justify-start gap-1.5">
      <CoinIcon symbol={params.data.symbol} size={18} className="shrink-0" />
      <span className="min-w-0 truncate text-left font-mono font-medium" title={label}>
        {label}
      </span>
    </div>
  );
}

function StreamBadgeRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const isWave = params.data.barinterval === '10m';
  const categoryColor = tradingCategoryColor(params.data.tradingCategory);
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-flex h-4 items-center justify-center rounded px-1 text-[10px] font-semibold leading-none', isWave ? 'bg-purple-500/15 text-purple-400' : 'bg-cyan-500/15 text-cyan-400')} title={isWave ? 'Wave' : 'Pulse'}>{isWave ? 'W' : 'P'}</span>
      {categoryColor ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: categoryColor }} title={params.data.tradingCategory} aria-label={params.data.tradingCategory} /> : null}
    </span>
  );
}

function HistoryDirectionRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const isLong = params.data.direction === 'long';
  return (
    <Badge
      variant={isLong ? 'default' : 'destructive'}
      className={cn(
        'text-xs font-semibold',
        isLong
          ? 'border-blue-500/30 bg-blue-500/20 text-blue-400'
          : 'border-orange-500/30 bg-orange-500/20 text-orange-400'
      )}
    >
      {isLong ? 'Long' : 'Short'}
    </Badge>
  );
}

function CloseTrendRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  return EntryTrendDirectionRenderer({
    ...params,
    context: {
      ...(params.context ?? {}),
      showEntryTrendSnapshot: true,
    },
  });
}

function CycleSummaryRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const cycleId = params.data.cycle_id?.trim();
  if (!cycleId) return <span />;
  return (
    <span
      className="block max-w-full truncate font-mono text-sm text-muted-foreground"
      title={cycleId}
    >
      {cycleId}
    </span>
  );
}

/** 표시 전용 — 입력 불가 (AIX-54) */
function CheckboxCellRenderer(params: ICellRendererParams<ClosedSignal>) {
  const value = params.value as boolean;
  return (
    <div
      className="pointer-events-none flex select-none items-center justify-center"
      aria-hidden="true"
    >
      <div
        className={`flex h-4 w-4 items-center justify-center rounded border ${
          value ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-transparent'
        }`}
      >
        {value && (
          <svg className="h-3 w-3 text-primary" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

function EntryPriceRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  return (
    <span className="col-price block w-full min-w-0 truncate text-center text-sm tabular-nums text-muted-foreground">
      {formatPriceWithFixedDecimals(params.data.entryPrice)}
    </span>
  );
}

function ExitPriceRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  return (
    <span className="col-price block w-full min-w-0 truncate text-center font-semibold tabular-nums">
      {formatPriceWithFixedDecimals(params.data.exitPrice)}
    </span>
  );
}

function PnlAmountRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const context = historyContext(params);
  const { pnlAmount, totalEntryMargin, totalEntryNotional } = calculateHistorySimulationPnl(
    params.data,
    context.simulationInput,
    context.selectedStrategy
  );
  return (
    <span
      className="min-w-0 max-w-full truncate text-sm font-semibold"
      style={{ color: pnlAmount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
      title={`Margin ${formatSignedDollarAmount(totalEntryMargin)} × ${context.simulationInput?.leverage ?? FALLBACK_SIMULATION_INPUT.leverage}x = ${formatSignedDollarAmount(totalEntryNotional)}`}
    >
      {formatSignedDollarAmount(pnlAmount, {
        positiveSign: true,
        fractionDigits: HISTORY_PNL_FRACTION_DIGITS,
      })}
    </span>
  );
}

function PnlRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const context = historyContext(params);
  const { pnlPercent } = calculateHistorySimulationPnl(
    params.data,
    context.simulationInput,
    context.selectedStrategy
  );
  return (
    <span
      className="font-mono text-sm font-bold tabular-nums"
      style={{ color: pnlPercent >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
      title={`${historyPnlPercentForStrategy(params.data, context.selectedStrategy).toFixed(4)}% position return`}
    >
      {formatPercent(pnlPercent, HISTORY_PNL_FRACTION_DIGITS)}
    </span>
  );
}

function HoldDurationRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  return (
    <span className="font-mono text-sm font-medium tabular-nums leading-none text-muted-foreground">
      {formatHoldDurationFromLabel(params.data.holdDuration)}
    </span>
  );
}

function ClosedAtRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data) return null;
  const raw = params.data.closedAt;
  const iso = typeof raw === 'string' ? raw : raw.toISOString();
  return (
    <span className="whitespace-nowrap font-mono text-sm font-medium tabular-nums leading-none text-muted-foreground">
      {formatTimestamp(iso)}
    </span>
  );
}

function SectionBadgeRenderer(params: ICellRendererParams<ClosedSignal>) {
  if (!params.data || !params.data.closedFromSection)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const section = params.data.closedFromSection;
  const language =
    (params.context as { pulseLanguage?: PulseLanguage } | undefined)?.pulseLanguage ?? 'ko';
  const labelMap: Record<string, string> = {
    TREND_DISCOUNT: '할인',
    TREND_TP: '수익',
    NON_TREND_SHORT: '비추세',
    NON_TREND_LONG: '비추세',
    REVERSAL: '역추세',
    NEW_SIGNAL: '신규',
    WAITING_ENTRY: '대기',
  };
  const label = localizePulseText(labelMap[section] ?? section, language);
  return (
    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

// ─── Column Definitions ───────────────────────────────────────────────

const HISTORY_COLUMN_DEFS: ColDef<ClosedSignal>[] = [
  {
    field: 'id',
    headerName: '',
    colId: 'histFavorite',
    pinned: 'left',
    width: PULSE_GRID_COL.favoriteWidth,
    sortable: false,
    cellRenderer: FavoriteStarRenderer,
    suppressSizeToFit: true,
    suppressAutoSize: true,
  },
  {
    field: 'symbol',
    headerName: '종목',
    pinned: 'left',
    minWidth: PULSE_GRID_COL.symbolMin,
    width: 140,
    cellRenderer: SymbolRenderer,
    cellClass: PULSE_CELL_CLASS.symbol,
  },
  {
    field: 'direction',
    headerName: 'Stream',
    colId: 'histStream',
    width: 76,
    minWidth: 76,
    cellRenderer: StreamBadgeRenderer,
    suppressAutoSize: true,
    suppressSizeToFit: true,
  },
  {
    field: 'direction',
    headerName: '방향',
    minWidth: PULSE_GRID_COL.directionMin,
    width: 78,
    cellRenderer: HistoryDirectionRenderer,
    cellClass: PULSE_CELL_CLASS.direction,
  },
  {
    headerName: '진입시 추세',
    colId: 'histCloseTrend',
    width: 112,
    minWidth: 104,
    suppressAutoSize: true,
    suppressSizeToFit: true,
    cellRenderer: CloseTrendRenderer,
  },
  {
    headerName: '사이클',
    colId: 'histCycle',
    minWidth: 144,
    width: 168,
    flex: 0.9,
    cellRenderer: CycleSummaryRenderer,
  },
  {
    headerName: '추매',
    colId: 'histChkAdd',
    width: 56,
    suppressAutoSize: true,
    suppressSizeToFit: true,
    cellRenderer: CheckboxCellRenderer,
    valueGetter: (p) => (p.data ? (p.data.hasAdditionalBuy ?? p.data.discountGain > 0) : false),
  },
  {
    headerName: '분청',
    colId: 'histChkPartial',
    width: 56,
    suppressAutoSize: true,
    suppressSizeToFit: true,
    cellRenderer: CheckboxCellRenderer,
    valueGetter: (p) => (p.data ? (p.data.hasPartialClose ?? p.data.lockedAmount > 0) : false),
  },
  {
    headerName: '진입가',
    minWidth: PULSE_GRID_COL.priceMin,
    width: 104,
    cellRenderer: EntryPriceRenderer,
    cellClass: 'col-price',
  },
  {
    field: 'exitPrice',
    headerName: '청산가',
    minWidth: PULSE_GRID_COL.priceMin,
    width: 104,
    cellRenderer: ExitPriceRenderer,
    cellClass: 'col-price',
  },
  {
    headerName: '손익($)',
    colId: 'histPnlAmount',
    minWidth: 112,
    width: 126,
    type: 'rightAligned',
    valueGetter: (p) => {
      const context = (p.context ?? {}) as HistoryGridContext;
      return p.data
        ? calculateHistorySimulationPnl(p.data, context.simulationInput, context.selectedStrategy)
            .pnlAmount
        : null;
    },
    cellRenderer: PnlAmountRenderer,
    cellClass: 'col-price',
  },
  {
    headerName: '손익(%)',
    colId: 'histPnlPercent',
    minWidth: 96,
    width: 108,
    valueGetter: (p) => {
      const context = (p.context ?? {}) as HistoryGridContext;
      return p.data
        ? calculateHistorySimulationPnl(p.data, context.simulationInput, context.selectedStrategy)
            .pnlPercent
        : null;
    },
    cellRenderer: PnlRenderer,
  },
  {
    field: 'holdDuration',
    headerName: '보유시간',
    minWidth: 92,
    width: 112,
    cellRenderer: HoldDurationRenderer,
  },
  {
    headerName: '청산일시',
    minWidth: 148,
    width: 176,
    flex: 1,
    cellRenderer: ClosedAtRenderer,
    valueGetter: (p) => p.data?.closedAt,
  },
  {
    headerName: '출처',
    minWidth: 72,
    width: 92,
    flex: 0.8,
    colId: 'histSource',
    hide: true,
    cellRenderer: SectionBadgeRenderer,
    valueGetter: (p) => p.data?.closedFromSection,
  },
  {
    field: 'id',
    headerName: '',
    colId: 'histQr',
    pinned: 'right',
    width: PULSE_GRID_COL.favoriteWidth,
    sortable: false,
    cellRenderer: HistoryQrCell,
    suppressSizeToFit: true,
    suppressAutoSize: true,
  },
];

const DEFAULT_COL_DEF: ColDef = {
  sortable: false,
  filter: false,
  resizable: false,
  suppressMovable: true,
  cellStyle: { cursor: 'pointer' },
};

// ─── Main Component ───────────────────────────────────────────────────

export function HistoryTable({
  signals,
  allSignals,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  serverPaginated = false,
  externalSymbolFilter,
  onClearExternalSymbolFilter: _onClearExternalSymbolFilter,
  externalDatePeriod = '30d',
  externalDateRange,
  onClearExternalDateRange,
  pageSize = HISTORY_PAGE_SIZE,
  className,
  onRowClick,
  signalFilterActive = false,
  upgradeRequired = false,
  simulationInput,
  selectedStrategy,
  onFilteredSignalsChange,
  onHistoryQueryChange,
}: HistoryTableProps) {
  const { language, copy } = usePulseCopy();
  const gridRef = useRef<AgGridReact<ClosedSignal>>(null);
  const favorites = usePulseStore((s) => s.favorites);
  const showFavoritesOnly = usePulseStore((s) => s.showFavoritesOnly);
  const setShowFavoritesOnly = usePulseStore((s) => s.setShowFavoritesOnly);
  const [historySectionOpen, setHistorySectionOpen] = useState(() => !signalFilterActive);
  // 청산일시 기준 실제 시간순 정렬(전략 성과 그룹핑과 무관) — 기본은 내림차순(최신순).
  const [historySort, setHistorySort] = useState<HistorySortState>({ by: 'time', dir: 'desc' });

  useEffect(() => {
    if (!signalFilterActive) setHistorySectionOpen(true);
    else setHistorySectionOpen(false);
  }, [signalFilterActive]);

  const [filter, setFilter] = useState<HistoryFilter>(() => ({
    ...defaultHistoryFilter(externalSymbolFilter ?? '', externalDatePeriod, externalDateRange),
  }));

  // 외부 종목/기간 필터 주입 시 자체 filter에 반영
  useEffect(() => {
    const nextDefaults = defaultHistoryFilter(
      externalSymbolFilter ?? '',
      externalDatePeriod,
      externalDateRange
    );
    setFilter((prev) => ({
      ...prev,
      symbol: externalSymbolFilter ?? prev.symbol,
      dateFrom: nextDefaults.dateFrom,
      dateTo: nextDefaults.dateTo,
      exactDateFromIso: nextDefaults.exactDateFromIso,
      exactDateToIso: nextDefaults.exactDateToIso,
    }));
    onPageChange(1);
  }, [externalDatePeriod, externalDateRange, externalSymbolFilter, onPageChange]);

  const updateFilter = useCallback(
    <K extends keyof HistoryFilter>(key: K, value: HistoryFilter[K]) => {
      const clearExactDateRange = key === 'dateFrom' || key === 'dateTo';
      if (clearExactDateRange) onClearExternalDateRange?.();
      setFilter((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'dateFrom') next.exactDateFromIso = null;
        if (key === 'dateTo') next.exactDateToIso = null;
        return next;
      });
      onPageChange(1);
    },
    [onClearExternalDateRange, onPageChange]
  );

  const openDatePicker = useCallback((event: MouseEvent<HTMLInputElement>) => {
    const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (typeof input.showPicker !== 'function') return;
    try {
      input.showPicker();
    } catch {
      // Some browsers only allow showPicker during specific user gestures.
    }
  }, []);

  useEffect(() => {
    onHistoryQueryChange?.({
      filter,
      showFavoritesOnly,
      sort: historySort,
    });
  }, [filter, historySort, onHistoryQueryChange, showFavoritesOnly]);

  // Apply filters before pagination so the table, CSV export, and simulator share one result set.
  const sourceSignals = allSignals ?? signals;

  const filteredAllSignals = useMemo(() => {
    const filtered = applyHistoryFilter(
      sourceSignals,
      filter,
      simulationInput,
      selectedStrategy,
      favorites,
      showFavoritesOnly
    );
    // 전략 성과 그룹핑(sortClosedSignalsByStrategyPerformance)과 무관하게, 청산일시
    // 기준 순수 시간순으로 보고 싶을 때를 위한 전용 정렬(내림차순 토글 버튼).
    return sortClosedSignals(filtered, historySort.by, historySort.dir);
  }, [
    sourceSignals,
    filter,
    simulationInput,
    selectedStrategy,
    favorites,
    showFavoritesOnly,
    historySort,
  ]);
  const loadedTotalCount = filteredAllSignals.length;
  const defaultFilterForScope = defaultHistoryFilter(
    externalSymbolFilter ?? '',
    externalDatePeriod,
    externalDateRange
  );
  const hasLocalCountFilter =
    filter.symbol.trim() !== defaultFilterForScope.symbol.trim() ||
    filter.direction !== defaultFilterForScope.direction ||
    filter.minReturn.trim() !== defaultFilterForScope.minReturn.trim() ||
    filter.maxReturn.trim() !== defaultFilterForScope.maxReturn.trim() ||
    filter.dateFrom !== defaultFilterForScope.dateFrom ||
    filter.dateTo !== defaultFilterForScope.dateTo ||
    (filter.exactDateFromIso ?? '') !== (defaultFilterForScope.exactDateFromIso ?? '') ||
    (filter.exactDateToIso ?? '') !== (defaultFilterForScope.exactDateToIso ?? '') ||
    showFavoritesOnly;
  const displayedTotalCount =
    serverPaginated || !hasLocalCountFilter
      ? Math.max(totalCount, loadedTotalCount)
      : loadedTotalCount;
  const effectiveTotalCount = serverPaginated ? displayedTotalCount : loadedTotalCount;
  const effectivePageSize =
    Number.isFinite(pageSize) && pageSize > 0
      ? Math.max(1, Math.floor(pageSize))
      : HISTORY_PAGE_SIZE;
  const effectiveTotalPages = serverPaginated
    ? Math.max(1, totalPages)
    : Math.max(1, Math.ceil(effectiveTotalCount / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), effectiveTotalPages);
  const filteredSignals = useMemo(() => {
    if (serverPaginated) return filteredAllSignals;
    const start = (safeCurrentPage - 1) * effectivePageSize;
    return filteredAllSignals.slice(start, start + effectivePageSize);
  }, [effectivePageSize, filteredAllSignals, safeCurrentPage, serverPaginated]);
  const visibleSymbolCount = useMemo(
    () =>
      new Set(filteredSignals.map((signal) => signal.symbol.trim().toUpperCase()).filter(Boolean))
        .size,
    [filteredSignals]
  );

  // CSV export uses the same filtered set before pagination.
  const exportSignals = filteredAllSignals;

  // 필터된 전체(페이지네이션 전) 손익금·손익률·보유시간 합계 — 화면 하단 합계 바에 표시.
  const historyTotals = useMemo(() => {
    let pnlAmount = 0;
    let pnlPercent = 0;
    let holdSeconds = 0;
    for (const s of filteredAllSignals) {
      const sim = calculateHistorySimulationPnl(s, simulationInput, selectedStrategy);
      pnlAmount += sim.pnlAmount;
      pnlPercent += sim.pnlPercent;
      holdSeconds += holdSecondsFor(s);
    }
    return { pnlAmount, pnlPercent, holdSeconds };
  }, [filteredAllSignals, simulationInput, selectedStrategy]);

  useEffect(() => {
    onFilteredSignalsChange?.(filteredAllSignals);
  }, [filteredAllSignals, onFilteredSignalsChange]);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      onPageChange(safeCurrentPage);
    }
  }, [currentPage, onPageChange, safeCurrentPage]);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    const showEllipsisStart = safeCurrentPage > 3;
    const showEllipsisEnd = safeCurrentPage < effectiveTotalPages - 2;

    if (effectiveTotalPages <= 7) {
      for (let i = 1; i <= effectiveTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (showEllipsisStart) pages.push('ellipsis');
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(effectiveTotalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (showEllipsisEnd) pages.push('ellipsis');
      if (effectiveTotalPages > 1) pages.push(effectiveTotalPages);
    }
    return pages;
  }, [effectiveTotalPages, safeCurrentPage]);

  const toggleHistorySymbolSort = useCallback(() => {
    setHistorySort((current) => ({
      by: 'symbol',
      dir: current.by === 'symbol' && current.dir === 'asc' ? 'desc' : 'asc',
    }));
    onPageChange(1);
  }, [onPageChange]);

  const columnDefs = useMemo(() => {
    const localized = localizePulseColumnDefs(
      HISTORY_COLUMN_DEFS.filter((column) => column.colId !== 'histSource'),
      language
    );

    return localized.map((column) => {
      if (column.field !== 'symbol') return column;
      return {
        ...column,
        headerComponent: HistorySymbolHeader,
        headerComponentParams: {
          visibleSymbolCount,
          sortDirection: historySort.by === 'symbol' ? historySort.dir : null,
          onToggleSort: toggleHistorySymbolSort,
        },
      } satisfies ColDef<ClosedSignal>;
    });
  }, [historySort, language, toggleHistorySymbolSort, visibleSymbolCount]);

  const gridContext = useMemo<HistoryGridContext>(
    () => ({ pulseLanguage: language, simulationInput, selectedStrategy }),
    [language, simulationInput, selectedStrategy]
  );

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    api.refreshCells({
      columns: ['histPnlAmount', 'histPnlPercent'],
      force: true,
    });
  }, [
    simulationInput.capital,
    simulationInput.capitalRatio,
    simulationInput.leverage,
    selectedStrategy,
  ]);

  // CSV 내보내기 (보안: CSV injection 방지)
  const sanitizeCsvValue = (value: string): string => {
    const str = String(value);
    if (/^[=+\-@\t]/.test(str)) return `'${str}`;
    return str;
  };

  const handleExportCsv = () => {
    const headers = copy.history.csvHeaders;
    const dateLocale = language === 'ko' ? 'ko-KR' : 'en-US';
    const rows = exportSignals.map((s) => {
      const closedAt = typeof s.closedAt === 'string' ? new Date(s.closedAt) : s.closedAt;
      const { pnlAmount, pnlPercent } = calculateHistorySimulationPnl(
        s,
        simulationInput,
        selectedStrategy
      );
      return [
        sanitizeCsvValue(formatSymbolPair(s.symbol)),
        sanitizeCsvValue(s.direction === 'long' ? 'Long' : 'Short'),
        (s.hasAdditionalBuy ?? s.discountGain > 0) ? 'Y' : 'N',
        (s.hasPartialClose ?? s.lockedAmount > 0) ? 'Y' : 'N',
        sanitizeCsvValue(formatPriceWithFixedDecimals(s.entryPrice)),
        sanitizeCsvValue(formatPriceWithFixedDecimals(s.exitPrice)),
        sanitizeCsvValue(
          formatSignedDollarAmount(pnlAmount, {
            positiveSign: true,
            fractionDigits: HISTORY_PNL_FRACTION_DIGITS,
          })
        ),
        sanitizeCsvValue(formatPercent(pnlPercent, HISTORY_PNL_FRACTION_DIGITS) as string),
        sanitizeCsvValue(s.holdDuration),
        sanitizeCsvValue(closedAt.toLocaleString(dateLocale)),
      ];
    });
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRowId = useCallback((params: GetRowIdParams<ClosedSignal>) => params.data.id, []);

  // 즐겨찾기 별 칸(histFavorite)과 QR 칸은 차트 이동에서 제외한다 — 각자 자기
  // 토글/다이얼로그 동작이 있고, 종목(symbol) 칸을 포함한 나머지를 클릭하면 그
  // 사이클의 entry~exit 구간이 표시된 차트로 이동한다.
  const handleCellClicked = useCallback(
    (event: CellClickedEvent<ClosedSignal>) => {
      const colId = event.column.getColId();
      if (colId === 'histFavorite' || colId === 'histQr') return;
      if (event.data && onRowClick) onRowClick(event.data);
    },
    [onRowClick]
  );

  // Scroll position preserved: page change does NOT scroll
  const handlePageChange = useCallback(
    (page: number) => {
      onPageChange(Math.min(Math.max(1, page), effectiveTotalPages));
    },
    [effectiveTotalPages, onPageChange]
  );

  if (sourceSignals.length === 0 && !upgradeRequired) {
    return (
      <EmptyState
        icon={History}
        title={copy.history.emptyTitle}
        description={copy.history.emptyDescription}
        className={className}
      />
    );
  }

  const showHistoryBody = !signalFilterActive || historySectionOpen;

  return (
    <div className={cn('space-y-4', signalFilterActive && 'opacity-60', className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {signalFilterActive ? (
            <button
              type="button"
              className="flex max-w-full items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5 text-left transition-colors hover:bg-muted/40"
              onClick={() => setHistorySectionOpen((o) => !o)}
              aria-expanded={historySectionOpen}
              aria-label={copy.history.expandAria}
            >
              <h3 className="shrink-0 text-sm font-bold">{copy.history.title}</h3>
              <Badge variant="secondary" className="shrink-0 px-1.5 py-0 font-mono text-[11px]">
                {displayedTotalCount.toLocaleString()}
              </Badge>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                  historySectionOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold">{copy.history.title}</h3>
              <Badge variant="secondary" className="px-1.5 py-0 font-mono text-[11px]">
                {displayedTotalCount.toLocaleString()}
              </Badge>
            </div>
          )}
        </div>
      </div>
      {!signalFilterActive ? (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {copy.history.description}
        </p>
      ) : null}
      {signalFilterActive ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{copy.history.filterNote}</p>
      ) : null}

      {/* 독립 필터 바 (pulseStore와 무관) */}
      {showHistoryBody ? (
        <>
          <div className="flex flex-nowrap items-center justify-end gap-2 overflow-x-auto">
            <Select
              value={filter.direction || 'all'}
              onValueChange={(v) =>
                updateFilter('direction', v === 'all' ? '' : (v as HistoryFilter['direction']))
              }
            >
              <SelectTrigger className="h-8 w-[100px] text-sm">
                <SelectValue placeholder={copy.tableControls.direction} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{copy.history.all}</SelectItem>
                <SelectItem value="long">Long</SelectItem>
                <SelectItem value="short">Short</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                onClick={openDatePicker}
                className="signal-history-date-input h-8 w-[130px] text-sm"
                aria-label={copy.history.startDate}
              />
              <span className="text-xs text-muted-foreground">~</span>
              <Input
                type="date"
                value={filter.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                onClick={openDatePicker}
                className="signal-history-date-input h-8 w-[130px] text-sm"
                aria-label={copy.history.endDate}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 shrink-0 text-xs"
              onClick={() => {
                setFilter(defaultHistoryFilter('', externalDatePeriod, externalDateRange));
                setShowFavoritesOnly(false);
                onPageChange(1);
              }}
            >
              {copy.history.reset}
            </Button>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-2" onClick={() => {
              setHistorySort((current) => ({ by: 'time', dir: current.by === 'time' && current.dir === 'desc' ? 'asc' : 'desc' }));
              onPageChange(1);
            }}>
              <ArrowDownUp className="h-4 w-4" />
              {historySort.by !== 'time' || historySort.dir === 'desc' ? copy.history.sortNewestFirst : copy.history.sortOldestFirst}
            </Button>
            <Button variant="outline" size="sm" className="h-8 shrink-0 gap-2" onClick={handleExportCsv}>
              <Download className="h-4 w-4" />
              {copy.history.exportCsv}
            </Button>
          </div>

          {/* AG Grid Table — 종목 pinned, 나머지 열은 내용 기준 너비 + 가로 스크롤 */}
          <div
            className="signal-table ag-pulse-grid relative w-full max-w-full overflow-x-auto rounded-lg border border-border"
            style={{ width: '100%', minHeight: upgradeRequired ? 184 : undefined }}
          >
            <style>{`
          .signal-table.ag-pulse-grid .ag-cell { display: flex; align-items: center; }
          .signal-table.ag-pulse-grid .ag-cell-wrapper { min-width: 0; width: 100%; }
          .signal-table.ag-pulse-grid .ag-cell:not(.ag-right-aligned-cell):not(.pulse-col-symbol) { justify-content: center; }
          .signal-table.ag-pulse-grid .ag-cell.pulse-col-symbol { justify-content: flex-start; }
          .signal-table.ag-pulse-grid .ag-right-aligned-cell { justify-content: flex-end; }
          .signal-table.ag-pulse-grid .ag-cell.pulse-col-direction { justify-content: center; padding-inline: 6px; }
          .signal-table.ag-pulse-grid .ag-header-cell { display: flex; align-items: center; justify-content: center; }
          .signal-table.ag-pulse-grid .ag-header-cell .ag-header-cell-comp-wrapper,
          .signal-table.ag-pulse-grid .ag-header-cell .ag-header-cell-label { justify-content: center; width: 100%; }
          .signal-table.ag-pulse-grid .ag-header-cell-text { text-align: center; }
          .signal-history-date-input::-webkit-calendar-picker-indicator { opacity: 0; width: 0; margin: 0; }
        `}</style>
            <AgGridReact<ClosedSignal>
              ref={gridRef}
              theme={agDarkTheme}
              rowData={upgradeRequired ? [] : filteredSignals}
              columnDefs={columnDefs}
              defaultColDef={DEFAULT_COL_DEF}
              getRowId={getRowId}
              onCellClicked={onRowClick ? handleCellClicked : undefined}
              domLayout="autoHeight"
              headerHeight={36}
              rowHeight={40}
              suppressCellFocus
              animateRows={false}
              autoSizeStrategy={PULSE_HISTORY_AUTO_SIZE_STRATEGY}
              overlayNoRowsTemplate={upgradeRequired ? '<span></span>' : undefined}
              context={gridContext}
              onGridSizeChanged={(event) => event.api.sizeColumnsToFit()}
              suppressColumnVirtualisation
              rowClass={onRowClick ? 'cursor-pointer' : undefined}
            />
            {upgradeRequired ? (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex flex-col items-center justify-center px-4 text-center"
                style={{ top: 36 }}
              >
                <p className="text-sm font-semibold text-foreground">{copy.upgrade.title}</p>
                <p className="mt-2 max-w-sm text-xs font-normal text-muted-foreground">
                  {copy.upgrade.description}
                </p>
              </div>
            ) : null}
          </div>

          {/* 합계(Total) — 페이지네이션 전 필터된 전체 결과 기준 */}
          {!upgradeRequired && filteredAllSignals.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-md border border-border/60 bg-muted/10 px-3 py-2 text-sm">
              <span className="font-semibold text-muted-foreground">
                {copy.history.totalRowLabel}
              </span>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono">
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color:
                      historyTotals.pnlAmount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))',
                  }}
                >
                  {formatSignedDollarAmount(historyTotals.pnlAmount, {
                    positiveSign: true,
                    fractionDigits: HISTORY_PNL_FRACTION_DIGITS,
                  })}
                </span>
                <span
                  className="font-semibold tabular-nums"
                  style={{
                    color:
                      historyTotals.pnlPercent >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))',
                  }}
                >
                  {formatPercent(historyTotals.pnlPercent, HISTORY_PNL_FRACTION_DIGITS)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatDuration(historyTotals.holdSeconds)}
                </span>
              </div>
            </div>
          ) : null}

          {/* Pagination — no scroll on page change */}
          {effectiveTotalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    className={cn(safeCurrentPage === 1 && 'pointer-events-none opacity-50')}
                  />
                </PaginationItem>

                {pageNumbers.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${idx}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={safeCurrentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    className={cn(
                      safeCurrentPage === effectiveTotalPages && 'pointer-events-none opacity-50'
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : null}
    </div>
  );
}
