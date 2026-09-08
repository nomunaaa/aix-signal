import { cn } from '@/lib/utils';
import type { GateKpi30d } from '../types/pulse.types';
import { formatUsdSignedPnL } from '../utils/formatters';
import { usePulseCopy } from '../utils/pulseTranslations';

/** Pretendard 고정 — KPI·게이트 본문에서 mono 대신 tabular-nums 사용 */
export const GATE_FONT =
  "[font-family:'Pretendard_Variable',Pretendard,-apple-system,BlinkMacSystemFont,sans-serif]";

export function GateKpiTable({
  metrics,
  empty,
  /** 같은 화면의 다른 카드와 비교해 승률이 최고일 때 초록 */
  highlightWinRate,
}: {
  metrics: GateKpi30d | null;
  empty?: boolean;
  highlightWinRate?: boolean;
}) {
  const { language, copy } = usePulseCopy();
  const dash = '—';
  const win = empty || !metrics ? dash : `${metrics.winRate}%`;
  const ret =
    empty || !metrics
      ? dash
      : `${metrics.returnRate > 0 ? '+' : ''}${metrics.returnRate}%`;
  const pnl = empty || !metrics ? dash : formatUsdSignedPnL(metrics.pnlUsd);
  const mdd = empty || !metrics ? dash : `${metrics.mdd}%`;

  return (
    <table
      className={cn(
        'w-full table-fixed border-collapse overflow-hidden rounded-md border border-border text-caption',
        GATE_FONT,
      )}
    >
      <thead>
        <tr className="border-b border-border bg-muted/40">
          {([copy.strategyPanel.winRate, language === 'ko' ? '수익률' : 'Return', 'PnL', 'MDD'] as const).map((h) => (
            <th
              key={h}
              className="border-e border-border px-1 py-1 text-center font-medium text-muted-foreground last:border-e-0"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td
            className={cn(
              'border-e border-border px-1 py-1.5 text-center tabular-nums last:border-e-0',
              !empty &&
                metrics &&
                (highlightWinRate ? 'font-medium text-emerald-600' : 'text-foreground'),
            )}
          >
            {win}
          </td>
          <td
            className={cn(
              'border-e border-border px-1 py-1.5 text-center tabular-nums last:border-e-0',
              !empty && metrics && (metrics.returnRate >= 0 ? 'text-emerald-600' : 'text-red-600'),
            )}
          >
            {ret}
          </td>
          <td
            className={cn(
              'border-e border-border px-1 py-1.5 text-center tabular-nums last:border-e-0',
              !empty && metrics && (metrics.pnlUsd >= 0 ? 'text-emerald-600' : 'text-red-600'),
            )}
          >
            {pnl}
          </td>
          <td
            className={cn(
              'border-e border-border px-1 py-1.5 text-center tabular-nums last:border-e-0',
              empty || !metrics ? 'text-muted-foreground' : 'text-red-600',
            )}
          >
            {mdd}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
