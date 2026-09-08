import { ZoneNavButton, type ZoneNavColor } from '@/components/symbol-detail/primitives/ZoneNavButton';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const colorRing: Record<ZoneNavColor, string> = {
  teal: 'border-l-semantic-bull/50',
  amber: 'border-l-amber-500/50',
  blue: 'border-l-primary/50',
  purple: 'border-l-violet-500/50',
  gray: 'border-l-muted-foreground/40',
};

type ZoneWrapperProps = {
  title: string;
  color: ZoneNavColor;
  navHref?: string;
  navLabel?: string;
  children: ReactNode;
};

/** Zone 공통 — 본진 이동은 `ZoneNavButton`(`<a href>`)만 사용 (SRD-002 / REB-212) */
export function ZoneWrapper({ title, color, navHref, navLabel, children }: ZoneWrapperProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border/60 bg-card/30',
        'border-l-4',
        colorRing[color],
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {navHref && navLabel ? (
          <ZoneNavButton href={navHref} color={color}>
            {navLabel}
          </ZoneNavButton>
        ) : null}
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}
