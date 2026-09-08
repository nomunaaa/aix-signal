import { useTranslation } from 'react-i18next';

export type PulseLanguage = 'ko' | 'en';

export type PulseCopy = {
  upgrade: {
    title: string;
    description: string;
  };
  sections: {
    discount: { title: string; subtitle: string; emptyTitle: string; emptyDescription: string };
    profit: { title: string; subtitle: string; emptyTitle: string; emptyDescription: string };
    nonTrend: { title: string; subtitle: string; emptyTitle: string; emptyDescription: string };
    waiting: { title: string; subtitle: string; emptyTitle: string; emptyDescription: string };
  };
  emptyFilter: {
    labels: Record<'discount' | 'profit' | 'nonTrend' | 'waiting', string>;
    liveWaiting: string;
    waitOpen: string;
    none: string;
    title: (section: string, filter: 'LIVE' | 'WAIT') => string;
  };
  reconnecting: string;
  actionBar: {
    streamGroup: string;
    streamSelect: (label: string) => string;
    confidenceDetail: (label: string) => string;
    strategyPanel: string;
    strategy: string;
    simulationTitle: string;
    simulationSettings: string;
    simulationHint: string;
    simulationAria: (summary: string) => string;
  };
  strategyPanel: {
    selectTitle: string;
    edit: string;
    radioGroup: string;
    winRate: string;
    risk: string;
    extraSignalsNone: string;
    vsOneShot: string;
  };
  tableControls: {
    search: string;
    searchPlaceholder: string;
    viewPreset: string;
    columnConfig: string;
    timeDirection: string;
    direction: string;
    directionTime: string;
    filter: string;
    rowFilter: string;
    all: string;
    allSymbols: string;
    favoritesOnly: string;
    showAllSymbols: string;
    showFavoritesOnly: string;
    sortAria: string;
    sortPlaceholder: string;
    sortItems: Record<'time' | 'symbol' | 'volume' | 'discount' | 'pnl', string>;
    open: string;
    waiting: string;
    updateTitle: string;
    reconnecting: string;
    normalDensity: string;
    compactDensity: string;
    filterOptions: Record<string, string>;
  };
  columnPicker: {
    aria: string;
    trigger: string;
    base: string;
    optional: string;
    empty: string;
  };
  history: {
    emptyTitle: string;
    emptyDescription: string;
    title: string;
    expandAria: string;
    exportCsv: string;
    description: string;
    filterNote: string;
    searchPlaceholder: string;
    strategyPlaceholder: string;
    all: string;
    allStrategies: string;
    minReturn: string;
    maxReturn: string;
    startDate: string;
    endDate: string;
    reset: string;
    csvHeaders: string[];
    sortNewestFirst: string;
    sortOldestFirst: string;
    totalRowLabel: string;
  };
  simulation: {
    amount: string;
    entryRatio: string;
    entryRatioHelp: string;
    leverage: string;
    entryAmount: string;
    positionSize: string;
    maxPositions: string;
    maxSignals: string;
    estimatedReturn: string;
    estimateOnly: string;
    disclaimer: string;
    totalAsset: string;
    entryAmountTimes: string;
    countSuffix: string;
  };
  gate: {
    selectTitle: string;
    changeTitle: string;
    selectPrompt: string;
    description: string;
    stream: string;
    strategy: string;
    pickStreamFirst: string;
    start: string;
    changeAnytime: string;
    disclaimer: string;
    recommended: string;
    detailAria: (title: string) => string;
    featureDiscount: string;
    featureLocked: string;
    streams: Record<'pulse' | 'wave', { title: string; badges: readonly string[]; tagline: string; detail: string }>;
  };
};

