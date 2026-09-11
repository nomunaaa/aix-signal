/**
 * 히스토리 — 인라인 아코디언(행 아래 4전략 카드)
 */
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { CoinIcon } from '../CoinIcon';
import { CycleStrategyCards } from '@/components/shared/CycleStrategyCards';
import { formatPriceWithFixedDecimals, formatSignedDollarAmount } from '@/lib/format-price';
import { cn } from '@/lib/utils';
import type { ClosedSignal, SimulationInput, StrategyId } from '../../types/pulse.types';
import {
  formatHoldDurationFromLabel,
  formatPercent,
  formatSymbolPair,
  formatTimestamp,
} from '../../utils/formatters';
import { PULSE_GRID_COL } from '../../config/pulseGridColumnLayout';
import { strategiesForExpand } from './historyStrategyHelpers';
import { calculateHistorySimulationPnl } from '../../utils/historyPnl';

const HISTORY_PNL_FRACTION_DIGITS = 2;

function CheckboxDisplay({ checked }: { checked: boolean }) {
  return (
    <div className="pointer-events-none flex select-none items-center justify-center" aria-hidden>
      <div
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded border',
          checked ? 'border-primary bg-primary/20' : 'border-muted-foreground/30 bg-transparent'
        )}
      >
        {checked ? (
          <svg className="h-3 w-3 text-primary" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
}

export interface HistoryAccordionTableProps {
  signals: ClosedSignal[];
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  simulationInput?: SimulationInput;
  selectedStrategy?: StrategyId;
}

export function HistoryAccordionTable({
  signals,
  expandedIds,
  onToggleExpand,
  simulationInput,
  selectedStrategy,
}: HistoryAccordionTableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[1100px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th
              className="sticky left-0 z-10 bg-muted/30 px-2 py-2 text-left text-xs font-medium text-muted-foreground"
              style={{ minWidth: PULSE_GRID_COL.symbolMin }}
            >
              종목
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              방향
            </th>
            <th className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">
              추매
            </th>
            <th className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">
              분청
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              진입가
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              추가진입
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              청산가
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              중도청산
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              수익($)
            </th>
            <th className="px-2 py-2 text-right text-xs font-medium text-muted-foreground">
              수익(%)
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              진입시간
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              보유
            </th>
            <th className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              청산시간
            </th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => {
            const entryPx = s.entryPrice;
            const exitPx = s.exitPrice;
            const addPx = s.additionalEntryPrice ?? null;
            const partPx = s.partialExitPrice ?? null;
            const { pnlAmount: pnlUsd, pnlPercent: pnlPct } = calculateHistorySimulationPnl(
              s,
              simulationInput,
              selectedStrategy ?? s.strategyId
            );
            const isLong = s.direction === 'long';
            const expanded = expandedIds.has(s.id);
            const entered = s.enteredAt ?? s.closedAt;
            return (
              <Fragment key={s.id}>
                <tr
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleExpand(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleExpand(s.id);
                    }
                  }}
                  className={cn(
                    'cursor-pointer border-b border-border/60 transition-colors',
                    expanded ? 'bg-muted/40' : 'hover:bg-muted/20'
                  )}
                >
                  <td className="sticky left-0 z-10 bg-background px-2 py-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <CoinIcon symbol={s.symbol} size={18} className="shrink-0" />
                      <span className="truncate font-mono font-medium">
                        {formatSymbolPair(s.symbol)}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Badge
                      variant={isLong ? 'default' : 'destructive'}
                      className={cn(
                        'text-xs',
                        isLong
                          ? 'border-red-500/30 bg-red-500/15 text-red-400'
                          : 'border-blue-500/30 bg-blue-500/15 text-blue-400'
                      )}
                    >
                      {isLong ? 'Long' : 'Short'}
                    </Badge>
                  </td>
                  <td className="px-1 py-2 text-center">
                    <CheckboxDisplay checked={Boolean(s.hasAdditionalBuy ?? s.discountGain > 0)} />
                  </td>
                  <td className="px-1 py-2 text-center">
                    <CheckboxDisplay checked={Boolean(s.hasPartialClose ?? s.lockedAmount > 0)} />
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {formatPriceWithFixedDecimals(entryPx)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {addPx != null ? formatPriceWithFixedDecimals(addPx) : '\u2014'}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs font-semibold tabular-nums">
                    {formatPriceWithFixedDecimals(exitPx)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {partPx != null ? formatPriceWithFixedDecimals(partPx) : '\u2014'}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right font-mono text-xs font-semibold tabular-nums',
                      pnlUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {formatSignedDollarAmount(pnlUsd, {
                      positiveSign: true,
                      fractionDigits: HISTORY_PNL_FRACTION_DIGITS,
                    })}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right font-mono text-xs font-bold tabular-nums',
                      pnlPct >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {formatPercent(pnlPct, HISTORY_PNL_FRACTION_DIGITS)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center font-mono text-[11px] text-muted-foreground">
                    {entered ? formatTimestamp(entered) : '\u2014'}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center font-mono text-[11px] text-muted-foreground">
                    {formatHoldDurationFromLabel(s.holdDuration)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-center font-mono text-[11px] text-muted-foreground">
                    {formatTimestamp(s.closedAt)}
                  </td>
                </tr>
                {expanded ? (
                  <tr className="border-b border-border bg-muted/15">
                    <td colSpan={13} className="p-0">
                      <div className="border-t border-border/80 px-2 py-3">
                        <CycleStrategyCards
                          strategies={strategiesForExpand(s)}
                          layout="inline"
                          highlightBest
                          onClose={() => onToggleExpand(s.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
