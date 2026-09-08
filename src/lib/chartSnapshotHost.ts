import type { SnapshotItem } from "@/types/snapshot";

type PendingReq = {
    id: string;
    resolve: (dataUrl: string) => void;
    reject: (err: Error) => void;
    timeoutId: number;
};

let iframeEl: HTMLIFrameElement | null = null;
let mountEl: HTMLDivElement | null = null;
let isListening = false;

const cacheById: Record<string, string> = {};
const pendingById: Record<string, PendingReq> = {};

const parseTimestampMs = (value: string | null) => {
    if (!value) return NaN;
    const trimmed = String(value).trim();

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const n = Number.parseFloat(trimmed);
        if (!Number.isFinite(n)) return NaN;
        if (n < 2_000_000_000_0) return Math.round(n * 1000); // seconds
        if (n >= 10_000_000_000_000) return Math.round(n / 1000); // microseconds
        return Math.round(n); // ms
    }

    const normalized = trimmed.includes(" ") && !trimmed.includes("T")
        ? trimmed.replace(" ", "T")
        : trimmed;

    const ms = Date.parse(normalized);
    return Number.isFinite(ms) ? ms : NaN;
};

const chartRouteFor = (barinterval: string | null) => {
    const bi = String(barinterval ?? "").toLowerCase();
    if (bi === "1m" || bi === "1") return "/chart1m";
    if (bi === "5m" || bi === "5") return "/chart5m";
    if (bi === "10m" || bi === "10") return "/chart10m";
    if (bi === "15m" || bi === "15") return "/chart15m";
    return "/chart1m";
};

const buildChartSnapshotSrc = (item: SnapshotItem) => {
    const entryMs = parseTimestampMs(item.entryTimeISO);
    const exitMs = parseTimestampMs(item.exitTimeISO);

    const params = new URLSearchParams({
        symbol: item.symbol,
        entryTime: Number.isFinite(entryMs) ? String(entryMs) : "",
        exitTime: Number.isFinite(exitMs) ? String(exitMs) : "",
        snapshot: "1",
        snapshotId: item.id,
    });

    return `${chartRouteFor(item.barinterval)}?${params.toString()}`;
};

function ensureHost() {
    if (typeof window === "undefined") return;

    // 1) listener once
    if (!isListening) {
        window.addEventListener("message", (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            const data = event.data;
            if (!data || typeof data !== "object") return;
             
            if (!String((data as any).type || "").startsWith("CHART")) return;

             
            const snapshotId = String((data as any).snapshotId || "");
            if (!snapshotId) return;

            const pending = pendingById[snapshotId];
            if (!pending) return;

             
            if ((data as any).type === "CHART_SNAPSHOT_READY") return;

             
            if ((data as any).type === "CHART_SNAPSHOT_ERROR") {
                clearTimeout(pending.timeoutId);
                 
                pending.reject(new Error((data as any).error || "Chart snapshot error"));
                delete pendingById[snapshotId];
                return;
            }

             
            if (String((data as any).type).endsWith("_SNAPSHOT")) {
                clearTimeout(pending.timeoutId);

                 
                const dataUrl = (data as any).dataUrl;
                 
                const err = (data as any).error;

                if (err || !dataUrl) {
                    pending.reject(new Error(err || "Chart snapshot failed"));
                } else {
                    cacheById[snapshotId] = String(dataUrl);
                    pending.resolve(String(dataUrl));
                }

                delete pendingById[snapshotId];
            }
        });

        isListening = true;
    }

    // 2) DOM mount once
    if (!mountEl) {
        mountEl = document.createElement("div");
        mountEl.style.position = "fixed";
        mountEl.style.left = "-99999px";
        mountEl.style.top = "-99999px";
        mountEl.style.width = "1400px";
        mountEl.style.height = "800px";
        mountEl.style.opacity = "0";
        mountEl.style.pointerEvents = "none";
        document.body.appendChild(mountEl);
    }

    // 3) iframe once
    if (!iframeEl) {
        iframeEl = document.createElement("iframe");
        iframeEl.title = "chart-snapshot-host";
        iframeEl.style.width = "100%";
        iframeEl.style.height = "100%";
        iframeEl.style.border = "0";
        mountEl.appendChild(iframeEl);
    }
}

export async function requestChartSnapshot(item: SnapshotItem, timeoutMs = 45000): Promise<string> {
    ensureHost();

    if (cacheById[item.id]) return cacheById[item.id];
    if (!iframeEl) throw new Error("Chart snapshot host not available");

    // already pending -> return same promise
    if (pendingById[item.id]) {
        return await new Promise<string>((resolve, reject) => {
            const old = pendingById[item.id];
            const resolveOld = old.resolve;
            const rejectOld = old.reject;
            old.resolve = (url) => { resolveOld(url); resolve(url); };
            old.reject = (err) => { rejectOld(err); reject(err); };
        });
    }

    const src = buildChartSnapshotSrc(item);

    return await new Promise<string>((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            delete pendingById[item.id];
            reject(new Error("Chart snapshot timed out"));
        }, timeoutMs);

        pendingById[item.id] = { id: item.id, resolve, reject, timeoutId };

        // triggers chart page to render and postMessage back
         
        iframeEl!.src = src;
    });
}

// Optional: clear cache if you want
export function clearChartSnapshotCache(id?: string) {
    if (id) delete cacheById[id];
    else Object.keys(cacheById).forEach((k) => delete cacheById[k]);
}
