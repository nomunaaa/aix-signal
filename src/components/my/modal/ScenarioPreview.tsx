import type { TradeEntryScenario, TradeAction } from '@/lib/my/types'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScenarioPreviewProps {
  scenario: TradeEntryScenario | null
  action: TradeAction
}

export function ScenarioPreview({ scenario, action }: ScenarioPreviewProps) {
  if (!scenario) return null

  if (action === 'close') {
    return (
      <div className="rounded-md border border-border bg-[--color-background-secondary] p-3">
        <p className="text-xs text-muted-foreground mb-2">청산 예상</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ScenarioCell
            label="실현 손익"
            value={`${scenario.targetProfitUsd >= 0 ? '+' : ''}$${scenario.targetProfitUsd}`}
            highlight={scenario.targetProfitUsd >= 0 ? 'profit' : 'loss'}
          />
          <ScenarioCell
            label="수익률"
            value={`${scenario.targetProfitPct >= 0 ? '+' : ''}${scenario.targetProfitPct}%`}
            highlight={scenario.targetProfitPct >= 0 ? 'profit' : 'loss'}
          />
        </div>
      </div>
    )
  }

  if (action === 'partial') {
    return (
      <div className="rounded-md border border-border bg-[--color-background-secondary] p-3">
        <p className="text-xs text-muted-foreground mb-2">분할청산 예상</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <ScenarioCell
            label="부분 실현"
            value={`${scenario.targetProfitUsd >= 0 ? '+' : ''}$${scenario.targetProfitUsd}`}
            highlight={scenario.targetProfitUsd >= 0 ? 'profit' : 'loss'}
          />
          <ScenarioCell
            label="수익률"
            value={`${scenario.targetProfitPct >= 0 ? '+' : ''}${scenario.targetProfitPct}%`}
            highlight={scenario.targetProfitPct >= 0 ? 'profit' : 'loss'}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-[--color-background-secondary] p-3 space-y-2">
      <p className="text-xs text-muted-foreground">시나리오 미리보기</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <ScenarioCell
          label="목표 수익"
          value={`+$${scenario.targetProfitUsd} (${scenario.targetProfitPct}%)`}
          highlight="profit"
          icon={<TrendingUp className="h-3 w-3 text-emerald-500" />}
        />
        <ScenarioCell
          label="손절 손실"
          value={`-$${Math.abs(scenario.stopLossUsd)} (${Math.abs(scenario.stopLossPct)}%)`}
          highlight="loss"
          icon={<TrendingDown className="h-3 w-3 text-rose-500" />}
        />
        <ScenarioCell
          label="청산가"
          value={scenario.liquidationPrice.toLocaleString()}
          highlight="warn"
          icon={<AlertTriangle className="h-3 w-3 text-amber-500" />}
        />
      </div>
    </div>
  )
}

function ScenarioCell({
  label,
  value,
  highlight,
  icon,
}: {
  label: string
  value: string
  highlight: 'profit' | 'loss' | 'warn' | 'neutral'
  icon?: React.ReactNode
}) {
  const colorMap = {
    profit: 'text-emerald-500',
    loss: 'text-rose-500',
    warn: 'text-amber-500',
    neutral: 'text-foreground',
  }
  return (
    <div>
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn('font-mono font-medium', colorMap[highlight])}>{value}</p>
    </div>
  )
}
