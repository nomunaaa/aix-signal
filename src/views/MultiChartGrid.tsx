'use client';

/**
 * /multichart — 4 tiles (was 6; trimmed to make room for a real mock-trade
 * sidebar, matching /chart1m). The toolbar mirrors chart1m's controls
 * (Pulse/Wave interval, 구분 trend-mode checkboxes, 신호 category, timeframe
 * pills, Bollinger, Trend short/long) but applies them to all 4 tiles at once.
 *
 * Mock trading happens on exactly one tile at a time — the "selected" one
 * (ring highlight, click any tile to select). Each tile still owns its own
 * useMockTrade internally (needed to draw its own entry/exit arrows), but
 * only reports its snapshot/actions up; the sidebar renders whichever tile
 * is currently selected using the same ChartSignalCard / SimulatorSettingsPanel
 * / MockTradeEntryPanel / MockTradePositionCard components /chart1m uses.
 *
 * Mobile (<sm) collapses the whole control cluster behind one summary
 * button + bottom Sheet — the same pattern PulseActionControlsBar uses —
 * instead of letting ~10 differently-sized controls wrap into a ragged
 * pile. Inside the sheet every control is a full-width row or an even
 * grid, so the sizing stays uniform.
 */

import { useCallback, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ALL_SYMBOLS, VOLUME_TOP5_SYMBOLS } from '@/config/symbols';
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
import { useSharedSimulationInput } from '@/hooks/useSharedSimulationInput';
import { mockMarginFromPct } from '@/lib/mockTradeCapital';
import type { ChartTradingCategoryFilter, ChartTrendMode } from '@/views/Multiplecharts/types';

const DEFAULT_SYMBOLS = VOLUME_TOP5_SYMBOLS.slice(0, 4);

const STREAMS = [
  { label: 'Pulse (1m)', value: '1m' },
  { label: 'Wave (10m)', value: '10m' },
] as const;

const CATEGORIES: ChartTradingCategoryFilter[] = ['ALL', 'E1X1', 'E1X2', 'E2X1', 'E2X2'];

const TREND_MODES: { key: ChartTrendMode; label: string }[] = [
  { key: 'trend', label: '추세' },
  { key: 'nonTrend', label: '비추세' },
  { key: 'reversal', label: '역추세' },
];

const INDICATORS = [
  { key: 'short', label: 'Trend short' },
  { key: 'long', label: 'Trend long' },
  { key: 'bollinger', label: 'Bollinger' },
] as const;

