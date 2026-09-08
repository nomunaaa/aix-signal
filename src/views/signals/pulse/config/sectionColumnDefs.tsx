/**
 * Column definitions for each of the 5 Pulse section tables.
 * Each factory returns ColDef[] for AG Grid.
 * No "구간" column anywhere.
 */

import { useState, type ReactNode } from 'react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type {
  ClosedSignal,
  NonTrendType,
  StrategyId,
  SimulationInput,
  Signal,
  WaitingSignal,
  SignalCycleUiState,
  EntryTrendDirection,
} from '../types/pulse.types';
import type { OpenSignal } from '../utils/section';
import { CoinIcon } from '../components/CoinIcon';
import {
  formatPercent,
  formatElapsedTime,
  formatSymbolPair,
  formatTimestamp,
  formatRelativeAgo,
  formatElapsedFromIso,
  getFreshness,
  formatMinutesSince,
} from '../utils/formatters';
import { tradingCategoryColor } from '../utils/tradingCategoryVisuals';
import type { TradingCategory } from '@/lib/trading-category';
import {
  formatPrice as formatPriceBase,
  formatDollarAmount,
  formatPriceWithDollar,
  formatSignedDollarAmount,
  type FormatPriceOptions,
} from '@/lib/format-price';

/** Pulse AG Grid 셀: 한 줄 극소가(아래첨자 없음) */
function formatPriceUi(n: number, options?: FormatPriceOptions) {
  return formatPriceBase(n, { variant: 'tableCell', ...options });
}
import { getCellStyle, getDiscountHeatStyle, type CellScaleType } from '@/lib/color-scale';
import { getStreamConfidence } from '@/lib/mock/confidence-mock';
import {
  hasDiscountFeature as _hasDiscountFeature,
  hasLockedFeature as _hasLockedFeature,
} from '../utils/strategyEngine';
import { colors as _colors } from '@/design-tokens/colors';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Minus, Star } from 'lucide-react';
import { ConfidenceGradeDot, FreshnessGradeDot } from '@/components/icons/ConfidenceGradeDot';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNowMs } from '@/hooks/use-now-ms';
import { StreamConfidenceDetail } from '@/components/signals/stream-confidence-detail';
import { usePulseStore } from '../stores/pulseStore';
import {
  resolvePriceSeriesForPulse,
  PULSE_PRICE_FLOW_GRID,
  type PulsePriceSeriesSource,
} from '@/domain/pulse/priceSeries';
import { PULSE_CELL_CLASS, PULSE_GRID_COL, PULSE_OPEN_FIXED } from './pulseGridColumnLayout';
import { resolveOpenSignalCycleUiState } from '../utils/signalCycleUiState';
import { WaitingHoldMinutesRenderer, WaitingTrustGradeRenderer } from './waitingColumnRenderers';
import {
  WaitingSparklineRenderer,
  WaitingRecentSideRenderer,
  WaitingExpectedRemainRenderer,
  WaitingFiveWinRatePctRenderer,
  WaitingFivePnlIntegratedRenderer,
} from './waitingExtendedRenderers';
import { calculateOpenSignalPnl } from '../utils/historyPnl';
import { resolveSignalTrendModeFromEntryTrends } from '@/lib/signal-trend-mode';

// ─── Shared Row Types ────────────────────────────────────────────────

export interface OpenRowData {
  id: string;
  stream: 'pulse' | 'wave';
  symbol: string;
  tradingCategory?: TradingCategory;
  direction: 'long' | 'short';
  /** LIVE/WAIT — KPI·필터·모바일 카드 등 (AIX-85) */
  signalCycleUiState: SignalCycleUiState;
  entryPrice: number;
  currentPrice: number;
  pnlPercent: number;
  pnlAmount: number;
  elapsedSeconds: number;
  discountGainAmount?: number;
  discountGainPercent?: number;
  additionalSignal?: boolean;
  additionalEntryPrice?: number;
  additionalEntryTime?: string;
  partialSignal?: boolean;
  partialExitPrice?: number;
  lockedAmount?: number;
  lockedPercent?: number;
  partialExitTime?: string;
  nonTrendType?: NonTrendType;
  movedAt?: number;
  averageEntryPrice?: number; // 진입평단가
  avgPnlAmount?: number; // 평단수익액
  avgPnlPercent?: number; // 평단수익율
  discountRate?: number; // 할인적용율
  profitLossAmount?: number | null;
  volatility?: number; // 24h 등락률 % (비추세 변동성 구간)
  nonTrendEntryTime?: string; // 비추세 진입시간
  shortTrend?: 1 | -1 | 0; // 단기추세 (1=up, -1=down, 0=neutral)
  longTrend?: 1 | -1 | 0; // 장기추세
  /** 진입가 − 현재가 (할인 테이블) */
  entryTrendShort?: EntryTrendDirection;
  entryTrendLong?: EntryTrendDirection;
  discountUsd?: number;
  /** (진입가−현재가)/진입가×100 */
  discountPct?: number;
  /** 신선도 기준 시각 (section_time 우선) */
  signalCreatedAt?: string;
  /** DCA·분할청산 반영 평단 기준 % */
  reflectedPnlPercent?: number;
  /** DCA 진입가 — 발동 시에만 */
  additionalDcaUsd?: number | null;
  /** 분할청산 확보 이익 USD */
  sellProfitUsd?: number | null;
  high24h?: number;
  low24h?: number;
  additionalEntryPending?: boolean;
  partialExitPending?: boolean;
  event?: string; // 이벤트 (섹션 힌트 텍스트)
  confirmedDiscountPct?: number; // 확정할인율
  enteredAt?: string; // 진입시각 ISO (for "06-22 03:22" 포맷)
  /** 평균 사이클 대비 잔여 100–0 */
  cycleRemainingScore?: number;
  /** 24h 미니 차트용 시계열 (mock/API) */
  sparkline24h?: number[];
  /** `resolvePriceSeriesForPulse` 결과 — 렌더러 출처 고지 */
  sparklineSource?: PulsePriceSeriesSource;
  _raw: OpenSignal;
}

type HeatScaleType = CellScaleType | 'discount_loss';

/** 히트맵 배경 래퍼 — 대기중 PnL 등에서 재사용 */
export function HeatWrapCell({
  heatValue,
  scaleType,
  children,
  align = 'center',
}: {
  heatValue: number;
  scaleType: HeatScaleType;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
}) {
  const finite = Number.isFinite(heatValue) && heatValue !== 0;
  const { backgroundColor: bg, textClass: scaleTextClass } = finite
    ? scaleType === 'discount_loss'
      ? getDiscountHeatStyle(heatValue)
      : getCellStyle(heatValue, scaleType)
    : { backgroundColor: 'transparent', textClass: undefined };
  /** 배경 틴트가 있을 때는 대비용 기본 전경색; 없을 때만 스케일(중립) 텍스트 색 */
  const textClass = finite ? 'text-foreground' : (scaleTextClass ?? 'text-muted-foreground');
  const justify =
    align === 'end' ? 'justify-end' : align === 'start' ? 'justify-start' : 'justify-center';
  return (
    <div className={cn('relative flex h-full min-h-0 w-full items-center px-0', justify)}>
      {/* 셀 패딩(4px)까지 사각형으로 채움 — 테이블 가로 전체 틴트 */}
      <div
        className="pointer-events-none absolute inset-y-0 -left-[4px] -right-[4px] rounded-none"
        style={{ backgroundColor: bg }}
      />
      <div
        className={cn(
          'relative z-[1] flex min-w-0 items-center',
          align === 'end' && 'w-full justify-end',
          align === 'start' && 'w-full justify-start',
          align === 'center' && 'w-full justify-center',
          textClass
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Pulse 방향 옆: 단기·장기 추세 — 작은 캐럿(coolicons-style caret 대체) */
function PulseTrendCarets({
  shortTrend,
  longTrend,
}: {
  shortTrend: 1 | -1 | 0 | undefined;
  longTrend: 1 | -1 | 0 | undefined;
}) {
  const caret = (v: 1 | -1 | 0 | undefined, label: string) => {
    if (v === 1) {
      return (
        <span title={`${label} 상승`}>
          <ChevronUp
            className="h-2.5 w-2.5 shrink-0 text-emerald-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      );
    }
    if (v === -1) {
      return (
        <span title={`${label} 하락`}>
          <ChevronDown
            className="h-2.5 w-2.5 shrink-0 text-rose-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      );
    }
    return (
      <span title={`${label} 중립`}>
        <Minus
          className="h-2.5 w-2.5 shrink-0 text-muted-foreground/45"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    );
  };
  return (
    <span className="inline-flex items-center gap-px" aria-label="단기 추세, 장기 추세">
      {caret(shortTrend, '단기')}
      {caret(longTrend, '장기')}
    </span>
  );
}

function EntryTrendSnapshotCarets({
  shortTrend,
  longTrend,
}: {
  shortTrend?: EntryTrendDirection;
  longTrend?: EntryTrendDirection;
}) {
  const caret = (v: EntryTrendDirection | undefined, label: string) => {
    if (v === 'UP') {
      return (
        <span title={`${label} entry trend UP`}>
          <ChevronUp
            className="h-2.5 w-2.5 shrink-0 text-emerald-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      );
    }
    if (v === 'DOWN') {
      return (
        <span title={`${label} entry trend DOWN`}>
          <ChevronDown
            className="h-2.5 w-2.5 shrink-0 text-rose-400"
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
      );
    }
    return (
      <span title={`${label} entry trend NEUTRAL`}>
        <Minus
          className="h-2.5 w-2.5 shrink-0 text-muted-foreground/45"
          strokeWidth={2}
          aria-hidden
        />
      </span>
    );
  };

  return (
    <span
      className="inline-flex items-center gap-px"
      aria-label="Entry-time short trend, entry-time long trend"
    >
      {caret(shortTrend, 'Short')}
      {caret(longTrend, 'Long')}
    </span>
  );
}

function entryTrendSnapshotLabel(
  value: EntryTrendDirection | undefined,
  fallback = 'UNKNOWN'
): string {
  return value ?? fallback;
}

function volatilityBand(pct: number | undefined | null): '등락' | '횡보' | '보합' {
  if (pct == null || !Number.isFinite(pct)) return '횡보';
  if (pct > 5) return '등락';
  if (pct < 1) return '보합';
  return '횡보';
}

function mismatchLinePrefix(nt: NonTrendType | undefined): string {
  if (nt === 'short') return '단기 불일치';
  if (nt === 'long') return '장기 불일치';
  return '단기/장기 불일치';
}

export interface HistoryRowData {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  entryTrendShort?: EntryTrendDirection | null;
  entryTrendLong?: EntryTrendDirection | null;
  hasAdditionalBuy: boolean;
  hasPartialClose: boolean;
  entryPrice: number;
  averageEntryPrice?: number;
  additionalEntryPrice?: number;
  exitPrice: number;
  partialExitPrice?: number;
  partialAvgPrice?: number;
  pnlAmount: number;
  pnlPercent: number;
  enteredAt: string;
  additionalEntryTime?: string;
  holdDuration: string;
  closedAt: string;
  closedFromSection: string;
  _raw: ClosedSignal;
}

// ─── Shared Cell Renderers ───────────────────────────────────────────

export function SymbolWithIconRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const pairLabel = formatSymbolPair(data.symbol);
  const baseLabel = pairLabel.endsWith('/USDT') ? pairLabel.slice(0, -5) : pairLabel;
  const categoryColor = tradingCategoryColor(data.tradingCategory);
  return (
    <div className="flex w-full min-w-0 items-center justify-start gap-1">
      <CoinIcon symbol={data.symbol} size={16} className="shrink-0" />
      <span
        className="min-w-0 truncate whitespace-nowrap text-left font-mono text-sm font-semibold"
        title={pairLabel}
      >
        {baseLabel}
      </span>
      {categoryColor ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: categoryColor }}
          title={String(data.tradingCategory)}
          aria-label={String(data.tradingCategory)}
        />
      ) : null}
    </div>
  );
}

export function FavoriteStarRenderer(params: ICellRendererParams) {
  const favorites = usePulseStore((s) => s.favorites);
  const toggleFavorite = usePulseStore((s) => s.toggleFavorite);
  const data = params.data;
  if (!data) return null;
  const symbol = String(data.symbol ?? '')
    .trim()
    .toUpperCase();
  if (!symbol) return null;
  const isFav = favorites.has(symbol);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(symbol);
      }}
      className={cn(
        'flex h-full w-full items-center justify-center transition-colors',
        isFav ? 'text-yellow-400' : 'text-muted-foreground/40 hover:text-yellow-400/50'
      )}
      aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
    >
      <Star className={cn('h-3.5 w-3.5', isFav && 'fill-current')} aria-hidden />
    </button>
  );
}

