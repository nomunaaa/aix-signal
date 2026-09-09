'use client';

/**
 * Single-symbol candlestick tile for /multichart.
 * 1m only for now — 10m bars in this app are a server-aggregated series
 * (not a native Binance kline interval), out of scope for this first pass.
 */

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { BINANCE_API, getBinanceRestUrl } from '@/config/api';

interface Candle {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
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

interface MultiChartTileProps {
  symbol: string;
}

export function MultiChartTile({ symbol }: MultiChartTileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
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
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    fetchKlines(symbol)
      .then((candles) => {
        if (cancelled || !seriesRef.current) return;
        seriesRef.current.setData(candles);
        chartRef.current?.timeScale().fitContent();
      })
      .catch(() => {
        if (!cancelled) setError('로딩 실패');
      });

    const ws = new WebSocket(
      `${BINANCE_API.WS_FUTURES_STREAM}?streams=${symbol.toLowerCase()}@kline_1m`
    );
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as {
          data?: { k?: { t: number; o: string; h: string; l: string; c: string } };
        };
        const k = msg.data?.k;
        if (!k || !seriesRef.current) return;
        seriesRef.current.update({
          time: Math.floor(k.t / 1000) as UTCTimestamp,
          open: Number(k.o),
          high: Number(k.h),
          low: Number(k.l),
          close: Number(k.c),
        });
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
