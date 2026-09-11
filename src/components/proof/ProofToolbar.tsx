import { useMemo, useState, type Ref } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { EngineStats, ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import {
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import { STRATEGY_CONFIGS } from '@/views/signals/pulse/types/pulse.types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { ProofCopy } from './proofCopy';
import { ProofFilterChip, ProofStreamToggle } from './ProofToolbarControls';
import { SimulationSettingsPopover } from './SimulationSettingsPopover';
import { SymbolQualityFilter } from './SymbolQualityFilter';
import type { ProofQualityPeriod } from './symbolQuality';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { FavoriteScopeControls } from '@/views/signals/pulse/components/FavoriteScopeControls';
import { getSymbolsFromEnv } from '@/config/symbols';

export function ProofToolbar({
  streams,
  engines,
  copy,
  onToggleStream,
  seed,
  entryRatio,
  leverage,
  qualityPeriod,
  onQualityPeriodChange,
  onSeedChange,
  onEntryRatioChange,
  onLeverageChange,
  containerRef,
}: {
  streams: ProofStatsStream[];
  engines: readonly [EngineStats, EngineStats];
  copy: ProofCopy;
  onToggleStream: (stream: ProofStatsStream) => void;
  seed: number;
  entryRatio: number;
  leverage: number;
  qualityPeriod: ProofQualityPeriod;
  onQualityPeriodChange: (period: ProofQualityPeriod) => void;
  onSeedChange: (value: number) => void;
  onEntryRatioChange: (value: number) => void;
  onLeverageChange: (value: number) => void;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const searchQuery = usePulseStore((state) => state.searchQuery);
  const setSearchQuery = usePulseStore((state) => state.setSearchQuery);
  const favoriteSymbols = useMemo(() => getSymbolsFromEnv(), []);
  // Legacy mobile sheet remains mounted but hidden; keep its fixed scope data local.
  const trendModes: ProofStatsTrendMode[] = ['reversal'];
  const tradingCategories: TradingCategory[] = ['E2X2'];
  const onToggleTrendMode = (_mode: ProofStatsTrendMode) => undefined;
  const onToggleTradingCategory = (_category: TradingCategory) => undefined;
  const pulseEngine = engines.find((engine) => engine.engine === 'PULSE');
  const waveEngine = engines.find((engine) => engine.engine === 'WAVE');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const streamSummary =
    streams.length === 2 ? `${copy.filters.pulse}+${copy.filters.wave}` : streams[0] ?? '-';
  const categorySummary = 'E2X2';

  const streamToggleGroup = (
    <div
      className="flex min-w-[10rem] shrink-0 items-stretch gap-0 overflow-hidden rounded-lg border border-border bg-muted/20 p-0.5"
      role="group"
      aria-label={copy.filters.streams}
    >
      <ProofStreamToggle
        checked={streams.includes('PULSE')}
        label={copy.filters.pulse}
        winRate={pulseEngine?.winRate}
        dotColor="#16C784"
        onChange={() => onToggleStream('PULSE')}
      />
      <div className="w-px shrink-0 self-stretch bg-border/90" aria-hidden />
      <ProofStreamToggle
        checked={streams.includes('WAVE')}
        label={copy.filters.wave}
        winRate={waveEngine?.winRate}
        dotColor="#F0A030"
        onChange={() => onToggleStream('WAVE')}
      />
    </div>
  );

  const categoryChips = (
    <div
      className="grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap sm:items-center"
      role="group"
      aria-label={copy.filters.signal}
    >
      {TRADING_CATEGORY_ORDER.map((category) => {
        const strategy = STRATEGY_CONFIGS.find(
          (item) => item.id === TRADING_CATEGORY_TO_STRATEGY[category]
        );
        return (
          <ProofFilterChip
            key={category}
            checked={tradingCategories.includes(category)}
            label={category}
            dotColor={strategy?.color}
            onChange={() => onToggleTradingCategory(category)}
          />
        );
      })}
    </div>
  );

  const trendModeGroup = (
    <div
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-card/50 p-1 sm:flex sm:shrink-0 sm:items-center"
      role="group"
      aria-label={copy.filters.category}
    >
      <ProofFilterChip
        checked={trendModes.includes('trend')}
        label={copy.filters.trend}
        onChange={() => onToggleTrendMode('trend')}
      />
      <ProofFilterChip
        checked={trendModes.includes('nonTrend')}
        label={copy.filters.nonTrend}
        onChange={() => onToggleTrendMode('nonTrend')}
      />
      <ProofFilterChip
        checked={trendModes.includes('reversal')}
        label={copy.filters.reversal}
        onChange={() => onToggleTrendMode('reversal')}
      />
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="sticky z-40 -mx-4 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur md:-mx-5 md:px-5"
      style={{ top: 'var(--header-height)' }}
    >
      {/* 모바일: 요약 버튼 + 시트. 4개 컨트롤 그룹(스트림/신호 4칩/구분 3칩/종목필터)이
          한 줄 flex-wrap에 그대로 있으면 375px에서 제각각 크기로 줄바꿈되며 쌓인다. */}
      <div className="hidden">
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex h-9 min-w-[7rem] flex-1 items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/35 active:bg-muted/45"
          aria-haspopup="dialog"
          aria-label={`${copy.filters.signal}: ${streamSummary} · ${categorySummary}`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 truncate">
            {streamSummary}
            <span className="text-muted-foreground"> · </span>
            {categorySummary}
          </span>
        </button>
        <SimulationSettingsPopover
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          onSeedChange={onSeedChange}
          onEntryRatioChange={onEntryRatioChange}
          onLeverageChange={onLeverageChange}
          copy={copy}
        />
      </div>

      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto sm:hidden">
          <SheetHeader>
            <SheetTitle className="text-base font-semibold text-foreground">
              {copy.filters.signal}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {copy.filters.streams}
              </p>
              {streamToggleGroup}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {copy.filters.signal}
              </p>
              {categoryChips}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {copy.filters.category}
              </p>
              {trendModeGroup}
            </div>
            <div>
              <SymbolQualityFilter
                copy={copy}
                period={qualityPeriod}
                onPeriodChange={onQualityPeriodChange}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 데스크톱: 기존 인라인 툴바 그대로 */}
      <div className="flex min-w-max items-center gap-2 overflow-x-auto">
        <label className="relative block w-52 shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={copy.filters.symbol}
            aria-label={copy.filters.symbol}
            className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
        </label>
        <FavoriteScopeControls symbols={favoriteSymbols} />
        {streamToggleGroup}
        <SymbolQualityFilter
          copy={copy}
          period={qualityPeriod}
          onPeriodChange={onQualityPeriodChange}
        />

        <SimulationSettingsPopover
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          onSeedChange={onSeedChange}
          onEntryRatioChange={onEntryRatioChange}
          onLeverageChange={onLeverageChange}
          copy={copy}
          className=""
        />
      </div>
    </div>
  );
}