export function AdditionalSignalTimeRenderer(params: ICellRendererParams) {
  const nowMs = useNowMs(60_000);
  const data = params.data;
  if (!data || !data.additionalEntryTime)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const time =
    typeof data.additionalEntryTime === 'string'
      ? new Date(data.additionalEntryTime)
      : data.additionalEntryTime;
  const diffMs = nowMs - time.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  const label = hours > 0 ? `${hours}시간 ${remainMin}분전` : `${minutes}분전`;
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>;
}

export function PartialSignalTimeRenderer(params: ICellRendererParams) {
  const nowMs = useNowMs(60_000);
  const data = params.data;
  if (!data || !data.partialSignal)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const raw = data.partialExitTime;
  if (!raw) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const time = typeof raw === 'string' ? new Date(raw) : raw;
  const diffMs = nowMs - time.getTime();
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  const label = hours > 0 ? `${hours}시간 ${remainMin}분전` : `${minutes}분전`;
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>;
}

export function DividerRenderer() {
  return (
    <span className="flex h-full items-center justify-center">
      <span className="h-4 w-px bg-border" />
    </span>
  );
}

export function DetailButtonRenderer(params: ICellRendererParams) {
  const nowMs = useNowMs(60_000);
  const data = params.data;
  if (!data) return null;
  const tableType = params.context?.tableType;
  const hasSignal = tableType === 'profit' ? data.partialSignal : data.additionalSignal;
  if (!hasSignal) return null;

  // Build tooltip lines (1-2 lines, max 3 numbers)
  const lines: { label: string; value: string }[] = [];
  if (tableType === 'profit') {
    if (data.partialExitTime) {
      const t =
        typeof data.partialExitTime === 'string'
          ? new Date(data.partialExitTime)
          : data.partialExitTime;
      const m = Math.floor((nowMs - t.getTime()) / 60000);
      const h = Math.floor(m / 60);
      lines.push({ label: '청산시간', value: h > 0 ? `${h}h ${m % 60}m전` : `${m}m전` });
    }
    if (data.lockedPercent != null)
      lines.push({ label: '확정수익', value: `${Number(data.lockedPercent).toFixed(2)}%` });
  } else {
    if (data.additionalEntryTime) {
      const t =
        typeof data.additionalEntryTime === 'string'
          ? new Date(data.additionalEntryTime)
          : data.additionalEntryTime;
      const m = Math.floor((nowMs - t.getTime()) / 60000);
      const h = Math.floor(m / 60);
      lines.push({ label: '추가진입', value: h > 0 ? `${h}h ${m % 60}m전` : `${m}m전` });
    }
    if (data.discountGainPercent != null)
      lines.push({ label: '확정할인', value: `${Number(data.discountGainPercent).toFixed(2)}%` });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex h-full w-full items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const event = new CustomEvent('pulse:detail-card', {
                  detail: { signal: data, tableType },
                });
                window.dispatchEvent(event);
              }}
              className="whitespace-nowrap rounded border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              자세히
            </button>
          </span>
        </TooltipTrigger>
        {lines.length > 0 && (
          <TooltipContent side="left" align="center" className="space-y-0.5 px-2.5 py-1.5 text-xs">
            {lines.map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="font-mono font-medium tabular-nums">{l.value}</span>
              </div>
            ))}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export function ConfirmedDiscountPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.additionalSignal) return null;
  const raw = Number(data.discountGainPercent ?? data.pnlPercent) || 0;
  const pct = Math.max(-9999.99, Math.min(9999.99, raw));
  const { textClass } = getCellStyle(pct, 'positive_good');
  return (
    <span
      className={cn('whitespace-nowrap font-mono text-sm font-semibold tabular-nums', textClass)}
    >
      {pct < 0 ? '-' : ''}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function ConfirmedProfitPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.partialSignal) return null;
  const raw = Number(data.lockedPercent ?? data.pnlPercent) || 0;
  const pct = Math.max(-9999.99, Math.min(9999.99, raw));
  const { textClass } = getCellStyle(pct, 'positive_good');
  return (
    <span
      className={cn('whitespace-nowrap font-mono text-sm font-semibold tabular-nums', textClass)}
    >
      {pct < 0 ? '-' : ''}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

function RealizedProfitAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.partialSignal) return null;
  const amount = Number(data.lockedAmount ?? data.pnlAmount) || 0;
  const { textClass } = getCellStyle(amount, 'positive_good');
  return (
    <span
      className={cn(
        'price-cell col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums',
        textClass
      )}
    >
      {amount < 0 ? '-' : ''}
      {formatDollarAmount(Math.abs(amount))}
    </span>
  );
}

