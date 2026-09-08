'use client';

import { useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PricingStats from '@/components/pricing/PricingStats';
import PricingFeatureTable from '@/components/pricing/PricingFeatureTable';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link, useSearchParams } from '@/lib/navigation-compat';
import {
  Check,
  ExternalLink,
  Shield,
  ChevronRight,
  Sparkles,
  HelpCircle,
  CreditCard,
  RefreshCcw,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { buildPricingPlans, planCtaClass } from '@/config/pricing-plans';
import { normalizePlanCode } from '@/config/plans';
import PlanCard from '@/components/pricing/PlanCard';
import { BetaPurchaseGate } from '@/components/beta/BetaPurchaseGate';
import { BETA_MESSAGES } from '@/config/beta';
import { usePlanSettings } from '@/hooks/usePlanSettings';
import { describeTrialPeriod } from '@/lib/format-plan-date';

// FAQ data
const buildFaqs = (trialDays: number) => [
  {
    question: '무료 체험 기간이 있나요?',
    answer:
      `회원가입 후 ${trialDays}일간 무료로 모든 기능을 체험하실 수 있습니다. 신용카드 등록 없이 시작할 수 있으며, 체험 기간이 끝나도 자동으로 유료 전환되지 않습니다. 제휴 스토어 추천 코드가 있는 경우 결제 단계에서 혜택이 적용될 수 있습니다.`,
  },
  {
    question: '언제든지 취소할 수 있나요?',
    answer:
      '네, 언제든지 취소 가능합니다. 구독을 취소하면 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있으며, 다음 결제일에 자동으로 종료됩니다.',
  },
  {
    question: '플랜을 변경할 수 있나요?',
    answer:
      '언제든지 상위 플랜으로 업그레이드하거나 하위 플랜으로 다운그레이드할 수 있습니다. 업그레이드 시 차액만 결제되며, 다운그레이드는 다음 결제일부터 적용됩니다.',
  },
  {
    question: '어떤 결제 방법을 지원하나요?',
    answer:
      '신용카드(Visa, Mastercard, AMEX), 계좌이체, 암호화폐(USDT, BTC, ETH) 결제를 지원합니다. 암호화폐 결제 시 5% 추가 할인이 적용됩니다.',
  },
  {
    question: '환불 정책은 어떻게 되나요?',
    answer:
      '결제 후 7일 이내에 서비스에 만족하지 못하시면 전액 환불해 드립니다. 단, 포인트로 결제한 금액은 환불 대상에서 제외됩니다.',
  },
];

const Pricing = () => {
  const { subscription } = useAuth();
  const [searchParams] = useSearchParams();
  const { settings: planSettings } = usePlanSettings();
  const pricingPlans = useMemo(() => buildPricingPlans(planSettings), [planSettings]);
  const faqs = useMemo(() => buildFaqs(planSettings.pro.trialDays), [planSettings]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      toast.success('결제가 완료되었습니다!');
    }
  }, [searchParams]);

  const currentPlan = normalizePlanCode(subscription?.subscribed ? subscription?.plan : 'free');
  const trial = subscription?.in_trial
    ? describeTrialPeriod(subscription.subscription_end)
    : null;

  return (
    <>
      <div className="container mx-auto space-y-16">
        {/* Hero Section */}
        <section className="space-y-6 pt-8 text-center">
          {/* variant="secondary"는 라이트 모드에서 --secondary == --background라 완전히 안 보였다. */}
          <Badge
            variant="outline"
            className="border-primary/25 bg-primary/10 px-4 py-1 text-primary"
          >
            <Sparkles className="mr-1 h-3 w-3" />
            제휴 스토어 추천 코드 지원
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            투자 성공을 위한
            <span className="mt-2 block text-primary">최적의 플랜을 선택하세요</span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            AI 기반 시그널과 실시간 분석으로 투자 수익을 극대화하세요.
            <br />
            모든 플랜은 언제든지 취소하거나 변경할 수 있습니다.
          </p>

          {subscription?.subscribed && (
            <div className="pt-2">
              <Badge variant="default" className="px-4 py-1 text-sm">
                <Check className="mr-1 h-3 w-3" />
                {subscription.in_trial
                  ? `${currentPlan.toUpperCase()} 체험 중`
                  : `현재 플랜: ${currentPlan.toUpperCase()}`}
              </Badge>
              {trial?.unlimited ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {BETA_MESSAGES.trialUnlimited}
                </p>
              ) : trial?.endDate ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  체험 종료일: {trial.endDate}
                  {trial.daysRemaining !== null ? ` (${trial.daysRemaining}일 남음)` : ''}
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Trust Stats + Pricing Card */}
        <section className="mx-auto grid w-full max-w-3xl items-stretch justify-center gap-6 lg:grid-cols-[220px_minmax(360px,440px)]">
          <PricingStats />

          <div className="mx-auto grid w-full max-w-md gap-6 lg:mx-0 lg:max-w-[440px]">
            {pricingPlans.map((plan) => {
              const isCurrentPlan = plan.code === currentPlan;
              return (
                <PlanCard
                  key={plan.code}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  className="h-full"
                  cta={
                    isCurrentPlan ? (
                      <Link to="/billing" className="block">
                        {/* PlanCard 배경이 테마를 따르므로 버튼도 시맨틱 토큰을 쓴다.
                            variant="outline"의 bg-background가 카드 배경을 덮지 않도록
                            배경은 계속 투명하게 두고 글자만 foreground로 맞춘다. */}
                        <Button
                          variant="outline"
                          className="h-12 w-full border-border bg-transparent text-foreground hover:bg-muted hover:text-foreground"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          구독 관리
                        </Button>
                      </Link>
                    ) : (
                      <BetaPurchaseGate href={`/checkout?plan=${plan.code}`} className="block w-full">
                        <Button className={planCtaClass(plan.popular)}>
                          {plan.cta}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </BetaPurchaseGate>
                    )
                  }
                />
              );
            })}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Pro플랜 상세 안내</h2>
            <p className="mt-2 text-muted-foreground">각 플랜의 기능을 자세히 비교해보세요</p>
          </div>

          <PricingFeatureTable />
        </section>

        {/* Trust & Guarantee Section */}
        <section className="grid gap-6 md:grid-cols-3">
          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <Shield className="h-6 w-6 text-success" />
            </div>
            <h3 className="mb-2 font-semibold">7일 환불 보장</h3>
            <p className="text-sm text-muted-foreground">
              서비스에 만족하지 못하시면 7일 이내 전액 환불해드립니다.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">안전한 결제</h3>
            <p className="text-sm text-muted-foreground">
              SSL 암호화와 PCI DSS 준수로 결제 정보를 안전하게 보호합니다.
            </p>
          </Card>

          <Card className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <RefreshCcw className="h-6 w-6 text-amber-500" />
            </div>
            <h3 className="mb-2 font-semibold">언제든 취소 가능</h3>
            <p className="text-sm text-muted-foreground">
              위약금 없이 언제든지 구독을 취소하거나 변경할 수 있습니다.
            </p>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="flex items-center justify-center gap-2 text-2xl font-bold">
              <HelpCircle className="h-6 w-6" />
              자주 묻는 질문
            </h2>
            <p className="mt-2 text-muted-foreground">요금제에 대해 궁금한 점을 확인하세요</p>
          </div>

          <Card className="mx-auto max-w-3xl">
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        {/* 이전 분홍→라벤더 그라디언트는 라이트 모드에서 탁하고, 그 위의 outline 버튼이
            배경(--background)과 같은 색이라 거의 안 보였다 → 카드 표면 + 브랜드 틴트로 정리. */}
        <section className="space-y-6 rounded-2xl border border-border bg-gradient-to-br from-primary/[0.07] via-card to-card px-6 py-12 text-center shadow-sm">
          <h2 className="text-3xl font-bold">아직 결정이 어려우신가요?</h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            전문 상담을 통해 회원님에게 가장 적합한 플랜을 추천해드립니다.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/support" className="block w-full sm:w-auto">
              <Button
                variant="outline"
                className="h-12 w-full border-border bg-card px-8 text-base font-semibold hover:bg-foreground/[0.04] sm:w-auto"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                상담 문의하기
              </Button>
            </Link>
            <BetaPurchaseGate href="/checkout?plan=pro" className="block w-full sm:w-auto">
              <Button className="h-12 w-full px-8 text-base font-bold sm:w-auto">
                Pro 플랜으로 시작하기
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </BetaPurchaseGate>
          </div>
        </section>

        {/* Footer Note */}
        <section className="space-y-2 pb-8 text-center text-sm text-muted-foreground">
          <p>
            모든 가격은 {planSettings.pro.currency} 기준이며, 부가세가 별도로 부과될 수 있습니다.
          </p>
          <p>구독은 선택한 결제 주기에 따라 자동 갱신됩니다.</p>
        </section>
      </div>
    </>
  );
};

export default Pricing;
