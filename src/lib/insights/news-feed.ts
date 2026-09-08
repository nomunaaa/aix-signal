// public.news_articles → MarketEvent[] 매핑 + 페이지네이션 조회.
// fetch-insights.ts(서버, ISR 첫 페이지)와 EventsFeed.tsx("더보기" 클라이언트
// 조회)가 같은 로직을 공유하도록 별도 파일로 분리했다 — 서버 전용 의존성이
// 없으므로 클라이언트 컴포넌트에서 안전하게 import할 수 있다.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MarketEvent } from '@/lib/mock/insights-mock'

export const NEWS_PAGE_SIZE = 20

const NEWS_SOURCE_LABELS: Record<string, string> = {
  tokenpost: 'TokenPost',
  coindesk: 'CoinDesk',
}

const NEWS_IMPORTANCE_MAP: Record<
  string,
  { importance: MarketEvent['importance']; importanceLabel: string }
> = {
  bullish: { importance: 'bullish', importanceLabel: 'BULLISH' },
  bearish: { importance: 'bearish', importanceLabel: 'BEARISH' },
  important: { importance: 'important', importanceLabel: 'IMPORTANT' },
  neutral: { importance: 'neutral', importanceLabel: 'NEUTRAL' },
  // legacy mappings (rows inserted before label system change)
  urgent: { importance: 'bullish', importanceLabel: 'BULLISH' },
  reference: { importance: 'neutral', importanceLabel: 'NEUTRAL' },
}

export function elapsedLabelKo(publishedIso: string): string {
  const ms = Date.parse(publishedIso)
  if (!Number.isFinite(ms)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000))
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}시간 전`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}일 전`
  return new Date(ms).toISOString().slice(0, 10)
}

interface NewsArticleRow {
  id: string
  source: string
  source_lang: 'ko' | 'en' | string
  title: string
  original_url: string
  published_at: string
  ai_comment: string | null
  ai_lang: 'ko' | 'en' | null
  coin_tags: string[] | null
  importance: 'urgent' | 'important' | 'reference' | string
}

export function mapNewsRow(r: NewsArticleRow): MarketEvent {
  const imp = NEWS_IMPORTANCE_MAP[r.importance] ?? NEWS_IMPORTANCE_MAP.reference
  return {
    id: String(r.id),
    headline: r.title,
    importance: imp.importance,
    importanceLabel: imp.importanceLabel,
    publishedAt: r.published_at,
    elapsedLabel: elapsedLabelKo(r.published_at),
    sourceUrl: r.original_url,
    sourceLabel: NEWS_SOURCE_LABELS[r.source] ?? r.source,
    aiComment: r.ai_comment ?? undefined,
    aiLang: r.ai_lang ?? undefined,
    coinTags: Array.isArray(r.coin_tags) ? r.coin_tags : [],
  }
}

const NEWS_COLUMNS =
  'id, source, source_lang, title, original_url, published_at, ai_comment, ai_lang, coin_tags, importance'

/**
 * `supabase`는 createClient<Database>가 아직 연결되지 않아 `any`로 받는다 —
 * 호출부에서 필요에 따라 캐스팅하고, row 형태는 이 함수 안에서 단언한다.
 */
export async function fetchNewsPage(
  supabase: any,
  { offset = 0, limit = NEWS_PAGE_SIZE }: { offset?: number; limit?: number } = {},
): Promise<{ events: MarketEvent[]; hasMore: boolean }> {
  const { data, error } = await supabase
    .from('news_articles')
    .select(NEWS_COLUMNS)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error || !data) return { events: [], hasMore: false }

  const rows = data as unknown as NewsArticleRow[]
  return {
    events: rows.map(mapNewsRow),
    hasMore: rows.length === limit,
  }
}

export type { SupabaseClient }
