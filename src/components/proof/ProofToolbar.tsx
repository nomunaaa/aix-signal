import { useState, type Ref } from 'react';
import { SlidersHorizontal } from 'lucide-react';
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

export function ProofToolbar({
  streams,
  trendModes,
  tradingCategories,
  engines,
  copy,
  onToggleStream,
  onToggleTrendMode,
  onToggleTradingCategory,
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
  trendModes: ProofStatsTrendMode[];
  tradingCategories: TradingCategory[];
  engines: readonly [EngineStats, EngineStats];
  copy: ProofCopy;
  onToggleStream: (stream: ProofStatsStream) => void;
  onToggleTrendMode: (mode: ProofStatsTrendMode) => void;
  onToggleTradingCategory: (category: TradingCategory) => void;
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
  const pulseEngine = engines.find((engine) => engine.engine === 'PULSE');
  const waveEngine = engines.find((engine) => engine.engine === 'WAVE');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const streamSummary =
    streams.length === 2 ? `${copy.filters.pulse}+${copy.filters.wave}` : streams[0] ?? '-';
  const categorySummary =
    tradingCategories.length === TRADING_CATEGORY_ORDER.length
      ? copy.filters.allSymbols
      : tradingCategories.join('/') || '-';

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
      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setFilterSheetOpen(true)}
          className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border bg-card/50 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/35 active:bg-muted/45"
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
      <div className="hidden flex-wrap items-center gap-2 sm:flex sm:gap-3">
        {streamToggleGroup}
        <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />
        {categoryChips}
        {trendModeGroup}

        {/* 승률/손익비 임계값 — Trend Board와 usePulseStore를 공유한다.
            종목별 통계 섹션 안에 두었더니 페이지 한참 아래(11,000px 지점)에 묻혀
            보이지 않아, 나머지 필터와 같은 상단 툴바로 올린다. */}
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
          className="ml-auto"
        />
      </div>
    </div>
  );
}