const KO_COPY: PulseCopy = {
  upgrade: {
    title: 'Upgrade required',
    description: 'Free plan does not include symbol market data. Choose Pro to view signals.',
  },
  sections: {
    discount: {
      title: '추세/할인진입',
      subtitle: '단기추세/장기추세 일치, 시그널보다 할인된 시장가로 진입 유리 종목',
      emptyTitle: '할인진입 시그널 없음',
      emptyDescription: '현재 손실 구간의 추세 시그널이 없습니다.',
    },
    profit: {
      title: '추세/수익실현',
      subtitle: '단기추세/장기추세 일치. 진입 후 포지션대로 수익창출중',
      emptyTitle: '수익실현 시그널 없음',
      emptyDescription: '현재 수익 구간의 추세 시그널이 없습니다.',
    },
    nonTrend: {
      title: '비추세',
      subtitle: '단기추세/장기추세 이탈. 변동성 포함한 전략 실행',
      emptyTitle: '비추세 시그널 없음',
      emptyDescription: '현재 추세 이탈 시그널이 없습니다.',
    },
    waiting: {
      title: '대기중 신호',
      subtitle: '추세/할인진입·추세/수익실현·비추세 라이브에 올라가 있지 않은 종목. 예상대기는 최근 7일 평균 신호 간격 대비 잔여(분)입니다.',
      emptyTitle: '대기 종목 없음',
      emptyDescription: '현재 신호 대기 중인 종목이 없습니다.',
    },
  },
  emptyFilter: {
    labels: {
      discount: '할인진입',
      profit: '수익실현',
      nonTrend: '비추세',
      waiting: '대기',
    },
    liveWaiting: '대기 행은 WAIT입니다. LIVE만 보려면 오픈 구간 테이블을 확인하세요.',
    waitOpen: '오픈 사이클은 LIVE입니다. WAIT만 보려면 대기 테이블을 확인하세요.',
    none: '조건에 맞는 행이 없습니다.',
    title: (section, filter) => `▸ ${section} · ${filter} 필터 적용 시 해당 없음`,
  },
  reconnecting: '실시간 연결이 끊어졌습니다. 재연결 중...',
  actionBar: {
    streamGroup: '스트림 선택',
    streamSelect: (label) => `${label} 스트림 선택`,
    confidenceDetail: (label) => `${label} 신뢰도 상세`,
    strategyPanel: '전략 선택 패널',
    strategy: '전략',
    simulationTitle: '수익 시뮬레이션',
    simulationSettings: '시뮬레이션 설정',
    simulationHint: '시뮬레이션은 선택한 전략·자본 가정을 반영',
    simulationAria: (summary) => `수익 시뮬레이션: ${summary}`,
  },
  strategyPanel: {
    selectTitle: '전략 선택',
    edit: '전략 수정',
    radioGroup: '전략 선택',
    winRate: '승률',
    risk: '리스크',
    extraSignalsNone: '추가 신호: 없음',
    vsOneShot: 'vs 원샷',
  },
  tableControls: {
    search: '종목 검색',
    searchPlaceholder: '종목 검색...',
    viewPreset: '뷰 프리셋',
    columnConfig: '열 구성',
    timeDirection: '시간 · 방향',
    direction: '방향',
    directionTime: '방향 + 시간',
    filter: '필터',
    rowFilter: '행 필터',
    all: '전체',
    allSymbols: '전체종목',
    favoritesOnly: '즐겨찾기만',
    showAllSymbols: '전체 종목 보기',
    showFavoritesOnly: '즐겨찾기만 보기',
    sortAria: '정렬 기준',
    sortPlaceholder: '정렬',
    sortItems: {
      time: '시간순',
      symbol: '종목순',
      volume: '거래량순',
      discount: '할인율순',
      pnl: '수익률순',
    },
    open: '오픈',
    waiting: '대기',
    updateTitle: '시그널·가격 반영 기준 시각',
    reconnecting: '재연결…',
    normalDensity: '일반 밀도',
    compactDensity: '컴팩트 밀도',
    filterOptions: {
      'all|all': '기간 · 방향',
      'latest|all': '최신 (10분)',
      'changing|all': '이동 중',
      'fixed|all': '고정 (1시간+)',
      'all|long': 'Long',
      'all|short': 'Short',
      'latest|long': 'Long · 최신 (10분)',
      'latest|short': 'Short · 최신 (10분)',
      'changing|long': 'Long · 이동 중',
      'changing|short': 'Short · 이동 중',
      'fixed|long': 'Long · 고정 (1시간+)',
      'fixed|short': 'Short · 고정 (1시간+)',
    },
  },
  columnPicker: {
    aria: '표시 컬럼 선택',
    trigger: '컬럼',
    base: '기본 컬럼',
    optional: '옵션 컬럼',
    empty: '(빈)',
  },
  history: {
    emptyTitle: '거래 히스토리가 없습니다',
    emptyDescription: '청산된 시그널 기록이 여기에 표시됩니다.',
    title: '히스토리',
    expandAria: '히스토리 섹션 펼침. 청산 종료(CLOSED) 목록은 LIVE·WAIT 행 필터와 무관합니다.',
    exportCsv: 'CSV 내보내기',
    description: '사이클당 진입·중간진입·중간청산·청산 등 최대 4단계가 있을 수 있습니다. 시간 기준 정렬 시 표본에서 승률과 평균 수익 합산이 가장 높은 전략 묶음을 먼저 보여 줍니다. 행을 눌러 다른 전략과 PnL을 비교하세요.',
    filterNote: '청산 종료(CLOSED)는 LIVE·WAIT 행 필터와 무관합니다.',
    searchPlaceholder: '종목 검색...',
    strategyPlaceholder: '전략',
    all: '매매방향',
    allStrategies: '전체 전략',
    minReturn: '최소 수익률',
    maxReturn: '최대 수익률',
    startDate: '시작일',
    endDate: '종료일',
    reset: '초기화',
    csvHeaders: ['종목', '방향', '추가매수', '중간청산', '진입가', '청산가', '손익($)', '손익(%)', '보유시간', '청산일시'],
    sortNewestFirst: '최신순',
    sortOldestFirst: '오래된순',
    totalRowLabel: '합계',
  },
  simulation: {
    amount: '투자 시뮬레이션 금액',
    entryRatio: '진입 비율',
    entryRatioHelp: '총자산 중 한 포지션에 쓸 비율입니다.',
    leverage: '레버리지',
    entryAmount: '포지션당 진입금',
    positionSize: '포지션 크기',
    maxPositions: '동시 진입 가능',
    maxSignals: '최대 신호',
    estimatedReturn: '전략 기준 추정 수익률',
    estimateOnly: '참고용 추정',
    disclaimer: '참고용 시뮬레이션입니다. 투자 결정은 본인 책임이며, 표시 수치는 미래 수익을 보장하지 않습니다.',
    totalAsset: '총자산',
    entryAmountTimes: '진입금',
    countSuffix: '개',
  },
  gate: {
    selectTitle: '스트림·전략 선택',
    changeTitle: '스트림·전략 변경',
    selectPrompt: '스트림과 전략을 선택하세요',
    description: '최근 30일 시뮬레이션 성과 기준입니다',
    stream: '스트림',
    strategy: '전략',
    pickStreamFirst: '스트림을 먼저 선택하세요',
    start: '이 설정으로 시작',
    changeAnytime: '언제든 변경 가능합니다',
    disclaimer: '최근 30일 시뮬레이션 기준 — 실제 수익을 보장하지 않습니다',
    recommended: '추천',
    detailAria: (title) => `${title} 상세`,
    featureDiscount: '추가매수',
    featureLocked: '분할매도',
    streams: {
      pulse: {
        title: '펄스',
        badges: ['1분', '단기'],
        tagline: '1분마다 갱신 · 초단타에 맞춘 고빈도 시그널',
        detail: '1분봉에 맞춘 스트림입니다. 신호가 자주 들어와 짧은 호가·초단타에 익숙한 분께 맞고, 포지션을 오래 붙잡지 않는 스타일에 가깝습니다.',
      },
      wave: {
        title: '웨이브',
        badges: ['10분', '데이'],
        tagline: '10분마다 갱신 · 덜 촘촘해서 추세 보기 쉬움',
        detail: '10분봉에 맞춘 스트림입니다. 펄스보다 신호 간격이 넓어 잡음이 줄고, 방향을 가늠하기 쉬운 데이·스윙 성향에 가깝습니다.',
      },
    },
  },
};

