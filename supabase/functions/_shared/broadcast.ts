/**
 * Realtime 브로드캐스트 유틸리티
 */

import { SupabaseClient } from 'npm:@supabase/supabase-js@2.103.0';

export interface TrendLongBroadcast {
  kind: 'trend_long';
  symbol: string;
  barinterval: string;
  value: -100 | 0 | 100;
  raw_direction: number;
  ts: number;
  indicator_name: string;
}

export interface TrendShortBroadcast {
  kind: 'trend_short';
  symbol: string;
  barinterval: string;
  value: -100 | 0 | 100;
  raw_direction: number;
  ts: number;
  indicator_name: string;
}

export interface VolatilityBroadcast {
  kind: 'volatility';
  symbol: string;
  barinterval: string;
  value: -200 | 0 | 200;
  raw_strength: number;
  ts: number;
  indicator_name: string;
}

export interface SignalAlertBroadcast {
  kind: 'signal_alert';
  type: 'entry' | 'exit' | 'added_entry' | 'partial_exit';
  trading_category: string;
  cycle_id: string;
  direction: string;
  symbol: string;
  barinterval: string;
  price: number;
  ts: number;
  source: string;
  signal_name: string;
  full_message: Record<string, unknown>;
}

export interface SignalFlagBroadcast {
  kind: 'signal_flag';
  x: number;
  title: string;
  text: string;
  onSeries: string;
  symbol: string;
}

export interface TopBottomBroadcast {
  kind: 'top-bottom';
  symbol: string;
  barinterval: string;
  top_bottom: 'top' | 'bottom';
  ts: number;
  source: string;
  indicator_name: string;
}

/**
 * 차트 채널로 브로드캐스트 (webhook_realtime channel)
 * trend_long, trend_short, volatility, signal_flag, top-bottom events
 */
export async function broadcastToCharts(
  supabase: SupabaseClient,
  symbol: string,
  payload: TrendLongBroadcast | TrendShortBroadcast | VolatilityBroadcast | SignalFlagBroadcast | TopBottomBroadcast
): Promise<void> {
  // ✅ webhook_realtime channel руу broadcast хийх (webhookRealtime.ts дээр subscribe хийж байна)
  const channel = supabase.channel('webhook_realtime', {
    config: {
      broadcast: { self: false }
    }
  });
  await channel.subscribe();
  
  // ✅ Event name нь payload.kind-тай ижил байх ёстой (trend_long, trend_short, volatility, signal, top_bottom)
  const eventName = payload.kind;
  
  // Use send() - httpSend() requires different format and causes "Payload is required" error
  await channel.send({
    type: 'broadcast',
    event: eventName,
    payload,
  });
  
  await supabase.removeChannel(channel);
}

/**
 * 시그널 채널로 브로드캐스트 (signals:${symbol} channel)
 * signal_alert events (Dashboard.tsx дээр subscribe хийж байна)
 */
export async function broadcastToSignals(
  supabase: SupabaseClient,
  symbol: string,
  payload: SignalAlertBroadcast
): Promise<void> {
  const channel = supabase.channel(`signals:${symbol}`);
  await channel.subscribe();
  await channel.send({
    type: 'broadcast',
    event: 'signal_alert',
    payload,
  });
  
  await supabase.removeChannel(channel);
}
