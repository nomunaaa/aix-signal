/**
 * 대기중 테이블 24h 스파크라인 — LONG emerald / SHORT rose, 100×28
 */
import { cn } from '@/lib/utils';

const W = 100;
const H = 28;

export function WaitingSparklineCell({
  data,
  side,
}: {
  data: number[] | undefined;
  side: 'long' | 'short';
}) {
  if (!data || data.length < 2) {
    return <span className="text-[10px] text-muted-foreground">—</span>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((value - min) / range) * H;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg
      width={W}
      height={H}
      className={cn('shrink-0', side === 'long' ? 'text-emerald-500' : 'text-rose-500')}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
