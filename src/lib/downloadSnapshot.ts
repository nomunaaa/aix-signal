// src/lib/snapshots/downloadSnapshot.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type SnapshotOwner = { email?: string; name?: string; avatarUrl?: string | null } | null;

export type FetchOwnedResult = { cid?: string; pinataUrl?: string; status?: string };
export type ClaimPinResult = {
    isOwner: boolean;
    ownerUserId: string;
    cid?: string;
    pinataUrl?: string;
    shareUrl?: string | null;
    status: string;
};

// ✅ minimal fields the global downloader needs
export type SnapshotBase = {
    id: string;
    symbol: string;
    date: string;
    direction: "long" | "short";
    roePct: number;
    pnlAmount?: number;
    leverage?: number;
};

export type MakeSnapshotBlobFn<TItem extends SnapshotBase> = (
    item: TItem,
    options?: { owner?: SnapshotOwner; imageLink?: string | null }
) => Promise<Blob>;

export type SnapshotDownloadDeps<TItem extends SnapshotBase> = {
    makeSnapshotPngBlob: MakeSnapshotBlobFn<TItem>;

    makeFilename?: (item: TItem) => string;
    onStatus?: (s: "checking_owned" | "downloading_owned" | "rendering" | "pinning" | "downloading_new") => void;

    fetchOwnedSnapshot?: (snapshotId: string, signalId: string) => Promise<FetchOwnedResult>;
    claimAndPin?: (item: TItem, userId: string, blob: Blob) => Promise<ClaimPinResult>;

    resolveOwner?: () => Promise<SnapshotOwner>;
    buildVerifyUrl?: (item: TItem) => string;

    downloadBlob?: (blob: Blob, filename: string) => void;
};

function defaultDownloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function defaultFilename<TItem extends SnapshotBase>(item: TItem) {
    return `${item.symbol}_${item.date}_${item.direction}_${item.roePct.toFixed(2)}pct.png`;
}

async function defaultFetchOwned(snapshotId: string, signalId: string): Promise<FetchOwnedResult> {
    const form = new FormData();
    form.append("snapshotId", snapshotId);
    form.append("signalId", signalId);
    form.append("countDownload", "1");

    const res = await supabase.functions.invoke("pin-snapshot", { body: form });
    if (res.error) throw res.error;
    return (res.data ?? {}) as FetchOwnedResult;
}

async function defaultClaimAndPin<TItem extends SnapshotBase>(
    item: TItem,
    userId: string,
    blob: Blob
): Promise<ClaimPinResult> {
    const form = new FormData();
    form.append("snapshotId", item.id);
    form.append("signalId", item.id);
    form.append("userId", userId);
    form.append("file", new File([blob], `snapshot-${item.id}.png`, { type: "image/png" }));
    if (typeof item.roePct === "number") form.append("roePct", String(item.roePct));
    if (typeof item.leverage === "number") form.append("leverage", String(item.leverage));
    if (typeof item.pnlAmount === "number") form.append("pnlAmount", String(item.pnlAmount));

    const res = await supabase.functions.invoke("pin-snapshot", { body: form });
    if (res.error) throw res.error;
    return res.data as ClaimPinResult;
}

async function defaultResolveOwner(): Promise<SnapshotOwner> {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { email: data.user.email ?? undefined };
}

function ownedUrlFrom(existing: FetchOwnedResult) {
    return existing?.pinataUrl || (existing?.cid ? `https://gateway.pinata.cloud/ipfs/${existing.cid}` : "");
}

// ✅ generic function
export async function downloadSnapshot<TItem extends SnapshotBase>(
    item: TItem,
    deps: SnapshotDownloadDeps<TItem>
) {
    const {
        makeSnapshotPngBlob,
        makeFilename = defaultFilename,
        onStatus,
        fetchOwnedSnapshot = defaultFetchOwned,
        claimAndPin = defaultClaimAndPin,
        resolveOwner = defaultResolveOwner,
        buildVerifyUrl = (it) => {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
            return `${baseUrl}/snapshot/${it.id}`;
        },
        downloadBlob = defaultDownloadBlob,
    } = deps;

    // 1) owned-first
    try {
        onStatus?.("checking_owned");
        const existing = await fetchOwnedSnapshot(item.id, item.id);
        const ownedUrl = ownedUrlFrom(existing);

        if (ownedUrl) {
            onStatus?.("downloading_owned");
            const resp = await fetch(ownedUrl);
            if (!resp.ok) throw new Error("Failed to fetch owned snapshot");
            const ownedBlob = await resp.blob();
            downloadBlob(ownedBlob, makeFilename(item));
            return { source: "owned" as const, ownedUrl };
        }
    } catch (e) {
        console.warn("Owned snapshot lookup failed:", e);
    }

    // 2) render
    const { data: authData } = await supabase.auth.getUser();
    const isLoggedIn = Boolean(authData?.user);
    if (!isLoggedIn) {
        toast({
            title: "로그인이 필요합니다",
            description: "스냅샷을 다운로드하려면 로그인해 주세요.",
        });
        return { source: "blocked" as const };
    }

    const owner = await resolveOwner();
    const verifyUrl = buildVerifyUrl(item);

    onStatus?.("rendering");
    const baseBlob = await makeSnapshotPngBlob(item, owner ? { owner, imageLink: verifyUrl } : undefined);

    // 3) pin
    const userId = String(authData?.user?.id || "");
    let _shareUrl: string | null | undefined;
    let pinataUrl: string | null | undefined;
    if (userId) {
        try {
            onStatus?.("pinning");
            const pinRes = await claimAndPin(item, userId, baseBlob);
            _shareUrl = pinRes?.shareUrl;
            pinataUrl = pinRes?.pinataUrl;
        } catch (err) {
            console.warn("Pin snapshot failed, continuing without pin:", err);
        }
    }

    // 4) download
    onStatus?.("downloading_new");
    if (pinataUrl) {
        try {
            const resp = await fetch(pinataUrl);
            if (!resp.ok) throw new Error("Failed to fetch pinned snapshot");
            const pinnedBlob = await resp.blob();
            downloadBlob(pinnedBlob, makeFilename(item));
            return { source: "rendered" as const };
        } catch (err) {
            console.warn("Pinned download failed, falling back:", err);
        }
    }
    downloadBlob(baseBlob, makeFilename(item));
    return { source: "rendered" as const };
}
