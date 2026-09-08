import { Rocket, type LucideIcon } from 'lucide-react';
import { PLAN_CATALOG, type PaidPlanCode } from '@/config/plans';
import type { PlanSettingsMap } from '@/lib/plan-settings';
import { cn } from '@/lib/utils';

/**
 * Pricing display data shared by the landing pricing section and /pricing.
 * Product plans are now Free and Pro only; Free is handled as the trial/free tier.
 */
export interface PricingPlan {
  code: PaidPlanCode;
  name: string;
  description: string;
  monthlyPrice: number;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  popular?: boolean;
  badge?: string;
  icon: LucideIcon;
  cardBg: string;
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    code: 'pro',
    name: PLAN_CATALOG.pro.name,
    description: '활성 트레이더를 위한 전체 시그널 접근',
    monthlyPrice: PLAN_CATALOG.pro.monthlyPrice,
    monthlyPriceCents: Math.round(PLAN_CATALOG.pro.monthlyPrice * 100),
    currency: 'USD',
    trialDays: 3,
    popular: PLAN_CATALOG.pro.popular,
    icon: Rocket,
    cardBg: PLAN_CATALOG.pro.cardBgClass,
    cta: 'Pro 시작',
  },
];

export function buildPricingPlans(settings?: PlanSettingsMap): PricingPlan[] {
  return PRICING_PLANS.map((plan) => {
    const runtime = settings?.[plan.code];
    if (!runtime) return plan;

    return {
      ...plan,
      name: runtime.displayName,
      monthlyPrice: runtime.monthlyPrice,
      monthlyPriceCents: runtime.monthlyPriceCents,
      currency: runtime.currency,
      trialDays: runtime.trialDays,
    };
  });
}

export interface UnifiedFeature {
  text: string;
  pro: string | boolean;
}

export const UNIFIED_FEATURES: UnifiedFeature[] = [
  { text: '종목 모니터링', pro: '30개' },
  { text: '신호 처리 우선순위', pro: '최우선' },
  { text: 'AI 어드바이스', pro: '고급' },
  { text: '이메일 지원', pro: '우선' },
  { text: '실시간 데이터 스트리밍', pro: true },
  { text: '전체 근거 패널 접근', pro: true },
  { text: '텔레그램 즉시 알림', pro: true },
  { text: 'AI 리스크 코치', pro: true },
  { text: '포트폴리오 도구', pro: true },
  { text: '퀀트 리포트', pro: true },
  { text: '차익거래 고급 기능', pro: true },
  { text: 'API 접근 권한', pro: true },
];

// PlanCard 배경이 테마를 따르므로 CTA도 시맨틱 토큰만 쓴다.
// 예전 white/10·text-white 조합은 카드가 항상 어둡다는 전제였고,
// 라이트 모드에서는 흰 글자가 밝은 카드 위에 놓여 읽히지 않았다.
export function planCtaClass(popular?: boolean) {
  return cn(
    'w-full h-12 text-base font-bold',
    popular
      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
      : 'bg-muted hover:bg-muted/80 text-foreground border border-border',
  );
}
