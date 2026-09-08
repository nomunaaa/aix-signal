'use client';

// Binance10mChartContainer.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/navigation-compat";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAllowedSymbols } from "@/config/symbols";
import { useAuth } from "@/contexts/AuthContext";
import { useMockTrade } from "@/views/Multiplecharts/useMockTrade";
import { ChartIntervalSelect } from "@/views/Multiplecharts/ChartIntervalSelect";
import { ChartSignalFilterBar } from "@/views/Multiplecharts/ChartSignalFilterBar";
import type { ChartTradingCategoryFilter, ChartTrendMode } from "@/views/Multiplecharts/types";
import { normalizeTradingCategory, resolveSingleTradingCategory } from "@/lib/trading-category";
import { usePulseStore } from "@/views/signals/pulse/stores/pulseStore";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Camera,
  Loader2,
} from "lucide-react";
import { useBinanceChart } from "./Multiplecharts/useBinanceChart";
import { supabase } from "@/integrations/supabase/client";
import type { SignalEvent } from "./Multiplecharts/types";

import * as htmlToImage from "html-to-image";
import { useSnapshotDownloader } from "@/hooks/useSnapshotDownloader";
import type { Owner, SnapshotItem } from "@/types/snapshot";
import html2canvas from "html2canvas";
import { waitForImages } from "@/lib/waitForImages";
import { ProfitSnapshotTemplate } from "./EarningsSnapshots";
import { requestChartSnapshot } from "@/lib/chartSnapshotHost";
import { ChartWorkspaceShell } from "@/components/chart-workspace/ChartWorkspaceShell";
import { ChartSignalCard } from "@/components/chart-workspace/ChartSignalCard";
import { MockTradeEntryPanel } from "@/components/chart-workspace/MockTradeEntryPanel";
import { MockTradeHelp } from "@/components/chart-workspace/MockTradeHelp";
import { MockPositionsTable } from "@/components/chart-workspace/MockPositionsTable";
import { useOtherPositionPrices } from "@/hooks/useOtherPositionPrices";
import { MockTradePositionCard } from "@/components/chart-workspace/MockTradePositionCard";
import { SimulatorSettingsPopover } from "@/components/chart-workspace/SimulatorSettingsPopover";
import { SimulatorSettingsPanel } from "@/components/chart-workspace/SimulatorSettingsPanel";
import { useMockTradePositions } from "@/hooks/useMockTradePositions";
import { useSharedSimulationInput } from "@/hooks/useSharedSimulationInput";
import { TradeCaptureFallback } from "@/components/chart-workspace/TradeCaptureFallback";
import { resolveChartBucketMs, resolveMaxCandles } from "@/views/Multiplecharts/constants";
import { uploadTradeCloseCapture } from "@/lib/my/tradeChartCapture";
import { closeMyPosition } from "@/lib/my/close-position";
import { mockMarginFromPct } from "@/lib/mockTradeCapital";
import { ChartSymbolSelect } from "@/components/chart/chart-symbol-select";
import { readLastChartSymbol, writeLastChartSymbol } from "@/lib/lastChartSymbol";

const CHART10M_LAST_SYMBOL_KEY = 'aixsignal:chart10m:last-symbol';

