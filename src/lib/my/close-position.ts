import { supabase } from '@/integrations/supabase/client'
import { USE_MOCK_MY } from '@/lib/env/mock'

type CloseMyPositionResult =
  | { ok: true }
  | { ok: false; error: unknown }

export async function closeMyPosition(
  positionId: string,
  exitPrice: number
): Promise<CloseMyPositionResult> {
  if (USE_MOCK_MY) return { ok: true }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      error: authError ?? new Error('Login is required to close a position.'),
    }
  }

  const { data: trade, error: tradeError } = await supabase
    .from('mock_trades')
    .select('entry_price, avg_entry_price, remaining_pct, status')
    .eq('id', positionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (tradeError || !trade) {
    return { ok: false, error: tradeError ?? new Error('Position was not found.') }
  }

  if (trade.status === 'closed') return { ok: true }

  const remainingPct = Math.min(100, Math.max(0, Number(trade.remaining_pct ?? 100)))
  const quantityPct = remainingPct > 0 ? remainingPct : 100
  const avgEntryPrice = trade.avg_entry_price ?? trade.entry_price

  if (trade.avg_entry_price == null && avgEntryPrice != null) {
    const { error: avgEntryError } = await supabase
      .from('mock_trades')
      .update({ avg_entry_price: avgEntryPrice })
      .eq('id', positionId)
      .eq('user_id', user.id)

    if (avgEntryError) return { ok: false, error: avgEntryError }
  }

  const { error: fillError } = await supabase.from('mock_trade_fills').insert({
    trade_id: positionId,
    user_id: user.id,
    fill_type: 'exit',
    price: exitPrice,
    quantity_pct: quantityPct,
    filled_at: new Date().toISOString(),
  })

  if (fillError) return { ok: false, error: fillError }

  return { ok: true }
}
