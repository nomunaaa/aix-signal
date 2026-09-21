import type { ReactNode, Ref } from 'react';
import { getSymbolsFromEnv } from '@/config/symbols';
import {
  TableControlBar,
  type SignalDatePeriod,
} from '@/views/signals/pulse/components/TableControlBar';
import type { ProofQualityPeriod } from './symbolQuality';

function proofPeriodToSignalPeriod(period: ProofQualityPeriod): SignalDatePeriod {
  return period === 'last30d' ? '30d' : period === 'last3mo' ? '90d' : 'all';
}

function signalPeriodToProofPeriod(period: SignalDatePeriod): ProofQualityPeriod {
  return period === '30d' ? 'last30d' : period === '90d' ? 'last3mo' : 'all';
}

export function ProofToolbar({
  streamWinRates,
  qualityPeriod,
  onQualityPeriodChange,
  containerRef,
  favoriteSymbols,
  renderStreamOptionSelector,
  renderFavoriteScopeAddon,
  streamSummaryOverride,
  compactSimulationTrigger,
}: {
  streamWinRates: Partial<Record<'pulse' | 'wave', number>>;
  qualityPeriod: ProofQualityPeriod;
  onQualityPeriodChange: (period: ProofQualityPeriod) => void;
  containerRef?: Ref<HTMLDivElement>;
  favoriteSymbols?: readonly string[];
  renderStreamOptionSelector?: (className?: string) => ReactNode;
  renderFavoriteScopeAddon?: (className?: string) => ReactNode;
  streamSummaryOverride?: string;
  compactSimulationTrigger?: boolean;
}) {
  const resolvedFavoriteSymbols = favoriteSymbols ?? getSymbolsFromEnv();

  return (
    <div
      ref={containerRef}
      className="sticky z-40 -mx-4 border-b border-border/40 bg-background/95 backdrop-blur md:-mx-5"
      style={{ top: 'var(--header-height)' }}
    >
      <TableControlBar
        className="mx-auto w-full max-w-[1400px]"
        datePeriod={proofPeriodToSignalPeriod(qualityPeriod)}
        onDatePeriodChange={(period) => onQualityPeriodChange(signalPeriodToProofPeriod(period))}
        datePeriods={['30d', '90d', 'all']}
        showSignalStateFilter={false}
        showStatusSummary={false}
        favoriteSymbols={resolvedFavoriteSymbols}
        streamWinRates={streamWinRates}
        useStreamOptionSelector
        renderStreamOptionSelector={renderStreamOptionSelector}
        renderFavoriteScopeAddon={renderFavoriteScopeAddon}
        streamSummaryOverride={streamSummaryOverride}
        compactSimulationTrigger={compactSimulationTrigger}
      />
    </div>
  );
}
