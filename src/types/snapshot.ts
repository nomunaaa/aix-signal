// src/types/snapshot.ts
export type SnapshotItem = {
    id: string;
    symbol: string;

    roePct: number;
    pnlAmount: number;
    leverage?: number;

    entryPrice: number;
    exitPrice: number;

    direction: "long" | "short";
    entryTimeISO: string | null;
    exitTimeISO: string | null;

    date: string;
    views: number;
    likes: number;

    // ✅ choose ONE: if you sometimes store "0.5" as string, make it number everywhere instead.
    period: number;

    barinterval: string | null;
    durationSec: number;
};

export type Owner = { name?: string; email?: string; avatarUrl?: string | null } | null;
