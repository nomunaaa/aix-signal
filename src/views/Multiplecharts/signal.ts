// src/pages/Multiplecharts/signal.ts
import { UTCTimestamp } from "lightweight-charts";
import {
  longBgColorFromValue,
  shortCandleColorFromValue,
} from "@/chart/chartConfig";
import { BUCKET_MS_10M } from "./constants";
import { Candle10m, MarkerCandlestickSeriesApi, ShortRange, SignalEvent, TrendEvent, VolatilityEvent } from "./types";

export function buildShortRanges(events: TrendEvent[]): ShortRange[] {
  const shorts = events
    .filter((e) => e.type === "trend_short" && e.value !== undefined)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  if (!shorts.length) return [];

  const ranges: ShortRange[] = [];

  for (let i = 0; i < shorts.length; i++) {
    const sig = shorts[i];
    const next = shorts[i + 1];

    const startMs = new Date(sig.ts).getTime();
    const endMs = next ? new Date(next.ts).getTime() : Number.POSITIVE_INFINITY;

    ranges.push({
      startMs,
      endMs,
       
      color: shortCandleColorFromValue(sig.value!),
    });
  }

  return ranges;
}

export function applyMarkers(
  series: MarkerCandlestickSeriesApi | null,
  candles: Candle10m[],
  trends: TrendEvent[],
  signals: SignalEvent[],
  vols: VolatilityEvent[]
) {
  if (!series) return;

  const markers: Parameters<MarkerCandlestickSeriesApi["setMarkers"]>[0] = [];

  // helper: snap raw timestamp (seconds/ms, string/number) to its candle's time
  const snapToCandleTime = (
    timestampLike: number | string
  ): UTCTimestamp | null => {
    if (timestampLike === null) return null;

    let tsMs =
      typeof timestampLike === "string"
        ? Number(timestampLike)
        : timestampLike;

    if (!Number.isFinite(tsMs)) return null;

    // Normalize seconds → ms if the value looks like seconds
    if (tsMs < 1e12) {
      tsMs *= 1000;
    }
    // const BUCKET_MS = 

    for (const c of candles) {
      const startMs = Number(c.time) * 1000;
      const endMs = startMs + BUCKET_MS_10M; // 10m window
      if (tsMs >= startMs && tsMs < endMs) {
        return c.time;
      }
    }
    return null;
  };

  // --- Trend markers (same as before) ---
  for (const ev of trends) {
    const snapped = snapToCandleTime(ev.ts);
    if (!snapped) continue;

    markers.push({
      time: snapped,
      position: "aboveBar",
      shape: ev.trend_type === "down" ? "arrowDown" : "arrowUp",
      color: "#1e90ff",
      text: ev.trend_type ? `Trend: ${ev.trend_type}` : "Trend",
    });
  }

  // --- Signal markers: long/short entry/exit ---
  for (const ev of signals) {
    const snapped = snapToCandleTime(ev.timestamp_ms);
    if (!snapped) continue; // if we can't find a candle, skip

    let position: "aboveBar" | "belowBar";
    let shape: "arrowUp" | "arrowDown";
    let color: string;
    let text: string;

    switch (ev.signal_type) {
      case "long_entry":
        position = "belowBar";
        shape = "arrowUp";
        color = "#26a69a";
        text = "LONG IN";
        break;
      case "long_exit":
        position = "belowBar";
        shape = "arrowUp";
        color = "#a5d6a7";
        text = "LONG OUT";
        break;
      case "short_entry":
        position = "aboveBar";
        shape = "arrowDown";
        color = "#ef5350";
        text = "SHORT IN";
        break;
      case "short_exit":
        position = "aboveBar";
        shape = "arrowDown";
        color = "#ffb74d";
        text = "SHORT OUT";
        break;
      default:
        position = "aboveBar";
        shape = "arrowUp";
        color = "#9e9e9e";
        text = ev.signal_type ?? "SIG";
    }

    markers.push({
      time: snapped,
      position,
      shape,
      color,
      text,
    });
  }

  // --- Volatility markers ---
  for (const ev of vols) {
    const tMs = Date.parse(ev.ts);
    if (Number.isNaN(tMs)) continue;
    const snapped = snapToCandleTime(tMs);
    if (!snapped) continue;

    markers.push({
      time: snapped,
      position: "aboveBar",
      shape: "circle",
      color: "#ffa726",
      text: ev.vol_type ? `VOL ${ev.vol_type}` : "VOL",
    });
  }

  console.warn("[applyMarkers] markers:", markers.length, markers.slice(0, 5));
  series.setMarkers(markers);
}



export function updateBackgroundBandsDOM(
   
  chart: any,
  overlayEl: HTMLDivElement,
  candles: Candle10m[],
  trendEvents: TrendEvent[]
) {
  // 👉 This is your current `updateBackgroundBands` body, but parameterized
  // with (chart, overlayEl, candles, trendEvents) instead of using refs inside.
  const timeScale = chart.timeScale();
  const range = timeScale.getVisibleLogicalRange();
  if (!range || !candles.length) return;

  const fromIndex = Math.max(0, Math.floor(range.from));
  const toIndex = Math.min(candles.length - 1, Math.floor(range.to));
  if (fromIndex >= toIndex) return;

  const fromMs = Number(candles[fromIndex].time) * 1000;
  const toMs = Number(candles[toIndex].time) * 1000;
  const lastCandleMs =
    Number(candles[candles.length - 1].time) * 1000 || Date.now();

  overlayEl.innerHTML = "";

  const signals = [...trendEvents]
    .filter((s) => s.type === "trend_long" && s.value !== undefined)
    .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());

  for (let i = 0; i < signals.length; i++) {
    const sig = signals[i];
    const startMs = new Date(sig.ts).getTime();
    const next = signals[i + 1];
    const endMs = next ? new Date(next.ts).getTime() : lastCandleMs;

    if (endMs <= fromMs || startMs >= toMs) continue;

    const bandStart = Math.max(startMs, fromMs);
    const bandEnd = Math.min(endMs, toMs);

    const x1 = timeScale.timeToCoordinate((bandStart / 1000) as UTCTimestamp);
    const x2 = timeScale.timeToCoordinate((bandEnd / 1000) as UTCTimestamp);
    if (x1 === null || x2 === null) continue;

    const left = Math.min(x1, x2);
    const width = Math.abs(x2 - x1);

    const band = document.createElement("div");
    band.style.position = "absolute";
    band.style.top = "0";
    band.style.bottom = "0";
    band.style.left = `${left}px`;
    band.style.width = `${width}px`;
    band.style.pointerEvents = "none";
     
    band.style.backgroundColor = longBgColorFromValue(sig.value!);

    overlayEl.appendChild(band);
  }
}
