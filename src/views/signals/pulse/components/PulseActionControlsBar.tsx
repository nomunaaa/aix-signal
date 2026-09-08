/**
 * Pulse toolbar: 스트림(PULSE/WAVE) → 전략 = 수익 시뮬 한 줄 구성 + 아코디언 본문.
 * 전략은 패널/드로어에서만 수정(연필 분리 제거).
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  STRATEGY_CONFIGS,
  SIGNAL_TREND_MODES,
  type ClosedSignal,
  type SignalStreamId,
  type SignalTrendMode,
  type SignalTrendModeFilter,
} from '../types/pulse.types';
import { hasAnySignalTrendModeSelected } from '@/lib/signal-trend-mode';
import { usePulseStore } from '../stores/pulseStore';
import { formatSimulationSummaryLine, formatSimulationUsd } from '../utils/formatSimulationSummary';
import { ConfidenceBadge } from '@/components/signals/confidence-badge';
import { StreamConfidenceDetail } from '@/components/signals/stream-confidence-detail';
import { SimulationEditorBody } from './SimulationEditorBody';
import { StrategySelectorPanel } from './action-bar/StrategySelectorPanel';
import { usePulseCopy } from '../utils/pulseTranslations';
import {
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';

type PanelId = 'stream-pulse' | 'stream-wave' | 'strategy' | 'sim' | null;

interface PulseActionControlsBarProps {
  className?: string;
  isReconnecting?: boolean;
  streamFilter?: Record<SignalStreamId, boolean>;
  onStreamFilterChange?: (stream: SignalStreamId, checked: boolean) => void;
  simulationHistorySignals?: ClosedSignal[];
  /** 미지정 시 pulseStore의 전역 값을 사용 — Trend Board처럼 독립 상태가 필요한 화면에서 override. */
  tradingCategoryFilters?: TradingCategory[];
  onTradingCategoryFilterToggle?: (category: TradingCategory) => void;
  trendModeFilter?: SignalTrendModeFilter;
  onTrendModeFilterChange?: (filter: SignalTrendModeFilter) => void;
  /** 수익 시뮬레이션(=) 버튼을 숨긴다 — 시뮬레이션 설정이 필요 없는 화면(Trend Board 등)용. */
  hideSimulation?: boolean;
}

