// src/chart/binance10m/useBinance10mChart.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
    createChart,
    type IChartApi,
    type UTCTimestamp,
    type LogicalRange,
    CandlestickSeries,
    LineSeries,
    type ISeriesApi,
    TickMarkType,
    CandlestickData,
    type Time,
    LineStyle,
} from "lightweight-charts";

import type {
    Candle,
    Kline,
    OhlcState,
    TrendEvent,
    SignalEvent,
    ShortRange,
    MarkerCandlestickSeriesApi,
    MockTradeFillPoint,
    ChartTrendMode,
    ChartTradingCategoryFilter,
} from "./types";

import {
    BARS_PER_HOUR_1M,
    BARS_PER_HOUR_5M,
    BARS_PER_HOUR_10M,
    BARS_PER_HOUR_15M,
    MAX_1M_BARS,
    MAX_5M_BARS,
    MAX_10M_BARS,
    MAX_15M_BARS,
    resolveChartBucketMs,
    resolveMaxCandles,
    BB_PERIOD,
    BB_MULTIPLIER,
    TfKey1m,
    TfKey5m,
    TfKey10m,
    TfKey15m,
    LONG_ENTRY_SVG,
    LONG_EXIT_SVG,
    SHORT_ENTRY_SVG,
    SHORT_EXIT_SVG,
    ARROW_SIZE,
    MOCK_LONG_ENTRY_SVG,
    MOCK_LONG_EXIT_SVG,
    MOCK_SHORT_ENTRY_SVG,
    MOCK_SHORT_EXIT_SVG,
} from "./constants";

import { useTheme } from "@/hooks/useTheme";

/**
 * lightweight-charts는 CSS 변수를 읽지 못하므로 테마별 색을 명시적으로 넘겨야 한다.
 * 라이트 모드에서 기존 하드코딩 값(#999 텍스트 / #222 그리드)은 밝은 배경 위에서
 * 지나치게 어둡게 보이므로 테마에 맞는 값으로 분기한다.
 */
function resolveChartThemeColors(theme: "light" | "dark") {
    return theme === "light"
        ? { textColor: "#4B5563", gridColor: "#E5E7EB" }
        : { textColor: "#999999", gridColor: "#222222" };
}

import {
    fetchFuturesKlinesBetween,
    fetchFuturesKlines5mOlder,
    make10mCandleFromMs,
    fetchOlder1mKlines,
    fetchOlder5mKlines,
} from "./api";
import {
    aggregate5mTo10m,
    merge5mInto10m,
    wsKlineEventSymbol,
    wsKlineTo1mNums,
    wsKlineTo5mNums,
    wsKlineTo15mNums,
} from "./aggregation_5m";
import { buildShortRanges, updateBackgroundBandsDOM } from "./signal";
import { supabase } from "@/integrations/supabase/client";
import { readChartViewport, writeChartViewport } from "@/lib/lastChartViewport";
import { isBatchUploadRealtimeRow } from "@/lib/realtime/ingestMode";
import { shouldShowSignalForTrendModes } from "./chartSignalTrendFilter";
import { normalizeEntryTrendDirection } from "@/lib/signal-trend-mode";

// throttles
const UI_STATE_THROTTLE_MS = 120;
const BOLLINGER_THROTTLE_MS = 700;
const EVENTS_REFETCH_THROTTLE_MS = 900;

const LOAD_OLDER_LEFT_GUARD = 60;

// ---- TIMEFRAMES ----

const TF1M_TO_BARS: Record<TfKey1m, number> = {
    "2H": 2 * BARS_PER_HOUR_1M,             // 120
    "4H": 4 * BARS_PER_HOUR_1M,             // 240
    "6H": 6 * BARS_PER_HOUR_1M,             // 360
    "12H": 12 * BARS_PER_HOUR_1M,           // 720
    "5D": 5 * 24 * BARS_PER_HOUR_1M,        // 7200
};

const TF10M_TO_BARS: Record<TfKey10m, number> = {
    "6H": 6 * BARS_PER_HOUR_10M,            // 36
    "12H": 12 * BARS_PER_HOUR_10M,          // 72
    "3D": 3 * 24 * BARS_PER_HOUR_10M,       // 432
    "5D": 5 * 24 * BARS_PER_HOUR_10M,       // 720
    "7D": 7 * 24 * BARS_PER_HOUR_10M,       // 1008

};

const TF5M_TO_BARS: Record<TfKey5m, number> = {
    "6H": 6 * BARS_PER_HOUR_5M,             // 72
    "12H": 12 * BARS_PER_HOUR_5M,           // 144
    "1D": 24 * BARS_PER_HOUR_5M,            // 288
    "3D": 3 * 24 * BARS_PER_HOUR_5M,        // 864
    "5D": 5 * 24 * BARS_PER_HOUR_5M,        // 1440
};

const TF15M_TO_BARS: Record<TfKey15m, number> = {
    "6H": 6 * BARS_PER_HOUR_15M,            // 24
    "12H": 12 * BARS_PER_HOUR_15M,          // 48
    "1D": 24 * BARS_PER_HOUR_15M,           // 96
    "3D": 3 * 24 * BARS_PER_HOUR_15M,       // 288
    "5D": 5 * 24 * BARS_PER_HOUR_15M,       // 480
};

type RenderSignal = {
    id: string;
    time: UTCTimestamp;
    direction: "long" | "short";
    type: string; // entry / added_entry / partial_exit / exit
    /** 분할청산 비율 — signal_events.percentage. 채워져 있을 때만 라벨에 %를 쓴다. */
    percentage?: number | null;
};

type SignalCycleEntryTime = {
    trading_category: string | null;
    cycle_id: string | null;
    entry_time: string | null;
    entry_trend_short?: unknown;
    entry_trend_long?: unknown;
};

type SignalCycleEntryTrendDirection = SignalEvent["entry_trend_short"];

const SIGNAL_CYCLE_ENTRY_TIME_SELECT = "trading_category,cycle_id,entry_time,entry_trend_short,entry_trend_long";

function signalCycleKey(tradingCategory: unknown, cycleId: unknown): string | null {
    const category = typeof tradingCategory === "string" ? tradingCategory.trim().toUpperCase() : "";
    const cycle = typeof cycleId === "string" ? cycleId.trim() : "";
    return category && cycle ? `${category}|${cycle}` : null;
}

function withCycleEntryTimestamps(
    events: SignalEvent[],
    cycles: SignalCycleEntryTime[],
): SignalEvent[] {
    const entrySnapshotByCycle = new Map<
        string,
        {
            entry_timestamp_ms?: number;
            entry_trend_short?: SignalCycleEntryTrendDirection;
            entry_trend_long?: SignalCycleEntryTrendDirection;
        }
    >();

    for (const cycle of cycles) {
        const key = signalCycleKey(cycle.trading_category, cycle.cycle_id);
        const entryTimestampMs = cycle.entry_time ? Date.parse(cycle.entry_time) : NaN;
        if (key) {
            entrySnapshotByCycle.set(key, {
                entry_timestamp_ms: Number.isFinite(entryTimestampMs) ? entryTimestampMs : undefined,
                entry_trend_short: normalizeEntryTrendDirection(cycle.entry_trend_short),
                entry_trend_long: normalizeEntryTrendDirection(cycle.entry_trend_long),
            });
        }
    }

    return events.map((event) => {
        const key = signalCycleKey(event.trading_category, event.cycle_id);
        const snapshot = key ? entrySnapshotByCycle.get(key) : undefined;
        return snapshot == null ? event : { ...event, ...snapshot };
    });
}


export type ChartOverlayPriceLine = {
    id: string;
    price: number;
    color: string;
    lineWidth?: number;
    lineStyle?: number;
    axisLabelVisible?: boolean;
    title?: string;
};

// ---- PRICE FORMAT HELPERS ----
function decimalsFromNumber(n: number) {
    if (!Number.isFinite(n)) return 0;
    const s = n.toString();
    if (!s.includes(".")) return 0;
    return Math.min(12, s.split(".")[1]?.length ?? 0);
}
function computePriceFormatFromCandles(candles: Candle[]) {
    if (!candles.length) return { precision: 2, minMove: 0.01 };
    const tail = candles.slice(Math.max(0, candles.length - 300));
    let maxDecimals = 0;
    for (const c of tail) {
        maxDecimals = Math.max(
            maxDecimals,
            decimalsFromNumber(c.open),
            decimalsFromNumber(c.high),
            decimalsFromNumber(c.low),
            decimalsFromNumber(c.close)
        );
    }
    const precision = Math.max(2, Math.min(12, maxDecimals));
    const minMove = 1 / Math.pow(10, precision);
    return { precision, minMove };
}

