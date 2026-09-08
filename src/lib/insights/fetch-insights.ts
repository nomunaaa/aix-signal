// Supabase trend_scanner + mock 폴백 (AIX-64)

import { createClient } from '@supabase/supabase-js'

import {
  insightsMockEmpty,
  insightsMockLowHitRate,
  insightsMockPrimary,
} from '@/lib/mock/insights-mock-data'
import {
  REGIME_LABEL_KO,
  VOLATILITY_LABEL_KO,
  type FaqChip,
  type InsightsPageMock,
  type KairosHeroNarrative,
  type MarketEvent,
  type MarketRegime,
  type NarrativeHistoryEntry,
  type NarrativeHorizonEvaluation,
  type NarrativeOutcomeKind,
} from '@/lib/mock/insights-mock'
import {
  formatHistoryDateLabel,
  formatKairosHeroRefreshLabel,
} from '@/lib/insights/format-helpers'
import { USE_MOCK_INSIGHTS, USE_MOCK_MARKET_COMMENTARY } from '@/lib/env/mock'
import { NEWS_PAGE_SIZE, fetchNewsPage } from '@/lib/insights/news-feed'

export type InsightsMockVariant = 'primary' | 'empty' | 'lowHit'

/** DB 스키마 미생성 타입에 대응 (types.ts 갱신 전) */
interface KairosNarrativeHistoryRow {
  narrative_uuid: string
  generated_at: string
  headline: string
  body: string
  mentioned_symbols: string[] | null
  sentiment_direction: 'bullish' | 'bearish' | 'neutral'
  evaluated_at_24h: string | null
  outcome_24h: 'hit' | 'miss' | 'partial' | null
  actual_change_pct_24h: number | null
  actual_text_24h: string | null
  evaluated_at_72h: string | null
  outcome_72h: 'hit' | 'miss' | 'partial' | null
  actual_change_pct_72h: number | null
  actual_text_72h: string | null
  kairos_layer: string | null
  market_regime_at_generation: string | null
}

interface StaticFaqRotationRow {
  question: string
  answer: string
  related_symbols: string[] | null
  active_from: string
  active_until: string
  priority: number
  category: string
}

function mockByVariant(v: InsightsMockVariant): InsightsPageMock {
  if (v === 'empty') return insightsMockEmpty
  if (v === 'lowHit') return insightsMockLowHitRate
  return insightsMockPrimary
}

/** env 플래그 — 이름이 use로 시작하면 React hooks 규칙 ESLint에 걸림 */
function isMockInsightsEnvEnabled(): boolean {
  return USE_MOCK_MARKET_COMMENTARY || USE_MOCK_INSIGHTS
}

function mockVariant(): InsightsMockVariant {
  const raw = process.env.NEXT_PUBLIC_INSIGHTS_MOCK_VARIANT
  if (raw === 'empty' || raw === 'lowHit') return raw
  return 'primary'
}

function mapOutcome(
  o: 'hit' | 'miss' | 'partial' | null | undefined,
  evaluatedAt: string | null,
  actualText: string | null,
  actualPct: number | null,
): NarrativeHorizonEvaluation {
  if (!evaluatedAt && !o) {
    return {
      evaluatedAt: null,
      outcome: 'pending',
      outcomeLabel: '평가 대기',
      actualText: '',
      actualChangePct: actualPct ?? undefined,
    }
  }
  const outcome: NarrativeOutcomeKind =
    o === 'hit' || o === 'miss' || o === 'partial' ? o : 'pending'
  const labels: Record<'hit' | 'miss' | 'partial', NarrativeHorizonEvaluation['outcomeLabel']> = {
    hit: '적중',
    miss: '빗나감',
    partial: '부분',
  }
  if (outcome === 'pending') {
    return {
      evaluatedAt: null,
      outcome: 'pending',
      outcomeLabel: '평가 대기',
      actualText: '',
    }
  }
  return {
    evaluatedAt,
    outcome,
    outcomeLabel: labels[outcome],
    actualText: actualText ?? '',
    actualChangePct: actualPct ?? undefined,
  }
}

function parseMarketRegime(raw: string | null | undefined): MarketRegime {
  const s = String(raw ?? '').toLowerCase()
  const allowed: MarketRegime[] = [
    'surge',
    'crash',
    'strong_consolidation',
    'weak_consolidation',
    'sideways',
    'mixed',
    'watch',
  ]
  return (allowed.includes(s as MarketRegime) ? s : 'watch') as MarketRegime
}

