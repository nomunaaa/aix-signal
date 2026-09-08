/**
 * 모의매매 손익 계산 — 도움말 패널에 명시한 공식과 동일하게 유지한다.
 *   명목 규모 = 증거금(capital) × 레버리지
 *   수익금    = 명목 규모 × 가격변동률
 *   수익률(ROE) = 가격변동률 × 레버리지
 */

/** 방향을 반영한 가격 변동률(%). 숏은 부호가 뒤집힌다. */
export function priceChangePct(
  direction: 'long' | 'short',
  entryPrice: number,
  currentPrice: number
): number {
  if (!entryPrice) return 0;
  const diff = direction === 'long' ? currentPrice - entryPrice : entryPrice - currentPrice;
  return (diff / entryPrice) * 100;
}

/** 레버리지를 반영한 수익률(ROE, %). */
export function roePct(changePct: number, leverage: number): number {
  return changePct * (leverage || 1);
}

/** 수익금(USD) = 증거금 × 레버리지 × 가격변동률. */
export function pnlUsd(capital: number, leverage: number, changePct: number): number {
  return capital * (leverage || 1) * (changePct / 100);
}
