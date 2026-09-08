'use client';

import { PUBLIC_BRAND_LOGO } from "@/lib/brand-logos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SnapshotItem } from "@/types/snapshot";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "@/lib/navigation-compat";

import { useSnapshotDownloader } from "@/hooks/useSnapshotDownloader";
import { supabase } from "@/integrations/supabase/client";
import { requestChartSnapshot } from "@/lib/chartSnapshotHost";
import { cn } from "@/lib/utils";
import html2canvas from "html2canvas";
import { waitForImages } from "@/lib/waitForImages";
import {
  Calendar,
  Camera,
  Download,
  Eye,
  Filter,
  Grid,
  Heart,
  List,
  Loader2,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

type FilterType = "all" | "profit" | "loss";
type ViewType = "grid" | "list";

const PAGE_SIZE = 12;

// ✅ 정책/로직 고정값
const BASE_CAPITAL = 100_000;
const ENTRY_SIZE_PCT = 0.03; // 3%
const VIRTUAL_MARGIN = BASE_CAPITAL * ENTRY_SIZE_PCT; // $3,000
const LEVERAGE = 4;

type RawSignalCycle = {
  id: string;
  symbol: string;
  side: "LONG" | "SHORT" | string | null;
  entry_price: number | string | null;
  exit_price: number | string | null;
  entry_time: string | null;
  exit_time: string | null;
  barinterval: string | null;
  realized_pnl_pct?: number | string | null;
};

 
const toNum = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtYYYYMMDD = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toISOString().slice(0, 10);
};

const _toMs = (value: string | null): number => {
  if (!value) return NaN;
  const trimmed = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number.parseFloat(trimmed);
    if (!Number.isFinite(num)) return NaN;
    return num >= 10_000_000_000 ? Math.round(num) : Math.round(num * 1000);
  }
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? ms : NaN;
};

const calcRoePct = (side: string | null, entry: number, exit: number) => {
  if (!entry || !exit) return 0;
  const s = String(side ?? "").toUpperCase();
  if (s === "SHORT") return ((entry - exit) / entry) * 100 * LEVERAGE;
  return ((exit - entry) / entry) * 100 * LEVERAGE; // default LONG
};

const calcPnlDollarFromRoePct = (roePct: number) => VIRTUAL_MARGIN * (roePct / 100);

const clampLiqRoe = (roePct: number) => Math.max(roePct, -100);

