'use client';

/**
 * Single-symbol candlestick tile for /multichart.
 *
 * Timeframe switches the candle INTERVAL (like /chart's TF bar), not just
 * the visible range — a week of 1m candles in a ~370px tile is an
 * unreadable blob and needs 7 paginated requests, so longer views use
 * bigger candles instead.
 *
 * Trend candle-coloring and signal arrows mirror useBinanceChart's logic,
 * simplified: no trading-category/trend-mode filtering, no background
 * bands, no Bollinger, no realtime re-fetch (loaded once per symbol+TF).
 */

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { BINANCE_API, getBinanceRestUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';

export const CHART_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export type ChartInterval = (typeof CHART_INTERVALS)[number];

const INTERVAL_SECONDS: Record<ChartInterval, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

/** One request, no pagination — 1000 bars is plenty at every interval and stays fast across 6 tiles. */
const KLINE_LIMIT = 1000;

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
  borderColor?: string;
  wickColor?: string;
}

interface TrendEvent {
  tsMs: number;
  value: number;
}

async function fetchKlines(symbol: string, interval: ChartInterval): Promise<Candle[]> {
  const url = getBinanceRestUrl(
    `/klines?symbol=${symbol}&interval=${interval}&limit=${KLINE_LIMIT}`,
    'futures'
  );
  const res = await fetch(url);
  if (!res.ok) throw new Error(`klines ${res.status}`);
  const raw = (await res.json()) as Array<[number, string, string, string, string, ...unknown[]]>;
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000) as UTCTimestamp,
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
  }));
}

/** 단기추세 캔들 색상 — useBinanceChart의 shortCandleColorFromValue와 동일 매핑. */
function shortTrendColor(value: number): string | null {
  if (value === 100) return '#22c55e';
  if (value === 0) return '#9ca3af';
  if (value === -100) return '#ef4444';
  return null;
}

/** trend_events는 1m/10m 단위로만 적재된다 — 어떤 캔들 간격이든 1m 시리즈를 기준으로 색을 입힌다. */
async function fetchTrendEvents(symbol: string, sinceMs: number): Promise<TrendEvent[]> {
  const { data, error } = await supabase
    .from('trend_events')
    .select('ts,value')
    .eq('symbol', symbol)
    .eq('barinterval', '1m')
    .eq('type', 'trend_short')
    .gte('ts', new Date(sinceMs).toISOString())
    .order('ts', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ tsMs: new Date(row.ts).getTime(), value: row.value }));
}

function activeTrendValue(candleTimeSec: number, events: TrendEvent[]): number | null {
  const targetMs = candleTimeSec * 1000;
  let active: number | null = null;
  for (const e of events) {
    if (e.tsMs > targetMs) break;
    active = e.value;
  }
  return active;
}

function withTrendColor(candle: Candle, events: TrendEvent[]): Candle {
  const value = activeTrendValue(candle.time as number, events);
  const color = value != null ? shortTrendColor(value) : null;
  if (!color) return candle;
  return { ...candle, color, borderColor: color, wickColor: color };
}

interface SignalRow {
  direction: string;
  signal_type: string;
  timestamp: number;
  timestamp_ms: number | null;
}

async function fetchSignalEvents(symbol: string, sinceMs: number): Promise<SignalRow[]> {
  const { data, error } = await supabase
    .from('signal_events')
    .select('direction,signal_type,timestamp,timestamp_ms')
    .eq('symbol', symbol)
    .eq('bar_interval', '1m')
    .gte('timestamp_ms', sinceMs)
    .order('timestamp_ms', { ascending: true });
  if (error || !data) return [];
  return data;
}

