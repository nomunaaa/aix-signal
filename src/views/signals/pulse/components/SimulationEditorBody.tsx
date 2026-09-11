/**
 * 투자 시뮬레이션 편집 본문 — 총자산·진입비율·레버리지 슬라이더 + 요약 그리드.
 * 진입금 = 총자산 × (진입비율%), 포지션 크기 = 진입금 × 레버리지.
 * 액션바 Collapsible / SimulationPanel(3열)에서 공유.
 */

import { useSimulation } from '../hooks/useSimulation';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { formatSimulationUsd } from '../utils/formatSimulationSummary';
import { usePulseCopy } from '../utils/pulseTranslations';
import type { ClosedSignal } from '../types/pulse.types';

const CAPITAL_RATIO_MIN = 1;
const CAPITAL_RATIO_MAX = 100;

export interface SimulationEditorBodyProps {
  className?: string;
  historySignals?: ClosedSignal[];
}

export function SimulationEditorBody({ className, historySignals }: SimulationEditorBodyProps) {
  const { copy } = usePulseCopy();
  const { input, setCapital, setCapitalRatio, setLeverage } = useSimulation({ historySignals });

  const clampCapitalRatio = (v: number) =>
    Math.min(CAPITAL_RATIO_MAX, Math.max(CAPITAL_RATIO_MIN, Math.round(v)));

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">{copy.simulation.amount}</label>
            <span className="text-xs font-mono tabular-nums text-foreground">{formatSimulationUsd(input.capital)}</span>
          </div>
          <Slider
            value={[input.capital]}
            onValueChange={([v]) => setCapital(v)}
            min={1000}
            max={100000}
            step={1000}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">{copy.simulation.entryRatio}</label>
            <span className="text-xs font-mono tabular-nums text-foreground">{clampCapitalRatio(input.capitalRatio)}%</span>
          </div>
          <Slider
            value={[clampCapitalRatio(input.capitalRatio)]}
            onValueChange={([v]) => setCapitalRatio(clampCapitalRatio(v))}
            min={CAPITAL_RATIO_MIN}
            max={CAPITAL_RATIO_MAX}
            step={1}
          />
          <p className="text-[11px] text-muted-foreground">{copy.simulation.entryRatioHelp}</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">{copy.simulation.leverage}</label>
            <span className="text-xs font-mono tabular-nums text-foreground">{input.leverage}x</span>
          </div>
          <Slider
            value={[input.leverage]}
            onValueChange={([v]) => setLeverage(v)}
            min={1}
            max={50}
            step={1}
          />
        </div>
      </div>

    </div>
  );
}
