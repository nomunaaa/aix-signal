'use client'

import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface SymbolTab {
  value: string
  label: string
  count: number
}

interface Props {
  tabs: SymbolTab[]
  active: string
  onSelect: (value: string) => void
}

export function HistorySymbolTabs({ tabs, active, onSelect }: Props) {
  return (
    <>
      {/* 종목 수가 많으면(예: /history 30종목) 좁은 화면에서 버튼 줄이 여러 줄로
          쌓여 스크롤이 과도해진다. sm 미만에서는 드롭다운으로 대체한다. */}
      <div className="sm:hidden">
        <Select value={active} onValueChange={onSelect}>
          <SelectTrigger className="h-9 w-full rounded-[9px] text-[13px] font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
                <span className="ml-1.5 text-muted-foreground/70">{tab.count}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden flex-wrap gap-2 sm:flex">
        {tabs.map((tab) => {
          const on = tab.value === active
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onSelect(tab.value)}
              aria-pressed={on}
              className={cn(
                'inline-flex h-9 items-center gap-[7px] rounded-[9px] border px-4 text-[13px] font-semibold transition-colors',
                on
                  ? 'border-primary bg-primary/[0.12] text-foreground'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-foreground/25 hover:text-foreground'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  on ? 'text-primary' : 'text-muted-foreground/70'
                )}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
