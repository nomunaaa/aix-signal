// src/lib/mock/insights-mock-data.ts
// 인사이트 페이지 완전한 Mock 인스턴스
// AIX-64 · 2026-04-20 / AIX-101 드리프트 동기화 · 2026-04-22
//
// 이 데이터는 Supabase의 kairos_narrative_history + kairos_faq_rotation
// seed 데이터와 정확히 일치합니다. DB가 살아있으면 실제 쿼리로 대체 가능하며,
// 이 파일은 DB 없이도 UI 검증이 가능하도록 유지됩니다.

import type {
  InsightsPageData,
  InsightsPageMock,
  KairosAiMeta,
  KairosHero,
  MarketEvent,
  NarrativeHistoryEntry,
  NarrativeHistoryStats,
  Opportunity,
} from './insights-mock'

// ═══════════════════════════════════════════════════════════════════
// § 1. Hero
// ═══════════════════════════════════════════════════════════════════

export const heroMock: KairosHero = {
  generatedAt: '2026-04-20T00:00:00Z',
  generatedAtLabel: '2026-04-20 09:00 KST · 업데이트 5분 전',
  headline: 'BTC 85K 지지선 재확인, 알트 자금은 L1 내러티브로 분화 중',
  body: 'External KAIROS는 Fed 5월 인하 기대 완화로 리스크 자산에 단기 조정 압력을 감지했고, Internal KAIROS는 BTC 시가총액 우위 58.2%와 알트 OI 증가가 상충하는 국면으로 해석합니다. 두 해석이 일치하는 강추세 종목은 SOL, LINK 2종이며, 나머지 28종은 관망 또는 개별 내러티브 구간으로 분류됩니다. 단기 1시간 EMA는 BTC 정상 추세, 장기 10분 EMA는 혼조. 공감 종목 우선 접근을 권장합니다.',
  sidebarKpi: {
    marketRegime: 'weak_consolidation',
    marketRegimeLabel: '약보합',
    alignmentPct: 37,
    volatility: 'mid',
    volatilityLabel: '중',
    longShortRatio: 1.42,
  },
  faqChips: [
    {
      id: 'faq-btc-85k',
      question: 'BTC 85K 지지 가능성?',
      answer: '현재 BTC 시가총액 우위 58.2%와 OI 반등은 85K 지지를 뒷받침합니다. 다만 Fed 5월 인하 확률이 45% 이하로 내려가면 단기 80K 재검증 가능성도 배제할 수 없습니다. 선물 펀딩비가 양수를 유지하는 동안은 매수 우위로 해석됩니다.',
      relatedSymbols: ['BTCUSDT'],
      activeUntil: '2026-04-21T00:00:00Z',
      priority: 1,
    },
    {
      id: 'faq-l1-narrative',
      question: 'L1 내러티브 지속될까?',
      answer: 'SOL, AVAX, NEAR 등 L1 자산이 최근 48시간 거래량 평균 1.6배 증가하며 순환 매매 패턴이 뚜렷합니다. Firedancer, Core 업그레이드 모멘텀이 단기 2-3일간 유지될 가능성이 높지만, BTC 돌발 약세 시 동반 조정 리스크는 상존합니다.',
      relatedSymbols: ['SOLUSDT', 'AVAXUSDT', 'NEARUSDT'],
      activeUntil: '2026-04-21T00:00:00Z',
      priority: 2,
    },
    {
      id: 'faq-fed-delay',
      question: 'Fed 인하 지연 영향?',
      answer: '5월 FOMC 인하 기대 감소는 단기적으로 리스크 자산에 부정적이지만, 크립토 특유의 반감기 순환과 맞물려 약세 기간이 길지 않을 가능성이 있습니다. 현재 10년물 금리 4.6% 돌파 시 추가 조정 주의, 4.5% 하회 유지 시 상승 재개 여건.',
      relatedSymbols: [],
      activeUntil: '2026-04-21T00:00:00Z',
      priority: 3,
    },
    {
      id: 'faq-altseason',
      question: '알트 시즌 진입 신호?',
      answer: '알트 시즌 지수는 현재 42로 중립권입니다. BTC.D 58.2% 이상 유지되는 동안은 본격 알트 시즌 진입 단정 불가. 다만 L1, 오라클, RWA 등 개별 내러티브 순환은 이미 진행 중이므로 섹터별 접근이 유효합니다.',
      relatedSymbols: [],
      activeUntil: '2026-04-21T00:00:00Z',
      priority: 4,
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════
// § 1.5 KAIROS AI 메타
// ═══════════════════════════════════════════════════════════════════

export const kairosAiMock: KairosAiMeta = {
  modelLabel: 'Haiku 4.5',
  refreshIntervalMinutes: 5,
  layerAgreement: 'divergence',
  layerAgreementDescription:
    'External(Fed 인하 기대 완화)과 Internal(BTC.D 58.2% 유지) 레이어의 단기 해석이 갈립니다. 공감 종목 SOL/LINK 외에는 관망.',
  externalLayerSummary:
    '거시: Fed 5월 인하 확률 45% 이하 하향. 리스크 자산 단기 조정 압력, BTC 85K 지지 재확인이 선결 조건.',
  internalLayerSummary:
    '내부: BTC.D 58.2% 우위 · 알트 OI 증가 혼재. L1 내러티브 순환 (SOL/LINK) 주도, 나머지 28종 관망.',
  topMoversLine: '24h 상위 움직임 · SOL +3.2% · LINK +5.8% · ETH −1.4%',
  pipeline: {
    heroNarrative: 'Call A · Hero — Haiku 4.5 (한 문장 해석 + 3~4문장 본문, 5분 갱신)',
    opportunities: 'Call B · Opportunities — 공감 종목 상위 3종 (LONG/SHORT 근거 3줄, 위험 1줄)',
    historyEval: 'Call C · HistoryEval — 과거 내러티브 24h/72h hit·miss·partial 재평가',
  },
}

// ═══════════════════════════════════════════════════════════════════
// § 2. Opportunities — core_subset 중 강추세/공감 3종
// ═══════════════════════════════════════════════════════════════════

export const opportunitiesMock: Opportunity[] = [
  {
    id: 'op-sol-20260420',
    symbol: 'SOLUSDT',
    side: 'LONG',
    narrativeTag: 'L1 내러티브',
    isConsensusSymbol: true,
    price: 142.85,
    change24hPct: 3.2,
    reasons: [
      '단기/장기 EMA 모두 상승 정렬, 공감 종목 진입',
      '외부 인플루언서 언급 24h +47건 (상위 2%)',
      'OI $1.2B 증가하며 롱 우위 재확인',
    ],
    newsMentionCount24h: 47,
    newsMentionPercentile: 2,
    riskText: '140 지지 이탈 시 135 재검증',
    actions: [
      { type: 'chart', label: '차트', href: '/chart/SOLUSDT', enabled: true },
      { type: 'watchlist', label: '관심', enabled: true },
      { type: 'alert', label: '알림', enabled: true },
    ],
  },
  {
    id: 'op-link-20260420',
    symbol: 'LINKUSDT',
    side: 'LONG',
    narrativeTag: '오라클 · RWA',
    isConsensusSymbol: true,
    price: 22.47,
    change24hPct: 5.8,
    reasons: [
      '거래량 24h 1.8배 증가, 약추세 → 강추세 전환',
      'RWA 관련 뉴스 피크 (n8n 중요도 상위 3%)',
      '공감 종목 진입: 두 레이어 동시 LONG 확정',
    ],
    newsMentionCount24h: 31,
    newsMentionPercentile: 3,
    riskText: '거래량 급증 후 단기 조정 가능',
    actions: [
      { type: 'chart', label: '차트', href: '/chart/LINKUSDT', enabled: true },
      { type: 'watchlist', label: '관심', enabled: true },
      { type: 'alert', label: '알림', enabled: true },
    ],
  },
  {
    id: 'op-eth-20260420',
    symbol: 'ETHUSDT',
    side: 'SHORT',
    narrativeTag: '관망',
    isConsensusSymbol: false,
    price: 3218,
    change24hPct: -1.4,
    reasons: [
      '장기 하락 추세 유지, 단기 반등 후 재진입 대기',
      'ETH/BTC 비율 0.038 하회 지속, 상대 약세',
      'L2 TVL 감소세, 내러티브 부재',
    ],
    newsMentionCount24h: 18,
    newsMentionPercentile: 38,
    riskText: 'BTC 강반등 시 동반 반등 가능',
    actions: [
      { type: 'chart', label: '차트', href: '/chart/ETHUSDT', enabled: true },
      { type: 'watchlist', label: '관심', enabled: true },
      { type: 'alert', label: '알림', enabled: true },
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════
// § 3. History — Supabase kairos_narrative_history와 동일
// ═══════════════════════════════════════════════════════════════════

export const historyEntriesMock: NarrativeHistoryEntry[] = [
  {
    id: 'hist-20260419',
    generatedAt: '2026-04-19T00:00:00Z',
    dateLabel: '4/19 09:00',
    headline: 'BTC 82K 하단 단기 바닥 형성 가능',
    body: '전일 급락으로 82K 지지선 근접. Internal KAIROS는 청산 후 OI 반등을 하단 매집 신호로 해석.',
    mentionedSymbols: ['BTCUSDT'],
    sentimentDirection: 'bullish',
    horizon24h: {
      evaluatedAt: '2026-04-20T00:00:00Z',
      outcome: 'hit',
      outcomeLabel: '적중',
      actualText: '+3.2% 반등 (24h)',
      actualChangePct: 3.2,
    },
    horizon72h: {
      evaluatedAt: null,
      outcome: 'pending',
      outcomeLabel: '평가 대기',
      actualText: '',
    },
  },
  {
    id: 'hist-20260418',
    generatedAt: '2026-04-18T00:00:00Z',
    dateLabel: '4/18 09:00',
    headline: '고변동 주의, 30종 중 25종 비추세 진입',
    mentionedSymbols: ['ORDIUSDT', 'WIFUSDT', 'PEPEUSDT'],
    sentimentDirection: 'bearish',
    horizon24h: {
      evaluatedAt: '2026-04-19T00:00:00Z',
      outcome: 'hit',
      outcomeLabel: '적중',
      actualText: 'ORDI −8.2%, WIF −6.1%',
      actualChangePct: -8.2,
    },
    horizon72h: {
      evaluatedAt: '2026-04-21T00:00:00Z',
      outcome: 'hit',
      outcomeLabel: '적중',
      actualText: '평균 -11.5% 조정 완료',
      actualChangePct: -11.5,
    },
  },
  {
    id: 'hist-20260417',
    generatedAt: '2026-04-17T00:00:00Z',
    dateLabel: '4/17 09:00',
    headline: 'ETH 상대 강세 전환 임박 시그널',
    mentionedSymbols: ['ETHUSDT'],
    sentimentDirection: 'bullish',
    horizon24h: {
      evaluatedAt: '2026-04-18T00:00:00Z',
      outcome: 'miss',
      outcomeLabel: '빗나감',
      actualText: 'ETH/BTC 오히려 −2.1%',
      actualChangePct: -2.1,
    },
    horizon72h: {
      evaluatedAt: '2026-04-20T00:00:00Z',
      outcome: 'miss',
      outcomeLabel: '빗나감',
      actualText: '72h 누적 −3.4%, 전환 실패',
      actualChangePct: -3.4,
    },
  },
  {
    id: 'hist-20260416',
    generatedAt: '2026-04-16T00:00:00Z',
    dateLabel: '4/16 09:00',
    headline: 'SOL 내러티브 재점화, $130 돌파 시 $145',
    mentionedSymbols: ['SOLUSDT'],
    sentimentDirection: 'bullish',
    horizon24h: {
      evaluatedAt: '2026-04-17T00:00:00Z',
      outcome: 'partial',
      outcomeLabel: '부분',
      actualText: '+4.2% 반등, 130 돌파 전 멈춤',
      actualChangePct: 4.2,
    },
    horizon72h: {
      evaluatedAt: '2026-04-19T00:00:00Z',
      outcome: 'hit',
      outcomeLabel: '적중',
      actualText: '$142.8 도달 (72h)',
      actualChangePct: 9.8,
    },
  },
  {
    id: 'hist-20260415',
    generatedAt: '2026-04-15T00:00:00Z',
    dateLabel: '4/15 09:00',
    headline: 'XRP ETF 기대감 선반영, 단기 차익실현',
    mentionedSymbols: ['XRPUSDT'],
    sentimentDirection: 'bearish',
    horizon24h: {
      evaluatedAt: '2026-04-16T00:00:00Z',
      outcome: 'partial',
      outcomeLabel: '부분',
      actualText: '+1.8% 후 횡보',
      actualChangePct: 1.8,
    },
    horizon72h: {
      evaluatedAt: '2026-04-18T00:00:00Z',
      outcome: 'hit',
      outcomeLabel: '적중',
      actualText: '72h 후 −4.2% 조정 확인',
      actualChangePct: -4.2,
    },
  },
]

export const historyStatsMock: NarrativeHistoryStats = {
  total: 5,
  hitCount: 3,
  missCount: 1,
  partialCount: 2,
  pendingCount: 0,
  hitRateLabel: '적중률 3/5',
}

// ═══════════════════════════════════════════════════════════════════
// § 4. Events
// ═══════════════════════════════════════════════════════════════════

export const eventsMock: MarketEvent[] = [
  {
    id: 'evt-sec-eth-etf',
    headline: 'SEC, 이더리움 현물 ETF 결정 5월 23일 연기 발표',
    importance: 'critical',
    importanceLabel: '긴급',
    publishedAt: '2026-04-20T08:00:00Z',
    elapsedLabel: '1h 전',
    sourceUrl: 'https://cryptopanic.com/news/sample-1',
    n8nClassifiedAs: 'regulation',
  },
  {
    id: 'evt-firedancer',
    headline: 'Solana, Firedancer 메인넷 배포 일정 4월 25일 공식 확정',
    importance: 'major',
    importanceLabel: '주요',
    publishedAt: '2026-04-20T06:00:00Z',
    elapsedLabel: '3h 전',
    sourceUrl: 'https://cryptopanic.com/news/sample-2',
    n8nClassifiedAs: 'tech-upgrade',
  },
  {
    id: 'evt-chainlink-swift',
    headline: 'Chainlink, Swift 파일럿 확대 발표 — RWA 내러티브 탄력',
    importance: 'info',
    importanceLabel: '참고',
    publishedAt: '2026-04-20T04:00:00Z',
    elapsedLabel: '5h 전',
    sourceUrl: 'https://cryptopanic.com/news/sample-3',
    n8nClassifiedAs: 'partnership',
  },
  {
    id: 'evt-fed-minutes',
    headline: '연준 의사록: 5월 인하 가능성 시장 예상보다 낮아',
    importance: 'info',
    importanceLabel: '참고',
    publishedAt: '2026-04-20T01:00:00Z',
    elapsedLabel: '8h 전',
    sourceUrl: 'https://cryptopanic.com/news/sample-4',
    n8nClassifiedAs: 'macro',
  },
]

// ═══════════════════════════════════════════════════════════════════
// § 최종 페이지 Mock
// ═══════════════════════════════════════════════════════════════════

export const insightsPageMock: InsightsPageData = {
  hero: heroMock,
  kairosAi: kairosAiMock,
  opportunities: opportunitiesMock,
  history: {
    entries: historyEntriesMock,
    stats: historyStatsMock,
  },
  events: eventsMock,
  lastUpdatedAt: '2026-04-20T09:05:00Z',
  dataSources: {
    narrative: 'KAIROS Haiku 4.5',
    priceData: 'Binance Futures',
    news: 'CryptoPanic Pro',
    classification: 'n8n self-hosted',
  },
}

/** fetch-insights.ts 호환 alias — 기본 variant */
export const insightsMockPrimary: InsightsPageMock = insightsPageMock

/** KAIROS 내러티브 생성 중 상태 (hero만 비움, 나머지는 최소) */
export const insightsMockEmpty: InsightsPageMock = {
  hero: {
    ...heroMock,
    generatedAtLabel: 'KAIROS 내러티브 생성 중',
    headline: 'KAIROS 내러티브를 생성 중입니다',
    body: '현재 시장 스냅샷과 뉴스 스트림을 수집해 해석을 조립하고 있습니다. 잠시 후 자동 갱신됩니다.',
    faqChips: [],
  },
  kairosAi: kairosAiMock,
  opportunities: [],
  history: {
    entries: [],
    stats: {
      total: 0,
      hitCount: 0,
      missCount: 0,
      partialCount: 0,
      pendingCount: 0,
      hitRateLabel: '평가 데이터 축적 중',
    },
  },
  events: [],
  lastUpdatedAt: heroMock.generatedAt,
  dataSources: insightsPageMock.dataSources,
}

/** 적중률 낮음 variant — 최근 miss/partial 비중이 높은 시나리오 */
export const insightsMockLowHitRate: InsightsPageMock = {
  ...insightsPageMock,
  history: {
    entries: historyEntriesMock.map((entry, idx) => ({
      ...entry,
      horizon24h:
        idx % 2 === 0
          ? { ...entry.horizon24h, outcome: 'miss', outcomeLabel: '빗나감' }
          : entry.horizon24h,
    })),
    stats: {
      total: 5,
      hitCount: 1,
      missCount: 3,
      partialCount: 1,
      pendingCount: 0,
      hitRateLabel: '적중률 1/5',
    },
  },
}

// ═══════════════════════════════════════════════════════════════════
// § Supabase 쿼리 템플릿 (참조용, 실제 구현 시 사용)
// ═══════════════════════════════════════════════════════════════════

export const SUPABASE_QUERIES = {
  recentHistory: `
    SELECT
      id, generated_at, headline, body, mentioned_symbols, sentiment_direction,
      evaluated_24h_at, outcome_24h, actual_24h_pct, actual_24h_text,
      evaluated_72h_at, outcome_72h, actual_72h_pct, actual_72h_text
    FROM public.kairos_narrative_history
    ORDER BY generated_at DESC
    LIMIT 5
  `.trim(),

  historyStats: `
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE outcome_24h = 'hit') as hit_24h,
      COUNT(*) FILTER (WHERE outcome_24h = 'miss') as miss_24h,
      COUNT(*) FILTER (WHERE outcome_24h = 'partial') as partial_24h,
      COUNT(*) FILTER (WHERE outcome_24h = 'pending' OR outcome_24h IS NULL) as pending_24h,
      COUNT(*) FILTER (WHERE outcome_72h = 'hit') as hit_72h,
      COUNT(*) FILTER (WHERE outcome_72h = 'pending' OR outcome_72h IS NULL) as pending_72h
    FROM public.kairos_narrative_history
    WHERE generated_at >= NOW() - INTERVAL '14 days'
  `.trim(),

  activeFaqs: `
    SELECT id, question, answer, related_symbols, active_until, priority
    FROM public.kairos_faq_rotation
    WHERE active_until > NOW()
    ORDER BY priority ASC
    LIMIT 4
  `.trim(),
}
