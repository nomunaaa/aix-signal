import { useMemo } from 'react';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { MarketDataCard } from '@/components/symbol-detail/MarketDataCard';
import { OnchainMetricsRow } from '@/components/symbol-detail/OnchainMetricsRow';
import { getMarketDataRowMock } from '@/lib/mock/symbol-detail-mock';
import { zoneTrendHref } from '@/lib/symbol-detail/zone-nav-href';

export function Zone3MarketSection({ symbol }: { symbol: string }) {
  const row = useMemo(() => getMarketDataRowMock(symbol), [symbol]);
  return (
    <ZoneWrapper title="시장 데이터" color="blue" navHref={zoneTrendHref()} navLabel="트렌드 보러가기 →">
      <div className="space-y-1">
        <MarketDataCard data={row} />
        <OnchainMetricsRow />
      </div>
    </ZoneWrapper>
  );
}
