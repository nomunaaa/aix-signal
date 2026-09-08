'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from '@/lib/navigation-compat';
import type { HistoryFilters } from '@/lib/my/types';
import type { ProofPeriod } from '@/lib/mock/proof-mock';

const VALID_PERIODS: ProofPeriod[] = ['7d', '30d', '90d', 'all'];
const VALID_ENGINES = ['ALL', 'PULSE', 'WAVE'] as const;
const VALID_STRATEGIES = ['ALL', 'basic', 'dca', 'partial_exit', 'dca_partial'] as const;

function parsePeriod(val: string | null): ProofPeriod {
  return VALID_PERIODS.includes(val as ProofPeriod) ? (val as ProofPeriod) : '30d';
}

function parseEngine(val: string | null): HistoryFilters['engine'] {
  return VALID_ENGINES.includes(val as (typeof VALID_ENGINES)[number])
    ? (val as HistoryFilters['engine'])
    : 'ALL';
}

function parseStrategy(val: string | null): HistoryFilters['strategy'] {
  return VALID_STRATEGIES.includes(val as (typeof VALID_STRATEGIES)[number])
    ? (val as HistoryFilters['strategy'])
    : 'ALL';
}

export function useHistoryFiltersUrl(): [HistoryFilters, (patch: Partial<HistoryFilters>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo<HistoryFilters>(
    () => ({
      period: parsePeriod(searchParams.get('period')),
      symbol: searchParams.get('symbol') ?? 'ALL',
      strategy: parseStrategy(searchParams.get('strategy')),
      engine: parseEngine(searchParams.get('engine')),
      signalCycleId: searchParams.get('signal') ?? 'ALL',
    }),
    [searchParams]
  );

  const setFilters = useCallback(
    (patch: Partial<HistoryFilters>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (patch.period !== undefined) next.set('period', patch.period);
          if (patch.symbol !== undefined) {
            if (patch.symbol === 'ALL') next.delete('symbol');
            else next.set('symbol', patch.symbol);
          }
          if (patch.strategy !== undefined) {
            if (patch.strategy === 'ALL') next.delete('strategy');
            else next.set('strategy', patch.strategy);
          }
          if (patch.engine !== undefined) {
            if (patch.engine === 'ALL') next.delete('engine');
            else next.set('engine', patch.engine);
          }
          if (patch.signalCycleId !== undefined) {
            if (patch.signalCycleId === 'ALL') next.delete('signal');
            else next.set('signal', patch.signalCycleId);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return [filters, setFilters];
}
