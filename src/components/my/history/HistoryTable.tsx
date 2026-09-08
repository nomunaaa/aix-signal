'use client'

import { useState } from 'react'
import { HistoryRow } from './HistoryRow'
import { HistoryQrDialog } from './HistoryQrDialog'
import { useBilingualText } from '@/hooks/useBilingualText'
import type { Position } from '@/lib/my/types'

interface Props {
  rows: Position[]
}

export function HistoryTable({ rows }: Props) {
  const { tr } = useBilingualText()
  const [qrRow, setQrRow] = useState<Position | null>(null)
  const columns = [
    tr('자산', 'Asset'),
    tr('방향', 'Side'),
    tr('진입가', 'Entry'),
    tr('청산가', 'Exit'),
    tr('손익금', 'PnL'),
    tr('손익률', 'PnL %'),
    tr('진입 시간', 'Entry Time'),
    tr('보유시간', 'Hold'),
    tr('QR코드', 'QR'),
  ]

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {tr('해당 조건의 청산 기록이 없습니다.', 'No closed history matches this filter.')}
      </div>
    )
  }

  return (
    <>
      <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full border-collapse whitespace-nowrap text-[12.5px]">
          <thead>
            <tr>
              {columns.map((label, i) => (
                <th
                  key={label}
                  className={`border-b border-border bg-muted/30 px-[14px] py-3 font-semibold text-muted-foreground ${
                    i === 0 ? 'text-left' : i === columns.length - 1 ? 'text-center' : 'text-right'
                  }`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child_td]:border-b-0">
            {rows.map((row) => (
              <HistoryRow key={row.id} row={row} onOpenQr={setQrRow} />
            ))}
          </tbody>
        </table>
      </div>

      <HistoryQrDialog row={qrRow} onOpenChange={(open) => !open && setQrRow(null)} />
    </>
  )
}
