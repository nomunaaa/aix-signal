/**
 * 모의매매 포지션 목록 — 진입 중(open) / 종료(closed)을 mock_trades에서 읽는다.
 * RLS가 owner-only이므로 별도 user 필터 없이 로그인 사용자 행만 조회된다.
 *
 * 종료된 포지션 중 분할청산(partial_exit)을 거친 것은 mock_trades 행 하나가 아니라
 * 그 포지션의 체결(mock_trade_fills) 각각을 별도 행으로 보여준다 — 그래야 "50%
 * 청산" 같은 부분 체결도 각자의 확정손익과 함께 히스토리에 남는다. 분할청산 없이
 * 한 번에 전량청산된 포지션은 기존처럼 mock_trades 행 하나로 표시한다.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MockTradeRow {
  id: string;
  symbol: string;
  direction: 'long' | 'short';
  leverage: number;
  capital: number;
  entryPrice: number;
  exitPrice: number | null;
  storedProfitPct: number | null;
  storedPnl: number | null;
  closedAt: string | null;
  /** 진입 당시 스트림. 과거 행은 기록이 없어 null이며, PULSE(1분봉)로 간주한다. */
  stream: 'PULSE' | 'WAVE';
}

const COLUMNS =
  'id,symbol,direction,leverage,capital,entry_price,avg_entry_price,exit_price,profit_pct,pnl,exit_at,status,stream';

interface RawRow {
  id: string;
  symbol: string;
  direction: string | null;
  leverage: number | null;
  capital: number | null;
  entry_price: number | null;
  avg_entry_price: number | null;
  exit_price: number | null;
  profit_pct: number | null;
  pnl: number | null;
  exit_at: string | null;
  stream: string | null;
}

interface RawFillRow {
  id: string;
  trade_id: string;
  fill_type: string;
  price: number;
  pnl_usd: number | null;
  pnl_pct: number | null;
  avg_entry_price_at_fill: number | null;
  filled_at: string;
  mock_trades: {
    symbol: string;
    direction: string | null;
    leverage: number | null;
    stream: string | null;
  } | null;
}

function mapRow(r: RawRow): MockTradeRow {
  return {
    id: r.id,
    symbol: r.symbol,
    direction: r.direction === 'short' ? 'short' : 'long',
    leverage: Number(r.leverage) || 1,
    capital: Number(r.capital) || 0,
    entryPrice: Number(r.avg_entry_price ?? r.entry_price) || 0,
    exitPrice: r.exit_price != null ? Number(r.exit_price) : null,
    storedProfitPct: r.profit_pct != null ? Number(r.profit_pct) : null,
    storedPnl: r.pnl != null ? Number(r.pnl) : null,
    closedAt: r.exit_at,
    stream: r.stream === 'WAVE' ? 'WAVE' : 'PULSE',
  };
}

function mapFillRow(f: RawFillRow): MockTradeRow | null {
  if (!f.mock_trades) return null;
  return {
    id: f.id,
    symbol: f.mock_trades.symbol,
    direction: f.mock_trades.direction === 'short' ? 'short' : 'long',
    leverage: Number(f.mock_trades.leverage) || 1,
    capital: 0,
    entryPrice: Number(f.avg_entry_price_at_fill) || 0,
    exitPrice: Number(f.price) || 0,
    storedProfitPct: f.pnl_pct != null ? Number(f.pnl_pct) : null,
    storedPnl: f.pnl_usd != null ? Number(f.pnl_usd) : null,
    closedAt: f.filled_at,
    stream: f.mock_trades.stream === 'WAVE' ? 'WAVE' : 'PULSE',
  };
}

export function useMockTradePositions(enabled: boolean, refreshKey?: unknown) {
  const [open, setOpen] = useState<MockTradeRow[]>([]);
  const [closed, setClosed] = useState<MockTradeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) {
      setOpen([]);
      setClosed([]);
      return;
    }
    setLoading(true);
    try {
      const [openRes, closedRes, fillsRes] = await Promise.all([
        supabase
          .from('mock_trades')
          .select(COLUMNS)
          .eq('status', 'open')
          .order('entry_at', { ascending: false })
          .limit(50),
        supabase
          .from('mock_trades')
          .select(COLUMNS)
          .eq('status', 'closed')
          .order('exit_at', { ascending: false })
          .limit(50),
        supabase
          .from('mock_trade_fills')
          .select(
            'id,trade_id,fill_type,price,pnl_usd,pnl_pct,avg_entry_price_at_fill,filled_at,mock_trades!inner(symbol,direction,leverage,stream)'
          )
          .in('fill_type', ['partial_exit', 'exit'])
          .order('filled_at', { ascending: false })
          .limit(200),
      ]);
      if (openRes.error) throw openRes.error;
      if (closedRes.error) throw closedRes.error;
      setOpen(((openRes.data ?? []) as RawRow[]).map(mapRow));

      if (fillsRes.error) {
        // fills 조회가 실패해도(예: 마이그레이션 미적용 환경) 기존 방식대로는 보여준다.
        console.warn('[useMockTradePositions] close fills load failed:', fillsRes.error);
        setClosed(((closedRes.data ?? []) as RawRow[]).map(mapRow));
        return;
      }

      const fillRows = (fillsRes.data ?? []) as unknown as RawFillRow[];
      const partiallyClosedTradeIds = new Set(
        fillRows.filter((f) => f.fill_type === 'partial_exit').map((f) => f.trade_id)
      );

      const fillDerivedRows = fillRows
        .filter((f) => partiallyClosedTradeIds.has(f.trade_id))
        .map(mapFillRow)
        .filter((row): row is MockTradeRow => row !== null);

      const closedTradeRows = ((closedRes.data ?? []) as RawRow[])
        .filter((r) => !partiallyClosedTradeIds.has(r.id))
        .map(mapRow);

      const merged = [...fillDerivedRows, ...closedTradeRows].sort((a, b) => {
        const at = a.closedAt ? Date.parse(a.closedAt) : 0;
        const bt = b.closedAt ? Date.parse(b.closedAt) : 0;
        return bt - at;
      });
      setClosed(merged.slice(0, 50));
    } catch (err) {
      console.warn('[useMockTradePositions] load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { open, closed, loading, reload: load };
}
