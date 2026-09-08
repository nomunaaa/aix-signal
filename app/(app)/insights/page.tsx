import type { Metadata } from 'next'

import { EventsFeed } from '@/components/insights/EventsFeed'
import { InsightsFooter } from '@/components/insights/InsightsFooter'
import { fetchInsightsPageData } from '@/lib/insights/fetch-insights'

export const metadata: Metadata = {
  title: '인사이트 · KAIROS',
  description: 'KAIROS 시장 해석, 기회 종목, 내러티브 평가, 주요 이벤트',
}

/** Supabase 실데이터 주기적 갱신 (초) */
export const revalidate = 300

export default async function InsightsPage() {
  const data = await fetchInsightsPageData()
  // const emptyHero = data.hero.headline.includes('생성 중')

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 lg:py-8">
      {/* <InsightsHero hero={data.hero} emptyHero={emptyHero} /> */}

      {/* <KairosAiPanel kairos={data.kairosAi} className="mt-8" /> */}
      {/* 
      <h2 className="mb-3 mt-10 text-h2 text-foreground">오늘의 기회</h2>
      <OpportunitiesGrid opportunities={data.opportunities} /> */}

      {/* <div className="mt-10">
        <NarrativeHistory entries={data.history.entries} stats={data.history.stats} />
      </div> */}

      <div className="mt-10">
        <EventsFeed events={data.events} />
      </div>

      <InsightsFooter data={data} />
    </div>
  )
}
