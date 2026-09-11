'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from '@/lib/navigation-compat';
import { PulseEntryGate } from './components/PulseEntryGate';
import { PulseSingleColumnLayout } from './components/PulseSingleColumnLayout';
import { KairosPanel } from './components/KairosPanel';
import { usePulseSignals } from './hooks/usePulseSignals';
import { isPulseApiEnabled, usePulseApi } from './hooks/usePulseApi';
import { usePulseRealtime } from './hooks/usePulseRealtime';
import { useSignalFilter } from './hooks/useSignalFilter';
import { usePulseStore } from './stores/pulseStore';
import { useSignalPolling } from '@/hooks/useSignalPolling';
import { buildClosedSignalsHistoryMock } from '@/lib/mock/history-cycles-mock';
import { USE_MOCK_SIGNALS } from '@/lib/env/mock';
import { useAuth } from '@/contexts/AuthContext';
import { getAllowedSymbols, getSymbolsFromEnv } from '@/config/symbols';
import { TRADING_CATEGORY_ORDER } from '@/lib/trading-category';
import { usePulseCopy } from './utils/pulseTranslations';
import { calculateOpenSignalPnl } from './utils/historyPnl';
import type { Signal } from './types/pulse.types';

const HISTORY_QUERY_PARAM_KEYS = [
  'historySymbol',
  'historyLimit',
  'historyPeriod',
  'historyFromIso',
  'historyToIso',
  'historyStreams',
  'historyTrendMode',
  'historyCategories',
  'historySort',
  'historyFocus',
] as const;

function calculateDiscountRate(signal: Signal): number {
  if (signal.entryPrice <= 0 || signal.currentPrice <= 0) return 0;
  if (signal.direction === 'long' && signal.currentPrice < signal.entryPrice) {
    return ((signal.entryPrice - signal.currentPrice) / signal.entryPrice) * 100;
  }
  if (signal.direction === 'short' && signal.currentPrice > signal.entryPrice) {
    return ((signal.currentPrice - signal.entryPrice) / signal.entryPrice) * 100;
  }
  return 0;
}

function latestDate(dates: Date[]): Date {
  const latestMs = Math.max(...dates.map((date) => date.getTime()).filter(Number.isFinite));
  return Number.isFinite(latestMs) ? new Date(latestMs) : new Date();
}

