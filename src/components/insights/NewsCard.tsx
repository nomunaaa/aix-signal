import { ExternalLink } from 'lucide-react'

import type { MarketEvent } from '@/lib/mock/insights-mock'
import { cn } from '@/lib/utils'

type Props = { event: MarketEvent }

type SentimentKey = 'bullish' | 'bearish' | 'important' | 'neutral'

const BADGE_CONFIG: Record<
  SentimentKey,
  { arrow: string; label: string; badgeCn: string; borderCn: string }
> = {
  bullish: {
    arrow: '▲',
    label: 'BULLISH',
    badgeCn: 'bg-green-500/15 text-green-500',
    borderCn: 'border-l-green-500',
  },
  bearish: {
    arrow: '▼',
    label: 'BEARISH',
    badgeCn: 'bg-destructive/15 text-destructive',
    borderCn: 'border-l-destructive',
  },
  important: {
    arrow: '◆',
    label: 'IMPORTANT',
    badgeCn: 'bg-warning/15 text-warning',
    borderCn: 'border-l-warning',
  },
  neutral: {
    arrow: '●',
    label: 'NEUTRAL',
    badgeCn: 'bg-muted/20 text-muted-foreground',
    borderCn: 'border-l-muted-foreground/40',
  },
}

function resolveSentiment(importance: MarketEvent['importance']): SentimentKey {
  if (
    importance === 'bullish' ||
    importance === 'bearish' ||
    importance === 'important' ||
    importance === 'neutral'
  ) {
    return importance
  }
  if (importance === 'critical') return 'bearish'
  if (importance === 'major') return 'important'
  return 'neutral'
}

export function NewsCard({ event }: Props) {
  const sentiment = resolveSentiment(event.importance)
  const cfg = BADGE_CONFIG[sentiment]
  const href = event.sourceUrl
  const tags = event.coinTags ?? []
  const showableTags = tags.slice(0, 4)
  const moreTags = tags.length - showableTags.length

  const inner = (
    <div
      className={cn(
        'grid grid-cols-[1fr_auto] gap-4 items-start',
        // 라이트=흰색(--card 100%), 다크=배경(6%)보다 한 단계 밝은 회색(10%).
        // bg-secondary는 라이트에서 90% 회색이라 '흰 컬럼' 요구와 어긋났다.
        'rounded-lg bg-card px-5 py-4',
        'border border-border border-l-[3px] transition-colors',
        'hover:border-primary/60 hover:bg-muted/50',
        cfg.borderCn,
      )}
    >
      {/* Main content */}
      <div className="min-w-0">
        {/* Meta top */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0',
              cfg.badgeCn,
            )}
          >
            <span className="text-[9px] leading-none">{cfg.arrow}</span>
            {cfg.label}
          </span>
          {event.sourceLabel ? (
            <span className="text-xs text-foreground/70 font-medium">{event.sourceLabel}</span>
          ) : null}
          <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
          <span className="text-xs text-muted-foreground">{event.elapsedLabel}</span>
        </div>

        {/* Headline */}
        <p className="text-[15px] font-semibold text-foreground leading-snug mb-2 tracking-tight">
          {event.headline}
        </p>

        {/* AI comment */}
        {event.aiComment ? (
          <div className="border-l-2 border-primary bg-primary/[0.06] rounded-r px-3 py-2 my-2">
            <span className="inline-block text-[9px] font-bold tracking-widest text-primary bg-primary/15 px-1.5 py-0.5 rounded mr-2 align-middle leading-none">
              AI
            </span>
            <span className="text-[13px] text-muted-foreground leading-relaxed">{event.aiComment}</span>
          </div>
        ) : null}

        {/* Coin tags */}
        {showableTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {showableTags.map((t) => (
              <span
                key={t}
                className="bg-primary/[0.08] text-primary px-1.5 py-0.5 rounded text-[11px] font-semibold"
              >
                {t.replace(/USDT$/, '')}
              </span>
            ))}
            {moreTags > 0 ? (
              <span className="bg-muted/20 text-muted-foreground px-1.5 py-0.5 rounded text-[11px]">
                +{moreTags}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Action button */}
      {href ? (
        <div className="shrink-0 pt-0.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-2 border border-border rounded-md text-xs text-muted-foreground font-medium hover:border-primary hover:text-primary hover:bg-primary/[0.06] transition-colors whitespace-nowrap">
            원문 보기
            <ExternalLink className="h-3 w-3" />
          </span>
        </div>
      ) : null}
    </div>
  )

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  )
}
