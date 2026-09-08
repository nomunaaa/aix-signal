import type { Ref } from 'react';
import type { EngineStats, ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import {
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
  type TradingCategory,
} from '@/lib/trading-category';
import { STRATEGY_CONFIGS } from '@/views/signals/pulse/types/pulse.types';
import type { ProofCopy } from './proofCopy';
import { ProofFilterChip, ProofStreamToggle } from './ProofToolbarControls';
import { SimulationSettingsPopover } from './SimulationSettingsPopover';
import { SymbolQualityFilter } from './SymbolQualityFilter';

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
  onSeedChange: (value: number) => void;
  onEntryRatioChange: (value: number) => void;
  onLeverageChange: (value: number) => void;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const pulseEngine = engines.find((engine) => engine.engine === 'PULSE');
  const waveEngine = engines.find((engine) => engine.engine === 'WAVE');

  return (
    <div
      ref={containerRef}
      className="sticky z-40 -mx-4 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur md:-mx-5 md:px-5"
      style={{ top: 'var(--header-height)' }}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

        <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={copy.filters.signal}>
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

        <div
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card/50 p-1"
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

        {/* 승률/손익비 임계값 — Trend Board와 usePulseStore를 공유한다.
            종목별 통계 섹션 안에 두었더니 페이지 한참 아래(11,000px 지점)에 묻혀
            보이지 않아, 나머지 필터와 같은 상단 툴바로 올린다. */}
        <SymbolQualityFilter copy={copy} />

        <span className="hidden text-sm font-semibold text-muted-foreground sm:inline">=</span>

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
