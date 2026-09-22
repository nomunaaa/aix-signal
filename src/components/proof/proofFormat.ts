import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import { PROOF_COPY, type ProofLanguage } from './proofCopy';

export type { ProofLanguage };

export function proofLanguageFromCode(code: string | undefined | null): ProofLanguage {
  const language = (code ?? 'ko').toLowerCase();
  if (language.startsWith('en')) return 'en';
  if (language.startsWith('ja') || language.startsWith('jp')) return 'ja';
  return 'ko';
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function formatSeed(value: number): string {
  return value.toLocaleString('en-US');
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatSignedUsd(value: number, hasData: boolean): string {
  if (!hasData || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

export function formatPct(value: number, hasData: boolean, fractionDigits = 2): string {
  if (!hasData || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatRatio(value: number | null, hasData: boolean): string {
  if (!hasData || value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

/** Combine the Standard and Discounted proof scenarios for a single UI summary. */
export function combineProofCycleStats(
  slices: readonly ProofCycleStatsSlice[]
): ProofCycleStatsSlice {
  const cycleCount = slices.reduce((sum, slice) => sum + slice.cycleCount, 0);
  const presentSlices = slices.filter((slice) => slice.cycleCount > 0);
  const ratioWeight = slices.reduce(
    (sum, slice) => sum + (slice.winLossRatio == null ? 0 : slice.cycleCount),
    0
  );
  const timestamps = slices
    .map((slice) => slice.asOfIso)
    .filter((value): value is string => Boolean(value))
    .sort();
  const fromTimestamps = slices
    .map((slice) => slice.asOfFromIso ?? slice.asOfIso)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    cycleCount,
    asOfIso: timestamps.at(-1) ?? null,
    asOfFromIso: fromTimestamps[0] ?? null,
    pnlPctSum: slices.reduce((sum, slice) => sum + slice.pnlPctSum, 0),
    pnlPerEntryNotionalRateSum: slices.reduce(
      (sum, slice) => sum + slice.pnlPerEntryNotionalRateSum,
      0
    ),
    entryLegCountSum: slices.reduce((sum, slice) => sum + slice.entryLegCountSum, 0),
    maxPnlPct: presentSlices.length ? Math.max(...presentSlices.map((slice) => slice.maxPnlPct)) : 0,
    minPnlPct: presentSlices.length ? Math.min(...presentSlices.map((slice) => slice.minPnlPct)) : 0,
    maxPnlPerEntryNotionalRate: presentSlices.length
      ? Math.max(...presentSlices.map((slice) => slice.maxPnlPerEntryNotionalRate))
      : 0,
    minPnlPerEntryNotionalRate: presentSlices.length
      ? Math.min(...presentSlices.map((slice) => slice.minPnlPerEntryNotionalRate))
      : 0,
    winRate:
      cycleCount > 0
        ? slices.reduce((sum, slice) => sum + slice.winRate * slice.cycleCount, 0) / cycleCount
        : 0,
    winLossRatio:
      ratioWeight > 0
        ? slices.reduce(
            (sum, slice) => sum + (slice.winLossRatio ?? 0) * slice.cycleCount,
            0
          ) / ratioWeight
        : null,
    avgHoldSec:
      cycleCount > 0
        ? Math.round(
            slices.reduce((sum, slice) => sum + (slice.avgHoldSec ?? 0) * slice.cycleCount, 0) /
              cycleCount
          )
        : null,
  };
}

function singleEntryNotional(seed: number, entryRatio: number, leverage: number): number {
  return seed * (entryRatio / 100) * leverage;
}

export function projectedUsd(
  slice: ProofCycleStatsSlice,
  seed: number,
  entryRatio: number,
  leverage: number
): number {
  return singleEntryNotional(seed, entryRatio, leverage) * slice.pnlPerEntryNotionalRateSum;
}

export function projectedPct(
  slice: ProofCycleStatsSlice,
  seed: number,
  entryRatio: number,
  leverage: number
): number {
  if (seed <= 0) return 0;
  return (projectedUsd(slice, seed, entryRatio, leverage) / seed) * 100;
}

export function projectedCycleUsd(
  pnlPerEntryNotionalRate: number,
  seed: number,
  entryRatio: number,
  leverage: number
): number {
  return singleEntryNotional(seed, entryRatio, leverage) * pnlPerEntryNotionalRate;
}

export function projectedCyclePct(
  pnlPerEntryNotionalRate: number,
  seed: number,
  entryRatio: number,
  leverage: number
): number {
  if (seed <= 0) return 0;
  return (projectedCycleUsd(pnlPerEntryNotionalRate, seed, entryRatio, leverage) / seed) * 100;
}

export function recoveryTime(
  monthlyProfit: number,
  monthlyFee: number,
  language: ProofLanguage
): string {
  if (!Number.isFinite(monthlyProfit) || monthlyProfit <= 0) return '—';
  const hours = (monthlyFee * 720) / monthlyProfit;
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return language === 'en' ? `${minutes}m` : `${minutes}${PROOF_COPY[language].time.minute}`;
  }

  const rounded = Math.round(hours);
  const days = Math.floor(rounded / 24);
  const restHours = rounded % 24;
  if (language === 'en') return `${days ? `${days}d ` : ''}${restHours}h`;
  const copy = PROOF_COPY[language].time;
  return `${days ? `${days}${copy.day} ` : ''}${restHours}${copy.hour}`;
}

export function hasData(slice: ProofCycleStatsSlice): boolean {
  return slice.cycleCount > 0;
}

export function formatHoldSec(
  seconds: number | null,
  hasDataValue: boolean,
  language: ProofLanguage
): string {
  if (!hasDataValue || seconds == null || !Number.isFinite(seconds)) return '—';
  const totalMinutes = Math.max(0, Math.round(seconds / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (language === 'en') {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  const copy = PROOF_COPY[language].time;
  if (days > 0) return `${days}${copy.day} ${hours}${copy.hour}`;
  if (hours > 0) return `${hours}${copy.hour} ${minutes}${copy.minute}`;
  return `${minutes}${copy.minute}`;
}

export function pnlClass(value: number, present: boolean): string {
  if (!present) return 'text-muted-foreground';
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-rose-400';
  return 'text-foreground';
}

export type ValueTone = 'pnl' | 'standard' | 'discounted';

export function valueTextClass(value: number, present: boolean, tone: ValueTone): string {
  if (!present) return 'text-muted-foreground';
  if (tone === 'standard' || tone === 'discounted') return pnlClass(value, present);
  return pnlClass(value, present);
}
