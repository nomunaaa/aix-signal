'use client'

import { useBilingualText } from '@/hooks/useBilingualText'

interface Props {
  onClick: () => void
  disabled?: boolean
}

export function HistoryLoadMore({ onClick, disabled = false }: Props) {
  const { tr } = useBilingualText()

  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full max-w-[200px] rounded-md border border-border bg-transparent px-4 py-2 text-sm text-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {tr('더보기', 'Load more')}
      </button>
    </div>
  )
}
