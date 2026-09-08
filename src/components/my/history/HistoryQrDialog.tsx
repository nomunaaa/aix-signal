'use client'

import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from '@/lib/navigation-compat'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useBilingualText } from '@/hooks/useBilingualText'
import {
  assetLabel,
  chartDeepLink,
  chartDeepLinkAbsolute,
  fmtDateTime,
  fmtHold,
  fmtPct,
  fmtPrice,
  fmtUsd,
} from '@/lib/my/history-format'
import type { Position } from '@/lib/my/types'

interface Props {
  row: Position | null
  onOpenChange: (open: boolean) => void
}

function InfoRow({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between border-b border-border px-[13px] py-2 text-[12.5px] last:border-b-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={cn('font-bold tabular-nums', tone)}>{v}</span>
    </div>
  )
}

export function HistoryQrDialog({ row, onOpenChange }: Props) {
  const navigate = useNavigate()
  const { locale, tr } = useBilingualText()
  if (!row) return null

  const isLong = row.direction === 'LONG'
  const symbolLabel = assetLabel(row.symbol)
  const pnlTone =
    row.totalPnlUsd > 0
      ? 'text-semantic-bull'
      : row.totalPnlUsd < 0
        ? 'text-semantic-bear'
        : 'text-muted-foreground'

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="w-[360px] max-w-[calc(100vw-40px)] rounded-2xl p-[22px] text-center">
        <DialogTitle className="text-[15px] font-extrabold">
          {tr('진입 · 청산 차트', 'Entry / Exit Chart')}
        </DialogTitle>
        <div className="-mt-1 text-[12.5px] text-muted-foreground">
          {symbolLabel}
          <span
            className={cn(
              'ml-1 inline-block rounded-md px-[9px] py-[3px] text-[11px] font-bold',
              isLong
                ? 'bg-semantic-bull/15 text-semantic-bull'
                : 'bg-semantic-bear/15 text-semantic-bear'
            )}
          >
            {isLong ? tr('롱', 'Long') : tr('숏', 'Short')}
          </span>
        </div>

        <div className="mx-auto mb-[14px] mt-[18px] flex h-[200px] w-[200px] items-center justify-center rounded-xl bg-white p-3">
          <QRCodeSVG value={chartDeepLinkAbsolute(row)} size={176} level="M" />
        </div>
        <p className="mb-[14px] text-xs text-muted-foreground">
          {tr(
            'QR을 스캔하면 진입·청산 차트로 이동합니다.',
            'Scan the QR code to open the entry/exit chart.'
          )}
        </p>

        <div className="mb-3 overflow-hidden rounded-[10px] border border-border text-left">
          <InfoRow k={tr('진입가', 'Entry')} v={fmtPrice(row.avgEntryPrice || row.entryPrice)} />
          <InfoRow k={tr('청산가', 'Exit')} v={row.exitPrice != null ? fmtPrice(row.exitPrice) : '—'} />
          <InfoRow k={tr('손익금', 'PnL')} v={fmtUsd(row.totalPnlUsd)} tone={pnlTone} />
          <InfoRow k={tr('손익률', 'PnL %')} v={fmtPct(row.totalPnlPct)} tone={pnlTone} />
          <InfoRow k={tr('진입 시간', 'Entry Time')} v={fmtDateTime(row.openedAt, locale)} />
          <InfoRow k={tr('보유시간', 'Hold')} v={fmtHold(row.holdSec)} />
        </div>

        <p className="mb-4 text-[11px] leading-[1.6] text-muted-foreground/70">
          {tr(
            '※ 차트가 오래되어 로딩되지 않으면 진입·청산 캡쳐 화면으로 표시됩니다.',
            'If the chart is too old to load, the saved entry/exit capture will be shown.'
          )}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-[42px] flex-1 rounded-[9px] border border-border bg-muted/50 text-[13.5px] font-bold text-foreground transition-colors hover:border-muted-foreground"
          >
            {tr('닫기', 'Close')}
          </button>
          <button
            type="button"
            onClick={() => navigate(chartDeepLink(row))}
            className="h-[42px] flex-1 rounded-[9px] border border-primary bg-primary text-[13.5px] font-bold text-primary-foreground transition-[filter] hover:brightness-110"
          >
            {tr('차트로 이동 ›', 'Open chart ›')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
