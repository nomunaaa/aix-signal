'use client'

import type { RatingGaugeMock } from '@/lib/mock/trend-v8-mock'
import { OverallRatingGauge } from '@/components/symbol-detail/rating-gauge/OverallRatingGauge'
import { GroupRatingGauge } from '@/components/symbol-detail/rating-gauge/GroupRatingGauge'
import { IndicatorBadgeGrid } from '@/components/symbol-detail/rating-gauge/IndicatorBadgeGrid'
import { mergeGroupsForThreeMinis } from '@/lib/trend-v8/merge-gauge-groups'

export function RatingGaugeSection({ data }: { data: RatingGaugeMock }) {
  const minis = mergeGroupsForThreeMinis(data.groups)

  return (
    <section className="rounded-xl border border-border/50 bg-card/30 p-4">
      <h2 className="text-sm font-semibold text-foreground">Technical Rating</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{data.symbol} · 20지표 가중 합산</p>

      <div className="mt-4">
        <OverallRatingGauge overall={data.overall} />
      </div>

      {/* 서브 3종: 메인 아래 한 행 — 컨테이너 너비에 맞게 SVG 축소 */}
      <div className="mt-5 grid grid-cols-3 gap-1.5 min-[400px]:gap-3 sm:gap-4">
        {minis.map((g) => (
          <div key={g.groupKey} className="min-w-0">
            <GroupRatingGauge group={g} className="max-w-full" />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">지표 20</h3>
        <IndicatorBadgeGrid indicators={data.indicators} />
      </div>
    </section>
  )
}
