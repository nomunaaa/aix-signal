// mock_trades/mock_trade_fills(DB) → Position(UI 타입) 매핑.
// 모의매매는 시그널을 따라간 게 아니라 사용자가 직접 진입한 거래이므로
// engine/section/signalRefPnlPct 등 "시그널 대비" 필드는 중립값으로 채운다.
import { supabase } from '@/integrations/supabase/client'
import type { Position, PositionEvent, PositionState } from '@/lib/my/types'

export type MockTradeRow = {
  id: string
  symbol: string
  direction: string
  leverage: number
  capital: number
  entry_price: number
  avg_entry_price: number | null
  exit_price: number | null
  remaining_pct: number | null
  realized_pnl_usd: number | null
  pnl: number | null
  profit_pct: number | null
  status: string
  entry_at: string
  exit_at: string | null
  signal_cycle_id: string | null
  /** 진입 당시 스트림(Pulse=1분봉/Wave=10분봉). 과거 행은 이 값이 없어 null이며, PULSE로 간주한다. */
  stream: string | null
}

export type MockTradeFillRow = {
  trade_id: string
  fill_type: string
  price: number
  quantity_pct: number
  filled_at: string
}

function fillLabel(fillType: string, quantityPct: number): string {
  switch (fillType) {
    case 'entry':
      return '진입'
    case 'add':
      return '추가 진입'
    case 'partial_exit':
      return `분할 청산 ${quantityPct}%`
    case 'exit':
      return '전량 청산'
    default:
      return fillType
  }
}

function toPositionEvent(fill: MockTradeFillRow): PositionEvent {
  return {
    eventType: fill.fill_type as PositionEvent['eventType'],
    occurredAt: fill.filled_at,
    price: fill.price,
    quantityPct: fill.quantity_pct,
    label: fillLabel(fill.fill_type, fill.quantity_pct),
  }
}

function computeUnrealizedPnlUsd(trade: MockTradeRow, currentPrice: number | null): number {
  if (!currentPrice || !trade.avg_entry_price) return 0
  const remainingPct = trade.remaining_pct ?? 100
  const sliceCapital = trade.capital * (remainingPct / 100)
  const grossRoe =
    trade.direction === 'long'
      ? (currentPrice - trade.avg_entry_price) / trade.avg_entry_price
      : (trade.avg_entry_price - currentPrice) / trade.avg_entry_price
  const leveragedRoe = grossRoe * trade.leverage
  return sliceCapital * leveragedRoe
}

export function mapMockTradeToPosition(
  trade: MockTradeRow,
  fills: MockTradeFillRow[],
  currentPrice: number | null
): Position {
  const isClosed = trade.status === 'closed'
  const remainingPct = trade.remaining_pct ?? 100
  const realizedPnlUsd = trade.realized_pnl_usd ?? 0
  const unrealizedPnlUsd = isClosed ? 0 : computeUnrealizedPnlUsd(trade, currentPrice)
  const totalPnlUsd = isClosed ? realizedPnlUsd : realizedPnlUsd + unrealizedPnlUsd
  const totalPnlPct = trade.capital > 0 ? (totalPnlUsd / trade.capital) * 100 : 0

  const state: PositionState = isClosed ? 'closed' : remainingPct < 100 ? 'partial_closed' : 'open'
  const isWave = trade.stream === 'WAVE'

  const openedAtMs = new Date(trade.entry_at).getTime()
  const closedAtMs = trade.exit_at ? new Date(trade.exit_at).getTime() : Date.now()
  const holdSec = Math.max(0, Math.round((closedAtMs - openedAtMs) / 1000))

  const events = fills
    .filter((f) => f.trade_id === trade.id)
    .sort((a, b) => new Date(a.filled_at).getTime() - new Date(b.filled_at).getTime())
    .map(toPositionEvent)

  const eventSummary = isClosed
    ? '청산 완료'
    : remainingPct < 100
      ? `분할청산 진행 중 (잔여 ${remainingPct}%)`
      : events.some((e) => e.eventType === 'add')
        ? '추가 진입 있음'
        : '보유 중'

  return {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction === 'short' ? 'SHORT' : 'LONG',
    leverage: trade.leverage,
    strategy: 'basic',
    engine: isWave ? 'WAVE' : 'PULSE',
    barInterval: isWave ? '10m' : '1m',
    section: 'waiting',
    state,
    entryPrice: trade.entry_price,
    avgEntryPrice: trade.avg_entry_price ?? trade.entry_price,
    currentPrice: isClosed ? null : (currentPrice ?? trade.avg_entry_price ?? trade.entry_price),
    exitPrice: trade.exit_price,
    openedAt: trade.entry_at,
    closedAt: trade.exit_at,
    holdSec,
    realizedPnlUsd,
    unrealizedPnlUsd,
    totalPnlUsd,
    totalPnlPct,
    freshness: 'normal',
    events,
    eventSummary,
    engineMismatch: false,
    engineMismatchNote: null,
    signalRefPnlPct: totalPnlPct,
  }
}

/**
 * 심볼별 최신가 일괄 조회 (미확정 손익/청산가 계산용). 실패 시 빈 맵 반환.
 * live_feed_latest는 10개 심볼만, 페어 접미사 없이(예: "BTC") 채워지므로
 * mock_trades.symbol("BTCUSDT" 등)과 절대 매치되지 않아 조용히 빈 결과만 반환하던
 * 버그가 있었다 — Binance 선물 가격을 직접 벌크 조회하는 symbolStore로 교체한다.
 */
export async function fetchLatestPrices(symbols: string[]): Promise<Record<string, number>> {
  if (symbols.length === 0) return {}
  const { useSymbolStore } = await import('@/stores/symbolStore')
  try {
    const prices = await useSymbolStore.getState().fetchBinancePrices(symbols)
    const map: Record<string, number> = {}
    prices.forEach((data, symbol) => {
      map[symbol] = data.price
    })
    return map
  } catch {
    return {}
  }
}

export async function fetchFillsForTrades(tradeIds: string[]): Promise<MockTradeFillRow[]> {
  if (tradeIds.length === 0) return []
  const { data, error } = await supabase
    .from('mock_trade_fills')
    .select('trade_id, fill_type, price, quantity_pct, filled_at')
    .in('trade_id', tradeIds)
  if (error || !data) return []
  return data as MockTradeFillRow[]
}
