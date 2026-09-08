'use client'

import { LONG_SHORT_LABEL_KR, type RatingGaugeMock } from '@/lib/mock/trend-v8-mock'
import { describeArc, polarToCartesian } from '@/components/symbol-detail/rating-gauge/polar'

const SEG_COLORS = ['#791F1F', '#A32D2D', '#5F5E5A', '#1D9E75', '#0F6E56'] as const

export function OverallRatingGauge({ overall }: { overall: RatingGaugeMock['overall'] }) {
  const cx = 200
  const cy = 165
  const r = 120
  const angleDeg = 180 - ((overall.scoreNormalized + 1) / 2) * 180
  const tip = polarToCartesian(cx, cy, r - 12, angleDeg)
  const label = LONG_SHORT_LABEL_KR[overall.rating]

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <svg viewBox="0 0 400 200" className="h-auto w-full" role="img" aria-label={`종합 Rating ${label}, 정규화 점수 ${overall.scoreNormalized.toFixed(2)}`}>
        <title>{`Rating ${label}`}</title>
        {SEG_COLORS.map((fill, i) => {
          const start = 180 - i * 36
          const end = 180 - (i + 1) * 36
          return <path key={i} d={describeArc(cx, cy, r, start, end)} fill="none" stroke={fill} strokeWidth={18} strokeLinecap="butt" />
        })}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="hsl(var(--foreground))" strokeWidth={3} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="hsl(var(--foreground))" />
        <text x={cx} y={176} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="700">
          {label}
        </text>
      </svg>
      <p className="mt-1 text-center text-[11px] font-semibold tabular-nums leading-snug text-black dark:text-white">
        롱 {((overall.longCount / 20) * 100).toFixed(1)}% · 중립 {((overall.neutralCount / 20) * 100).toFixed(1)}% · 숏{' '}
        {((overall.shortCount / 20) * 100).toFixed(1)}%
      </p>
    </div>
  )
}
