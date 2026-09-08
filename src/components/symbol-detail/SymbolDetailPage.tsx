import { useNavigate } from '@/lib/navigation-compat';
import { Button } from '@/components/ui/button';
import { SymbolHeader } from '@/components/symbol-detail/SymbolHeader';
import { ArrowLeft } from '@/lib/icons';
import { Zone1SignalSection } from '@/components/symbol-detail/zones/Zone1SignalSection';
import { Zone2ChartSection } from '@/components/symbol-detail/zones/Zone2ChartSection';
import { Zone3MarketSection } from '@/components/symbol-detail/zones/Zone3MarketSection';
import { Zone4InsightsSection } from '@/components/symbol-detail/zones/Zone4InsightsSection';
import { Zone5HistorySection } from '@/components/symbol-detail/zones/Zone5HistorySection';
import { Zone6EventLogSection } from '@/components/symbol-detail/zones/Zone6EventLogSection';
import { useSymbolUniverseOutlier } from '@/hooks/useSymbolUniverseOutlier';
import { isMockTrendV8Enabled } from '@/lib/trend-v8/mock-trend-flag';
import { getRatingGaugeForSymbol } from '@/lib/trend-v8/build-rating-gauge-mock';
import { RatingGaugeSection } from '@/components/symbol-detail/RatingGaugeSection';

export function SymbolDetailPage({ symbol }: { symbol: string }) {
  const navigate = useNavigate();
  const { isOutlier } = useSymbolUniverseOutlier(symbol);
  const display = symbol.replace('USDT', '');

  return (
    <div className="container mx-auto space-y-4 px-4 py-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-mono text-lg font-bold text-foreground sm:text-xl">
            <span>{display}</span>
            <span className="text-sm font-normal text-muted-foreground">/USDT</span>
          </h1>
        </div>
        <p className="pl-10 text-sm text-muted-foreground">종목 상세</p>
      </div>

      <SymbolHeader symbol={symbol} />

      {isMockTrendV8Enabled() ? <RatingGaugeSection data={getRatingGaugeForSymbol(symbol)} /> : null}

      <Zone1SignalSection symbol={symbol} />
      <Zone2ChartSection symbol={symbol} />
      <Zone3MarketSection symbol={symbol} />
      <Zone4InsightsSection symbol={symbol} isOutlier={isOutlier} />
      <Zone5HistorySection symbol={symbol} />
      <Zone6EventLogSection symbol={symbol} />
    </div>
  );
}