const EN_COPY: PulseCopy = {
  upgrade: KO_COPY.upgrade,
  sections: {
    discount: {
      title: 'Trend / Discount Entry',
      subtitle: 'Short and long trends align; market price is discounted versus the signal entry.',
      emptyTitle: 'No discount-entry signals',
      emptyDescription: 'There are no trend signals currently in a loss/discount zone.',
    },
    profit: {
      title: 'Trend / Profit Taking',
      subtitle: 'Short and long trends align; positions are moving profitably after entry.',
      emptyTitle: 'No profit-taking signals',
      emptyDescription: 'There are no trend signals currently in a profit-taking zone.',
    },
    nonTrend: {
      title: 'Non-Trend',
      subtitle: 'Short or long trend has broken; strategy execution includes volatility handling.',
      emptyTitle: 'No non-trend signals',
      emptyDescription: 'There are no current trend-break signals.',
    },
    waiting: {
      title: 'Waiting Signals',
      subtitle: 'Symbols not live in Trend/Discount, Trend/Profit, or Non-Trend. Estimated wait is the remaining minutes versus the recent 7-day average signal interval.',
      emptyTitle: 'No waiting symbols',
      emptyDescription: 'There are no symbols currently waiting for a signal.',
    },
  },
  emptyFilter: {
    labels: {
      discount: 'Discount entry',
      profit: 'Profit taking',
      nonTrend: 'Non-trend',
      waiting: 'Waiting',
    },
    liveWaiting: 'Waiting rows are WAIT. Check the open-zone tables when viewing LIVE only.',
    waitOpen: 'Open cycles are LIVE. Check the waiting table when viewing WAIT only.',
    none: 'No rows match the current conditions.',
    title: (section, filter) => `▸ ${section} · no rows for ${filter} filter`,
  },
  reconnecting: 'Live connection was lost. Reconnecting...',
  actionBar: {
    streamGroup: 'Stream selector',
    streamSelect: (label) => `Select ${label} stream`,
    confidenceDetail: (label) => `${label} confidence details`,
    strategyPanel: 'Strategy selection panel',
    strategy: 'Strategy',
    simulationTitle: 'Profit Simulation',
    simulationSettings: 'Simulation Settings',
    simulationHint: 'Simulation reflects the selected strategy and capital assumptions',
    simulationAria: (summary) => `Profit simulation: ${summary}`,
  },
  strategyPanel: {
    selectTitle: 'Choose Strategy',
    edit: 'Edit Strategy',
    radioGroup: 'Choose strategy',
    winRate: 'Win Rate',
    risk: 'Risk',
    extraSignalsNone: 'Additional signals: none',
    vsOneShot: 'vs One Shot',
  },
  tableControls: {
    search: 'Search symbol',
    searchPlaceholder: 'Search symbol...',
    viewPreset: 'View preset',
    columnConfig: 'Column setup',
    timeDirection: 'Time · Direction',
    direction: 'Direction',
    directionTime: 'Direction + Time',
    filter: 'Filter',
    rowFilter: 'Row filter',
    all: 'All',
    allSymbols: 'All symbols',
    favoritesOnly: 'Favorites only',
    showAllSymbols: 'Show all symbols',
    showFavoritesOnly: 'Show favorites only',
    sortAria: 'Sort by',
    sortPlaceholder: 'Sort',
    sortItems: {
      time: 'By time',
      symbol: 'By symbol',
      volume: 'By volume',
      discount: 'By discount',
      pnl: 'By return',
    },
    open: 'Open',
    waiting: 'Waiting',
    updateTitle: 'Signal and price update time',
    reconnecting: 'Reconnecting...',
    normalDensity: 'Normal density',
    compactDensity: 'Compact density',
    filterOptions: {
      'all|all': 'Period · Direction',
      'latest|all': 'Latest (10m)',
      'changing|all': 'Moving',
      'fixed|all': 'Fixed (1h+)',
      'all|long': 'Long',
      'all|short': 'Short',
      'latest|long': 'Long · Latest (10m)',
      'latest|short': 'Short · Latest (10m)',
      'changing|long': 'Long · Moving',
      'changing|short': 'Short · Moving',
      'fixed|long': 'Long · Fixed (1h+)',
      'fixed|short': 'Short · Fixed (1h+)',
    },
  },
  columnPicker: {
    aria: 'Choose visible columns',
    trigger: 'Columns',
    base: 'Base Columns',
    optional: 'Optional Columns',
    empty: '(empty)',
  },
  history: {
    emptyTitle: 'No trade history',
    emptyDescription: 'Closed signal records will appear here.',
    title: 'History',
    expandAria: 'Expand history section. Closed cycles are independent of the LIVE/WAIT row filter.',
    exportCsv: 'Export CSV',
    description: 'Each cycle can include up to four steps such as entry, add-entry, partial close, and close. When sorted by time, the strategy group with the strongest sample win rate and average return is shown first. Select a row to compare strategy PnL.',
    filterNote: 'Closed cycles are independent of the LIVE/WAIT row filter.',
    searchPlaceholder: 'Search symbol...',
    strategyPlaceholder: 'Strategy',
    all: 'Trade direction',
    allStrategies: 'All strategies',
    minReturn: 'Min return',
    maxReturn: 'Max return',
    startDate: 'Start date',
    endDate: 'End date',
    reset: 'Reset',
    csvHeaders: ['Symbol', 'Direction', 'Add Buy', 'Partial Close', 'Entry', 'Exit', 'PnL($)', 'PnL(%)', 'Hold Time', 'Closed At'],
    sortNewestFirst: 'Newest first',
    sortOldestFirst: 'Oldest first',
    totalRowLabel: 'Total',
  },
  simulation: {
    amount: 'Simulation Capital',
    entryRatio: 'Entry Ratio',
    entryRatioHelp: 'Percent of total capital used for one position.',
    leverage: 'Leverage',
    entryAmount: 'Entry Per Position',
    positionSize: 'Position Size',
    maxPositions: 'Concurrent Entries',
    maxSignals: 'Max signals',
    estimatedReturn: 'Strategy Estimated Return',
    estimateOnly: 'Reference estimate',
    disclaimer: 'This simulation is for reference only. Investment decisions are your responsibility, and displayed figures do not guarantee future returns.',
    totalAsset: 'Total capital',
    entryAmountTimes: 'Entry amount',
    countSuffix: '',
  },
  gate: {
    selectTitle: 'Choose Stream & Strategy',
    changeTitle: 'Change Stream & Strategy',
    selectPrompt: 'Choose a stream and strategy',
    description: 'Based on the last 30 days of simulated performance',
    stream: 'Stream',
    strategy: 'Strategy',
    pickStreamFirst: 'Choose a stream first',
    start: 'Start with this setup',
    changeAnytime: 'You can change this anytime',
    disclaimer: 'Based on the last 30 days of simulation. Actual returns are not guaranteed.',
    recommended: 'Recommended',
    detailAria: (title) => `${title} details`,
    featureDiscount: 'DCA',
    featureLocked: 'Partial sell',
    streams: {
      pulse: {
        title: 'Pulse',
        badges: ['1m', 'Short-term'],
        tagline: 'Refreshes every minute · high-frequency signals for scalping',
        detail: 'A 1-minute candle stream. Signals arrive more frequently, fitting short order-book or scalping styles that avoid holding positions for long.',
      },
      wave: {
        title: 'Wave',
        badges: ['10m', 'Day'],
        tagline: 'Refreshes every 10 minutes · less noise, easier trend reading',
        detail: 'A 10-minute candle stream. Signals are less frequent than Pulse, reducing noise and fitting day-trading or light swing styles.',
      },
    },
  },
};

