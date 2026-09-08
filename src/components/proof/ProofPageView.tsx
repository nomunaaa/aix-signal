'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProofPageMock, ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import {
  reconstructSymbolStats,
  reconstructTotalStats,
  reconstructTotalStatsForSymbols,
} from '@/lib/proof/proof-buckets';
import {
  DEFAULT_SHARED_SIMULATION_INPUT,
  SIMULATION_LIMITS,
  readSharedSimulationInput,
  subscribeSharedSimulationInput,
  writeSharedSimulationInput,
} from '@/lib/simulationStorage';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { ProofFooter } from '@/components/proof/ProofFooter';
import { PROOF_COPY } from './proofCopy';
import { clamp, proofLanguageFromCode } from './proofFormat';
import { ALL_STREAMS, ALL_TREND_MODES, PROOF_STREAM_TO_HISTORY_STREAM } from './HistoryEntryCountLink';
import { ProofToolbar } from './ProofToolbar';
import { ProofStatBar } from './ProofStatBar';
import { ProofSimulatorCard } from './ProofSimulatorCard';
import { SymbolStatsSection } from './SymbolStatsSection';

const MIN_SEED = SIMULATION_LIMITS.capital.min;
const MAX_SEED = SIMULATION_LIMITS.capital.max;
const DEFAULT_SEED = DEFAULT_SHARED_SIMULATION_INPUT.capital;
const MIN_ENTRY_RATIO = SIMULATION_LIMITS.capitalRatio.min;
const MAX_ENTRY_RATIO = SIMULATION_LIMITS.capitalRatio.max;
const DEFAULT_ENTRY_RATIO = DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio;
const MIN_LEVERAGE = SIMULATION_LIMITS.leverage.min;
const MAX_LEVERAGE = SIMULATION_LIMITS.leverage.max;
const DEFAULT_LEVERAGE = DEFAULT_SHARED_SIMULATION_INPUT.leverage;

