interface CloseFormData {
  closePrice: number
}

interface CloseFormSectionProps {
  data: CloseFormData
  remainingQty: number
  onChange: (patch: Partial<CloseFormData>) => void
}

export function CloseFormSection({ data, remainingQty, onChange }: CloseFormSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">청산가 (USDT)</label>
        <input
          type="number"
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          value={data.closePrice}
          onChange={(e) => onChange({ closePrice: Number(e.target.value) })}
          step="any"
        />
      </div>

      <div className="rounded-md border border-border bg-[--color-background-secondary] px-3 py-2 text-xs text-muted-foreground">
        수량: 잔여 전량{' '}
        <span className="font-mono text-foreground">{remainingQty}%</span> 자동 청산
      </div>
    </div>
  )
}
