import type { Position, SignalContext } from '@/lib/my/types'

// Reconstruct a SignalContext from a Position for use in TradeEntryModal variants.
export function buildSignalFromPosition(position: Position): SignalContext {
  return {
    cycleId: position.id,
    symbol: position.symbol,
    direction: position.direction,
    engine: position.engine,
    section: position.section,
    signalPrice: position.entryPrice,
    currentPrice: position.currentPrice ?? position.exitPrice ?? position.entryPrice,
    kairosObservation: '',
    invalidationPrice: 0,
    targetPrice: 0,
    generatedAt: position.openedAt,
    generatedAtLabel: '',
  }
}
