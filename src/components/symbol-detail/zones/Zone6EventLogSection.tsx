/**
 * Zone 6 — 이벤트 로그 (event.symbol_feed Mock)
 */
import { useMemo } from 'react';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { getSymbolFeedEventsMock } from '@/lib/mock/symbol-event-feed-mock';
import { Zone6EventFeedRow } from '@/components/symbol-detail/zones/Zone6EventFeedRow';

export function Zone6EventLogSection({ symbol }: { symbol: string }) {
  const rows = useMemo(() => getSymbolFeedEventsMock(symbol), [symbol]);
  return (
    <ZoneWrapper title="이벤트 로그" color="amber">
      <ol className="space-y-2" aria-label="심볼 이벤트 피드">
        {rows.map((r) => (
          <Zone6EventFeedRow key={r.id} row={r} />
        ))}
      </ol>
    </ZoneWrapper>
  );
}
