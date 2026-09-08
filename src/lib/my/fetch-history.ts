import type { MyHistoryPageMock, HistoryFilters, HistorySortKey } from '@/lib/my/types'
import { supabase } from '@/integrations/supabase/client'
import {
  mapMockTradeToPosition,
  fetchFillsForTrades,
  type MockTradeRow,
} from '@/lib/my/mock-trades-adapter'

import { USE_MOCK_MY } from '@/lib/env/mock'

const USE_MOCK = USE_MOCK_MY
const HISTORY_LIMIT = 200

function emptyHistory(filters?: Partial<HistoryFilters>): MyHistoryPageMock {
  return {
    generatedAtLabel: new Date().toLocaleString(),
    kpi: { total: 0, wins: 0, losses: 0, winRate: 0 },
    filters: {
      period: filters?.period ?? '30d',
      symbol: filters?.symbol ?? 'ALL',
      strategy: filters?.strategy ?? 'ALL',
      engine: filters?.engine ?? 'ALL',
      signalCycleId: filters?.signalCycleId ?? 'ALL',
    },
    sortKey: 'closed_at',
    rows: [],
    hasMore: false,
    remainingCount: 0,
  }
}

// 모의매매(mock_trades)에는 KAIROS strategy/engine 개념이 없으므로 그 필터는
// 무시하고, 실제로 대응 가능한 종목(symbol) / 시그널(signalCycleId) 필터만 적용한다.
export async function fetchHistory(
  filters?: Partial<HistoryFilters>,
  sortKey?: HistorySortKey
): Promise<MyHistoryPageMock> {
  if (USE_MOCK) {
    const { myHistoryMock } = await import('@/lib/mock/my-mock-data')
    return myHistoryMock
  }

  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id
  if (!userId) return emptyHistory(filters)

  let query = supabase
    .from('mock_trades')
    .select(
      'id, symbol, direction, leverage, capital, entry_price, avg_entry_price, exit_price, remaining_pct, realized_pnl_usd, pnl, profit_pct, status, entry_at, exit_at, signal_cycle_id, stream',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .eq('status', 'closed')

  if (filters?.symbol && filters.symbol !== 'ALL') {
    query = query.eq('symbol', filters.symbol)
  }
  if (filters?.signalCycleId && filters.signalCycleId !== 'ALL') {
    query = query.eq('signal_cycle_id', filters.signalCycleId)
  }

  query = query.order('exit_at', { ascending: false }).limit(HISTORY_LIMIT)

  const { data: trades, error, count } = await query
  if (error || !trades) return emptyHistory(filters)

  const rows = trades as MockTradeRow[]
  const fills = await fetchFillsForTrades(rows.map((t) => t.id))
  const positions = rows.map((t) => mapMockTradeToPosition(t, fills, null))

  const wins = positions.filter((p) => p.totalPnlUsd > 0).length
  const total = count ?? positions.length

  return {
    generatedAtLabel: new Date().toLocaleString(),
    kpi: {
      total,
      wins,
      losses: positions.filter((p) => p.totalPnlUsd < 0).length,
      winRate: positions.length > 0 ? wins / positions.length : 0,
    },
    filters: {
      period: filters?.period ?? '30d',
      symbol: filters?.symbol ?? 'ALL',
      strategy: filters?.strategy ?? 'ALL',
      engine: filters?.engine ?? 'ALL',
      signalCycleId: filters?.signalCycleId ?? 'ALL',
    },
    sortKey: sortKey ?? 'closed_at',
    rows: positions,
    hasMore: total > positions.length,
    remainingCount: Math.max(0, total - positions.length),
  }
}