const COLUMN_HEADER_EN: Record<string, string> = {
  종목: 'Symbol',
  자산: 'Symbol',
  시그널: 'Signal',
  방향: 'Side',
  현재가: 'Current',
  진입가: 'Entry',
  '할인($)': 'Discount($)',
  '할인(%)': 'Discount(%)',
  경과: 'Elapsed',
  신선도: 'Fresh',
  추가신호: 'Add Signal',
  '추가진입($)': 'Add Entry($)',
  반영수익율: 'Adj PnL%',
  신뢰도: 'Trust',
  '수익($)': 'PnL($)',
  '수익(%)': 'PnL(%)',
  '매도이익($)': 'Sell Profit($)',
  '청산시 추세': 'Close Trend',
  '진입시 추세': 'Entry Trend',
  사이클: 'Cycle',
  추매: 'DCA',
  분청: 'Partial',
  청산가: 'Exit',
  '손익($)': 'PnL($)',
  '손익(%)': 'PnL(%)',
  보유시간: 'Hold Time',
  청산일시: 'Closed At',
  출처: 'Source',
  할인: 'Discount',
  할인율: 'Discount Rate',
  수익율: 'PnL (%)',
  '평가손익($)': 'P/L Amount',
  분할매도: 'Partial Sell',
  분할가: 'Partial Price',
  수익: 'Profit',
  비추세: 'Non-Trend',
  신규: 'New',
  대기: 'Waiting',
  '할인진입($)': 'Discount Entry($)',
  '확정할인(%)': 'Confirmed Discount(%)',
  '실현수익($)': 'Realized PnL($)',
  '확정수익(%)': 'Locked Profit(%)',
  일별최고: 'Daily High',
  '일별최고($)': 'Daily High($)',
  일별최저: 'Daily Low',
  '일별최저($)': 'Daily Low($)',
  예상대기: 'Est. Wait',
  '5전승률': 'Last 5 WR',
  '5전수익(통합)': 'Last 5 PnL',
  '최근 진입가': 'Last Entry',
  '최근 청산가': 'Last Exit',
  진입시간: 'Entry Time',
  청산시간: 'Close Time',
  추가진입: 'Add Entry',
  추가진입가: 'Add Entry Price',
  진입평단: 'Avg Entry',
  분할청산: 'Partial Exit',
  분할평단: 'Partial Avg',
  추가시간: 'Add Time',
  '신호·갱신 시점 기준 신선도(도트 색)': 'Freshness from signal/update time (dot color)',
};

