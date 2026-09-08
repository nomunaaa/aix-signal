'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { HistoryLoadMore } from '@/components/my/history/HistoryLoadMore';
import { HistorySymbolTabs, type SymbolTab } from '@/components/my/history/HistorySymbolTabs';
import { HistoryTable } from '@/components/my/history/HistoryTable';
import { useHistoryFiltersUrl } from '@/hooks/useHistoryFiltersUrl';
import { useBilingualText } from '@/hooks/useBilingualText';
import { assetLabel } from '@/lib/my/history-format';
import { exportHistoryCsv } from '@/lib/my/exportHistoryCsv';
import { fetchHistory } from '@/lib/my/fetch-history';
import type { Position } from '@/lib/my/types';

const PAGE_SIZE = 20;

/** 청산 시각 내림차순 — "최근 청산 순서대로 표시됩니다." */
function byClosedAtDesc(a: Position, b: Position): number {
  const ta = a.closedAt ? new Date(a.closedAt).getTime() : 0;
  const tb = b.closedAt ? new Date(b.closedAt).getTime() : 0;
  return tb - ta;
}

export function MyHistoryPanel() {
  const { tr } = useBilingualText();
  const [filters, setFilters] = useHistoryFiltersUrl();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [allRows, setAllRows] = useState<Position[]>([]);

  // 종목 탭의 건수를 정확히 세려면 심볼 필터 없이 전량을 받아 클라이언트에서 나눈다.
  useEffect(() => {
    let cancelled = false;
    fetchHistory({ ...filters, symbol: 'ALL' }, 'closed_at').then((data) => {
      if (!cancelled) setAllRows([...data.rows].sort(byClosedAtDesc));
    });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const tabs = useMemo<SymbolTab[]>(() => {
    const counts = new Map<string, number>();
    for (const row of allRows) counts.set(row.symbol, (counts.get(row.symbol) ?? 0) + 1);
    return [
      { value: 'ALL', label: tr('전체', 'All'), count: allRows.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([symbol, count]) => ({ value: symbol, label: assetLabel(symbol), count })),
    ];
  }, [allRows, tr]);

  const rows = useMemo(
    () => (filters.symbol === 'ALL' ? allRows : allRows.filter((r) => r.symbol === filters.symbol)),
    [allRows, filters.symbol]
  );

  const visibleRows = rows.slice(0, visibleCount);

  return (
    <div className="w-full min-w-0">
      <h1 className="mb-1 text-lg font-extrabold">{tr('거래 히스토리', 'Trade History')}</h1>
      <p className="mb-8 text-[12.5px] text-muted-foreground">
        {tr(
          '청산된 시그널 기록 · 최근 청산 순서대로 표시됩니다.',
          'Closed signal records · shown in recently closed order.'
        )}
      </p>

      <div className="mb-7 flex flex-wrap items-center gap-2">
        <HistorySymbolTabs
          tabs={tabs}
          active={filters.symbol}
          onSelect={(symbol) => {
            setFilters({ symbol });
            setVisibleCount(PAGE_SIZE);
          }}
        />
        {rows.length > 0 && (
          <button
            type="button"
            onClick={() => exportHistoryCsv(rows, filters.period)}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-border bg-muted/40 px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
      </div>

      {allRows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {tr('아직 청산 기록이 없습니다.', 'No closed history yet.')}
        </p>
      ) : (
        <>
          <HistoryTable rows={visibleRows} />
          {visibleCount < rows.length && (
            <HistoryLoadMore onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} />
          )}
        </>
      )}
    </div>
  );
}