export function PulseActionControlsBar({
  className,
  isReconnecting = false,
  streamFilter,
  onStreamFilterChange,
  simulationHistorySignals,
  tradingCategoryFilters: tradingCategoryFiltersProp,
  onTradingCategoryFilterToggle,
  trendModeFilter: trendModeFilterProp,
  onTrendModeFilterChange,
  hideSimulation = false,
}: PulseActionControlsBarProps) {
  const { language, copy } = usePulseCopy();
  const selectedStream = usePulseStore((s) => s.selectedStream);
  const setStream = usePulseStore((s) => s.setStream);
  const simulationInput = usePulseStore((s) => s.simulationInput);
  const simulationEditorFocusToken = usePulseStore((s) => s.simulationEditorFocusToken);
  const storeTrendModeFilter = usePulseStore((s) => s.trendModeFilter);
  const storeSetTrendModeFilter = usePulseStore((s) => s.setTrendModeFilter);
  const storeTradingCategoryFilters = usePulseStore((s) => s.tradingCategoryFilters);
  const storeToggleTradingCategoryFilter = usePulseStore((s) => s.toggleTradingCategoryFilter);
  const trendModeFilter = trendModeFilterProp ?? storeTrendModeFilter;
  const setTrendModeFilter = onTrendModeFilterChange ?? storeSetTrendModeFilter;
  const tradingCategoryFilters = tradingCategoryFiltersProp ?? storeTradingCategoryFilters;
  const toggleTradingCategoryFilter = onTradingCategoryFilterToggle ?? storeToggleTradingCategoryFilter;

  const [panel, setPanel] = useState<PanelId>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const prevFocusToken = useRef(simulationEditorFocusToken);

  useEffect(() => {
    if (!hideSimulation && simulationEditorFocusToken > prevFocusToken.current) {
      setPanel('sim');
    }
    prevFocusToken.current = simulationEditorFocusToken;
  }, [simulationEditorFocusToken, hideSimulation]);

  const [, setMockTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setMockTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const simSummaryPlain = useMemo(
    () => formatSimulationSummaryLine(simulationInput),
    [simulationInput.capital, simulationInput.capitalRatio, simulationInput.leverage]
  );
  const entryRatioPct = simulationInput.capitalRatio ?? 2;
  const leverageX = simulationInput.leverage;

  const openOrToggle = useCallback((next: Exclude<PanelId, null>) => {
    setPanel((p) => (p === next ? null : next));
  }, []);

  const trendLabels = useMemo<Record<SignalTrendMode, string>>(
    () => ({
      trend: language === 'ko' ? '추세' : 'Trend',
      nonTrend: language === 'ko' ? '비추세' : 'Non trend',
      reversal: language === 'ko' ? '역추세' : 'Reversal',
    }),
    [language]
  );
  const toggleTrendMode = useCallback(
    (mode: SignalTrendMode) => {
      const next = { ...trendModeFilter, [mode]: !trendModeFilter[mode] };
      if (!hasAnySignalTrendModeSelected(next)) return;
      setTrendModeFilter(next);
    },
    [setTrendModeFilter, trendModeFilter]
  );

  const categorySummary =
    tradingCategoryFilters.length === TRADING_CATEGORY_ORDER.length
      ? (language === 'ko' ? '전체' : 'All')
      : tradingCategoryFilters.join(', ');
  const trendSummary = SIGNAL_TREND_MODES.filter((mode) => trendModeFilter[mode])
    .map((mode) => trendLabels[mode])
    .join(', ');

  const streamSegment = (id: SignalStreamId) => {
    const checkboxMode = streamFilter != null && onStreamFilterChange != null;
    const selected = checkboxMode ? streamFilter[id] : selectedStream === id;
    const panelKey = id === 'pulse' ? 'stream-pulse' : 'stream-wave';
    const expanded = panel === panelKey;
    const label = id === 'pulse' ? 'PULSE' : 'WAVE';
    const toggleStream = () => {
      if (checkboxMode) {
        onStreamFilterChange(id, !streamFilter[id]);
        return;
      }
      setStream(id);
    };
    return (
      <div
        key={id}
        className={cn(
          'flex h-8 min-w-0 flex-1 items-stretch rounded-md bg-card/50 transition-colors',
          selected
        )}
      >
        <button
          type="button"
          onClick={toggleStream}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1.5 px-2.5 text-xs font-semibold leading-none tracking-wide',
            'hover:bg-muted/35 active:bg-muted/50'
          )}
          role={checkboxMode ? 'checkbox' : undefined}
          aria-checked={checkboxMode ? selected : undefined}
          aria-pressed={checkboxMode ? undefined : selected}
          aria-label={checkboxMode ? `${label} stream filter` : copy.actionBar.streamSelect(label)}
        >
          {checkboxMode ? (
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                selected
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'border-muted-foreground/55 bg-background text-transparent'
              )}
              aria-hidden
            >
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          ) : (
            <span
              className={cn(
                'flex aspect-square h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-background ring-offset-background transition-colors',
                selected ? 'border-primary shadow-sm' : 'border-muted-foreground/50'
              )}
              aria-hidden
            >
              {selected ? (
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
              ) : null}
            </span>
          )}
          <span
            className={cn(
              'whitespace-nowrap',
              selected ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </span>
          <ConfidenceBadge stream={id} className="ml-0.5" />
        </button>
        <button
          type="button"
          className={cn(
            'flex h-auto w-9 shrink-0 items-center justify-center rounded-r-md border-l border-border/80 text-muted-foreground',
            'hover:bg-muted/50 hover:text-foreground'
          )}
          aria-expanded={expanded}
          onClick={() => openOrToggle(panelKey)}
          aria-label={copy.actionBar.confidenceDetail(label)}
        >
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  };

  const detail = useMemo(() => {
    if (panel === 'stream-pulse') return <StreamConfidenceDetail stream="pulse" />;
    if (panel === 'stream-wave') return <StreamConfidenceDetail stream="wave" />;
    if (panel === 'strategy') return <StrategySelectorPanel />;
    if (panel === 'sim') {
      return (
        <div className="space-y-4 rounded-lg border border-border bg-card/80 p-4">
          <p className="text-sm font-medium text-foreground">{copy.actionBar.simulationSettings}</p>
          <SimulationEditorBody historySignals={simulationHistorySignals} />
        </div>
      );
    }
    return null;
  }, [copy.actionBar.simulationSettings, panel, simulationHistorySignals]);

  return (
    <div
      className={cn(
        'w-full border-b border-border bg-background/95',
        'sticky z-30 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/90',
        isReconnecting ? 'top-[calc(var(--header-height)+36px)]' : 'top-[var(--header-height)]',
        className
      )}
    >
      <div
        className="container mx-auto flex flex-col gap-1.5 pb-1.5 pt-2"
        style={{
          paddingLeft: 'var(--header-padding-x)',
          paddingRight: 'var(--header-padding-x)',
        }}
      >
        {/* 스트림 → 전략 = 시뮬 — 데스크톱은 한 줄, 좁은 화면은 가로 스크롤 대신 줄바꿈 */}
        <div
          className={cn(
            'flex min-h-10 w-full min-w-0 flex-wrap items-center gap-2 pb-0.5',
            'sm:gap-2.5'
          )}
        >
          <div
            className="flex min-w-[min(100%,280px)] shrink-0 items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-muted/20 p-0.5 sm:min-w-0 sm:max-w-md"
            role="group"
            aria-label={copy.actionBar.streamGroup}
          >
            {streamSegment('pulse')}
            <div className="w-px shrink-0 self-stretch bg-border/90" aria-hidden />
            {streamSegment('wave')}
          </div>

          <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />

          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex h-9 min-w-0 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/35 active:bg-muted/45 sm:hidden"
            aria-haspopup="dialog"
            aria-label={`${language === 'ko' ? '필터' : 'Filters'}: ${categorySummary} · ${trendSummary}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 truncate">
              {categorySummary}
              <span className="text-muted-foreground"> · </span>
              {trendSummary}
            </span>
          </button>

          <div
            className="hidden shrink-0 flex-nowrap items-center gap-1.5 sm:flex"
            role="group"
            aria-label={copy.actionBar.strategyPanel}
          >
            {TRADING_CATEGORY_ORDER.map((category) => {
              const on = tradingCategoryFilters.includes(category);
              const strategy = STRATEGY_CONFIGS.find(
                (item) => item.id === TRADING_CATEGORY_TO_STRATEGY[category]
              );
              return (
                <button
                  key={category}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggleTradingCategoryFilter(category)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    on
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                      on
                        ? 'border-foreground bg-foreground text-background shadow-sm'
                        : 'border-muted-foreground/55 bg-background text-transparent'
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span className="font-mono">{category}</span>
                  {strategy ? (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: strategy.color }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div
            className="hidden h-10 shrink-0 items-center gap-1 rounded-lg border border-border bg-card/50 p-1 sm:flex"
            role="group"
            aria-label="Trend filter"
          >
            {SIGNAL_TREND_MODES.map((mode) => {
              const selected = trendModeFilter[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => toggleTrendMode(mode)}
                  className={cn(
                    'flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold leading-none tracking-wide transition-colors',
                    'hover:bg-muted/35 active:bg-muted/50'
                  )}
                  role="checkbox"
                  aria-checked={selected}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                      selected
                        ? 'border-foreground bg-foreground text-background shadow-sm'
                        : 'border-muted-foreground/55 bg-background text-transparent'
                    )}
                    aria-hidden
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap',
                      selected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {trendLabels[mode]}
                  </span>
                </button>
              );
            })}
          </div>

          {hideSimulation ? null : (
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="shrink-0 px-0.5 font-mono text-sm font-medium text-muted-foreground/70"
                aria-hidden
                title={copy.actionBar.simulationHint}
              >
                =
              </span>

              <button
                type="button"
                className={cn(
                  'flex h-10 min-w-[min(260px,92vw)] shrink-0 items-center gap-2 rounded-lg border border-border bg-card/50 px-2.5 text-left text-xs transition-colors',
                  'hover:border-border hover:bg-muted/35 active:bg-muted/45',
                  'sm:min-w-[240px] sm:max-w-md',
                  panel === 'sim' && 'border-primary/40 bg-primary/[0.08] ring-1 ring-primary/15'
                )}
                onClick={() => openOrToggle('sim')}
                aria-expanded={panel === 'sim'}
                aria-label={copy.actionBar.simulationAria(simSummaryPlain)}
              >
                <span className="shrink-0 whitespace-nowrap font-medium text-muted-foreground">
                  {copy.actionBar.simulationTitle}
                </span>
                <span className="inline-flex min-w-0 flex-1 items-center gap-x-1 font-mono tabular-nums leading-none">
                  <span className="truncate text-foreground">
                    {formatSimulationUsd(simulationInput.capital)}
                  </span>
                  <span className="text-muted-foreground/80" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 font-semibold text-primary">{entryRatioPct}%</span>
                  <span className="text-muted-foreground/80" aria-hidden>
                    ·
                  </span>
                  <span className="shrink-0 font-semibold leading-none text-foreground">
                    {leverageX}x
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                    panel === 'sim' && 'rotate-180'
                  )}
                />
              </button>
            </div>
          )}
        </div>

        <Collapsible open={panel !== null}>
          <CollapsibleContent className="overflow-hidden">
            {detail ? <div className="pb-1.5 pt-0.5">{detail}</div> : null}
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-foreground">
              {language === 'ko' ? '필터' : 'Filters'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {language === 'ko' ? '전략' : 'Strategy'}
              </p>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label={copy.actionBar.strategyPanel}>
                {TRADING_CATEGORY_ORDER.map((category) => {
                  const on = tradingCategoryFilters.includes(category);
                  const strategy = STRATEGY_CONFIGS.find(
                    (item) => item.id === TRADING_CATEGORY_TO_STRATEGY[category]
                  );
                  return (
                    <button
                      key={category}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggleTradingCategoryFilter(category)}
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors',
                        on
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                          on
                            ? 'border-foreground bg-foreground text-background shadow-sm'
                            : 'border-muted-foreground/55 bg-background text-transparent'
                        )}
                        aria-hidden
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="font-mono">{category}</span>
                      {strategy ? (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: strategy.color }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {language === 'ko' ? '추세' : 'Trend'}
              </p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Trend filter">
                {SIGNAL_TREND_MODES.map((mode) => {
                  const selected = trendModeFilter[mode];
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleTrendMode(mode)}
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-md border text-xs font-semibold transition-colors',
                        selected
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                      )}
                      role="checkbox"
                      aria-checked={selected}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                          selected
                            ? 'border-foreground bg-foreground text-background shadow-sm'
                            : 'border-muted-foreground/55 bg-background text-transparent'
                        )}
                        aria-hidden
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                      <span className="truncate">{trendLabels[mode]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
