import type { StrategyKey } from '@/lib/my/types'
import { cn } from '@/lib/utils'

const STRATEGIES: { key: StrategyKey; label: string; desc: string; cssVar: string }[] = [
  { key: 'basic', label: '오리지널', desc: '단순 진입·청산', cssVar: 'var(--strategy-basic)' },
  { key: 'dca', label: '물타기', desc: '추가 진입 허용', cssVar: 'var(--strategy-dca)' },
  { key: 'partial_exit', label: '분할청산', desc: '수익 구간 분할', cssVar: 'var(--strategy-partial-exit)' },
  { key: 'dca_partial', label: '모두', desc: '추가+분할 혼합', cssVar: 'var(--strategy-dca-partial)' },
]

interface StrategyRadioCardsProps {
  value: StrategyKey
  onChange: (value: StrategyKey) => void
}

export function StrategyRadioCards({ value, onChange }: StrategyRadioCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {STRATEGIES.map((s) => {
        const selected = value === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onChange(s.key)}
            className={cn(
              'relative flex flex-col items-start rounded-md border p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-[--strategy-accent] bg-[--strategy-accent]/10'
                : 'border-border bg-transparent hover:bg-[--color-background-secondary]'
            )}
            style={
              selected
                ? ({ '--strategy-accent': s.cssVar } as React.CSSProperties)
                : undefined
            }
          >
            <span
              className="absolute left-0 top-0 h-full w-1 rounded-l-md"
              style={{ background: s.cssVar }}
            />
            <span className="pl-2 text-sm font-medium">{s.label}</span>
            <span className="pl-2 text-xs text-muted-foreground">{s.desc}</span>
          </button>
        )
      })}
    </div>
  )
}
