'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ProofPageMock,
  ProofStatsStream,
  ProofStatsTrendMode,
  ProofTotalStatsRow,
} from '@/lib/mock/proof-mock';
import { buildEmptyProofPage } from '@/lib/proof/build-proof-page-data';
import type { TradingCategory } from '@/lib/trading-category';
import {
  reconstructSymbolStats,
  reconstructSymbolStatsForProfitableSelections,
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
import { combineProofCycleStats, proofLanguageFromCode } from './proofFormat';
import { ProofToolbar } from './ProofToolbar';
import { ProofStatBar } from './ProofStatBar';
import { ProofSimulatorCard } from './ProofSimulatorCard';
import { SymbolStatsSection } from './SymbolStatsSection';
import type { ProofQualityPeriod } from './symbolQuality';
import type { RiskAnalysisByPeriod } from '@/lib/proof/risk-analysis';
import { SIGNAL_STREAM_OPTION_IDS } from '@/views/signals/pulse/utils/streamSelector';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';

const DEFAULT_SEED = DEFAULT_SHARED_SIMULATION_INPUT.capital;
const DEFAULT_ENTRY_RATIO = DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio;
const DEFAULT_LEVERAGE = DEFAULT_SHARED_SIMULATION_INPUT.leverage;

const OPTION_SELECTIONS: Partial<Record<SignalStreamOptionId, ProofStatsSelection>> = {
  P1: { stream: 'PULSE', trendMode: 'reversal' },
  P2: { stream: 'PULSE', trendMode: 'trend' },
  P3: { stream: 'PULSE', trendMode: 'nonTrend' },
  B1: { stream: 'BEAT', trendMode: 'reversal' },
  B2: { stream: 'BEAT', trendMode: 'trend' },
  B3: { stream: 'BEAT', trendMode: 'nonTrend' },
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
  // 결과에 '어떤 필터로 받은 것인지'를 같이 들고 다닌다. 로딩 여부를 별도 boolean으로
  // 두면 필터가 바뀐 직후에도 이전 숫자가 그대로 남는다 — 위쪽 카드들은 즉시 바뀌므로
  // 이 칸만 옛날 값으로 남아 더 눈에 띈다. 질의 문자열이 지금 필터와 같을 때만 그린다.
  // data가 비어 있는 채로 query만 맞으면 '그 필터로는 실패했다'는 뜻이라 계속 스켈레톤을
  // 띄우지 않고 비운다.
  const [risk, setRisk] = useState<{ query: string; data?: RiskAnalysisByPeriod } | undefined>(
    undefined
  );

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
        qualifiedSymbols: [] as string[],
      };
    }
    // Each selected P/W trend qualifies independently against BOTH the long-term
    // profit check and the win-rate/risk-reward bar (same bar SymbolQualityFilter
    // shows) — the displayed symbol list is their union, and a parent row
    // aggregates only its qualifying trends.
    const symbolStats = reconstructSymbolStatsForProfitableSelections(
      data.buckets,
      selections,
      tradingCategories,
      qualityWinRateThreshold,
      qualityRiskRewardThreshold,
      qualityPeriod
    );
    let aggregateSymbols = symbolStats.map((row) => row.symbol.trim().toUpperCase());
    if (showFavoritesOnly) {
      aggregateSymbols = aggregateSymbols.filter((symbol) => favorites.has(symbol));
    }
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      aggregateSymbols = aggregateSymbols.filter((symbol) => symbol.includes(query));
    }
    const qualifiedSymbolSet = new Set(aggregateSymbols);
    const qualifiedSymbolStats = symbolStats.filter((row) => qualifiedSymbolSet.has(row.symbol));
    // Sum the already-qualified per-symbol rows directly instead of re-deriving
    // totals from the raw buckets with the full (unfiltered-per-symbol) selection
    // list — that would double-count trends a symbol didn't actually qualify
    // through, making these totals disagree with what the table below sums to.
    const totalStats: [ProofTotalStatsRow, ProofTotalStatsRow] = [
      {
        key: 'standard',
        label: 'Standard',
        recent30: combineProofCycleStats(qualifiedSymbolStats.map((row) => row.recent30Total)),
        recent3mo: combineProofCycleStats(qualifiedSymbolStats.map((row) => row.recent3moTotal)),
        total: combineProofCycleStats(qualifiedSymbolStats.map((row) => row.standard)),
      },
      {
        key: 'discounted',
        label: 'Discounted',
        recent30: combineProofCycleStats(
          qualifiedSymbolStats.map((row) => row.recent30Discounted)
        ),
        recent3mo: combineProofCycleStats(
          qualifiedSymbolStats.map((row) => row.recent3moDiscounted)
        ),
        total: combineProofCycleStats(qualifiedSymbolStats.map((row) => row.discounted)),
      },
    ];
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
      qualifiedSymbols: aggregateSymbols,
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

  // 연속 기록/MDD는 순서에 의존해서 proof_stats 합계로는 못 만든다 — 필터가 확정된
  // 뒤 별도 엔드포인트로 가져온다. 시드/레버리지는 비율에 곱하기만 하면 되므로
  // 의존성에 넣지 않는다(설정만 바꿨을 때 불필요한 재조회를 막는다).
  const riskQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (streams.length) params.set('streams', streams.join(','));
    if (trendModes.length) params.set('trendModes', trendModes.join(','));
    if (tradingCategories.length) params.set('categories', tradingCategories.join(','));
    if (activeStats.qualifiedSymbols.length) {
      params.set('symbols', activeStats.qualifiedSymbols.join(','));
    }
    return params.toString();
  }, [streams, trendModes, tradingCategories, activeStats.qualifiedSymbols]);

  useEffect(() => {
    // 종목이 하나도 안 남은 상태에서 부르면 서버가 전 종목을 훑게 되므로 건너뛴다.
    if (!activeStats.qualifiedSymbols.length) {
      setRisk(undefined);
      return;
    }
    const controller = new AbortController();
    void fetch(`/api/proof/risk?${riskQuery}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Risk request failed: ${response.status}`);
        return (await response.json()) as RiskAnalysisByPeriod;
      })
      .then((next) => setRisk({ query: riskQuery, data: next }))
      .catch((error: unknown) => {
        // 필터가 바뀌어 취소된 경우에는 곧바로 다음 요청이 뒤따르므로 그대로 둔다.
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('[proof] risk analysis fetch failed:', error);
        setRisk({ query: riskQuery });
      });
    return () => controller.abort();
  }, [riskQuery, activeStats.qualifiedSymbols.length]);

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
          risk={risk?.query === riskQuery ? risk.data : undefined}
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