function rowToHistoryEntry(row: KairosNarrativeHistoryRow, index: number): NarrativeHistoryEntry {
  const id = row.narrative_uuid || `row-${index}`
  return {
    id,
    generatedAt: row.generated_at,
    dateLabel: formatHistoryDateLabel(row.generated_at),
    headline: row.headline,
    mentionedSymbols: row.mentioned_symbols ?? [],
    sentimentDirection: row.sentiment_direction,
    horizon24h: mapOutcome(
      row.outcome_24h,
      row.evaluated_at_24h,
      row.actual_text_24h,
      row.actual_change_pct_24h,
    ),
    horizon72h: mapOutcome(
      row.outcome_72h,
      row.evaluated_at_72h,
      row.actual_text_72h,
      row.actual_change_pct_72h,
    ),
  }
}

function count24hHits(entries: NarrativeHistoryEntry[]): {
  hit: number
  miss: number
  partial: number
  pending: number
} {
  let hit = 0
  let miss = 0
  let partial = 0
  let pending = 0
  for (const e of entries) {
    const o = e.horizon24h.outcome
    if (o === 'hit') hit++
    else if (o === 'miss') miss++
    else if (o === 'partial') partial++
    else pending++
  }
  return { hit, miss, partial, pending }
}

// ───────────────────────────────────────────────────────────────────────────
// News (public.news_articles) → MarketEvent[]
// ───────────────────────────────────────────────────────────────────────────

async function fetchNewsEvents(supabase: any, limit = NEWS_PAGE_SIZE): Promise<MarketEvent[]> {
  const { events } = await fetchNewsPage(supabase, { offset: 0, limit })
  return events
}

async function fetchLiveInsights(): Promise<InsightsPageMock | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)

  const { data: latestList, error: heroErr } = await supabase
    .schema('trend_scanner')
    .from('kairos_narrative_history')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(1)

  const { data: histRows, error: histErr } = await supabase
    .schema('trend_scanner')
    .from('kairos_narrative_history')
    .select('*')
    .order('generated_at', { ascending: false })
    .limit(5)

  const nowIso = new Date().toISOString()
  const { data: faqRows, error: faqErr } = await supabase
    .schema('trend_scanner')
    .from('static_faq_rotation')
    .select('*')
    .lte('active_from', nowIso)
    .gt('active_until', nowIso)
    .order('priority', { ascending: true })
    .limit(4)

  // News is always fetched regardless of KAIROS state.
  // If KAIROS has no data, fall back to mock hero/history but still show live news.
  const newsEvents = await fetchNewsEvents(supabase)

  if (heroErr || histErr || !latestList?.length) {
    return {
      ...insightsMockEmpty,
      events: newsEvents,
      lastUpdatedAt: new Date().toISOString(),
    }
  }

  const latest = latestList[0] as KairosNarrativeHistoryRow
  const histSource =
    histRows && histRows.length > 0 ? histRows : latestList
  const kpiFallback = insightsMockPrimary.hero.sidebarKpi

  const faqChips: FaqChip[] =
    !faqErr && faqRows?.length
      ? (faqRows as StaticFaqRotationRow[]).map((r, i) => ({
          id: `faq-db-${i}-${r.priority}`,
          question: r.question,
          answer: r.answer,
          activeUntil: r.active_until,
          priority: r.priority,
        }))
      : insightsMockPrimary.hero.faqChips

  const hero: KairosHeroNarrative = {
    generatedAt: latest.generated_at,
    generatedAtLabel: formatKairosHeroRefreshLabel(latest.generated_at),
    headline: latest.headline,
    body: latest.body,
    sidebarKpi: {
      marketRegime: parseMarketRegime(latest.market_regime_at_generation),
      marketRegimeLabel: REGIME_LABEL_KO[parseMarketRegime(latest.market_regime_at_generation)],
      alignmentPct: kpiFallback.alignmentPct,
      volatility: kpiFallback.volatility,
      volatilityLabel: VOLATILITY_LABEL_KO[kpiFallback.volatility],
      longShortRatio: kpiFallback.longShortRatio,
    },
    faqChips,
  }

  const entries = (histSource as KairosNarrativeHistoryRow[]).map((r, i) =>
    rowToHistoryEntry(r, i),
  )
  const c = count24hHits(entries)
  const total = entries.length
  const hitRateLabel =
    total > 0 ? `적중률 ${c.hit}/${total}` : insightsMockPrimary.history.stats.hitRateLabel

  const events = newsEvents

  return {
    hero,
    kairosAi: insightsMockPrimary.kairosAi,
    opportunities: insightsMockPrimary.opportunities,
    history: {
      entries,
      stats: {
        total,
        hitCount: c.hit,
        missCount: c.miss,
        partialCount: c.partial,
        pendingCount: c.pending,
        hitRateLabel,
      },
    },
    events,
    lastUpdatedAt: latest.generated_at,
    dataSources: insightsMockPrimary.dataSources,
  }
}

export async function fetchInsightsPageData(): Promise<InsightsPageMock> {
  if (isMockInsightsEnvEnabled()) {
    return mockByVariant(mockVariant())
  }
  try {
    const live = await fetchLiveInsights()
    if (live) return live
  } catch {
    /* 폴백 */
  }
  return insightsMockEmpty
}
