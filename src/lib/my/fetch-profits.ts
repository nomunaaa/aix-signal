import type { ProofPeriod } from '@/lib/my/types'
import { supabase } from '@/integrations/supabase/client'

const PROFITS_LIMIT = 500

export interface MyProfitsSummary {
  period: ProofPeriod
  periodPnlUsd: number
  periodTradeCount: number
  periodWinRate: number
  /** 기간과 무관한 전체 누적 손익 — 청산된 모의매매 전량 기준. */
  totalPnlUsd: number
  totalTradeCount: number
}

function emptySummary(period: ProofPeriod): MyProfitsSummary {
  return {
    period,
    periodPnlUsd: 0,
    periodTradeCount: 0,
    periodWinRate: 0,
    totalPnlUsd: 0,
    totalTradeCount: 0,
  }
}

function periodCutoffMs(period: ProofPeriod): number | null {
  if (period === 'all') return null
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
  return Date.now() - days * 86_400_000
}

/** 청산된 모의매매(mock_trades) 전량을 기준으로 기간 손익 + 전체 누적 손익을 낸다. */
export async function fetchProfitsSummary(period: ProofPeriod = '30d'): Promise<MyProfitsSummary> {
  const { data: userRes } = await supabase.auth.getUser()
  const userId = userRes?.user?.id
  if (!userId) return emptySummary(period)

  const { data: trades, error } = await supabase
    .from('mock_trades')
    .select('pnl, realized_pnl_usd, exit_at')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('exit_at', { ascending: false })
    .limit(PROFITS_LIMIT)

  if (error || !trades) return emptySummary(period)

  const rows = (trades as { pnl: number | null; realized_pnl_usd: number | null; exit_at: string | null }[]).map(
    (t) => ({
      pnlUsd: t.pnl ?? t.realized_pnl_usd ?? 0,
      exitMs: t.exit_at ? new Date(t.exit_at).getTime() : 0,
    })
  )

  const cutoffMs = periodCutoffMs(period)
  const periodRows = cutoffMs == null ? rows : rows.filter((r) => r.exitMs >= cutoffMs)

  const periodWins = periodRows.filter((r) => r.pnlUsd > 0).length

  return {
    period,
    periodPnlUsd: periodRows.reduce((sum, r) => sum + r.pnlUsd, 0),
    periodTradeCount: periodRows.length,
    periodWinRate: periodRows.length > 0 ? periodWins / periodRows.length : 0,
    totalPnlUsd: rows.reduce((sum, r) => sum + r.pnlUsd, 0),
    totalTradeCount: rows.length,
  }
}