function safeDate(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function fmtMDHM_UTC8(d: Date | null) {
  if (!d) return "-";
  const shifted = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

function fmtDurationHM(seconds: number) {
  const dur = Math.max(0, seconds || 0);
  const h = Math.floor(dur / 3600);
  const m = Math.floor((dur % 3600) / 60);
  return `${String(h).padStart(2, "0")}H ${String(m).padStart(2, "0")}M`;
}

function fmtSymbolPair(symbol: string) {
  if (!symbol) return "-";
  if (symbol.endsWith("USDT")) return `${symbol.replace("USDT", "")}USDT`;
  return symbol;
}

function fmtPairLabel(symbol: string) {
  if (!symbol) return "-";
  if (symbol.endsWith("USDT")) return `${symbol.replace("USDT", "")}/USDT`;
  return symbol;
}

const MiniChart = ({ isProfit }: { isProfit: boolean }) => {
  const points = isProfit
    ? "0,40 20,35 40,30 60,25 80,15 100,10"
    : "0,10 20,15 40,25 60,30 80,35 100,40";

  return (
    <svg viewBox="0 0 100 50" className="w-full h-12">
      <polyline
        points={points}
        fill="none"
        stroke={isProfit ? "hsl(var(--semantic-bull))" : "hsl(var(--semantic-bear))"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <linearGradient id={`grad-${isProfit}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop
          offset="0%"
          stopColor={isProfit ? "hsl(var(--semantic-bull))" : "hsl(var(--semantic-bear))"}
          stopOpacity="0.3"
        />
        <stop
          offset="100%"
          stopColor={isProfit ? "hsl(var(--semantic-bull))" : "hsl(var(--semantic-bear))"}
          stopOpacity="0"
        />
      </linearGradient>
      <polygon points={`${points} 100,50 0,50`} fill={`url(#grad-${isProfit})`} />
    </svg>
  );
};

export function ProfitSnapshotTemplate({
  item,
  chartImageUrl,
  imageLink,
  owner,
}: {
  item: SnapshotItem;
  chartImageUrl?: string | null;
  imageLink?: string | null;
  owner?: { name?: string; email?: string; avatarUrl?: string | null } | null;
}) {
  const isWin = item.roePct >= 0;
  const primary = isWin ? "#26A69A" : "#EF5350";

  // background palette (matches your reference vibe)
  const pageBg = "#0B0F14";
  const chartBg = "#1B1F1C";
  const panelBg = "#0D1C2B";

  const pairText = fmtPairLabel(item.symbol);
  const _symbolText = fmtSymbolPair(item.symbol);
  const directionText = item.direction === "long" ? "LONG" : "SHORT";

  const roe = item.roePct;
  const pnl$ = item.pnlAmount;

  const entryDT = safeDate(item.entryTimeISO);
  const exitDT = safeDate(item.exitTimeISO);
  const durText = fmtDurationHM(item.durationSec);

  const pnlText = `${pnl$ >= 0 ? "+" : "-"}$${Math.abs(pnl$).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;

  const roeText = `${roe >= 0 ? "+" : ""}${roe.toFixed(2)}%`;

  const qrValue = (imageLink && imageLink.trim()) || "";
  const showOwnership = Boolean(qrValue || owner?.avatarUrl || owner?.email || owner?.name);
  const isPinataVerified = Boolean(qrValue);

  // 16:9 output (keep)
  const W = 1280;
  const H = 720;

  // ✅ IMPORTANT: chart must not be squeezed.
  // We keep the left side EXACTLY sized and let the image "contain" without stretching.
  // Also: we do NOT add extra padding inside the chart area beyond the border inset.
  return (
    <div
      style={{
        width: W,
        height: H,
        background: pageBg,
        color: "#FFFFFF",
        position: "relative",
        overflow: "hidden",
        fontFamily: "Pretendard, Noto Sans, system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {isPinataVerified ? (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            zIndex: 50,

            height: 28,                 // ✅ fixed pill height
            padding: "0 14px",          // ✅ horizontal padding only
            borderRadius: 999,

            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",

            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.35,
            lineHeight: 1,              // ✅ critical for vertical centering
            whiteSpace: "nowrap",

            // ✅ micro baseline correction (helps in html2canvas)
            transform: "translateY(-0.5px)",

            color: "#0B2F1B",
            background: "linear-gradient(180deg, #34D399, #10B981)",
            boxShadow: "0 8px 18px rgba(16,185,129,0.35)",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          PINATA VERIFIED
        </div>
      ) : null}
      {/* subtle vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(900px 700px at 15% 20%, rgba(255,255,255,0.06), transparent 60%), radial-gradient(800px 600px at 85% 30%, rgba(255,255,255,0.05), transparent 62%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "4fr 1fr", // ✅ 80/20 layout
        }}
      >
        {/* =========================
            LEFT: chart area
            ========================= */}
        <div style={{ background: chartBg, position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 12,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              overflow: "hidden",
              background: "rgba(0,0,0,0.15)",
              boxShadow: `0 0 24px ${primary}33`,
            }}
          >
            {chartImageUrl ? (
              <img
                src={chartImageUrl}
                alt="Chart"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain", // ✅ never stretch
                  objectPosition: "center",
                  display: "block",
                  filter: "contrast(1.02) saturate(1.05)",
                }}
              />
            ) : (
              <>
                {/* fallback grid */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                    backgroundSize: "56px 56px",
                    opacity: 0.22,
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* =========================
            RIGHT: info panel
            ✅ FIXED LAYOUT (no clipping)
            ========================= */}
        <div
          style={{
            background: panelBg,
            position: "relative",
            padding: "18px 16px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

              <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: 0.4 }}>
                <img
                  src={PUBLIC_BRAND_LOGO.dark}
                  alt="AiXSignal"
                  crossOrigin="anonymous"
                  style={{
                    height: 28,
                    width: "auto",
                    display: "block",
                    maxWidth: 160,
                  }}
                />
              </div>
            </div>
          </div>

          {/* direction line */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, opacity: 0.92, fontWeight: 900, letterSpacing: 0.3 }}>
              <span style={{ color: primary }}>{directionText}</span>
              <span style={{ opacity: 0.45, margin: "0 12px" }}>|</span>
              <span style={{ fontWeight: 900 }}>{LEVERAGE}X</span>
              <span style={{ opacity: 0.45, margin: "0 12px" }}>|</span>
              <span style={{ fontWeight: 900 }}>{pairText.replace("/", "")}</span>
            </div>
            {/* <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, letterSpacing: 0.3 }}>{symbolText}</div> */}
          </div>

          {/* big profit */}
          <div>
            <div
              style={{
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 44,
                fontWeight: 1000,
                color: primary,
                lineHeight: 1.05,
              }}
            >
              {pnlText}
            </div>

            <div
              style={{
                marginTop: 10,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontSize: 26,
                fontWeight: 900,
                opacity: 0.96,
              }}
            >
              {roeText}
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
              Based on $100k Account (3% Entry)
            </div>
          </div>

          {/* bottom zone: stats + qr/owner */}
          <div style={{ display: "grid", gridTemplateRows: "auto auto", rowGap: 12, marginTop: "auto" }}>
            {/* ✅ Stat cards fixed height (prevents giant rectangles + keeps QR visible) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                height: 172,
              }}
            >
              {[
                { label: "Duration", value: durText },
                { label: "Direction", value: item.direction === "long" ? "LONG ↑" : "SHORT ↓" },
                { label: "Entry Time", value: fmtMDHM_UTC8(entryDT) },
                { label: "Exit Time", value: fmtMDHM_UTC8(exitDT) },
              ].map((x) => (
                <div
                  key={x.label}
                  style={{
                    borderRadius: 12,
                    padding: "10px 8px",
                    background: "linear-gradient(180deg, rgba(38,166,154,0.92), rgba(38,166,154,0.76))",
                    border: "1px solid rgba(255,255,255,0.12)",
                    height: 80,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.95, textAlign: "center" }}>{x.label}</div>
                  <div
                    style={{
                      textAlign: "center",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 16,
                      fontWeight: 1000,
                      letterSpacing: 0.4,
                      lineHeight: 1.05,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {x.value}
                  </div>
                </div>
              ))}
            </div>

            {/* ✅ QR + owner reserved space (no clipping) */}
            {showOwnership ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 120,
                  gap: 10,
                }}
              >
                {/* QR */}
                {qrValue ? (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: 10,
                      background: "#FFFFFF",
                      padding: 8,
                      boxSizing: "border-box",
                      boxShadow: "0 14px 38px rgba(0,0,0,0.25)",
                    }}
                  >
                    <QRCodeSVG value={qrValue} size={80} includeMargin={false} />
                  </div>
                ) : (
                  <div />
                )}

                {/* owner */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 12, opacity: 0.55, fontWeight: 800 }}>Owned by:</div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 1000,
                        letterSpacing: 0.3,
                        maxWidth: 170,
                        whiteSpace: "normal",
                        wordBreak: "break-all",
                      }}
                    >
                      {owner?.email || owner?.name || "unknown"}
                    </div>
                  </div>

                  {/* tiny link preview (optional) */}
                  {imageLink ? (
                    <div
                      style={{
                        maxWidth: 170,
                        fontSize: 12,
                        opacity: 0.45,
                        textAlign: "right",
                        whiteSpace: "normal",
                        wordBreak: "break-all",
                      }}
                    >
                      {imageLink}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {/* vertical separator line */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 1,
              background: "rgba(255,255,255,0.10)",
              opacity: 0.9,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const SnapshotCard = ({
  snapshot,
  viewType,
  onDownload,
  onShare,
  isDownloading,
}: {
  snapshot: SnapshotItem;
  viewType: ViewType;
  onDownload: (item: SnapshotItem) => void;
  onShare: (item: SnapshotItem) => void;
  isDownloading: boolean;
}) => {
  const isProfit = snapshot.roePct >= 0;

  if (viewType === "list") {
    return (
      <Card className="glass hover:border-primary/50 transition-all">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 w-40">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                {snapshot.symbol.replace("USDT", "").slice(0, 3)}
              </div>
              <div>
                <div className="font-bold">{snapshot.symbol.replace("USDT", "")}</div>
                <div className="text-xs text-muted-foreground">{snapshot.date}</div>
              </div>
            </div>

            <div className="w-24 hidden md:block">
              <MiniChart isProfit={isProfit} />
            </div>


            <div className="flex-1 text-right">
              <div
                className={cn(
                  "text-xl font-bold font-mono",
                  isProfit ? "text-semantic-bull" : "text-semantic-bear"
                )}
              >
                {isProfit ? "+" : ""}
                {snapshot.roePct.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">
                ${Math.abs(snapshot.pnlAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" /> {snapshot.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" /> {snapshot.likes}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onShare(snapshot)}
                aria-label="share"
                disabled={isDownloading}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDownload(snapshot)}
                aria-label="download"
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass hover:border-primary/50 transition-all overflow-hidden group">
      <div className="relative h-32 bg-gradient-to-b from-muted/50 to-transparent p-4">
        <MiniChart isProfit={isProfit} />

        <Badge
          variant="outline"
          className={cn(
            "absolute top-2 left-2 text-xs",
            isProfit ? "border-semantic-bull text-semantic-bull" : "border-semantic-bear text-semantic-bear"
          )}
        >
          {snapshot.direction === "long" ? "LONG" : "SHORT"}
        </Badge>

        <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
          {snapshot.period}d
        </Badge>

      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
              {snapshot.symbol.replace("USDT", "").slice(0, 3)}
            </div>
            <div>
              <div className="font-bold">{snapshot.symbol.replace("USDT", "")}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {snapshot.date}
              </div>
            </div>
          </div>
          <div className={cn("text-2xl font-bold font-mono", isProfit ? "text-semantic-bull" : "text-semantic-bear")}>
            {isProfit ? "+" : ""}
            {snapshot.roePct.toFixed(2)}%
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/30 rounded px-2 py-1">
            <div className="text-xs text-muted-foreground">진입가</div>
            <div className="font-mono">${snapshot.entryPrice.toLocaleString()}</div>
          </div>
          <div className="bg-muted/30 rounded px-2 py-1">
            <div className="text-xs text-muted-foreground">청산가</div>
            <div className="font-mono">${snapshot.exitPrice.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {snapshot.views}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" /> {snapshot.likes}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onShare(snapshot)}
              aria-label="share"
              disabled={isDownloading}
            >
              <Share2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDownload(snapshot)}
              aria-label="download"
              disabled={isDownloading}
            >
              {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function EarningsSnapshots() {
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState<FilterType>("all");
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [page, setPage] = useState(1);
  const [loadingAll, setLoadingAll] = useState(true);

  const [allItems, setAllItems] = useState<SnapshotItem[]>([]);

  // snapshot rendering for download/share
  const [selected, setSelected] = useState<SnapshotItem | null>(null);
  const [selectedChartImageUrl, setSelectedChartImageUrl] = useState<string | null>(null);
  const [snapshotOwner, setSnapshotOwner] = useState<{ name?: string; email?: string; avatarUrl?: string | null } | null>(
    null
  );
  const [snapshotImageLink, setSnapshotImageLink] = useState<string | null>(null);
  const [currentOwner, setCurrentOwner] = useState<{ name?: string; email?: string; avatarUrl?: string | null } | null>(
    null
  );

  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const [chartImagesById, setChartImagesById] = useState<Record<string, string>>({});

  const _autoDownloadRef = useRef(false);
  const isAutoDownloadFrame =
    searchParams.get("autoDownload") === "1" && typeof window !== "undefined" && window.parent !== window;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoadingAll(true);

        const { data, error } = await supabase
          .from("signal_cycles")
          .select("id,symbol,side,entry_price,exit_price,entry_time,exit_time,barinterval,is_open")
          .eq("is_open", false)
          .not("entry_price", "is", null)
          .not("exit_price", "is", null)
          .order("entry_time", { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        const rows = (data ?? []) as Array<RawSignalCycle & { is_open?: boolean }>;

        const mapped: SnapshotItem[] = rows.map((r) => {
          const entryPrice = toNum(r.entry_price);
          const exitPrice = toNum(r.exit_price);

          const roeRaw = calcRoePct(r.side, entryPrice, exitPrice);
          const roe = clampLiqRoe(roeRaw);
          const pnl$ = calcPnlDollarFromRoePct(roe);

          const entryDT = safeDate(r.entry_time);
          const exitDT = safeDate(r.exit_time);

          const pastDays = entryDT
            ? Number(((Date.now() - entryDT.getTime()) / (1000 * 60 * 60 * 24)).toFixed(1))
            : 0;

          const durationSec =
            entryDT && exitDT ? Math.max(0, Math.floor((exitDT.getTime() - entryDT.getTime()) / 1000)) : 0;

          return {
            id: r.id,
            symbol: r.symbol ?? "-",
            roePct: roe,
            pnlAmount: pnl$,
            leverage: LEVERAGE,
            entryPrice,
            exitPrice,
            direction: String(r.side).toUpperCase() === "SHORT" ? "short" : "long",
            entryTimeISO: r.entry_time,
            exitTimeISO: r.exit_time,
            date: fmtYYYYMMDD(r.entry_time),
            views: 0,
            likes: 0,
            period: pastDays,
            durationSec,
            barinterval: r.barinterval,
          };
        });

        setAllItems(mapped);
      } catch (e) {
        console.error("Failed to load signal_cycles:", e);
        setAllItems([]);
      } finally {
        if (!cancelled) setLoadingAll(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!active || error || !data?.user) return;

      setCurrentOwner({ email: data.user.email ?? undefined });
    })();

    return () => {
      active = false;
    };
  }, []);

  const resolveCurrentOwner = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { email: data.user.email ?? undefined };
  };

  const filteredAll = useMemo(() => {
    if (filter === "profit") return allItems.filter((x) => x.roePct > 0);
    if (filter === "loss") return allItems.filter((x) => x.roePct < 0);
    return allItems;
  }, [allItems, filter]);

  const pageTotal = filteredAll.length;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(pageTotal / PAGE_SIZE)), [pageTotal]);

  const pageRows = useMemo(() => {
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    return filteredAll.slice(from, to);
  }, [filteredAll, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const topStats = useMemo(() => {
    const total = filteredAll.length;
    const wins = filteredAll.filter((x) => x.roePct > 0).length;
    const pnl = filteredAll.reduce((acc, x) => acc + x.pnlAmount, 0);
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    return { total, wins, pnl, winRate };
  }, [filteredAll]);

  const makeSnapshotPngBlob = async (
    item: SnapshotItem,
    options?: {
      imageLink?: string | null;
      owner?: { name?: string; email?: string; avatarUrl?: string | null } | null;
    }
  ): Promise<Blob> => {
    let chartImageUrl: string | null | undefined = chartImagesById[item.id];

    if (!chartImageUrl) {
      try {
        chartImageUrl = await requestChartSnapshot(item);
         
        setChartImagesById((prev) => ({ ...prev, [item.id]: chartImageUrl! }));
      } catch (e) {
        console.warn("Chart snapshot failed:", e);
        chartImageUrl = null;
      }
    }

    setSelected(item);
    setSelectedChartImageUrl(chartImageUrl ?? null);
    setSnapshotImageLink(options?.imageLink ?? null);
    setSnapshotOwner(options?.owner ?? null);

    await new Promise((r) => setTimeout(r, 800));

    const el = snapshotRef.current;
    if (!el) throw new Error("snapshotRef not found");
    await waitForImages(el);

    const PLACEHOLDER =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 20000,
      logging: false,
      onclone: (doc) => {
        const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        links.forEach((link) => {
          const href = link.getAttribute("href") || "";
          const isAbs = /^https?:\/\//i.test(href);
          const isSameOrigin = href.startsWith(window.location.origin);
          if (href && isAbs && !isSameOrigin) link.remove();
        });

        const imgs = Array.from(doc.querySelectorAll("img")) as HTMLImageElement[];
        imgs.forEach((img) => {
          try {
            const src = img.getAttribute("src") || "";
            if (!src) return;

            if (src.startsWith("data:") || src.startsWith(window.location.origin) || src.startsWith("/")) {
              try {
                img.crossOrigin = "anonymous";
              } catch {
                // crossOrigin assignment error is non-critical
              }
              return;
            }

            if (/^https?:\/\//i.test(src)) {
              try {
                img.crossOrigin = "anonymous";
                const cur = img.src;
                img.src = cur;
              } catch {
                img.src = PLACEHOLDER;
              }
            }
          } catch {
            try {
              img.src = PLACEHOLDER;
            } catch {
              // placeholder assignment error is non-critical
            }
          }
        });

        const all = Array.from(doc.querySelectorAll("*"));
        all.forEach((node) => {
          try {
            const h = node as HTMLElement;
            const bg = h.style?.backgroundImage || "";
            if (!bg) return;

            const m = /url\(([^)]+)\)/i.exec(bg);
            if (!m) return;

            const url = m[1].trim().replace(/^['"]|['"]$/g, "");
            if (!url) return;

            if (url.startsWith("data:")) return;
            if (url.startsWith("/") || url.startsWith(window.location.origin)) return;

            if (/^https?:\/\//i.test(url)) h.style.backgroundImage = "none";
          } catch {
            // ignore
          }
        });
      },
    });

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 1));
    if (!blob) throw new Error("Failed to create PNG blob");
    return blob;
  };

  const _downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const { handleDownload, downloadingId } = useSnapshotDownloader({
    makeSnapshotPngBlob,
    currentOwner,
    resolveCurrentOwner,
    isAutoDownloadFrame,
    buildVerifyUrl: (it) => {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      return `${baseUrl}/snapshot/${it.id}`;
    },
    makeFilename: (it) => `${it.symbol}_${it.date}_${it.direction}_${it.roePct.toFixed(2)}pct.png`,
  });
  const buildShareText = (it: SnapshotItem) =>
    `${it.symbol} ${it.direction.toUpperCase()} ${LEVERAGE}x • ${it.roePct.toFixed(2)}%`;

  const openShareTargets = (shareUrl: string, shareText: string) => {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

    // open both (you can change to show a UI chooser if you want)
    window.open(xUrl, "_blank", "noopener,noreferrer");
    window.open(tgUrl, "_blank", "noopener,noreferrer");
  };

   
  const tryResolvePinataUrlFromResponse = (data: any): string => {
    const u =
      data?.shareUrl ||
      data?.pinataUrl ||
      (data?.cid ? `https://gateway.pinata.cloud/ipfs/${data.cid}` : "");
    return (u && String(u).trim()) || "";
  };


  const handleShare = async (item: SnapshotItem) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      // default fallback (your internal share page)
      const fallbackUrl = `${baseUrl}/snapshot/${item.id}`;
      const shareText = buildShareText(item);

      // 1) Ensure we know the current owner (user)
      const me = currentOwner ?? (await resolveCurrentOwner());
      if (!me?.email) {
        // you can show a toast instead
        console.warn("No logged-in user. Cannot claim ownership.");
      }

      let finalShareUrl = "";

      try {
        const form = new FormData();
        form.append("snapshotId", item.id);
        form.append("signalId", item.id);
        form.append("mode", "lookup");

        const res = await supabase.functions.invoke("pin-snapshot", { body: form });
        const ownedUrl = tryResolvePinataUrlFromResponse(res.data);

        if (ownedUrl) finalShareUrl = ownedUrl;
      } catch (e) {
        console.warn("Pinata lookup failed (will create a new pin):", e);
      }

      // --- B) If no owned url, we create the snapshot image and pin it (claim ownership)
      if (!finalShareUrl) {
        // create image blob first (this also sets template state etc.)
        const blob = await makeSnapshotPngBlob(item, {
          owner: me ?? undefined,
          imageLink: null,
        });

        // Prepare form for edge function pin upload
        const fileName = `${item.symbol}_${item.date}_${item.direction}_${item.roePct.toFixed(2)}pct.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        const form = new FormData();
        form.append("snapshotId", item.id);
        form.append("signalId", item.id);

        // ✅ your edge function should accept file
        form.append("file", file);

        // ✅ include owner info so edge function can store ownership metadata
        if (me?.email) form.append("ownerEmail", me.email);

        const res = await supabase.functions.invoke("pin-snapshot", { body: form });
        const pinnedUrl = tryResolvePinataUrlFromResponse(res.data);

        finalShareUrl = pinnedUrl || fallbackUrl;
      }

      // 3) Native share first (best UX on mobile) — share URL (and optionally image)
      // NOTE: Most desktop browsers won't allow file share, but URL share usually works.
      if (navigator.share) {
        try {
          // If you want native share WITH image:
          // only do it when we pinned it OR when you want always include file.
          // But your requirement says: share pinata url if owned.
          // We'll attach the image only when we just created it (i.e., no owned url before).
          const shouldAttachFile = false; // set true only if you want

          if (shouldAttachFile) {
            const blob = await makeSnapshotPngBlob(item, { owner: me ?? undefined, imageLink: finalShareUrl });
            const file = new File([blob], `${item.symbol}_${item.date}.png`, { type: "image/png" });

            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: "Ai Signal Snapshot",
                text: shareText,
                url: finalShareUrl,
                files: [file],
              });
              return;
            }
          }

          // URL-only share (most compatible)
          await navigator.share({
            title: "Ai Signal Snapshot",
            text: shareText,
            url: finalShareUrl,
          });
          return;
        } catch (e) {
          // user cancelled / not allowed → fallback to deeplinks
          console.warn("navigator.share failed:", e);
        }
      }

      // 4) Fallback: deep link share to X + Telegram
      openShareTargets(finalShareUrl || fallbackUrl, shareText);
    } catch (e) {
      console.error("handleShare error:", e);
    }
  };


  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-6 h-6 text-primary" />
              수익차트 스냅샷
            </h1>
            <p className="text-sm text-muted-foreground mt-1">거래 기록을 스냅샷으로 저장하고 공유하세요</p>
          </div>

          <Button className="gap-2">
            <Camera className="w-4 h-4" />새 스냅샷 생성
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="p-4 text-center">
              <div
                className={cn(
                  "text-2xl font-bold font-mono",
                  topStats.pnl >= 0 ? "text-semantic-bull" : "text-semantic-bear"
                )}
              >
                {topStats.pnl >= 0 ? "+" : "-"}$
                {Math.abs(topStats.pnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-muted-foreground">총 수익</div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold font-mono">
                {topStats.wins}/{topStats.total}
              </div>
              <div className="text-sm text-muted-foreground">성공/전체</div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary font-mono">{topStats.winRate.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">승률</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all" className="gap-1">
                <Filter className="w-4 h-4" />
                전체
              </TabsTrigger>
              <TabsTrigger value="profit" className="gap-1">
                <TrendingUp className="w-4 h-4 text-semantic-bull" />
                수익
              </TabsTrigger>
              <TabsTrigger value="loss" className="gap-1">
                <TrendingDown className="w-4 h-4 text-semantic-bear" />
                손실
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex gap-2">
            <Button
              variant={viewType === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewType("grid")}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewType === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewType("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {loadingAll ? (
          <div className="text-sm text-muted-foreground">불러오는 중...</div>
        ) : pageRows.length === 0 ? (
          <div className="text-sm text-muted-foreground">데이터가 없습니다.</div>
        ) : viewType === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageRows.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                viewType={viewType}
                onDownload={handleDownload}
                onShare={handleShare}
                isDownloading={downloadingId === snapshot.id}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {pageRows.map((snapshot) => (
              <SnapshotCard
                key={snapshot.id}
                snapshot={snapshot}
                viewType={viewType}
                onDownload={handleDownload}
                onShare={handleShare}
                isDownloading={downloadingId === snapshot.id}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Page {page} / {totalPages} · Total {pageTotal}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || loadingAll} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loadingAll}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
        {/* <div ref={snapshotRef}>
          {selected ? (
            <ProfitSnapshotTemplate
              item={selected}
              chartImageUrl={selectedChartImageUrl}
              imageLink={snapshotImageLink ?? undefined}
              owner={snapshotOwner ?? undefined}
            />
          ) : null}
        </div> */}

        <div className="text-center text-sm text-muted-foreground">
          <p>📸 스냅샷을 SNS에 공유하여 투자 성과를 자랑해보세요!</p>
        </div>

        {/* Hidden Snapshot Renderer */}
        <div
        // style={{
        //   position: "fixed",
        //   left: -99999,
        //   top: -99999,
        //   width: 1280,
        //   height: 720,
        //   pointerEvents: "none",
        //   opacity: 0,
        // }}
        >
          <div ref={snapshotRef}>
            {selected ? (
              <ProfitSnapshotTemplate
                item={selected}
                chartImageUrl={selectedChartImageUrl}
                imageLink={snapshotImageLink ?? undefined}
                owner={snapshotOwner ?? undefined}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
