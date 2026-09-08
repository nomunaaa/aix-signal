/**
 * 신선도 바 + 점수 — 2축 요약 (SRD-002 v5, 시그널 보드 재사용 예정)
 */
import { cn } from '@/lib/utils';

export type FreshnessBarProps = {
  /** 0–100 종합 신선도 */
  score: number;
  /** 축 A 라벨 (예: 시간 경과) */
  axisALabel: string;
  axisAValue: number;
  /** 축 B 라벨 (예: 시장 반응) */
  axisBLabel: string;
  axisBValue: number;
  className?: string;
};

function MiniBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{v}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-primary/70"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export function FreshnessBar({
  score,
  axisALabel,
  axisAValue,
  axisBLabel,
  axisBValue,
  className,
}: FreshnessBarProps) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div
      className={cn('rounded-md border border-border/50 bg-muted/10 px-3 py-2', className)}
      aria-label="신선도"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground">신선도</span>
        <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{s}</span>
      </div>
      <div className="space-y-2">
        <MiniBar label={axisALabel} value={axisAValue} />
        <MiniBar label={axisBLabel} value={axisBValue} />
      </div>
    </div>
  );
}
