'use client'

import { cn } from '@/lib/utils'
import { CoinIcon } from '@/components/signals/CoinIcon'
import { FavoriteStarButton } from '@/components/common/FavoriteStarButton'
import { useBilingualText } from '@/hooks/useBilingualText'
import { assetLabel, fmtDateTime, fmtHold, fmtPct, fmtPrice, fmtUsd } from '@/lib/my/history-format'
import type { Position } from '@/lib/my/types'

interface Props {
  row: Position
  onOpenQr: (row: Position) => void
}

function pnlTone(v: number): string {
  if (v > 0) return 'text-semantic-bull font-bold'
  if (v < 0) return 'text-semantic-bear font-bold'
  return 'text-muted-foreground font-bold'
}

const CELL = 'border-b border-border px-[14px] py-3 text-right'

export function HistoryRow({ row, onOpenQr }: Props) {
  const { locale, tr } = useBilingualText()
  const isLong = row.direction === 'LONG'
  const symbolLabel = assetLabel(row.symbol)

  return (
    <tr className="transition-colors hover:bg-muted/40">
      <td className={cn(CELL, 'text-left text-foreground')}>
        <div className="flex w-full min-w-0 items-center justify-start gap-1.5">
          <FavoriteStarButton symbol={row.symbol} />
          <CoinIcon symbol={row.symbol} size={18} className="shrink-0" />
          <span className="min-w-0 truncate text-left font-mono font-medium" title={symbolLabel}>
            {symbolLabel}
          </span>
        </div>
      </td>
      <td className={CELL}>
        <span
          className={cn(
            'inline-block rounded-md px-[9px] py-[3px] text-[11px] font-bold',
            isLong
              ? 'bg-semantic-bull/15 text-semantic-bull'
              : 'bg-semantic-bear/15 text-semantic-bear'
          )}
        >
          {isLong ? tr('롱', 'Long') : tr('숏', 'Short')}
        </span>
      </td>
      <td className={cn(CELL, 'tabular-nums')}>{fmtPrice(row.avgEntryPrice || row.entryPrice)}</td>
      <td className={cn(CELL, 'tabular-nums')}>
        {row.exitPrice != null ? fmtPrice(row.exitPrice) : '—'}
      </td>
      <td className={cn(CELL, pnlTone(row.totalPnlUsd))}>{fmtUsd(row.totalPnlUsd)}</td>
      <td className={cn(CELL, pnlTone(row.totalPnlPct))}>{fmtPct(row.totalPnlPct)}</td>
      <td className={cn(CELL, 'tabular-nums text-muted-foreground')}>
        {fmtDateTime(row.openedAt, locale)}
      </td>
      <td className={cn(CELL, 'tabular-nums')}>{fmtHold(row.holdSec)}</td>
      <td className={cn(CELL, 'text-center')}>
        <button
          type="button"
          onClick={() => onOpenQr(row)}
          title={tr('진입·청산 차트로 이동', 'Open entry/exit chart')}
          aria-label={tr(
            `${symbolLabel} 진입·청산 차트 QR 열기`,
            `Open ${symbolLabel} entry/exit chart QR`
          )}
          className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2z" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
