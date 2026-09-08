/**
 * 시뮬레이터 설정 슬라이더 3종(초기 자본·비중·레버리지) — 시그널 보드/수익통계
 * 페이지와 useSharedSimulationInput으로 공유되는 값을 편집한다.
 * SimulatorSettingsPopover(툴바 팝오버)와 SimulatorSettingsPanel(사이드바 인라인)이
 * 이 필드들을 공유한다.
 */
import { Slider } from '@/components/ui/slider';
import { SIMULATION_LIMITS, type SharedSimulationInput } from '@/lib/simulationStorage';
import { formatPrice } from '@/lib/formatPrice';

export interface SimulatorSettingsFieldsProps {
  readonly input: SharedSimulationInput;
  readonly onChange: (partial: Partial<SharedSimulationInput>) => void;
}

export function SimulatorSettingsFields({ input, onChange }: SimulatorSettingsFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>초기 자본</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
            {formatPrice(input.capital)}
          </span>
        </div>
        <Slider
          min={SIMULATION_LIMITS.capital.min}
          max={SIMULATION_LIMITS.capital.max}
          step={SIMULATION_LIMITS.capital.step}
          value={[input.capital]}
          onValueChange={([v]) => onChange({ capital: v })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>비중 (%)</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
            {input.capitalRatio}%
          </span>
        </div>
        <Slider
          min={SIMULATION_LIMITS.capitalRatio.min}
          max={SIMULATION_LIMITS.capitalRatio.max}
          step={SIMULATION_LIMITS.capitalRatio.step}
          value={[input.capitalRatio]}
          onValueChange={([v]) => onChange({ capitalRatio: v })}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>레버리지</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
            {input.leverage}x
          </span>
        </div>
        <Slider
          min={SIMULATION_LIMITS.leverage.min}
          max={SIMULATION_LIMITS.leverage.max}
          step={SIMULATION_LIMITS.leverage.step}
          value={[input.leverage]}
          onValueChange={([v]) => onChange({ leverage: v })}
        />
      </div>
    </div>
  );
}
