import { cn } from '@/lib/utils';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import type { ProofCopy } from './proofCopy';
import { formatUsd, hasData, projectedUsd } from './proofFormat';

/**
 * "1년 후 총자산 비교" — 최근 30일 슬라이스의 월 손익을 12개월로 단순 환산한다.
 * 총 누적 기준은 실제 경과 기간(일수) 데이터가 파이프라인에 없어 동일한 방식으로
 * 연환산하면 왜곡될 수 있어 이 바는 최근 30일 기준에서만 사용한다.
 */
export function YearProjectionBar({
  seed,
  entryRatio,
  leverage,
  yearlyFeeUsd,
  standardSlice,
  discountedSlice,
  copy,
}: {
  seed: number;
  entryRatio: number;
  leverage: number;
  yearlyFeeUsd: number;
  standardSlice: ProofCycleStatsSlice;
  discountedSlice: ProofCycleStatsSlice;
  copy: ProofCopy;
}) {
  const compute = (slice: ProofCycleStatsSlice) => {
    const present = hasData(slice);
    const monthlyProfit = projectedUsd(slice, seed, entryRatio, leverage);
    return { present, amount: seed + monthlyProfit * 12 - yearlyFeeUsd };
  };
  const standard = compute(standardSlice);
  const discounted = compute(discountedSlice);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-xs font-bold text-foreground">{copy.simulator.annualTitle}</div>
        <div className="text-[11px] text-muted-foreground">
          {copy.simulator.annualSub(formatUsd(yearlyFeeUsd))}
        </div>
      </div>
      <div className="flex gap-4">
        <span className="inline-flex items-baseline gap-1.5 text-[11px] text-muted-foreground">
          {copy.table.standard}
          <b className="font-mono text-base font-extrabold tabular-nums text-foreground">
            {standard.present ? formatUsd(standard.amount) : '—'}
          </b>
        </span>
        <span
          className={cn(
            'inline-flex items-baseline gap-1.5 text-[11px] text-muted-foreground'
          )}
        >
          {copy.table.discounted}
          <b className="font-mono text-base font-extrabold tabular-nums text-emerald-500">
            {discounted.present ? formatUsd(discounted.amount) : '—'}
          </b>
        </span>
      </div>
    </div>
  );
}
