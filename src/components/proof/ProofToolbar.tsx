import type { Ref } from 'react';
import type { EngineStats } from '@/lib/mock/proof-mock';
import { getSymbolsFromEnv } from '@/config/symbols';
import {
  TableControlBar,
  type SignalDatePeriod,
} from '@/views/signals/pulse/components/TableControlBar';
import type { ProofQualityPeriod } from './symbolQuality';

function proofPeriodToSignalPeriod(period: ProofQualityPeriod): SignalDatePeriod {
  if (period === 'last30d') return '30d';
  if (period === 'last3mo') return '90d';
  return 'all';
}

function signalPeriodToProofPeriod(period: SignalDatePeriod): ProofQualityPeriod {
  if (period === '30d') return 'last30d';
  if (period === '90d') return 'last3mo';
  return 'all';
}

export function ProofToolbar({
  engines,
  qualityPeriod,
  onQualityPeriodChange,
  containerRef,
}: {
  engines: readonly [EngineStats, EngineStats];
  qualityPeriod: ProofQualityPeriod;
  onQualityPeriodChange: (period: ProofQualityPeriod) => void;
  containerRef?: Ref<HTMLDivElement>;
}) {
  const favoriteSymbols = getSymbolsFromEnv();
  const pulseEngine = engines.find((engine) => engine.engine === 'PULSE');
  const waveEngine = engines.find((engine) => engine.engine === 'WAVE');
  const streamWinRates = {
    pulse: pulseEngine ? pulseEngine.winRate * 100 : undefined,
    wave: waveEngine ? waveEngine.winRate * 100 : undefined,
  };

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