export function DirectionRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const hasEntrySnapshotFields =
    params.context?.showEntryTrendSnapshot === true &&
    (Object.prototype.hasOwnProperty.call(data, 'entryTrendShort') ||
      Object.prototype.hasOwnProperty.call(data, 'entryTrendLong'));

  if (hasEntrySnapshotFields) {
    const entryShort = data.entryTrendShort as EntryTrendDirection | undefined;
    const entryLong = data.entryTrendLong as EntryTrendDirection | undefined;
    const dir = String(data.direction ?? '').toLowerCase();
    const isLong = dir === 'long';
    const dirLabel = isLong ? '롱' : '숏';
    const title = `${dirLabel} · Entry trend · Short ${entryTrendSnapshotLabel(entryShort)} · Long ${entryTrendSnapshotLabel(entryLong)}`;

    return (
      <span className="inline-flex items-center gap-1.5" title={title}>
        <span
          className={cn(
            'inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-semibold leading-none',
            isLong
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/25 bg-rose-500/10 text-rose-400'
          )}
        >
          {isLong ? (
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          )}
          <span className="sr-only">{dirLabel}</span>
        </span>
        <EntryTrendSnapshotCarets shortTrend={entryShort} longTrend={entryLong} />
      </span>
    );
  }

  const dir = String(data.direction ?? '').toLowerCase();
  const isLong = dir === 'long';
  const st = data.shortTrend as 1 | -1 | 0 | undefined;
  const lt = data.longTrend as 1 | -1 | 0 | undefined;
  const dirLabel = isLong ? '롱' : '숏';
  const stLabel = st === 1 ? '단기 상승' : st === -1 ? '단기 하락' : '단기 중립';
  const ltLabel = lt === 1 ? '장기 상승' : lt === -1 ? '장기 하락' : '장기 중립';
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${dirLabel} · ${stLabel} · ${ltLabel}`}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-semibold leading-none',
          isLong
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
            : 'border-rose-500/25 bg-rose-500/10 text-rose-400'
        )}
      >
        {isLong ? (
          <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <ArrowDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        )}
        <span className="sr-only">{dirLabel}</span>
      </span>
      <PulseTrendCarets shortTrend={st} longTrend={lt} />
    </span>
  );
}

export function PriceRenderer(params: ICellRendererParams) {
  const value = params.value as number | null | undefined;
  if (value === null || value === undefined) {
    return <span className="block w-full text-right text-muted-foreground">{'\u2014'}</span>;
  }
  const tip = formatPriceWithDollar(value, { variant: 'tableCell' });
  return (
    <span
      className="price-cell col-price block w-full whitespace-nowrap text-right font-mono text-sm tabular-nums"
      title={tip}
      aria-label={tip}
    >
      {formatPriceUi(value).jsx}
    </span>
  );
}

/** 현재가 — PnL%와 동일 `positive_good` 히트 스케일(배경); 틴트 시 글자는 기본색 */
export function CurrentPriceWithArrowRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const value = data.currentPrice as number | null | undefined;
  if (value === null || value === undefined) {
    return <span className="block w-full text-right text-muted-foreground">{'\u2014'}</span>;
  }
  const scaleValue = Number((data as OpenRowData).pnlPercent) || 0;
  return (
    <HeatWrapCell heatValue={scaleValue} scaleType="positive_good" align="end">
      <span className="price-cell col-price whitespace-nowrap text-right font-mono text-sm tabular-nums">
        {formatPriceUi(value).jsx}
      </span>
    </HeatWrapCell>
  );
}

/** PnL$ — ±9,999 clamp, 초과 시 `>`(양) / `<`(음) 접두어 — 실제 값이 표시 한도보다 크거나 더 손실 큼 */
export function PnlAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const d = data as { pnlAmount?: number; lastPnlAmount?: number };
  const raw = Number(d.pnlAmount ?? d.lastPnlAmount ?? 0);
  const AMOUNT_CLAMP = 9999.99;
  const clamped = Math.abs(raw) > AMOUNT_CLAMP;
  const amount = Math.max(-AMOUNT_CLAMP, Math.min(AMOUNT_CLAMP, raw));
  const clampPrefix = clamped ? (raw > 0 ? '>' : '<') : '';
  return (
    <HeatWrapCell heatValue={raw} scaleType="positive_good" align="end">
      <span
        className="price-cell col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
        title={
          clamped ? `실제: ${formatPriceWithDollar(raw, { variant: 'tableCell' })}` : undefined
        }
      >
        {clampPrefix}
        {amount < 0 ? '-' : ''}
        {formatDollarAmount(Math.abs(amount))}
      </span>
    </HeatWrapCell>
  );
}

/** PnL% — ±200% clamp, 초과 시 `>`(양) / `<`(음) 접두어. raw 값은 drawer에서 확인 */
export function PnlPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const d = data as { pnlPercent?: number; lastPnlPercent?: number };
  const raw = Number(d.pnlPercent ?? d.lastPnlPercent ?? 0);
  const PNL_CLAMP = 200;
  const clamped = Math.abs(raw) > PNL_CLAMP;
  const pnl = Math.max(-PNL_CLAMP, Math.min(PNL_CLAMP, raw));
  const clampPrefix = clamped ? (raw > 0 ? '>' : '<') : '';
  return (
    <HeatWrapCell heatValue={raw} scaleType="positive_good" align="center">
      <span
        className="col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
        title={clamped ? `실제: ${raw >= 0 ? '+' : ''}${raw.toFixed(2)}%` : undefined}
      >
        {clampPrefix}
        {pnl < 0 ? '-' : ''}
        {Math.abs(pnl).toFixed(2)}%
      </span>
    </HeatWrapCell>
  );
}

export function HeatDiscountUsdRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const v = Number(data.discountUsd);
  if (!Number.isFinite(v)) {
    return <span className="block w-full text-center text-zinc-500">{'\u2014'}</span>;
  }
  return (
    <HeatWrapCell heatValue={v} scaleType="discount_loss" align="end">
      <span className="price-cell col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
        {v < 0 ? '-' : ''}
        {formatDollarAmount(Math.abs(v))}
      </span>
    </HeatWrapCell>
  );
}

export function HeatDiscountPctRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const v = Number(data.discountPct);
  if (!Number.isFinite(v)) {
    return <span className="block w-full text-center text-zinc-500">{'\u2014'}</span>;
  }
  return (
    <HeatWrapCell heatValue={v} scaleType="discount_loss" align="center">
      <span className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
        {v < 0 ? '-' : ''}
        {Math.abs(v).toFixed(2)}%
      </span>
    </HeatWrapCell>
  );
}

export function ElapsedIsoRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data?.enteredAt) {
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  }
  return (
    <span className="whitespace-nowrap font-mono text-xs text-foreground">
      {formatElapsedFromIso(data.enteredAt)}
    </span>
  );
}

export function DiscountAdditionalSignalRenderer(params: ICellRendererParams) {
  useNowMs(60_000);
  const data = params.data;
  if (!data) return null;
  const rawSig = data._raw as Signal;
  const price = rawSig.additionalEntryPrice ?? data.additionalEntryPrice ?? data.averageEntryPrice;
  const iso = data.additionalEntryTime;
  if (data.additionalSignal && iso && price != null) {
    const tip = `${formatElapsedFromIso(iso)} ${formatPriceWithDollar(price)} 분할매수`;
    return (
      <span
        className="block w-full min-w-0 max-w-full truncate text-center text-xs text-foreground"
        title={tip}
      >
        <span className="text-emerald-400">{formatElapsedFromIso(iso)}</span>{' '}
        <span className="text-emerald-400">{formatPriceUi(price).jsx}</span>
        {' 분할매수'}
      </span>
    );
  }
  if (data.additionalEntryPending && price != null) {
    const tip = `⏳ ${formatPriceWithDollar(price)} 분할매수 대기`;
    return (
      <span
        className="block w-full min-w-0 max-w-full truncate text-center text-xs text-foreground"
        title={tip}
      >
        <span className="text-amber-400">⏳</span>{' '}
        <span className="text-amber-400">{formatPriceUi(price).jsx}</span>
        {' 분할매수 대기'}
      </span>
    );
  }
  if (data.additionalEntryPending) {
    return (
      <span
        className="block w-full whitespace-nowrap text-center text-xs text-foreground"
        title="⏳ 분할매수 대기"
      >
        <span className="text-amber-400">⏳</span>
        {' 분할매수 대기'}
      </span>
    );
  }
  return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
}

export function ProfitAdditionalSignalRenderer(params: ICellRendererParams) {
  useNowMs(60_000);
  const data = params.data;
  if (!data) return null;
  const price = data.partialExitPrice;
  const iso = data.partialExitTime;
  if (data.partialSignal && iso && price != null) {
    const tip = `${formatElapsedFromIso(iso)} ${formatPriceWithDollar(price)} 이익 실현`;
    return (
      <span
        className="block w-full min-w-0 max-w-full truncate text-center text-xs text-foreground"
        title={tip}
      >
        <span className="text-emerald-400">{formatElapsedFromIso(iso)}</span>{' '}
        <span className="text-emerald-400">{formatPriceUi(price).jsx}</span>
        {' 이익 실현'}
      </span>
    );
  }
  if (data.partialExitPending && price != null) {
    const tip = `⏳ ${formatPriceWithDollar(price)} 이익 실현 대기`;
    return (
      <span
        className="block w-full min-w-0 max-w-full truncate text-center text-xs text-foreground"
        title={tip}
      >
        <span className="text-amber-400">⏳</span>{' '}
        <span className="text-amber-400">{formatPriceUi(price).jsx}</span>
        {' 이익 실현 대기'}
      </span>
    );
  }
  if (data.partialExitPending) {
    return (
      <span
        className="block w-full whitespace-nowrap text-center text-xs text-foreground"
        title="⏳ 이익 실현 대기"
      >
        <span className="text-amber-400">⏳</span>
        {' 이익 실현 대기'}
      </span>
    );
  }
  return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
}

export function AdditionalDcaRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const v = data.additionalDcaUsd;
  if (v == null)
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  const heat = data.entryPrice ? (((v as number) - data.entryPrice) / data.entryPrice) * 100 : 0;
  return (
    <HeatWrapCell heatValue={heat} scaleType="positive_good" align="end">
      <span className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums">
        {formatPriceUi(v as number).jsx}
      </span>
    </HeatWrapCell>
  );
}

export function ReflectedPnlRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.reflectedPnlPercent === undefined) {
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  }
  const raw = Number(data.reflectedPnlPercent) || 0;
  return (
    <HeatWrapCell heatValue={raw} scaleType="positive_good" align="center">
      <span className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
        {raw < 0 ? '-' : ''}
        {Math.abs(raw).toFixed(2)}%
      </span>
    </HeatWrapCell>
  );
}

export function SellProfitRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const v = data.sellProfitUsd;
  if (v == null)
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  const raw = Number(v) || 0;
  return (
    <HeatWrapCell heatValue={raw} scaleType="positive_good" align="end">
      <span className="price-cell col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
        {raw < 0 ? '-' : ''}
        {formatDollarAmount(Math.abs(raw))}
      </span>
    </HeatWrapCell>
  );
}

export function FreshnessDotRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data?.signalCreatedAt)
    return <span className="block w-full text-center text-zinc-500">{'\u2014'}</span>;
  const { grade } = getFreshness(data.signalCreatedAt);
  const tip = formatMinutesSince(data.signalCreatedAt);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex h-full cursor-default items-center justify-center">
            <FreshnessGradeDot grade={grade} size="md" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** 신뢰도 셀 — 행 클릭과 분리(stopPropagation), 모바일은 Drawer·데스크톱은 Popover */
function StreamConfidenceInteractive({ stream }: { stream: 'pulse' | 'wave' }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const c = getStreamConfidence(stream);

  const triggerClass =
    'inline-flex min-w-0 max-w-full items-center justify-center gap-1 rounded-md px-0.5 py-1 font-mono text-xs tabular-nums text-foreground outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring';

  if (isMobile) {
    return (
      <div className="flex h-full w-full min-w-0 items-center justify-center">
        <button
          type="button"
          className={triggerClass}
          aria-expanded={open}
          aria-label="스트림 신뢰도 상세"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
        >
          <ConfidenceGradeDot grade={c.grade} />
          {c.score}
        </button>
        <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>스트림 신뢰도</DrawerTitle>
              <DrawerDescription>최근 승률·모멘텀·PnL 기준 스코어</DrawerDescription>
            </DrawerHeader>
            <div className="px-3 pb-4">
              <StreamConfidenceDetail
                stream={stream}
                className="border-0 bg-transparent shadow-none"
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 items-center justify-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={triggerClass}
            aria-expanded={open}
            aria-label="스트림 신뢰도 상세"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <ConfidenceGradeDot grade={c.grade} />
            {c.score}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="center"
          side="top"
          sideOffset={6}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <StreamConfidenceDetail stream={stream} className="border-0 bg-transparent shadow-none" />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function StreamConfidenceRenderer(params: ICellRendererParams) {
  const stream = (params.context?.signalStream as 'pulse' | 'wave' | undefined) ?? 'pulse';
  return <StreamConfidenceInteractive stream={stream} />;
}

export function SignalStreamRenderer(params: ICellRendererParams) {
  const data = params.data as Partial<OpenRowData> | undefined;
  const stream = data?.stream ?? (data?._raw?.barinterval === '10m' ? 'wave' : 'pulse');
  const label = stream === 'wave' ? 'Wave' : 'Pulse';
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center justify-center truncate text-xs font-semibold leading-none',
        stream === 'wave' ? 'text-sky-300' : 'text-primary'
      )}
      title={label}
    >
      {label}
    </span>
  );
}

export function ProfitLossAmountRenderer(params: ICellRendererParams) {
  const raw = (params.data as OpenRowData | undefined)?.profitLossAmount;
  if (raw === null || raw === undefined) {
    return <span className="block w-full text-right text-muted-foreground">{'\u2014'}</span>;
  }
  const value = Number(raw);
  if (Number.isNaN(value))
    return <span className="block w-full text-right text-muted-foreground">{'\u2014'}</span>;
  const zeroTone =
    (params.colDef?.cellRendererParams as { zeroTone?: 'profit' | 'loss' } | undefined)?.zeroTone ??
    'profit';
  const isPositiveTone = value > 0 || (value === 0 && zeroTone === 'profit');
  return (
    <span
      className={cn(
        'price-cell col-price block w-full whitespace-nowrap text-right font-mono text-sm font-semibold tabular-nums',
        isPositiveTone ? 'text-emerald-400' : 'text-rose-400'
      )}
      title={formatSignedDollarAmount(value, { positiveSign: true })}
    >
      {formatSignedDollarAmount(value, { positiveSign: true })}
    </span>
  );
}

export function NonTrendBandSignalRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data?.nonTrendType)
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  const band = volatilityBand(data.volatility);
  const prefix = mismatchLinePrefix(data.nonTrendType);
  const gran =
    data.nonTrendType === 'short' ? '단기' : data.nonTrendType === 'long' ? '장기' : '단기/장기';
  const restLabel = prefix.slice(gran.length);
  const bandCls =
    band === '등락'
      ? 'text-emerald-400'
      : band === '횡보'
        ? 'text-amber-400'
        : 'text-muted-foreground';
  return (
    <span
      className="block w-full min-w-0 max-w-full truncate text-center text-xs text-foreground"
      title={`${gran}${restLabel}-${band}`}
    >
      <span className="text-rose-400">{gran}</span>
      <span>{restLabel}</span>
      <span>{'-'}</span>
      <span className={bandCls}>{band}</span>
    </span>
  );
}

export function HeatHigh24Renderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data?.high24h)
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  const hi = data.high24h;
  const heat = data.currentPrice ? ((hi - data.currentPrice) / data.currentPrice) * 100 : 0;
  return (
    <HeatWrapCell heatValue={heat} scaleType="positive_good" align="center">
      <span className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums">
        {formatPriceUi(hi).jsx}
      </span>
    </HeatWrapCell>
  );
}

export function HeatLow24Renderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data?.low24h)
    return <span className="block w-full text-center text-muted-foreground">{'\u2014'}</span>;
  const lo = data.low24h;
  const heat = data.currentPrice ? ((data.currentPrice - lo) / data.currentPrice) * 100 : 0;
  return (
    <HeatWrapCell heatValue={heat} scaleType="positive_good" align="center">
      <span className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums">
        {formatPriceUi(lo).jsx}
      </span>
    </HeatWrapCell>
  );
}

/** 24h 미니 차트 뷰박스 — 열 너비(`PULSE_GRID_COL.sparkWidth`)에 맞춰 여백 내에서 스케일 */
const SPARK_VIEW_W = 80;
const SPARK_VIEW_H = 20;
const SPARK_STROKE = 1.75;
const SPARK_DOT_R = 2.75;
/** 마지막 점(반지름 ~2.75px) + 선이 뷰박스에 잘리지 않도록 */
const SPARK_PAD = 4;

function sparklinePathAndLast(
  values: number[],
  w: number,
  h: number
): { pathD: string; last: { x: number; y: number } | null } {
  if (!values.length) return { pathD: '', last: null };
  const pad = SPARK_PAD;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const coords = values.map((v, i) => ({
    x: pad + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW),
    y: pad + innerH - ((v - min) / span) * innerH,
  }));
  const last = coords[coords.length - 1] ?? null;
  if (n === 1) {
    return { pathD: '', last };
  }
  const pathD = coords
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
  return { pathD, last };
}

function sparklineSourceAria(source: PulsePriceSeriesSource | undefined): string {
  if (source === 'api') return '24h 차트: 최근 구간 가격 샘플, API 제공';
  if (source === 'synthetic') return '24h 차트: 참고용 합성 곡선, 실시간 차트와 다를 수 있음';
  return '24h 차트: 표시할 데이터 없음';
}

function sparklineSourceTitle(source: PulsePriceSeriesSource | undefined): string {
  if (source === 'api') return PULSE_PRICE_FLOW_GRID.headerTooltip;
  if (source === 'synthetic') {
    return '참고용 합성 24h 차트입니다. 실시간 OHLCV·체결가와 다를 수 있습니다.';
  }
  return 'API에 유효한 24h 샘플이 없고, 합성 표시가 꺼져 있어 비어 있습니다.';
}

/** 24h 미니 라인 차트 (축·격자 없음, 마지막 점만 마커, 툴팁은 hover 시만) */
export function Sparkline24hRenderer(params: ICellRendererParams) {
  const data = params.data;
  const series = data?.sparkline24h as number[] | undefined;
  const source = data?.sparklineSource as PulsePriceSeriesSource | undefined;
  const inferred: PulsePriceSeriesSource = source ?? (series?.length ? 'synthetic' : 'empty');
  const w = SPARK_VIEW_W;
  const h = SPARK_VIEW_H;

  if (!series?.length) {
    return (
      <span
        className="text-muted-foreground"
        data-series-source={inferred}
        aria-label={sparklineSourceAria(inferred)}
      >
        {'\u2014'}
      </span>
    );
  }

  const { pathD, last } = sparklinePathAndLast(series, w, h);
  const aria = sparklineSourceAria(inferred);
  const title = sparklineSourceTitle(inferred);
  const cycleRaw =
    data && 'cycleRemainingScore' in data ? (data as OpenRowData).cycleRemainingScore : undefined;
  const cycleN = cycleRaw != null ? Math.round(Number(cycleRaw)) : NaN;
  const cycleTip = Number.isFinite(cycleN) ? `\n사이클 잔여: ${cycleN} (0–100)` : '';
  const fullTip = `${title}${cycleTip}`;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <span
          className="inline-flex cursor-default items-center justify-center"
          data-series-source={inferred}
          aria-label={aria}
        >
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="shrink-0 text-foreground/85"
            aria-hidden
          >
            {pathD ? (
              <path
                d={pathD}
                fill="none"
                stroke="currentColor"
                strokeWidth={SPARK_STROKE}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
            {last ? <circle cx={last.x} cy={last.y} r={SPARK_DOT_R} fill="currentColor" /> : null}
          </svg>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] whitespace-pre-wrap text-xs">
        {fullTip}
      </TooltipContent>
    </Tooltip>
  );
}

/** 평균 사이클 대비 잔여 0–100 — 신뢰도와 동일하게 등급 점 + 숫자 */
export function CycleRemainingRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (data?.cycleRemainingScore === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const v = Math.round(Number(data.cycleRemainingScore));
  if (!Number.isFinite(v)) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const grade = v >= 70 ? 'high' : v >= 45 ? 'medium' : 'low';
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs tabular-nums text-foreground"
      title="평균 사이클 대비 잔여 점수 (0–100)"
    >
      <ConfidenceGradeDot grade={grade} />
      {v}
    </span>
  );
}

export function TimeRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const seconds = data.elapsedSeconds as number;
  if (!seconds || seconds <= 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {formatElapsedTime(seconds)}
    </span>
  );
}

export function DiscountAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.discountGainAmount)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const amount = Number(data.discountGainAmount) || 0;
  return (
    <span
      className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums"
      style={{ color: amount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {amount < 0 ? '-' : ''}
      {formatDollarAmount(Math.abs(amount))}
    </span>
  );
}

export function DiscountPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.discountGainPercent === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const pct = Number(data.discountGainPercent) || 0;
  return (
    <span
      className="whitespace-nowrap font-mono text-sm tabular-nums"
      style={{ color: pct >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {pct < 0 ? '-' : ''}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export function LockedAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.lockedAmount) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const amount = Number(data.lockedAmount) || 0;
  return (
    <span
      className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums"
      style={{ color: '#06B6D4' }}
    >
      +{formatDollarAmount(Math.abs(amount))}
    </span>
  );
}

export function LockedPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.lockedPercent === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const pct = Number(data.lockedPercent) || 0;
  return (
    <span className="whitespace-nowrap font-mono text-sm tabular-nums" style={{ color: '#06B6D4' }}>
      +{pct.toFixed(2)}%
    </span>
  );
}

function _NonTrendTypeRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.nonTrendType) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const label =
    data.nonTrendType === 'short' ? '단기' : data.nonTrendType === 'long' ? '장기' : '단기+장기';
  return <span className="whitespace-nowrap text-xs text-muted-foreground">{label}</span>;
}

function _CheckboxRenderer(params: ICellRendererParams) {
  const value = params.value as boolean;
  return (
    <div className="flex items-center justify-center">
      <div
        className={`h-4 w-4 rounded border ${
          value ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-transparent'
        } flex items-center justify-center`}
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

function _SectionBadgeRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.closedFromSection)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const section = data.closedFromSection as string;
  const labelMap: Record<string, string> = {
    TREND_DISCOUNT: '할인',
    TREND_TP: '수익',
    NON_TREND_SHORT: '비추세',
    NON_TREND_LONG: '비추세',
    REVERSAL: '역추세',
    NEW_SIGNAL: '신규',
    WAITING_ENTRY: '대기',
  };
  const label = labelMap[section] ?? section;
  return (
    <span className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

function _WinRateRenderer(params: ICellRendererParams) {
  const raw = params.value as number | undefined;
  if (raw === undefined) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const value = Number(raw) || 0;
  return (
    <span className="whitespace-nowrap font-mono text-sm tabular-nums">{value.toFixed(1)}%</span>
  );
}

function _ReturnRateRenderer(params: ICellRendererParams) {
  const raw = params.value as number | undefined;
  if (raw === undefined) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const value = Number(raw) || 0;
  return (
    <span
      className="whitespace-nowrap font-mono text-sm tabular-nums"
      style={{ color: value >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {value < 0 ? '-' : ''}
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

function _TimestampRenderer(params: ICellRendererParams) {
  const value = params.value as string | Date | undefined;
  if (!value) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const date = typeof value === 'string' ? new Date(value) : value;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  );
}

function _AdditionalSignalRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.additionalSignal)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap text-xs font-medium" style={{ color: '#F59E0B' }}>
      추가매수
    </span>
  );
}

function _PartialSignalRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.partialSignal)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap text-xs font-medium" style={{ color: '#06B6D4' }}>
      중간청산
    </span>
  );
}

function DiscountEntryAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || !data.additionalSignal) return null;
  const amount = Number(data.pnlAmount) || 0;
  return (
    <span
      className="price-cell col-price whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
      style={{ color: amount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {amount < 0 ? '-' : ''}
      {formatDollarAmount(Math.abs(amount))}
    </span>
  );
}

function _DiscountEntryPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const pnl = Number(data.pnlPercent) || 0;
  return (
    <span
      className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
      style={{ color: pnl >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {pnl < 0 ? '-' : ''}
      {Math.abs(pnl).toFixed(2)}%
    </span>
  );
}

export function AverageEntryPriceRenderer(params: ICellRendererParams) {
  const value = params.value as number | null | undefined;
  if (value === null || value === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="price-cell col-price whitespace-nowrap font-mono text-sm tabular-nums">
      {formatPriceUi(value).jsx}
    </span>
  );
}

function _AvgPnlAmountRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.avgPnlAmount === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const amount = data.avgPnlAmount as number;
  return (
    <span
      className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
      style={{ color: amount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {formatDollarAmount(amount)}
    </span>
  );
}

function _AvgPnlPercentRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.avgPnlPercent === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const pnl = data.avgPnlPercent as number;
  return (
    <span
      className="whitespace-nowrap font-mono text-sm font-semibold tabular-nums"
      style={{ color: pnl >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))' }}
    >
      {formatPercent(pnl)}
    </span>
  );
}

export function DiscountRateRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data || data.discountRate === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const rate = Number(data.discountRate) || 0;
  return (
    <span
      className={cn(
        'whitespace-nowrap font-mono text-sm tabular-nums',
        rate === 0 ? 'text-zinc-400' : 'text-rose-400'
      )}
    >
      {rate < 0 ? '-' : ''}
      {Math.abs(rate).toFixed(2)}%
    </span>
  );
}

export function VolatilityRenderer(params: ICellRendererParams) {
  const raw = params.value as number | null | undefined;
  if (raw === null || raw === undefined)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  const value = Number(raw) || 0;
  return (
    <span className="whitespace-nowrap font-mono text-sm tabular-nums">{value.toFixed(2)}</span>
  );
}

function _NonTrendEntryTimeRenderer(params: ICellRendererParams) {
  const value = params.value as string | Date | undefined;
  if (!value) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const date = typeof value === 'string' ? new Date(value) : value;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  );
}

// ─── Trend Renderers (for column registry) ──────────────────────────

export function ShortTrendRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const value = data.shortTrend as 1 | -1 | 0 | undefined;
  if (value === undefined || value === null)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  if (value === 0) return <span className="text-muted-foreground/50">{'\u2014'}</span>;
  const isUp = value === 1;
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded"
      style={{
        color: isUp ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))',
        backgroundColor: isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      }}
    >
      {isUp ? (
        <ChevronUp className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
    </span>
  );
}

export function LongTrendRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const value = data.longTrend as 1 | -1 | 0 | undefined;
  if (value === undefined || value === null)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  if (value === 0) return <span className="text-muted-foreground/50">{'\u2014'}</span>;
  const isUp = value === 1;
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded"
      style={{
        color: isUp ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))',
        backgroundColor: isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      }}
    >
      {isUp ? (
        <ChevronUp className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : (
        <ChevronDown className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
    </span>
  );
}

export function MovedAtRenderer(params: ICellRendererParams) {
  const nowMs = useNowMs(1_000);
  const data = params.data;
  if (!data) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const movedAt = data.movedAt as number | undefined;
  if (!movedAt || movedAt <= 0) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const seconds = (nowMs - movedAt) / 1000;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {formatElapsedTime(seconds)}
    </span>
  );
}

export function EventRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const event = data.event as string | undefined;
  if (!event) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {event}
    </span>
  );
}

// ─── New Renderers (v2 restructure) ──────────────────────────────────

/** 진입시간/청산시간: "06/22 03:22" 절대 타임스탬프 */
export function EntryTimestampRenderer(params: ICellRendererParams) {
  const value = params.value as string | Date | undefined;
  if (!value) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {formatTimestamp(value)}
    </span>
  );
}

/** 추가신호 아이콘 — additionalSignal 또는 partialSignal 기반 표시 */
export function AdditionalSignalIconRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const tableType = params.context?.tableType;
  const hasSignal = tableType === 'profit' ? data.partialSignal : data.additionalSignal;
  if (!hasSignal) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const color = tableType === 'profit' ? '#06B6D4' : '#F59E0B';
  return (
    <span className="flex h-full w-full items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

/** 추가진입시간: "11시간 30분전" 상대시간 */
export function RelativeTimeRenderer(params: ICellRendererParams) {
  const value = params.value as string | Date | undefined;
  if (!value) return <span className="text-muted-foreground">{'\u2014'}</span>;
  return (
    <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
      {formatRelativeAgo(value)}
    </span>
  );
}

/** 비추세 단기추세 — 방향 badge 스타일 + 불일치 시 빨간 배경 */
export function NonTrendShortTrendRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const value = data.shortTrend as 1 | -1 | 0 | undefined;
  if (value === undefined || value === null)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  if (value === 0) return <span className="text-muted-foreground/50">{'\u2014'}</span>;
  const dir = String(data.direction ?? '').toLowerCase();
  const isLong = dir === 'long';
  const isMismatch = (isLong && value === -1) || (!isLong && value === 1);
  const isUp = value === 1;
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center rounded-sm',
        isMismatch && 'bg-red-500/20'
      )}
    >
      <span title={isUp ? '단기 상승' : '단기 하락'}>
        {isUp ? (
          <ChevronUp className="h-3 w-3 text-emerald-400" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 text-rose-400" strokeWidth={2.5} aria-hidden />
        )}
      </span>
    </span>
  );
}

/** 비추세 장기추세 — 방향 badge 스타일 + 불일치 시 빨간 배경 */
export function NonTrendLongTrendRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const value = data.longTrend as 1 | -1 | 0 | undefined;
  if (value === undefined || value === null)
    return <span className="text-muted-foreground">{'\u2014'}</span>;
  if (value === 0) return <span className="text-muted-foreground/50">{'\u2014'}</span>;
  const dir = String(data.direction ?? '').toLowerCase();
  const isLong = dir === 'long';
  const isMismatch = (isLong && value === -1) || (!isLong && value === 1);
  const isUp = value === 1;
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center rounded-sm',
        isMismatch && 'bg-red-500/20'
      )}
    >
      <span title={isUp ? '장기 상승' : '장기 하락'}>
        {isUp ? (
          <ChevronUp className="h-3 w-3 text-emerald-400" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 text-rose-400" strokeWidth={2.5} aria-hidden />
        )}
      </span>
    </span>
  );
}

/** 대기중 시그널지표 (shortTrend + longTrend 인라인) */
function _WaitingTrendRenderer(params: ICellRendererParams) {
  const data = params.data;
  if (!data) return null;
  const st = data.shortTrend as 1 | -1 | 0 | undefined;
  const lt = data.longTrend as 1 | -1 | 0 | undefined;
  if (st == null && lt == null) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const renderBadge = (v: 1 | -1 | 0 | undefined) => {
    if (v == null || v === 0) return <span className="text-muted-foreground/50">{'\u2014'}</span>;
    const isUp = v === 1;
    return (
      <span className="h-4.5 w-4.5 inline-flex items-center justify-center rounded bg-muted/40">
        {isUp ? (
          <ChevronUp className="h-2.5 w-2.5 text-emerald-400" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronDown className="h-2.5 w-2.5 text-rose-400" strokeWidth={2.5} aria-hidden />
        )}
      </span>
    );
  };
  return (
    <span className="flex items-center gap-1">
      {renderBadge(st)}
      {renderBadge(lt)}
    </span>
  );
}

// ─── Table 2: 추세/할인진입 ──────────────────────────────────────────

export function getDiscountEntryColumns(_strategyId: StrategyId): ColDef<OpenRowData>[] {
  return [
    {
      field: 'id',
      headerName: '',
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
      maxWidth: PULSE_GRID_COL.symbolMax,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
    },
    {
      field: 'direction',
      headerName: '방향',
      minWidth: PULSE_GRID_COL.directionMin,
      maxWidth: PULSE_GRID_COL.directionMax,
      sortable: true,
      cellRenderer: DirectionRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
    },
    {
      field: 'additionalEntryTime',
      headerName: '추가신호',
      minWidth: PULSE_GRID_COL.additionalSignalMin,
      maxWidth: PULSE_GRID_COL.additionalSignalMax,
      sortable: true,
      cellRenderer: AdditionalSignalTimeRenderer,
    },
    {
      field: 'pnlAmount' as keyof OpenRowData,
      headerName: '할인진입($)',
      minWidth: 80,
      maxWidth: 104,
      type: 'rightAligned',
      sortable: true,
      cellRenderer: DiscountEntryAmountRenderer,
      cellClass: 'col-price',
      colId: 'discountEntryAmount',
    },
    {
      field: 'discountGainPercent',
      headerName: '확정할인(%)',
      minWidth: 56,
      maxWidth: 84,
      sortable: true,
      cellRenderer: ConfirmedDiscountPercentRenderer,
    },
    {
      field: 'id' as keyof OpenRowData,
      headerName: '',
      minWidth: 56,
      flex: 1,
      sortable: false,
      suppressAutoSize: true,
      cellRenderer: DetailButtonRenderer,
      colId: 'detailBtn',
    },
  ];
}

// ─── Table 3: 추세/수익실현 ──────────────────────────────────────────

export function getProfitTakingColumns(_strategyId: StrategyId): ColDef<OpenRowData>[] {
  return [
    {
      field: 'id',
      headerName: '',
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
      maxWidth: PULSE_GRID_COL.symbolMax,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
    },
    {
      field: 'direction',
      headerName: '방향',
      minWidth: PULSE_GRID_COL.directionMin,
      maxWidth: PULSE_GRID_COL.directionMax,
      sortable: true,
      cellRenderer: DirectionRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
    },
    {
      field: 'partialExitTime',
      headerName: '추가신호',
      minWidth: PULSE_GRID_COL.additionalSignalMin,
      maxWidth: PULSE_GRID_COL.additionalSignalMax,
      sortable: true,
      cellRenderer: PartialSignalTimeRenderer,
    },
    {
      field: 'lockedAmount',
      headerName: '실현수익($)',
      minWidth: 80,
      maxWidth: 104,
      type: 'rightAligned',
      sortable: true,
      cellRenderer: RealizedProfitAmountRenderer,
      cellClass: 'col-price',
    },
    {
      field: 'lockedPercent',
      headerName: '확정수익(%)',
      minWidth: 56,
      maxWidth: 84,
      sortable: true,
      cellRenderer: ConfirmedProfitPercentRenderer,
    },
    {
      field: 'id' as keyof OpenRowData,
      headerName: '',
      minWidth: 56,
      flex: 1,
      sortable: false,
      suppressAutoSize: true,
      cellRenderer: DetailButtonRenderer,
      colId: 'detailBtnProfit',
    },
  ];
}

export function getOpenSummaryColumns(
  options: {
    includeAdditionalEntry?: boolean;
    includeDiscountRate?: boolean;
    includePartialExit?: boolean;
    profitLossZeroTone?: 'profit' | 'loss';
  } = {}
): ColDef<OpenRowData>[] {
  const cols: ColDef<OpenRowData>[] = [
    {
      field: 'id',
      colId: 'favorite',
      headerName: '',
      pinned: 'left',
      width: PULSE_GRID_COL.favoriteWidth,
      sortable: false,
      cellRenderer: FavoriteStarRenderer,
      suppressSizeToFit: true,
      suppressAutoSize: true,
    },
    {
      field: 'symbol',
      headerName: '자산',
      pinned: 'left',
      width: 76,
      minWidth: 68,
      maxWidth: 88,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
      suppressAutoSize: true,
    },
    {
      field: 'stream',
      colId: 'stream',
      headerName: '시그널',
      width: 54,
      minWidth: 46,
      maxWidth: 68,
      sortable: true,
      cellRenderer: SignalStreamRenderer,
      suppressAutoSize: true,
    },
    {
      field: 'direction',
      headerName: '방향',
      width: PULSE_OPEN_FIXED.directionWidth,
      minWidth: PULSE_GRID_COL.directionMin,
      maxWidth: PULSE_GRID_COL.directionMax,
      sortable: true,
      cellRenderer: DirectionRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
      suppressAutoSize: true,
    },
    {
      field: 'entryPrice',
      headerName: '진입가',
      width: 92,
      minWidth: 82,
      maxWidth: 108,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: PriceRenderer,
      cellClass: 'col-price',
      suppressAutoSize: true,
    },
    {
      field: 'discountRate',
      colId: 'summaryDiscountRate',
      headerName: '할인율',
      width: 70,
      minWidth: 58,
      maxWidth: 84,
      sortable: true,
      cellRenderer: DiscountRateRenderer,
      suppressAutoSize: true,
    },
    {
      field: 'enteredAt',
      colId: 'summaryElapsed',
      headerName: '경과',
      width: PULSE_OPEN_FIXED.elapsed,
      minWidth: 56,
      maxWidth: 78,
      sortable: true,
      cellRenderer: ElapsedIsoRenderer,
      suppressAutoSize: true,
    },
    {
      field: 'pnlPercent',
      colId: 'summaryPnlPercent',
      headerName: '수익율',
      width: 78,
      minWidth: 64,
      maxWidth: 92,
      sortable: true,
      cellRenderer: PnlPercentRenderer,
      suppressAutoSize: true,
    },
    {
      field: 'profitLossAmount',
      colId: 'profitLossAmount',
      headerName: '평가손익($)',
      width: 104,
      minWidth: 88,
      maxWidth: 124,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: ProfitLossAmountRenderer,
      cellRendererParams: { zeroTone: options.profitLossZeroTone ?? 'profit' },
      cellClass: 'col-price',
      suppressAutoSize: true,
    },
  ];

  if (options.includeDiscountRate === false) {
    const discountRateIndex = cols.findIndex((col) => col.colId === 'summaryDiscountRate');
    if (discountRateIndex >= 0) cols.splice(discountRateIndex, 1);
  }

  if (options.includeAdditionalEntry) {
    cols.push(
      {
        field: 'additionalSignal',
        colId: 'summaryAdditionalSignal',
        headerName: '추가진입',
        minWidth: 104,
        maxWidth: 176,
        sortable: false,
        cellRenderer: DiscountAdditionalSignalRenderer,
        cellClass: PULSE_CELL_CLASS.additionalSignal,
        suppressAutoSize: true,
      },
      {
        field: 'additionalEntryPrice',
        colId: 'summaryAdditionalEntry',
        headerName: '추가진입가',
        width: 88,
        minWidth: 76,
        maxWidth: 104,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        suppressAutoSize: true,
      }
    );
  }

  if (options.includePartialExit) {
    cols.push(
      {
        field: 'partialSignal',
        colId: 'summaryPartialSignal',
        headerName: '분할매도',
        minWidth: 104,
        maxWidth: 176,
        sortable: false,
        cellRenderer: ProfitAdditionalSignalRenderer,
        cellClass: PULSE_CELL_CLASS.additionalSignal,
        suppressAutoSize: true,
      },
      {
        field: 'partialExitPrice',
        colId: 'summaryPartialExit',
        headerName: '분할가',
        width: 88,
        minWidth: 76,
        maxWidth: 104,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        suppressAutoSize: true,
      }
    );
  }

  return cols;
}

// ─── Table 4: 비추세 ────────────────────────────────────────────────
// 방향-24h-현재가-진입가-손익$-손익%-경과 (비추세 구분은 추가 그룹의 추가신호 컬럼에서 표시)

export function getNonTrendColumns(): ColDef<OpenRowData>[] {
  const currentChildren: ColDef<OpenRowData>[] = [
    {
      field: 'id',
      headerName: '',
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
      width: PULSE_OPEN_FIXED.symbolWidth,
      minWidth: PULSE_OPEN_FIXED.symbolWidth,
      maxWidth: PULSE_OPEN_FIXED.symbolWidth,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
      suppressAutoSize: true,
    },
    {
      field: 'direction',
      headerName: '방향',
      width: PULSE_OPEN_FIXED.directionWidth,
      minWidth: PULSE_OPEN_FIXED.directionWidth,
      maxWidth: PULSE_OPEN_FIXED.directionWidth,
      sortable: true,
      cellRenderer: DirectionRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
      suppressAutoSize: true,
    },
    {
      field: 'sparkline24h' as keyof OpenRowData,
      ...PULSE_PRICE_FLOW_GRID,
      width: PULSE_GRID_COL.sparkWidth,
      minWidth: PULSE_GRID_COL.sparkMin,
      maxWidth: PULSE_GRID_COL.sparkMax,
      sortable: false,
      suppressAutoSize: true,
      cellRenderer: Sparkline24hRenderer,
      colId: 'ntSpark',
      cellClass: PULSE_CELL_CLASS.spark,
    },
    {
      field: 'currentPrice',
      headerName: '현재가',
      width: PULSE_OPEN_FIXED.priceEntryCurrent,
      minWidth: PULSE_OPEN_FIXED.priceEntryCurrent,
      maxWidth: PULSE_OPEN_FIXED.priceEntryCurrent,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: CurrentPriceWithArrowRenderer,
      cellClass: 'col-price',
      suppressAutoSize: true,
    },
    {
      field: 'entryPrice',
      headerName: '진입가',
      width: PULSE_OPEN_FIXED.priceEntryCurrent,
      minWidth: PULSE_OPEN_FIXED.priceEntryCurrent,
      maxWidth: PULSE_OPEN_FIXED.priceEntryCurrent,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: PriceRenderer,
      cellClass: 'col-price',
      suppressAutoSize: true,
    },
    {
      field: 'pnlAmount',
      colId: 'ntPnlAmount',
      headerName: '수익($)',
      width: PULSE_OPEN_FIXED.metricMoney,
      minWidth: PULSE_OPEN_FIXED.metricMoney,
      maxWidth: PULSE_OPEN_FIXED.metricMoney,
      type: 'rightAligned',
      sortable: true,
      cellRenderer: PnlAmountRenderer,
      cellClass: 'col-price',
      cellRendererParams: { pulseHeatColId: 'ntPnlAmount' },
      suppressAutoSize: true,
    },
    {
      field: 'pnlPercent',
      colId: 'ntPnlPercent',
      headerName: '수익(%)',
      width: PULSE_OPEN_FIXED.metricPct,
      minWidth: PULSE_OPEN_FIXED.metricPct,
      maxWidth: PULSE_OPEN_FIXED.metricPct,
      sortable: true,
      cellRenderer: PnlPercentRenderer,
      cellRendererParams: { pulseHeatColId: 'ntPnlPercent' },
      suppressAutoSize: true,
    },
    {
      field: 'enteredAt' as keyof OpenRowData,
      headerName: '경과',
      width: PULSE_OPEN_FIXED.elapsed,
      minWidth: PULSE_OPEN_FIXED.elapsed,
      maxWidth: PULSE_OPEN_FIXED.elapsed,
      sortable: true,
      cellRenderer: ElapsedIsoRenderer,
      colId: 'ntElapsed',
      suppressAutoSize: true,
    },
    {
      field: 'signalCreatedAt' as keyof OpenRowData,
      headerName: '신선도',
      headerTooltip: '신호·갱신 시점 기준 신선도(도트 색)',
      width: PULSE_OPEN_FIXED.fresh,
      minWidth: PULSE_OPEN_FIXED.fresh,
      maxWidth: PULSE_OPEN_FIXED.fresh,
      sortable: false,
      suppressAutoSize: true,
      cellRenderer: FreshnessDotRenderer,
      colId: 'ntFresh',
    },
  ];
  const addChildren: ColDef<OpenRowData>[] = [
    {
      field: 'id' as keyof OpenRowData,
      headerName: '추가신호',
      minWidth: PULSE_GRID_COL.additionalSignalMin,
      maxWidth: PULSE_GRID_COL.additionalSignalMax,
      sortable: false,
      cellRenderer: NonTrendBandSignalRenderer,
      colId: 'ntBandSignal',
      cellClass: PULSE_CELL_CLASS.additionalSignal,
      suppressAutoSize: true,
    },
    {
      field: 'high24h' as keyof OpenRowData,
      headerName: '일별최고($)',
      width: PULSE_OPEN_FIXED.ntHigh24,
      minWidth: PULSE_OPEN_FIXED.ntHigh24,
      maxWidth: PULSE_OPEN_FIXED.ntHigh24,
      sortable: true,
      cellRenderer: HeatHigh24Renderer,
      cellClass: 'col-price',
      colId: 'ntHigh24',
      suppressAutoSize: true,
    },
    {
      field: 'low24h' as keyof OpenRowData,
      headerName: '일별최저($)',
      width: PULSE_OPEN_FIXED.ntLow24,
      minWidth: PULSE_OPEN_FIXED.ntLow24,
      maxWidth: PULSE_OPEN_FIXED.ntLow24,
      sortable: true,
      cellRenderer: HeatLow24Renderer,
      cellClass: 'col-price',
      colId: 'ntLow24',
      suppressAutoSize: true,
    },
  ];
  const ctxChildren: ColDef<OpenRowData>[] = [
    {
      field: 'id',
      headerName: '신뢰도',
      width: PULSE_OPEN_FIXED.confidence,
      minWidth: PULSE_OPEN_FIXED.confidence,
      maxWidth: PULSE_OPEN_FIXED.confidence,
      sortable: false,
      suppressAutoSize: true,
      cellRenderer: StreamConfidenceRenderer,
      colId: 'ntConf',
    },
  ];
  return [...currentChildren, ...addChildren, ...ctxChildren];
}

// ─── Table 5: 신호대기 ──────────────────────────────────────────────
// 라이브 3구간에 없는 심볼만 — 종목·방향·24h·예상대기·5전·신뢰도·최근가·시간

export function getWaitingColumns(): ColDef<WaitingSignal>[] {
  return [
    {
      field: 'id',
      headerName: '',
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
      maxWidth: PULSE_GRID_COL.symbolMax,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
    },
    {
      field: 'direction' as keyof WaitingSignal,
      headerName: '방향',
      pinned: 'left',
      minWidth: 72,
      maxWidth: 88,
      sortable: true,
      cellRenderer: WaitingRecentSideRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
      colId: 'waitRecentSide',
    },
    {
      headerName: '24h',
      colId: 'waitSpark',
      pinned: 'left',
      width: 108,
      minWidth: 100,
      maxWidth: 112,
      sortable: false,
      cellRenderer: WaitingSparklineRenderer,
      suppressAutoSize: true,
    },
    {
      headerName: '예상대기',
      minWidth: 88,
      maxWidth: 100,
      sortable: false,
      cellRenderer: WaitingExpectedRemainRenderer,
      colId: 'waitExpectedRemain',
    },
    {
      headerName: '5전승률',
      minWidth: 64,
      maxWidth: 80,
      sortable: false,
      cellRenderer: WaitingFiveWinRatePctRenderer,
      colId: 'waitFiveWinPct',
    },
    {
      headerName: '5전수익(통합)',
      minWidth: 88,
      maxWidth: 104,
      sortable: false,
      cellRenderer: WaitingFivePnlIntegratedRenderer,
      colId: 'waitFivePnlSum',
    },
    {
      field: 'trustGrade' as keyof WaitingSignal,
      headerName: '신뢰도',
      minWidth: 52,
      maxWidth: 64,
      sortable: true,
      cellRenderer: WaitingTrustGradeRenderer,
      colId: 'waitTrust',
    },
    {
      field: 'lastEntryPrice' as keyof WaitingSignal,
      headerName: '최근 진입가',
      minWidth: PULSE_GRID_COL.priceMin,
      maxWidth: PULSE_GRID_COL.priceMax,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: PriceRenderer,
      cellClass: 'col-price',
      colId: 'waitEntry',
    },
    {
      field: 'lastExitPrice' as keyof WaitingSignal,
      headerName: '최근 청산가',
      minWidth: PULSE_GRID_COL.priceMin,
      maxWidth: PULSE_GRID_COL.priceMax,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: PriceRenderer,
      cellClass: 'col-price',
      colId: 'waitLastExit',
    },
    {
      field: 'lastEntryTime' as keyof WaitingSignal,
      headerName: '진입시간',
      minWidth: 108,
      maxWidth: 140,
      sortable: true,
      cellRenderer: EntryTimestampRenderer,
      colId: 'waitEntryTime',
    },
    {
      field: 'lastHoldMinutes' as keyof WaitingSignal,
      headerName: '보유시간',
      minWidth: 72,
      maxWidth: 120,
      sortable: true,
      cellRenderer: WaitingHoldMinutesRenderer,
      colId: 'waitHold',
    },
    {
      field: 'lastCloseTime' as keyof WaitingSignal,
      headerName: '청산시간',
      minWidth: 108,
      flex: 1,
      sortable: true,
      cellRenderer: EntryTimestampRenderer,
      colId: 'waitCloseTime',
    },
  ];
}

// ─── Table 6: 히스토리 ──────────────────────────────────────────────
// 확장: 종목-방향-진입-추가진입-진입평단-청산-분할청산-분할평단-손익$-손익%-진입시간-추가시간-청산시간-보유시간

export function getHistoryColumns(rows?: HistoryRowData[]): ColDef<HistoryRowData>[] {
  const hasAddBuy = rows?.some((r) => r.hasAdditionalBuy) ?? false;
  const hasPartial = rows?.some((r) => r.hasPartialClose) ?? false;

  const cols: ColDef<HistoryRowData>[] = [
    {
      field: 'id',
      headerName: '',
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
      maxWidth: PULSE_GRID_COL.symbolMax,
      sortable: true,
      cellRenderer: SymbolWithIconRenderer,
      cellClass: PULSE_CELL_CLASS.symbol,
    },
    {
      field: 'direction',
      headerName: '방향',
      minWidth: PULSE_GRID_COL.directionMin,
      maxWidth: PULSE_GRID_COL.directionMax,
      sortable: true,
      cellRenderer: DirectionRenderer,
      cellClass: PULSE_CELL_CLASS.direction,
    },
    {
      field: 'entryPrice',
      headerName: '진입가',
      minWidth: PULSE_GRID_COL.priceMin,
      maxWidth: PULSE_GRID_COL.priceMax,
      sortable: true,
      type: 'rightAligned',
      cellRenderer: PriceRenderer,
      cellClass: 'col-price',
    },
  ];

  // 확장 컬럼 (추가매수 존재시)
  if (hasAddBuy) {
    cols.push(
      {
        field: 'additionalEntryPrice',
        headerName: '추가진입',
        minWidth: PULSE_GRID_COL.priceMin,
        maxWidth: PULSE_GRID_COL.priceMax,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        colId: 'histAddEntry',
      },
      {
        field: 'averageEntryPrice',
        headerName: '진입평단',
        minWidth: PULSE_GRID_COL.priceMin,
        maxWidth: PULSE_GRID_COL.priceMax,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        colId: 'histAvgEntry',
      }
    );
  }

  cols.push({
    field: 'exitPrice',
    headerName: '청산가',
    minWidth: PULSE_GRID_COL.priceMin,
    maxWidth: PULSE_GRID_COL.priceMax,
    sortable: true,
    type: 'rightAligned',
    cellRenderer: PriceRenderer,
    cellClass: 'col-price',
  });

  // 확장 컬럼 (분할청산 존재시)
  if (hasPartial) {
    cols.push(
      {
        field: 'partialExitPrice',
        headerName: '분할청산',
        minWidth: PULSE_GRID_COL.priceMin,
        maxWidth: PULSE_GRID_COL.priceMax,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        colId: 'histPartialExit',
      },
      {
        field: 'partialAvgPrice',
        headerName: '분할평단',
        minWidth: PULSE_GRID_COL.priceMin,
        maxWidth: PULSE_GRID_COL.priceMax,
        sortable: true,
        type: 'rightAligned',
        cellRenderer: PriceRenderer,
        cellClass: 'col-price',
        colId: 'histPartialAvg',
      }
    );
  }

  cols.push(
    {
      field: 'pnlAmount',
      headerName: '손익($)',
      minWidth: 68,
      maxWidth: 100,
      type: 'rightAligned',
      sortable: true,
      cellRenderer: PnlAmountRenderer,
      cellClass: 'col-price',
    },
    {
      field: 'pnlPercent',
      headerName: '손익(%)',
      minWidth: 54,
      maxWidth: 80,
      sortable: true,
      cellRenderer: PnlPercentRenderer,
    },
    {
      field: 'enteredAt',
      headerName: '진입시간',
      minWidth: 108,
      maxWidth: 148,
      sortable: true,
      cellRenderer: EntryTimestampRenderer,
      colId: 'histEntryTime',
    }
  );

  // 확장 컬럼 (추가진입 시간)
  if (hasAddBuy) {
    cols.push({
      field: 'additionalEntryTime',
      headerName: '추가시간',
      minWidth: 108,
      maxWidth: 200,
      sortable: true,
      cellRenderer: RelativeTimeRenderer,
      colId: 'histAddTime',
    });
  }

  cols.push(
    {
      field: 'closedAt',
      headerName: '청산시간',
      minWidth: 108,
      maxWidth: 148,
      sortable: true,
      cellRenderer: EntryTimestampRenderer,
      colId: 'histCloseTime',
    },
    { field: 'holdDuration', headerName: '보유시간', minWidth: 72, flex: 1, sortable: true }
  );

  return cols;
}

// ─── Row data builders ──────────────────────────────────────────────

function streamFromSignal(signal: OpenSignal): 'pulse' | 'wave' {
  return (signal as Signal).barinterval === '10m' ? 'wave' : 'pulse';
}

function calculateFavorableDiscountRate(signal: OpenSignal, currentPrice: number): number {
  if (
    !Number.isFinite(signal.entryPrice) ||
    signal.entryPrice <= 0 ||
    !Number.isFinite(currentPrice) ||
    currentPrice <= 0
  ) {
    return 0;
  }
  if (signal.direction === 'long' && currentPrice < signal.entryPrice) {
    return ((signal.entryPrice - currentPrice) / signal.entryPrice) * 100;
  }
  if (signal.direction === 'short' && currentPrice > signal.entryPrice) {
    return ((currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
  }
  return 0;
}

export function buildOpenRowData(
  signal: OpenSignal,
  simulationInput?: SimulationInput
): OpenRowData {
  const now = Date.now();
  const enteredAt = signal.enteredAt
    ? typeof signal.enteredAt === 'string'
      ? new Date(signal.enteredAt).getTime()
      : (signal.enteredAt as Date).getTime()
    : 0;
  // ── Sanity check: 가격 단위 이상치 탐지 ──
  const rawCurrent =
    'currentPrice' in signal
      ? (signal as OpenSignal & { currentPrice?: number | null }).currentPrice
      : undefined;
  const currentPrice =
    typeof rawCurrent === 'number' && Number.isFinite(rawCurrent) && rawCurrent > 0
      ? rawCurrent
      : signal.entryPrice;
  const signalForPnl = { ...signal, currentPrice };
  const pnlResult = calculateOpenSignalPnl(signalForPnl, simulationInput);
  const pnl = pnlResult.pnlPercent;
  const pnlAmount = pnlResult.pnlAmount;
  const discountedSignal = signal as OpenSignal & {
    discountGain?: number;
    discountRate?: number;
    additionalBuyCount?: number;
    averageEntryPrice?: number;
    additionalEntryTime?: string;
  };
  const lockedSignal = signal as OpenSignal & {
    lockedAmount?: number;
    lockedPercent?: number;
    lockedExitPrice?: number;
    partialExitTime?: string;
  };

  const sApi = signal as Signal;
  /** LONG: current − entry (≤0 = favorable discount heat). SHORT: entry − current. */
  const discountUsd =
    signal.direction === 'long'
      ? currentPrice - signal.entryPrice
      : signal.entryPrice - currentPrice;
  const discountPct = signal.entryPrice > 0 ? (discountUsd / signal.entryPrice) * 100 : 0;

  const liveShortTrend = sApi.shortTrend;
  const liveLongTrend = sApi.longTrend;
  const entryTrendShort = sApi.entryTrendShort;
  const entryTrendLong = sApi.entryTrendLong;
  const want: EntryTrendDirection = signal.direction === 'long' ? 'UP' : 'DOWN';
  const shortMismatch = entryTrendShort !== want;
  const longMismatch = entryTrendLong !== want;
  const trendMode = resolveSignalTrendModeFromEntryTrends({
    direction: signal.direction,
    shortTrend: entryTrendShort,
    longTrend: entryTrendLong,
  });
  let nonTrendType = sApi.nonTrendType;
  if (trendMode === 'nonTrend' && !nonTrendType && (shortMismatch || longMismatch)) {
    if (shortMismatch && longMismatch) nonTrendType = 'both';
    else if (shortMismatch) nonTrendType = 'short';
    else if (longMismatch) nonTrendType = 'long';
  }

  const signalCreatedAt =
    (typeof sApi.sectionTime === 'string' && sApi.sectionTime.length > 0
      ? sApi.sectionTime
      : undefined) ??
    (signal.enteredAt
      ? typeof signal.enteredAt === 'string'
        ? signal.enteredAt
        : (signal.enteredAt as Date).toISOString()
      : undefined);

  const averageEntryPrice =
    discountedSignal.averageEntryPrice && discountedSignal.averageEntryPrice > 0
      ? discountedSignal.averageEntryPrice
      : undefined;
  const hasAvg = averageEntryPrice !== undefined;
  const reflectedPnlPercent = pnl;

  const additionalEntryAction = sApi.actions?.find(
    (action) => action.action_type === 'additional_entry'
  );
  const partialExitAction = sApi.actions?.find((action) => action.action_type === 'partial_exit');
  const hasTriggeredAdditionalEntry =
    (sApi.additionalBuyCount ?? discountedSignal.additionalBuyCount ?? 0) > 0 ||
    additionalEntryAction?.status === 'triggered';
  const hasTriggeredPartialExit =
    (lockedSignal.lockedAmount ?? 0) > 0 || partialExitAction?.status === 'triggered';
  const hasAdditionalEntry = hasTriggeredAdditionalEntry || Boolean(additionalEntryAction);
  const hasPartialExit = hasTriggeredPartialExit || Boolean(partialExitAction);
  const addPx =
    sApi.additionalEntryPrice ?? additionalEntryAction?.price ?? discountedSignal.averageEntryPrice;
  const additionalDcaUsd = hasAdditionalEntry && addPx ? addPx : null;

  const sellTrig = (lockedSignal.lockedAmount ?? 0) > 0;
  const sellProfitUsd = sellTrig ? (lockedSignal.lockedAmount ?? null) : null;
  const favorableDiscountRate = calculateFavorableDiscountRate(signal, currentPrice);

  const vol24 =
    sApi.volatility24hPct ??
    (typeof (signal as OpenSignal & { volatility?: unknown }).volatility === 'number'
      ? ((signal as OpenSignal & { volatility?: number }).volatility as number)
      : undefined);

  const priceSeries = resolvePriceSeriesForPulse({
    apiSeries: sApi.sparkline24h,
    symbol: signal.symbol,
    anchorPrice: currentPrice,
  });
  const sparkline24h = priceSeries.points.length >= 2 ? priceSeries.points : undefined;
  const sparklineSource = priceSeries.source;

  const cycleRefMs = signalCreatedAt
    ? new Date(signalCreatedAt).getTime()
    : enteredAt > 0
      ? enteredAt
      : now;
  const elapsedCycleMs = Math.max(0, now - cycleRefMs);
  const avgCycleMin =
    typeof sApi.avgCycleTimeMinutes === 'number' && sApi.avgCycleTimeMinutes > 0
      ? sApi.avgCycleTimeMinutes
      : 120;
  const avgCycleMs = Math.max(60_000, avgCycleMin * 60_000);
  const cycleRemainingScore = Math.max(
    0,
    Math.round(100 * (1 - Math.min(1, elapsedCycleMs / avgCycleMs)))
  );

  return {
    id: signal.id,
    stream: streamFromSignal(signal),
    symbol: signal.symbol,
    tradingCategory: sApi.tradingCategory,
    direction: signal.direction,
    signalCycleUiState: resolveOpenSignalCycleUiState(signal),
    entryPrice: signal.entryPrice,
    currentPrice,
    pnlPercent: pnl,
    pnlAmount,
    elapsedSeconds: enteredAt ? (now - enteredAt) / 1000 : 0,
    discountGainAmount:
      discountedSignal.discountGain && discountedSignal.discountGain > 0
        ? discountedSignal.discountGain
        : undefined,
    discountGainPercent:
      discountedSignal.discountRate && discountedSignal.discountRate > 0
        ? discountedSignal.discountRate
        : undefined,
    additionalSignal: hasAdditionalEntry,
    additionalEntryPrice: addPx,
    additionalEntryTime:
      sApi.additionalEntryTime ??
      additionalEntryAction?.triggered_at ??
      discountedSignal.additionalEntryTime ??
      (hasTriggeredAdditionalEntry && enteredAt
        ? new Date(
            enteredAt +
              (sApi.additionalBuyCount ?? discountedSignal.additionalBuyCount ?? 1) * 18 * 60_000
          ).toISOString()
        : undefined),
    lockedAmount:
      lockedSignal.lockedAmount && lockedSignal.lockedAmount > 0
        ? lockedSignal.lockedAmount
        : undefined,
    lockedPercent:
      lockedSignal.lockedPercent && lockedSignal.lockedPercent > 0
        ? lockedSignal.lockedPercent
        : undefined,
    partialSignal: hasPartialExit,
    partialExitPrice:
      lockedSignal.lockedExitPrice ?? sApi.partialClosePrice ?? partialExitAction?.price,
    partialExitTime:
      sApi.partialExitTime ??
      partialExitAction?.triggered_at ??
      lockedSignal.partialExitTime ??
      (hasTriggeredPartialExit && enteredAt
        ? new Date(enteredAt + 35 * 60_000).toISOString()
        : undefined),
    nonTrendType,
    movedAt: signal.movedAt
      ? typeof signal.movedAt === 'string'
        ? new Date(signal.movedAt).getTime()
        : (signal.movedAt as Date).getTime()
      : enteredAt,
    averageEntryPrice: sApi.averageEntryPrice ?? averageEntryPrice,
    avgPnlAmount: hasAvg
      ? Math.round(
          ((((currentPrice - averageEntryPrice) / averageEntryPrice) * 100 * signal.entryPrice) /
            100) *
            100
        ) / 100
      : undefined,
    avgPnlPercent: hasAvg
      ? ((currentPrice - averageEntryPrice) / averageEntryPrice) * 100
      : undefined,
    discountRate: favorableDiscountRate,
    volatility: vol24,
    nonTrendEntryTime:
      (signal as OpenSignal & { nonTrendEntryTime?: string }).nonTrendEntryTime ?? undefined,
    shortTrend: liveShortTrend,
    longTrend: liveLongTrend,
    entryTrendShort,
    entryTrendLong,
    event: (signal as OpenSignal & { event?: string }).event ?? undefined,
    confirmedDiscountPct:
      (signal as OpenSignal & { confirmedDiscountPct?: number }).confirmedDiscountPct ?? undefined,
    enteredAt: signal.enteredAt
      ? typeof signal.enteredAt === 'string'
        ? signal.enteredAt
        : (signal.enteredAt as Date).toISOString()
      : undefined,
    discountUsd,
    discountPct,
    signalCreatedAt,
    reflectedPnlPercent,
    additionalDcaUsd,
    sellProfitUsd,
    high24h: sApi.high24h,
    low24h: sApi.low24h,
    additionalEntryPending:
      sApi.additionalEntryPending === true || additionalEntryAction?.status === 'pending',
    partialExitPending: sApi.partialExitPending === true || partialExitAction?.status === 'pending',
    sparkline24h,
    sparklineSource,
    cycleRemainingScore,
    _raw: signal,
  };
}

export function buildHistoryRowData(signal: ClosedSignal): HistoryRowData {
  const pnlAmount = Math.round(((signal.pnlPercent * signal.entryPrice) / 100) * 100) / 100;
  const enteredAt = signal.enteredAt
    ? typeof signal.enteredAt === 'string'
      ? signal.enteredAt
      : (signal.enteredAt as Date).toISOString()
    : typeof signal.closedAt === 'string'
      ? signal.closedAt
      : (signal.closedAt as Date).toISOString();

  return {
    id: signal.id,
    symbol: signal.symbol,
    direction: signal.direction,
    entryTrendShort: signal.entryTrendShort,
    entryTrendLong: signal.entryTrendLong,
    hasAdditionalBuy: signal.hasAdditionalBuy ?? signal.discountGain > 0,
    hasPartialClose: signal.hasPartialClose ?? signal.lockedAmount > 0,
    entryPrice: signal.entryPrice,
    averageEntryPrice: signal.averageEntryPrice,
    additionalEntryPrice: signal.additionalEntryPrice,
    exitPrice: signal.exitPrice,
    partialExitPrice: signal.partialExitPrice,
    partialAvgPrice: signal.partialAvgPrice,
    pnlAmount,
    pnlPercent: signal.pnlPercent,
    enteredAt,
    additionalEntryTime: signal.additionalEntryTime,
    holdDuration: signal.holdDuration,
    closedAt:
      typeof signal.closedAt === 'string'
        ? signal.closedAt
        : (signal.closedAt as Date).toISOString(),
    closedFromSection: signal.closedFromSection ?? '',
    _raw: signal,
  };
}