const Chart10m: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const snapshotMode = searchParams.get("snapshot") === "1";
  const snapshotId = searchParams.get("snapshotId") ?? "";
  const snapshotRunRef = useRef(false);
  const signalIdParam = searchParams.get("signalId");
  // 히스토리 QR/차트 딥링크가 넘겨 주는 모의매매 id.
  // 캔들 조회 창(1m 30일 등)을 벗어난 과거 거래는 차트를 그릴 수 없어, 이 id로 청산 캡쳐를 찾아 대체 표시한다.
  const deeplinkTradeId = searchParams.get("tradeId");
  const BASE_CAPITAL = 100_000;
  const ENTRY_SIZE_PCT = 0.03;
  const VIRTUAL_MARGIN = BASE_CAPITAL * ENTRY_SIZE_PCT;

  const parseSnapshotMs = (value: string | null) => {
    if (!value) return NaN;
    const trimmed = String(value).trim();

    // numeric timestamp (sec/ms/us)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number.parseFloat(trimmed);
      if (!Number.isFinite(n)) return NaN;

      // seconds (10 digits-ish)
      if (n < 2_000_000_000_0) return Math.round(n * 1000);

      // microseconds (16 digits-ish)
      if (n >= 10_000_000_000_000) return Math.round(n / 1000);

      // milliseconds
      return Math.round(n);
    }

    // ISO string
    const normalized =
      trimmed.includes(" ") && !trimmed.includes("T") ? trimmed.replace(" ", "T") : trimmed;
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : NaN;
  };

  const LEVERAGE = 4;
  const calcRoePct = (direction: "long" | "short", entry: number, exit: number) => {
    if (!entry || !exit) return 0;
    if (direction === "short") return ((entry - exit) / entry) * 100 * LEVERAGE;
    return ((exit - entry) / entry) * 100 * LEVERAGE;
  };
  const calcPnlDollarFromRoePct = (roePct: number) => VIRTUAL_MARGIN * (roePct / 100);
  const clampLiqRoe = (roePct: number) => Math.max(roePct, -100);

  const parseDeeplinkMs = (value: string | null) => {
    if (!value) return NaN;
    const trimmed = String(value).trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number.parseFloat(trimmed);
      if (!Number.isFinite(num)) return NaN;
      return num >= 1_000_000_000_000 ? Math.round(num) : Math.round(num * 1000);
    }
    const normalized = trimmed.includes(" ") && !trimmed.includes("T")
      ? trimmed.replace(" ", "T")
      : trimmed;
    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : NaN;
  };


  const snapshotRange = useMemo(() => {
    if (snapshotMode) {
      const fromMs = parseSnapshotMs(searchParams.get("fromMs"));
      const toMs = parseSnapshotMs(searchParams.get("toMs"));
      if (Number.isFinite(fromMs) && Number.isFinite(toMs) && fromMs < toMs) {
        return { startMs: fromMs, endMs: toMs, entryMs: fromMs, exitMs: toMs };
      }
    }
    // snapshot=1이 아니어도(History/Signal Board 등에서 온 entryTime[/exitTime] 딥링크)
    // 이 값이 있으면 초기 캔들 조회를 그 시점 근처로 앵커링한다. 그러지 않으면 초기
    // 조회가 항상 "지금부터 8일 전"만 가져와서, 8일보다 오래된 시그널로 이동할 때
    // 카메라(가시 구간)는 맞는 곳으로 이동하지만 실제 캔들 데이터가 없어 텅 빈
    // 차트가 된다.
    const entryMs = parseSnapshotMs(searchParams.get("entryTime"));
    if (!Number.isFinite(entryMs)) return null;
    const exitMs = parseSnapshotMs(searchParams.get("exitTime"));
    if (Number.isFinite(exitMs)) {
      const duration = Math.abs(exitMs - entryMs);
      const padding = Math.max(60 * 60 * 1000, duration * 0.2);
      return {
        startMs: entryMs - padding,
        endMs: exitMs + padding,
        entryMs,
        exitMs,
      };
    }
    // exitTime이 없는 열린 시그널: 진입 시점부터 지금까지 전부 조회해 진입 이후의
    // 실시간 가격 흐름도 스크롤해서 볼 수 있게 한다.
    return {
      startMs: entryMs - 60 * 60 * 1000,
      endMs: Date.now(),
      entryMs,
      exitMs: Date.now(),
    };
  }, [snapshotMode, searchParams]);

  const symbolFromQuery = searchParams.get('symbol');
  const tradingCategoryFromQuery = normalizeTradingCategory(searchParams.get('tradingCategory'));
  const defaultSymbol = 'BTCUSDT';

  // 구독 플랜에 따른 종목 게이팅 (free: 없음, pro: 전체)
  const { user, subscription, isLoading: authLoading } = useAuth();
  const SYMBOLS: string[] = useMemo(
    () => getAllowedSymbols(subscription.plan),
    [subscription.plan]
  );
  const [symbol, setSymbol] = useState<string>(
    () => symbolFromQuery || readLastChartSymbol(CHART10M_LAST_SYMBOL_KEY) || defaultSymbol
  );
  const normalizedSymbol = symbol.trim().toUpperCase();
  const barInterval = "10m";

  // 신호/전략(구분)은 Signal Board/Trend Board/AIX 수익통계와 pulseStore를 공유한다.
  // 그 화면들은 다중 선택이 가능하지만 Chart는 한 번에 하나만 표시할 수 있어,
  // 여러 개가 선택돼 있으면 우선순위(E2X2 > E2X1 > E1X2 > E1X1)로 하나만 고른다.
  const storeTradingCategoryFilters = usePulseStore((state) => state.tradingCategoryFilters);
  const setStoreTradingCategoryFilters = usePulseStore((state) => state.setTradingCategoryFilters);
  const tradingCategoryFilter: ChartTradingCategoryFilter = resolveSingleTradingCategory(
    storeTradingCategoryFilters
  );
  const setTradingCategoryFilter = (category: ChartTradingCategoryFilter) => {
    if (category === "ALL") return;
    setStoreTradingCategoryFilters([category]);
  };
  // 추세/비추세 필터도 Signal Board/Trend Board와 pulseStore를 공유한다.
  const storeTrendModeFilter = usePulseStore((state) => state.trendModeFilter);
  const setStoreTrendModeFilter = usePulseStore((state) => state.setTrendModeFilter);
  const trendModesFilter: ChartTrendMode[] = useMemo(() => {
    const modes: ChartTrendMode[] = [];
    if (storeTrendModeFilter.trend) modes.push("trend");
    if (storeTrendModeFilter.nonTrend) modes.push("nonTrend");
    if (storeTrendModeFilter.reversal) modes.push("reversal");
    return modes;
  }, [storeTrendModeFilter]);
  const toggleTrendModeFilter = (mode: ChartTrendMode) => {
    const isOn = storeTrendModeFilter[mode];
    if (isOn && trendModesFilter.length === 1) return;
    setStoreTrendModeFilter({ ...storeTrendModeFilter, [mode]: !isOn });
  };

  useEffect(() => {
    if (symbolFromQuery) {
      setSymbol(symbolFromQuery);
    }
  }, [symbolFromQuery]);

  useEffect(() => {
    if (tradingCategoryFromQuery) {
      setStoreTradingCategoryFilters([tradingCategoryFromQuery]);
    }
  }, [tradingCategoryFromQuery, setStoreTradingCategoryFilters]);

  // URL ?symbol= 로 잠긴 종목에 접근하는 것을 차단 (플랜 확정 후에만 클램프)
  useEffect(() => {
    if (authLoading) return;
    // AuthContext는 구독 조회를 기다리지 않고 isLoading=false로 만든다(= plan이 잠시 "free").
    // 그 순간 SYMBOLS가 빈 배열이 되는데, 여기서 클램프해 버리면 텔레그램 딥링크로 들어온
    // ?symbol=POLUSDT 같은 값이 지워지고 플랜 확정 후 SYMBOLS[0](BTCUSDT)로 덮어써진다.
    if (SYMBOLS.length === 0) return;
    if (SYMBOLS.includes(normalizedSymbol)) {
      if (symbol !== normalizedSymbol) setSymbol(normalizedSymbol);
      return;
    }
    // 허용 목록이 확정된 뒤 딥링크 종목을 복원한다.
    const desired = symbolFromQuery?.trim().toUpperCase();
    if (desired && SYMBOLS.includes(desired)) {
      setSymbol(desired);
      return;
    }
    const fallbackSymbol = SYMBOLS[0] ?? "";
    if (symbol !== fallbackSymbol) setSymbol(fallbackSymbol);
  }, [authLoading, SYMBOLS, normalizedSymbol, symbol, symbolFromQuery]);
  const activeSymbol = SYMBOLS.includes(normalizedSymbol) ? normalizedSymbol : "";

  // 다른 탭/페이지로 이동했다가 돌아와도 마지막으로 보던 종목이 유지되도록 저장한다.
  useEffect(() => {
    if (activeSymbol) writeLastChartSymbol(CHART10M_LAST_SYMBOL_KEY, activeSymbol);
  }, [activeSymbol]);

  // 모의매매 포지션 클릭 시, 진입 당시 스트림이 Pulse(1분봉)면 해당 차트로 이동시킨다.
  const handleMockPositionSymbolClick = (clickedSymbol: string, stream: "PULSE" | "WAVE") => {
    if (stream === "PULSE") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("symbol", clickedSymbol);
      navigate(`/chart1m?${params.toString()}`);
      return;
    }
    setSymbol(clickedSymbol);
  };

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const SNAP_BUCKET = "aix-bucket";

  const [snapOpen, setSnapOpen] = useState(false);
  const [snapUploading, setSnapUploading] = useState(false);
  const [snapUrl, setSnapUrl] = useState<string | null>(null);
  const [autoDownloadSrc, _setAutoDownloadSrc] = useState<string | null>(null);
  const [autoDownloadKey, _setAutoDownloadKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSignal, setPendingSignal] = useState<{ event: SignalEvent; entryEvent?: SignalEvent | null } | null>(null);
  const [snapPreviewUrl, setSnapPreviewUrl] = useState<string | null>(null);
  const [snapPreviewLoading, setSnapPreviewLoading] = useState(false);

  const snapshotRef = useRef<HTMLDivElement | null>(null);

  const {
    refs: { containerRef, overlayRef, signalSvgOverlayRef, mockTradeSvgOverlayRef },
    state: {
      activeTf,
      ohlc,
      initialLoading,
      chartReady,
      showBollinger,
      lastPrice,
      lastCandleTime,
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
      gotoStart,
      gotoEnd,
      pageLeft,
      pageRight,
      gotoDate,
      setVisibleTimeRange,
    },
  } = useBinanceChart(activeSymbol, barInterval, {
    signalId: signalIdParam,
    snapshotRangeMs: snapshotRange,
    disableAutoLoadOlder: snapshotMode,
    disableRealtime: snapshotMode,
    tradingCategoryFilter,
    trendModesFilter,
  });

  const posterRef = useRef<HTMLDivElement | null>(null);
  const [posterItem, setPosterItem] = useState<SnapshotItem | null>(null);
  const [posterChartUrl, setPosterChartUrl] = useState<string | null>(null);
  const [posterOwner, setPosterOwner] = useState<Owner>(null);
  const [posterVerifyUrl, setPosterVerifyUrl] = useState<string | null>(null);

  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });

  const resolveOwner = async (): Promise<Owner> => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { email: data.user.email ?? undefined };
  };

  const makeProfitPosterBlob = async (
    item: SnapshotItem,
    options?: { owner?: Owner; imageLink?: string | null }
  ): Promise<Blob> => {
    let chartDataUrl: string | null = null;
    try {
      chartDataUrl = await requestChartSnapshot(item);
    } catch (err) {
      console.warn("Chart snapshot host failed, falling back to live view:", err);
      const chartBlob = await takeFullSnapshotBlob();
      chartDataUrl = await blobToDataUrl(chartBlob);
    }

    setPosterItem(item);
    setPosterChartUrl(chartDataUrl);
    setPosterOwner(options?.owner ?? null);
    setPosterVerifyUrl(options?.imageLink ?? null);

    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 120));

    const el = posterRef.current;
    if (!el) throw new Error("posterRef not found");
    await waitForImages(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      throw new Error(`poster element has invalid size: ${rect.width}x${rect.height}`);
    }

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 20000,
        logging: false,
      });
    } catch {
      canvas = await html2canvas(el, {
        backgroundColor: null,
        scale: 1,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 20000,
        logging: false,
      });
    }

    return await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png");
    });
  };

  const exitSignals = useMemo(() => {
    return (signalEvents ?? [])
      .filter((ev: SignalEvent) => String(ev.signal_type).toLowerCase() === "exit")
      .sort((a: SignalEvent, b: SignalEvent) => Number(b.timestamp_ms) - Number(a.timestamp_ms))
      .slice(0, 8);
  }, [signalEvents]);

  const { handleDownload } = useSnapshotDownloader({
    makeSnapshotPngBlob: makeProfitPosterBlob,
    currentOwner: null,
    resolveCurrentOwner: resolveOwner,
    isAutoDownloadFrame: false,
  });

  const handleConfirmDownload = async () => {
    if (!pendingSignal) return;
    const { event, entryEvent } = pendingSignal;
    setConfirmOpen(false);
    setSnapUploading(true);
    try {
      const { data: cycle, error } = await supabase
        .from("signal_cycles")
        .select("id,symbol,side,entry_price,exit_price,entry_time,exit_time,barinterval,realized_pnl_pct")
        .eq("exit_event_id", event.id)
        .maybeSingle();

      if (error) throw error;
      if (!cycle?.id) {
        toast({
          title: "Signal cycle not found",
          description: "Exit signal is missing a linked cycle.",
        });
        setSnapUploading(false);
        return;
      }

      const direction: "long" | "short" =
        String(cycle.side ?? event.direction ?? "")
          .toLowerCase() === "short"
          ? "short"
          : "long";

      const entryMs = parseSnapshotMs(cycle.entry_time ?? null);
      const exitMs = parseSnapshotMs(cycle.exit_time ?? null);
      const entryISO = Number.isFinite(entryMs) ? new Date(entryMs).toISOString() : null;
      const exitISO = Number.isFinite(exitMs) ? new Date(exitMs).toISOString() : null;
      const entryPrice = Number(cycle.entry_price ?? entryEvent?.price ?? 0);
      const exitPrice = Number(cycle.exit_price ?? event.price ?? 0);
      const realizedRoePct =
        cycle.realized_pnl_pct != null && Number.isFinite(Number(cycle.realized_pnl_pct))
          ? Number(cycle.realized_pnl_pct)
          : null;

      const roe = realizedRoePct ?? clampLiqRoe(calcRoePct(direction, entryPrice, exitPrice));
      const pnl$ = calcPnlDollarFromRoePct(roe);
      const durationSec =
        Number.isFinite(entryMs) && Number.isFinite(exitMs)
          ? Math.max(0, Math.floor((exitMs - entryMs) / 1000))
          : 0;

      const item: SnapshotItem = {
        id: String(cycle.id),
        symbol: String(cycle.symbol || event.symbol || symbol),
        roePct: roe,
        pnlAmount: pnl$,
        leverage: LEVERAGE,
        entryPrice,
        exitPrice,
        direction,
        entryTimeISO: entryISO,
        exitTimeISO: exitISO,
        date: entryISO ? entryISO.slice(0, 10) : "",
        views: 0,
        likes: 0,
        period: 0,
        barinterval: cycle.barinterval || event.bar_interval || "10m",
        durationSec,
      };

      await handleDownload(item);
    } catch (err) {
      console.error("Failed to resolve signal cycle:", err);
      toast({
        title: "Snapshot failed",
        description: "Could not resolve the signal cycle for this exit.",
      });
    } finally {
      setSnapUploading(false);
    }
  };

  const snapPreviewRunRef = useRef(false);
  useEffect(() => {
    if (!snapOpen) {
      snapPreviewRunRef.current = false;
      return;
    }
    if (snapPreviewRunRef.current) return;
    snapPreviewRunRef.current = true;

    let active = true;
    const run = async () => {
      try {
        setSnapPreviewLoading(true);
        const blob = await takeFullSnapshotBlob();
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read snapshot blob"));
          reader.readAsDataURL(blob);
        });
        if (active) setSnapPreviewUrl(url);
      } catch (e) {
        console.error("Preview snapshot failed:", e);
      } finally {
        if (active) setSnapPreviewLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
   
  }, [snapOpen]);

  const waitForSnapshotRender = useCallback(async () => {
    const root = snapshotRef.current;
    if (!root) return;

    const requiresSignals = Boolean(signalIdParam) ||
      (Boolean(searchParams.get("entryTime")) && Boolean(searchParams.get("exitTime")));
    const maxAttempts = 120;
    const hasPaintedCanvas = () => {
      const canvas = root.querySelector("canvas") as HTMLCanvasElement | null;
      if (!canvas) return false;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      try {
        const pixel = ctx.getImageData(0, 0, 1, 1).data;
        return pixel[3] > 0;
      } catch {
        return true;
      }
    };

    for (let i = 0; i < maxAttempts; i++) {
      const hasCanvas = root.querySelectorAll("canvas").length > 0;
      const hasBands = (overlayRef.current?.childElementCount ?? 0) > 0;
      const hasSignals = (signalSvgOverlayRef.current?.querySelector("svg") !== null);
      const hasTargetSignal = signalIdParam
        ? Array.from(signalSvgOverlayRef.current?.querySelectorAll("[data-signal-id]") ?? [])
          .some((el) => (el as HTMLElement).dataset.signalId === String(signalIdParam))
        : hasSignals;

      if (chartReady && lastCandleTime && hasCanvas && hasPaintedCanvas() &&
        (hasBands || hasSignals || !requiresSignals)) {
        if (requiresSignals && !hasTargetSignal) {
          await new Promise((r) => setTimeout(r, 250));
          continue;
        }
        await new Promise((r) => setTimeout(r, 250));
        return;
      }

      await new Promise((r) => setTimeout(r, 250));
    }
  }, [signalIdParam, searchParams, overlayRef, signalSvgOverlayRef, chartReady, lastCandleTime]);

  useEffect(() => {
    if (initialLoading) return;

    const entryTimeParam = searchParams.get('entryTime');
    const exitTimeParam = searchParams.get('exitTime');

    if (!entryTimeParam) {
      gotoEnd();
      return;
    }

    const entryMs = parseDeeplinkMs(entryTimeParam);
    if (!Number.isFinite(entryMs)) {
      gotoEnd();
      return;
    }

    // 컨테이너 레이아웃이 이 시점에 아직 안정되지 않았으면(차트가 막 마운트된
    // 직후) 방금 지정한 뷰포트가 곧바로 기본 뷰(라이브 끝)로 되돌아가는 경우가
    // 있다 — 레이아웃이 자리 잡은 다음 프레임에 동일한 범위를 한 번 더 적용해
    // 되돌아가지 않도록 고정한다.
    const applyRange = (fromMs: number, toMs: number) => {
      setVisibleTimeRange(fromMs, toMs);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisibleTimeRange(fromMs, toMs);
        });
      });
    };

    if (exitTimeParam) {
      const exitMs = parseDeeplinkMs(exitTimeParam);
      if (!Number.isFinite(exitMs)) {
        gotoEnd();
        return;
      }

      const startMs = Math.min(entryMs, exitMs);
      const endMs = Math.max(entryMs, exitMs);
      const duration = endMs - startMs;
      const padding = duration / 3;
      const fromTime = startMs - padding;
      const toTime = endMs + padding;

      applyRange(fromTime, toTime);
    } else {
      const twentyMinutes = 20 * 60 * 1000;
      const fromTime = entryMs - twentyMinutes;
      const toTime = entryMs + twentyMinutes;

      applyRange(fromTime, toTime);
    }
  }, [searchParams, initialLoading, setVisibleTimeRange, gotoEnd]);

  const [isFullscreen, setIsFullscreen] = useState(false);

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadOwnedSnapshot(signalId: string, filename: string) {
    const form = new FormData();
    form.append("snapshotId", signalId);
    form.append("signalId", signalId);

    const res = await supabase.functions.invoke("pin-snapshot", { body: form });
    if (res.error) throw res.error;
    const data = res.data as { cid?: string; pinataUrl?: string };
    const ownedUrl = data?.pinataUrl || (data?.cid ? `https://gateway.pinata.cloud/ipfs/${data.cid}` : "");
    if (!ownedUrl) return false;

    const resp = await fetch(ownedUrl);
    if (!resp.ok) throw new Error("Failed to fetch owned snapshot");
    const ownedBlob = await resp.blob();
    downloadBlob(ownedBlob, filename);
    return true;
  }

  async function handleSnapshotDownload(ownershipId?: string | null) {
    if (snapUploading) return;
    try {
      setSnapUploading(true);
      const fileName = `${symbol}-${barInterval}-${Date.now()}.png`;
      if (ownershipId) {
        const downloaded = await downloadOwnedSnapshot(ownershipId, fileName);
        if (downloaded) return;
      }

      const blob = await takeFullSnapshotBlob(); // ✅ full snapshot

      if (user?.id && ownershipId) {
        const form = new FormData();
        form.append("snapshotId", ownershipId);
        form.append("signalId", ownershipId);
        form.append("userId", user.id);
        form.append("file", new File([blob], `snapshot-${ownershipId}.png`, { type: "image/png" }));
        await supabase.functions.invoke("pin-snapshot", { body: form });
      }

      downloadBlob(blob, fileName);
    } catch (e) {
      console.error(e);
      alert("Snapshot failed");
    } finally {
      setSnapUploading(false);
    }
  }

  function randomSlug(len = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function uploadAndCreateShareLink(blob: Blob, symbol: string, barInterval: string) {
    const slug = randomSlug(10);
    const imagePath = `snapshots/${symbol}/${barInterval}/${slug}.png`;

    const { error: upErr } = await supabase.storage
      .from(SNAP_BUCKET)
      .upload(imagePath, blob, { contentType: "image/png", upsert: false });
    if (upErr) throw upErr;

    const { error: insErr } = await supabase.from("chart_snapshots").insert({
      slug,
      image_path: imagePath,
      symbol,
      interval: barInterval,
    });
    if (insErr) throw insErr;

    const shareUrl = `${window.location.origin}/s/${slug}`;
    return { shareUrl, slug, imagePath };
  }
   
  async function takeFullSnapshotBlob(): Promise<Blob> {
    const root = snapshotRef.current;
    if (!root) throw new Error("snapshotRef is null");

    forceResize();
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 150));

    const rootRect = root.getBoundingClientRect();

    const isMobile =
      typeof navigator !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const dprRaw = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const dpr = Math.min(isMobile ? 1.5 : 2, dprRaw);

    const outW = Math.max(1, Math.floor(rootRect.width * dpr));
    const outH = Math.max(1, Math.floor(rootRect.height * dpr));

    const out = document.createElement("canvas");
    out.width = outW;
    out.height = outH;

    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("2D ctx not available");

    // background
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, outW, outH);

    // helper: draw an element's rect-aligned image
    const drawElementImage = async (el: HTMLElement, img: HTMLImageElement) => {
      const r = el.getBoundingClientRect();
      const x = (r.left - rootRect.left) * dpr;
      const y = (r.top - rootRect.top) * dpr;
      const w = r.width * dpr;
      const h = r.height * dpr;
      if (w <= 0 || h <= 0) return;
      ctx.drawImage(img, x, y, w, h);
    };

    // 1) draw ALL canvases (chart + volume etc)
    const canvases = Array.from(root.querySelectorAll("canvas"));
    for (const c of canvases) {
      const r = c.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      const x = (r.left - rootRect.left) * dpr;
      const y = (r.top - rootRect.top) * dpr;
      const w = r.width * dpr;
      const h = r.height * dpr;

      try {
        ctx.drawImage(c, x, y, w, h);
      } catch (e) {
        console.warn("drawImage(canvas) failed:", e);
      }
    }

    // 2) draw overlay DIVs (CSS gradients / bands)
    // IMPORTANT: capture ONLY these divs (much more stable than capturing the whole root)
    const overlayDivs: (HTMLElement | null)[] = [
      overlayRef.current as HTMLElement | null,
    ];

    for (const el of overlayDivs) {
      if (!el) continue;

      // make sure it's visible
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      try {
        const dataUrl = await htmlToImage.toPng(el, {
          backgroundColor: "transparent",
          cacheBust: true,
          pixelRatio: 1, // keep small & stable on iOS
          style: {
            transform: "none",
            transformOrigin: "top left",
          },
        });

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = dataUrl;
        });

        await drawElementImage(el, img);
      } catch (e) {
        console.warn("overlay div capture failed:", e);
      }
    }

    // 3) draw SVG overlays (signals)
    const svgs = Array.from(root.querySelectorAll("svg"));
    for (const svg of svgs) {
      const r = svg.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;

      const svgText = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const im = new Image();
          im.onload = () => resolve(im);
          im.onerror = reject;
          im.src = url;
        });

        const x = (r.left - rootRect.left) * dpr;
        const y = (r.top - rootRect.top) * dpr;
        const w = r.width * dpr;
        const h = r.height * dpr;

        ctx.drawImage(img, x, y, w, h);
      } catch (e) {
        console.warn("drawImage(svg) failed:", e);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    // export
    const blob: Blob = await new Promise((resolve, reject) => {
      out.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))), "image/png");
    });

    return blob;
  }

  useEffect(() => {
    if (!snapshotMode) return;
    if (initialLoading) return;
    if (snapshotRunRef.current) return;
    snapshotRunRef.current = true;

    const postToParent = (payload: Record<string, unknown>) => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, window.location.origin);
      }
    };

    const run = async () => {
      try {
        await new Promise((r) => setTimeout(r, 300));
        await waitForSnapshotRender();
        const blob = await takeFullSnapshotBlob();

        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read snapshot blob"));
          reader.readAsDataURL(blob);
        });

        postToParent({
          type: "CHART10M_SNAPSHOT",
          snapshotId,
          dataUrl,
        });
      } catch (e: unknown) {
        postToParent({
          type: "CHART10M_SNAPSHOT",
          snapshotId,
          error: e instanceof Error ? e.message : "Snapshot failed",
        });
      }
    };

    void run();
  }, [snapshotMode, snapshotId, initialLoading, takeFullSnapshotBlob, waitForSnapshotRender]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; filename?: string; dataUrl?: string; error?: string };
      if (data?.type !== "PROFIT_SNAPSHOT_DOWNLOAD") return;
      try {
        if (data.error === "LOGIN_REQUIRED") {
          toast({
            title: "로그인이 필요합니다",
            description: "스냅샷을 다운로드하려면 로그인해 주세요.",
          });
          return;
        }
        if (data.dataUrl && data.filename) {
          const a = document.createElement("a");
          a.href = data.dataUrl;
          a.download = data.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } finally {
        setSnapUploading(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);





  // lock body scroll while fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // close fullscreen with ESC
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // resize chart when fullscreen toggles
  useEffect(() => {
    const id = setTimeout(() => {
      forceResize();
    }, 0);
    return () => clearTimeout(id);
  }, [isFullscreen, forceResize]);

  // Auth + mock trade (subscription/plan destructured above)
  const isAuthenticated = !!user;

  const {
    mockOpen,
    mockPhase,
    mockDirection,
    setMockDirection,
    mockEntryPrice,
    mockExitLocked,
    mockExitReferencePrice,
    mockProfitPct,
    mockSaving,
    remainingPct,
    realizedPnlUsd,
    handleMockEntry,
    handleMockExit,
    handleAddEntry,
    handlePartialClose,
    tradeId,
    fills: mockFills,
    resetMock,
  } = useMockTrade({
    symbol: activeSymbol,
    lastPrice,
    isAuthenticated,
    lastCandleTime,
    barInterval,
  });


  // 전량 청산 직후 차트를 PNG로 떠서 보관한다.
  // 나중에 캔들 조회 창을 벗어나도 히스토리 QR에서 "진입·청산 캡쳐 화면"으로 되살릴 수 있다.
  const takeSnapshotRef = useRef<(() => Promise<Blob>) | null>(null);
  useEffect(() => {
    takeSnapshotRef.current = takeFullSnapshotBlob;
  });

  const capturedTradeRef = useRef<string | null>(null);
  useEffect(() => {
    if (snapshotMode) return;
    if (!mockExitLocked || remainingPct !== 0 || !tradeId) return;
    if (capturedTradeRef.current === tradeId) return;
    capturedTradeRef.current = tradeId;

    // 청산 화살표 오버레이가 실제로 그려진 뒤에 떠야 캡쳐에 진입·청산이 함께 담긴다.
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const blob = await takeSnapshotRef.current?.();
          if (blob) await uploadTradeCloseCapture(tradeId, blob);
        } catch (err) {
          console.warn("[trade capture] 청산 캡쳐 실패", err);
        }
      })();
    }, 800);
    return () => clearTimeout(timer);
  }, [snapshotMode, mockExitLocked, remainingPct, tradeId]);

  // 진입·청산 딥링크인데 차트를 되살릴 수 없는 경우 → 청산 캡쳐로 대체한다.
  // 캔들 보관 한도(1m 30일 / 5m 60일 / 10m 90일 / 15m 120일)를 넘어선 진입 시각은
  // 아무리 백필해도 도달할 수 없고, 지금은 가장 가까운 구간이 조용히 대신 표시되어 버린다.
  const chartDataUnavailable = useMemo(() => {
    const entryMs = parseSnapshotMs(searchParams.get("entryTime"));
    if (!Number.isFinite(entryMs) || !searchParams.get("exitTime")) return false;
    if (!initialLoading && !chartReady) return true;
    const limitMs = resolveMaxCandles(barInterval) * resolveChartBucketMs(barInterval);
    return entryMs < Date.now() - limitMs;
     
  }, [searchParams, initialLoading, chartReady, barInterval]);

  useEffect(() => {
    if (!mockOpen) return;

    if (mockPhase === "entry" || !mockFills.length) {
      clearMockTradeOverlay();
      return;
    }

    setMockTradeOverlay({ fills: mockFills, direction: mockDirection });
  }, [
    mockOpen,
    mockPhase,
    mockDirection,
    mockFills,
    setMockTradeOverlay,
    clearMockTradeOverlay,
  ]);


  // ── 우측 사이드바 / 하단 포지션 테이블용 파생 상태 ──
  // 진입 비중·레버리지는 시그널 보드/수익통계와 공유되는 시뮬레이터 설정을 그대로 사용한다.
  const [simulationInput] = useSharedSimulationInput();
  const simPct = simulationInput.capitalRatio;
  const simLeverage = simulationInput.leverage;

  /** 이 종목의 가장 최근 진입 시그널 (목표가·손절가는 DB에 없어 표시하지 않음) */
  const latestSignal = useMemo(() => {
    const entries = (signalEvents ?? []).filter(
      (ev) => String(ev.signal_type).toLowerCase() === "entry"
    );
    const latest = entries.reduce<(typeof entries)[number] | null>(
      (acc, ev) => (!acc || Number(ev.timestamp_ms) > Number(acc.timestamp_ms) ? ev : acc),
      null
    );
    if (!latest) return { direction: null, price: null, confidence: null };
    return {
      direction: String(latest.direction).toLowerCase() === "short" ? ("short" as const) : ("long" as const),
      price: Number(latest.price) || null,
      confidence: latest.trend_confidence != null ? Number(latest.trend_confidence) : null,
    };
  }, [signalEvents]);

  // 청산/추가진입 직후 하단 포지션 테이블이 즉시 갱신되도록, 실제로 변하는 값을 모두 키에 넣는다.
  // (tradeId+mockPhase만 쓰면 전체청산 후에도 둘 다 그대로라 새로고침 전까지 반영되지 않았다.)
  const mockPositions = useMockTradePositions(
    isAuthenticated,
    `${tradeId ?? ""}|${mockPhase}|${mockExitLocked}|${remainingPct}|${mockEntryPrice ?? ""}`
  );

  const otherPositionSymbols = useMemo(
    () =>
      mockPositions.open
        .map((p) => p.symbol.trim().toUpperCase())
        .filter((symbol) => symbol !== activeSymbol),
    [mockPositions.open, activeSymbol]
  );
  const otherLivePrices = useOtherPositionPrices(otherPositionSymbols);
  const livePriceMap = useMemo(
    () => ({ [activeSymbol]: lastPrice, ...otherLivePrices }),
    [activeSymbol, lastPrice, otherLivePrices]
  );

  const [closingAllMock, setClosingAllMock] = useState(false);
  const handleCloseAllMockPositions = async () => {
    if (closingAllMock || mockPositions.open.length === 0) return;
    setClosingAllMock(true);
    try {
      const closingTradeIds = new Set(mockPositions.open.map((p) => p.id));
      await Promise.all(
        mockPositions.open.map((p) =>
          closeMyPosition(p.id, livePriceMap[p.symbol] ?? p.entryPrice)
        )
      );
      if (tradeId && closingTradeIds.has(tradeId)) resetMock();
      await mockPositions.reload();
      toast({ description: "전체종목 청산 완료" });
    } finally {
      setClosingAllMock(false);
    }
  };

  const handleSidebarEntry = (direction: "long" | "short") => {
    setMockDirection(direction);
    void handleMockEntry(direction, undefined, mockMarginFromPct(simPct), simLeverage);
  };

  const wrapperClassName = useMemo(
    () =>
      isFullscreen
        ? "fixed inset-0 z-[9999] bg-background h-screen w-screen max-w-none"
        : "relative max-w-[1400px] mx-auto min-h-[900px] w-full flex",
    [isFullscreen]
  );

  const renderChartView = () => (
    <div className="w-full h-full flex flex-col relative bg-background">
      <ChartWorkspaceShell
        isFullscreen={isFullscreen}
        toolbar={<>
      {/* Header: symbol + mock trade */}
      <header className="hidden">
        <div className="flex gap-3 items-center flex-wrap px-4 pt-3">
          <Select value={activeSymbol} onValueChange={setSymbol} disabled={SYMBOLS.length === 0}>
            <SelectTrigger className="w-40 bg-background">
              <SelectValue placeholder="Plan required" />
            </SelectTrigger>

            <SelectContent className="bg-popover z-[10001]">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                거래량 상위
              </div>
              {SYMBOLS.slice(0, 5).map((s: string) => (
                <SelectItem key={s} value={s} className="font-medium">
                  {s}
                </SelectItem>
              ))}
              {SYMBOLS.length > 5 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b border-t mt-1">
                    전체 종목 (A-Z)
                  </div>
                  {SYMBOLS.slice(5).map((s: string) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Top controls + OHLC + fullscreen toggle */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <div className="pointer-events-none inset-x-0 top-0 z-20 flex flex-col gap-2 px-4 py-3 relative">
          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="absolute top-3 right-4 p-1.5 rounded hover:bg-muted text-foreground pointer-events-auto z-30"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 3 9 5 5 5 5 9 3 9" />
                <polyline points="15 3 15 5 19 5 19 9 21 9" />
                <polyline points="9 21 9 19 5 19 5 15 3 15" />
                <polyline points="15 21 15 19 19 19 19 15 21 15" />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 9 5 9 5 5 9 5 9 3" />
                <polyline points="21 9 19 9 19 5 15 5 15 3" />
                <polyline points="3 15 5 15 5 19 9 19 9 21" />
                <polyline points="21 15 19 15 19 19 15 19 15 21" />
              </svg>
            )}
          </button>
          <div className="absolute top-3 right-12 flex items-center gap-2 pointer-events-auto z-30">
            {/* Simulator Settings */}
            <SimulatorSettingsPopover />
            {/* Snapshot */}
            <Popover open={snapOpen} onOpenChange={setSnapOpen}>
              <PopoverTrigger asChild>
                <button
                  className="p-1.5 rounded hover:bg-muted text-foreground"
                  aria-label="Snapshot"
                  title="Snapshot"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </PopoverTrigger>

              <PopoverContent
                align="end"
                side="bottom"
                className="w-[320px] p-0 z-[10005] overflow-hidden"
              >
                <div className="bg-card text-foreground border border-border rounded-xl">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">Snapshot</span>
                      <span className="text-[11px] text-muted-foreground">
                        {symbol} · {barInterval}
                      </span>
                    </div>
                    <div className="text-[11px] px-2 py-1 rounded-md bg-muted/50 border border-border text-muted-foreground">
                      PNG
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                      <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">
                        Snapshot Preview
                      </div>
                      <div className="h-[140px] flex items-center justify-center text-xs text-muted-foreground">
                        {snapPreviewLoading ? (
                          "Rendering preview..."
                        ) : snapPreviewUrl ? (
                          <img
                            src={snapPreviewUrl}
                            alt="Snapshot preview"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          "Preview unavailable"
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                      <div className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">
                        Exit Signals
                      </div>
                      <div className="max-h-[200px] overflow-y-auto">
                        {exitSignals.length === 0 ? (
                          <div className="px-3 py-3 text-xs text-muted-foreground">No exit signals.</div>
                        ) : (
                          exitSignals.map((ev: SignalEvent) => {
                            const ts = Number(ev.timestamp_ms || 0);
                            const timeLabel = Number.isFinite(ts)
                              ? new Date(ts).toLocaleString()
                              : "-";
                            const dirLabel = String(ev.direction || "").toUpperCase();
                            return (
                              <div
                                key={String(ev.id)}
                                className="px-3 py-2 border-b border-border flex items-center justify-between gap-2"
                              >
                                <div className="text-[11px] text-muted-foreground">
                                  <div className="font-semibold">{dirLabel} EXIT</div>
                                  <div className="text-muted-foreground">{timeLabel}</div>
                                </div>
                                <button
                                  className="rounded-md px-2 py-1 text-xs bg-emerald-400/90 hover:bg-emerald-400 text-slate-900 font-semibold"
                                  onClick={() => {
                                    setPendingSignal({ event: ev, entryEvent: null });
                                    setConfirmOpen(true);
                                  }}
                                >
                                  Download
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <button
                      disabled={snapUploading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm bg-emerald-400/90 hover:bg-emerald-400 text-slate-900 font-semibold disabled:opacity-60"
                      onClick={async () => {
                        const ownershipId = signalIdParam || snapshotId;
                        await handleSnapshotDownload(ownershipId);
                      }}
                    >
                      <Download className="w-4 h-4" />
                      {snapUploading ? "Creating..." : "Download image"}
                    </button>

                    <button
                      disabled={snapUploading}
                      className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm border border-border bg-muted/50 hover:bg-muted disabled:opacity-60"
                      onClick={async () => {
                        setSnapUploading(true);
                        try {
                          const blob = await takeFullSnapshotBlob(); // ✅ snapshot

                          const { shareUrl } = await uploadAndCreateShareLink(blob, symbol, barInterval); // ✅ upload
                          setSnapUrl(shareUrl);

                          try {
                            await navigator.clipboard.writeText(shareUrl);
                          } catch (e) {
                            console.warn("Clipboard failed (mobile Safari likely):", e);
                          }
                        } catch (e) {
                          console.error("Snapshot/upload failed:", e);
                          alert("Snapshot failed");
                        } finally {
                          setSnapUploading(false);
                        }
                      }}

                    >
                      <Copy className="w-4 h-4" />
                      {snapUploading ? "Creating..." : "Copy share link"}
                    </button>

                    {snapUrl && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="text-[11px] text-muted-foreground mb-1">Share link</div>
                        <div className="text-xs break-all text-foreground">{snapUrl}</div>
                        <div className="mt-2 flex gap-2">
                          <button
                            className="flex-1 rounded-md px-2 py-1.5 text-xs bg-muted/50 hover:bg-muted border border-border"
                            onClick={() => window.open(snapUrl, "_blank")}
                          >
                            Open
                          </button>
                          <button
                            className="flex-1 rounded-md px-2 py-1.5 text-xs bg-muted/50 hover:bg-muted border border-border"
                            onClick={async () => navigator.clipboard.writeText(snapUrl)}
                          >
                            Copy again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>



          <div className="hidden md:flex items-center pointer-events-auto">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                차트 :
              </span>
              <ChartIntervalSelect active="10m" />
              <ChartSymbolSelect
                symbols={SYMBOLS}
                value={activeSymbol}
                onValueChange={setSymbol}
                disabled={SYMBOLS.length === 0}
              />

              <ChartSignalFilterBar
                tradingCategory={tradingCategoryFilter}
                onTradingCategoryChange={setTradingCategoryFilter}
                trendModes={trendModesFilter}
                onToggleTrendMode={toggleTrendModeFilter}
              />

              {/* Zoom */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  차트 확대축소 :
                </span>
                <button
                  onClick={() => handleZoom("in")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/80 text-xs text-foreground hover:border-foreground/40"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => handleZoom("out")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/80 text-xs text-foreground hover:border-foreground/40"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>

              {/* 여기서 줄을 강제로 바꾼다 — 기간 버튼이 우측 상단 캡쳐/전체화면 아이콘과
                  겹쳐서 깨지므로 항상 아랫줄에서 시작하게 한다. */}
              <div className="basis-full h-0" aria-hidden />

              {/* Timeframes */}
              <div className="flex items-center gap-2">
                {(["6H", "12H", "3D", "5D", "7D"] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeframeClick(tf)}
                    className={`px-4 py-1.5 text-xs rounded-full border transition
                      ${activeTf === tf
                        ? "bg-emerald-500 text-slate-900 border-emerald-500"
                        : "bg-card/80 text-foreground border-border hover:border-foreground/40"
                      }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>


              {/* Separator */}
              <div className="h-6 w-px bg-slate-700" />

              {/* Navigator */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={gotoStart}
                  className="h-8 w-8 text-foreground hover:text-foreground hover:bg-muted"
                  title="Go to start"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={pageLeft}
                  className="h-8 w-8 text-foreground hover:text-foreground hover:bg-muted"
                  title="Page left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={pageRight}
                  className="h-8 w-8 text-foreground hover:text-foreground hover:bg-muted"
                  title="Page right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={gotoEnd}
                  className="h-8 w-8 text-foreground hover:text-foreground hover:bg-muted"
                  title="Go to end"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted text-xs flex items-center justify-center"
                      title="Go to date"
                    >
                      go
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0 z-[10002]" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          void gotoDate(date);
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-end pointer-events-auto">
            {/* Separator */}
            <div className="w-full h-px bg-slate-700 mb-2" />
            {/* OHLC */}
            <div className="flex flex-nowrap items-center gap-2 text-xs lg:text-sm text-foreground">
              {ohlc ? (
                <>
                  {[
                    { label: "Open", value: ohlc.open },
                    { label: "High", value: ohlc.high },
                    { label: "Low", value: ohlc.low },
                    { label: "Close", value: ohlc.close },
                  ].map(({ label, value }) => (
                    <span
                      key={label}
                      className="font-semibold flex flex-row items-baseline gap-1"
                    >
                      <span className="uppercase tracking-wide text-[10px] opacity-70">
                        {label}
                      </span>
                      <span className="font-mono tabular-nums min-w-[80px] text-right">
                        {value}
                      </span>
                    </span>
                  ))}
                </>
              ) : (
                <span className="text-muted-foreground">데이터 없음</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:hidden pointer-events-auto">
            <div className="flex items-center gap-2 flex-wrap">
              <ChartIntervalSelect active="10m" />
              <ChartSymbolSelect
                symbols={SYMBOLS}
                value={activeSymbol}
                onValueChange={setSymbol}
                disabled={SYMBOLS.length === 0}
              />

              <ChartSignalFilterBar
                tradingCategory={tradingCategoryFilter}
                onTradingCategoryChange={setTradingCategoryFilter}
                trendModes={trendModesFilter}
                onToggleTrendMode={toggleTrendModeFilter}
              />

              {/* Zoom */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleZoom("in")}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/80 text-xs text-foreground hover:border-foreground/40 touch-manipulation"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => handleZoom("out")}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/80 text-xs text-foreground hover:border-foreground/40 touch-manipulation"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>

              {/* Timeframes */}
              {/* <div className="flex items-center gap-2 flex-wrap">
                    {([2, 4, 6, 12, 120] as const).map((h) => (
                      <button
                        key={h}
                        onClick={() => handleTimeframeClick(h)}
                        className={`h-7 px-2.5 text-xs rounded-full border transition touch-manipulation flex items-center justify-center
                          ${activeTf === h
                            ? "bg-emerald-500 text-slate-900 border-emerald-500"
                            : "bg-card/80 text-foreground border-border hover:border-foreground/40"
                          }`}
                      >
                        {h === 120 ? "5D" : `${h}H`}
                      </button>
                    ))}
                  </div> */}
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              <Button
                variant="ghost"
                size="icon"
                onClick={gotoStart}
                className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                title="Go to start"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={pageLeft}
                className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                title="Page left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={pageRight}
                className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                title="Page right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={gotoEnd}
                className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted touch-manipulation"
                title="Go to end"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-foreground hover:text-foreground hover:bg-muted touch-manipulation text-xs flex items-center justify-center"
                  title="Go to date"
                >
                  go
                </Button>
              </PopoverTrigger>
            </div>

            <div className="flex flex-col items-end">
              {/* Separator */}
              <div className="w-full h-px bg-slate-700 mb-2" />
              {/* OHLC */}
              <div className="flex flex-nowrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-foreground overflow-x-auto">
                {ohlc ? (
                  <>
                    {[
                      { label: "Open", value: ohlc.open },
                      { label: "High", value: ohlc.high },
                      { label: "Low", value: ohlc.low },
                      { label: "Close", value: ohlc.close },
                    ].map(({ label, value }) => (
                      <span
                        key={label}
                        className="font-semibold flex flex-col items-center sm:flex-row sm:items-baseline sm:gap-1 shrink-0"
                      >
                        <span className="uppercase tracking-wide text-[10px] opacity-70">
                          {label}
                        </span>
                        <span className="font-mono tabular-nums min-w-[60px] sm:min-w-[80px] text-center sm:text-right text-xs">
                          {value}
                        </span>
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-muted-foreground">데이터 없음</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Popover>
        </>}
        chart={<>
        <div
          ref={snapshotRef}
          className="flex flex-col flex-1 relative bg-background overflow-hidden"
        >

          <div className="relative flex-1">
            {/* trend bands */}
            <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-10" />

            {/* ✅ SVG signals (above chart) */}
            <div
              ref={signalSvgOverlayRef}
              className="pointer-events-none absolute inset-0 z-20"
            />

            {/* 모의매매 진입/청산 화살표 */}
            <div
              ref={mockTradeSvgOverlayRef}
              className="pointer-events-none absolute inset-0 z-20"
            />

            {/* chart canvas */}
            <div ref={containerRef} className="absolute inset-0 z-0" />

            {chartDataUnavailable && <TradeCaptureFallback tradeId={deeplinkTradeId} />}

            {SYMBOLS.length === 0 && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-background text-center">
                <p className="text-sm font-semibold text-foreground">Upgrade required</p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  Free plan does not include symbol market data. Choose Pro to view charts.
                </p>
              </div>
            )}

          </div>
        </div>
        {/* Bollinger toggle — 차트 위 오버레이 */}
        <div className="pointer-events-none absolute left-4 bottom-20 z-30">
          <button
            onClick={() => setShowBollinger((v: boolean) => !v)}
            className={`pointer-events-auto px-3 py-1.5 text-xs rounded-full border transition
              ${showBollinger
                ? "bg-sky-500 text-slate-900 border-sky-500"
                : "bg-card/80 text-foreground border-border hover:border-foreground/40"
              }`}
          >
            Bollinger
          </button>
        </div>
        </>}
        indicators={
        <div className="border-t border-border bg-background/90 px-4 py-2">
          <div className="flex flex-wrap items-center gap-4 text-xs text-foreground">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTrendShort}
                onChange={(e) => setShowTrendShort(e.target.checked)}
              />
              <span>Trend short (단기추세)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showTrendLong}
                onChange={(e) => setShowTrendLong(e.target.checked)}
              />
              <span>Trend long (장기추세)</span>
            </label>

          </div>
        </div>
        }
        positions={<>
          <MockPositionsTable
            title="진입 중인 모의매매 포지션"
            hint="청산 시 아래 종료 내역에 순차 기록됩니다."
            rows={mockPositions.open}
            emptyLabel="진입 중인 포지션이 없습니다."
            livePrices={livePriceMap}
            onSymbolClick={handleMockPositionSymbolClick}
            activeSymbol={activeSymbol}
            onCloseAll={handleCloseAllMockPositions}
            closingAll={closingAllMock}
          />
          <MockPositionsTable
            title="종료된 모의매매 포지션"
            hint="최근 종료 순으로 기록됩니다."
            rows={mockPositions.closed}
            emptyLabel="종료된 포지션이 없습니다."
            onSymbolClick={handleMockPositionSymbolClick}
          />
        </>}
        sidebar={<>
          <div className="text-xs font-bold tracking-wide text-muted-foreground">현재 종목 시그널</div>
          <ChartSignalCard
            symbol={activeSymbol}
            barInterval={barInterval}
            direction={latestSignal.direction}
            entryPrice={latestSignal.price}
            confidencePct={latestSignal.confidence}
          />

          <SimulatorSettingsPanel />

          <div className="mt-1 text-xs font-bold tracking-wide text-muted-foreground">모의매매</div>
          {mockPhase === "exit" && !mockExitLocked ? (
            <MockTradePositionCard
              symbol={activeSymbol}
              direction={mockDirection}
              entryPrice={mockEntryPrice}
              exitReferencePrice={mockExitReferencePrice}
              profitPct={mockProfitPct}
              remainingPct={remainingPct}
              realizedPnlUsd={realizedPnlUsd}
              exitLocked={mockExitLocked}
              saving={mockSaving}
              lastPrice={lastPrice}
              onAddEntry={() => handleAddEntry()}
              onPartialClose={(pct) => handlePartialClose(pct)}
              onCloseAll={handleMockExit}
            />
          ) : (
            <MockTradeEntryPanel
              symbol={activeSymbol}
              lastPrice={lastPrice}
              pct={simPct}
              leverage={simLeverage}
              onEnter={handleSidebarEntry}
              disabled={!isAuthenticated || mockSaving || !lastPrice}
              disabledReason={
                !isAuthenticated ? "로그인 후 모의매매를 시작할 수 있습니다." : undefined
              }
            />
          )}

          <MockTradeHelp />
        </>}
      />

      {initialLoading && (
        <div className="absolute inset-0 z-40 bg-background/90">
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            차트를 불러오는 중입니다...
          </div>
        </div>
      )}
      {snapUploading && (
        <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center">
          <div className="flex items-center gap-2 text-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            스냅샷 다운로드 중...
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={wrapperClassName}>{renderChartView()}</div>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingSignal(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>스냅샷 다운로드</DialogTitle>
            <DialogDescription>선택한 종료 시그널 스냅샷을 다운로드할까요?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirmDownload}>다운로드</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {autoDownloadSrc && (
        <iframe
          key={autoDownloadKey}
          title="profit-snapshot-download"
          src={autoDownloadSrc}
          style={{ display: "none" }}
        />
      )}
      <div
        style={{
          position: "fixed",
          left: -99999,
          top: -99999,
          width: 1280,
          height: 720,
          pointerEvents: "none",
          opacity: 1,
        }}
      >
        <div ref={posterRef} style={{ width: "100%", height: "100%" }}>
          {posterItem && (
            <ProfitSnapshotTemplate
              item={posterItem}
              chartImageUrl={posterChartUrl ?? undefined}
              imageLink={posterVerifyUrl ?? undefined}
              owner={posterOwner ?? undefined}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default Chart10m;
