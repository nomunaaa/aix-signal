/**
 * 시뮬레이터 설정 팝오버 — 시드머니·진입비중·레버리지를
 * 시그널 보드/수익통계 페이지와 공유되는 값으로 편집한다.
 */
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SlidersHorizontal } from 'lucide-react';
import { useSharedSimulationInput } from '@/hooks/useSharedSimulationInput';
import { SimulatorSettingsFields } from '@/components/chart-workspace/SimulatorSettingsFields';

export function SimulatorSettingsPopover() {
  const [input, updateInput] = useSharedSimulationInput();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-muted text-foreground"
          aria-label="시뮬레이터 설정"
          title="시뮬레이터 설정"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" side="bottom" className="w-[300px] p-0 z-[10005] overflow-hidden">
        <div className="bg-card text-foreground border border-border rounded-xl">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">시뮬레이터 설정</span>
          </div>

          <div className="p-4">
            <SimulatorSettingsFields input={input} onChange={updateInput} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
