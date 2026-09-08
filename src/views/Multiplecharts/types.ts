// src/pages/Multiplecharts/types.ts
import { ISeriesApi, SeriesMarker, UTCTimestamp } from "lightweight-charts";

export type Kline = [
    number,
    string,
    string,
    string,
    string,
    string,
    number,
    string,
    number,
    string,
    string,
    string
];

export type Candle = {
    bucket: number;
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export type ShortRange = {
    startMs: number;
    endMs: number;
    color: string;
};

export type VolInterval = {
    startMs: number;
    endMs: number;
    stacks: number;
    color: string;
};

export type VolColorKey = "nogoon" | "ulaan" | "saaral" | "tsayvarSaaral";

export type RenderSignal = {
    id: string;
    time: UTCTimestamp;
    direction: "long" | "short";
    type: "entry" | "exit" | string;
};

/** 차트 시그널 화살표 필터 — E1X1~E2X2(신호 카테고리) + 추세/비추세(사이클 flow). */
export type ChartTrendMode = "trend" | "nonTrend" | "reversal";
export type ChartTradingCategoryFilter = "ALL" | "E1X1" | "E1X2" | "E2X1" | "E2X2";

/** 모의매매 체결 1건(mock_trade_fills 1행에 대응) — 차트 화살표+라벨 렌더링에 쓴다. */
export type MockTradeFillPoint = {
    time: UTCTimestamp;
    price: number;
    fillType: "entry" | "add" | "partial_exit" | "exit";
    /** partial_exit일 때만 의미 있음 — 라벨의 "N%청산"에 쓰는 실제 청산 비율. */
    quantityPct?: number;
};

export type Candle10m = {
  bucket: number;
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};



export type TrendEvent = {
    id: string;
    symbol: string;
    ts: string;
    type?: string;
    trend_type?: string;
    value?: number;
    barinterval?: string;
};


export type VolatilityEvent = {
    id: string;
    symbol: string;
    ts: string;
    vol_type?: string;
    raw_strength?: number;
    value?: number;
    barinterval?: string;
};
export type SignalEvent = {
    id: string;
    symbol: string;
    signal_type: string;      // "entry", "exit", etc.
    direction: string;        // "long", "short"
    signal_name: string | null;
    price: number;
    bar_interval: string;
    source: string;
    trend_confidence: number | null;
    trend_type: string | null;
    timestamp: number;        // ms
    timestamp_ms: number;     // ms
    created_at: string;
    level: number | null;
    percentage: number | null;
    trading_category?: string | null;
    cycle_id?: string | null;
    ingest_mode?: string | null;
    /** Entry event timestamp assigned from the matching signal cycle for trend filtering. */
    entry_timestamp_ms?: number | null;
    entry_trend_short?: "UP" | "DOWN" | "NEUTRAL" | "up" | "down" | "neutral" | -100 | -1 | 0 | 1 | 100 | null;
    entry_trend_long?: "UP" | "DOWN" | "NEUTRAL" | "up" | "down" | "neutral" | -100 | -1 | 0 | 1 | 100 | null;
};
export type MarkerCandlestickSeriesApi = ISeriesApi<"Candlestick"> & {
    setMarkers: (markers: SeriesMarker<UTCTimestamp>[]) => void;
};

export type OhlcState = {
    open: number;
    high: number;
    low: number;
    close: number;
} | null;

// Binance WS: <symbol>@kline_10m
export type Kline10mWsMsg = {
    e: "kline";
    E: number;
    s: string;
    k: {
        t: number; // open time
        T: number; // close time
        s: string;
        i: "10m";
        f: number;
        L: number;
        o: string;
        c: string;
        h: string;
        l: string;
        v: string;
        n: number;
        x: boolean; // is closed
        q: string;
        V: string;
        Q: string;
        B: string;
    };
};