function PulseDashboardSuspenseFallback() {
  const { language } = usePulseCopy();
  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center bg-background"
      aria-busy
      aria-label={language === 'ko' ? '로딩 중' : 'Loading'}
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function PulseStreamPage() {
  return (
    <PulseEntryGate>
      <Suspense fallback={<PulseDashboardSuspenseFallback />}>
        <PulseDashboard />
      </Suspense>
    </PulseEntryGate>
  );
}

// ── 대시보드 (항상 마운트, 전략 미선택 시 Drawer 오버레이) ──

function PulseDashboard() {
  const { subscription } = useAuth();
  const [searchParams] = useSearchParams();
  const syncFromURL = usePulseStore((s) => s.syncFromURL);
  const toURLParams = usePulseStore((s) => s.toURLParams);
  const selectedStrategy = usePulseStore((s) => s.selectedStrategy);
  const selectedStream = usePulseStore((s) => s.selectedStream);
  const searchQuery = usePulseStore((s) => s.searchQuery);
  const directionFilter = usePulseStore((s) => s.directionFilter);
  const sortBy = usePulseStore((s) => s.sortBy);
  const sortDir = usePulseStore((s) => s.sortDir);
  const showFavoritesOnly = usePulseStore((s) => s.showFavoritesOnly);
  const signalStateFilter = usePulseStore((s) => s.signalStateFilter);
  const trendModeFilter = usePulseStore((s) => s.trendModeFilter);
  const tradingCategoryFilters = usePulseStore((s) => s.tradingCategoryFilters);
  const isKairosOpen = usePulseStore((s) => s.isKairosOpen);
  const setKairosOpen = usePulseStore((s) => s.setKairosOpen);
  const allowedSymbols = useMemo(() => getAllowedSymbols(subscription.plan), [subscription.plan]);
  const favoriteSymbols = useMemo(() => getSymbolsFromEnv(), []);
  const allowedSymbolSet = useMemo(() => new Set(allowedSymbols), [allowedSymbols]);
  const pulseApiEnabled = isPulseApiEnabled();

  useEffect(() => {
    syncFromURL(searchParams);
  }, []);

  // Keep URL in sync with filter/sort/strategy
  useEffect(() => {
    const params = toURLParams();
    for (const key of HISTORY_QUERY_PARAM_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    const str = params.toString();
    if (str !== searchParams.toString()) {
      // Next.js router(setSearchParams)를 쓰면 검색 파라미터 변경만으로도 RSC 왕복 +
      // 리렌더가 일어나 스크롤 위치가 튄다(필터 하나 누를 때마다 화면이 맨 위로).
      // 이 URL은 마운트 시 syncFromURL이 한 번 읽을 뿐인 "공유용 기록"이므로,
      // 네비게이션 없이 주소창만 갱신하는 history.replaceState로 충분하다.
      window.history.replaceState(
        window.history.state,
        '',
        str ? `${window.location.pathname}?${str}` : window.location.pathname
      );
    }
  }, [
    selectedStrategy,
    selectedStream,
    searchQuery,
    directionFilter,
    sortBy,
    sortDir,
    showFavoritesOnly,
    signalStateFilter,
    trendModeFilter,
    tradingCategoryFilters,
  ]);

  const pulseApi = usePulseApi({
    strategyId: 'full',
    stream: 'pulse',
    enabled: pulseApiEnabled && allowedSymbols.length > 0,
  });
  const waveApi = usePulseApi({
    strategyId: 'full',
    stream: 'wave',
    enabled: pulseApiEnabled && allowedSymbols.length > 0,
  });

  const refetchBothStreamsAsync = useCallback(async () => {
    if (!pulseApiEnabled || allowedSymbols.length === 0) return;
    await Promise.all([pulseApi.refetch?.(), waveApi.refetch?.()]);
  }, [allowedSymbols.length, pulseApi.refetch, pulseApiEnabled, waveApi.refetch]);

  useSignalPolling({
    stream: selectedStream,
    refetchSignals: refetchBothStreamsAsync,
    intervalMs: 10_000,
  });
  // usePulseRealtime의 30초 폴링은 위 useSignalPolling의 10초 폴링과 동일한
  // refetch를 중복 호출했다(10초 주기가 30초 주기를 이미 포함) — refetch를
  // 넘기지 않으면 내부적으로 인터벌을 만들지 않는다(usePulseRealtime.ts 참고).
  const { isReconnecting } = usePulseRealtime({
    enabled:
      pulseApiEnabled && allowedSymbols.length > 0 && (!!pulseApi.refetch || !!waveApi.refetch),
  });
  const legacyPulse = usePulseSignals(allowedSymbols, 'pulse', 'full');
  const legacyWave = usePulseSignals(allowedSymbols, 'wave', 'full');

  const usePulseApiData = pulseApi.isEnabled && !pulseApi.isLoading && !pulseApi.isError;
  const useWaveApiData = waveApi.isEnabled && !waveApi.isLoading && !waveApi.isError;
  const openSignalsForPanel = useMemo(
    () =>
      [
        ...(usePulseApiData ? pulseApi.openSignals : legacyPulse.signals),
        ...(useWaveApiData ? waveApi.openSignals : legacyWave.signals),
      ].filter((s) => allowedSymbolSet.has(s.symbol)),
    [
      allowedSymbolSet,
      legacyPulse.signals,
      legacyWave.signals,
      pulseApi.openSignals,
      usePulseApiData,
      useWaveApiData,
      waveApi.openSignals,
    ]
  );
  const closedSignalsRaw = useMemo(
    () =>
      [...legacyPulse.closedSignals, ...legacyWave.closedSignals].filter((s) =>
        allowedSymbolSet.has(s.symbol)
      ),
    [allowedSymbolSet, legacyPulse.closedSignals, legacyWave.closedSignals]
  );
  const closedSignalsForPanel = useMemo(() => {
    if (USE_MOCK_SIGNALS && closedSignalsRaw.length === 0 && allowedSymbols.length > 0) {
      return buildClosedSignalsHistoryMock(150)
        .filter((s) => allowedSymbolSet.has(s.symbol))
        .map((s, index) => ({
          ...s,
          barinterval: index % 2 === 0 ? ('1m' as const) : ('10m' as const),
          tradingCategory: TRADING_CATEGORY_ORDER[index % TRADING_CATEGORY_ORDER.length],
        }));
    }
    return closedSignalsRaw;
  }, [allowedSymbolSet, allowedSymbols.length, closedSignalsRaw]);
  const lastUpdateForPanel = latestDate([
    usePulseApiData ? pulseApi.asOf : legacyPulse.lastUpdate,
    useWaveApiData ? waveApi.asOf : legacyWave.lastUpdate,
  ]);
  // 실제로 화면에 보여줄 오픈 시그널이 아직 하나도 없고, 관련 소스가 여전히
  // 불러오는 중일 때만 스켈레톤을 보여준다 — 이미 데이터가 있으면 리페치 중에도
  // 깜빡이지 않는다.
  const panelLoading =
    openSignalsForPanel.length === 0 &&
    ((pulseApiEnabled && (pulseApi.isLoading || waveApi.isLoading)) ||
      legacyPulse.isLoading ||
      legacyWave.isLoading);

  const total24hSignals = legacyPulse.total24hSignals + legacyWave.total24hSignals;
  const closedSignalsTotalCount =
    legacyPulse.closedSignalsTotalCount + legacyWave.closedSignalsTotalCount;

  const legacyPriceMap = useMemo(() => {
    const prices = new Map<string, number>();
    for (const signal of [...legacyPulse.signals, ...legacyWave.signals]) {
      if (Number.isFinite(signal.currentPrice) && signal.currentPrice > 0) {
        prices.set(signal.symbol, signal.currentPrice);
      }
    }
    return prices;
  }, [legacyPulse.signals, legacyWave.signals]);

  // API rows keep their section fields; centralized useSignalCycles provides the live price snapshot.
  const openWithLivePrices = useMemo(() => {
    return openSignalsForPanel.map((s) => {
      const livePrice = legacyPriceMap.get(s.symbol);
      const currentPrice =
        livePrice !== null && livePrice !== undefined && Number.isFinite(livePrice) && livePrice > 0
          ? livePrice
          : s.currentPrice;
      const next = { ...s, currentPrice } as Signal;
      const pnlPercent = s.entryPrice > 0 ? calculateOpenSignalPnl(next).pnlPercent : s.pnlPercent;
      next.pnlPercent = pnlPercent;
      return { ...next, discountRate: calculateDiscountRate(next) } as typeof s;
    });
  }, [legacyPriceMap, openSignalsForPanel]);

  const { filtered: filteredOpen, showDiscount, showLocked } = useSignalFilter(openWithLivePrices);

  return (
    <>
      <PulseSingleColumnLayout
        openSignals={filteredOpen}
        closedSignals={closedSignalsForPanel}
        closedSignalsTotalCount={closedSignalsTotalCount}
        showDiscount={showDiscount}
        showLocked={showLocked}
        lastUpdate={lastUpdateForPanel}
        openSignalsLoading={panelLoading}
        isReconnecting={isReconnecting}
        total24hSignals={total24hSignals}
        allowedSymbols={allowedSymbols}
        favoriteSymbols={favoriteSymbols}
      />

      <KairosPanel open={isKairosOpen} onOpenChange={setKairosOpen} />
    </>
  );
}
