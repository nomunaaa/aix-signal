'use client';

/**
 * /multichart — starts with 4 tiles (room for a real mock-trade sidebar,
 * matching /chart1m) and grows up to MAX_TILES via a "차트 추가" (+) tile,
 * shrinks via the × on each tile's header. The toolbar mirrors chart1m's
 * controls (Pulse/Wave interval, 구분 trend-mode checkboxes, 신호 category,
 * timeframe pills, Bollinger, Trend short/long) but applies them to every
 * tile at once.
 *
 * Mock trading happens on exactly one tile at a time — the "selected" one
 * (ring highlight, click any tile to select). Each tile still owns its own
 * useMockTrade internally (needed to draw its own entry/exit arrows), but
 * only reports its snapshot/actions up; the sidebar renders whichever tile
 * is currently selected using the same ChartSignalCard / SimulatorSettingsPanel
 * / MockTradeEntryPanel / MockTradePositionCard components /chart1m uses.
 *
 * Tiles are keyed by a stable id (not array index) precisely so add/remove
 * doesn't misalign the id-keyed mockSnapshots/mockActionsRef maps below —
 * removing tile #1 out of four must not make tile #2's data suddenly render
 * under #1's old slot.
 *
 * Mobile (<sm) collapses the whole control cluster behind one summary
 * button + bottom Sheet — the same pattern PulseActionControlsBar uses —
 * instead of letting ~10 differently-sized controls wrap into a ragged
 * pile. Inside the sheet every control is a full-width row or an even
 * grid, so the sizing stays uniform.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_SYMBOLS, VOLUME_TOP5_SYMBOLS } from '@/config/symbols';
import { ChartSymbolSelect } from '@/components/chart/chart-symbol-select';
import {
  MultiChartTile,
  MULTICHART_TF_KEYS,
  type MultichartTfKey,
  type MultiChartMockSnapshot,
  type MultiChartMockActions,
} from '@/components/multichart/MultiChartTile';
import { ChartSignalCard } from '@/components/chart-workspace/ChartSignalCard';
import { SimulatorSettingsPanel } from '@/components/chart-workspace/SimulatorSettingsPanel';
import { MockTradeEntryPanel } from '@/components/chart-workspace/MockTradeEntryPanel';
import { MockTradePositionCard } from '@/components/chart-workspace/MockTradePositionCard';
import { MockTradeHelp } from '@/components/chart-workspace/MockTradeHelp';
import { MockPositionsTable } from '@/components/chart-workspace/MockPositionsTable';
import { useSharedSimulationInput } from '@/hooks/useSharedSimulationInput';
import { useMockTradePositions } from '@/hooks/useMockTradePositions';
import { useOtherPositionPrices } from '@/hooks/useOtherPositionPrices';
import { useAuth } from '@/contexts/AuthContext';
import { mockMarginFromPct } from '@/lib/mockTradeCapital';
import { closeMyPosition } from '@/lib/my/close-position';
import { toast } from '@/hooks/use-toast';
import type { ChartTradingCategoryFilter, ChartTrendMode } from '@/views/Multiplecharts/types';
import { StreamSelector } from '@/views/signals/pulse/components/StreamSelector';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { trendModeFilterFromOptions } from '@/views/signals/pulse/utils/streamSelector';

const DEFAULT_SYMBOLS = VOLUME_TOP5_SYMBOLS.slice(0, 4);

/** 타일마다 useBinanceChart(자체 WS 연결) + useMockTrade 인스턴스가 하나씩 붙는다 —
 * 무제한으로 늘리면 연결/구독 비용이 커지므로 상한을 둔다. 원래 6개 그리드였던
 * 이력과 맞춰 6을 상한으로 잡는다. */
const MAX_TILES = 6;
const MIN_TILES = 1;

interface TileConfig {
  id: number;
  symbol: string;
}

const STREAMS = [
  { label: 'Pulse (1m)', value: '1m' },
  { label: 'Wave (10m)', value: '10m' },
] as const;

const ALL_TRADING_CATEGORY: ChartTradingCategoryFilter = 'ALL';

const INDICATORS = [
  { key: 'short', label: 'Trend short' },
  { key: 'long', label: 'Trend long' },
  { key: 'bollinger', label: 'Bollinger' },
] as const;

