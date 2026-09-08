/**
 * EMA / ATR / 추세 분류 (선물 klines 기반)
 * INDICATORS.md: EMA5/20, EMA12/26, ATR(14) 정의와 동일
 */

/**
 * EMA (Exponential Moving Average)
 * @param values - close 가격 배열 (오름차순: 과거→현재)
 * @param period - EMA 기간 (5, 12, 20, 26 등)
 * @returns 각 시점의 EMA 값 배열 (처음 period-1개는 NaN)
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) {
    throw new Error(`EMA(${period}) requires at least ${period} values`);
  }

  const k = 2 / (period + 1);
  const ema: number[] = new Array(values.length).fill(NaN);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  ema[period - 1] = sum / period;

  for (let i = period; i < values.length; i++) {
    ema[i] = values[i] * k + ema[i - 1] * (1 - k);
  }

  return ema;
}

function trueRange(high: number, low: number, prevClose: number): number {
  return Math.max(
    high - low,
    Math.abs(high - prevClose),
    Math.abs(low - prevClose),
  );
}

/**
 * ATR(14) — Wilder's Smoothing
 * @param klines - Binance kline 배열 (오름차순)
 * @param period - ATR 기간 (기본 14)
 * @returns 최신 ATR 값
 */
export function calculateATR(
  klines: { high: number; low: number; close: number }[],
  period: number = 14,
): number {
  if (klines.length < period + 1) {
    throw new Error(`ATR(${period}) requires at least ${period + 1} klines`);
  }

  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    trs.push(trueRange(klines[i].high, klines[i].low, klines[i - 1].close));
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return atr;
}

/**
 * EMA 교차 기반 trend_value (1 / 0 / -1)
 * @param emaFast - 짧은 기간 EMA
 * @param emaSlow - 긴 기간 EMA
 * @param threshold - 중립 판정 임계치 (%)
 */
export function classifyTrend(
  emaFast: number,
  emaSlow: number,
  threshold: number = 0.1,
): { trendValue: number; diffPct: number } {
  const diffPct = ((emaFast - emaSlow) / emaSlow) * 100;

  let trendValue = 0;
  if (diffPct >= threshold) trendValue = 1;
  else if (diffPct <= -threshold) trendValue = -1;

  return { trendValue, diffPct };
}
