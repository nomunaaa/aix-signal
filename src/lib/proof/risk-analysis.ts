/**
 * 연속 거래 및 리스크 분석 — 연속 수익/손실 구간과 MUR/MDD.
 *
 * 이 값들은 proof_stats의 합계로는 만들 수 없다. 합계는 순서에 무관하지만
 * "연속 몇 번"과 "자산 곡선의 최고점 대비 낙폭"은 청산 순서에 전적으로 의존한다
 * (버킷 두 개를 더해도 그 사이가 어떻게 뒤섞였는지 알 수 없다). 그래서 청산
 * 시각 순으로 정렬된 사이클 목록을 입력으로 받는다.
 *
 * 금액이 아니라 '비율(pnlPerEntryNotionalRate)'로 계산해 돌려준다 — 시드/비중/
 * 레버리지는 사용자가 언제든 바꾸므로, 화면에서 곱하기만 하면 재조회 없이 즉시
 * 반영된다. 페이지의 다른 카드들도 같은 방식이다.
 */

/** 청산 순서대로 정렬되어 있어야 하는 최소 입력. */
export interface RiskCycleInput {
  /** 청산 시각(ms). 정렬 및 기간 분할에만 쓴다. */
  exitMs: number;
  /** 1회 진입 명목가 대비 손익률. 합산 가능한 값이어야 한다. */
  pnlPerEntryNotionalRate: number;
}

export interface StreakResult {
  /** 최대 연속 횟수. */
  count: number;
  /** 그 구간의 손익률 합 — 수익은 양수, 손실은 음수로 둔다. */
  rateSum: number;
}

export interface RiskAnalysisResult {
  /** 집계에 쓰인 사이클 수 — 0이면 화면에서 '—'로 비워야 한다. */
  cycleCount: number;
  consecutiveWin: StreakResult;
  consecutiveLoss: StreakResult;
  /** MUR — 자산 곡선의 저점 대비 최대 상승폭(비율, 양수). */
  maxUpsideRunRate: number;
  /** MDD — 자산 곡선의 고점 대비 최대 낙폭(비율, 음수 또는 0). */
  maxDrawdownRate: number;
}

export function emptyRiskAnalysis(): RiskAnalysisResult {
  return {
    cycleCount: 0,
    consecutiveWin: { count: 0, rateSum: 0 },
    consecutiveLoss: { count: 0, rateSum: 0 },
    maxUpsideRunRate: 0,
    maxDrawdownRate: 0,
  };
}

/**
 * 손익 0인 사이클은 연속 구간을 끊지 않고 건너뛴다 — 수수료 등으로 0이 찍힌
 * 거래 하나 때문에 이어지던 연속 기록이 잘리면 실제 체감과 어긋난다.
 */
function isWin(rate: number): boolean {
  return rate > 0;
}

function isLoss(rate: number): boolean {
  return rate < 0;
}

/**
 * @param cycles 청산 시각 오름차순으로 정렬된 사이클. 정렬은 호출부 책임이다.
 */
export function computeRiskAnalysis(cycles: readonly RiskCycleInput[]): RiskAnalysisResult {
  if (cycles.length === 0) return emptyRiskAnalysis();

  let bestWin: StreakResult = { count: 0, rateSum: 0 };
  let bestLoss: StreakResult = { count: 0, rateSum: 0 };
  let runWinCount = 0;
  let runWinSum = 0;
  let runLossCount = 0;
  let runLossSum = 0;

  // 자산 곡선은 '누적 손익률'로 본다. 시드가 바뀌어도 모양이 같으므로 비율로
  // 계산해 두면 화면에서 금액으로 환산하기만 하면 된다.
  let equity = 0;
  let peak = 0;
  let trough = 0;
  let maxUpsideRunRate = 0;
  let maxDrawdownRate = 0;

  for (const cycle of cycles) {
    const rate = Number.isFinite(cycle.pnlPerEntryNotionalRate)
      ? cycle.pnlPerEntryNotionalRate
      : 0;

    if (isWin(rate)) {
      runWinCount += 1;
      runWinSum += rate;
      if (runWinCount > bestWin.count) bestWin = { count: runWinCount, rateSum: runWinSum };
      runLossCount = 0;
      runLossSum = 0;
    } else if (isLoss(rate)) {
      runLossCount += 1;
      runLossSum += rate;
      if (runLossCount > bestLoss.count) bestLoss = { count: runLossCount, rateSum: runLossSum };
      runWinCount = 0;
      runWinSum = 0;
    }

    equity += rate;
    // 고점을 새로 쓰면 낙폭 기준점이, 저점을 새로 쓰면 상승폭 기준점이 옮겨간다.
    if (equity > peak) peak = equity;
    if (equity < trough) trough = equity;

    const drawdown = equity - peak;
    if (drawdown < maxDrawdownRate) maxDrawdownRate = drawdown;

    const upsideRun = equity - trough;
    if (upsideRun > maxUpsideRunRate) maxUpsideRunRate = upsideRun;
  }

  return {
    cycleCount: cycles.length,
    consecutiveWin: bestWin,
    consecutiveLoss: bestLoss,
    maxUpsideRunRate,
    maxDrawdownRate,
  };
}

/** 기간별(최근 30일 / 최근 3개월 / 누적) 결과를 한 번에 만든다. */
export interface RiskAnalysisByPeriod {
  recent30: RiskAnalysisResult;
  recent3mo: RiskAnalysisResult;
  total: RiskAnalysisResult;
}

const DAY_MS = 86_400_000;

export function computeRiskAnalysisByPeriod(
  cycles: readonly RiskCycleInput[],
  nowMs: number
): RiskAnalysisByPeriod {
  const ordered = [...cycles].sort((a, b) => a.exitMs - b.exitMs);
  const from30 = nowMs - 30 * DAY_MS;
  const from3mo = nowMs - 90 * DAY_MS;

  return {
    recent30: computeRiskAnalysis(ordered.filter((c) => c.exitMs >= from30)),
    recent3mo: computeRiskAnalysis(ordered.filter((c) => c.exitMs >= from3mo)),
    total: computeRiskAnalysis(ordered),
  };
}
