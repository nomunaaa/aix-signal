import type { CycleDrawerCycle, StrategyVariant } from '@/types/cycleStrategyDrawer';
import { CycleStrategyHeader } from './CycleStrategyHeader';
import { StrategyVariantCard } from './StrategyVariantCard';

/** 4전략 스택 — 드로어·종목상세에서 공유 */
export function CycleStrategyPanel({
  cycle,
  strategies,
}: {
  cycle: CycleDrawerCycle;
  strategies: StrategyVariant[];
}) {
  const topId = strategies[0]?.id;
  return (
    <div className="flex max-h-[min(70vh,560px)] flex-col gap-3 overflow-y-auto pr-1">
      <CycleStrategyHeader cycle={cycle} />
      <p className="text-xs font-medium text-muted-foreground">전략별 시뮬 (승률 우선, 그다음 수익률)</p>
      <div className="flex flex-col gap-2">
        {strategies.map((v, i) => (
          <StrategyVariantCard
            key={v.id}
            v={v}
            rank={i + 1}
            showCrown={v.id === topId && strategies.length > 0}
          />
        ))}
      </div>
    </div>
  );
}
