import type { Position, TradeAction } from '@/lib/my/types'
import { STRATEGY_BORDER_L_CLASS, STRATEGY_LABEL_KO } from '@/lib/strategy-display'
import { SECTION_LABEL_KR } from '@/lib/mock/my-mock'
import { useNavigate } from '@/lib/navigation-compat'
import { PositionActionButtons } from './PositionActionButtons'

interface Props {
  position: Position
  onAction: (positionId: string, action: TradeAction) => void
}

function pnlClass(value: number): string {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-rose-400'
  return 'text-muted-foreground'
}

function fmtPct(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function fmtUsd(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USDT`
}

function fmtHold(sec: number): string {
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function PositionCard({ position, onAction }: Props) {
  const navigate = useNavigate()
  const borderClass = STRATEGY_BORDER_L_CLASS[position.strategy]
  const isLong = position.direction === 'LONG'
  const directionClass = isLong ? 'text-emerald-400' : 'text-rose-400'
  const directionBg = isLong ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'

  const goToChart = () => {
    const basePath = position.barInterval === '10m' ? '/chart10m' : '/chart1m'
    const symbol = position.symbol.trim().toUpperCase()
    navigate(`${basePath}?${new URLSearchParams({ symbol }).toString()}`)
  }

  return (
    <div
      className={`rounded-md border border-border bg-card border-l-2 ${borderClass} p-3 flex flex-col gap-2`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={goToChart}
            className="rounded font-mono text-sm font-semibold text-foreground truncate hover:underline"
          >
            {position.symbol}
          </button>
          <span
            className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-semibold ${directionBg} ${directionClass}`}
          >
            {isLong ? 'LONG' : 'SHORT'}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {STRATEGY_LABEL_KO[position.strategy]}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {SECTION_LABEL_KR[position.section]}
        </span>
      </div>

      {/* Mid — price & PnL */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">진입가</span>
          <span className="font-mono text-xs text-foreground">{position.avgEntryPrice.toFixed(4)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">현재가</span>
          <span className="font-mono text-xs text-foreground">
            {position.currentPrice != null ? position.currentPrice.toFixed(4) : '—'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">레버리지</span>
          <span className="font-mono text-xs text-foreground">{position.leverage}x</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">미확정</span>
          <span className={`font-mono text-xs font-semibold ${pnlClass(position.unrealizedPnlUsd)}`}>
            {fmtUsd(position.unrealizedPnlUsd)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">확정</span>
          <span className={`font-mono text-xs font-semibold ${pnlClass(position.realizedPnlUsd)}`}>
            {fmtUsd(position.realizedPnlUsd)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">총 손익</span>
          <span className={`font-mono text-xs font-semibold ${pnlClass(position.totalPnlUsd)}`}>
            {fmtPct(position.totalPnlPct)}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{fmtHold(position.holdSec)} 보유</span>
          {position.eventSummary && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
              {position.eventSummary}
            </span>
          )}
          {position.engineMismatch && position.engineMismatchNote && (
            <span className="text-amber-400">{position.engineMismatchNote}</span>
          )}
        </div>
        <PositionActionButtons
          positionId={position.id}
          strategy={position.strategy}
          state={position.state}
          onAction={onAction}
        />
      </div>
    </div>
  )
}