export function ProofPageView({ data }: { data: ProofPageMock }) {
  const { i18n } = useTranslation();
  const language = proofLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  const copy = PROOF_COPY[language];
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Stream/Category/Signal 필터는 즐겨찾기·시뮬레이터처럼 Signal Board와 공유되는
  // usePulseStore가 소스 오브 트루스다 — 로컬 state로 들고 있지 않는다.
  const streamFilter = usePulseStore((state) => state.streamFilter);
  const toggleStreamFilterStore = usePulseStore((state) => state.toggleStreamFilter);
  const trendModeFilter = usePulseStore((state) => state.trendModeFilter);
  const setTrendModeFilterStore = usePulseStore((state) => state.setTrendModeFilter);
  const tradingCategories = usePulseStore((state) => state.tradingCategoryFilters);
  const toggleTradingCategory = usePulseStore((state) => state.toggleTradingCategoryFilter);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);

  const streams = useMemo(
    () => ALL_STREAMS.filter((stream) => streamFilter[PROOF_STREAM_TO_HISTORY_STREAM[stream]]),
    [streamFilter]
  );
  const trendModes = useMemo(
    () => ALL_TREND_MODES.filter((mode) => trendModeFilter[mode]),
    [trendModeFilter]
  );

  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [entryRatio, setEntryRatio] = useState(DEFAULT_ENTRY_RATIO);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [toolbarHeight, setToolbarHeight] = useState(0);

  // data.buckets는 서버가 한 번의 스캔으로 만들어 둔 작은 합산 큐브다(stream x
  // trendMode x category x window) — 필터가 바뀔 때마다 해당 버킷만 합산해 즉시
  // 재구성한다. 버킷이 비어있는 경우(mock/empty state)는 서버 기본값을 그대로 쓴다.
  const activeStats = useMemo(() => {
    if (Object.keys(data.buckets.total).length === 0) {
      return { totalStats: data.totalStats, symbolStats: data.symbolStats };
    }
    const totalStats = showFavoritesOnly
      ? reconstructTotalStatsForSymbols(
          data.buckets,
          Array.from(favorites),
          streams,
          trendModes,
          tradingCategories
        )
      : reconstructTotalStats(data.buckets, streams, trendModes, tradingCategories);
    return {
      totalStats,
      symbolStats: reconstructSymbolStats(data.buckets, streams, trendModes, tradingCategories),
    };
  }, [data, streams, trendModes, tradingCategories, showFavoritesOnly, favorites]);

  useEffect(() => {
    const applySharedSimulation = (input: ReturnType<typeof readSharedSimulationInput>) => {
      setSeed(input.capital);
      setEntryRatio(input.capitalRatio);
      setLeverage(input.leverage);
    };

    applySharedSimulation(readSharedSimulationInput());
    return subscribeSharedSimulationInput(applySharedSimulation);
  }, []);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const syncHeight = () => {
      const next = Math.ceil(toolbar.getBoundingClientRect().height);
      setToolbarHeight((current) => (current === next ? current : next));
    };

    syncHeight();
    window.addEventListener('resize', syncHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', syncHeight);
    }

    const resizeObserver = new ResizeObserver(syncHeight);
    resizeObserver.observe(toolbar);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, []);

  const persistSimulationInput = (next: {
    capital?: number;
    capitalRatio?: number;
    leverage?: number;
  }) =>
    writeSharedSimulationInput({
      capital: next.capital ?? seed,
      capitalRatio: next.capitalRatio ?? entryRatio,
      leverage: next.leverage ?? leverage,
    });

  const toggleStream = (stream: ProofStatsStream) => {
    toggleStreamFilterStore(PROOF_STREAM_TO_HISTORY_STREAM[stream]);
  };

  const toggleTrendMode = (mode: ProofStatsTrendMode) => {
    const next = { ...trendModeFilter, [mode]: !trendModeFilter[mode] };
    if (!next.trend && !next.nonTrend && !next.reversal) return;
    setTrendModeFilterStore(next);
  };

  const handleSeedChange = (value: number) => {
    const next = clamp(value, MIN_SEED, MAX_SEED);
    setSeed(next);
    persistSimulationInput({ capital: next });
  };

  const handleEntryRatioChange = (value: number) => {
    const next = clamp(value, MIN_ENTRY_RATIO, MAX_ENTRY_RATIO);
    setEntryRatio(next);
    persistSimulationInput({ capitalRatio: next });
  };

  const handleLeverageChange = (value: number) => {
    const next = clamp(value, MIN_LEVERAGE, MAX_LEVERAGE);
    setLeverage(next);
    persistSimulationInput({ leverage: next });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-background px-4 py-8 pb-20 text-foreground md:px-5">
      <ProofToolbar
        containerRef={toolbarRef}
        streams={streams}
        trendModes={trendModes}
        tradingCategories={tradingCategories}
        engines={data.engines}
        copy={copy}
        onToggleStream={toggleStream}
        onToggleTrendMode={toggleTrendMode}
        onToggleTradingCategory={toggleTradingCategory}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
        onSeedChange={handleSeedChange}
        onEntryRatioChange={handleEntryRatioChange}
        onLeverageChange={handleLeverageChange}
      />

      <ProofStatBar
        rows={activeStats.totalStats}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
        copy={copy}
        stickyTopOffsetPx={toolbarHeight}
      />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">
          {copy.sections.simulator.title}
        </h2>
        <ProofSimulatorCard
          rows={activeStats.totalStats}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
          monthlyFeeUsd={data.simulator.monthlyFeeUsd}
          yearlyFeeUsd={data.simulator.yearlyFeeUsd}
          copy={copy}
          language={language}
        />
      </section>

      <SymbolStatsSection
        rows={activeStats.symbolStats}
        seed={seed}
        entryRatio={entryRatio}
        leverage={leverage}
        streams={streams}
        trendModes={trendModes}
        tradingCategories={tradingCategories}
        language={language}
        copy={copy}
      />

      <ProofFooter note={copy.footer} />
    </div>
  );
}
