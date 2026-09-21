'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import {
  reconstructSymbolStats,
  reconstructTotalStatsForSymbols,
  type ProofStatsSelection,
} from '@/lib/proof/proof-buckets';
import { buildEmptyProofPage } from '@/lib/proof/build-proof-page-data';
import { emptyStatsSlice } from '@/lib/proof/proof-stats';
import type { ProofPageMock, ProofStatsStream, ProofStatsTrendMode, ProofTotalStatsRow } from '@/lib/mock/proof-mock';
import { DEFAULT_SHARED_SIMULATION_INPUT } from '@/lib/simulationStorage';
import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import { StreamSelector } from '@/views/signals/pulse/components/StreamSelector';
import { SIGNAL_OPTION_BADGE_CLASS, signalOptionTone } from '@/views/signals/pulse/utils/streamSelector';
import type { SignalStreamOptionId } from '@/views/signals/pulse/types/pulse.types';
import { HistorySymbolCountLink } from '@/components/proof/HistoryEntryCountLink';
import { HistoricalMoneyCell, HistoricalPctCell } from '@/components/proof/ProofStatCells';
import { formatHoldSec, formatRatio, proofLanguageFromCode } from '@/components/proof/proofFormat';
import { formatWinRate } from '@/lib/proof/format-proof';
import { PROOF_COPY } from '@/components/proof/proofCopy';
import { SymbolQualityFilter } from '@/components/proof/SymbolQualityFilter';
import {
  hasPositiveLongTermProfit,
  meetsQualityThresholdsForPeriod,
  type ProofQualityPeriod,
} from '@/components/proof/symbolQuality';
import { FavoriteScopeControls } from '@/views/signals/pulse/components/FavoriteScopeControls';

const OPTIONS: readonly { id: SignalStreamOptionId; group: string; selection?: ProofStatsSelection }[] = [
  { id: 'P1', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'reversal' } },
  { id: 'P2', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'trend' } },
  { id: 'P3', group: 'Pulse', selection: { stream: 'PULSE', trendMode: 'nonTrend' } },
  { id: 'B1', group: 'Beat' }, { id: 'B2', group: 'Beat' }, { id: 'B3', group: 'Beat' },
  { id: 'W1', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'reversal' } },
  { id: 'W2', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'trend' } },
  { id: 'W3', group: 'Wave', selection: { stream: 'WAVE', trendMode: 'nonTrend' } },
];

type SelectionOptionStats = {
  row: ProofTotalStatsRow | null;
  symbolCount: number;
  symbols: string[];
};

function MetricCells({
  slice,
  symbols,
  selection,
  id,
  period,
  language,
}: {
  slice: ProofPageMock['totalStats'][0]['total'];
  symbols: string[];
  selection?: ProofStatsSelection;
  id: SignalStreamOptionId;
  period: '30d' | '90d' | 'all';
  language: 'ko' | 'en' | 'ja';
}) {
  const present = slice.cycleCount > 0;
  const streams: ProofStatsStream[] = selection ? [selection.stream] : [];
  const trends: ProofStatsTrendMode[] = selection ? [selection.trendMode] : [];
  return <>
    <td className="border-l border-border/60 px-1 py-3 text-right">
      <HistorySymbolCountLink
        symbols={symbols}
        count={Math.max(1, slice.cycleCount)}
        period={period}
        asOfIso={slice.asOfIso}
        streams={streams}
        trendModes={trends}
        tradingCategories={['E2X2']}
        signalOptions={[id]}
      />
    </td>
    <td className="px-1 py-3 text-right"><HistoricalPctCell slice={slice} seed={DEFAULT_SHARED_SIMULATION_INPUT.capital} entryRatio={DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio} leverage={DEFAULT_SHARED_SIMULATION_INPUT.leverage} tone="standard" /></td>
    <td className="px-1 py-3 text-right"><HistoricalMoneyCell slice={slice} seed={DEFAULT_SHARED_SIMULATION_INPUT.capital} entryRatio={DEFAULT_SHARED_SIMULATION_INPUT.capitalRatio} leverage={DEFAULT_SHARED_SIMULATION_INPUT.leverage} tone="standard" /></td>
    <td className="px-1 py-3 text-right font-mono font-semibold">{present ? formatWinRate(slice.winRate) : '—'}</td>
    <td className="px-1 py-3 text-right font-mono font-semibold">{formatRatio(slice.winLossRatio, present)}</td>
    <td className="px-1 py-3 text-right font-mono font-semibold">{formatHoldSec(slice.avgHoldSec, present, language)}</td>
  </>;
}

