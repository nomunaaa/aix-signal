export const PLAN_CODES = ['free', 'pro'] as const;
export const PAID_PLAN_CODES = ['pro'] as const;

export type PlanCode = (typeof PLAN_CODES)[number];
export type Plan = PlanCode;
export type PaidPlanCode = (typeof PAID_PLAN_CODES)[number];

export type PlanLimits = {
  maxSymbols: number;
  maxPositions: number;
  scorePollingInterval: number;
  showCorrelation: boolean;
  showSectorMix: boolean;
  suggestionsEnabled: boolean;
  queuePriority: 'none' | 'low' | 'high' | 'highest';
  aiAdviceLevel: 'none' | 'limited' | 'full';
};

export const PLAN_LIMITS: Record<PlanCode, PlanLimits> = {
  free: {
    maxSymbols: 0,
    maxPositions: 0,
    scorePollingInterval: 1800000,
    showCorrelation: false,
    showSectorMix: false,
    suggestionsEnabled: false,
    queuePriority: 'none',
    aiAdviceLevel: 'none',
  },
  pro: {
    maxSymbols: 30,
    maxPositions: 30,
    scorePollingInterval: 600000,
    showCorrelation: true,
    showSectorMix: true,
    suggestionsEnabled: true,
    queuePriority: 'high',
    aiAdviceLevel: 'full',
  },
};

export type PlanCatalogEntry = {
  code: PlanCode;
  name: string;
  monthlyPrice: number;
  nextPlan: PlanCode | null;
  gradientClass: string;
  cardBgClass: string;
  usageLimits: {
    symbols: number;
    alerts: number;
  };
  popular?: boolean;
  badge?: string;
};

export const PLAN_CATALOG: Record<PlanCode, PlanCatalogEntry> = {
  free: {
    code: 'free',
    name: 'Free',
    monthlyPrice: 0,
    nextPlan: 'pro',
    gradientClass: 'from-gray-500 to-gray-600',
    // 라이트에서는 카드도 밝게(bg-card), 다크에서는 기존 짙은 남색 유지.
    // 예전엔 양쪽 모두 #1F2933로 고정해 라이트 모드에서 이 카드만 검게 남았다.
    cardBgClass: 'bg-card dark:bg-[#1F2933]',
    usageLimits: { symbols: 0, alerts: 3 },
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    monthlyPrice: 300,
    nextPlan: null,
    gradientClass: 'from-primary to-purple-500',
    cardBgClass: 'bg-card dark:bg-[#1E1420]',
    usageLimits: { symbols: 30, alerts: 100 },
    popular: true,
  },
};

export function normalizePlanCode(value: unknown, fallback: PlanCode = 'free'): PlanCode {
  const raw = String(value ?? '').trim().toLowerCase();

  if (raw === 'free' || raw === 'pro') return raw;

  return fallback;
}

export function isPlanCode(value: unknown): value is PlanCode {
  return PLAN_CODES.includes(String(value ?? '').trim().toLowerCase() as PlanCode);
}

export function isPaidPlan(plan: unknown): plan is PaidPlanCode {
  const normalized = normalizePlanCode(plan);
  return normalized === 'pro';
}

export function hasProAccess(plan: unknown): boolean {
  const normalized = normalizePlanCode(plan);
  return normalized === 'pro';
}

export function getPlanLimits(plan: unknown): PlanLimits {
  return PLAN_LIMITS[normalizePlanCode(plan)];
}
