import { getStreamConfidence } from '@/lib/mock/confidence-mock';
import { getConfidenceColor } from '@/lib/confidence';
import { ConfidenceGradeDot } from '@/components/icons/ConfidenceGradeDot';
import { cn } from '@/lib/utils';

export interface ConfidenceBadgeProps {
  stream: 'pulse' | 'wave';
  className?: string;
}

export function ConfidenceBadge({ stream, className }: ConfidenceBadgeProps) {
  const c = getStreamConfidence(stream);
  const colors = getConfidenceColor(c.grade);

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs font-mono tabular-nums', colors.text, className)}
      title={`최근 3일 평균 승률 ${c.win_rate}% · 종합 ${c.score}`}
    >
      <ConfidenceGradeDot grade={c.grade} className="translate-y-px" />
      <span>{c.win_rate}%</span>
    </span>
  );
}
