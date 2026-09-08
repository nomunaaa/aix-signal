// src/pages/echart/useMockTrade.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { UTCTimestamp } from "lightweight-charts";
import { resolveChartBucketMs } from "./constants";
import type { MockTradeFillPoint } from "./types";

function alignToCandleBucket(ms: number, barInterval: string): UTCTimestamp {
  const bucketMs = resolveChartBucketMs(barInterval);
  return (Math.floor(ms / bucketMs) * (bucketMs / 1000)) as UTCTimestamp;
}

type MockPhase = "entry" | "exit";
type MockDirection = "long" | "short";

type UseMockTradeArgs = {
  symbol: string;
  lastPrice: number | null;
  lastCandleTime: UTCTimestamp | null; // ✅ add
  isAuthenticated: boolean;
  /** 새로고침 시 저장된 진입 시각을 캔들 봉에 정렬하기 위해 필요 (예: "1m", "10m"). */
  barInterval: string;
};

export function useMockTrade({
  symbol,
  lastPrice,
  lastCandleTime,
  isAuthenticated,
  barInterval,
}: UseMockTradeArgs) {
  const { user } = useAuth();

  const [mockOpen, setMockOpen] = useState(false);
  const [mockPhase, setMockPhase] = useState<MockPhase>("entry");
  const [mockDirection, setMockDirection] = useState<MockDirection>("long");

  const [mockEntryPrice, setMockEntryPrice] = useState<number | null>(null);
  const [mockExitPrice, setMockExitPrice] = useState<number | null>(null);
  const [mockExitLocked, setMockExitLocked] = useState(false);

  const [mockEntryAt, setMockEntryAt] = useState<number | null>(null);
  const [mockExitAt, setMockExitAt] = useState<number | null>(null);

  // ✅ candle times for chart markers (must match series bar time)
  const [mockEntryCandleTime, setMockEntryCandleTime] = useState<UTCTimestamp | null>(null);
  const [mockExitCandleTime, setMockExitCandleTime] = useState<UTCTimestamp | null>(null);

  const [mockSaving, setMockSaving] = useState(false);
  const [tradeId, setTradeId] = useState<string | null>(null);

  // 분할진입/분할청산 상태 — remainingPct가 0에 닿으면 포지션이 완전히 닫힌다.
  const [remainingPct, setRemainingPct] = useState(100);
  const [realizedPnlUsd, setRealizedPnlUsd] = useState(0);

  // 체결 내역(mock_trade_fills 1:1) — 차트 화살표+라벨은 이 배열 전체를 그린다.
  const [fills, setFills] = useState<MockTradeFillPoint[]>([]);

  const exitingRef = useRef(false);

  // lastCandleTime은 봉(bar)이 바뀔 때마다 갱신되는 값이라, 아래 "기존 열린 포지션
  // 로드" effect의 의존성에 그대로 두면 캔들이 바뀔 때마다 effect가 재실행되어
  // resetMock() + 재조회가 일어난다. 그 사이에 handleMockEntry가 막 커밋한
  // 포지션을, 인서트 이전 시점에 시작된 stale 조회 결과("포지션 없음")가 되돌려
  // 버리는 레이스 컨디션이 있었다 — 새 종목 진입 직후 수익률/수익금이 비어 보이다가
  // 다른 차트로 이동 후 재마운트해야만 정상 표시되는 원인. ref로 최신값만 참조하고
  // effect 의존성에서는 제외한다.
  const lastCandleTimeRef = useRef<UTCTimestamp | null>(lastCandleTime);
  useEffect(() => {
    lastCandleTimeRef.current = lastCandleTime;
  }, [lastCandleTime]);

  const resetMock = useCallback((opts?: { keepDirection?: boolean }) => {
    setMockPhase("entry");
    if (!opts?.keepDirection) setMockDirection("long");

    setMockEntryPrice(null);
    setMockExitPrice(null);
    setMockExitLocked(false);

    setMockEntryAt(null);
    setMockExitAt(null);

    setMockEntryCandleTime(null);
    setMockExitCandleTime(null);

    setMockSaving(false);
    setTradeId(null);

    setRemainingPct(100);
    setRealizedPnlUsd(0);
    setFills([]);
  }, []);

  // 🔐 Load any existing OPEN trade
  useEffect(() => {
    if (!user || !symbol || !isAuthenticated) {
      resetMock();
      setMockOpen(false);
      return;
    }

    // 심볼이 바뀌면 이전 종목의 tradeId/진입가/방향이 남아있는 채로 새 종목의
    // lastPrice가 곧바로 반영되어, 아래 비동기 조회가 끝나기 전까지 두 종목이
    // 섞인 손익률(잘못된 tradeId로 청산 가능)이 표시되는 레이스 컨디션이 있었다.
    // 조회 결과를 기다리기 전에 먼저 동기적으로 리셋한다.
    resetMock({ keepDirection: true });
    setMockOpen(false);

    let cancelled = false;

    const loadOpenTrade = async () => {
      try {
        const { data, error } = await supabase
          .from("mock_trades")
          .select("*")
          .eq("user_id", user.id)
          .eq("symbol", symbol)
          .is("exit_price", null)
          .order("entry_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("[mock trade] load error", error);
          resetMock({ keepDirection: true });
          setMockOpen(false);
          return;
        }

        if (data) {
          setTradeId(data.id);
          setMockOpen(true);
          setMockPhase("exit");
          setMockDirection((data.direction as MockDirection) || "long");

          setMockEntryPrice(data.avg_entry_price ?? data.entry_price ?? null);
          setMockEntryAt(data.entry_at ? Date.parse(data.entry_at) : null);

          setRemainingPct(data.remaining_pct ?? 100);
          setRealizedPnlUsd(data.realized_pnl_usd ?? 0);

          // 새로고침 시 실제 진입 시각을 캔들 봉 경계에 맞춰 복원한다.
          // (이전에는 lastCandleTime, 즉 "현재 최신 캔들"을 그대로 써서 화살표가
          // 항상 최신 봉 위치에 잘못 표시되는 버그가 있었다.)
          const entryMs = data.entry_at ? Date.parse(data.entry_at) : null;
          const bucketMs = resolveChartBucketMs(barInterval);
          const alignedEntryTime =
            entryMs != null && Number.isFinite(entryMs)
              ? (Math.floor(entryMs / bucketMs) * (bucketMs / 1000) as UTCTimestamp)
              : null;
          setMockEntryCandleTime(alignedEntryTime ?? lastCandleTimeRef.current ?? null);

          setMockExitPrice(null);
          setMockExitAt(null);
          setMockExitLocked(false);
          setMockExitCandleTime(null);

          // 새로고침 후에도 진입 외의 체결(추가매수/분할청산)이 차트에 그대로 남도록
          // mock_trade_fills를 다시 불러온다.
          const { data: fillRows, error: fillsError } = await supabase
            .from("mock_trade_fills")
            .select("fill_type, price, quantity_pct, filled_at")
            .eq("trade_id", data.id)
            .order("filled_at", { ascending: true });

          if (cancelled) return;

          if (fillsError) {
            console.error("[mock trade] fills load error", fillsError);
            setFills([]);
          } else {
            setFills(
              (fillRows ?? []).map((row) => ({
                time: alignToCandleBucket(Date.parse(row.filled_at), barInterval),
                price: row.price,
                fillType: row.fill_type as MockTradeFillPoint["fillType"],
                quantityPct: row.quantity_pct ?? undefined,
              })),
            );
          }
        } else {
          resetMock({ keepDirection: true });
          setMockOpen(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[mock trade] load exception", err);
          resetMock({ keepDirection: true });
          setMockOpen(false);
        }
      }
    };

    loadOpenTrade();

    return () => {
      cancelled = true;
    };
  }, [user?.id, symbol, isAuthenticated, resetMock, user, barInterval]);

  useEffect(() => {
    if (!isAuthenticated) {
      resetMock();
      setMockOpen(false);
    }
  }, [isAuthenticated, resetMock]);

  const toggleMockPanel = useCallback(() => {
    if (!isAuthenticated) return;

    setMockOpen((prev) => {
      const next = !prev;
      if (next) {
        if (!tradeId) {
          resetMock({ keepDirection: true });
          setMockPhase("entry");
        }
      }
      return next;
    });
  }, [isAuthenticated, tradeId, resetMock]);

  // 👉 ENTRY — overridePrice가 있으면 (차트 클릭) 그 가격으로, 없으면 현재가로 진입한다.
  // direction은 state(mockDirection)가 아닌 인자로 받는다 — setMockDirection() 직후
  // 같은 틱에서 이 함수를 호출하면 리렌더 전이라 아직 갱신되지 않은 이전 방향을
  // 클로저로 캡처해 버리는 레이스 컨디션이 있었다(방향 전환 후 첫 진입이 이전
  // 방향으로 잘못 기록됨).
  const handleMockEntry = useCallback(async (direction: MockDirection, overridePrice?: number, capital = 1000, leverage = 10) => {
    if (!isAuthenticated || !user?.id) return;
    const entryPrice = overridePrice ?? lastPrice;
    if (!entryPrice) return;
    if (mockSaving) return;

    const now = Date.now();
    setMockSaving(true);

    // ✅ capture candle time exactly when clicking
    const entryCandleT = lastCandleTime ?? (Math.floor(now / 1000) as UTCTimestamp);

    try {
      const { data, error } = await supabase
        .from("mock_trades")
        .insert({
          user_id: user.id,
          symbol,
          direction,
          entry_price: entryPrice,
          exit_price: null,
          entry_at: new Date(now).toISOString(),
          exit_at: null,
          profit_pct: null,
          capital,
          base_capital: capital,
          leverage,
          status: "open",
          stream: barInterval === "10m" ? "WAVE" : "PULSE",
        })
        .select("id, entry_at, direction, entry_price")
        .single();

      if (error) {
        console.error("[mock trade] insert error", error);
        toast({
          title: "모의매매 진입 실패",
          description: error.message || "진입 처리에 실패했습니다. 다시 시도해주세요.",
          variant: "destructive",
        });
        return;
      }

      const { error: fillError } = await supabase.from("mock_trade_fills").insert({
        trade_id: data.id,
        user_id: user.id,
        fill_type: "entry",
        price: entryPrice,
        quantity_pct: 100,
      });
      if (fillError) console.error("[mock trade] entry fill error", fillError);

      setTradeId(data.id);
      setMockOpen(true);
      setMockPhase("exit");
      setMockDirection((data.direction as MockDirection) || direction);

      setMockEntryPrice(data.entry_price ?? entryPrice);
      setMockEntryAt(data.entry_at ? Date.parse(data.entry_at) : now);

      setRemainingPct(100);
      setRealizedPnlUsd(0);

      setMockEntryCandleTime(entryCandleT);

      setMockExitPrice(null);
      setMockExitAt(null);
      setMockExitLocked(false);
      setMockExitCandleTime(null);

      setFills([{ time: entryCandleT, price: data.entry_price ?? entryPrice, fillType: "entry" }]);
    } catch (err) {
      console.error("[mock trade] insert exception", err);
      toast({
        title: "모의매매 진입 실패",
        description: "진입 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setMockSaving(false);
    }

  }, [
    isAuthenticated,
    user?.id,
    lastPrice,
    symbol,
    mockSaving,
    lastCandleTime,
    user,
    barInterval,
  ]);

  // 공통: 체결 1건을 mock_trade_fills에 기록 (진입/추가/분할청산/전량청산 공용)
  const insertFill = useCallback(async (
    fillType: "add" | "partial_exit" | "exit",
    price: number,
    quantityPct: number
  ) => {
    if (!user?.id || !tradeId) return false;
    const { error } = await supabase.from("mock_trade_fills").insert({
      trade_id: tradeId,
      user_id: user.id,
      fill_type: fillType,
      price,
      quantity_pct: quantityPct,
    });
    if (error) {
      console.error(`[mock trade] ${fillType} fill error`, error);
      toast({
        title: "모의매매 처리 실패",
        description: error.message || "체결 기록에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  }, [user?.id, tradeId]);

  // 👉 ADD ENTRY (Scale In) — 진입가와 동일한 방향으로 물량을 추가한다.
  const handleAddEntry = useCallback(async (overridePrice?: number) => {
    const price = overridePrice ?? lastPrice;
    if (!price || mockSaving) return;
    setMockSaving(true);
    const addCandleT = lastCandleTime ?? (Math.floor(Date.now() / 1000) as UTCTimestamp);
    try {
      const ok = await insertFill("add", price, 100);
      if (!ok) return;
      const { data, error } = await supabase
        .from("mock_trades")
        .select("avg_entry_price")
        .eq("id", tradeId!)
        .single();
      if (error) {
        console.error("[mock trade] add entry refetch error", error);
        toast({
          title: "추가진입 확인 실패",
          description: "체결은 되었지만 최신 평균단가를 불러오지 못했습니다.",
          variant: "destructive",
        });
        return;
      }
      if (data?.avg_entry_price) setMockEntryPrice(data.avg_entry_price);
      setFills((prev) => [...prev, { time: addCandleT, price, fillType: "add" }]);
      toast({ description: `추가진입 완료 · 평균단가 ${data?.avg_entry_price ?? price}` });
    } finally {
      setMockSaving(false);
    }
  }, [lastPrice, mockSaving, insertFill, tradeId, lastCandleTime]);

  // 👉 PARTIAL CLOSE — remainingPct 중 일부(quantityPct, 예: 50)만 청산한다.
  const handlePartialClose = useCallback(async (quantityPct: number, overridePrice?: number) => {
    const price = overridePrice ?? lastPrice;
    if (!price || mockSaving) return;
    setMockSaving(true);
    const partialCandleT = lastCandleTime ?? (Math.floor(Date.now() / 1000) as UTCTimestamp);
    try {
      const ok = await insertFill("partial_exit", price, quantityPct);
      if (!ok) return;
      const { data } = await supabase
        .from("mock_trades")
        .select("remaining_pct, realized_pnl_usd, status")
        .eq("id", tradeId!)
        .single();
      setFills((prev) => [
        ...prev,
        { time: partialCandleT, price, fillType: "partial_exit", quantityPct },
      ]);
      if (data?.status === "closed") {
        // 분할청산이 마지막 잔여분을 모두 소진한 경우 — 전체청산과 동일하게 청산 화살표를 남긴다.
        setRemainingPct(0);
        setRealizedPnlUsd(data.realized_pnl_usd ?? 0);
        setMockExitPrice(price);
        setMockExitAt(Date.now());
        setMockExitLocked(true);
        setMockExitCandleTime(partialCandleT);
        toast({ description: `전량 청산 완료 · 확정손익 $${(data.realized_pnl_usd ?? 0).toFixed(2)}` });
      } else if (data) {
        setRemainingPct(data.remaining_pct ?? 0);
        setRealizedPnlUsd(data.realized_pnl_usd ?? 0);
        toast({ description: `${quantityPct}% 청산 완료 · 잔여 ${data.remaining_pct ?? 0}%` });
      }
    } finally {
      setMockSaving(false);
    }
  }, [lastPrice, mockSaving, insertFill, tradeId, lastCandleTime]);

  // 👉 CLOSE ALL — 남은 잔여 비율 전량을 청산한다.
  // 차트에는 청산 화살표를 계속 남겨 두되(mockExitLocked), 사이드바는 mockExitLocked 기준으로
  // 즉시 진입 화면으로 돌아가 다음 매매를 바로 시작할 수 있다 — 새 진입 시 handleMockEntry가
  // 이 청산 상태를 자연스럽게 지우고 새 진입 화살표로 교체한다.
  const handleCloseAll = useCallback(async (overridePrice?: number) => {
    const price = overridePrice ?? lastPrice;
    if (!price || mockSaving || !remainingPct) return;
    setMockSaving(true);
    const exitCandleT = lastCandleTime ?? (Math.floor(Date.now() / 1000) as UTCTimestamp);
    try {
      const ok = await insertFill("exit", price, remainingPct);
      if (!ok) return;
      const { data } = await supabase
        .from("mock_trades")
        .select("realized_pnl_usd")
        .eq("id", tradeId!)
        .single();
      setRemainingPct(0);
      setRealizedPnlUsd(data?.realized_pnl_usd ?? 0);
      setMockExitPrice(price);
      setMockExitAt(Date.now());
      setMockExitLocked(true);
      setMockExitCandleTime(exitCandleT);
      setFills((prev) => [...prev, { time: exitCandleT, price, fillType: "exit" }]);
      toast({ description: `전체청산 완료 · 확정손익 $${(data?.realized_pnl_usd ?? 0).toFixed(2)}` });
    } finally {
      setMockSaving(false);
    }
  }, [lastPrice, mockSaving, remainingPct, insertFill, tradeId, lastCandleTime]);

  // 👉 EXIT (레거시 단일 청산 — remainingPct 전량을 즉시 청산한다)
  const handleMockExit = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    if (!lastPrice || !mockEntryPrice || !tradeId) return;
    if (mockExitLocked || mockSaving || exitingRef.current) return;

    exitingRef.current = true;
    await handleCloseAll();
    exitingRef.current = false;
  }, [
    isAuthenticated,
    user?.id,
    lastPrice,
    mockEntryPrice,
    tradeId,
    mockExitLocked,
    mockSaving,
    handleCloseAll,
    user,
  ]);

  const handleMockClose = useCallback(() => {
    setMockOpen(false);
    if (mockExitLocked) {
      resetMock({ keepDirection: true });
    }
  }, [mockExitLocked, resetMock]);

  const mockExitReferencePrice = useMemo(() => {
    if (mockExitLocked && mockExitPrice !== null) return mockExitPrice;
    return lastPrice ?? null;
  }, [mockExitLocked, mockExitPrice, lastPrice]);

  const mockProfitPct = useMemo(() => {
    if (mockEntryPrice === null || mockExitReferencePrice === null) return null;
    return (
      ((mockDirection === "long"
        ? mockExitReferencePrice - mockEntryPrice
        : mockEntryPrice - mockExitReferencePrice) /
        mockEntryPrice) *
      100
    );
  }, [mockEntryPrice, mockExitReferencePrice, mockDirection]);

  return {
    mockOpen,
    mockPhase,
    mockDirection,
    setMockDirection,

    mockEntryPrice,
    mockExitPrice,
    mockExitLocked,

    mockEntryAt,
    mockExitAt,

    mockEntryCandleTime,
    mockExitCandleTime,

    mockSaving,
    tradeId,

    remainingPct,
    realizedPnlUsd,
    fills,

    mockExitReferencePrice,
    mockProfitPct,

    handleMockEntry,
    handleMockExit,
    handleAddEntry,
    handlePartialClose,
    handleCloseAll,
    handleMockClose,
    toggleMockPanel,
    resetMock,
  };
}
