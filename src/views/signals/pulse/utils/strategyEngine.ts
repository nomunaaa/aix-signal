import {
  STRATEGY_CONFIGS,
  type StrategyId,
  type StrategyConfig,
  type Signal,
  type DiscountedSignal,
  type LockedSignal,
  type ClosedSignal,
  type WaitingSignal,
  type PulseSortBy,
} from '../types/pulse.types';

export function getStrategyConfig(strategyId: StrategyId): StrategyConfig {
  const config = STRATEGY_CONFIGS.find((s) => s.id === strategyId);
  if (!config) throw new Error(`Strategy config not found: ${strategyId}`);
  return config;
}

export function hasDiscountFeature(strategyId: StrategyId): boolean {
  return getStrategyConfig(strategyId).features.discount;
}

export function hasLockedFeature(strategyId: StrategyId): boolean {
  return getStrategyConfig(strategyId).features.locked;
}

export function isDiscounted(signal: Signal | DiscountedSignal): signal is DiscountedSignal {
  return 'additionalBuyCount' in signal && (signal.additionalBuyCount ?? 0) > 0;
}

export function isLocked(signal: Signal | LockedSignal): signal is LockedSignal {
  return 'lockedPercent' in signal && signal.lockedPercent > 0;
}

export function filterSignalsByStrategy(
  signals: Signal[],
  strategyId: StrategyId
): Signal[] {
  const hasDiscount = hasDiscountFeature(strategyId);
  const hasLocked = hasLockedFeature(strategyId);

  return signals.filter((signal) => {
    if (!hasDiscount && isDiscounted(signal)) return false;
    if (!hasLocked && isLocked(signal)) return false;
    return true;
  });
}

function discountSortValue(s: Signal): number {
  const r = s.discountRate;
  return typeof r === 'number' && Number.isFinite(r) ? r : 0;
}

function volumeSortValue(s: Signal): number {
  const v = s.quoteVolume24h;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/** 보드 기준 시각: sectionTime → movedAt → enteredAt */
function openSignalTimeMs(s: Signal): number {
  if (s.sectionTime) {
    const t = new Date(s.sectionTime).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (s.movedAt) {
    const t = typeof s.movedAt === 'string' ? new Date(s.movedAt).getTime() : s.movedAt.getTime();
    if (Number.isFinite(t)) return t;
  }
  if (s.enteredAt) {
    const t = typeof s.enteredAt === 'string' ? new Date(s.enteredAt).getTime() : s.enteredAt.getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function closedSignalTimeMs(s: ClosedSignal): number {
  if (s.closedAt) {
    const t = typeof s.closedAt === 'string' ? new Date(s.closedAt).getTime() : s.closedAt.getTime();
    if (Number.isFinite(t)) return t;
  }
  if (s.enteredAt) {
    const t = typeof s.enteredAt === 'string' ? new Date(s.enteredAt).getTime() : s.enteredAt.getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

function waitingSignalTimeMs(s: WaitingSignal): number {
  if (s.lastCloseTime) {
    const t =
      typeof s.lastCloseTime === 'string' ? new Date(s.lastCloseTime).getTime() : s.lastCloseTime.getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

const STRATEGY_RANK_ORDER: StrategyId[] = ['oneshot', 'deep', 'safe', 'full'];

/**
 * 히스토리 기본(시간 내림차순과 함께 쓸 때): 표본 내 승률·평균 수익 합이 높은 전략 그룹을 먼저 노출.
 */
export function sortClosedSignalsByStrategyPerformance(signals: ClosedSignal[]): ClosedSignal[] {
  const stats = new Map<StrategyId, { n: number; wins: number; sumPnl: number }>();
  for (const id of STRATEGY_RANK_ORDER) {
    stats.set(id, { n: 0, wins: 0, sumPnl: 0 });
  }
  for (const s of signals) {
    const id = (s.strategyId ?? 'oneshot') as StrategyId;
    const cur = stats.get(id) ?? { n: 0, wins: 0, sumPnl: 0 };
    cur.n += 1;
    if (s.pnlPercent >= 0) cur.wins += 1;
    cur.sumPnl += s.pnlPercent;
    stats.set(id, cur);
  }
  const score = (id: StrategyId): number => {
    const st = stats.get(id);
    if (!st || st.n === 0) return Number.NEGATIVE_INFINITY;
    return (st.wins / st.n) * 100 + st.sumPnl / st.n;
  };
  const ordered = [...STRATEGY_RANK_ORDER].sort((a, b) => score(b) - score(a));
  const rank = new Map<StrategyId, number>(ordered.map((id, i) => [id, i]));
  return [...signals].sort((a, b) => {
    const ida = (a.strategyId ?? 'oneshot') as StrategyId;
    const idb = (b.strategyId ?? 'oneshot') as StrategyId;
    const ra = rank.get(ida) ?? 99;
    const rb = rank.get(idb) ?? 99;
    if (ra !== rb) return ra - rb;
    return closedSignalTimeMs(b) - closedSignalTimeMs(a);
  });
}

export function sortClosedSignals(
  signals: ClosedSignal[],
  sortBy: PulseSortBy,
  sortDir: 'asc' | 'desc',
): ClosedSignal[] {
  return [...signals].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'time':
        comparison = closedSignalTimeMs(a) - closedSignalTimeMs(b);
        break;
      case 'pnl':
        comparison = a.pnlPercent - b.pnlPercent;
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'volume':
        comparison = 0;
        break;
      case 'discount':
        comparison = (a.discountGain ?? 0) - (b.discountGain ?? 0);
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });
}

export function sortWaitingSignals(
  signals: WaitingSignal[],
  sortBy: PulseSortBy,
  sortDir: 'asc' | 'desc',
): WaitingSignal[] {
  return [...signals].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'time':
        comparison = waitingSignalTimeMs(a) - waitingSignalTimeMs(b);
        break;
      case 'pnl':
        comparison = (a.lastPnlPercent ?? 0) - (b.lastPnlPercent ?? 0);
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'volume':
        comparison = a.avgDailySignals - b.avgDailySignals;
        break;
      case 'discount':
        comparison = 0;
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });
}

export function sortSignals<T extends Signal>(
  signals: T[],
  sortBy: PulseSortBy,
  sortDir: 'asc' | 'desc'
): T[] {
  const sorted = [...signals].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'time': {
        comparison = openSignalTimeMs(a) - openSignalTimeMs(b);
        break;
      }
      case 'pnl':
        comparison = a.pnlPercent - b.pnlPercent;
        break;
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case 'volume':
        comparison = volumeSortValue(a) - volumeSortValue(b);
        break;
      case 'discount':
        comparison = discountSortValue(a) - discountSortValue(b);
        break;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });
  return sorted;
}
