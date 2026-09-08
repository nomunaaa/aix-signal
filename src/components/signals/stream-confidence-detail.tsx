import { getStreamConfidence } from '@/lib/mock/confidence-mock';
import { getConfidenceColor } from '@/lib/confidence';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface StreamConfidenceDetailProps {
  stream: 'pulse' | 'wave';
  className?: string;
}

export function StreamConfidenceDetail({ stream, className }: StreamConfidenceDetailProps) {
  const c = getStreamConfidence(stream);
  const label = stream === 'pulse' ? 'PULSE' : 'WAVE';
  const colors = getConfidenceColor(c.grade);
  const wins = Math.round((c.win_rate / 100) * c.sample_size);
  const momentumBar = Math.max(0, Math.min(100, ((c.streak + 5) / 10) * 100));
  const pnlBar = Math.max(0, Math.min(100, (c.avg_pnl / 5) * 100));

  return (
    <div className={cn('rounded-lg border border-border bg-card/80 p-4', className)}>
      <p className={cn('mb-3 text-sm font-semibold', colors.text)}>
        {label} 신뢰도 {c.score}
      </p>
      <div className="flex flex-col gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">최근 3일 평균 승률</span>
            <span className="text-sm font-mono text-white">
              {c.win_rate}% ({wins}/{c.sample_size})
            </span>
          </div>
          <Progress value={c.win_rate} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">연승 모멘텀</span>
            <span
              className={cn(
                'text-sm font-mono',
                c.streak > 0
                  ? 'text-score-excellent'
                  : c.streak < 0
                    ? 'text-score-bad'
                    : 'text-score-neutral',
              )}
            >
              {c.streak > 0 ? `+${c.streak}연승` : c.streak < 0 ? `${c.streak}연패` : '0'}
            </span>
          </div>
          <Progress value={momentumBar} className="h-2" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-zinc-400">평균 PnL</span>
            <span className="text-sm font-mono text-white">
              {c.avg_pnl >= 0 ? '+' : ''}
              {c.avg_pnl.toFixed(1)}%
            </span>
          </div>
          <Progress value={pnlBar} className="h-2" />
        </div>
      </div>
    </div>
  );
}
