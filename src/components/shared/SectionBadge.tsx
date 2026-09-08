/**
 * Pulse 섹션 5뱃지 — 종목상세·시그널 보드 공용 (SRD-002 v5)
 */
import { cn } from '@/lib/utils';
import type { SectionBadgeId } from '@/types/section-badge';

export type { SectionBadgeId } from '@/types/section-badge';

const LABEL: Record<SectionBadgeId, string> = {
  discount_entry: '할인진입',
  profit_taking: '수익실현',
  non_trend: '비추세',
  waiting_entry: '진입대기',
  closed_recent: '최근종료',
};

export function sectionBadgeLabel(id: SectionBadgeId): string {
  return LABEL[id];
}

export function SectionBadge({
  id,
  active,
  className,
}: {
  id: SectionBadgeId;
  active: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium',
        active
          ? 'border-primary/60 bg-primary/15 text-foreground'
          : 'border-border/50 bg-muted/20 text-muted-foreground',
        className,
      )}
    >
      {LABEL[id]}
    </span>
  );
}

export function SectionBadgeRow({
  activeId,
  className,
}: {
  activeId: SectionBadgeId;
  className?: string;
}) {
  const ids = Object.keys(LABEL) as SectionBadgeId[];
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)} role="list" aria-label="섹션 뱃지">
      {ids.map((id) => (
        <SectionBadge key={id} id={id} active={id === activeId} />
      ))}
    </div>
  );
}