export function SelectionPageView() {
  const { i18n } = useTranslation();
  const language = proofLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  const copy = PROOF_COPY[language];
  const optionFilter = usePulseStore((state) => state.streamOptionFilter);
  const favorites = usePulseStore((state) => state.favorites);
  const showFavoritesOnly = usePulseStore((state) => state.showFavoritesOnly);
  const qualityWinRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const qualityRiskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const [data, setData] = useState<ProofPageMock>(() => buildEmptyProofPage('30d'));
  const [qualityPeriod, setQualityPeriod] = useState<ProofQualityPeriod>('last30d');
  useEffect(() => { void fetch('/api/proof').then((response) => response.ok ? response.json() as Promise<ProofPageMock> : Promise.reject()).then(setData).catch(() => undefined); }, []);
  const allSymbols = useMemo(() => Array.from(new Set([
    ...Object.keys(data.buckets.bySymbolTotal),
    ...Object.keys(data.buckets.bySymbolRecent30),
    ...Object.keys(data.buckets.bySymbolRecent3mo),
  ])), [data.buckets]);
  const stats = useMemo(() => new Map<SignalStreamOptionId, SelectionOptionStats>(
    OPTIONS.map((option): [SignalStreamOptionId, SelectionOptionStats] => {
      if (!option.selection) return [option.id, { row: null, symbolCount: 0, symbols: [] }];
      const rows = reconstructSymbolStats(data.buckets, [option.selection.stream], [option.selection.trendMode], ['E2X2'], [option.selection]);
      // Same bar as the Proof page's symbol table: a symbol must be profitable
      // long-term AND meet the win-rate/risk-reward threshold, not just one or
      // the other — otherwise a losing symbol could still pass on ratio alone.
      const symbols = rows
        .filter(
          (row) =>
            hasPositiveLongTermProfit(row) &&
            meetsQualityThresholdsForPeriod(
              row,
              qualityWinRateThreshold,
              qualityRiskRewardThreshold,
              qualityPeriod
            )
        )
        .map((row) => row.symbol.trim().toUpperCase())
        .filter((symbol) => !showFavoritesOnly || favorites.has(symbol));
      return [option.id, {
        row: reconstructTotalStatsForSymbols(data.buckets, symbols, [option.selection.stream], [option.selection.trendMode], ['E2X2'], [option.selection])[0],
        symbolCount: symbols.length,
        symbols,
      }];
    })
  ), [
    data.buckets,
    favorites,
    qualityPeriod,
    qualityRiskRewardThreshold,
    qualityWinRateThreshold,
    showFavoritesOnly,
  ]);
  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] bg-background px-4 py-8 pb-20 text-foreground md:px-5">
      <div
        className="sticky z-40 -mx-4 mb-8 border-b border-border/40 bg-background/95 px-4 py-2 backdrop-blur md:-mx-5 md:px-5"
        style={{ top: 'var(--header-height)' }}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
          <FavoriteScopeControls symbols={allSymbols} />
          <StreamSelector />
          <SymbolQualityFilter
            copy={copy}
            period={qualityPeriod}
            onPeriodChange={setQualityPeriod}
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-[10px] xl:text-xs">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[5%]" />
            {Array.from({ length: 18 }).map((_, index) => (
              <col key={index} className="w-[4.83%]" />
            ))}
          </colgroup>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th rowSpan={2} className="px-2 py-2">
                Signal
              </th>
              <th rowSpan={2} className="px-2 py-2">
                Trend
              </th>
              <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                Last 30 days
              </th>
              <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                Last 3 months
              </th>
              <th colSpan={6} className="border-l border-border/60 px-1 py-2">
                All time
              </th>
            </tr>
            <tr>
              {[
                'Symbols',
                'Account Return',
                'Account Profit',
                'Win Rate',
                'Ratio',
                'Hold Time',
              ].map((label) => (
                <Fragment key={label}>
                  <th className="border-l border-border/60 px-1 py-2">{label}</th>
                </Fragment>
              ))}
              {[
                'Symbols',
                'Account Return',
                'Account Profit',
                'Win Rate',
                'Ratio',
                'Hold Time',
              ].map((label) => (
                <th key={`3-${label}`} className="border-l border-border/60 px-1 py-2">
                  {label}
                </th>
              ))}
              {[
                'Symbols',
                'Account Return',
                'Account Profit',
                'Win Rate',
                'Ratio',
                'Hold Time',
              ].map((label) => (
                <th key={`a-${label}`} className="border-l border-border/60 px-1 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {OPTIONS.map((option, index) => {
              const entry = stats.get(option.id);
              const row = entry?.row ?? null;
              const symbols = entry?.symbols ?? [];
              const selected = optionFilter[option.id];
              return (
                <tr
                  key={option.id}
                  className={cn(
                    'transition-colors',
                    selected && 'bg-yellow-100/80 dark:bg-yellow-500/15'
                  )}
                >
                  <td className="px-2 py-3 font-semibold">{index % 3 === 0 ? option.group : ''}</td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold',
                        SIGNAL_OPTION_BADGE_CLASS[signalOptionTone(option.id)]
                      )}
                    >
                      {option.id}
                    </span>
                  </td>
                  <MetricCells
                    slice={row?.recent30 ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="30d"
                    language={language}
                  />
                  <MetricCells
                    slice={row?.recent3mo ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="90d"
                    language={language}
                  />
                  <MetricCells
                    slice={row?.total ?? emptyStatsSlice()}
                    symbols={symbols}
                    selection={option.selection}
                    id={option.id}
                    period="all"
                    language={language}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