export function useBinanceChart(
    symbol: string,
    barInterval: string,
    options?: {
        signalId?: string | null;
        onSignalClick?: (payload: { event: SignalEvent; entryEvent?: SignalEvent | null }) => void;
        snapshotRangeMs?: { startMs: number; endMs: number } | null;
        disableAutoLoadOlder?: boolean;
        disableRealtime?: boolean;
        /** 신호 카테고리(E1X1~E2X2) 필터 — 'ALL'이면 필터 없음. */
        tradingCategoryFilter?: ChartTradingCategoryFilter;
        /** 추세/비추세(사이클 flow) 필터 — 사이클이 아직 열려 있어 flow를 모르면 항상 표시한다. */
        trendModesFilter?: ChartTrendMode[];
    }
) {
    const BUCKET_MS = resolveChartBucketMs(barInterval);
    const maxCandlesMemory = resolveMaxCandles(barInterval);

    const [activeTf, setActiveTf] = useState<TfKey1m | TfKey5m | TfKey10m | TfKey15m>("6H");
    const activeTfRef = useRef<TfKey1m | TfKey5m | TfKey10m | TfKey15m>("6H");
    useEffect(() => {
        activeTfRef.current = activeTf;
    }, [activeTf]);

    const [ohlc, setOhlc] = useState<OhlcState>(null);
    const [hoverOhlc, setHoverOhlc] = useState<OhlcState>(null);
    const [initialLoading, setInitialLoading] = useState(true);
    const [lastPrice, setLastPrice] = useState<number | null>(null);
    /** `lastPrice`가 어느 종목의 캔들/WS에서 왔는지 — 교차 심볼 UI 오염 방지 */
    const [lastPriceSymbol, setLastPriceSymbol] = useState<string | null>(null);
    const [lastCandleTime, setLastCandleTime] = useState<UTCTimestamp | null>(null);
    const [chartReady, setChartReady] = useState(false);

    const [showTrendShort, setShowTrendShort] = useState(true);
    const [showTrendLong, setShowTrendLong] = useState(true);

    const showTrendShortRef = useRef(true);
    const showTrendLongRef = useRef(true);

    useEffect(() => {
        showTrendShortRef.current = showTrendShort;
    }, [showTrendShort]);
    useEffect(() => {
        showTrendLongRef.current = showTrendLong;
    }, [showTrendLong]);
    const [showBollinger, setShowBollinger] = useState(false);
    const showBollingerRef = useRef(false);

    const snapshotRangeMs = options?.snapshotRangeMs ?? null;
    const disableAutoLoadOlder = options?.disableAutoLoadOlder ?? Boolean(snapshotRangeMs);
    const disableRealtime = options?.disableRealtime ?? Boolean(snapshotRangeMs);
    const hasSymbol = symbol.trim().length > 0;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);
    // NOTE: volIndicatorRef no longer backs any drawing/data logic (the volatility
    // indicator feature was removed). It is kept as an inert passthrough only
    // because Chart5m.tsx/Chart15m.tsx (unused routes, intentionally left untouched)
    // still destructure it from this hook's return value.
    const volIndicatorRef = useRef<HTMLDivElement | null>(null);
    const signalSvgOverlayRef = useRef<HTMLDivElement | null>(null);
    const mockTradeSvgOverlayRef = useRef<HTMLDivElement | null>(null);
    const mockTradePointsRef = useRef<{
        fills: MockTradeFillPoint[];
        direction: "long" | "short";
    }>({ fills: [], direction: "long" });

    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<MarkerCandlestickSeriesApi | null>(null);

    // 테마 전환 시 차트 색을 다시 적용하기 위해 구독한다. chart 생성 effect는
    // [symbol, barInterval]로만 돌기 때문에, 테마만 바뀌면 색이 갱신되지 않는다.
    const { theme } = useTheme();
    const themeRef = useRef(theme);
    themeRef.current = theme;

    const loadOlderDataRef = useRef<(() => Promise<void>) | null>(null);
    const scheduleFetchAndApplyEventsRef = useRef<(() => void) | null>(null);
    const candlesRef = useRef<Candle[]>([]);
    const candleByTimeRef = useRef<Map<number, Candle>>(new Map());
    const bucketToTimeRef = useRef<Map<number, UTCTimestamp>>(new Map());

    const trendEventsRef = useRef<TrendEvent[]>([]);
    const signalEventsRef = useRef<SignalEvent[]>([]);
    const shortRangesRef = useRef<ShortRange[]>([]);

    // Every lifecycle event is classified from the trend at its cycle entry time.
    const tradingCategoryFilterRef = useRef<ChartTradingCategoryFilter>(
        options?.tradingCategoryFilter ?? "ALL"
    );
    const trendModesFilterRef = useRef<ChartTrendMode[]>(
        options?.trendModesFilter ?? ["trend", "nonTrend", "reversal"]
    );
    const [signalEvents, setSignalEvents] = useState<SignalEvent[]>([]);

    const bbMiddleRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbUpperRef = useRef<ISeriesApi<"Line"> | null>(null);
    const bbLowerRef = useRef<ISeriesApi<"Line"> | null>(null);

    const bbRafRef = useRef<number | null>(null);
    const lastBbAtRef = useRef<number>(0);

    const lastEventsAtRef = useRef<number>(0);
    const eventsRafRef = useRef<number | null>(null);

    const bgRafRef = useRef<number | null>(null);

    const uiRafRef = useRef<number | null>(null);
    const lastUiAtRef = useRef<number>(0);
    const latestOhlcRef = useRef<OhlcState>(null);
    const latestLastPriceRef = useRef<number | null>(null);
    const latestLastPriceForSymbolRef = useRef<string | null>(null);
    /** 심볼 전환 시 in-flight 초기 로드 무시 */
    const chartBootstrapGenRef = useRef(0);

    const loadingMoreRef = useRef(false);
    const adjustingRangeRef = useRef(false);
    const currentTimeRangeRef = useRef<{ fromIndex: number; toIndex: number; attempts: number } | null>(null);

    const lastLoadOlderAtRef = useRef(0);
    const lastLoadOlderFirstBucketRef = useRef<number | null>(null);

    /** 페이지 이탈 후 복귀 시 마지막 뷰포트를 복원하기 위한 저장 타이머(디바운스). */
    const viewportPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const disposedRef = useRef(false);
    /**
     * 시그널 딥링크(entryTime/exitTime)로 들어온 차트는 그 구간만 딱 조회해 카메라를
     * 고정한다. 이 상태에서 배경 "과거 데이터 자동 로드"가 돌면 매번 논리 범위를
     * 다시 맞춰(loadOlderData 말미) 카메라가 조금씩 밀리고, firstBucket이 바뀌니
     * 다시 로드 조건이 성립해 반복 → 결국 시그널에서 완전히 벗어난 캔들로 이동한다.
     * ("처음엔 시그널이 보이는데 곧 엉뚱한 캔들로 바뀐다"는 증상)
     * 그래서 딥링크로 고정된 동안에는 자동 과거 로드를 멈추고, 사용자가 실제로
     * 스크롤/줌/기간버튼을 건드리는 순간 고정을 풀어 원래 동작으로 돌려준다.
     */
    const deepLinkPinnedRef = useRef(false);

    const baseBarSpacingRef = useRef(1);
    const effectiveBarSpacingRef = useRef(8);

    const priceFormatRef = useRef<{ precision: number; minMove: number }>({
        precision: 4,
        minMove: 0.0001,
    });

    const mockTradeLineRef = useRef<ISeriesApi<"Line"> | null>(null);

    const overlayPriceLinesRef = useRef<Array<{ id: string; line: { remove(): void } }>>([]);

    const clearOverlayPriceLines = useCallback(() => {
        for (const row of overlayPriceLinesRef.current) {
            try {
                row.line.remove();
            } catch {
                // detach is best-effort
            }
        }
        overlayPriceLinesRef.current = [];
    }, []);

    const setOverlayPriceLines = useCallback(
        (lines: ChartOverlayPriceLine[]) => {
            const series = seriesRef.current;
            if (!series) return;
            clearOverlayPriceLines();
            for (const ln of lines) {
                 
                const line = (series as any).createPriceLine({
                    price: ln.price,
                    color: ln.color,
                    lineWidth: ln.lineWidth ?? 1,
                    lineStyle: ln.lineStyle ?? LineStyle.Dashed,
                    axisLabelVisible: ln.axisLabelVisible ?? true,
                    title: ln.title ?? "",
                });
                overlayPriceLinesRef.current.push({ id: ln.id, line });
            }
        },
        [clearOverlayPriceLines]
    );

    const renderSignalsRef = useRef<RenderSignal[]>([]);
    const renderSignalsRafRef = useRef<number | null>(null);

    const applyPriceFormatToSeries = useCallback(() => {
        const fmt = priceFormatRef.current;

        seriesRef.current?.applyOptions({
            priceFormat: { type: "price", precision: fmt.precision, minMove: fmt.minMove },
         
        } as any);

        const bbFmt = { type: "price" as const, precision: fmt.precision, minMove: fmt.minMove };
         
        bbMiddleRef.current?.applyOptions({ priceFormat: bbFmt } as any);
         
        bbUpperRef.current?.applyOptions({ priceFormat: bbFmt } as any);
         
        bbLowerRef.current?.applyOptions({ priceFormat: bbFmt } as any);
         
        mockTradeLineRef.current?.applyOptions({ priceFormat: bbFmt } as any);
    }, []);

    const rebuildCandleMaps = useCallback(() => {
        const timeMap = new Map<number, Candle>();
        const bucketMap = new Map<number, UTCTimestamp>();
        for (const c of candlesRef.current) {
            const t = Number(c.time);
            timeMap.set(t, c);
            bucketMap.set(c.bucket, c.time);
        }
        candleByTimeRef.current = timeMap;
        bucketToTimeRef.current = bucketMap;
    }, []);

    const getBucketTimeMap = () => {
        const map = new Map<number, UTCTimestamp>();
        for (const c of candlesRef.current) map.set(c.bucket, c.time);
        return map;
    };

    const scheduleUiStateSync = useCallback(() => {
        const now = Date.now();
        if (now - lastUiAtRef.current < UI_STATE_THROTTLE_MS) return;
        if (uiRafRef.current !== null) return;

        uiRafRef.current = window.requestAnimationFrame(() => {
            uiRafRef.current = null;
            if (disposedRef.current) return;
            const lpSym = latestLastPriceForSymbolRef.current;
            const curSym = currentSymbolRef.current;
            if (lpSym != null && curSym != null && lpSym !== curSym) {
                latestLastPriceRef.current = null;
                latestLastPriceForSymbolRef.current = null;
                setLastPrice(null);
                setLastPriceSymbol(null);
                return;
            }

            lastUiAtRef.current = Date.now();
            const nextOhlc = latestOhlcRef.current;
            const nextPrice = latestLastPriceRef.current;

            setOhlc((prev) => {
                if (!nextOhlc && !prev) return prev;
                if (!nextOhlc || !prev) return nextOhlc;
                if (
                    prev.open === nextOhlc.open &&
                    prev.high === nextOhlc.high &&
                    prev.low === nextOhlc.low &&
                    prev.close === nextOhlc.close
                )
                    return prev;
                return nextOhlc;
            });

            setLastPrice((prev) => (prev === nextPrice ? prev : nextPrice));
            const sym = latestLastPriceForSymbolRef.current;
            setLastPriceSymbol((prev) => (prev === sym ? prev : sym));
        });
    }, []);

    const getCandleColorForTime = useCallback((time: UTCTimestamp): string | null => {
        if (!showTrendShortRef.current) return null;
        const ranges = shortRangesRef.current;
        if (!ranges.length) return null;

        const tMs = Number(time) * 1000;
        for (const r of ranges) {
            if (tMs >= r.startMs && tMs < r.endMs) return r.color;
        }
        return null;
    }, []);

    const applyEffectiveBarSpacing = useCallback(() => {
        if (disposedRef.current) return;
        const chart = chartRef.current;
        if (!chart) return;

        const next = Math.max(1, Math.min(baseBarSpacingRef.current, 60));
        effectiveBarSpacingRef.current = next;
        try {
            chart.applyOptions({ timeScale: { barSpacing: next } });
        } catch {
            return;
        }
    }, []);

    const getSvgForSignal = useCallback((s: RenderSignal): string => {
        const isLong = s.direction === "long";
        const isEntry = String(s.type).toLowerCase() === "entry";
        if (isEntry && isLong) return LONG_ENTRY_SVG;
        if (!isEntry && isLong) return LONG_EXIT_SVG;
        if (isEntry && !isLong) return SHORT_ENTRY_SVG;
        return SHORT_EXIT_SVG;
    }, []);

    const SIGNAL_GAP_PX = 10;
    const LABEL_GAP_PX = 3;

    /**
     * 시그널 화살표 아래 라벨 — 모의매매 화살표와 같은 표기 규칙을 따른다.
     * partial_exit은 signal_events.percentage가 있을 때만 "N%청산"으로 쓰고,
     * 비어 있으면 임의의 숫자를 지어내지 않고 "[분할청산]"으로만 표기한다.
     */
    const getLabelForSignal = useCallback((s: RenderSignal): string => {
        const type = String(s.type).toLowerCase();
        if (type === "entry") return "[매수]";
        if (type === "added_entry") return "[추가매수]";
        if (type === "partial_exit") {
            const pct = Number(s.percentage);
            return Number.isFinite(pct) && pct > 0 ? `[${pct}%청산]` : "[분할청산]";
        }
        if (type === "exit") return "[모두청산]";
        return "";
    }, []);

    const renderSignalSvgs = useCallback(() => {
        const chart = chartRef.current;
        const series = seriesRef.current;
        const overlay = signalSvgOverlayRef.current;
        if (!chart || !series || !overlay) return;

        const ts = chart.timeScale();
        const lr = ts.getVisibleLogicalRange();

        overlay.innerHTML = "";
        if (!lr) return;

        const candles = candlesRef.current;
        if (!candles.length) return;

        const chartWidth = overlay.offsetWidth;
        const halfArrow = ARROW_SIZE / 2;

        let priceAxisWidth = 0;
        try {
            const priceScale = chart.priceScale('right');
            if (priceScale) {
                priceAxisWidth = priceScale.width() - 10;
            }
        } catch {
            priceAxisWidth = 70;
        }

        const chartContentWidth = chartWidth - priceAxisWidth;
        const maxX = chartContentWidth - halfArrow;

        const from = Math.max(0, Math.floor(lr.from) - 50);
        const to = Math.min(candles.length - 1, Math.ceil(lr.to) + 50);

        const candleByTime = new Map<number, Candle>();
        for (let i = from; i <= to; i++) {
            const c = candles[i];
            candleByTime.set(Number(c.time), c);
        }

        const fragment = document.createDocumentFragment();

        for (const s of renderSignalsRef.current) {
            const candle = candleByTime.get(Number(s.time));
            if (!candle) continue;

            const x = ts.timeToCoordinate(candle.time as unknown as Time);
            if (x === null) continue;

            if (x < -halfArrow || x > maxX) continue;

            const isLong = s.direction === "long";
            const isEntry = String(s.type).toLowerCase() === "entry";

            const isAboveBar = (isLong && !isEntry) || (!isLong && isEntry);

            const anchorPrice = isAboveBar ? candle.high : candle.low;
            const yAnchor = series.priceToCoordinate(anchorPrice);
            if (yAnchor === null) continue;

            const y = isAboveBar
                ? yAnchor - SIGNAL_GAP_PX - ARROW_SIZE / 2
                : yAnchor + SIGNAL_GAP_PX + ARROW_SIZE / 2;

            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.width = `${ARROW_SIZE}px`;
            el.style.height = `${ARROW_SIZE}px`;
            el.style.left = `${x - ARROW_SIZE / 2}px`;
            el.style.top = `${y - ARROW_SIZE / 2}px`;
            el.style.pointerEvents = "auto";
            el.style.cursor = "pointer";
            el.dataset.signalId = String(s.id);
            el.dataset.signalType = String(s.type);
            el.dataset.signalDirection = String(s.direction);
            el.innerHTML = getSvgForSignal(s);

            fragment.appendChild(el);

            // 화살표 아래 동작 라벨([매수]/[추가매수]/[분할청산]/[모두청산]).
            const labelText = getLabelForSignal(s);
            if (labelText) {
                const label = document.createElement("div");
                label.style.position = "absolute";
                label.style.left = `${x}px`;
                label.style.top = `${y + ARROW_SIZE / 2 + LABEL_GAP_PX}px`;
                label.style.transform = "translateX(-50%)";
                label.style.whiteSpace = "nowrap";
                label.style.pointerEvents = "none";
                label.style.fontSize = "10px";
                label.style.fontWeight = "700";
                label.style.lineHeight = "1";
                label.style.padding = "1px 4px";
                label.style.borderRadius = "3px";
                label.style.color = "#fff";
                label.style.backgroundColor = isLong ? "#16A34A" : "#DC2626";
                label.textContent = labelText;

                fragment.appendChild(label);
            }
        }

        overlay.appendChild(fragment);
    }, [getSvgForSignal, getLabelForSignal]);

    const getSvgForMockPoint = useCallback((isEntry: boolean, direction: "long" | "short"): string => {
        const isLong = direction === "long";
        if (isEntry && isLong) return MOCK_LONG_ENTRY_SVG;
        if (!isEntry && isLong) return MOCK_LONG_EXIT_SVG;
        if (isEntry && !isLong) return MOCK_SHORT_ENTRY_SVG;
        return MOCK_SHORT_EXIT_SVG;
    }, []);

    // 모의매매 화살표 아래에 표시할 거래 동작 텍스트. fill_type 4종
    // (entry/add/partial_exit/exit) 전체를 라벨로 구분한다.
    const getLabelForMockPoint = useCallback((fill: MockTradeFillPoint): string => {
        if (fill.fillType === "entry") return "[매수]";
        if (fill.fillType === "add") return "[추가매수]";
        if (fill.fillType === "partial_exit") return `[${fill.quantityPct ?? 50}%청산]`;
        return "[모두청산]";
    }, []);

    // 모의매매 체결 화살표 — renderSignalSvgs와 동일한 좌표 변환 로직을 그대로 따르되,
    // 시그널 배열이 아니라 현재 모의매매 1건의 체결 내역(진입/추가/분할청산/전량청산)을 그린다.
    const renderMockTradeSvgs = useCallback(() => {
        const chart = chartRef.current;
        const series = seriesRef.current;
        const overlay = mockTradeSvgOverlayRef.current;
        if (!chart || !series || !overlay) return;

        const ts = chart.timeScale();
        const lr = ts.getVisibleLogicalRange();

        overlay.innerHTML = "";
        if (!lr) return;

        const candles = candlesRef.current;
        if (!candles.length) return;

        const { fills, direction } = mockTradePointsRef.current;
        if (!fills.length) return;

        const chartWidth = overlay.offsetWidth;
        const halfArrow = ARROW_SIZE / 2;

        let priceAxisWidth = 0;
        try {
            const priceScale = chart.priceScale('right');
            if (priceScale) {
                priceAxisWidth = priceScale.width() - 10;
            }
        } catch {
            priceAxisWidth = 70;
        }

        const chartContentWidth = chartWidth - priceAxisWidth;
        const maxX = chartContentWidth - halfArrow;

        const from = Math.max(0, Math.floor(lr.from) - 50);
        const to = Math.min(candles.length - 1, Math.ceil(lr.to) + 50);

        const candleByTime = new Map<number, Candle>();
        for (let i = from; i <= to; i++) {
            const c = candles[i];
            candleByTime.set(Number(c.time), c);
        }

        const fragment = document.createDocumentFragment();

        for (const fill of fills) {
            const candle = candleByTime.get(Number(fill.time));
            if (!candle) continue;

            const x = ts.timeToCoordinate(fill.time as unknown as Time);
            if (x === null) continue;
            if (x < -halfArrow || x > maxX) continue;

            const isEntry = fill.fillType === "entry" || fill.fillType === "add";
            const isLong = direction === "long";
            const isAboveBar = (isLong && !isEntry) || (!isLong && isEntry);
            const anchorPrice = isAboveBar ? candle.high : candle.low;
            const yAnchor = series.priceToCoordinate(anchorPrice);
            if (yAnchor === null) continue;

            const y = isAboveBar
                ? yAnchor - SIGNAL_GAP_PX - ARROW_SIZE / 2
                : yAnchor + SIGNAL_GAP_PX + ARROW_SIZE / 2;

            const el = document.createElement("div");
            el.style.position = "absolute";
            el.style.width = `${ARROW_SIZE}px`;
            el.style.height = `${ARROW_SIZE}px`;
            el.style.left = `${x - ARROW_SIZE / 2}px`;
            el.style.top = `${y - ARROW_SIZE / 2}px`;
            el.innerHTML = getSvgForMockPoint(isEntry, direction);

            fragment.appendChild(el);

            const label = document.createElement("div");
            label.style.position = "absolute";
            label.style.left = `${x}px`;
            label.style.top = `${y + ARROW_SIZE / 2 + LABEL_GAP_PX}px`;
            label.style.transform = "translateX(-50%)";
            label.style.whiteSpace = "nowrap";
            label.style.pointerEvents = "none";
            label.style.fontSize = "10px";
            label.style.fontWeight = "700";
            label.style.lineHeight = "1";
            label.style.padding = "1px 4px";
            label.style.borderRadius = "3px";
            label.style.color = "#fff";
            label.style.backgroundColor = "#38BDF8";
            label.textContent = getLabelForMockPoint(fill);

            fragment.appendChild(label);
        }

        overlay.appendChild(fragment);
    }, [getSvgForMockPoint, getLabelForMockPoint]);

    const scheduleRenderSignalSvgs = useCallback(() => {
        if (renderSignalsRafRef.current !== null) return;
        renderSignalsRafRef.current = window.requestAnimationFrame(() => {
            renderSignalsRafRef.current = null;
            renderSignalSvgs();
            renderMockTradeSvgs();
        });
    }, [renderSignalSvgs, renderMockTradeSvgs]);

    useEffect(() => {
        const overlay = signalSvgOverlayRef.current;
        if (!overlay) return;
        if (!options?.onSignalClick) return;

        const onClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const hit = target?.closest?.("[data-signal-id]") as HTMLElement | null;
            if (!hit) return;
            const id = hit.dataset.signalId;
            if (!id) return;
            const events = signalEventsRef.current;
            const ev = events.find((e) => String(e.id) === String(id));
            if (!ev) return;
            let entryEvent: SignalEvent | null = null;
            if (String(ev.signal_type).toLowerCase() === "exit") {
                const name = ev.signal_name ? String(ev.signal_name) : "";
                if (name) {
                    entryEvent = events.find(
                        (e) =>
                            String(e.signal_name) === name &&
                            String(e.signal_type).toLowerCase() === "entry"
                    ) ?? null;
                }
                if (!entryEvent) {
                    entryEvent =
                        events
                            .filter(
                                (e) =>
                                    String(e.signal_type).toLowerCase() === "entry" &&
                                    String(e.direction).toLowerCase() === String(ev.direction).toLowerCase() &&
                                    Number(e.timestamp_ms) <= Number(ev.timestamp_ms)
                            )
                            .sort((a, b) => Number(b.timestamp_ms) - Number(a.timestamp_ms))[0] ?? null;
                }
            }
            options.onSignalClick?.({ event: ev, entryEvent });
        };

        overlay.addEventListener("click", onClick);
        return () => overlay.removeEventListener("click", onClick);

    }, [options?.onSignalClick]);

    const buildRenderSignals = useCallback((events: SignalEvent[]): RenderSignal[] => {
        const candles = candlesRef.current;
        if (!candles.length) return [];

        const bucketToTime = getBucketTimeMap();
        const out: RenderSignal[] = [];

        const tradingCategoryFilter = tradingCategoryFilterRef.current;
        const trendModesFilter = trendModesFilterRef.current;

        for (const ev of events) {

            const tRaw = (ev as any).timestamp_ms;
            if (!tRaw) continue;


            const dirRaw = String((ev as any).direction ?? "").toLowerCase();

            const typeRaw = String((ev as any).signal_type ?? "").toLowerCase();
            if (dirRaw !== "long" && dirRaw !== "short") continue;

            // 신호 카테고리(E1X1~E2X2) 필터 — 카테고리가 없는(구버전) 이벤트는 항상 표시한다.
            if (tradingCategoryFilter !== "ALL") {
                const category = String((ev as any).trading_category ?? "").toUpperCase();
                if (category && category !== tradingCategoryFilter) continue;
            }

            // Trend mode uses the matching cycle entry timestamp when available.
            if (!shouldShowSignalForTrendModes(ev, trendEventsRef.current, trendModesFilter)) continue;

            const tMs = Number(tRaw);
            const bucket = Math.floor(tMs / BUCKET_MS);
            const candleTime = bucketToTime.get(bucket);
            if (!candleTime) continue;

            out.push({

                id: String((ev as any).id ?? `${bucket}-${dirRaw}-${typeRaw}`),
                time: candleTime,
                direction: dirRaw as "long" | "short",
                type: typeRaw || "entry",
                percentage: (ev as any).percentage ?? null,
            });
        }

        out.sort((a, b) => Number(a.time) - Number(b.time));
        return out;

    }, []);

    // 필터가 바뀌면 재조회 없이, 이미 받아 둔 이벤트를 다시 필터링해서 화살표만 다시 그린다.
    useEffect(() => {
        tradingCategoryFilterRef.current = options?.tradingCategoryFilter ?? "ALL";
        trendModesFilterRef.current = options?.trendModesFilter ?? ["trend", "nonTrend", "reversal"];

        // 캔들/이벤트가 아직 없는 시점(첫 마운트·심볼 전환 직후 등)에는 다시 만들지 않는다.
        // buildRenderSignals는 캔들이 없으면 []를 돌려주므로, 여기서 무조건 덮어쓰면
        // 이미 그려 둔 화살표가 지워지고 다음 이벤트 조회(스로틀 900ms) 전까지 복구되지 않는다.
        if (!candlesRef.current.length || !signalEventsRef.current.length) return;

        renderSignalsRef.current = buildRenderSignals(signalEventsRef.current);
        scheduleRenderSignalSvgs();
    }, [options?.tradingCategoryFilter, options?.trendModesFilter, buildRenderSignals, scheduleRenderSignalSvgs]);

    const setMockTradeOverlay = useCallback(
        (args: {
            fills?: MockTradeFillPoint[] | null;
            direction?: "long" | "short";
        }) => {
            const fills = args.fills ?? [];

            // 화살표는 진입 시점부터 바로 보여준다(청산 전이어도 진입 화살표는 표시).
            mockTradePointsRef.current = {
                fills,
                direction: args.direction ?? mockTradePointsRef.current.direction,
            };
            renderMockTradeSvgs();

            const line = mockTradeLineRef.current;
            if (!line) return;

            // 체결이 1건뿐이면(아직 진입만 있음) 잇는 선은 의미가 없다.
            if (fills.length < 2) {
                line.setData([]);
                return;
            }

            const sorted = [...fills].sort((a, b) => Number(a.time) - Number(b.time));
            const dedupedByTime: typeof sorted = [];
            for (const f of sorted) {
                const prev = dedupedByTime[dedupedByTime.length - 1];
                if (prev && Number(prev.time) === Number(f.time)) continue;
                dedupedByTime.push(f);
            }

            line.setData(dedupedByTime.map((f) => ({ time: f.time, value: f.price })));
        },
        [renderMockTradeSvgs]
    );

    const clearMockTradeOverlay = useCallback(() => {
        if (mockTradeLineRef.current) mockTradeLineRef.current.setData([]);
        mockTradePointsRef.current = { fills: [], direction: "long" };
        if (mockTradeSvgOverlayRef.current) mockTradeSvgOverlayRef.current.innerHTML = "";
    }, []);

    // -------------------------
    // Bollinger
    // -------------------------
    const recalcBollinger = useCallback(() => {
        const middleSeries = bbMiddleRef.current;
        const upperSeries = bbUpperRef.current;
        const lowerSeries = bbLowerRef.current;
        if (!middleSeries || !upperSeries || !lowerSeries) return;

        if (!showBollingerRef.current) {
            middleSeries.setData([]);
            upperSeries.setData([]);
            lowerSeries.setData([]);
            return;
        }

        const candles = candlesRef.current;
        if (!candles.length || candles.length < BB_PERIOD) {
            middleSeries.setData([]);
            upperSeries.setData([]);
            lowerSeries.setData([]);
            return;
        }

        const closes = candles.map((c) => c.close);
        const middle: { time: UTCTimestamp; value: number }[] = [];
        const upper: { time: UTCTimestamp; value: number }[] = [];
        const lower: { time: UTCTimestamp; value: number }[] = [];

        let sum = 0;
        let sumSq = 0;

        for (let i = 0; i < closes.length; i++) {
            const v = closes[i];
            sum += v;
            sumSq += v * v;

            if (i >= BB_PERIOD) {
                const old = closes[i - BB_PERIOD];
                sum -= old;
                sumSq -= old * old;
            }

            if (i >= BB_PERIOD - 1) {
                const mean = sum / BB_PERIOD;
                const variance = sumSq / BB_PERIOD - mean * mean;
                const std = Math.sqrt(Math.max(variance, 0));
                const t = candles[i].time;

                middle.push({ time: t, value: mean });
                upper.push({ time: t, value: mean + BB_MULTIPLIER * std });
                lower.push({ time: t, value: mean - BB_MULTIPLIER * std });
            }
        }

        middleSeries.setData(middle);
        upperSeries.setData(upper);
        lowerSeries.setData(lower);
    }, []);

    const scheduleBollinger = useCallback(() => {
        if (!showBollingerRef.current) return;

        const now = Date.now();
        if (now - lastBbAtRef.current < BOLLINGER_THROTTLE_MS) return;
        if (bbRafRef.current !== null) return;

        bbRafRef.current = window.requestAnimationFrame(() => {
            bbRafRef.current = null;
            if (disposedRef.current) return;

            lastBbAtRef.current = Date.now();
            recalcBollinger();
        });
    }, [recalcBollinger]);

    useEffect(() => {
        showBollingerRef.current = showBollinger;
        lastBbAtRef.current = 0;
        recalcBollinger();
    }, [showBollinger, recalcBollinger]);

    // -------------------------
    // Series sync
    // -------------------------
    const syncSeries = useCallback(() => {
        const s = seriesRef.current;
        if (!s) return;

        const useColors = showTrendShortRef.current;

        const bars: CandlestickData[] = useColors
            ? candlesRef.current.map((c) => {
                const color = getCandleColorForTime(c.time);
                return color
                    ? { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, color, borderColor: color, wickColor: color }
                    : { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
            })
            : candlesRef.current.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }));
        s.setData(bars);

        rebuildCandleMaps();
        scheduleRenderSignalSvgs();
    }, [
        getCandleColorForTime,
        rebuildCandleMaps,
        scheduleRenderSignalSvgs,
    ]);

    const appendOrUpdateCandle = useCallback(
        (c: Candle) => {
            const curr = candlesRef.current;
            const last = curr[curr.length - 1];
            let newCandle = false;

            if (!last) {
                candlesRef.current = [c];
                newCandle = true;
            } else if (c.bucket === last.bucket) {
                curr[curr.length - 1] = c;
            } else if (c.bucket > last.bucket) {
                curr.push(c);
                newCandle = true;
            } else {
                // ignore old
                return;
            }

            // if (candlesRef.current.length > TEN_MINUTE_CANDLES_MEMORY) {
            //     candlesRef.current = candlesRef.current.slice(-TEN_MINUTE_CANDLES_MEMORY);
            //     rebuildCandleMaps();
            // } else {
            //     candleByTimeRef.current.set(Number(c.time), c);
            //     bucketToTimeRef.current.set(c.bucket, c.time);
            // }

            const color = getCandleColorForTime(c.time);
            const bar: CandlestickData =
                color && showTrendShortRef.current
                    ? { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, color, borderColor: color, wickColor: color }
                    : { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
            const series = seriesRef.current;
            if (series) {
                const seriesData = series.data();
                if (seriesData.length > 0) {
                    const firstTime = seriesData[0].time;
                    if (Number(c.time) < Number(firstTime)) {
                        syncSeries();
                        return;
                    }
                }
                series.update(bar);
            }

            latestOhlcRef.current = { open: c.open, high: c.high, low: c.low, close: c.close };
            latestLastPriceRef.current = c.close;
            latestLastPriceForSymbolRef.current = currentSymbolRef.current;

            if (newCandle) setLastCandleTime(c.time);

            if (newCandle) {
                scheduleBollinger();
            }

            scheduleRenderSignalSvgs();
        },
        [
            getCandleColorForTime,
            // rebuildCandleMaps,
            scheduleBollinger,
            scheduleRenderSignalSvgs,
            syncSeries,
        ]
    );

    // -------------------------
    // Background bands
    // -------------------------
    const updateBackgroundBands = useCallback(() => {
        const chart = chartRef.current;
        const overlay = overlayRef.current;
        if (!chart || !overlay) return;

        if (!showTrendLongRef.current) {
            overlay.innerHTML = "";
            return;
        }
        if (!candlesRef.current.length) return;

         
        updateBackgroundBandsDOM(chart, overlay, candlesRef.current as any, trendEventsRef.current);
    }, []);

    const scheduleBackgroundBandsUpdate = useCallback(() => {
        if (!chartRef.current) return;
        if (bgRafRef.current !== null) return;

        bgRafRef.current = window.requestAnimationFrame(() => {
            bgRafRef.current = null;
            if (disposedRef.current) return;
            updateBackgroundBands();
        });
    }, [updateBackgroundBands]);

    const forceResize = useCallback(() => {
        if (disposedRef.current) return;
        const el = containerRef.current;
        const chart = chartRef.current;
        if (!el || !chart) return;

        const { clientWidth, clientHeight } = el;
        if (!clientWidth || !clientHeight) return;

        try {
            chart.applyOptions({ width: clientWidth, height: clientHeight });
        } catch {
            return;
        }
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    }, [scheduleBackgroundBandsUpdate, scheduleRenderSignalSvgs]);

    // -------------------------
    // Markers
    // -------------------------
    const takeSnapshot = useCallback(async () => {
        const chart = chartRef.current;
        if (!chart) throw new Error("Chart is not ready");

        // lightweight-charts API
        const canvas = chart.takeScreenshot();
        if (!canvas) throw new Error("Screenshot failed");

        const blob: Blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (!b) reject(new Error("toBlob() failed"));
                else resolve(b);
            }, "image/png");
        });

        return {
            blob,
            width: canvas.width,
            height: canvas.height,
            // optional if you ever want inline preview:
            // dataUrl: canvas.toDataURL("image/png"),
        };
    }, []);

    // Signal arrows are drawn exclusively as custom SVG overlays (renderSignalSvgs).
    // The lightweight-charts createSeriesMarkers layer was removed — running both
    // produced a duplicate/oversized arrow at each signal (abnormal display).

    const candlesWindowMs = useCallback(() => {
        const arr = candlesRef.current;
        if (!arr.length) return null;
        return {
            earliestMs: Number(arr[0].time) * 1000,
            latestMs: Number(arr[arr.length - 1].time) * 1000,
        };
    }, []);

    // -------------------------
    // Events loader (SUPABASE) — must never block candles
    // -------------------------
    const lastTrendSigRef = useRef<string>("");

    const fetchAndApplyEvents = useCallback(async () => {
        if (!hasSymbol) return;
        if (!seriesRef.current) return;
        const win = candlesWindowMs();
        if (!win) return;

        const now = Date.now();
        if (now - lastEventsAtRef.current < EVENTS_REFETCH_THROTTLE_MS) return;
        lastEventsAtRef.current = now;

        const { earliestMs, latestMs } = win;
        const startIso = new Date(earliestMs).toISOString();
        const endIso = new Date(latestMs).toISOString();
        const trendDays = new Date(earliestMs - 1_000_000_000).toISOString();

        const [trendRes, signalRes, cycleRes] = await Promise.all([
            supabase
                .from("trend_events")
                .select("*")
                .eq("symbol", symbol)
                .eq("barinterval", barInterval)
                .gte("ts", trendDays)
                .lte("ts", endIso)
                .order("ts", { ascending: true }),

            supabase
                .from("signal_events")
                .select("*")
                .eq("symbol", symbol)
                .eq("bar_interval", barInterval)
                .gte("timestamp_ms", earliestMs)
                .lte("timestamp_ms", latestMs)
                .order("timestamp_ms", { ascending: true }),

            supabase
                .from("signal_cycles")
                .select(SIGNAL_CYCLE_ENTRY_TIME_SELECT)
                .eq("symbol", symbol)
                .eq("barinterval", barInterval)
                .lte("entry_time", endIso)
                .or(`is_open.eq.true,exit_time.gte.${startIso}`),
        ]);

        const nextTrends = (trendRes.data ?? []) as TrendEvent[];

        const trendLast = nextTrends.length ? ((nextTrends[nextTrends.length - 1] as any).ts ?? "") : "";
        const trendSig = `${nextTrends.length}:${trendLast}`;
        const trendsChanged = trendSig !== lastTrendSigRef.current;

        trendEventsRef.current = nextTrends;

        if (cycleRes.error) {
            console.warn("Failed to load signal cycle entry timestamps:", cycleRes.error);
        }

        let allSignals = withCycleEntryTimestamps(
            (signalRes.data ?? []) as SignalEvent[],
            (cycleRes.data ?? []) as SignalCycleEntryTime[],
        );
        if (options?.signalId) {
            const needle = String(options.signalId);
             
            allSignals = allSignals.filter((s) => String((s as any).id) === needle);
        }
        signalEventsRef.current = allSignals;
        setSignalEvents(allSignals);

        try {
            shortRangesRef.current = buildShortRanges(trendEventsRef.current);
        } catch (e) {
            console.error("events->intervals error:", e);
        }

        renderSignalsRef.current = buildRenderSignals(signalEventsRef.current);

        if (trendsChanged && showTrendShortRef.current) {
            lastTrendSigRef.current = trendSig;
            syncSeries();
        } else if (lastTrendSigRef.current === "") {
            lastTrendSigRef.current = trendSig;
        }

        scheduleBackgroundBandsUpdate();
        scheduleBollinger();
        scheduleRenderSignalSvgs();
    }, [
        symbol,
        hasSymbol,
        candlesWindowMs,
        barInterval,
        options?.signalId,
        scheduleBackgroundBandsUpdate,
        scheduleBollinger,
        syncSeries,
        buildRenderSignals,
        scheduleRenderSignalSvgs,
    ]);

    const scheduleFetchAndApplyEvents = useCallback(() => {
        if (eventsRafRef.current !== null) return;

        eventsRafRef.current = window.requestAnimationFrame(() => {
            eventsRafRef.current = null;
            if (disposedRef.current) return;
            fetchAndApplyEvents().catch(console.error);
        });
    }, [fetchAndApplyEvents]);

    useEffect(() => {
        if (initialLoading) return;
        scheduleFetchAndApplyEvents();
    }, [initialLoading, scheduleFetchAndApplyEvents]);

    useEffect(() => {
        scheduleFetchAndApplyEventsRef.current = scheduleFetchAndApplyEvents;
    }, [scheduleFetchAndApplyEvents]);

    // -------------------------
    // Timeframe
    // -------------------------
    const applyTimeframe = useCallback((tf: TfKey1m | TfKey5m | TfKey10m | TfKey15m, forceToEnd: boolean = false) => {
        const chart = chartRef.current;
        if (!chart) return;
        const total = candlesRef.current.length;
        if (!total) return;

        let desiredBars: number;
        if (barInterval === "1m") {
            desiredBars = TF1M_TO_BARS[tf as TfKey1m];
        } else if (barInterval === "5m") {
            desiredBars = TF5M_TO_BARS[tf as TfKey5m];
        } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
            desiredBars = TF15M_TO_BARS[tf as TfKey15m];
        } else {
            desiredBars = TF10M_TO_BARS[tf as TfKey10m];
        }

        const currentRange = chart.timeScale().getVisibleLogicalRange();
        if (!currentRange || forceToEnd) {
            const to = total - 1;
            const from = Math.max(0, to - desiredBars + 1);
            adjustingRangeRef.current = true;
            chart.timeScale().setVisibleLogicalRange({ from, to });
            adjustingRangeRef.current = false;
        } else {
            const currentCenter = (currentRange.from + currentRange.to) / 2;

            const rightEdge = currentRange.to;
            const isNearEnd = rightEdge >= total - 10;

            let newFrom: number;
            let newTo: number;

            if (isNearEnd) {
                newTo = total - 1;
                newFrom = Math.max(0, newTo - desiredBars + 1);
            } else {
                const halfBars = Math.floor(desiredBars / 2);
                newFrom = Math.max(0, Math.floor(currentCenter - halfBars));
                newTo = Math.min(total - 1, newFrom + desiredBars - 1);

                if (newTo >= total - 1) {
                    newTo = total - 1;
                    newFrom = Math.max(0, newTo - desiredBars + 1);
                } else if (newFrom < 0) {
                    newFrom = 0;
                    newTo = Math.min(total - 1, desiredBars - 1);
                }
            }

            adjustingRangeRef.current = true;
            chart.timeScale().setVisibleLogicalRange({ from: newFrom, to: newTo });
            adjustingRangeRef.current = false;
        }

        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    }, [
        scheduleBackgroundBandsUpdate,
        scheduleRenderSignalSvgs,
        barInterval
    ]);

    const handleZoom = (direction: "in" | "out") => {
        const chart = chartRef.current;
        if (!chart) return;

        const factor = direction === "in" ? 1.2 : 0.8;
        let nextBase = baseBarSpacingRef.current * factor;
        nextBase = Math.max(1, Math.min(nextBase, 60));
        baseBarSpacingRef.current = nextBase;

        applyEffectiveBarSpacing();
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    };

    const handleTimeframeClick = (tf: TfKey1m | TfKey5m | TfKey10m | TfKey15m) => {
        // 사용자가 기간을 직접 골랐으면 딥링크 고정은 더 이상 유효하지 않다.
        deepLinkPinnedRef.current = false;
        setActiveTf(tf);
        applyTimeframe(tf);
    };
    const gotoStart = useCallback(async () => {
        const chart = chartRef.current;
        if (!chart) return;

        let attempts = 0;
        const maxAttempts = 5;
        while (attempts < maxAttempts && loadOlderDataRef.current) {
            const prevLen = candlesRef.current.length;
            await loadOlderDataRef.current();
            const nextLen = candlesRef.current.length;
            if (nextLen === prevLen) break;
            attempts++;
        }

        const total = candlesRef.current.length;
        if (total > 0) {
            let desiredBars: number;
            if (barInterval === "1m") {
                desiredBars = TF1M_TO_BARS[activeTfRef.current as TfKey1m];
            } else if (barInterval === "5m") {
                desiredBars = TF5M_TO_BARS[activeTfRef.current as TfKey5m];
            } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
                desiredBars = TF15M_TO_BARS[activeTfRef.current as TfKey15m];
            } else {
                desiredBars = TF10M_TO_BARS[activeTfRef.current as TfKey10m];
            }
            const from = 0;
            const to = Math.min(total - 1, desiredBars - 1);
            adjustingRangeRef.current = true;
            chart.timeScale().setVisibleLogicalRange({ from, to });
            adjustingRangeRef.current = false;
            scheduleBackgroundBandsUpdate();
            scheduleRenderSignalSvgs();
        }
    }, [
        scheduleBackgroundBandsUpdate,
        barInterval,
        scheduleRenderSignalSvgs
    ]);

    const gotoEnd = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const tf = activeTfRef.current;
        if (barInterval === "1m") {
            if (tf === "2H" || tf === "4H" || tf === "6H" || tf === "12H" || tf === "5D") {
                applyTimeframe(tf as TfKey1m, true);
            } else {
                applyTimeframe("6H", true);
            }
        } else if (barInterval === "5m") {
            if (tf === "6H" || tf === "12H" || tf === "1D" || tf === "3D" || tf === "5D") {
                applyTimeframe(tf as TfKey5m, true);
            } else {
                applyTimeframe("6H", true);
            }
        } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
            if (tf === "6H" || tf === "12H" || tf === "1D" || tf === "3D" || tf === "5D") {
                applyTimeframe(tf as TfKey15m, true);
            } else {
                applyTimeframe("6H", true);
            }
        } else {
            // 10m
            if (tf === "6H" || tf === "12H" || tf === "3D" || tf === "5D" || tf === "7D") {
                applyTimeframe(tf as TfKey10m, true);
            } else {
                const mappedTf: TfKey10m = tf === "1D" ? "12H" : "6H";
                applyTimeframe(mappedTf, true);
            }
        }
    }, [applyTimeframe, barInterval]);

    const pageLeft = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const range = chart.timeScale().getVisibleLogicalRange();
        if (!range) return;

        const pageSize = range.to - range.from;
        const newFrom = Math.max(0, range.from - pageSize);
        const newTo = newFrom + pageSize;

        adjustingRangeRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from: newFrom, to: newTo });
        adjustingRangeRef.current = false;
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    }, [
        scheduleBackgroundBandsUpdate
        , scheduleRenderSignalSvgs
    ]);

    const pageRight = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const range = chart.timeScale().getVisibleLogicalRange();
        if (!range) return;

        const total = candlesRef.current.length;
        const pageSize = range.to - range.from;
        const newTo = Math.min(total - 1, range.to + pageSize);
        const newFrom = Math.max(0, newTo - pageSize);

        adjustingRangeRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from: newFrom, to: newTo });
        adjustingRangeRef.current = false;
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    }, [
        scheduleBackgroundBandsUpdate
        , scheduleRenderSignalSvgs
    ]);


    const setVisibleTimeRange = useCallback(async (fromTime: number, toTime: number) => {
        const chart = chartRef.current;
        if (!chart) return;

        let candles = candlesRef.current;
        if (!candles || candles.length === 0) return;

        const fromTimestamp = Math.floor(fromTime / 1000) as UTCTimestamp;
        const toTimestamp = Math.floor(toTime / 1000) as UTCTimestamp;

        if (!disableAutoLoadOlder) {
            let attempts = 0;
            const barSeconds = Math.max(60, BUCKET_MS / 1000);
            const estimateBatchSize = barInterval === "1m" ? 1500 : barSeconds >= 3600 ? 200 : 400;
            let maxAttempts = 6;
            while (attempts < maxAttempts && loadOlderDataRef.current) {
                candles = candlesRef.current;
                if (!candles.length) return;

                const earliest = Number(candles[0].time);
                const diffSeconds = earliest - Number(fromTimestamp);
                const barsNeeded = diffSeconds > 0 ? Math.ceil(diffSeconds / barSeconds) : 0;
                maxAttempts = Math.min(60, Math.max(6, Math.ceil(barsNeeded / estimateBatchSize) + 2));
                if (fromTimestamp >= earliest) break;

                const prevLen = candles.length;
                attempts += 1;
                await loadOlderDataRef.current();
                if (candlesRef.current.length === prevLen) break;
            }
        }

        candles = candlesRef.current;
        if (!candles.length) return;

        let closestFromIndex = 0;
        let closestToIndex = candles.length - 1;
        let minFromDiff = Infinity;
        let minToDiff = Infinity;

        for (let i = 0; i < candles.length; i++) {
            const candleTime = Number(candles[i].time);
            const fromDiff = Math.abs(candleTime - fromTimestamp);
            const toDiff = Math.abs(candleTime - toTimestamp);

            if (fromDiff < minFromDiff) {
                minFromDiff = fromDiff;
                closestFromIndex = i;
            }
            if (toDiff < minToDiff) {
                minToDiff = toDiff;
                closestToIndex = i;
            }
        }

        const actualFromTime = candles[closestFromIndex].time;
        const actualToTime = candles[closestToIndex].time;

        currentTimeRangeRef.current = {
            fromIndex: closestFromIndex,
            toIndex: closestToIndex,
            attempts: 0
        };

        adjustingRangeRef.current = true;
        chart.timeScale().setVisibleRange({ from: actualFromTime, to: actualToTime });
        adjustingRangeRef.current = false;

        const verifyAndFixRange = () => {
            const pending = currentTimeRangeRef.current;
            if (!pending) return;

            const actualRange = chart.timeScale().getVisibleLogicalRange();
            if (!actualRange) {
                currentTimeRangeRef.current = null;
                return;
            }

            const fromDiff = Math.abs(actualRange.from - pending.fromIndex);
            const toDiff = Math.abs(actualRange.to - pending.toIndex);
            const threshold = 0.5;

            if (fromDiff > threshold || toDiff > threshold) {
                if (pending.attempts < 5) {
                    pending.attempts++;
                    const fromCandle = candlesRef.current[pending.fromIndex];
                    const toCandle = candlesRef.current[pending.toIndex];
                    if (fromCandle && toCandle) {
                        adjustingRangeRef.current = true;
                        chart.timeScale().setVisibleRange({ from: fromCandle.time, to: toCandle.time });
                        adjustingRangeRef.current = false;
                        setTimeout(() => verifyAndFixRange(), 1000);
                    } else {
                        currentTimeRangeRef.current = null;
                    }
                } else {
                    currentTimeRangeRef.current = null;
                }
            } else {
                currentTimeRangeRef.current = null;
            }
        };

        setTimeout(() => verifyAndFixRange(), 1000);
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
        scheduleFetchAndApplyEventsRef.current?.();
    }, [
        scheduleBackgroundBandsUpdate,
        scheduleRenderSignalSvgs,
        barInterval,
        disableAutoLoadOlder,
    ]);

    const bucketMsForInterval = (bi: string) => resolveChartBucketMs(bi);

    function klineToCandle1m(k: Kline, bucketMs: number): Candle {
        const tMs = k[0]; // open time ms
        return {
            bucket: Math.floor(tMs / bucketMs),
            time: Math.floor(tMs / 1000) as UTCTimestamp,
            open: Number(k[1]),
            high: Number(k[2]),
            low: Number(k[3]),
            close: Number(k[4]),
            volume: Number(k[5]),
        };
    }
    function make1mCandleFromMs(args: {
        tMs: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }): Candle {
        const bucket = Math.floor(args.tMs / 60_000);
        return {
            bucket,
            time: Math.floor(args.tMs / 1000) as UTCTimestamp,
            open: args.open,
            high: args.high,
            low: args.low,
            close: args.close,
            volume: args.volume,
        };
    }
    function make5mCandleFromMs(args: {
        tMs: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }): Candle {
        const bucket = Math.floor(args.tMs / 300_000);
        return {
            bucket,
            time: Math.floor(args.tMs / 1000) as UTCTimestamp,
            open: args.open,
            high: args.high,
            low: args.low,
            close: args.close,
            volume: args.volume,
        };
    }
    function makeBucketCandleFromMs(
        args: {
            tMs: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
        },
        bucketMs: number
    ): Candle {
        const bucket = Math.floor(args.tMs / bucketMs);
        return {
            bucket,
            time: Math.floor(args.tMs / 1000) as UTCTimestamp,
            open: args.open,
            high: args.high,
            low: args.low,
            close: args.close,
            volume: args.volume,
        };
    }

    // -------------------------
    // Load older from BINANCE (5m -> 10m)
    // -------------------------
    const loadOlderData = useCallback(async () => {
        if (disableAutoLoadOlder) return;
        if (loadingMoreRef.current) return;

        const chart = chartRef.current;
        const current = candlesRef.current;
        if (!chart || !current.length) return;

        loadingMoreRef.current = true;

        const prevRange = chart.timeScale().getVisibleLogicalRange();
        const prevLen = current.length;
        let older: Candle[] = [];

        try {
            const first = current[0];
            const beforeMs = first.bucket * BUCKET_MS; // bucket start ms (exclusive upper bound)

            if (barInterval === "10m") {
                const older5m = await fetchFuturesKlines5mOlder(symbol, beforeMs, 800);
                if (!older5m.length) return;

                older = aggregate5mTo10m(older5m);
            } else if (barInterval === "1m") {
                const endTime = beforeMs - 1;

                const older1m = await fetchOlder1mKlines(symbol, endTime);
                if (!older1m.length) return;

                older = older1m
                    .filter((k) => k[0] < beforeMs)
                    .map((k) => {
                        const tMs = k[0];
                        return {
                            bucket: Math.floor(tMs / BUCKET_MS),
                            time: Math.floor(tMs / 1000) as UTCTimestamp,
                            open: Number(k[1]),
                            high: Number(k[2]),
                            low: Number(k[3]),
                            close: Number(k[4]),
                            volume: Number(k[5]),
                        } satisfies Candle;
                    });

                older.sort((a, b) => a.bucket - b.bucket);
            } else if (barInterval === "5m") {
                const endTime = beforeMs - 1;

                const older5m = await fetchOlder5mKlines(symbol, endTime);
                if (!older5m.length) return;

                older = older5m
                    .filter((k) => k[0] < beforeMs)
                    .map((k) => {
                        const tMs = k[0];
                        return {
                            bucket: Math.floor(tMs / BUCKET_MS),
                            time: Math.floor(tMs / 1000) as UTCTimestamp,
                            open: Number(k[1]),
                            high: Number(k[2]),
                            low: Number(k[3]),
                            close: Number(k[4]),
                            volume: Number(k[5]),
                        } satisfies Candle;
                    });

                older.sort((a, b) => a.bucket - b.bucket);
            } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
                const lookbackMs =
                    barInterval === "15m"
                        ? 7 * 24 * 60 * 60 * 1000
                        : barInterval === "1h"
                          ? 120 * 24 * 60 * 60 * 1000
                          : barInterval === "4h"
                            ? 365 * 24 * 60 * 60 * 1000
                            : 3 * 365 * 24 * 60 * 60 * 1000;
                const startMs = Math.max(0, beforeMs - lookbackMs);
                const endMs = beforeMs - 1;

                const olderBars = await fetchFuturesKlinesBetween(
                    symbol,
                    barInterval as "15m" | "1h" | "4h" | "1d",
                    startMs,
                    endMs,
                    1000
                );
                if (!olderBars.length) return;

                older = olderBars
                    .filter((k) => k[0] < beforeMs) // strictly older
                    .map((k) => {
                        const tMs = k[0]; // open time ms
                        return {
                            bucket: Math.floor(tMs / BUCKET_MS),
                            time: Math.floor(tMs / 1000) as UTCTimestamp,
                            open: Number(k[1]),
                            high: Number(k[2]),
                            low: Number(k[3]),
                            close: Number(k[4]),
                            volume: Number(k[5]),
                        } satisfies Candle;
                    });

                older.sort((a, b) => a.bucket - b.bucket);
            }

            if (!older.length) return;

            const merged = [...older, ...current];
            const seen = new Set<number>();
            const dedup: Candle[] = [];
            for (const c of merged) {
                if (seen.has(c.bucket)) continue;
                seen.add(c.bucket);
                dedup.push(c);
            }
            dedup.sort((a, b) => a.bucket - b.bucket);

            candlesRef.current = dedup.slice(-maxCandlesMemory);

            priceFormatRef.current = computePriceFormatFromCandles(candlesRef.current);
            applyPriceFormatToSeries();

            syncSeries();
            scheduleBollinger();
            scheduleFetchAndApplyEventsRef.current?.();

            const nextLen = candlesRef.current.length;
            const added = nextLen - prevLen;
            if (prevRange && added > 0) {
                adjustingRangeRef.current = true;
                chart.timeScale().setVisibleLogicalRange({
                    from: prevRange.from + added,
                    to: prevRange.to + added,
                });
                adjustingRangeRef.current = false;
            }
        } catch (e) {
            console.error("Older load exception:", e);
        } finally {
            loadingMoreRef.current = false;
        }
    }, [
        symbol,
        barInterval,
        applyPriceFormatToSeries,
        BUCKET_MS,
        maxCandlesMemory,
        scheduleBollinger,
        syncSeries,
        disableAutoLoadOlder,
    ]);

    useEffect(() => {
        loadOlderDataRef.current = disableAutoLoadOlder ? null : loadOlderData;
    }, [disableAutoLoadOlder, loadOlderData]);

    const gotoDate = useCallback(async (date: Date) => {
        const chart = chartRef.current;
        if (!chart) return;

        const targetTime = Math.floor(date.getTime() / 1000) as UTCTimestamp;
        let attempts = 0;
        const maxAttempts = 6;

        while (attempts < maxAttempts && loadOlderDataRef.current) {
            const candles = candlesRef.current;
            if (!candles.length) return;

            const earliest = Number(candles[0].time);
            const latest = Number(candles[candles.length - 1].time);

            if (targetTime >= earliest && targetTime <= latest) break;
            if (targetTime < earliest) {
                attempts += 1;
                await loadOlderDataRef.current();
                continue;
            }
            break;
        }

        const candles = candlesRef.current;
        if (!candles.length) return;

        let closestIndex = 0;
        let minDiff = Infinity;
        for (let i = 0; i < candles.length; i++) {
            const diff = Math.abs(Number(candles[i].time) - Number(targetTime));
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        let desiredBars: number;
        if (barInterval === "1m") {
            desiredBars = TF1M_TO_BARS[activeTfRef.current as TfKey1m];
        } else if (barInterval === "5m") {
            desiredBars = TF5M_TO_BARS[activeTfRef.current as TfKey5m];
        } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
            desiredBars = TF15M_TO_BARS[activeTfRef.current as TfKey15m];
        } else {
            desiredBars = TF10M_TO_BARS[activeTfRef.current as TfKey10m] ?? TF10M_TO_BARS["6H"];
        }
        const halfBars = Math.floor(desiredBars / 2);
        const from = Math.max(0, closestIndex - halfBars);
        const to = Math.min(candles.length - 1, from + desiredBars - 1);

        adjustingRangeRef.current = true;
        chart.timeScale().setVisibleLogicalRange({ from, to });
        adjustingRangeRef.current = false;
        scheduleBackgroundBandsUpdate();
        scheduleRenderSignalSvgs();
    }, [
        barInterval,
        scheduleBackgroundBandsUpdate,
        scheduleRenderSignalSvgs,
    ]);


    // -------------------------
    // Theme sync — 라이트/다크 전환 시 차트 텍스트·그리드 색을 다시 적용한다.
    // (차트 생성 effect는 [symbol, barInterval]로만 돌기 때문에 여기서 별도 처리)
    // -------------------------
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const { textColor, gridColor } = resolveChartThemeColors(theme);
        try {
            chart.applyOptions({
                layout: { textColor },
                grid: {
                    vertLines: { color: gridColor },
                    horzLines: { color: gridColor },
                },
            });
        } catch {
            /* chart already disposed */
        }
    }, [theme, chartReady]);

    // -------------------------
    // React toggle effects
    // -------------------------
    useEffect(() => {
        if (!seriesRef.current) return;
        syncSeries();
        scheduleRenderSignalSvgs();
    }, [
        showTrendShort,
        syncSeries,
        scheduleRenderSignalSvgs
    ]);

    useEffect(() => {
        scheduleBackgroundBandsUpdate();
    }, [showTrendLong, scheduleBackgroundBandsUpdate]);

    const currentSymbolRef = useRef(symbol);
    useEffect(() => {
        currentSymbolRef.current = symbol;
    }, [symbol]);


    // -------------------------
    // Chart init + BINANCE load + WS 5m
    // -------------------------
    useEffect(() => {
        if (!hasSymbol) {
            chartBootstrapGenRef.current += 1;
            disposedRef.current = true;
            setInitialLoading(false);
            setChartReady(false);
            setOhlc(null);
            setHoverOhlc(null);
            setLastPrice(null);
            setLastPriceSymbol(null);
            setLastCandleTime(null);
            setSignalEvents([]);
            candlesRef.current = [];
            trendEventsRef.current = [];
            signalEventsRef.current = [];
            shortRangesRef.current = [];
            return;
        }
        if (!containerRef.current) return;

        const bootGen = ++chartBootstrapGenRef.current;

        disposedRef.current = false;
        setInitialLoading(true);
        setChartReady(false);
        setHoverOhlc(null);

        const bootThemeColors = resolveChartThemeColors(themeRef.current);
        const chart = createChart(containerRef.current, {
            layout: { background: { color: "#00000000" }, textColor: bootThemeColors.textColor },
            grid: {
                vertLines: { color: bootThemeColors.gridColor },
                horzLines: { color: bootThemeColors.gridColor },
            },
            rightPriceScale: { borderVisible: false },
            timeScale: {
                borderVisible: false,
                barSpacing: 0.5,
                minBarSpacing: 0.05,
                rightOffset: 0,
                timeVisible: true,
                secondsVisible: false,
                tickMarkFormatter: (time: UTCTimestamp, _t: TickMarkType, locale: string) => {
                    const d = new Date(time * 1000);
                    return d.toLocaleString(locale, {
                        hour12: false,
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                },
            },
            crosshair: {
                mode: 0,
                vertLine: { visible: true, labelVisible: true },
                horzLine: { visible: true, labelVisible: true },
            },
            localization: {
                timeFormatter: (t: UTCTimestamp) => {
                    const d = new Date(Number(t) * 1000);
                    return d.toLocaleString(undefined, {
                        hour12: false,
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                },
            },
        });

        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderUpColor: "#26a69a",
            borderDownColor: "#ef5350",
            wickUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            priceFormat: {
                type: "price",
                precision: priceFormatRef.current.precision,
                minMove: priceFormatRef.current.minMove,
            },
        }) as MarkerCandlestickSeriesApi;

        mockTradeLineRef.current = chart.addSeries(LineSeries, {
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            priceFormat: {
                type: "price",
                precision: priceFormatRef.current.precision,
                minMove: priceFormatRef.current.minMove,
            },
        });

        const bbCommon = {
            color: "#60a5fa",
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
        } as const;

        const bbFmt = {
            type: "price" as const,
            precision: priceFormatRef.current.precision,
            minMove: priceFormatRef.current.minMove,
        };

        bbMiddleRef.current = chart.addSeries(LineSeries, { ...bbCommon, lineStyle: 0, priceFormat: bbFmt });
        bbUpperRef.current = chart.addSeries(LineSeries, { ...bbCommon, lineStyle: 2, priceFormat: bbFmt });
        bbLowerRef.current = chart.addSeries(LineSeries, { ...bbCommon, lineStyle: 2, priceFormat: bbFmt });

        chartRef.current = chart;
        seriesRef.current = series;

        // reset
        candlesRef.current = [];
        candleByTimeRef.current = new Map();
        bucketToTimeRef.current = new Map();

        trendEventsRef.current = [];
        signalEventsRef.current = [];
        setSignalEvents([]);
        shortRangesRef.current = [];

        latestOhlcRef.current = null;
        latestLastPriceRef.current = null;
        latestLastPriceForSymbolRef.current = null;
        renderSignalsRef.current = [];

        lastTrendSigRef.current = "";

        lastLoadOlderAtRef.current = 0;
        lastLoadOlderFirstBucketRef.current = null;

        series.setData([]);
        mockTradeLineRef.current?.setData([]);
        bbMiddleRef.current?.setData([]);
        bbUpperRef.current?.setData([]);
        bbLowerRef.current?.setData([]);

        if (overlayRef.current) overlayRef.current.innerHTML = "";
        if (signalSvgOverlayRef.current) signalSvgOverlayRef.current.innerHTML = "";
        if (mockTradeSvgOverlayRef.current) mockTradeSvgOverlayRef.current.innerHTML = "";
        mockTradePointsRef.current = { fills: [], direction: "long" };

        setOhlc(null);
        setHoverOhlc(null);
        setLastPrice(null);
        setLastPriceSymbol(null);
        setLastCandleTime(null);

        baseBarSpacingRef.current = 8;
        effectiveBarSpacingRef.current = 8;

        let cancelled = false;

         
        const handleCrosshairMove = (param: any) => {
            if (!param || !param.time) {
                setHoverOhlc(null);
                return;
            }
            const t = param.time as UTCTimestamp;
            const candle = candleByTimeRef.current.get(Number(t)) ?? null;
            setHoverOhlc(candle ? { open: candle.open, high: candle.high, low: candle.low, close: candle.close } : null);
            scheduleRenderSignalSvgs();
        };
        chart.subscribeCrosshairMove(handleCrosshairMove);

        // INITIAL LOAD: BINANCE history (snapshot range or 8D buffer)
        (async () => {
            try {
                const stale = () => cancelled || bootGen !== chartBootstrapGenRef.current;

                const useSnapshotRange =
                    snapshotRangeMs &&
                    Number.isFinite(snapshotRangeMs.startMs) &&
                    Number.isFinite(snapshotRangeMs.endMs) &&
                    snapshotRangeMs.startMs < snapshotRangeMs.endMs;

                // 딥링크 구간으로 들어왔으면 사용자가 직접 조작할 때까지 카메라를 고정한다.
                deepLinkPinnedRef.current = !!useSnapshotRange;

                 
                const endMs = useSnapshotRange ? snapshotRangeMs!.endMs : Date.now();
                 
                const startMs = useSnapshotRange ? snapshotRangeMs!.startMs : endMs - 8 * 24 * 60 * 60 * 1000;

                const bucketMs = bucketMsForInterval(barInterval);

                let loaded: Candle[] = [];

                if (barInterval === "10m") {
                    // ✅ Load 5m and aggregate -> 10m
                    const klines5m = await fetchFuturesKlinesBetween(symbol, "5m", startMs, endMs, 1000);
                    if (stale()) return;
                    if (symbol !== currentSymbolRef.current) return;

                    loaded = aggregate5mTo10m(klines5m); // must produce Candle[] with 10m buckets
                } else if (barInterval === "1m") {
                    const klines1m = await fetchFuturesKlinesBetween(symbol, "1m", startMs, endMs, 1000);
                    if (stale()) return;
                    if (symbol !== currentSymbolRef.current) return;

                    loaded = klines1m.map((k) => klineToCandle1m(k, bucketMs));
                    loaded.sort((a, b) => a.bucket - b.bucket);
                } else if (barInterval === "5m") {
                    const klines5m = await fetchFuturesKlinesBetween(symbol, "5m", startMs, endMs, 1000);
                    if (stale()) return;
                    if (symbol !== currentSymbolRef.current) return;

                    loaded = klines5m.map((k) => klineToCandle1m(k, bucketMs));
                    loaded.sort((a, b) => a.bucket - b.bucket);
                } else if (barInterval === "15m") {
                    const klines15m = await fetchFuturesKlinesBetween(symbol, "15m", startMs, endMs, 1000);
                    if (stale()) return;
                    if (symbol !== currentSymbolRef.current) return;

                    loaded = klines15m.map((k) => klineToCandle1m(k, bucketMs));
                    loaded.sort((a, b) => a.bucket - b.bucket);
                } else if (barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
                    const klinesH = await fetchFuturesKlinesBetween(
                        symbol,
                        barInterval,
                        startMs,
                        endMs,
                        1000
                    );
                    if (stale()) return;
                    if (symbol !== currentSymbolRef.current) return;

                    loaded = klinesH.map((k) => klineToCandle1m(k, bucketMs));
                    loaded.sort((a, b) => a.bucket - b.bucket);
                }

                if (stale()) return;

                candlesRef.current = useSnapshotRange ? loaded : loaded.slice(-maxCandlesMemory);

                priceFormatRef.current = computePriceFormatFromCandles(candlesRef.current);
                applyPriceFormatToSeries();

                syncSeries();
                scheduleBollinger();
                setChartReady(candlesRef.current.length > 0);

                const last = candlesRef.current[candlesRef.current.length - 1];
                if (last) {
                    latestOhlcRef.current = { open: last.open, high: last.high, low: last.low, close: last.close };
                    latestLastPriceRef.current = last.close;
                    latestLastPriceForSymbolRef.current = symbol;
                    setLastCandleTime(last.time);
                    scheduleUiStateSync();

                    if (!useSnapshotRange) {
                        setActiveTf("6H");
                        activeTfRef.current = "6H";
                        // 이전에 이 종목·간격으로 보고 있던 뷰포트가 있으면 최신 봉으로
                        // 강제 이동하지 않고 그 구간을 복원한다.
                        const persistedViewport = readChartViewport(barInterval, symbol);
                        if (persistedViewport) {
                            void setVisibleTimeRange(persistedViewport.fromMs, persistedViewport.toMs);
                        } else {
                            applyTimeframe("6H", true);
                        }
                    }
                }
            } catch (e) {
                console.error("BINANCE init/backfill exception:", e);
            } finally {
                if (!cancelled && bootGen === chartBootstrapGenRef.current) setInitialLoading(false);
            }
        })();


        // choose WS stream based on barInterval (Binance futures continuous kline stream)
        // Binance Futures does NOT expose a native 10m kline — subscribe to 5m and aggregate.
        const wsStream =
            barInterval === "10m"
                ? `${symbol.toLowerCase()}@kline_5m`
                : `${symbol.toLowerCase()}@kline_${barInterval}`;

        // Binance Futures WebSocket — env override via NEXT_PUBLIC_BINANCE_FUTURES_WS_URL
        const wsBase = (
            process.env.NEXT_PUBLIC_BINANCE_FUTURES_WS_URL ||
            'wss://fstream.binance.com'
        ).replace(/\/+$/, '');
        const wsUrl = `${wsBase}/ws/${wsStream}`;

        let ws: WebSocket | null = null;
        let wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let wsReconnectAttempt = 0;
        const WS_RECONNECT_MAX_DELAY_MS = 15_000;

        // 네트워크 순단/서버 측 ping 타임아웃 등으로 소켓이 끊기면 재연결 없이는
        // 실시간 가격(lastPrice)이 영구히 멈춰, 모의매매 평가손익이 계속 비어 보이는
        // 원인이 되었다 — onclose에서 지수 백오프로 재연결한다.
        const connectWs = () => {
            if (disableRealtime || cancelled || disposedRef.current || bootGen !== chartBootstrapGenRef.current) {
                return;
            }

            const socket = new WebSocket(wsUrl);
            ws = socket;
            const subscribedUpper = symbol.toUpperCase();

            socket.onopen = () => {
                wsReconnectAttempt = 0;
            };

            socket.onmessage = (ev) => {
            try {
                if (disposedRef.current || bootGen !== chartBootstrapGenRef.current) return;
                const msg = JSON.parse(ev.data);
                const evtSym = wsKlineEventSymbol(msg);
                if (evtSym && evtSym !== subscribedUpper) return;

                // -------------------------
                // 1m chart: use kline_1m directly
                // -------------------------
                if (barInterval === "1m") {
                    const m1 = wsKlineTo1mNums(msg);
                    if (!m1) return;

                    const bucket = Math.floor(m1.openTimeMs / 60_000); // 1m buckets
                    const curr = candlesRef.current;
                    const last = curr[curr.length - 1];



                    const candleTimeMs = bucket * 60_000;

                    if (!last) {
                        appendOrUpdateCandle(
                            make1mCandleFromMs({
                                tMs: candleTimeMs,
                                open: m1.open,
                                high: m1.high,
                                low: m1.low,
                                close: m1.close,
                                volume: m1.volume,
                            })
                        );
                        scheduleUiStateSync();
                        return;
                    }

                    if (bucket === last.bucket) {
                        // update current 1m candle
                        appendOrUpdateCandle(
                            make1mCandleFromMs({
                                tMs: candleTimeMs,
                                open: last.open, // keep open stable
                                high: Math.max(last.high, m1.high),
                                low: Math.min(last.low, m1.low),
                                close: m1.close,
                                volume: last.volume + m1.volume,
                            })
                        );
                    } else if (bucket > last.bucket) {
                        // new 1m candle; open = last close for smoothness
                        appendOrUpdateCandle(
                            make1mCandleFromMs({
                                tMs: candleTimeMs,
                                open: last.close,
                                high: m1.high,
                                low: m1.low,
                                close: m1.close,
                                volume: m1.volume,
                            })
                        );
                    }

                    scheduleUiStateSync();
                    return;
                }

                // -------------------------
                // 10m chart: aggregate from 5m WS into 10m
                // -------------------------
                if (barInterval === "10m") {
                    const m5 = wsKlineTo5mNums(msg);
                    if (!m5) return;

                    const bucket = Math.floor(m5.openTimeMs / BUCKET_MS); // BUCKET_MS = 600_000 for 10m
                    const curr = candlesRef.current;
                    const last = curr[curr.length - 1];

                    // optional stability: only process on close
                    // if (!m5.isClosed) return;

                    const bucketStartMs = bucket * BUCKET_MS;

                    if (!last) {
                        appendOrUpdateCandle(
                            make10mCandleFromMs({
                                tMs: bucketStartMs,
                                open: m5.open,
                                high: m5.high,
                                low: m5.low,
                                close: m5.close,
                                volume: m5.volume,
                            })
                        );
                        scheduleUiStateSync();
                        return;
                    }

                    if (bucket === last.bucket) {
                        const merged = merge5mInto10m(last, m5);
                        if (merged) appendOrUpdateCandle(merged);
                    } else if (bucket > last.bucket) {
                        // new 10m candle: open = last close
                        appendOrUpdateCandle(
                            make10mCandleFromMs({
                                tMs: bucketStartMs,
                                open: last.close,
                                high: m5.high,
                                low: m5.low,
                                close: m5.close,
                                volume: m5.volume,
                            })
                        );
                    }

                    scheduleUiStateSync();
                    return;
                }

                // -------------------------
                // 5m chart: use kline_5m directly
                // -------------------------
                if (barInterval === "5m") {
                    const m5 = wsKlineTo5mNums(msg);
                    if (!m5) return;

                    const bucket = Math.floor(m5.openTimeMs / BUCKET_MS); // BUCKET_MS = 300_000 for 5m
                    const curr = candlesRef.current;
                    const last = curr[curr.length - 1];

                    const candleTimeMs = bucket * BUCKET_MS;

                    if (!last) {
                        appendOrUpdateCandle(
                            make5mCandleFromMs({
                                tMs: candleTimeMs,
                                open: m5.open,
                                high: m5.high,
                                low: m5.low,
                                close: m5.close,
                                volume: m5.volume,
                            })
                        );
                        scheduleUiStateSync();
                        return;
                    }

                    if (bucket === last.bucket) {
                        // update current 5m candle
                        appendOrUpdateCandle(
                            make5mCandleFromMs({
                                tMs: candleTimeMs,
                                open: last.open, // keep open stable
                                high: Math.max(last.high, m5.high),
                                low: Math.min(last.low, m5.low),
                                close: m5.close,
                                volume: last.volume + m5.volume,
                            })
                        );
                    } else if (bucket > last.bucket) {
                        // new 5m candle; open = last close for smoothness
                        appendOrUpdateCandle(
                            make5mCandleFromMs({
                                tMs: candleTimeMs,
                                open: last.close,
                                high: m5.high,
                                low: m5.low,
                                close: m5.close,
                                volume: m5.volume,
                            })
                        );
                    }

                    scheduleUiStateSync();
                    return;
                }

                // -------------------------
                // 15m / 1h / 4h / 1d: Binance kline WS (same message shape)
                // -------------------------
                if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
                    const mk = wsKlineTo15mNums(msg);
                    if (!mk) return;

                    const bucket = Math.floor(mk.openTimeMs / BUCKET_MS);
                    const curr = candlesRef.current;
                    const last = curr[curr.length - 1];

                    const candleTimeMs = bucket * BUCKET_MS;

                    if (!last) {
                        appendOrUpdateCandle(
                            makeBucketCandleFromMs(
                                {
                                    tMs: candleTimeMs,
                                    open: mk.open,
                                    high: mk.high,
                                    low: mk.low,
                                    close: mk.close,
                                    volume: mk.volume,
                                },
                                BUCKET_MS
                            )
                        );
                        scheduleUiStateSync();
                        return;
                    }

                    if (bucket === last.bucket) {
                        appendOrUpdateCandle(
                            makeBucketCandleFromMs(
                                {
                                    tMs: candleTimeMs,
                                    open: last.open,
                                    high: Math.max(last.high, mk.high),
                                    low: Math.min(last.low, mk.low),
                                    close: mk.close,
                                    volume: last.volume + mk.volume,
                                },
                                BUCKET_MS
                            )
                        );
                    } else if (bucket > last.bucket) {
                        appendOrUpdateCandle(
                            makeBucketCandleFromMs(
                                {
                                    tMs: candleTimeMs,
                                    open: last.close,
                                    high: mk.high,
                                    low: mk.low,
                                    close: mk.close,
                                    volume: mk.volume,
                                },
                                BUCKET_MS
                            )
                        );
                    }

                    scheduleUiStateSync();
                    return;
                }
            } catch (e) {
                console.error("WS parse error:", e);
            }
            };

            socket.onerror = (e) => console.error("WS error:", e);

            socket.onclose = () => {
                if (cancelled || disposedRef.current || bootGen !== chartBootstrapGenRef.current) return;
                wsReconnectAttempt += 1;
                const delay = Math.min(1000 * 2 ** (wsReconnectAttempt - 1), WS_RECONNECT_MAX_DELAY_MS);
                wsReconnectTimer = setTimeout(connectWs, delay);
            };
        };

        if (!disableRealtime) {
            connectWs();
        }


        const handleRangeChange = (range: LogicalRange | null) => {
            if (!range || adjustingRangeRef.current || disposedRef.current) return;
            if (currentTimeRangeRef.current) return;
            const total = candlesRef.current.length;
            if (!total) return;

            const from = range.from;
            const to = range.to;
            const visibleCount = to - from + 1;

            if (!disableAutoLoadOlder) {
                // older-load guard
                const firstBucket = candlesRef.current[0]?.bucket ?? null;
                const now = Date.now();

                const canTryOlder =
                    !loadingMoreRef.current &&
                    firstBucket !== null &&
                    firstBucket !== lastLoadOlderFirstBucketRef.current &&
                    now - lastLoadOlderAtRef.current > 800;

                if (from < LOAD_OLDER_LEFT_GUARD && canTryOlder && !deepLinkPinnedRef.current) {
                    lastLoadOlderAtRef.current = now;
                    lastLoadOlderFirstBucketRef.current = firstBucket;
                    loadOlderData();
                }

                // clamp by timeframe
                let tfBars: number;
                if (barInterval === "1m") {
                    tfBars = TF1M_TO_BARS[activeTfRef.current as TfKey1m];
                } else if (barInterval === "5m") {
                    tfBars = TF5M_TO_BARS[activeTfRef.current as TfKey5m];
                } else if (barInterval === "15m" || barInterval === "1h" || barInterval === "4h" || barInterval === "1d") {
                    tfBars = TF15M_TO_BARS[activeTfRef.current as TfKey15m];
                } else {
                    tfBars = TF10M_TO_BARS[activeTfRef.current as TfKey10m] ?? TF10M_TO_BARS["6H"];
                }
                const memMax = resolveMaxCandles(barInterval);
                const hardMax =
                    barInterval === "1m"
                        ? Math.max(MAX_1M_BARS, tfBars)
                        : barInterval === "5m"
                          ? Math.max(MAX_5M_BARS, tfBars)
                          : barInterval === "15m"
                            ? Math.max(MAX_15M_BARS, tfBars)
                            : barInterval === "1h" || barInterval === "4h" || barInterval === "1d"
                              ? Math.max(memMax, tfBars)
                              : Math.max(MAX_10M_BARS, tfBars);

                if (visibleCount > hardMax) {
                    const newFrom = to - (hardMax - 1);
                    adjustingRangeRef.current = true;
                    chart.timeScale().setVisibleLogicalRange({ from: newFrom, to });
                    adjustingRangeRef.current = false;
                }
            }

            scheduleBackgroundBandsUpdate();
            scheduleFetchAndApplyEvents();
            scheduleRenderSignalSvgs();
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

        const handleTimeRangeChange = () => {
            scheduleRenderSignalSvgs();

            // 프로그래밍 방식으로 뷰포트를 맞추는 중(초기 복원 등)에는 그 과도기 상태를
            // 저장하지 않는다 — 사용자가 실제로 스크롤/줌한 뷰포트만 기억한다.
            if (adjustingRangeRef.current || currentTimeRangeRef.current || disposedRef.current) return;

            if (viewportPersistTimerRef.current) clearTimeout(viewportPersistTimerRef.current);
            viewportPersistTimerRef.current = setTimeout(() => {
                if (disposedRef.current) return;
                const visible = chart.timeScale().getVisibleRange();
                if (!visible) return;
                writeChartViewport(barInterval, symbol, {
                    fromMs: Number(visible.from) * 1000,
                    toMs: Number(visible.to) * 1000,
                });
            }, 500);
        };
        chart.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);

        let lastPriceRange: { min: number; max: number } | null = null;
        const checkPriceScaleChange = () => {
            if (disposedRef.current) return;

            try {
                const priceScale = series.priceScale();
                const visibleRange = priceScale.getVisibleRange();
                if (visibleRange) {
                    const currentRange = { min: visibleRange.from, max: visibleRange.to };
                    if (lastPriceRange &&
                        (lastPriceRange.min !== currentRange.min || lastPriceRange.max !== currentRange.max)) {
                        scheduleRenderSignalSvgs();
                    }
                    lastPriceRange = currentRange;
                }
            } catch {
                // Price scale change detection error is non-critical
            }

            if (!disposedRef.current) {
                requestAnimationFrame(checkPriceScaleChange);
            }
        };
        requestAnimationFrame(checkPriceScaleChange);

        // 레이아웃(flex 높이)이 한 프레임 늦게 잡히면 createChart 시점에 높이 0 → 이후 resize가 스킵될 수 있음
        const postLayoutResizeGen = bootGen;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (disposedRef.current || chartBootstrapGenRef.current !== postLayoutResizeGen) return;
                forceResize();
            });
        });

        const resizeObserver = new ResizeObserver(() => forceResize());
        resizeObserver.observe(containerRef.current);

        // 사용자가 직접 차트를 만지면(휠 줌·드래그 스크롤·터치) 딥링크 고정을 풀어
        // 평소처럼 과거 데이터를 이어서 불러올 수 있게 한다.
        const releaseDeepLinkPin = () => {
            deepLinkPinnedRef.current = false;
        };
        const pinReleaseTarget = containerRef.current;
        pinReleaseTarget.addEventListener("wheel", releaseDeepLinkPin, { passive: true });
        pinReleaseTarget.addEventListener("pointerdown", releaseDeepLinkPin);
        pinReleaseTarget.addEventListener("touchstart", releaseDeepLinkPin, { passive: true });

        return () => {
            resizeObserver.disconnect();
            pinReleaseTarget.removeEventListener("wheel", releaseDeepLinkPin);
            pinReleaseTarget.removeEventListener("pointerdown", releaseDeepLinkPin);
            pinReleaseTarget.removeEventListener("touchstart", releaseDeepLinkPin);
            cancelled = true;
            disposedRef.current = true;
            chartRef.current = null;

            if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
            ws?.close();

            chart.unsubscribeCrosshairMove(handleCrosshairMove);
            chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
            chart.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
            if (viewportPersistTimerRef.current) clearTimeout(viewportPersistTimerRef.current);

            if (bbRafRef.current !== null) cancelAnimationFrame(bbRafRef.current);
            if (eventsRafRef.current !== null) cancelAnimationFrame(eventsRafRef.current);
            if (uiRafRef.current !== null) cancelAnimationFrame(uiRafRef.current);
            if (bgRafRef.current !== null) cancelAnimationFrame(bgRafRef.current);
            if (renderSignalsRafRef.current !== null) cancelAnimationFrame(renderSignalsRafRef.current);

            clearOverlayPriceLines();
            chart.remove();

            if (signalSvgOverlayRef.current) signalSvgOverlayRef.current.innerHTML = "";
            if (mockTradeSvgOverlayRef.current) mockTradeSvgOverlayRef.current.innerHTML = "";
        };

    }, [
        symbol,
        hasSymbol,
        applyPriceFormatToSeries,
        applyTimeframe,
        appendOrUpdateCandle,
        fetchAndApplyEvents,
        loadOlderData,
        scheduleBackgroundBandsUpdate,
        scheduleBollinger,
        scheduleFetchAndApplyEvents,
        scheduleUiStateSync,
        BUCKET_MS,
        barInterval,
        syncSeries,
        scheduleRenderSignalSvgs,
        snapshotRangeMs,
        disableAutoLoadOlder,
        disableRealtime,
    ]);

    // -------------------------
    // Supabase realtime subscriptions (EVENTS ONLY) — ordering FIXED
    // -------------------------
    useEffect(() => {
        if (!hasSymbol) return;
        const trendChannel = supabase
            .channel(`trend_events_${symbol}_${barInterval}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "trend_events", filter: `symbol=eq.${symbol}` },
                (payload) => {
                    const row = payload.new as TrendEvent;
                     
                    if ((row as any).barinterval && (row as any).barinterval !== barInterval) return;

                    // FIX: keep ascending by ts
                    trendEventsRef.current = [...trendEventsRef.current, row].sort(
                         
                        (a: any, b: any) => new Date(a.ts).getTime() - new Date(b.ts).getTime()
                    );

                    try {
                        shortRangesRef.current = buildShortRanges(trendEventsRef.current);
                    } catch (e) {
                        console.error("trend INSERT -> rebuild error:", e);
                    }

                    if (showTrendShortRef.current) syncSeries();

                    scheduleBackgroundBandsUpdate();
                    scheduleBollinger();
                    scheduleRenderSignalSvgs();
                }
            )
            .subscribe();

        const signalChannel = supabase
            .channel(`signal_events_${symbol}_${barInterval}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "signal_events", filter: `symbol=eq.${symbol}` },
                async (payload) => {
                    const row = payload.new as SignalEvent;
                    if (isBatchUploadRealtimeRow(row)) return;
                    if ((row as any).bar_interval && (row as any).bar_interval !== barInterval) return;

                    let signalWithEntryTimestamp = row;
                    const tradingCategory = typeof row.trading_category === "string"
                        ? row.trading_category.trim()
                        : "";
                    const cycleId = typeof row.cycle_id === "string" ? row.cycle_id.trim() : "";
                    if (tradingCategory && cycleId) {
                        const { data: cycle, error } = await supabase
                            .from("signal_cycles")
                            .select(SIGNAL_CYCLE_ENTRY_TIME_SELECT)
                            .eq("symbol", symbol)
                            .eq("barinterval", barInterval)
                            .eq("trading_category", tradingCategory)
                            .eq("cycle_id", cycleId)
                            .order("entry_time", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (error) {
                            console.warn("Failed to load realtime signal cycle entry timestamp:", error);
                        } else if (cycle) {
                            signalWithEntryTimestamp = withCycleEntryTimestamps(
                                [row],
                                [cycle as SignalCycleEntryTime],
                            )[0];
                        }
                    }

                    // FIX: keep ascending by timestamp_ms
                    signalEventsRef.current = [...signalEventsRef.current, signalWithEntryTimestamp].sort(
                         
                        (a: any, b: any) => Number((a as any).timestamp_ms) - Number((b as any).timestamp_ms)
                    );
                    setSignalEvents(signalEventsRef.current);

                    const win = candlesWindowMs();
                    let eventsForMarkers = signalEventsRef.current;
                    if (win) {
                        eventsForMarkers = eventsForMarkers.filter((s) => {
                             
                            const t = Number((s as any).timestamp_ms);
                            return t >= win.earliestMs && t <= win.latestMs;
                        });
                    }
                    if (options?.signalId) {
                        const needle = String(options.signalId);
                         
                        eventsForMarkers = eventsForMarkers.filter((s) => String((s as any).id) === needle);
                    }

                    renderSignalsRef.current = buildRenderSignals(eventsForMarkers);
                    scheduleRenderSignalSvgs();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(trendChannel);
            supabase.removeChannel(signalChannel);
        };
    }, [
        symbol,
        hasSymbol,
        barInterval,
        candlesWindowMs,
        options?.signalId,
        scheduleBackgroundBandsUpdate,
        scheduleBollinger,
        syncSeries,
        scheduleRenderSignalSvgs,
        buildRenderSignals,

    ]);

    const displayOhlc = hoverOhlc ?? ohlc;

    return {
        refs: {
            containerRef,
            overlayRef,
            volIndicatorRef,
            signalSvgOverlayRef,
            mockTradeSvgOverlayRef
        },
        state: {
            activeTf,
            ohlc: displayOhlc,
            initialLoading,
            showBollinger,
            lastPrice,
            lastPriceSymbol,
            lastCandleTime,
            chartReady,
            showTrendShort,
            showTrendLong,
            signalEvents,
        },
        actions: {
            setShowBollinger,
            handleZoom,
            handleTimeframeClick,
            forceResize,
            setShowTrendShort,
            setShowTrendLong,
            setMockTradeOverlay,
            clearMockTradeOverlay,
            setOverlayPriceLines,
            clearOverlayPriceLines,
            gotoStart,
            gotoEnd,
            pageLeft,
            pageRight,
            gotoDate,
            setVisibleTimeRange,
            takeSnapshot
        },
    };
}
