interface PartialFormData {
  exitPrice: number
  exitQuantityPct: number
}

interface PartialFormSectionProps {
  data: PartialFormData
  onChange: (patch: Partial<PartialFormData>) => void
}

export function PartialFormSection({ data, onChange }: PartialFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">분할청산가 (USDT)</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={data.exitPrice}
          onChange={(e) => onChange({ exitPrice: Number(e.target.value) })}
          step="any"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          분할 수량 <span className="font-mono text-foreground">{data.exitQuantityPct}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={90}
          step={10}
          value={data.exitQuantityPct}
          onChange={(e) => onChange({ exitQuantityPct: Number(e.target.value) })}
          className="w-full accent-[--color-accent]"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10%</span>
          <span>50%</span>
          <span>90%</span>
        </div>
      </div>
    </div>
  )
}
