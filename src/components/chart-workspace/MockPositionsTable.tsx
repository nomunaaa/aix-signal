/**
 * 모의매매 포지션 테이블 (진입 중 / 종료 공용).
 * 진입 중 행은 livePrice가 있으면 실시간 손익으로, 없으면 DB에 기록된 값으로 표시한다.
 */
import type { MockTradeRow } from '@/hooks/useMockTradePositions';
import { pnlUsd, priceChangePct, roePct } from '@/lib/mockTradePnl';
import { formatPrice } from '@/lib/formatPrice';
import { CoinIcon } from '@/components/signals/CoinIcon';
import { formatSymbolPair } from '@/views/signals/pulse/utils/formatters';
import { FavoriteStarButton } from '@/components/common/FavoriteStarButton';

export interface MockPositionsTableProps {
  readonly title: string;
  readonly hint: string;
  readonly rows: readonly MockTradeRow[];
  readonly emptyLabel: string;
  /** 심볼별 현재가 — 있으면 실시간 손익 계산에 사용. */
  readonly livePrices?: Readonly<Record<string, number | null>>;
  /** 종목명 클릭 시 해당 종목의 차트로 전환. 진입 당시 스트림도 함께 전달한다. */
  readonly onSymbolClick?: (symbol: string, stream: 'PULSE' | 'WAVE') => void;
  /** 현재 차트에 표시 중인 종목 — 해당 행을 강조 표시한다. */
  readonly activeSymbol?: string;
  /** 있으면 헤더에 "전체종목 청산" 버튼을 표시한다 (진입 중인 포지션 테이블 전용). */
  readonly onCloseAll?: () => void;
  readonly closingAll?: boolean;
}

function resolveMetrics(row: MockTradeRow, livePrice: number | null | undefined) {
  // 종료된 행(exitPrice 있음)은 DB(트리거)가 확정한 값을 그대로 쓴다 — 분할청산
  // 체결에서 파생된 행은 그 슬라이스만의 확정손익이라 entry/exit/capital만으로는
  // 재계산할 수 없다(전체 포지션 대비 비중이 필요). 진입 중인 행만 실시간가로
  // 다시 계산한다.
  if (row.exitPrice != null) {
    return { pct: row.storedProfitPct, usd: row.storedPnl };
  }
  const reference = livePrice ?? null;
  if (reference == null || !row.entryPrice) {
    return { pct: row.storedProfitPct, usd: row.storedPnl };
  }
  const change = priceChangePct(row.direction, row.entryPrice, reference);
  return {
    pct: roePct(change, row.leverage),
    usd: pnlUsd(row.capital, row.leverage, change),
  };
}

export function MockPositionsTable({
  title,
  hint,
  rows,
  emptyLabel,
  livePrices,
  onSymbolClick,
  activeSymbol,
  onCloseAll,
  closingAll,
}: MockPositionsTableProps) {
  const normalizedActiveSymbol = activeSymbol?.trim().toUpperCase();
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground">
        {title}
        <span className="rounded-full bg-muted/50 px-2 py-0.5 font-bold text-muted-foreground">
          {rows.length}
        </span>
        {onCloseAll && rows.length > 0 && (
          <button
            type="button"
            onClick={onCloseAll}
            disabled={closingAll}
            className="ml-auto rounded border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/80 disabled:opacity-50"
          >
            {closingAll ? '청산 중…' : '전체종목 청산'}
          </button>
        )}
      </div>
      <p className="mb-2 mt-1 text-[10.5px] text-muted-foreground/70">{hint}</p>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card py-5 text-center text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  {['종목', '포지션', '수익율', '수익금'].map((h, i) => (
                    <th
                      key={h}
                      className={`sticky top-0 z-[1] whitespace-nowrap bg-card px-2.5 py-2 font-semibold text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))] ${
                        i < 2 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const { pct, usd } = resolveMetrics(row, livePrices?.[row.symbol]);
                  const isUp = (pct ?? 0) >= 0;
                  const tone = isUp
                    ? 'text-[hsl(var(--pnl-up))]'
                    : 'text-[hsl(var(--pnl-down))]';
                  const dirTone =
                    row.direction === 'long'
                      ? 'bg-[hsl(var(--pnl-up)/0.14)] text-[hsl(var(--pnl-up))]'
                      : 'bg-[hsl(var(--pnl-down)/0.14)] text-[hsl(var(--pnl-down))]';
                  const isActive =
                    normalizedActiveSymbol != null &&
                    row.symbol.trim().toUpperCase() === normalizedActiveSymbol;
                  return (
                    <tr
                      key={row.id}
                      className={`border-b border-border last:border-0 ${
                        isActive ? 'bg-yellow-400/10' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-2.5 py-2 text-left font-bold tabular-nums">
                        <span className="flex items-center gap-1.5">
                          <FavoriteStarButton symbol={row.symbol} />
                          {onSymbolClick ? (
                            <button
                              type="button"
                              onClick={() => onSymbolClick(row.symbol, row.stream)}
                              className="flex items-center gap-1.5 rounded hover:underline"
                            >
                              <CoinIcon symbol={row.symbol} size={16} className="shrink-0" />
                              <span className="truncate font-mono">
                                {formatSymbolPair(row.symbol)}
                              </span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-1.5">
                              <CoinIcon symbol={row.symbol} size={16} className="shrink-0" />
                              <span className="truncate font-mono">
                                {formatSymbolPair(row.symbol)}
                              </span>
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-left">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${dirTone}`}>
                          {row.direction === 'long' ? '롱' : '숏'} {row.leverage}x
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 py-2 text-right font-mono font-bold tabular-nums ${tone}`}
                      >
                        {pct == null ? '—' : `${isUp ? '+' : ''}${pct.toFixed(2)}%`}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2.5 py-2 text-right font-mono font-bold tabular-nums ${tone}`}
                      >
                        {usd == null ? '—' : `${usd >= 0 ? '+' : '-'}${formatPrice(Math.abs(usd))}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
