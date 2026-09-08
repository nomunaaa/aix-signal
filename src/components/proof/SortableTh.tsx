import { cn } from '@/lib/utils';

export type SymbolStatsSortKey =
  | 'symbol'
  | 'recent30:entries'
  | 'recent30:pnl'
  | 'recent30:winRate'
  | 'recent30:avgRatio'
  | 'recent30:holdTime'
  | 'recent3mo:entries'
  | 'recent3mo:pnl'
  | 'recent3mo:winRate'
  | 'recent3mo:avgRatio'
  | 'recent3mo:holdTime'
  | 'total:entries'
  | 'total:pnl'
  | 'total:winRate'
  | 'total:avgRatio'
  | 'total:holdTime';

const HEADER_LINE_PARTS: Record<string, string[]> = {
  'Account Return': ['Account', 'Return'],
  'Account Profit': ['Account', 'Profit'],
  'Avg Win Rate': ['Avg', 'Win Rate'],
  'Avg P/L Ratio': ['Avg', 'P/L Ratio'],
  'Avg Hold Time': ['Avg', 'Hold Time'],
  계좌수익률: ['계좌', '수익률'],
  계좌수익금: ['계좌', '수익금'],
  진입횟수: ['진입', '횟수'],
  평균승률: ['평균', '승률'],
  평균손익비: ['평균', '손익비'],
  평균보유시간: ['평균', '보유시간'],
  収益率: ['収益', '率'],
  口座収益率: ['口座', '収益率'],
  口座収益額: ['口座', '収益額'],
  平均勝率: ['平均', '勝率'],
  平均損益比: ['平均', '損益比'],
  平均保有時間: ['平均', '保有時間'],
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
      <span
        className="inline-flex min-w-0 max-w-full items-center justify-center overflow-hidden"
        title={label}
      >
        <TableHeaderLabel label={label} />
      </span>
    </th>
  );
}