/** 롱/숏 진입·청산 화살표 — useBinanceChart의 LONG/SHORT SVG 색상과 동일. */
function buildMarkers(
  rows: SignalRow[],
  candleTimes: Set<number>,
  intervalSec: number
): SeriesMarker<Time>[] {
  const seen = new Set<string>();
  const markers: SeriesMarker<Time>[] = [];
  for (const row of rows) {
    if (row.direction !== 'long' && row.direction !== 'short') continue;
    const tsMs = row.timestamp_ms ?? row.timestamp * 1000;
    const bucketSec = Math.floor(tsMs / 1000 / intervalSec) * intervalSec;
    if (!candleTimes.has(bucketSec)) continue;
    const isLong = row.direction === 'long';
    const isEntry = row.signal_type === 'entry' || row.signal_type === 'added_entry';
    // 같은 버킷에 중복 이벤트가 많아 한 캔들당 종류별 하나만 그린다.
    const key = `${bucketSec}:${row.direction}:${isEntry ? 'in' : 'out'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isAboveBar = (isLong && !isEntry) || (!isLong && isEntry);
    markers.push({
      time: bucketSec as UTCTimestamp,
      position: isAboveBar ? 'aboveBar' : 'belowBar',
      shape: isLong === isEntry ? 'arrowUp' : 'arrowDown',
      color: isLong ? '#7AC943' : '#F7941D',
      text: isEntry ? (isLong ? '매수' : '매도') : '청산',
    });
  }
  markers.sort((a, b) => (a.time as number) - (b.time as number));
  return markers;
}

interface MultiChartTileProps {
  symbol: string;
  interval: ChartInterval;
}

export function MultiChartTile({ symbol, interval }: MultiChartTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const trendEventsRef = useRef<TrendEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [signalCount, setSignalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.08)' },
        horzLines: { color: 'rgba(148,163,184,0.08)' },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });
    chartRef.current = chart;
    seriesRef.current = series;
    markersPluginRef.current = createSeriesMarkers(series, []);

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    const intervalSec = INTERVAL_SECONDS[interval];

    fetchKlines(symbol, interval)
      .then(async (candles) => {
        if (cancelled || !seriesRef.current || candles.length === 0) return;
        // 캔들이 실제로 덮는 구간만 조회 — 간격이 커질수록 더 먼 과거의 시그널까지 들어온다.
        const sinceMs = (candles[0].time as number) * 1000;
        const [trendEvents, signalRows] = await Promise.all([
          fetchTrendEvents(symbol, sinceMs),
          fetchSignalEvents(symbol, sinceMs),
        ]);
        if (cancelled || !seriesRef.current) return;
        trendEventsRef.current = trendEvents;
        seriesRef.current.setData(candles.map((c) => withTrendColor(c, trendEvents)));
        chartRef.current?.timeScale().fitContent();
        const candleTimes = new Set(candles.map((c) => c.time as number));
        const markers = buildMarkers(signalRows, candleTimes, intervalSec);
        markersPluginRef.current?.setMarkers(markers);
        setSignalCount(markers.length);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('로딩 실패');
        setLoading(false);
      });

    const ws = new WebSocket(
      `${BINANCE_API.WS_FUTURES}/ws/${symbol.toLowerCase()}@kline_${interval}`
    );
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          k?: { t: number; o: string; h: string; l: string; c: string };
        };
        const k = msg.k;
        if (!k || !seriesRef.current) return;
        seriesRef.current.update(
          withTrendColor(
            {
              time: Math.floor(k.t / 1000) as UTCTimestamp,
              open: Number(k.o),
              high: Number(k.h),
              low: Number(k.l),
              close: Number(k.c),
            },
            trendEventsRef.current
          )
        );
      } catch {
        // Ignore malformed kline messages.
      }
    };
    ws.onerror = () => {};

    return () => {
      cancelled = true;
      ws.close();
    };
  }, [symbol, interval]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!loading && !error ? (
        <div className="pointer-events-none absolute left-1 top-1 z-10 rounded bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {signalCount > 0 ? `시그널 ${signalCount}` : '시그널 없음'}
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {error}
        </div>
      ) : null}
    </div>
  );
}
