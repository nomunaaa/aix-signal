/**
 * ActiveColumnBadges — 전략별 활성 컬럼 배지 표시.
 *
 * STRATEGY_OPTIONAL / DATA_OPTIONAL 컬럼이 활성화되면
 * 테이블 헤더 옆에 작은 pill 배지로 표시한다.
 * 클릭 시 해당 컬럼으로 스크롤 (ensureColumnVisible).
 */

import type { RefObject } from 'react';
import type { AgGridReact } from 'ag-grid-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ActiveBadge {
  label: string;
  hint?: string;
  colId?: string;
}

interface ActiveColumnBadgesProps {
  readonly badges: ActiveBadge[];
  readonly gridRef?: RefObject<AgGridReact | null>;
}

export function ActiveColumnBadges({ badges, gridRef }: ActiveColumnBadgesProps) {
  if (badges.length === 0) return null;

  const handleClick = (colId?: string) => {
    if (!colId || !gridRef?.current?.api) return;
    gridRef.current.api.ensureColumnVisible(colId);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap items-center gap-1">
        {badges.map((badge) => (
          <Tooltip key={badge.label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => handleClick(badge.colId)}
                className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {badge.label}
              </button>
            </TooltipTrigger>
            {badge.hint && (
              <TooltipContent side="top" className="text-xs">
                {badge.hint}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
