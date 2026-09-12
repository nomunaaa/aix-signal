'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProofPageMock, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import type { TradingCategory } from '@/lib/trading-category';
import { reconstructSymbolStats, reconstructTotalStatsForSymbols } from '@/lib/proof/proof-buckets';
import {
  DEFAULT_SHARED_SIMULATION_INPUT,
  readSharedSimulationInput,
  subscribeSharedSimulationInput,
} from '@/lib/simulationStorage';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { ProofFooter } from '@/components/proof/ProofFooter';
import { PROOF_COPY } from './proofCopy';
import { proofLanguageFromCode } from './proofFormat';
import { ALL_STREAMS, PROOF_STREAM_TO_HISTORY_STREAM } from './HistoryEntryCountLink';
import { ProofToolbar } from './ProofToolbar';
import { ProofStatBar } from './ProofStatBar';
import { ProofSimulatorCard } from './ProofSimulatorCard';
import { SymbolStatsSection } from './SymbolStatsSection';
import { symbolsMeetingQualityThresholds, type ProofQualityPeriod } from './symbolQuality';

const DEFAULT_SEED = DEFAULT_SHARED_SIMULATION_INPUT.capital;
const DEFAULT_ENTRY_RATIO = DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio;
const DEFAULT_LEVERAGE = DEFAULT_SHARED_SIMULATION_INPUT.leverage;

export function ProofPageView({ data }: { data: ProofPageMock }) {
  const { i18n } = useTranslation();
  const language = proofLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  const copy = PROOF_COPY[language];
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Stream/Category/Signal 필터는 즐겨찾기·시뮬레이터처럼 Signal Board와 공유되는
  // usePulseStore가 소스 오브 트루스다 — 로컬 state로 들고 있지 않는다.
  const streamFilter = usePulseStore((state) => state.streamFilter);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const searchQuery = usePulseStore((state) => state.searchQuery);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);

  const streams = useMemo(
    () => ALL_STREAMS.filter((stream) => streamFilter[PROOF_STREAM_TO_HISTORY_STREAM[stream]]),
    [streamFilter]
  );
  const trendModes = useMemo<ProofStatsTrendMode[]>(() => ['reversal'], []);
  const tradingCategories = useMemo<TradingCategory[]>(() => ['E2X2'], []);

  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [entryRatio, setEntryRatio] = useState(DEFAULT_ENTRY_RATIO);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [qualityPeriod, setQualityPeriod] = useState<ProofQualityPeriod>('last30d');

  // data.buckets는 서버가 한 번의 스캔으로 만들어 둔 작은 합산 큐브다(stream x
  // trendMode x category x window) — 필터가 바뀔 때마다 해당 버킷만 합산해 즉시
  // 재구성한다. 버킷이 비어있는 경우(mock/empty state)는 서버 기본값을 그대로 쓴다.
  const activeStats = useMemo(() => {
    if (Object.keys(data.buckets.total).length === 0) {
      return { totalStats: data.totalStats, symbolStats: data.symbolStats };
    }
    const symbolStats = reconstructSymbolStats(
      data.buckets,
      streams,
      trendModes,
      tradingCategories
    );
    let aggregateSymbols = symbolsMeetingQualityThresholds(
      symbolStats,
      qualityWinRateThreshold,
      qualityRiskRewardThreshold,
      qualityPeriod
    );
    if (showFavoritesOnly) {
      aggregateSymbols = aggregateSymbols.filter((symbol) => favorites.has(symbol));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      aggregateSymbols = aggregateSymbols.filter((symbol) => symbol.includes(query));
    }
    const totalStats = reconstructTotalStatsForSymbols(
      data.buckets,
      aggregateSymbols,
      streams,
      trendModes,
      tradingCategories
    );
    return {
      totalStats,
      symbolStats,
    };
  }, [
    data,
    streams,
    trendModes,
    tradingCategories,
    showFavoritesOnly,
    favorites,
    qualityWinRateThreshold,
    qualityRiskRewardThreshold,
    qualityPeriod,
    searchQuery,
  ]);

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

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-background px-4 py-8 pb-20 text-foreground md:px-5">
      <ProofToolbar
        containerRef={toolbarRef}
        engines={data.engines}
        qualityPeriod={qualityPeriod}
        onQualityPeriodChange={setQualityPeriod}
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
          {copy.simulator.step2Title}
        </h2>
        <ProofSimulatorCard
          rows={activeStats.totalStats}
          seed={seed}
          entryRatio={entryRatio}
          leverage={leverage}
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
        qualityPeriod={qualityPeriod}
        copy={copy}
      />

      <ProofFooter note={copy.footer} />
    </div>
  );
}
