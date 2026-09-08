/**
 * PulseSectionTable — reusable AG Grid wrapper for each section table.
 * Desktop: auto-sized columns, row height 밀도(일반 = SIGNAL_TABLE_ROW_HEIGHT_NORMAL_PX / 컴팩트 36px); 좁은 뷰 44px.
 * Under 1024px: same table with AG Grid pinned ☆ + 종목 (32 + 종목 최소너비), horizontal scroll,
 * scroll-edge hint, pinned-column shadow; section header는 한 줄 요약(제목·개수·부제 truncate).
 */

import { useCallback, useRef, useMemo, useEffect, type CSSProperties } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeAlpine,
  colorSchemeDark,
  type ColDef,
  type ColGroupDef,
  type GetRowIdParams,
} from 'ag-grid-community';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ActiveColumnBadges, type ActiveBadge } from './ActiveColumnBadges';
import { PULSE_AUTO_SIZE_STRATEGY } from '../config/pulseAgGridOptions';
import type { SignalStreamId } from '../types/pulse.types';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ChevronRight } from 'lucide-react';
import { adaptPulseColumnDefsForNarrow, type PulseAdaptColItem } from '../utils/adaptPulseColumnDefsNarrow';
import { compactPulseColumnDefsForSplit } from '../utils/compactPulseColumnDefsForSplit';
import { usePulseStore } from '../stores/pulseStore';
import { SIGNAL_TABLE_ROW_HEIGHT_NORMAL_PX } from '@/lib/signalTableRowMetrics';
import { usePulseCopy } from '../utils/pulseTranslations';

ModuleRegistry.registerModules([AllCommunityModule]);

function columnDefsHaveGroups<T>(defs: PulseAdaptColItem<T>[]): boolean {
  return defs.some((c) => 'children' in c && Array.isArray((c as ColGroupDef<T>).children));
}

const agDarkTheme = themeAlpine.withPart(colorSchemeDark).withParams({
  backgroundColor: 'transparent',
  headerBackgroundColor: 'rgba(255,255,255,0.055)',
  /* 호버 틴트는 index.css 의 .ag-pulse-grid 규칙으로 통일 (이중 하이라이트 방지) */
  rowHoverColor: 'transparent',
  borderColor: 'hsl(var(--border))',
  foregroundColor: 'hsl(var(--foreground))',
  oddRowBackgroundColor: 'transparent',
});

const DEFAULT_COL_DEF: ColDef = {
  sortable: true,
  filter: false,
  resizable: false,
  suppressMovable: true,
};

const NARROW_MQ = '(max-width: 1023px)';

export interface PulseSectionTableProps<T extends { id: string }> {
  readonly title: string;
  readonly subtitle?: string;
  readonly rowData: T[];
  readonly columnDefs: PulseAdaptColItem<T>[];
  readonly onRowClick?: (data: T) => void;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly className?: string;
  readonly count?: number;
  readonly tableType?: string;
  readonly signalStream?: SignalStreamId;
  readonly tableKind?: 'discount' | 'profit' | 'nonTrend';
  readonly activeBadges?: ActiveBadge[];
  /** 지정 시 domLayout="normal" + 고정 높이로 전환해 AG Grid 자체 행 가상화를 사용한다 (긴 목록용). 미지정 시 기존 autoHeight(페이지와 함께 스크롤) 유지. */
  readonly maxBodyHeightPx?: number;
  readonly stretchToParentHeight?: boolean;
  readonly compactColumnWidths?: boolean;
  /** Paid-plan gate: keep table chrome/headers visible and show the lock copy in the table body. */
  readonly upgradeRequired?: boolean;
}

