/**
 * Pulse AG Grid — 공통 열 너비·클래스.
 * 할인/수익/비추세 등 「☆·종목·방향·24h·…·추가신호」 구간을 같은 픽셀 예산으로 맞춘다.
 */

export const PULSE_CELL_CLASS = {
  symbol: 'pulse-col-symbol',
  direction: 'pulse-col-direction',
  spark: 'pulse-col-spark',
  /** 추세/할인·추세/수익 `추가신호` — 셀·내용 가운데 정렬 */
  additionalSignal: 'pulse-col-add-signal',
} as const;

/**
 * 오픈 3테이블(추세/할인·추세/수익·비추세) 공통 접두 슬롯 — `width === minWidth === maxWidth` + `suppressAutoSize`로 세로 정렬.
 * 존 B(11열~)은 섹션별 의미가 달라 동일 인덱스 강제는 하지 않되, 합리적 고정 폭만 공유한다.
 */
export const PULSE_OPEN_FIXED = {
  symbolWidth: 140,
  directionWidth: 76,
  priceEntryCurrent: 102,
  /** 할인($) ≡ 수익($) ≡ 비추세 수익($) */
  metricMoney: 92,
  /** 할인(%) ≡ 수익(%) ≡ 비추세 수익(%) */
  metricPct: 72,
  elapsed: 64,
  fresh: 52,
  /** 점+등급+점수 — 과도한 flex 흡수 방지 */
  confidence: 52,
  additionalDca: 92,
  reflectedPnl: 78,
  sellProfit: 92,
  ntHigh24: 92,
  ntLow24: 88,
} as const;

export const PULSE_GRID_COL = {
  favoriteWidth: 32,
  symbolMin: 120,
  symbolMax: 176,
  /** 좁은 뷰 핀 고정 종목 폭 */
  symbolNarrowPinned: 132,
  directionMin: 68,
  directionMax: 88,
  /** 24h 스파크 — 셀 여백 반영 */
  sparkWidth: 88,
  sparkMin: 88,
  sparkMax: 88,
  /** 진입가·현재가 등 */
  priceMin: 88,
  priceMax: 132,
  /**
   * 추가신호: 한글 15자 가정
   * (약 14–15px/글자 @ 13px 본문 기준)
   */
  additionalSignalMin: 228,
  additionalSignalMax: 320,
} as const;
