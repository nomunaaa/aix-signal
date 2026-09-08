/**
 * KAIROS panel: slide-out from right. Decision support only — outputs are
 * range + risk + evidence (3종 세트). Not expanded by default.
 * Copy/tooltips: docs/ui/kairos-copy.md
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { KairosInputs } from './KairosInputs';
import { KairosOutputs, type KairosOutputsValues, type LiqRiskLevel } from './KairosOutputs';
import { HelpCircle } from 'lucide-react';
import { useSimulation } from '../hooks/useSimulation';

export interface KairosPanelProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/** KairosRecommendation.riskLevel → KairosOutputsValues.liqRiskLevel 매핑 */
function mapRiskLevel(level: string): LiqRiskLevel {
  if (level === 'HIGH' || level === 'EXTREME') return 'high';
  if (level === 'MEDIUM') return 'medium';
  return 'low';
}

export function KairosPanel({ open, onOpenChange }: KairosPanelProps) {
  const [alpha, setAlpha] = useState(0.5);
  const { kairos, input } = useSimulation();

  // useSimulation v2 → KairosOutputsValues 매핑
  const outputs: KairosOutputsValues | undefined = kairos
    ? {
        leverageRange: [kairos.leverageMin, kairos.leverageMax],
        recommendedMarginPct: kairos.optimalCapitalRatio,
        recommendedMarginUsd: Math.round(input.capital * (kairos.optimalCapitalRatio / 100)),
        riskDdPct: Math.abs(kairos.expectedDD),
        liqDistanceLabel:
          kairos.liquidationRisk > 50
            ? `청산 위험 ${Math.round(kairos.liquidationRisk)}% — 레버리지 조정 권장`
            : `청산 거리 양호 (위험도 ${Math.round(kairos.liquidationRisk)}%)`,
        liqRiskLevel: mapRiskLevel(kairos.riskLevel),
        expectedReturnRefPct: kairos.estimatedMonthlyReturn,
        monthlyCompoundReturnPct: kairos.estimatedMonthlyReturn,
        monthlyCompoundReturnUsd: Math.round(input.capital * (kairos.estimatedMonthlyReturn / 100)),
        sampleCount: parseInt(kairos.evidence.match(/(\d+)건/)?.[1] ?? '150', 10),
        samplePeriodDays: 90,
      }
    : undefined;

  // 켈리 기반 추천 범위
  const kellyLeverageRange = kairos
    ? ([kairos.leverageMin, kairos.leverageMax] as [number, number])
    : undefined;
  const kellyCapitalRange = kairos
    ? ([Math.round(100 / (kairos.optimalCapitalRatio / 100)), 100_000] as [number, number])
    : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col overflow-y-auto border-border bg-background"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>KAIROS 복리 알고리즘 권장수치</SheetTitle>
          <SheetDescription>
            참고용입니다. 투자 결정은 본인 책임입니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 pt-6">
          {/* Title + mandatory disclaimer */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              KAIROS 복리 알고리즘 권장수치
            </h2>
            <p className="text-sm text-muted-foreground">
              참고용입니다. 투자 결정은 본인 책임입니다.
            </p>
          </div>

          <KairosInputs
            alpha={alpha}
            onAlphaChange={setAlpha}
            kellyCapitalRange={kellyCapitalRange}
            kellyLeverageRange={kellyLeverageRange}
          />

          <KairosOutputs values={outputs} />

          {/* Assumptions tooltip area */}
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2 border-t border-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                    aria-label="가정 사항"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>가정</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[280px] space-y-2 p-3">
                  <p>
                    <strong>수수료·슬리피지:</strong> 권장수치 산출 시 수수료·슬리피지는
                    가정치가 포함되어 있습니다. 실제 거래 비용은 다를 수 있습니다.
                  </p>
                  <p>
                    <strong>표본 기간:</strong> 권장 레버리지·리스크 참고치는 제시된 표본
                    기간 내 데이터를 사용했습니다. 향후 시장은 다를 수 있습니다.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