const COLUMN_LABEL_EN: Record<string, string> = {
  symbol: 'Symbol',
  direction: 'Side',
  entryPrice: 'Entry',
  currentPrice: 'Current',
  pnlPercent: 'Return',
  pnl: 'PnL',
  pnlAmount: 'PnL Amount',
  extraSignal: 'Add Signal',
  remainingTime: 'Remaining',
  discountPrice: 'Discount Price',
  discountRate: 'Discount Rate',
  additionalEntryPrice: 'Add Entry',
  additionalDiscountAmount: 'Additional Discount',
  discountGainPercent: 'Discount Entry(%)',
  discountGainAmount: 'Discount Entry($)',
  partialClosePrice: 'Partial Close',
  lockedProfitAmount: 'Locked Profit',
  lockedProfitPercent: 'Locked Profit %',
  lockedAmount: 'Locked Profit',
  lockedPercent: 'Locked Profit %',
  shortTrend: 'Short Trend',
  longTrend: 'Long Trend',
  nontrendDuration: 'Non-Trend Duration',
  volatility: 'Volatility',
  pnl1dAmount: '1D PnL',
  pnl1dPercent: '1D Return',
  pnl7dAmount: '7D PnL',
  pnl7dPercent: '7D Return',
  lastCloseTime: 'Last Close',
  todaySignalCount: 'Today Signals',
  avgCycleTime: 'Avg Cycle',
  closePrice: 'Exit',
  investPnlAmount: 'Investment PnL',
  investPnlPercent: 'Investment Return',
  cycleTime: 'Cycle',
  section: 'Section',
  status: 'Status',
  holdDuration: 'Hold Time',
  enteredAt: 'Entry Time',
  averageEntryPrice: 'Avg Entry',
  avgPnlAmount: 'Avg PnL',
  avgPnlPercent: 'Avg Return',
  elapsedSeconds: 'Entry Time',
  nonTrendEntryTime: 'Trend Change',
  partialSignal: 'Add Signal',
  partialExitPrice: 'Partial Exit',
  partialExitTime: 'Add Entry Time',
  nonTrendType: 'Non-Trend Type',
  additionalSignal: 'Add Signal',
  additionalEntryTime: 'Add Entry Time',
  dailyWinRate: '1D-7D Win Rate',
  weeklyWinRate: '7D-30D Win Rate',
  lastEntryPrice: 'Last Entry',
  lastExitPrice: 'Last Exit',
  lastPnlAmount: 'Last PnL($)',
  lastPnlPercent: 'Last PnL(%)',
};

