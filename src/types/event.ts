/**
 * Symbol 허브 이벤트 피드 도메인.
 * 기존 차트/웹훅 `SignalEvent` 타입과 이름 충돌을 피하기 위해 `SymbolContextEvent` 사용.
 */

export type EventType =
  | 'signal_new'
  | 'action_entry'
  | 'action_exit'
  | 'cycle_close'
  | 'action_expired'
  | 'stop_loss'
  | 'trend_change'
  | 'volatility_spike'
  | 'market_shift'
  | 'volume_spike'
  | 'price_breakout'
  | 'price_breakdown'
  | 'win_streak'
  | 'lose_streak'
  | 'fitness_change'
  | 'winrate_milestone'
  | 'freshness_decay';

export type EventTier = 1 | 2 | 3;

export type EventSentiment = 'positive' | 'negative' | 'neutral';

export interface SymbolContextEvent {
  id: string;
  type: EventType;
  symbol: string;
  message: string;
  detail?: string;
  /** ISO 8601 */
  timestamp: string;
  tier: EventTier;
  sentiment: EventSentiment;
}

export type EventFeedFilter = 'all' | 'trading' | 'market' | 'strategy';

export interface EventTypeMetaRow {
  tier: EventTier;
  defaultSentiment: EventSentiment;
}

/** 스펙 표와 동기화 — UI/목 생성의 단일 소스 (아이콘은 `EventTypeCoolicon`에서 coolicons로 표시) */
export const EVENT_TYPE_META: Record<EventType, EventTypeMetaRow> = {
  signal_new: { tier: 1, defaultSentiment: 'positive' },
  action_entry: { tier: 1, defaultSentiment: 'positive' },
  action_exit: { tier: 1, defaultSentiment: 'positive' },
  cycle_close: { tier: 1, defaultSentiment: 'positive' },
  action_expired: { tier: 1, defaultSentiment: 'neutral' },
  stop_loss: { tier: 1, defaultSentiment: 'negative' },
  trend_change: { tier: 2, defaultSentiment: 'neutral' },
  volatility_spike: { tier: 2, defaultSentiment: 'neutral' },
  market_shift: { tier: 2, defaultSentiment: 'neutral' },
  volume_spike: { tier: 2, defaultSentiment: 'neutral' },
  price_breakout: { tier: 2, defaultSentiment: 'positive' },
  price_breakdown: { tier: 2, defaultSentiment: 'negative' },
  win_streak: { tier: 3, defaultSentiment: 'positive' },
  lose_streak: { tier: 3, defaultSentiment: 'negative' },
  fitness_change: { tier: 3, defaultSentiment: 'neutral' },
  winrate_milestone: { tier: 3, defaultSentiment: 'positive' },
  freshness_decay: { tier: 3, defaultSentiment: 'neutral' },
};

export function getEventTypeMeta(type: EventType): EventTypeMetaRow {
  return EVENT_TYPE_META[type];
}

export function filterSymbolContextEvents(
  events: readonly SymbolContextEvent[],
  filter: EventFeedFilter,
): SymbolContextEvent[] {
  if (filter === 'all') return [...events];
  const tier: EventTier =
    filter === 'trading' ? 1 : filter === 'market' ? 2 : 3;
  return events.filter((e) => e.tier === tier);
}