export function PulseSectionTable<T extends { id: string }>({
  title,
  subtitle,
  rowData,
  columnDefs,
  onRowClick,
  emptyTitle,
  emptyDescription,
  className,
  count,
  tableType,
  signalStream,
  tableKind,
  activeBadges,
  maxBodyHeightPx,
  stretchToParentHeight = false,
  compactColumnWidths = false,
  upgradeRequired = false,
}: PulseSectionTableProps<T>) {
  const { language, copy } = usePulseCopy();
  const gridRef = useRef<AgGridReact<T>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gridHostRef = useRef<HTMLDivElement>(null);
  const displayCount = count ?? rowData.length;
  const isNarrow = useMediaQuery(NARROW_MQ);
  const columnDensity = usePulseStore((s) => s.columnDensity);
  const rowHeightPx = isNarrow
    ? 44
    : columnDensity === 'compact'
      ? 36
      : SIGNAL_TABLE_ROW_HEIGHT_NORMAL_PX;

  const displayColumnDefs = useMemo(() => {
    if (isNarrow) return adaptPulseColumnDefsForNarrow(columnDefs);
    if (compactColumnWidths) return compactPulseColumnDefsForSplit(columnDefs);
    return columnDefs;
  }, [columnDefs, compactColumnWidths, isNarrow]);

  const hasColumnGroups = useMemo(() => columnDefsHaveGroups(columnDefs), [columnDefs]);
  const usesNormalLayout = Boolean(maxBodyHeightPx || stretchToParentHeight);
  const headerHeightPx = hasColumnGroups ? 54 : 32;
  const stretchBodyMinHeightPx = stretchToParentHeight
    ? maxBodyHeightPx ?? Math.max(180, headerHeightPx + rowData.length * rowHeightPx + 10)
    : undefined;
  const tableMinHeightPx = upgradeRequired
    ? Math.max(stretchBodyMinHeightPx ?? 0, headerHeightPx + 148)
    : stretchBodyMinHeightPx;
  const tableWrapperStyle: CSSProperties | undefined = tableMinHeightPx
    ? { minHeight: tableMinHeightPx }
    : undefined;
  const resolvedEmptyTitle = emptyTitle ?? (language === 'ko' ? '해당 구간 시그널 없음' : 'No signals in this section');
  const resolvedEmptyDescription = emptyDescription ?? (language === 'ko' ? '조건에 맞는 시그널이 없습니다.' : 'No signals match the current conditions.');

  const getRowId = useCallback((params: GetRowIdParams<T>) => params.data.id, []);

  const handleRowClicked = useCallback(
    (event: { data: T | undefined; event?: Event | null }) => {
      const target = event.event?.target as HTMLElement | undefined;
      if (target?.closest('button')) return;
      if (event.data && onRowClick) {
        onRowClick(event.data);
      }
    },
    [onRowClick],
  );

  const memoizedDefaultColDef = useMemo(() => DEFAULT_COL_DEF, []);
  const context = useMemo(
    () => ({ tableType, signalStream, tableKind }),
    [tableType, signalStream, tableKind],
  );

  const syncScrollEndClass = useCallback(() => {
    const wrap = wrapperRef.current;
    const host = gridHostRef.current;
    if (!wrap || !host) return;
    const sc = host.querySelector('.ag-body-horizontal-scroll-viewport') as HTMLElement | null;
    if (!sc) {
      wrap.classList.add('pulse-signal-scroll-at-end');
      return;
    }
    if (sc.scrollWidth <= sc.clientWidth + 4) {
      wrap.classList.add('pulse-signal-scroll-at-end');
      return;
    }
    const atEnd = sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4;
    wrap.classList.toggle('pulse-signal-scroll-at-end', atEnd);
  }, []);

  useEffect(() => {
    if (!isNarrow || rowData.length === 0) {
      wrapperRef.current?.classList.add('pulse-signal-scroll-at-end');
      return;
    }

    let cleaned = false;
    let disposer: (() => void) | undefined;
    const tryAttach = (): boolean => {
      const host = gridHostRef.current;
      const sc = host?.querySelector('.ag-body-horizontal-scroll-viewport') as HTMLElement | null;
      if (!sc) return false;
      const onScroll = () => syncScrollEndClass();
      sc.addEventListener('scroll', onScroll, { passive: true });
      const ro = new ResizeObserver(onScroll);
      ro.observe(sc);
      onScroll();
      disposer = () => {
        sc.removeEventListener('scroll', onScroll);
        ro.disconnect();
      };
      return true;
    };

    const id = window.setInterval(() => {
      if (cleaned) return;
      if (tryAttach()) {
        window.clearInterval(id);
      }
    }, 48);
    const timeout = window.setTimeout(() => window.clearInterval(id), 4000);

    return () => {
      cleaned = true;
      window.clearInterval(id);
      window.clearTimeout(timeout);
      disposer?.();
    };
  }, [isNarrow, rowData.length, displayColumnDefs, syncScrollEndClass]);

  return (
    <div
      className={cn(
        stretchToParentHeight ? 'flex h-full min-h-0 flex-col gap-1.5' : 'space-y-1.5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1 border-b border-border py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-bold text-foreground">{title}</h3>
          <Badge variant="secondary" className="shrink-0 font-mono text-[11px] px-1.5 py-0">
            {displayCount}
          </Badge>
        </div>

        {subtitle ? (
          <p className="min-w-0 truncate text-[10px] leading-snug text-muted-foreground sm:text-xs">
            {subtitle}
          </p>
        ) : null}

        {activeBadges && activeBadges.length > 0 ? (
          <ActiveColumnBadges badges={activeBadges} gridRef={gridRef as React.RefObject<AgGridReact | null>} />
        ) : null}
      </div>

      {rowData.length === 0 && !upgradeRequired ? (
        <EmptyState
          title={resolvedEmptyTitle}
          description={resolvedEmptyDescription}
          className={cn(
            'rounded-lg border border-border bg-card py-8',
            stretchToParentHeight && 'min-h-[180px] flex-1',
          )}
        />
      ) : (
        <div
          ref={wrapperRef}
          className={cn(
            'signal-table group pulse-signal-table-wrapper relative w-full max-w-full rounded-lg border border-border bg-card',
            'pulse-signal-scroll-at-end',
            stretchToParentHeight && 'flex flex-1 flex-col overflow-hidden',
          )}
          style={tableWrapperStyle}
        >
          <div
            ref={gridHostRef}
            className={cn(
              'ag-pulse-grid pulse-signal-grid-host w-full min-w-0',
              isNarrow && 'pulse-signal-grid-host--narrow',
              compactColumnWidths && !isNarrow && 'pulse-signal-grid-host--split',
              stretchToParentHeight && 'h-full min-h-0 flex-1',
            )}
            style={maxBodyHeightPx && !stretchToParentHeight ? { height: maxBodyHeightPx } : undefined}
          >
            <AgGridReact<T>
              ref={gridRef}
              theme={agDarkTheme}
              rowData={upgradeRequired ? [] : rowData}
              columnDefs={displayColumnDefs}
              defaultColDef={memoizedDefaultColDef}
              getRowId={getRowId}
              domLayout={usesNormalLayout ? 'normal' : 'autoHeight'}
              onRowClicked={handleRowClicked}
              rowClass="cursor-pointer"
              groupHeaderHeight={hasColumnGroups ? 24 : undefined}
              headerHeight={hasColumnGroups ? 30 : 32}
              rowHeight={rowHeightPx}
              suppressCellFocus
              suppressRowHoverHighlight={false}
              animateRows={false}
              context={context}
              autoSizeStrategy={compactColumnWidths && !isNarrow ? undefined : PULSE_AUTO_SIZE_STRATEGY}
              overlayNoRowsTemplate={upgradeRequired ? '<span></span>' : undefined}
              suppressColumnVirtualisation
              onGridSizeChanged={() => queueMicrotask(() => syncScrollEndClass())}
              onFirstDataRendered={() => queueMicrotask(() => syncScrollEndClass())}
              onModelUpdated={() => queueMicrotask(() => syncScrollEndClass())}
            />
          </div>
          {upgradeRequired ? (
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[6] flex flex-col items-center justify-center px-4 text-center"
              style={{ top: headerHeightPx }}
            >
              <p className="text-sm font-semibold text-foreground">{copy.upgrade.title}</p>
              <p className="mt-2 max-w-sm text-xs font-normal text-muted-foreground">
                {copy.upgrade.description}
              </p>
            </div>
          ) : null}
          {isNarrow ? (
            <ChevronRight
              className="pointer-events-none absolute right-1 top-1/2 z-[7] h-4 w-4 -translate-y-1/2 text-muted-foreground/45 transition-opacity duration-200 max-lg:block lg:hidden group-[.pulse-signal-scroll-at-end]:opacity-0"
              aria-hidden
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
