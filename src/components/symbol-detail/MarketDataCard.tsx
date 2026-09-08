import type { MarketDataRowMock } from '@/lib/mock/symbol-detail-mock';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const cells: { key: keyof MarketDataRowMock; label: string; tooltip: string }[] = [
  { key: 'volume24h', label: '24h 거래량', tooltip: '최근 24시간 선물 거래대금' },
  { key: 'low24h', label: '24h 최저', tooltip: '최근 24시간 저가' },
  { key: 'high24h', label: '24h 최고', tooltip: '최근 24시간 고가' },
  {
    key: 'openInterest',
    label: '미결제약정 (OI)',
    tooltip: '미체결 선물 포지션 규모(시장 관심도)',
  },
  { key: 'fundingPct', label: '펀딩비', tooltip: '8시간 펀딩 비율(롱·숏 밸런스)' },
  { key: 'longShort', label: '롱숏 비율', tooltip: '롱·숏 계정 비율(대략적 심리)' },
];

function fundingClass(value: string): string | undefined {
  const n = parseFloat(value.replace('%', ''));
  if (Number.isNaN(n)) return undefined;
  if (n < 0) return 'text-semantic-bear';
  return undefined;
}

export function MarketDataCard({ data }: { data: MarketDataRowMock }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1" data-testid="zone3-futures-row">
        <div className="text-[10px] font-medium text-muted-foreground">[선물]</div>
        <div className="overflow-x-auto">
          <div className="flex min-w-full gap-3 text-xs">
            {cells.map(({ key, label, tooltip }) => (
              <div
                key={key}
                className="min-w-[4.5rem] shrink-0 rounded-md border border-border/40 bg-muted/10 px-2 py-1.5"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[16rem] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
                <div
                  className={cn(
                    'mt-0.5 font-mono tabular-nums text-foreground',
                    key === 'fundingPct' ? fundingClass(data[key]) : undefined,
                  )}
                >
                  {data[key]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
