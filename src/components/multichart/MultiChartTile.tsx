'use client';

/**
 * Single-symbol candlestick tile for /multichart.
 * 1m only for now — 10m bars in this app are a server-aggregated series
 * (not a native Binance kline interval), out of scope for this first pass.
 *
 * Trend candle-color override and long/short signal arrows mirror the
 * logic in the main chart pages' useBinanceChart hook, simplified:
 * no trading-category/trend-mode filtering, no live signal refresh
 * (fetched once per symbol), no background trend bands, no Bollinger.
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

async function fetchKlines(symbol: string, limit = 200): Promise<Candle[]> {
  const url = getBinanceRestUrl(`/klines?symbol=${symbol}&interval=1m&limit=${limit}`, 'futures');
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

/** 단기추세 캔들 색상 오버라이드 — useBinanceChart.ts의 shortCandleColorFromValue와 동일 매핑. */
function shortTrendColor(value: number): string | null {
  if (value === 100) return '#22c55e';
  if (value === 0) return '#9ca3af';
  if (value === -100) return '#ef4444';
  return null;
}

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

/** 롱/숏 진입·청산 화살표 — useBinanceChart.ts의 LONG/SHORT_ENTRY/EXIT_SVG 색상과 동일. */
function buildMarkers(rows: SignalRow[], candleTimes: Set<number>): SeriesMarker<Time>[] {
  const markers: SeriesMarker<Time>[] = [];
  for (const row of rows) {
    if (row.direction !== 'long' && row.direction !== 'short') continue;
    const tsMs = row.timestamp_ms ?? row.timestamp * 1000;
    const bucketSec = Math.floor(tsMs / 1000 / 60) * 60;
    if (!candleTimes.has(bucketSec)) continue;
    const isLong = row.direction === 'long';
    const isEntry = row.signal_type === 'entry' || row.signal_type === 'added_entry';
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

interface MultiChartTileProps {
  symbol: string;
}

export function MultiChartTile({ symbol }: MultiChartTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const trendEventsRef = useRef<TrendEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

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

    fetchKlines(symbol)
      .then(async (candles) => {
        if (cancelled || !seriesRef.current || candles.length === 0) return;
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
        markersPluginRef.current?.setMarkers(buildMarkers(signalRows, candleTimes));
      })
      .catch(() => {
        if (!cancelled) setError('로딩 실패');
      });

    const ws = new WebSocket(`${BINANCE_API.WS_FUTURES}/ws/${symbol.toLowerCase()}@kline_1m`);
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
  }, [symbol]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {error}
        </div>
      ) : null}
    </div>
  );
}
