import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SymbolStatsSortKey =
  | 'symbol'
  | 'recent30:entries'
  | 'recent30:pnl'
  | 'recent30:accountProfit'
  | 'recent30:winRate'
  | 'recent30:avgRatio'
  | 'recent30:holdTime'
  | 'recent3mo:entries'
  | 'recent3mo:pnl'
  | 'recent3mo:accountProfit'
  | 'recent3mo:winRate'
  | 'recent3mo:avgRatio'
  | 'recent3mo:holdTime'
  | 'total:entries'
  | 'total:pnl'
  | 'total:accountProfit'
  | 'total:winRate'
  | 'total:avgRatio'
  | 'total:holdTime';

const HEADER_LINE_PARTS: Record<string, string[]> = {
  'Account Return': ['Account', 'Return'],
  'Account Profit': ['Account', 'Profit'],
  'Avg Win Rate': ['Avg', 'Win Rate'],
  'Avg P/L Ratio': ['Avg', 'P/L Ratio'],
  'Avg Hold Time': ['Avg', 'Hold Time'],
  Symbol: ['Symbol'],
  계좌수익률: ['계좌', '수익률'],
  계좌수익금: ['계좌', '수익금'],
  진입횟수: ['진입', '횟수'],
  평균승률: ['평균', '승률'],
  평균손익비: ['평균', '손익비'],
  평균보유시간: ['평균', '보유시간'],
  종목: ['종목'],
  収益率: ['収益', '率'],
  口座収益率: ['口座', '収益率'],
  口座収益額: ['口座', '収益額'],
  平均勝率: ['平均', '勝率'],
  平均損益比: ['平均', '損益比'],
  平均保有時間: ['平均', '保有時間'],
  銘柄: ['銘柄'],
};

export function TableHeaderLabel({ label }: { label: string }) {
  const parts = HEADER_LINE_PARTS[label.trim()] ?? [label];

  if (parts.length === 1) {
    return (
      <span className="block max-w-full overflow-hidden text-ellipsis whitespace-normal leading-tight">
        {parts[0]}
      </span>
    );
  }

  return (
    <span className="inline-flex max-w-full flex-col overflow-hidden whitespace-normal leading-tight">
      {parts.map((part) => (
        <span key={part} className="max-w-full overflow-hidden text-ellipsis">
          {part}
        </span>
      ))}
    </span>
  );
}

export function SortableTh({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  className,
}: {
  label: string;
  sortKey: SymbolStatsSortKey;
  activeKey: SymbolStatsSortKey | null;
  direction: 'asc' | 'desc';
  onSort: (key: SymbolStatsSortKey) => void;
  className?: string;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'cursor-pointer select-none overflow-hidden px-1 py-2 text-center align-middle font-medium transition-colors hover:bg-muted/80',
        className
      )}
      onClick={() => onSort(sortKey)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSort(sortKey);
        }
      }}
    >
      {/* 정렬 가능한 열이라는 것과 현재 방향을 함께 보여 준다. 표시가 없으면
          눌러 보기 전까지는 정렬이 되는지조차 알 수 없다. 비활성 열에 흐린
          아래 화살표를 두는 것은 '누르면 내림차순부터'라는 뜻이다. */}
      <span
        className="inline-flex min-w-0 max-w-full flex-col items-center justify-center overflow-hidden"
        title={label}
      >
        <TableHeaderLabel label={label} />
        {isActive ? (
          direction === 'desc' ? (
            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          ) : (
            <ChevronUp className="h-2.5 w-2.5 shrink-0" />
          )
        ) : (
          <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-30" />
        )}
      </span>
    </th>
  );
}
