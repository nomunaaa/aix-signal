import type { Ref } from 'react';
import { getSymbolsFromEnv } from '@/config/symbols';
import {
  TableControlBar,
  type SignalDatePeriod,
} from '@/views/signals/pulse/components/TableControlBar';
import type { ProofQualityPeriod } from './symbolQuality';

function proofPeriodToSignalPeriod(period: ProofQualityPeriod): SignalDatePeriod {
  return period === 'last30d' ? '30d' : '90d';
}

function signalPeriodToProofPeriod(period: SignalDatePeriod): ProofQualityPeriod {
  return period === '30d' ? 'last30d' : 'last3mo';
}

export function ProofToolbar({
  streamWinRates,
  qualityPeriod,
  onQualityPeriodChange,
  containerRef,
}: {
  streamWinRates: Partial<Record<'pulse' | 'wave', number>>;
  qualityPeriod: ProofQualityPeriod;
  onQualityPeriodChange: (period: ProofQualityPeriod) => void;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const favoriteSymbols = getSymbolsFromEnv();

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
        showSignalStateFilter={false}
        showStatusSummary={false}
        favoriteSymbols={favoriteSymbols}
        streamWinRates={streamWinRates}
      />
    </div>
  );
}