const PRESET_LABEL_EN: Record<string, string> = {
  active: 'Default',
  new: 'Recent Entry',
  discount: 'Discount Entry',
  tp: 'Profit Taking',
  nontrend_st: 'Short Non-Trend',
  nontrend_lt: 'Long Non-Trend',
  waiting: 'Waiting Symbols',
  history: 'History',
};

const STRATEGY_EN: Record<string, { name: string; tagline: string; description: string }> = {
  oneshot: {
    name: 'One Shot',
    tagline: 'Single entry / exit',
    description: 'Creates one entry and one exit signal per symbol. Recommended for most users.',
  },
  deep: {
    name: 'Deep Buy',
    tagline: 'Average down with one DCA',
    description: 'Adds one buy in the discount zone to lower the average entry and improve profit potential.',
  },
  safe: {
    name: 'Safe',
    tagline: 'Stabilize with partial sells',
    description: 'Locks in profit with one partial sell in the profit-taking zone.',
  },
  full: {
    name: 'All Plan',
    tagline: 'DCA + partial sell',
    description: 'Combines DCA in discount zones and partial sells in profit zones for flexible capital use.',
  },
};

const STRATEGY_ONE_LINE_EN: Record<string, string> = {
  oneshot: 'One entry and one exit. The simplest strategy.',
  deep: 'Adds one buy on a decline to lower the average entry.',
  safe: 'Locks profit with one partial close in a profit zone.',
  full: 'Uses both DCA and partial closes.',
};

