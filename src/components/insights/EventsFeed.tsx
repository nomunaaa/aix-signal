'use client'

import { useState } from 'react'
import { EventItem } from '@/components/insights/EventItem'
import { NewsCard } from '@/components/insights/NewsCard'
import { NewsLoadMore } from '@/components/insights/NewsLoadMore'
import { supabase } from '@/integrations/supabase/client'
import { NEWS_PAGE_SIZE, fetchNewsPage } from '@/lib/insights/news-feed'
import type { MarketEvent } from '@/lib/mock/insights-mock'

type Props = { events: MarketEvent[] }

export function EventsFeed({ events: initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents)
  const [hasMore, setHasMore] = useState(initialEvents.length >= NEWS_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      const next = await fetchNewsPage(supabase, { offset: events.length, limit: NEWS_PAGE_SIZE })
      setEvents((prev) => [...prev, ...next.events])
      setHasMore(next.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  if (!events.length) {
    return (
      <section className="space-y-3">
        <h2 className="text-h2 text-foreground flex items-center gap-2">
          오늘의 주요 이벤트
          <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/15 text-primary px-2 py-0.5 rounded-full">RSS · Haiku 가공</span>
        </h2>
        <p className="text-sm text-muted-foreground">뉴스를 불러오는 중</p>
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-lg bg-muted" />
          ))}
        </div>
      </section>
    )
  }
  return (
    <section className="space-y-3">
      <h2 className="text-h2 text-foreground flex items-center gap-2">
          오늘의 주요 이벤트
          <span className="text-[10px] font-bold tracking-widest uppercase bg-primary/15 text-primary px-2 py-0.5 rounded-full">RSS · Haiku 가공</span>
        </h2>
      <div className="flex flex-col gap-3">
        {events.map((e) =>
          e.aiComment || e.sourceLabel || e.coinTags?.length ? (
            <NewsCard key={e.id} event={e} />
          ) : (
            <EventItem key={e.id} event={e} />
          ),
        )}
      </div>
      {hasMore && <NewsLoadMore onClick={handleLoadMore} loading={loadingMore} />}
    </section>
  )
}
