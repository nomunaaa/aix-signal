interface Props {
  onClick: () => void
  loading?: boolean
}

export function NewsLoadMore({ onClick, loading = false }: Props) {
  return (
    <div className="flex justify-center py-4">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="w-full max-w-[200px] rounded-md border border-border bg-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? '불러오는 중…' : '더보기'}
      </button>
    </div>
  )
}
