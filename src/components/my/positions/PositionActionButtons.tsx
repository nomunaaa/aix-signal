import type { PositionState, TradeAction } from '@/lib/my/types'
import type { CycleStrategyKey } from '@/lib/strategy-display'

interface Props {
  positionId: string
  strategy: CycleStrategyKey
  state: PositionState
  onAction: (positionId: string, action: TradeAction) => void
}

export function PositionActionButtons({ positionId, strategy, state, onAction }: Props) {
  const canAdd = (strategy === 'dca' || strategy === 'dca_partial') && state === 'open'
  const canPartial =
    (strategy === 'partial_exit' || strategy === 'dca_partial') &&
    (state === 'open' || state === 'adding')
  const canClose = state !== 'closed'

  if (!canClose) return null

  return (
    <div className="flex items-center gap-1.5">
      {canAdd && (
        <button
          type="button"
          onClick={() => onAction(positionId, 'add')}
          className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
        >
          추가
        </button>
      )}
      {canPartial && (
        <button
          type="button"
          onClick={() => onAction(positionId, 'partial')}
          className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-400 transition-colors hover:bg-purple-500/20"
        >
          분할
        </button>
      )}
      <button
        type="button"
        onClick={() => onAction(positionId, 'close')}
        className="rounded border border-border bg-muted px-2 py-0.5 text-xs text-foreground transition-colors hover:bg-muted/80"
      >
        청산
      </button>
    </div>
  )
}