export default function MultiChartGrid() {
  const [symbols, setSymbols] = useState<string[]>(DEFAULT_SYMBOLS);
  const [barInterval, setBarInterval] = useState<string>('1m');
  const [timeframe, setTimeframe] = useState<MultichartTfKey>('6H');
  const [showTrendShort, setShowTrendShort] = useState(true);
  const [showTrendLong, setShowTrendLong] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [category, setCategory] = useState<ChartTradingCategoryFilter>('ALL');
  const [trendModes, setTrendModes] = useState<ChartTrendMode[]>([
    'trend',
    'nonTrend',
    'reversal',
  ]);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mockSnapshots, setMockSnapshots] = useState<Record<number, MultiChartMockSnapshot>>({});
  const mockActionsRef = useRef<Record<number, MultiChartMockActions>>({});
  const [simulationInput] = useSharedSimulationInput();

  const setSymbolAt = (index: number, symbol: string) => {
    setSymbols((prev) => prev.map((s, i) => (i === index ? symbol : s)));
  };

  const toggleTrendMode = (mode: ChartTrendMode) => {
    setTrendModes((prev) => {
      const next = prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode];
      return next.length === 0 ? prev : next;
    });
  };

  const indicatorValue = (key: (typeof INDICATORS)[number]['key']) =>
    key === 'short' ? showTrendShort : key === 'long' ? showTrendLong : showBollinger;

  const setIndicator = (key: (typeof INDICATORS)[number]['key'], on: boolean) => {
    if (key === 'short') setShowTrendShort(on);
    else if (key === 'long') setShowTrendLong(on);
    else setShowBollinger(on);
  };

  const streamLabel = barInterval === '1m' ? 'Pulse' : 'Wave';

  const handleMockStateChange = useCallback((index: number, snapshot: MultiChartMockSnapshot) => {
    setMockSnapshots((prev) => ({ ...prev, [index]: snapshot }));
  }, []);

  const registerMockActionsFor = useCallback(
    (index: number) => (actions: MultiChartMockActions) => {
      mockActionsRef.current[index] = actions;
    },
    []
  );

  const selectedSnapshot = mockSnapshots[selectedIndex];
  const selectedActions = mockActionsRef.current[selectedIndex];
  const selectedInPosition =
    !!selectedSnapshot &&
    selectedSnapshot.mockOpen &&
    selectedSnapshot.mockPhase === 'exit' &&
    !selectedSnapshot.mockExitLocked;

  /** 공통 컨트롤 — 데스크톱 인라인과 모바일 시트가 같은 소스를 쓴다. */
  const streamSelect = (
    <Select value={barInterval} onValueChange={setBarInterval}>
      <SelectTrigger className="h-8 w-full text-xs sm:h-7 sm:w-[116px]">
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

  const categorySelect = (
    <Select value={category} onValueChange={(v) => setCategory(v as ChartTradingCategoryFilter)}>
      <SelectTrigger className="h-8 w-full text-xs sm:h-7 sm:w-[84px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c} className="text-xs">
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height))] flex-col">
      <div className="flex items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 sm:flex-wrap">
        <h1 className="shrink-0 text-sm font-semibold text-foreground">멀티차트</h1>

        {/* 모바일: 요약 한 줄 + 시트 */}
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="ml-auto flex h-8 min-w-0 items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/35 sm:hidden"
          aria-haspopup="dialog"
          aria-label={`필터: ${streamLabel}, ${category}, ${timeframe}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate">
            {streamLabel} · {category} · {timeframe}
          </span>
        </button>

        {/* 데스크톱: 인라인 컨트롤 */}
        <label className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          차트
          {streamSelect}
        </label>

        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          구분
          {TREND_MODES.map((m) => (
            <label key={m.key} className="flex cursor-pointer items-center gap-1 text-foreground">
              <input
                type="checkbox"
                checked={trendModes.includes(m.key)}
                onChange={() => toggleTrendMode(m.key)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {m.label}
            </label>
          ))}
        </div>

        <label className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          신호
          {categorySelect}
        </label>

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
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">차트</p>
              {streamSelect}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">신호</p>
              {categorySelect}
            </div>

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
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">구분</p>
              <div className="grid grid-cols-3 gap-2">
                {TREND_MODES.map((m) => {
                  const on = trendModes.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleTrendMode(m.key)}
                      className={`h-10 rounded-md border text-xs font-medium transition-colors ${
                        on
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
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

      {/* 4개 타일(2x2) + 모의매매 사이드바 — /chart1m의 ChartWorkspaceShell과 같은
          반응형 패턴: 모바일은 세로로 쌓고, lg 이상에서만 좌우로 나눈다. */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {symbols.map((symbol, index) => (
            <div
              key={index}
              className="flex h-[360px] flex-col rounded-lg border border-border bg-card p-2"
            >
              <Select value={symbol} onValueChange={(v) => setSymbolAt(index, v)}>
                <SelectTrigger className="h-8 w-full shrink-0 text-xs">
                  <SelectValue>{symbol}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ALL_SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 min-h-0 flex-1">
                <MultiChartTile
                  symbol={symbol}
                  barInterval={barInterval}
                  timeframe={timeframe}
                  showTrendShort={showTrendShort}
                  showTrendLong={showTrendLong}
                  showBollinger={showBollinger}
                  tradingCategoryFilter={category}
                  trendModesFilter={trendModes}
                  selected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                  onMockStateChange={(snapshot) => handleMockStateChange(index, snapshot)}
                  registerMockActions={registerMockActionsFor(index)}
                />
              </div>
            </div>
          ))}
        </div>

        <aside className="flex w-full flex-none flex-col gap-3 border-t border-border bg-card/40 p-3.5 lg:w-[340px] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="text-xs font-bold tracking-wide text-muted-foreground">
            선택된 차트: {symbols[selectedIndex]}
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

              <MockTradeHelp />
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
