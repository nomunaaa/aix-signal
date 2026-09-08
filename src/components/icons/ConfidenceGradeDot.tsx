import { cn } from '@/lib/utils';

/** 신뢰도·스트림 등급 (high / medium / low) — 이모지 대신 고정 색 점 */
export function ConfidenceGradeDot({
  grade,
  className,
  size = 'sm',
}: {
  grade: 'high' | 'medium' | 'low';
  className?: string;
  /** sm ≈ 8px, md ≈ 10px */
  size?: 'sm' | 'md';
}) {
  const sizeCls = size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2';
  const color =
    grade === 'high' ? 'bg-emerald-500' : grade === 'medium' ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', sizeCls, color, className)}
      aria-hidden
    />
  );
}

/** 신선도 등급 (fresh / normal / stale) — 동일 색 체계 */
export function FreshnessGradeDot({
  grade,
  className,
  size = 'sm',
}: {
  grade: 'fresh' | 'normal' | 'stale';
  className?: string;
  size?: 'sm' | 'md';
}) {
  const mapped: 'high' | 'medium' | 'low' =
    grade === 'fresh' ? 'high' : grade === 'normal' ? 'medium' : 'low';
  return <ConfidenceGradeDot grade={mapped} className={className} size={size} />;
}
