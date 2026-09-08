import { ChevronRight } from 'lucide-react';
import { Link } from '@/lib/navigation-compat';
import { cn } from '@/lib/utils';
import type { ProofStatsStream, ProofStatsTrendMode } from '@/lib/mock/proof-mock';
import { TRADING_CATEGORY_ORDER, type TradingCategory } from '@/lib/trading-category';
import { exactHistoryPeriodRange } from '@/views/signals/pulse/utils/historyDateRange';

export const ALL_STREAMS: ProofStatsStream[] = ['PULSE', 'WAVE'];
export const ALL_TREND_MODES: ProofStatsTrendMode[] = ['trend', 'nonTrend', 'reversal'];

export const PROOF_STREAM_TO_HISTORY_STREAM: Record<ProofStatsStream, 'pulse' | 'wave'> = {
  PULSE: 'pulse',
  WAVE: 'wave',
};

function signalBoardHistoryHref({
  symbol,
  count,
  period,
  asOfIso,
  streams,
  trendModes,
  tradingCategories,
}: {
  symbol: string;
  count: number;
  period: '30d' | '90d' | 'all';
  asOfIso?: string | null;
  streams: readonly ProofStatsStream[];
  trendModes: readonly ProofStatsTrendMode[];
  tradingCategories: readonly TradingCategory[];
}): string {
  const historyStreams = streams.map((stream) => PROOF_STREAM_TO_HISTORY_STREAM[stream]);
  const params = new URLSearchParams({
    historySymbol: symbol,
    historyLimit: String(Math.max(1, count)),
    historyPeriod: period,
    historyStreams: historyStreams.join(','),
    historySort: 'recent_closed',
    historyFocus: '1',
  });
  const exactRange = exactHistoryPeriodRange(period, asOfIso);

  if (exactRange) {
    if (exactRange.fromIso) {
      params.set('historyFromIso', exactRange.fromIso);
    }
    params.set('historyToIso', exactRange.toIso);
  }

  if (trendModes.length < ALL_TREND_MODES.length) {
    params.set('historyTrendMode', trendModes.join(','));
  }

  if (tradingCategories.length < TRADING_CATEGORY_ORDER.length) {
    params.set('historyCategories', tradingCategories.join(','));
  }

  return `/signals/pulse?${params.toString()}`;
}

export function HistoryEntryCountLink({
  symbol,
  count,
  period,
  asOfIso,
  streams,
  trendModes,
  tradingCategories,
  className,
}: {
  symbol: string;
  count: number;
  period: '30d' | '90d' | 'all';
  asOfIso?: string | null;
  streams: readonly ProofStatsStream[];
  trendModes: readonly ProofStatsTrendMode[];
  tradingCategories: readonly TradingCategory[];
  className?: string;
}) {
  if (count <= 0) return <span>0</span>;

  return (
    <Link
      to={signalBoardHistoryHref({
        symbol,
        count,
        period,
        asOfIso,
        streams,
        trendModes,
        tradingCategories,
      })}
      className={cn(
        'inline-flex min-w-0 max-w-full items-center justify-end gap-0.5 rounded px-1 py-0.5 text-right font-mono font-semibold tabular-nums text-foreground underline-offset-2 hover:bg-muted/60 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      aria-label={`${symbol} recently closed signal history, ${count} entries`}
    >
      <span className="min-w-0 truncate">{count}</span>
      <ChevronRight
        className="hidden h-3 w-3 shrink-0 text-muted-foreground sm:block"
        aria-hidden
      />
    </Link>
  );
}
