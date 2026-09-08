/**
 * 시뮬레이터 설정 — 모의매매 카드 위에 항상 보이는 인라인 버전.
 * SimulatorSettingsPopover(툴바)와 동일한 값을 SimulatorSettingsFields로 공유한다.
 */
import { SimulatorSettingsFields } from '@/components/chart-workspace/SimulatorSettingsFields';
import { useSharedSimulationInput } from '@/hooks/useSharedSimulationInput';

export function SimulatorSettingsPanel() {
  const [input, updateInput] = useSharedSimulationInput();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 text-xs font-bold tracking-wide text-muted-foreground">시뮬레이터 설정</div>
      <SimulatorSettingsFields input={input} onChange={updateInput} />
    </div>
  );
}