export default function MultiChartGrid() {
  const [tiles, setTiles] = useState<TileConfig[]>(() =>
    DEFAULT_SYMBOLS.map((symbol, id) => ({ id, symbol }))
  );
  const nextTileIdRef = useRef(DEFAULT_SYMBOLS.length);
  const [barInterval, setBarInterval] = useState<string>('1m');
  const [timeframe, setTimeframe] = useState<MultichartTfKey>('6H');
  const [showTrendShort, setShowTrendShort] = useState(true);
  const [showTrendLong, setShowTrendLong] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Signal Board/Proof/History와 같은 pulseStore 선택을 공유한다 — 여기서만 쓰던
  // 고정 'E2X2 · 역추세' 배지 대신, 다른 화면과 똑같은 P1~W3 선택 결과를 그대로 쓴다.
  const streamOptionFilter = usePulseStore((s) => s.streamOptionFilter);
  const trendModesFilter = useMemo<ChartTrendMode[]>(() => {
    const filter = trendModeFilterFromOptions(streamOptionFilter);
    return (Object.entries(filter) as [ChartTrendMode, boolean][])
      .filter(([, enabled]) => enabled)
      .map(([mode]) => mode);
  }, [streamOptionFilter]);

  const [selectedId, setSelectedId] = useState(0);
  // id로 키를 잡는다 — 배열 index를 쓰면 타일을 하나 지웠을 때 뒤쪽 타일들의
  // index가 전부 밀리면서 스냅샷/액션이 엉뚱한 타일 것으로 뒤바뀐다.
  const [mockSnapshots, setMockSnapshots] = useState<Record<number, MultiChartMockSnapshot>>({});
  const mockActionsRef = useRef<Record<number, MultiChartMockActions>>({});
  const [simulationInput] = useSharedSimulationInput();

  const setSymbolFor = (id: number, symbol: string) => {
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, symbol } : t)));
  };

  const addTile = () => {
    if (tiles.length >= MAX_TILES) return;
    const used = new Set(tiles.map((t) => t.symbol));
    const nextSymbol = ALL_SYMBOLS.find((s) => !used.has(s)) ?? ALL_SYMBOLS[0];
    const id = nextTileIdRef.current++;
    setTiles((prev) => [...prev, { id, symbol: nextSymbol }]);
    setSelectedId(id);
  };

  const removeTile = (id: number) => {
    if (tiles.length <= MIN_TILES) return;
    const remaining = tiles.filter((t) => t.id !== id);
    setTiles(remaining);
    setMockSnapshots((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    delete mockActionsRef.current[id];
    setSelectedId((prevSelected) => (prevSelected === id ? remaining[0].id : prevSelected));
  };

  const indicatorValue = (key: (typeof INDICATORS)[number]['key']) =>
    key === 'short' ? showTrendShort : key === 'long' ? showTrendLong : showBollinger;

  const setIndicator = (key: (typeof INDICATORS)[number]['key'], on: boolean) => {
    if (key === 'short') setShowTrendShort(on);
    else if (key === 'long') setShowTrendLong(on);
    else setShowBollinger(on);
  };

  const streamLabel = barInterval === '1m' ? 'Pulse' : 'Wave';

  const handleMockStateChange = useCallback((id: number, snapshot: MultiChartMockSnapshot) => {
    setMockSnapshots((prev) => ({ ...prev, [id]: snapshot }));
  }, []);

  const registerMockActionsFor = useCallback(
    (id: number) => (actions: MultiChartMockActions) => {
      mockActionsRef.current[id] = actions;
    },
    []
  );

  const selectedSnapshot = mockSnapshots[selectedId];
  const selectedActions = mockActionsRef.current[selectedId];
  const selectedInPosition =
    !!selectedSnapshot &&
    selectedSnapshot.mockOpen &&
    selectedSnapshot.mockPhase === 'exit' &&
    !selectedSnapshot.mockExitLocked;

  // 진입/종료 포지션 목록은 특정 타일이 아니라 로그인 사용자 전체 기준(다른 페이지에서
  // 연 포지션 포함) — 타일 mock 상태가 바뀔 때마다(진입/청산/추가진입) 다시 불러온다.
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const mockRefreshKey = useMemo(
    () =>
      tiles
        .map((t) => {
          const s = mockSnapshots[t.id];
          return `${t.id}:${s?.mockOpen}:${s?.mockPhase}:${s?.mockExitLocked}:${s?.remainingPct}`;
        })
        .join('|'),
    [tiles, mockSnapshots]
  );
  const mockPositions = useMockTradePositions(isAuthenticated, mockRefreshKey);

  // 열려 있는 타일과 같은 종목이면 그 타일의 실시간가를 그대로 쓰고, 타일로 안 열려
  // 있는 종목만 별도로 시세를 폴링한다(/chart1m의 otherPositionSymbols와 동일한 패턴).
  const tileLivePriceBySymbol = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tile of tiles) {
      const snap = mockSnapshots[tile.id];
      if (snap?.lastPrice != null) map[tile.symbol.trim().toUpperCase()] = snap.lastPrice;
    }
    return map;
  }, [tiles, mockSnapshots]);
  const otherPositionSymbols = useMemo(
    () =>
      Array.from(new Set(mockPositions.open.map((p) => p.symbol.trim().toUpperCase()))).filter(
        (symbol) => !(symbol in tileLivePriceBySymbol)
      ),
    [mockPositions.open, tileLivePriceBySymbol]
  );
  const otherLivePrices = useOtherPositionPrices(otherPositionSymbols);
  const livePriceMap = useMemo(
    () => ({ ...otherLivePrices, ...tileLivePriceBySymbol }),
    [otherLivePrices, tileLivePriceBySymbol]
  );

  const [closingAllMock, setClosingAllMock] = useState(false);
  const handleCloseAllMockPositions = async () => {
    if (closingAllMock || mockPositions.open.length === 0) return;
    setClosingAllMock(true);
    try {
      await Promise.all(
        mockPositions.open.map((p) =>
          closeMyPosition(p.id, livePriceMap[p.symbol.trim().toUpperCase()] ?? p.entryPrice)
        )
      );
      await mockPositions.reload();
      toast({ description: '전체종목 청산 완료' });
    } finally {
      setClosingAllMock(false);
    }
  };

  const handleMockPositionSymbolClick = (symbol: string) => {
    const match = tiles.find(
      (t) => t.symbol.trim().toUpperCase() === symbol.trim().toUpperCase()
    );
    if (match) setSelectedId(match.id);
  };

  /** 공통 컨트롤 — 데스크톱 인라인과 모바일 시트가 같은 소스를 쓴다. */
  const streamSelect = (
    <Select value={barInterval} onValueChange={setBarInterval}>
      <SelectTrigger className="h-8 w-[92px] shrink-0 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STREAMS.map((s) => (
          <SelectItem key={s.value} value={s.value} className="text-xs">
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col">
      <div className="flex items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 sm:flex-wrap">
        <h1 className="shrink-0 text-sm font-semibold text-foreground">멀티차트</h1>

        <StreamSelector className="hidden shrink-0 !min-h-0 !gap-1 !p-0 sm:flex" />

        {/* 모바일: 요약 한 줄 + 시트 */}
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="ml-auto flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/35 sm:hidden"
          aria-haspopup="dialog"
          aria-label={`필터: ${streamLabel}, ${timeframe}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate">
            {streamLabel} · {timeframe}
          </span>
        </button>

        {/* 데스크톱: 인라인 컨트롤 — Pulse/Wave는 이제 타일마다 종목 검색 옆에 있다. */}
        <div className="hidden items-center gap-1 rounded-md border border-border bg-card/50 p-0.5 sm:flex">
          {MULTICHART_TF_KEYS.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`h-6 rounded px-2 text-xs font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-3 text-xs sm:flex">
          {INDICATORS.map((ind) => (
            <label key={ind.key} className="flex cursor-pointer items-center gap-1 text-foreground">
              <input
                type="checkbox"
                checked={indicatorValue(ind.key)}
                onChange={(e) => setIndicator(ind.key, e.target.checked)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {ind.label}
            </label>
          ))}
        </div>
      </div>

      {/* 모바일 시트 — 모든 행이 전체폭이거나 균등 그리드라 크기가 들쭉날쭉하지 않다. */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-foreground">필터</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">기간</p>
              <div className="grid grid-cols-4 gap-2">
                {MULTICHART_TF_KEYS.map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`h-10 rounded-md border text-xs font-medium transition-colors ${
                      timeframe === tf
                        ? 'border-primary/50 bg-primary/10 text-foreground'
                        : 'border-border bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">신호</p>
              <StreamSelector className="!min-h-0 !gap-1.5 !p-0" />
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">지표</p>
              <div className="grid grid-cols-3 gap-2">
                {INDICATORS.map((ind) => {
                  const on = indicatorValue(ind.key);
                  return (
                    <button
                      key={ind.key}
                      type="button"
                      onClick={() => setIndicator(ind.key, !on)}
                      className={`h-10 rounded-md border px-1 text-[11px] font-medium transition-colors ${
                        on
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {ind.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 타일 + 모의매매 사이드바 — /chart1m의 ChartWorkspaceShell과 같은
          반응형 패턴: 모바일은 세로로 쌓고, lg 이상에서만 좌우로 나눈다. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="flex h-[360px] flex-col rounded-lg border border-border bg-card p-2"
            >
              <div className="flex shrink-0 items-center gap-1.5">
                <ChartSymbolSelect
                  symbols={ALL_SYMBOLS}
                  value={tile.symbol}
                  onValueChange={(v) => setSymbolFor(tile.id, v)}
                  className="w-full flex-1"
                />
                {streamSelect}
                {tiles.length > MIN_TILES ? (
                  <button
                    type="button"
                    onClick={() => removeTile(tile.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    aria-label={`${tile.symbol} 차트 닫기`}
                    title="차트 닫기"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
              <div className="mt-2 min-h-0 flex-1">
                <MultiChartTile
                  symbol={tile.symbol}
                  barInterval={barInterval}
                  timeframe={timeframe}
                  showTrendShort={showTrendShort}
                  showTrendLong={showTrendLong}
                  showBollinger={showBollinger}
                  tradingCategoryFilter={ALL_TRADING_CATEGORY}
                  trendModesFilter={trendModesFilter}
                  selected={tile.id === selectedId}
                  onSelect={() => setSelectedId(tile.id)}
                  onMockStateChange={(snapshot) => handleMockStateChange(tile.id, snapshot)}
                  registerMockActions={registerMockActionsFor(tile.id)}
                />
              </div>
            </div>
          ))}

          {tiles.length < MAX_TILES ? (
            <button
              type="button"
              onClick={addTile}
              className="flex h-[360px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/20 hover:text-foreground"
              aria-label="차트 추가"
            >
              <Plus className="h-8 w-8" aria-hidden />
              <span className="text-sm font-medium">차트 추가</span>
            </button>
          ) : null}
        </div>

        <aside className="flex w-full flex-none flex-col gap-3 border-t border-border bg-card/40 p-3.5 lg:w-[340px] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <div className="text-xs font-bold tracking-wide text-muted-foreground">
            선택된 차트: {tiles.find((t) => t.id === selectedId)?.symbol ?? '-'}
          </div>

          {selectedSnapshot ? (
            <>
              <ChartSignalCard
                symbol={selectedSnapshot.symbol}
                barInterval={barInterval}
                direction={selectedSnapshot.latestSignal.direction}
                entryPrice={selectedSnapshot.latestSignal.price}
                confidencePct={selectedSnapshot.latestSignal.confidence}
              />

              <SimulatorSettingsPanel />

              <div className="mt-1 text-xs font-bold tracking-wide text-muted-foreground">
                모의매매
              </div>

              {selectedInPosition ? (
                <MockTradePositionCard
                  symbol={selectedSnapshot.symbol}
                  direction={selectedSnapshot.mockDirection}
                  entryPrice={selectedSnapshot.mockEntryPrice}
                  exitReferencePrice={selectedSnapshot.mockExitReferencePrice}
                  profitPct={selectedSnapshot.mockProfitPct}
                  remainingPct={selectedSnapshot.remainingPct}
                  realizedPnlUsd={selectedSnapshot.realizedPnlUsd}
                  exitLocked={selectedSnapshot.mockExitLocked}
                  saving={selectedSnapshot.mockSaving}
                  lastPrice={selectedSnapshot.lastPrice}
                  onAddEntry={() => selectedActions?.addEntry()}
                  onPartialClose={(pct) => selectedActions?.partialClose(pct)}
                  onCloseAll={() => selectedActions?.closeAll()}
                />
              ) : (
                <MockTradeEntryPanel
                  symbol={selectedSnapshot.symbol}
                  lastPrice={selectedSnapshot.lastPrice}
                  pct={simulationInput.capitalRatio}
                  leverage={simulationInput.leverage}
                  onEnter={(direction) =>
                    selectedActions?.enter(
                      direction,
                      mockMarginFromPct(simulationInput.capitalRatio),
                      simulationInput.leverage
                    )
                  }
                  disabled={
                    !selectedSnapshot.isAuthenticated ||
                    selectedSnapshot.mockSaving ||
                    !selectedSnapshot.lastPrice
                  }
                  disabledReason={
                    !selectedSnapshot.isAuthenticated
                      ? '로그인 후 모의매매를 시작할 수 있습니다.'
                      : undefined
                  }
                />
              )}

              <MockPositionsTable
                title="진입 중인 모의매매 포지션"
                hint="청산 시 아래 종료 내역에 순차 기록됩니다."
                rows={mockPositions.open}
                emptyLabel="진입 중인 포지션이 없습니다."
                livePrices={livePriceMap}
                onSymbolClick={handleMockPositionSymbolClick}
                activeSymbol={selectedSnapshot.symbol}
                onCloseAll={handleCloseAllMockPositions}
                closingAll={closingAllMock}
              />
              <MockPositionsTable
                title="종료된 모의매매 포지션"
                hint="최근 종료 순으로 기록됩니다."
                rows={mockPositions.closed}
                emptyLabel="종료된 포지션이 없습니다."
                onSymbolClick={handleMockPositionSymbolClick}
              />

              <MockTradeHelp />
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
