/**
 * 트렌드 v8 / 종목상세 게이지 공용 툴팁 메타 (AIX-6 · AIX-82)
 */

export const INDICATOR_TOOLTIPS = {
  signal: {
    title: '시그널',
    subtitle: 'AiXSignal 고유 시그널 · 신뢰도 A/B+/C 차등',
    formula: '진입가 · 목표가 · 무효가 3축 + 신뢰도',
    scaleExplain: 'LIVE = 현재 진행 · WAIT = 조건 대기 · 없음 = 신호 부재',
  },
  trendStrength: {
    title: '추세강도',
    subtitle: 'AiXSignal 고유 · EMA 5·20·50·200 정렬도',
    formula: '4개 EMA가 순차 정렬되고 간격이 균등할수록 강',
    scaleExplain: '강 = 4축 모두 정렬 · 중 = 부분 정렬 · 약 = 혼조',
  },
  shortTermTrend: {
    title: '단기추세',
    subtitle: '1분봉 EMA 5/20 기준',
    formula: 'EMA5 - EMA20, 간격 1% 이상 = 강',
    scaleExplain: '↑↑ 강롱 · ↑ 롱 · → 중립 · ↓ 숏 · ↓↓ 강숏',
  },
  longTermTrend: {
    title: '장기추세',
    subtitle: '1시간봉 EMA 12/26 + 1일봉 SMA 50/200 종합',
    formula: '단기 EMA와 장기 SMA의 정배열 여부',
    scaleExplain: '↑↑ 정배열 · ↓↓ 역배열',
  },
  volatility: {
    title: '변동량',
    subtitle: 'AiXSignal 고유 · ATR + 박스권 너비',
    formula: '(High - Low) / Close × 100 + ATR 정규화',
    scaleExplain: '낮 < 2% · 중 2-5% · 높 5-8% · 극 > 8% (방향 무관)',
  },
  rsi14: {
    title: 'RSI (14)',
    subtitle: 'Relative Strength Index · 상대강도지수',
    formula: '100 - 100 / (1 + 평균상승폭/평균하락폭)',
    scaleExplain: '>70 과열 (숏 환산) · 30-70 중립 · <30 과매도 (롱 환산)',
  },
  stochK: {
    title: 'Stochastic %K',
    subtitle: '스토캐스틱 · 14일 기준',
    formula: '100 × (현재가 - 최저가) / (최고가 - 최저가)',
    scaleExplain: '>80 과열 · 20-80 중립 · <20 과매도',
  },
  macd: {
    title: 'MACD',
    subtitle: 'Moving Average Convergence Divergence',
    formula: 'EMA12 - EMA26 (시그널선 9일 EMA와 교차 여부)',
    scaleExplain: '↑ 골든크로스 · ↓ 데드크로스 · → 평행',
  },
  stochRsi: {
    title: 'Stochastic RSI',
    subtitle: 'RSI를 스토캐스틱 방식으로 재계산',
    formula: '(RSI - RSI최저) / (RSI최고 - RSI최저)',
    scaleExplain: '>80 극과열 · 20-80 중립 · <20 극과매도',
  },
  williamsR: {
    title: 'Williams %R',
    subtitle: '래리 윌리엄스 역지표',
    formula: '(최고가 - 현재가) / (최고가 - 최저가) × -100',
    scaleExplain: '-20~0 과열 (숏) · -80~-20 중립 · -100~-80 과매도 (롱)',
  },
  ultimateOsc: {
    title: 'Ultimate Oscillator',
    subtitle: '7·14·28 가중 복합',
    formula: '가중 평균 (4×BP7 + 2×BP14 + BP28) / (4+2+1)',
    scaleExplain: '>70 과열 · 30-70 중립 · <30 과매도',
  },
  ema50: {
    title: 'EMA 50',
    subtitle: '50 지수이동평균 (1h)',
    formula: '2/(50+1) 가중 반영',
    scaleExplain: '가격 > EMA50 = 롱 · 가격 < EMA50 = 숏',
  },
  ema200: {
    title: 'EMA 200',
    subtitle: '200 지수이동평균 (1h)',
    formula: '2/(200+1) 가중 반영',
    scaleExplain: '가격 > EMA200 = 롱 · 이하 숏',
  },
  sma50: {
    title: 'SMA 50',
    subtitle: '50 단순이동평균 (1d)',
    formula: '최근 50일 평균',
    scaleExplain: '가격 > SMA50 = 롱',
  },
  sma200: {
    title: 'SMA 200',
    subtitle: '200 단순이동평균 (1d)',
    formula: '최근 200일 평균 (장기 추세)',
    scaleExplain: '가격 > SMA200 = 장기 롱',
  },
  oiDirection: {
    title: '미결제약정 (OI)',
    subtitle: 'Open Interest 방향성',
    formula: 'ΔOI × Δprice 조합 (1h 기준)',
    scaleExplain: 'OI↑ + 가격↑ = 강롱 (매수우세) · OI↑ + 가격↓ = 강숏 (숏우세)',
  },
  fundingRate: {
    title: '펀딩비',
    subtitle: 'Binance Futures 펀딩비 (역상관)',
    formula: '현재 펀딩비율 × 3 (1일 환산)',
    scaleExplain: '높음 (+0.03% 이상) = 롱 과밀 → 숏 압력 임박. 반대로 낮음 = 롱 기회.',
  },
  longShortRatio: {
    title: 'L/S 비율',
    subtitle: 'Binance Futures 롱/숏 포지션 비율',
    formula: '상위 계정 롱 포지션 수 / 숏 포지션 수',
    scaleExplain: '>1.5 강롱 · 1.0-1.5 롱 · ~1.0 중립 · 0.7-1.0 숏 · <0.7 강숏',
  },
  liquidationHeatmap: {
    title: '청산 히트맵',
    subtitle: 'Binance Futures 24h 청산 불균형',
    formula: '(롱 청산량 - 숏 청산량) / 총 청산량',
    scaleExplain: '숏 청산 우세 = 롱 (매수 압력) · 롱 청산 우세 = 숏',
  },
  fearGreed: {
    title: '공포/탐욕 지수',
    subtitle: 'Crypto Fear & Greed (Alternative.me · 역상관)',
    formula: '시장 변동성·거래량·SNS·검색 등 5요소 합산',
    scaleExplain: '>75 탐욕 (숏 기회) · 25-75 중립 · <25 공포 (롱 기회)',
  },
} as const

export type IndicatorTooltipKey = keyof typeof INDICATOR_TOOLTIPS
