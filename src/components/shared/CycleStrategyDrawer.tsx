'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CycleDrawerCycle, StrategyVariant } from '@/types/cycleStrategyDrawer';
import { CycleStrategyPanel } from './cycle-strategy/CycleStrategyPanel';

export { CycleStrategyPanel } from './cycle-strategy/CycleStrategyPanel';

export interface CycleStrategyDrawerProps {
  cycle: CycleDrawerCycle;
  strategies: StrategyVariant[];
  /** 데스크톱: 우측 시트 · 모바일: 하단 시트 */
  mode: 'desktop' | 'mobile';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CycleStrategyDrawer({
  cycle,
  strategies,
  mode,
  open,
  onOpenChange,
}: Readonly<CycleStrategyDrawerProps>) {
  const side = mode === 'mobile' ? 'bottom' : 'right';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          mode === 'mobile'
            ? 'max-h-[85vh] overflow-y-auto border-border bg-background p-4 sm:max-w-full'
            : 'w-full max-w-md border-border bg-background p-4 sm:max-w-md'
        }
      >
        <SheetHeader className="space-y-1 text-left">
          <SheetTitle className="text-base">사이클 전략 비교</SheetTitle>
          <SheetDescription className="text-xs">
            원샷·변형 포함 4전략 시뮬 — 승리 여부 후 수익률 순으로 정렬된 데모입니다. 행별로 비교하려면 카드를 탭하세요.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <CycleStrategyPanel cycle={cycle} strategies={strategies} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
