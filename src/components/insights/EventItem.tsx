import { ExternalLink } from 'lucide-react'

import type { MarketEvent } from '@/lib/mock/insights-mock'
import { cn } from '@/lib/utils'

type Props = { event: MarketEvent }

export function EventItem({ event }: Props) {
  const importanceStyles: Record<string, string> = {
    critical: 'bg-destructive/15 text-destructive',
    major: 'bg-warning/15 text-warning',
    info: 'bg-info/15 text-info',
    bullish: 'bg-green-500/15 text-green-500',
    bearish: 'bg-destructive/15 text-destructive',
    important: 'bg-warning/15 text-warning',
    neutral: 'bg-muted/20 text-muted-foreground',
  }
  const href = event.sourceUrl
  const inner = (
    <>
      <span
        className={cn(
          'shrink-0 rounded px-2 py-0.5 text-[11px] font-medium',
          importanceStyles[event.importance],
        )}
      >
        {event.importanceLabel}
      </span>
      <span className="min-w-0 flex-1 text-sm text-foreground">{event.headline}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{event.elapsedLabel}</span>
      {href ? <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 transition-colors hover:bg-muted/50"
      >
        {inner}
      </a>
    )
  }
  return (
    <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5">{inner}</div>
  )
}
