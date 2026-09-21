'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProofPageMock, ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import { buildEmptyProofPage } from '@/lib/proof/build-proof-page-data';
import type { TradingCategory } from '@/lib/trading-category';
import {
  reconstructSymbolStats,
  reconstructSymbolStatsForProfitableSelections,
  reconstructTotalStatsForSymbols,
  type ProofStatsSelection,
} from '@/lib/proof/proof-buckets';
import {
  DEFAULT_SHARED_SIMULATION_INPUT,
  readSharedSimulationInput,
  subscribeSharedSimulationInput,
} from '@/lib/simulationStorage';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { ProofFooter } from '@/components/proof/ProofFooter';
import { PROOF_COPY } from './proofCopy';
import { proofLanguageFromCode } from './proofFormat';
import { ProofToolbar } from './ProofToolbar';
import { ProofStatBar } from './ProofStatBar';
import { ProofSimulatorCard } from './ProofSimulatorCard';
import { SymbolStatsSection } from './SymbolStatsSection';
import {
  symbolsMeetingQualityThresholds,
  type ProofQualityPeriod,
} from './symbolQuality';
import { SIGNAL_STREAM_OPTION_IDS } from '@/views/signals/pulse/utils/streamSelector';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';

const DEFAULT_SEED = DEFAULT_SHARED_SIMULATION_INPUT.capital;
const DEFAULT_ENTRY_RATIO = DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio;
const DEFAULT_LEVERAGE = DEFAULT_SHARED_SIMULATION_INPUT.leverage;

const OPTION_SELECTIONS: Partial<Record<SignalStreamOptionId, ProofStatsSelection>> = {
  P1: { stream: 'PULSE', trendMode: 'reversal' },
  P2: { stream: 'PULSE', trendMode: 'trend' },
  P3: { stream: 'PULSE', trendMode: 'nonTrend' },
  W1: { stream: 'WAVE', trendMode: 'reversal' },
  W2: { stream: 'WAVE', trendMode: 'trend' },
  W3: { stream: 'WAVE', trendMode: 'nonTrend' },
};

export function ProofPageView() {
  const { i18n } = useTranslation();
  const language = proofLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  const copy = PROOF_COPY[language];
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Stream/Category/Signal 필터는 즐겨찾기·시뮬레이터처럼 Signal Board와 공유되는
  // usePulseStore가 소스 오브 트루스다 — 로컬 state로 들고 있지 않는다.
  const streamOptionFilter = usePulseStore((state) => state.streamOptionFilter);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const searchQuery = usePulseStore((state) => state.searchQuery);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);

  const selectedOptionIds = useMemo(
    () => SIGNAL_STREAM_OPTION_IDS.filter((id) => streamOptionFilter[id]),
    [streamOptionFilter]
  );
  const selections = useMemo(
    () =>
      selectedOptionIds
        .map((id) => OPTION_SELECTIONS[id])
        .filter((selection): selection is ProofStatsSelection => selection != null),
    [selectedOptionIds]
  );
  const streams = useMemo(
    () => [...new Set(selections.map(({ stream }) => stream))] as ProofStatsStream[],
    [selections]
  );
  const trendModes = useMemo(
    () => [...new Set(selections.map(({ trendMode }) => trendMode))] as ProofStatsTrendMode[],
    [selections]
  );
  const tradingCategories = useMemo<TradingCategory[]>(() => ['E2X2'], []);

  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [entryRatio, setEntryRatio] = useState(DEFAULT_ENTRY_RATIO);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [toolbarHeight, setToolbarHeight] = useState(0);
  const [qualityPeriod, setQualityPeriod] = useState<ProofQualityPeriod>('last30d');
  const [data, setData] = useState<ProofPageMock>(() => buildEmptyProofPage('30d'));

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/proof', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Proof data request failed: ${response.status}`);
        return (await response.json()) as ProofPageMock;
      })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[proof] client data fetch failed:', error);
      });
    return () => controller.abort();
  }, []);

  // data.buckets는 서버가 한 번의 스캔으로 만들어 둔 작은 합산 큐브다(stream x
  // trendMode x category x window) — 필터가 바뀔 때마다 해당 버킷만 합산해 즉시
  // 재구성한다. 버킷이 비어있는 경우(mock/empty state)는 서버 기본값을 그대로 쓴다.
  const activeStats = useMemo(() => {
    if (Object.keys(data.buckets.total).length === 0) {
      return {
        totalStats: data.totalStats,
        symbolStats: data.symbolStats,
        streamWinRates: {},
        buckets: data.buckets,
      };
    }
    // Each selected P/W trend qualifies independently. The displayed symbol list
    // is their union, and a parent row aggregates only its qualifying trends.
    const symbolStats = reconstructSymbolStatsForProfitableSelections(
      data.buckets,
      selections,
      tradingCategories
    );
    let aggregateSymbols = symbolStats.map((row) => row.symbol.trim().toUpperCase());
    const qualitySymbols = new Set(
      symbolsMeetingQualityThresholds(
        symbolStats,
        qualityWinRateThreshold,
        qualityRiskRewardThreshold,
        qualityPeriod
      )
    );
    aggregateSymbols = aggregateSymbols.filter((symbol) => qualitySymbols.has(symbol));
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
      tradingCategories,
      selections
    );
    const qualifiedSymbolSet = new Set(aggregateSymbols);
    const qualifiedSymbolStats = symbolStats.filter((row) => qualifiedSymbolSet.has(row.symbol));
    const streamWinRates = (['PULSE', 'WAVE'] as const).reduce<
      Partial<Record<'pulse' | 'wave', number>>
    >((rates, stream) => {
      const streamRows = reconstructSymbolStats(
        data.buckets,
        [stream],
        selections
          .filter((selection) => selection.stream === stream)
          .map((selection) => selection.trendMode),
        tradingCategories,
        selections.filter((selection) => selection.stream === stream)
      );
      const values = streamRows
        .filter((row) => qualifiedSymbolSet.has(row.symbol))
        .map((row) => {
          const slice =
            qualityPeriod === 'last30d'
              ? row.recent30Combined
              : qualityPeriod === 'last3mo'
                ? row.recent3moCombined
                : row.combined;
          return slice.cycleCount > 0 ? slice.winRate * 100 : null;
        })
        .filter((value): value is number => value !== null);
      const key = stream === 'PULSE' ? 'pulse' : 'wave';
      if (values.length) rates[key] = values.reduce((sum, value) => sum + value, 0) / values.length;
      return rates;
    }, {});
    return {
      totalStats,
      symbolStats: qualifiedSymbolStats,
      streamWinRates,
      buckets: data.buckets,
    };
  }, [
    data,
    tradingCategories,
    showFavoritesOnly,
    favorites,
    searchQuery,
    qualityWinRateThreshold,
    qualityRiskRewardThreshold,
    streams,
    trendModes,
    selections,
    qualityPeriod,
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
        streamWinRates={activeStats.streamWinRates}
        qualityPeriod={qualityPeriod}
        onQualityPeriodChange={setQualityPeriod}
      />

      <ProofStatBar
        rows={activeStats.totalStats}
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
        tradingCategories={tradingCategories}
        buckets={activeStats.buckets}
        selectedOptionIds={selectedOptionIds}
        language={language}
        copy={copy}
        qualityPeriod={qualityPeriod}
      />

      <ProofFooter note={copy.footer} />
    </div>
  );
}
