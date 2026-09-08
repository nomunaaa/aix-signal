import { Check, X, Star, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PricingPlan, UNIFIED_FEATURES } from '@/config/pricing-plans';
import { formatPlanMoney } from '@/lib/plan-settings';

/**
 * 랜딩/Plan 페이지가 공유하는 요금제 카드.
 * 시각 디자인이 두 화면에서 항상 동일하도록 단일 컴포넌트로 관리한다.
 */
interface PlanCardProps {
  plan: PricingPlan;
  isCurrentPlan?: boolean;
  className?: string;
  /** 카드 하단 CTA(버튼/링크). 이동 경로는 화면마다 다르므로 외부에서 주입한다. */
  cta: React.ReactNode;
}

export default function PlanCard({ plan, isCurrentPlan = false, className, cta }: PlanCardProps) {
  const Icon = plan.icon;

  return (
    <div
      className={cn(
        'relative rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-300',
        plan.cardBg,
        plan.popular ? 'border-primary shadow-xl shadow-primary/20' : 'border-border',
        isCurrentPlan && 'border-success',
        className
      )}
    >
      {/* Popular banner */}
      {plan.popular && (
        <div className="bg-primary text-primary-foreground text-center py-2 text-xs font-bold tracking-wide">
          <Star className="h-3 w-3 inline mr-1" />
          가장 인기 있는 플랜
        </div>
      )}

      <div className="p-6 flex flex-col flex-1">
        {/* Badges row */}
        <div className="flex items-center justify-between mb-4">
          {isCurrentPlan ? (
            <Badge className="bg-success text-white dark:text-black text-xs">
              <Check className="h-3 w-3 mr-1" />현재 플랜
            </Badge>
          ) : <span />}
          {plan.badge && (
            <Badge className="bg-amber-500 text-black font-extrabold text-xs">
              <Award className="h-3 w-3 mr-1" />{plan.badge}
            </Badge>
          )}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0',
            plan.popular ? 'bg-primary text-primary-foreground' : plan.badge ? 'bg-muted text-amber-500' : 'bg-muted text-foreground',
          )}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground">{plan.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-extrabold text-foreground">
            {formatPlanMoney(plan.monthlyPriceCents, plan.currency)}
          </span>
          <span className="text-muted-foreground text-sm">/월</span>
        </div>

        {/* Unified Features */}
        <ul className="space-y-2 flex-1 mb-6">
          {UNIFIED_FEATURES.map((feature, i) => {
            const val = feature[plan.code];
            const active = val !== false;
            return (
              <li key={i} className={cn('flex items-center gap-2.5 text-sm', !active && 'opacity-40')}>
                {active ? (
                  // 카드 배경이 테마를 따르므로 브랜드 레드 하드코딩(#FF2D2D) 없이
                  // text-primary를 그대로 쓴다. 라이트에서 어두워지는 값이 밝은 카드 위에서 맞다.
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                )}
                <span className="text-foreground/90">{feature.text}</span>
                {typeof val === 'string' && (
                  <span className="text-muted-foreground text-xs ml-auto">{val}</span>
                )}
              </li>
            );
          })}
        </ul>

        {/* CTA */}
        {cta}
      </div>
    </div>
  );
}
