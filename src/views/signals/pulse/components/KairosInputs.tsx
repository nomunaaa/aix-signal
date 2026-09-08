/**
 * KAIROS panel inputs: Capital (C 0–100k), Leverage (L), Alpha (α 0.25/0.5/1.0).
 * Copy/tooltips follow docs/ui/kairos-copy.md — decision support only, no profit guarantee.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePulseStore } from '../stores/pulseStore';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KairosInputsProps {
  readonly alpha?: number;
  readonly onAlphaChange?: (value: number) => void;
  readonly kellyCapitalRange?: [number, number];
  readonly kellyLeverageRange?: [number, number];
  readonly className?: string;
}

const CAPITAL_MIN = 0;
const CAPITAL_MAX = 100_000;
const ALPHA_PRESETS = [0.25, 0.5, 1] as const;

export function KairosInputs({
  alpha = 0.5,
  onAlphaChange,
  kellyCapitalRange,
  kellyLeverageRange,
  className,
}: KairosInputsProps) {
  const simulationInput = usePulseStore((s) => s.simulationInput);
  const setSimulationInput = usePulseStore((s) => s.setSimulationInput);

  const userCapital = simulationInput.capital;
  const userLeverage = simulationInput.leverage;
  const userCapitalRatio = simulationInput.capitalRatio;

  const handleCapitalRatioChange = (value: number) => {
    const r = Math.min(100, Math.max(1, Math.round(value)));
    setSimulationInput({ capitalRatio: r });
  };

  const handleLeverageChange = (value: number) => {
    const clamped = Math.min(50, Math.max(1, value));
    setSimulationInput({ leverage: clamped });
  };

  const handleCapitalChange = (value: number) => {
    const clamped = Math.min(CAPITAL_MAX, Math.max(CAPITAL_MIN, value));
    setSimulationInput({ capital: clamped });
  };

  const clampedCapital = Math.min(CAPITAL_MAX, Math.max(CAPITAL_MIN, userCapital));

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn('space-y-5', className)}>
        {/* C — 투자원금 (0–100k) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">투자원금 (USD)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="투자원금 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                권장 레버리지·마진 계산의 기준 자본입니다. 실제 투자금과 다를 수 있습니다.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              min={CAPITAL_MIN}
              max={CAPITAL_MAX}
              step={1000}
              value={clampedCapital}
              onChange={(e) => handleCapitalChange(Number(e.target.value) || 0)}
              className="font-mono flex-1"
            />
            <span className="text-sm text-muted-foreground shrink-0">$</span>
            {kellyCapitalRange && (clampedCapital < kellyCapitalRange[0] || clampedCapital > kellyCapitalRange[1]) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0" aria-label="투자원금 범위 경고">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  추천: ${kellyCapitalRange[0].toLocaleString()} ~ ${kellyCapitalRange[1].toLocaleString()}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 진입 비율 — 총자산 대비 한 포지션 마진 비율 (시뮬레이터와 동일 스토어) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">진입 비율 (%)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="진입 비율 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                총자산 중 시그널 한 건에 쓸 비율입니다. 진입금 = 총자산 × 진입비율, 포지션 노출 ≈ 진입금 × 레버리지입니다.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              min={1}
              max={100}
              step={1}
              value={[userCapitalRatio]}
              onValueChange={([v]) => handleCapitalRatioChange(v)}
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={100}
              value={userCapitalRatio}
              onChange={(e) => handleCapitalRatioChange(Number(e.target.value) || 1)}
              className="w-16 font-mono text-center"
            />
            <span className="text-sm text-muted-foreground shrink-0">%</span>
          </div>
        </div>

        {/* L — 레버리지 */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">레버리지 배율</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="레버리지 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                레버리지가 높을수록 수익·손실 폭이 커집니다. 청산 위험에 유의하세요.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Slider
                min={1}
                max={50}
                step={1}
                value={[userLeverage]}
                onValueChange={([v]) => handleLeverageChange(v)}
              />
              {kellyLeverageRange && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2 rounded-full bg-green-500/30 pointer-events-none"
                  style={{
                    left: `${((kellyLeverageRange[0] - 1) / 49) * 100}%`,
                    width: `${((kellyLeverageRange[1] - kellyLeverageRange[0]) / 49) * 100}%`,
                  }}
                />
              )}
            </div>
            <Input
              type="number"
              min={1}
              max={50}
              value={userLeverage}
              onChange={(e) => handleLeverageChange(Number(e.target.value) || 1)}
              className="w-16 font-mono text-center"
            />
            <span className="text-sm text-muted-foreground shrink-0">배</span>
            {kellyLeverageRange && (userLeverage < kellyLeverageRange[0] || userLeverage > kellyLeverageRange[1]) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="shrink-0" aria-label="레버리지 범위 경고">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  추천: {kellyLeverageRange[0]}x ~ {kellyLeverageRange[1]}x
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* α — 리스크 선호 (0.25 / 0.5 / 1.0) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">리스크 선호 (α)</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  aria-label="알파 설명"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[260px]">
                0.25=보수적, 0.5=균형, 1.0=공격적 권장 구간을 적용합니다. 과거 표본 기반 참고치입니다.
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            {ALPHA_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onAlphaChange?.(preset)}
                className={cn(
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-mono transition-colors',
                  Math.abs(alpha - preset) < 0.01
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
