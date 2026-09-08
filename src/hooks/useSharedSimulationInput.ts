import { useCallback, useEffect, useState } from 'react';
import {
  readSharedSimulationInput,
  writeSharedSimulationInput,
  subscribeSharedSimulationInput,
  type SharedSimulationInput,
} from '@/lib/simulationStorage';

/**
 * 시그널 보드/수익통계 페이지와 공유되는 시뮬레이터 입력(시드머니·진입비중·레버리지).
 * localStorage 기반이라 다른 탭에서 바뀐 값도 반영된다.
 */
export function useSharedSimulationInput(): [
  SharedSimulationInput,
  (partial: Partial<SharedSimulationInput>) => void,
] {
  const [input, setInput] = useState<SharedSimulationInput>(() => readSharedSimulationInput());

  useEffect(() => {
    setInput(readSharedSimulationInput());
    return subscribeSharedSimulationInput(setInput);
  }, []);

  const update = useCallback((partial: Partial<SharedSimulationInput>) => {
    setInput(writeSharedSimulationInput(partial));
  }, []);

  return [input, update];
}
