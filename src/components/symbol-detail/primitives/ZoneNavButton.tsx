import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** Zone 헤더 왼쪽 보더 색과 맞춘 pill (SRD-002) — 토큰·semantic 위주 */
const pillTone: Record<'teal' | 'amber' | 'blue' | 'purple' | 'gray', string> = {
  teal: 'border-semantic-bull/35 text-primary hover:bg-semantic-bull/10',
  amber: 'border-amber-500/40 text-foreground hover:bg-amber-500/10',
  blue: 'border-primary/45 text-primary hover:bg-primary/10',
  purple: 'border-violet-500/40 text-foreground hover:bg-violet-500/10',
  gray: 'border-border/70 text-muted-foreground hover:bg-muted/50',
};

export type ZoneNavColor = keyof typeof pillTone;

type ZoneNavButtonProps = {
  href: string;
  children: ReactNode;
  color?: ZoneNavColor;
  className?: string;
};

/**
 * Zone 본진 이동 pill — `<a href>`만 사용 (react-router-dom·Link 금지, REB-212)
 */
export function ZoneNavButton({ href, children, color = 'teal', className }: ZoneNavButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        'inline-flex max-w-full items-center rounded-full border bg-muted/30 px-3 py-1 text-[11px] font-medium transition-colors',
        pillTone[color],
        className,
      )}
    >
      {children}
    </a>
  );
}
