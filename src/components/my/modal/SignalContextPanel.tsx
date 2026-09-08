import type { SignalContext } from '@/lib/my/types'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignalContextPanelProps {
  signal: SignalContext
  /** Summary row shown for add/partial/close variants */
  existingSummary?: {
    entryPrice: number
    investmentUsd: number
    leverage: number
    strategy: string
  }
}

export function SignalContextPanel({ signal, existingSummary }: SignalContextPanelProps) {
  const isLong = signal.direction === 'LONG'
  const directionColor = isLong ? 'text-emerald-500' : 'text-rose-500'
  const DirectionIcon = isLong ? TrendingUp : TrendingDown

  return (
    <div className="rounded-md border border-border bg-[--color-background-secondary] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{signal.symbol}</span>
          <DirectionIcon className={cn('h-4 w-4', directionColor)} />
          <span className={cn('text-xs font-medium', directionColor)}>
            {signal.direction}
          </span>
          <span className="text-xs text-muted-foreground">{signal.engine}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{signal.generatedAtLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">시그널가</span>
          <p className="font-mono font-medium">{signal.signalPrice.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">목표가</span>
          <p className="font-mono font-medium text-emerald-500">
            {signal.targetPrice > 0 ? signal.targetPrice.toLocaleString() : '—'}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">무효가</span>
          <p className="font-mono font-medium text-rose-500">
            {signal.invalidationPrice > 0 ? signal.invalidationPrice.toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {signal.kairosObservation && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
          {signal.kairosObservation}
        </p>
      )}

      {existingSummary && (
        <div className="flex gap-3 text-xs border-t border-border pt-2 text-muted-foreground">
          <span>진입가 <span className="font-mono text-foreground">{existingSummary.entryPrice.toLocaleString()}</span></span>
          <span>투자 <span className="font-mono text-foreground">${existingSummary.investmentUsd}</span></span>
          <span>레버리지 <span className="font-mono text-foreground">{existingSummary.leverage}x</span></span>
          <span>전략 <span className="text-foreground">{existingSummary.strategy}</span></span>
        </div>
      )}
    </div>
  )
}
