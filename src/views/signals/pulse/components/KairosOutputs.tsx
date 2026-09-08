/**
 * KAIROS panel outputs: 3종 세트 only — 범위, 리스크, 근거(표본/기간).
 * Decision support only; copy/tooltips from docs/ui/kairos-copy.md.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KellyBreakdown } from '../hooks/useSimulation';

export type LiqRiskLevel = 'low' | 'medium' | 'high';

export interface KairosOutputsValues {
  /** 권장 레버리지 범위 e.g. [5, 15] */
  leverageRange: [number, number];
  /** 권장 마진 비율 (%) e.g. 10 */
  recommendedMarginPct: number;
  /** 권장 마진 금액 ($) — capital * (marginPct/100) */
  recommendedMarginUsd: number;
  /** 예상 낙폭 참고치 (%) e.g. 15 */
  riskDdPct: number;
  /** 청산가 대비 거리 설명 e.g. "약 -12% 시 청산 근접" */
  liqDistanceLabel: string;
  /** 청산 위험 수준 */
  liqRiskLevel: LiqRiskLevel;
  /** 예상 수익률 참고치 (%) — mocked, leverage-dependent */
  expectedReturnRefPct: number;
  /** 예상 월 복리수익률 (%) — 켈리공식 기반 */
  monthlyCompoundReturnPct: number;
  /** 예상 월 복리수익 금액 ($) */
  monthlyCompoundReturnUsd: number;
  /** 표본 건수 */
  sampleCount: number;
  /** 표본 기간 (일) */
  samplePeriodDays: number;
}

export interface KairosOutputsProps {
  readonly values?: KairosOutputsValues;
  readonly kellyBreakdown?: KellyBreakdown | null;
  readonly className?: string;
}

const defaultValues: KairosOutputsValues = {
  leverageRange: [5, 15],
  recommendedMarginPct: 10,
  recommendedMarginUsd: 10000,
  riskDdPct: 15,
  liqDistanceLabel: '약 -12% 시 청산 근접',
  liqRiskLevel: 'medium',
  expectedReturnRefPct: 8,
  monthlyCompoundReturnPct: 5.2,
  monthlyCompoundReturnUsd: 520,
  sampleCount: 1234,
  samplePeriodDays: 30,
};

const LIQ_RISK_LABELS: Record<LiqRiskLevel, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

export function KairosOutputs({ values: valuesProp, kellyBreakdown, className }: KairosOutputsProps) {
  const values = valuesProp ?? defaultValues;
  const {
    leverageRange,
    recommendedMarginPct,
    recommendedMarginUsd,
    riskDdPct,
    liqDistanceLabel,
    liqRiskLevel,
    monthlyCompoundReturnPct,
    monthlyCompoundReturnUsd,
    sampleCount,
    samplePeriodDays,
  } = values;

  const kb = kellyBreakdown;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('space-y-5', className)}>
        {/* 1. 권장 레버리지 범위 */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">권장 레버리지 범위</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="권장 레버리지 범위 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                {kb ? (
                  <div className="space-y-1.5">
                    <p>최적 노출(exposure) x* = {kb.optimalExposure}, 권장 x = ε × x* = {kb.recommendedExposure}</p>
                    <p>MDD {kb.mddPct}% 기준, 안전 레버리지 상한 {kb.maxSafeLeverage}x</p>
                    <p className="text-muted-foreground text-xs">과거 표본 기반 참고 구간. 현재 시장과 다를 수 있습니다.</p>
                  </div>
                ) : (
                  '과거 표본 기반 참고 구간입니다. 현재 시장과 다를 수 있습니다.'
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-mono font-semibold text-foreground tabular-nums">
            {leverageRange[0]}x ~ {leverageRange[1]}x
          </p>
        </div>

        {/* 2. 권장 마진 투입 (% and $) */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">권장 마진 투입</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="권장 마진 투입 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                {kb ? (
                  <div className="space-y-1.5">
                    <p className="font-mono text-xs">{kb.formula}</p>
                    <p>최적 노출 x* = {kb.optimalExposure} → ε({kb.epsilon}) 감쇠 → xRec = {kb.recommendedExposure}</p>
                    <p>자본비율 범위: {kb.fractionalRange[0]}%~{kb.fractionalRange[1]}%</p>
                    {kb.alpha > 0 && (
                      <p>추가매수 반영 (α={kb.alpha}): r = x / ((1+α) × L)</p>
                    )}
                    <p className="text-muted-foreground text-xs">참고용. 실제 마진은 거래소·포지션에 따라 다릅니다.</p>
                  </div>
                ) : (
                  '참고용입니다. 실제 필요한 마진은 거래소·포지션에 따라 다릅니다.'
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-mono font-semibold text-foreground tabular-nums">
            약 {recommendedMarginPct}% · ${recommendedMarginUsd.toLocaleString()}
          </p>
        </div>

        {/* 3. 리스크 + 근거 — DD, 청산 위험, 표본/기간 */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">리스크 참고</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="리스크 참고 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                {kb ? (
                  <div className="space-y-1.5">
                    <p>MDD(최대낙폭) {kb.mddPct}% 기준 레버리지 상한 {kb.maxSafeLeverage}x</p>
                    <p>리스크 = 레버리지 초과율 x 자본비율 초과율</p>
                    <p className="text-muted-foreground text-xs">예상 DD·청산 수준은 참고용이며, 보장되지 않습니다.</p>
                  </div>
                ) : (
                  '예상 낙폭(DD)·청산 근접 수준은 참고용이며, 보장되지 않습니다.'
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li className="font-mono tabular-nums">
              최대 낙폭(DD) 참고치: 약 {riskDdPct}%
            </li>
            <li>청산 위험 수준: {LIQ_RISK_LABELS[liqRiskLevel]}</li>
            <li>{liqDistanceLabel}</li>
          </ul>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            표본 {sampleCount.toLocaleString()}건 / {samplePeriodDays}일
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground/80 cursor-help border-b border-dotted border-muted-foreground/50">
                역사적 표본 기반 참고치
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px]">
              미래 결과를 보장하지 않습니다. 실제 청산가는 거래소·설정에 따라 다릅니다.
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 4. 예상 월 복리수익 */}
        <div className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-foreground">예상 월 복리수익</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="예상 월 복리수익 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                {kb ? (
                  <div className="space-y-1.5">
                    <p>월 {20}회 거래 기준 로그성장 복리 계산</p>
                    <p className="font-mono text-xs">(1 + g(x))^20 - 1, g(xRec) = {kb.logGrowthAtRec}</p>
                    <p>권장 노출 xRec = {kb.recommendedExposure}에서의 추정치</p>
                    <p className="text-muted-foreground text-xs">로그성장 최적화 기반. 실제 수익을 보장하지 않습니다.</p>
                  </div>
                ) : (
                  '로그성장 최적화 기반 추정치입니다. 실제 수익을 보장하지 않습니다.'
                )}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="font-mono font-semibold text-foreground tabular-nums">
            약 {monthlyCompoundReturnPct}% · ${monthlyCompoundReturnUsd.toLocaleString()}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
