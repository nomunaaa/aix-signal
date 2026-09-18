'use client';

import { useNavigate, useSearchParams } from '@/lib/navigation-compat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ChartIntervalId = '1m' | '10m' | 'beat';

const INTERVAL_OPTIONS: { id: ChartIntervalId; label: string; path: string }[] = [
  { id: '1m', label: 'Pulse', path: '/chart1m' },
  { id: 'beat', label: 'Beat', path: '/chart1m' },
  { id: '10m', label: 'Wave', path: '/chart10m' },
];

interface ChartIntervalSelectProps {
  active: ChartIntervalId;
}

/** 차트 페이지 상단의 Pulse/Beat/Wave 전환 드롭다운. 심볼 등 현재 쿼리 파라미터는 유지한 채 라우트만 바꾼다.
 * Beat는 Pulse와 동일한 1분봉 라우트를 쓰므로 `stream` 쿼리 파라미터로만 구분한다. */
export function ChartIntervalSelect({ active }: ChartIntervalSelectProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleChange = (next: string) => {
    const target = INTERVAL_OPTIONS.find((o) => o.id === next);
    if (!target || target.id === active) return;
    const params = new URLSearchParams(searchParams.toString());
    if (target.id === 'beat') {
      params.set('stream', 'beat');
    } else {
      params.delete('stream');
    }
    const query = params.toString();
    navigate(query ? `${target.path}?${query}` : target.path);
  };

  return (
    <Select value={active} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-[100px] bg-background text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[10001] bg-popover">
        {INTERVAL_OPTIONS.map((o) => (
          <SelectItem key={o.id} value={o.id} className="text-xs">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
