// src/hooks/useSnapshotDownloader.ts
import { downloadSnapshot } from "@/lib/downloadSnapshot";
import type { Owner, SnapshotItem } from "@/types/snapshot";
import { useCallback, useState } from "react";



type UseSnapshotDownloaderArgs = {
    makeSnapshotPngBlob: (
        item: SnapshotItem,
        options?: { imageLink?: string | null; owner?: Owner }
    ) => Promise<Blob>;

    currentOwner: Owner;
    resolveCurrentOwner: () => Promise<Owner>;

    isAutoDownloadFrame: boolean;

    buildVerifyUrl?: (it: SnapshotItem) => string;
    makeFilename?: (it: SnapshotItem) => string;

    onBlockedInIframe?: () => void;
};


const defaultBuildVerifyUrl = (it: SnapshotItem) => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${baseUrl}/snapshot/${it.id}`;
};

const defaultMakeFilename = (it: SnapshotItem) =>
    `${it.symbol}_${it.date}_${it.direction}_${it.roePct.toFixed(2)}pct.png`;

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
};

const postDownloadToParent = async (blob: Blob, filename: string) => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read snapshot blob"));
        reader.readAsDataURL(blob);
    });

    window.parent.postMessage(
        { type: "PROFIT_SNAPSHOT_DOWNLOAD", filename, dataUrl },
        window.location.origin
    );
};

const downloadBlobForContext = async (blob: Blob, filename: string, isAutoDownloadFrame: boolean) => {
    if (isAutoDownloadFrame) {
        await postDownloadToParent(blob, filename);
        return;
    }
    downloadBlob(blob, filename);
};

export function useSnapshotDownloader({
    makeSnapshotPngBlob,
    currentOwner,
    resolveCurrentOwner,
    isAutoDownloadFrame,
    buildVerifyUrl = defaultBuildVerifyUrl,
    makeFilename = defaultMakeFilename,
    onBlockedInIframe,
}: UseSnapshotDownloaderArgs) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownload = useCallback(
        async (item: SnapshotItem) => {
            try {
                setDownloadingId(item.id);

                const result = await downloadSnapshot(item, {
                    makeSnapshotPngBlob,
                    resolveOwner: async () => currentOwner ?? (await resolveCurrentOwner()),
                    buildVerifyUrl,
                    makeFilename,
                    downloadBlob: (blob, filename) => downloadBlobForContext(blob, filename, isAutoDownloadFrame),
                });

                if (isAutoDownloadFrame && result?.source === "blocked") {
                    if (onBlockedInIframe) onBlockedInIframe();
                    else {
                        window.parent.postMessage(
                            { type: "PROFIT_SNAPSHOT_DOWNLOAD", error: "LOGIN_REQUIRED" },
                            window.location.origin
                        );
                    }
                }
            } finally {
                setDownloadingId((prev) => (prev === item.id ? null : prev));
            }
        },
        [
            makeSnapshotPngBlob,
            currentOwner,
            resolveCurrentOwner,
            buildVerifyUrl,
            makeFilename,
            isAutoDownloadFrame,
            onBlockedInIframe,
        ]
    );

    return { handleDownload, downloadingId };
}
