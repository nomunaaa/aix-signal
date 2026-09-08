import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const ONCHAIN_LABELS = [
  { id: 'exchange_net' as const, label: '거래소 순유출' },
  { id: 'mvrv' as const, label: 'MVRV' },
  { id: 'nupl' as const, label: 'NUPL' },
  { id: 'whale_tx' as const, label: '고래 거래 수' },
];

/** Zone 3 온체인 행 — AIX-67 전까지 placeholder (§11.2, §14 Phase 1) */
export function OnchainMetricsRow() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mt-3 space-y-1" data-testid="zone3-onchain-row">
        <div className="text-[10px] font-medium text-muted-foreground">[온체인]</div>
        <div className="overflow-x-auto">
          <div className="flex min-w-full gap-3 text-xs">
            {ONCHAIN_LABELS.map(({ id, label }) => (
              <div
                key={id}
                className="min-w-[4.5rem] shrink-0 rounded-md border border-border/40 bg-muted/10 px-2 py-1.5"
                data-onchain-cell={id}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[14rem] text-xs">
                    데이터 준비 중
                  </TooltipContent>
                </Tooltip>
                <div className="mt-0.5 font-mono tabular-nums text-muted-foreground">—</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
