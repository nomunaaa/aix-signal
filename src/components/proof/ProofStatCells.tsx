import { CoinIcon } from '@/components/signals/CoinIcon';
import { FavoriteStarButton } from '@/components/common/FavoriteStarButton';
import { formatSymbolPair } from '@/views/signals/pulse/utils/formatters';
import { cn } from '@/lib/utils';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import {
  formatPct,
  formatSignedUsd,
  hasData,
  projectedPct,
  projectedUsd,
  valueTextClass,
  type ValueTone,
} from './proofFormat';

export function AssetSymbolCell({ symbol }: { symbol: string }) {
  const label = formatSymbolPair(symbol);

  return (
    <div className="flex w-full min-w-0 items-center justify-start gap-1">
      <FavoriteStarButton symbol={symbol} className="hidden sm:flex" />
      <CoinIcon symbol={symbol} size={16} className="hidden shrink-0 sm:block" />
      <span className="min-w-0 truncate text-left font-mono font-medium" title={label}>
        {label}
      </span>
    </div>
  );
}

export function HistoricalPctCell({
  slice,
  seed,
  entryRatio = 100,
  leverage = 1,
  tone = 'pnl',
}: {
  slice: ProofCycleStatsSlice;
  seed: number;
  entryRatio?: number;
  leverage?: number;
  tone?: ValueTone;
}) {
  const present = hasData(slice);
  const pct = projectedPct(slice, seed, entryRatio, leverage);
  const value = formatPct(pct, present);
  return (
    <span
      className={cn(
        'block max-w-full truncate font-mono font-semibold tabular-nums',
        valueTextClass(pct, present, tone)
      )}
      title={value}
    >
      {value}
    </span>
  );
}

export function HistoricalMoneyCell({
  slice,
  seed,
  entryRatio = 100,
  leverage = 1,
  tone = 'pnl',
}: {
  slice: ProofCycleStatsSlice;
  seed: number;
  entryRatio?: number;
  leverage?: number;
  tone?: ValueTone;
}) {
  const present = hasData(slice);
  const amount = projectedUsd(slice, seed, entryRatio, leverage);
  const value = formatSignedUsd(amount, present);
  return (
    <span
      className={cn(
        'block max-w-full truncate font-mono font-semibold tabular-nums',
        valueTextClass(amount, present, tone)
      )}
      title={value}
    >
      {value}
    </span>
  );
}
