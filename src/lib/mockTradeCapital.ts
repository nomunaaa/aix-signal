/**
 * 모의매매 고정 원금.
 * 손익에 따라 복리로 늘거나 줄지 않는다 — 모든 시그널 성과를 같은 기준으로 비교하기 위해
 * 진입마다 항상 이 금액을 원금으로 본다.
 */
export const MOCK_BASE_CAPITAL = 100_000;

/** 증거금 = 원금 × 비중%. */
export function mockMarginFromPct(pct: number): number {
  return (MOCK_BASE_CAPITAL * pct) / 100;
}
