/**
 * AIX-54: 4전략 PnL Mock — 실제 역산은 후속 이슈
 * + 레거시: 전략 ID별 달러 손익 모의 (CycleStrategyDrawerList)
 */
import type { ClosedSignal, StrategyId } from '@/views/signals/pulse/types/pulse.types';
import type { CycleDrawerCycle, StrategyVariant, StrategyVariantId } from '@/types/cycleStrategyDrawer';

export interface CycleStrategyPnLRow {
  strategyId: StrategyId;
  /** 모의 순위용 달러 손익 */
  pnlUsd: number;
}

const VARIANT_META: Record<
  StrategyVariantId,
  { labelKo: string; hasDca: boolean; hasPartial: boolean }
> = {
  original: { labelKo: '오리지널', hasDca: false, hasPartial: false },
  variant_dca: { labelKo: '변형 1 (물타기)', hasDca: true, hasPartial: false },
  variant_partial: { labelKo: '변형 2 (분할청산)', hasDca: false, hasPartial: true },
  variant_both: { labelKo: '변형 3 (모두)', hasDca: true, hasPartial: true },
};

const NOTES: Record<StrategyVariantId, string | undefined> = {
  original: undefined,
  variant_dca: '평단 개선 효과',
  variant_partial: '이익 절반 조기 확보',
  variant_both: '양쪽 액션 완료, 이익 희석',
};

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 시드 기반 결정적 모의 — 추후 signal_cycles + signal_actions 역산으로 교체 */
export function getMockCycleStrategyPnL(cycleId: string): CycleStrategyPnLRow[] {
  const base: StrategyId[] = ['oneshot', 'deep', 'safe', 'full'];
  let seed = 0;
  for (let i = 0; i < cycleId.length; i++) seed = (seed + cycleId.charCodeAt(i) * (i + 1)) % 9973;
  const rows = base.map((strategyId, i) => {
    const jitter = ((seed >> (i * 3)) & 0xff) - 128;
    const pnlUsd = Math.round((seed * (i + 7) + jitter * 13) % 5000) / 100 - 25;
    return { strategyId, pnlUsd };
  });
  return [...rows].sort((a, b) => b.pnlUsd - a.pnlUsd);
}

/** 청산 행 기준 Mock 4전략 — PnL 내림차순 정렬 후 반환 */
export function mockStrategyVariantsForClosedSignal(s: ClosedSignal): StrategyVariant[] {
  const base = s.pnlPercent;
  const entry = s.averageEntryPrice ?? s.entryPrice;
  const seed = hashSeed(s.id);

  const raw: StrategyVariant[] = (
    ['original', 'variant_dca', 'variant_partial', 'variant_both'] as const
  ).map((id, i) => {
    const jitter = ((seed + i * 17) % 40) / 100;
    const pct = base - jitter * (i === 0 ? 0 : 1);
    const usd = Math.round((pct / 100) * entry * 100) / 100;
    const meta = VARIANT_META[id];
    return {
      id,
      labelKo: meta.labelKo,
      hasDca: meta.hasDca,
      hasPartial: meta.hasPartial,
      pnlPercent: Math.round(pct * 100) / 100,
      pnlUsd: usd,
      win: pct >= 0,
      note: NOTES[id],
    };
  });

  return raw.sort((a, b) => {
    if (a.win !== b.win) return (b.win ? 1 : 0) - (a.win ? 1 : 0);
    return b.pnlPercent - a.pnlPercent;
  });
}

export function cycleDrawerFromClosedSignal(s: ClosedSignal): CycleDrawerCycle {
  const entered = s.enteredAt
    ? typeof s.enteredAt === 'string'
      ? s.enteredAt
      : s.enteredAt.toISOString()
    : typeof s.closedAt === 'string'
      ? new Date(new Date(s.closedAt).getTime() - 3600000).toISOString()
      : new Date(s.closedAt.getTime() - 3600000).toISOString();
  const closed =
    typeof s.closedAt === 'string' ? s.closedAt : (s.closedAt as Date).toISOString();

  return {
    id: s.id,
    symbol: s.symbol,
    direction: s.direction,
    entryPrice: s.averageEntryPrice ?? s.entryPrice,
    exitPrice: s.exitPrice,
    enteredAt: entered,
    closedAt: closed,
    holdDurationLabel: s.holdDuration,
  };
}