const STRATEGY_RISK_EN: Record<string, string> = {
  oneshot: 'Stop rule: auto close at -3%',
  deep: 'Requires additional capital (2x simulation amount)',
  safe: 'Residual position risk after early partial close',
  full: 'Maximum deployed capital (2x simulation amount)',
};

const STRATEGY_TOOLBAR_LABEL_EN: Record<string, string> = {
  '평균 PnL%': 'Avg PnL%',
  '평균 보유시간': 'Avg Hold',
  '추가진입 발동률': 'DCA Trigger Rate',
  '평균 진입가 개선': 'Avg Entry Improvement',
  '분할청산 발동률': 'Partial Close Rate',
  '평균 수익 확보율': 'Avg Profit Lock',
};

export const PULSE_COPY: Record<PulseLanguage, PulseCopy> = {
  ko: KO_COPY,
  en: EN_COPY,
};

export function pulseLanguageFromCode(code: string | undefined): PulseLanguage {
  return code?.toLowerCase().startsWith('en') ? 'en' : 'ko';
}

export function usePulseCopy(): { language: PulseLanguage; copy: PulseCopy } {
  const { i18n } = useTranslation();
  const language = pulseLanguageFromCode(i18n.resolvedLanguage ?? i18n.language);
  return { language, copy: PULSE_COPY[language] };
}

export function localizePulseText(text: string, language: PulseLanguage): string {
  if (language === 'ko') return text;
  return COLUMN_HEADER_EN[text] ?? text;
}

type LocalizableDef = {
  headerName?: string;
  headerTooltip?: string;
  children?: readonly LocalizableDef[];
};

