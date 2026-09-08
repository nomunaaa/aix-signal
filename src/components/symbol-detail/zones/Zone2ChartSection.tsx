import { ChartCard } from '@/components/symbol-detail/ChartCard';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { zoneChartHref } from '@/lib/symbol-detail/zone-nav-href';

export function Zone2ChartSection({ symbol }: { symbol: string }) {
  return (
    <ZoneWrapper
      title="차트"
      color="amber"
      navHref={zoneChartHref(symbol)}
      navLabel="차트 전체화면 →"
    >
      <ChartCard symbol={symbol} />
    </ZoneWrapper>
  );
}
