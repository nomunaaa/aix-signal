import type { InsightsPageMock } from '@/lib/mock/insights-mock'

import { formatDateTimeKST, minutesAgoFromIso } from '@/lib/insights/format-helpers'

type Props = { data: InsightsPageMock }

export function InsightsFooter({ data }: Props) {
  const { narrative, priceData, news, classification } = data.dataSources
  return (
    <footer className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
      <p className="mb-2">
        마지막 갱신: {formatDateTimeKST(data.lastUpdatedAt)} KST · {minutesAgoFromIso(data.lastUpdatedAt)}분 전
      </p>
      <p>
        출처: {narrative} · {priceData} · {news} · {classification}
      </p>
    </footer>
  )
}