function localizeDef(def: LocalizableDef, language: PulseLanguage): LocalizableDef {
  const next: LocalizableDef = { ...def };
  if (next.headerName) next.headerName = localizePulseText(next.headerName, language);
  if (next.headerTooltip) next.headerTooltip = localizePulseText(next.headerTooltip, language);
  if (next.children) next.children = next.children.map((child) => localizeDef(child, language));
  return next;
}

export function localizePulseColumnDefs<D>(defs: readonly D[], language: PulseLanguage): D[] {
  if (language === 'ko') return [...defs];
  return defs.map((def) => localizeDef(def as LocalizableDef, language) as D);
}

export function localizePulseColumnLabel(id: string, fallback: string, language: PulseLanguage): string {
  if (language === 'ko') return fallback;
  return COLUMN_LABEL_EN[id] ?? COLUMN_HEADER_EN[fallback] ?? fallback;
}

export function localizePulsePresetLabel(id: string, fallback: string, language: PulseLanguage): string {
  if (language === 'ko') return fallback;
  return PRESET_LABEL_EN[id] ?? fallback;
}

export function pulseStrategyName(
  strategy: { id: string; name: string; nameEn?: string },
  language: PulseLanguage,
): string {
  if (language === 'ko') return strategy.name;
  return strategy.nameEn ?? STRATEGY_EN[strategy.id]?.name ?? strategy.name;
}

export function pulseStrategyTagline(
  strategy: { id: string; tagline: string },
  language: PulseLanguage,
): string {
  if (language === 'ko') return strategy.tagline;
  return STRATEGY_EN[strategy.id]?.tagline ?? strategy.tagline;
}

export function pulseStrategyDescription(
  strategy: { id: string; description: string },
  language: PulseLanguage,
): string {
  if (language === 'ko') return strategy.description;
  return STRATEGY_EN[strategy.id]?.description ?? strategy.description;
}

export function pulseStrategyOneLine(id: string, fallback: string, language: PulseLanguage): string {
  if (language === 'ko') return fallback;
  return STRATEGY_ONE_LINE_EN[id] ?? fallback;
}

export function pulseStrategyRisk(id: string, fallback: string, language: PulseLanguage): string {
  if (language === 'ko') return fallback;
  return STRATEGY_RISK_EN[id] ?? fallback;
}

export function localizeStrategyToolbarLabel(label: string, language: PulseLanguage): string {
  if (language === 'ko') return label;
  return STRATEGY_TOOLBAR_LABEL_EN[label] ?? label;
}

export function localizeStrategyToolbarValue(value: string, language: PulseLanguage): string {
  if (language === 'ko') return value;
  return value.replace(/(\d+)분/g, '$1m').replace(/(\d+)시간/g, '$1h');
}

export function localizeStrategyExtraText(text: string, language: PulseLanguage): string {
  if (language === 'ko') return text;
  const exact: Record<string, string> = {
    '이 전략의 추가 신호': 'Additional signals for this strategy',
    '분할매수 1회 · 상태: pending / triggered / expired (모의)': 'DCA once · status: pending / triggered / expired (mock)',
    '분할청산 1회 · 상태: triggered': 'Partial close once · status: triggered',
    '분할매수 1회 · 상태: triggered': 'DCA once · status: triggered',
    '분할청산 1회 · 상태: expired': 'Partial close once · status: expired',
    'DCA 전/후 승률 변화: 62% → 78%': 'Win-rate change before/after DCA: 62% -> 78%',
    '분할 후 잔여 포지션 평균 PnL: +1.2%': 'Average PnL on remaining position after partial close: +1.2%',
    '풀사이클 완주율: 45% (두 신호 모두 발동된 비율)': 'Full-cycle completion rate: 45% (both additional signals triggered)',
  };
  return exact[text] ?? text;
}

export function formatPulseLastUpdated(d: Date | undefined | null, language: PulseLanguage): string {
  if (!d || typeof d.getTime !== 'function') return '—';
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (language === 'en') {
    if (sec < 60) return `updated ${sec}s ago`;
    return `updated ${Math.floor(sec / 60)}m ago`;
  }
  if (sec < 60) return `${sec}초 전 갱신`;
  return `${Math.floor(sec / 60)}분 전 갱신`;
}
