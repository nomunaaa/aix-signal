import type { TradeEntryFormData, StrategyKey } from '@/lib/my/types'
import { StrategyRadioCards } from '../StrategyRadioCards'

interface OpenFormSectionProps {
  data: TradeEntryFormData
  quickChips: number[]
  onChange: (patch: Partial<TradeEntryFormData>) => void
}

export function OpenFormSection({ data, quickChips, onChange }: OpenFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">진입가 (USDT)</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={data.entryPrice}
          onChange={(e) => onChange({ entryPrice: Number(e.target.value) })}
          step="any"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">투자금 (USDT)</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={data.investmentUsd}
          onChange={(e) => onChange({ investmentUsd: Number(e.target.value) })}
          min={1}
        />
        <div className="flex gap-2 flex-wrap">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => onChange({ investmentUsd: chip })}
              className="rounded-full border border-border px-3 py-0.5 text-xs hover:bg-[--color-background-secondary] transition-colors"
            >
              ${chip.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          레버리지 <span className="font-mono text-foreground">{data.leverage}x</span>
        </label>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={data.leverage}
          onChange={(e) => onChange({ leverage: Number(e.target.value) })}
          className="w-full accent-[--color-accent]"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1x</span>
          <span>10x</span>
          <span>20x</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">전략</label>
        <StrategyRadioCards
          value={data.strategy as StrategyKey}
          onChange={(strategy) => onChange({ strategy })}
        />
      </div>
    </div>
  )
}
