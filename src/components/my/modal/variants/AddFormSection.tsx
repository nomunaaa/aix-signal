interface AddFormData {
  addPrice: number
  addQuantityPct: number
}

interface AddFormSectionProps {
  data: AddFormData
  onChange: (patch: Partial<AddFormData>) => void
}

export function AddFormSection({ data, onChange }: AddFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">추가진입가 (USDT)</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={data.addPrice}
          onChange={(e) => onChange({ addPrice: Number(e.target.value) })}
          step="any"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          추가 수량 <span className="font-mono text-foreground">{data.addQuantityPct}%</span>
        </label>
        <input
          type="range"
          min={10}
          max={100}
          step={10}
          value={data.addQuantityPct}
          onChange={(e) => onChange({ addQuantityPct: Number(e.target.value) })}
          className="w-full accent-[--color-accent]"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>10%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
