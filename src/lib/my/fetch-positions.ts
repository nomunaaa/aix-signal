import type { MyPositionsPageMock } from '@/lib/my/types'
import { supabase } from '@/integrations/supabase/client'
import {
  mapMockTradeToPosition,
  fetchLatestPrices,
  fetchFillsForTrades,
  type MockTradeRow,
} from '@/lib/my/mock-trades-adapter'

import { USE_MOCK_MY } from '@/lib/env/mock'

const USE_MOCK = USE_MOCK_MY

export async function fetchPositions(): Promise<MyPositionsPageMock> {
  if (USE_MOCK) {
    const { myPositionsMock } = await import('@/lib/mock/my-mock-data')
    return myPositionsMock
  }

  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id
  if (!userId) {
    return {
      generatedAtLabel: new Date().toLocaleString(),
      kpi: { activeCount: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 0, totalPnlUsd: 0 },
      positions: [],
      sortKey: 'opened_at',
    }
  }

  const { data: trades, error } = await supabase
    .from('mock_trades')
    .select(
      'id, symbol, direction, leverage, capital, entry_price, avg_entry_price, exit_price, remaining_pct, realized_pnl_usd, pnl, profit_pct, status, entry_at, exit_at, signal_cycle_id, stream'
    )
    .eq('user_id', userId)
    .neq('status', 'closed')
    .order('entry_at', { ascending: false })

  if (error || !trades) {
    return {
      generatedAtLabel: new Date().toLocaleString(),
      kpi: { activeCount: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 0, totalPnlUsd: 0 },
      positions: [],
      sortKey: 'opened_at',
    }
  }

  const rows = trades as MockTradeRow[]
  const symbols = [...new Set(rows.map((t) => t.symbol))]
  const [priceMap, fills] = await Promise.all([
    fetchLatestPrices(symbols),
    fetchFillsForTrades(rows.map((t) => t.id)),
  ])

  const positions = rows.map((t) => mapMockTradeToPosition(t, fills, priceMap[t.symbol] ?? null))

  const kpi = positions.reduce(
    (acc, p) => ({
      activeCount: acc.activeCount + 1,
      unrealizedPnlUsd: acc.unrealizedPnlUsd + p.unrealizedPnlUsd,
      realizedPnlUsd: acc.realizedPnlUsd + p.realizedPnlUsd,
      totalPnlUsd: acc.totalPnlUsd + p.totalPnlUsd,
    }),
    { activeCount: 0, unrealizedPnlUsd: 0, realizedPnlUsd: 0, totalPnlUsd: 0 }
  )

  return {
    generatedAtLabel: new Date().toLocaleString(),
    kpi,
    positions,
    sortKey: 'opened_at',
  }
}
