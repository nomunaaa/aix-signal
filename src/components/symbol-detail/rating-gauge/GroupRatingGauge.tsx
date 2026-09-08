'use client'

import { cn } from '@/lib/utils'
import { LONG_SHORT_LABEL_KR, type GaugeGroupSummary } from '@/lib/mock/trend-v8-mock'
import { describeArc, polarToCartesian } from '@/components/symbol-detail/rating-gauge/polar'
import { scaleToScore } from '@/lib/trend-v8/compute-rating'
import { RATING_INDICATOR_BADGE_COUNT } from '@/lib/trend-v8/indicator-rating-share'

const SEG_COLORS = ['#791F1F', '#A32D2D', '#5F5E5A', '#1D9E75', '#0F6E56'] as const

function normFromScale(scale: GaugeGroupSummary['rating']): number {
  return scaleToScore(scale) / 2
}

export function GroupRatingGauge({
  group,
  className,
}: {
  group: GaugeGroupSummary
  /** 한 줄 배치 등 — 너비 축소 시 max-w-full */
  className?: string
}) {
  const cx = 100
  const cy = 82
  const r = 58
  const n = normFromScale(group.rating)
  const angleDeg = 180 - ((n + 1) / 2) * 180
  const tip = polarToCartesian(cx, cy, r - 10, angleDeg)
  const label = LONG_SHORT_LABEL_KR[group.rating]
  const groupWeightPct = (group.indicatorCount / RATING_INDICATOR_BADGE_COUNT) * 100

  return (
    <div className={cn('mx-auto w-full max-w-[200px] min-w-0', className)}>
      <svg viewBox="0 0 200 118" className="h-auto w-full" aria-hidden>
        {SEG_COLORS.map((fill, i) => {
          const start = 180 - i * 36
          const end = 180 - (i + 1) * 36
          return <path key={i} d={describeArc(cx, cy, r, start, end)} fill="none" stroke={fill} strokeWidth={12} strokeLinecap="butt" />
        })}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="hsl(var(--foreground))" strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={3} fill="hsl(var(--foreground))" />
        <text x={cx} y={112} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="11" fontWeight="600">
          {group.displayName}
        </text>
        <text x={cx} y={126} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10">
          {label}
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] font-semibold tabular-nums text-black dark:text-white">
        {groupWeightPct.toFixed(1)}%
      </p>
      <p className="mt-0.5 px-1 text-center text-[10px] text-muted-foreground">{group.summaryText}</p>
    </div>
  )
}
