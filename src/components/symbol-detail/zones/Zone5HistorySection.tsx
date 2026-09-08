import { useMemo, useState } from 'react';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { CycleHistoryCard } from '@/components/symbol-detail/CycleHistoryCard';
import { SymbolPeriodStatsTable } from '@/components/symbol-detail/SymbolPeriodStatsTable';
import { Zone5CycleStrip } from '@/components/symbol-detail/zones/Zone5CycleStrip';
import { CycleStrategyDrawer } from '@/components/shared/CycleStrategyDrawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  getCycleHistorySummaryMock,
  getCycleTimelineMock,
  getPeriodStatsTable,
} from '@/lib/mock/symbol-detail-mock';
import type { ClosedSignal } from '@/views/signals/pulse/types/pulse.types';
import {
  cycleDrawerFromClosedSignal,
  mockStrategyVariantsForClosedSignal,
} from '@/lib/mock/cycle-strategies';

function cycleBarToClosed(
  symbol: string,
  ix: number,
  bar: { dir: 'LONG' | 'SHORT'; pnlPct: number; holdMin: number },
): ClosedSignal {
  const base = 100 + (ix * 13) % 900;
  const exit = base * (1 + bar.pnlPct / 100);
  return {
    id: `${symbol}-zone5-${ix}`,
    symbol,
    direction: bar.dir === 'LONG' ? 'long' : 'short',
    entryPrice: base,
    exitPrice: Math.round(exit * 100) / 100,
    pnlPercent: bar.pnlPct,
    holdDuration: `${Math.floor(bar.holdMin / 60)}시간 ${bar.holdMin % 60}분`,
    closedAt: new Date().toISOString(),
    discountGain: 0,
    lockedAmount: 0,
    averageEntryPrice: base,
    enteredAt: new Date(Date.now() - bar.holdMin * 60_000).toISOString(),
  };
}

export function Zone5HistorySection({ symbol }: { symbol: string }) {
  const cycle = useMemo(() => getCycleHistorySummaryMock(symbol), [symbol]);
  const rows = useMemo(() => getPeriodStatsTable(symbol), [symbol]);
  const cycles = useMemo(() => getCycleTimelineMock(symbol), [symbol]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cycleIx, setCycleIx] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const closedDemo = useMemo(() => {
    if (cycleIx == null) return null;
    const bar = cycles[cycleIx];
    if (!bar) return null;
    return cycleBarToClosed(symbol, cycleIx, bar);
  }, [symbol, cycleIx, cycles]);

  return (
    <>
      <ZoneWrapper title="히스토리" color="gray">
        <div className="space-y-4">
          <CycleHistoryCard symbol={symbol} data={cycle} />
          <Zone5CycleStrip
            cycles={cycles}
            onSelect={(i) => {
              setCycleIx(i);
              setDrawerOpen(true);
            }}
          />
          <SymbolPeriodStatsTable rows={rows} />
        </div>
      </ZoneWrapper>
      {closedDemo ? (
        <CycleStrategyDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          cycle={cycleDrawerFromClosedSignal(closedDemo)}
          strategies={mockStrategyVariantsForClosedSignal(closedDemo)}
          mode={isMobile ? 'mobile' : 'desktop'}
        />
      ) : null}
    </>
  );
}
