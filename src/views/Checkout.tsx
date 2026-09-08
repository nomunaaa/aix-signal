'use client';

// src/pages/Checkout.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "@/lib/navigation-compat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanSettings } from "@/hooks/usePlanSettings";
import { useStartFreeTrial } from "@/hooks/useStartFreeTrial";
import { formatPlanMoney } from "@/lib/plan-settings";
import { BETA_TEST, BETA_MESSAGES } from '@/config/beta';
import {
  CreditCard,
  Building2,
  Wallet,
  Check,
  Shield,
  Tag,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Loader2,
  Rocket,
} from "lucide-react";

const planDetails: Record<"pro", {
  name: string;
  monthlyPrice: number;
  features: string[];
  badge?: string;
  hasTelegram?: boolean;
}> = {
  pro: { name: "Pro", monthlyPrice: 300, badge: "인기", hasTelegram: true, features: ["최대 30개 종목", "실시간 데이터", "전체 근거 패널", "텔레그램 즉시 알림", "AI 리스크 코치"] },
};

type PaymentMethod = "card" | "bank" | "crypto";

interface PaymentMethodOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

const paymentMethods: PaymentMethodOption[] = [
  { id: "card", name: "신용/체크카드", description: "Stripe Checkout (Visa, Mastercard, AMEX)", icon: <CreditCard className="h-5 w-5" />, badge: "즉시 결제" },
  { id: "bank", name: "계좌이체", description: "가상계좌 발급 후 입금", icon: <Building2 className="h-5 w-5" /> },
  { id: "crypto", name: "암호화폐", description: "USDT, BTC, ETH 결제", icon: <Wallet className="h-5 w-5" />, badge: "5% 추가 할인" },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshSubscription, user, subscription } = useAuth();
  const { getPlanSetting } = usePlanSettings();
  const { startFreeTrial, isStarting: startingTrial } = useStartFreeTrial();

  const requestedPlanCode = searchParams.get("plan");
  const planCode = requestedPlanCode === "pro" ? requestedPlanCode : "pro";
  const runtimePlan = getPlanSetting(planCode);
  const plan = {
    ...planDetails[planCode],
    name: runtimePlan.displayName,
    monthlyPrice: runtimePlan.monthlyPrice,
    monthlyPriceCents: runtimePlan.monthlyPriceCents,
    currency: runtimePlan.currency,
    trialDays: runtimePlan.trialDays,
  };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const handledCheckoutResult = useRef(false);

  const [userPoints, setUserPoints] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  // Load points
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("profiles").select("points").eq("id", user.id).single();
      if (!error && data) setUserPoints(data.points || 0);
    })();
  }, [user]);

  // Verify provider-side payment before showing success.
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    const stripeSessionId = searchParams.get("session_id");

    if (canceled && !handledCheckoutResult.current) {
      handledCheckoutResult.current = true;
      toast.info("결제가 취소되었습니다.");
      return;
    }

    if (!success || handledCheckoutResult.current) return;
    handledCheckoutResult.current = true;

    if (!stripeSessionId) {
      void refreshSubscription();
      toast.info("결제 확인이 진행 중입니다.");
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error("Missing session");

        let verified = false;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const { data, error } = await supabase.functions.invoke("checkout-status", {
            body: { sessionId: stripeSessionId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (error) throw error;
          if (data?.paid === true && data?.status === "active" && data?.plan === "pro") {
            verified = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 750));
        }

        if (!verified) {
          toast.info("결제 확인이 아직 진행 중입니다. 잠시 후 다시 확인해주세요.");
          return;
        }

        await refreshSubscription();
        toast.success("결제가 완료되어 Pro 플랜이 활성화되었습니다!");
        navigate("/pricing?success=true");
      } catch {
        toast.error("결제 상태를 확인할 수 없습니다. 결제 내역을 확인해주세요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams, navigate, refreshSubscription]);

  // Pricing
  const basePrice = plan.monthlyPrice;
  const cryptoDiscount = paymentMethod === "crypto" ? Math.round((basePrice - couponDiscount) * 0.05) : 0;
  const priceAfterDiscounts = basePrice - couponDiscount - cryptoDiscount;

  const maxPointsUsable = Math.min(userPoints, priceAfterDiscounts);
  const pointDiscount = usePoints ? Math.min(pointsToUse, maxPointsUsable) : 0;

  const finalPrice = Math.max(0, priceAfterDiscounts - pointDiscount);
  const formatCheckoutMoney = (amount: number) =>
    formatPlanMoney(Math.round(amount * 100), plan.currency);

  // Points toggle
  useEffect(() => {
    if (usePoints && pointsToUse === 0) setPointsToUse(maxPointsUsable);
    if (!usePoints) setPointsToUse(0);
   
  }, [usePoints, maxPointsUsable]);

  // Coupon (demo client-side)
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("쿠폰 코드를 입력해주세요");
      return;
    }

    setApplyingCoupon(true);
    setCouponError("");

    await new Promise((r) => setTimeout(r, 600));

    // demo only: in real world validate in backend
    const validCoupons: Record<string, number> = { WELCOME10: 10, SAVE20: 20, VIP30: 30, LAUNCH50: 50 };
    const pct = validCoupons[couponCode.toUpperCase()];

    if (pct) {
      setCouponDiscount(Math.round(basePrice * (pct / 100)));
      setCouponApplied(true);
      toast.success(`쿠폰 적용! ${pct}% 할인`);
    } else {
      setCouponError("유효하지 않은 쿠폰 코드입니다");
      setCouponDiscount(0);
      setCouponApplied(false);
    }
    setApplyingCoupon(false);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponDiscount(0);
    setCouponApplied(false);
    setCouponError("");
  };

  async function handleCheckout() {
    // 화면 쪽 진입점(BetaPurchaseGate)을 우회해 /checkout에 직접 들어온 경우를
    // 대비한 2차 방어. 베타 기간에는 결제를 시작하지 않는다.
    if (BETA_TEST) {
      toast.error(BETA_MESSAGES.purchaseBlocked);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다");
        navigate("/auth");
        return;
      }

      // Provider map
      const providerMap: Record<PaymentMethod, string> = {
        card: "stripe",
        bank: "bank",
        crypto: "heleket",
      };

      const { data, error } = await supabase.functions.invoke("checkout-init", {
        body: {
          planCode,
          provider: providerMap[paymentMethod],
          couponCode: couponApplied ? couponCode : undefined,
          pointsUsed: pointDiscount,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (finalPrice === 0) {
        toast.success("포인트로 결제가 완료되었습니다!");
        refreshSubscription();
        setTimeout(() => navigate("/pricing?success=true"), 1200);
        return;
      }

      if (data?.url) window.location.href = data.url;
      else toast.error("결제 URL 생성 실패");
    } catch {
      toast.error("결제를 시작할 수 없습니다");
    } finally {
      setLoading(false);
    }
  }

  // BetaPurchaseGate는 화면 진입점(Pricing/Alerts/History)만 막는다. 이 페이지
  // 자체는 URL로 직접 들어오면 그대로 렌더링되어 결제 수단 선택 등 전체 결제 UI가
  // 보였다 — handleCheckout()의 2차 방어는 최종 제출만 막을 뿐 화면은 그대로였다.
  // "결제 섹션을 닫는다"는 요구를 만족하려면 페이지 자체를 막아야 한다.
  if (BETA_TEST) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg font-semibold">{BETA_MESSAGES.purchaseBlockedTitle}</p>
        <p className="text-muted-foreground">{BETA_MESSAGES.purchaseBlocked}</p>
        <Button onClick={() => navigate('/pricing')}>플랜 페이지로 돌아가기</Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild><Link to="/pricing">플랜</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>결제</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">결제하기</h1>
          <p className="text-muted-foreground">안전한 결제로 {plan.name} 플랜을 시작하세요</p>
        </div>

        {/* 가입 직후 무료체험 이벤트 팝업을 넘기고 결제 페이지로 바로 들어온 사용자에게
            다시 한번 기회를 준다 — 이미 체험 중이거나 구독 중이면 숨긴다. */}
        {!subscription.subscribed && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex flex-col items-center gap-3 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-3">
                <Rocket className="h-6 w-6 shrink-0 text-primary" />
                <div>
                  <p className="font-semibold">{plan.trialDays}일 PRO 무료체험 이벤트</p>
                  <p className="text-sm text-muted-foreground">
                    결제 없이 {plan.trialDays}일간 Pro 플랜 기능을 모두 이용해보세요.
                  </p>
                </div>
              </div>
              <Button
                onClick={async () => {
                  const started = await startFreeTrial();
                  if (started) navigate("/signals");
                }}
                disabled={startingTrial}
                className="shrink-0"
              >
                {startingTrial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {plan.trialDays}일 무료체험 활성화
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Billing cycle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> 결제 수단 선택
                </CardTitle>
                <CardDescription>원하시는 결제 방법을 선택해주세요</CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === method.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
                        }`}
                    >
                      <RadioGroupItem value={method.id} className="sr-only" />
                      <div className={`p-2 rounded-lg ${paymentMethod === method.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {method.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.name}</span>
                          {method.badge && <Badge variant="secondary" className="text-xs">{method.badge}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                      {paymentMethod === method.id && <Check className="h-5 w-5 text-primary" />}
                    </label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Bank info */}
            {paymentMethod === "bank" && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> 계좌이체 안내</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">결제 버튼 클릭 시 가상계좌가 발급됩니다.</p>
                    <p className="text-sm text-muted-foreground">입금 확인 후 24시간 이내 서비스가 활성화됩니다.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-muted-foreground">가상계좌 유효기간: 발급 후 24시간</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Crypto info */}
            {paymentMethod === "crypto" && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> 암호화폐 결제</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-medium text-primary">5% 추가 할인 적용!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">지원 코인: USDT (TRC20/ERC20), BTC, ETH</p>
                  </div>
                  <p className="text-sm text-muted-foreground">결제 버튼 클릭 시 암호화폐 결제 페이지로 이동합니다.</p>
                </CardContent>
              </Card>
            )}

            {/* Coupon */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" /> 할인 코드</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="coupon">쿠폰 코드</Label>
                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      placeholder="쿠폰 코드 입력"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      disabled={couponApplied}
                      className={couponApplied ? "bg-success/10 border-success" : ""}
                    />
                    {couponApplied ? (
                      <Button variant="outline" onClick={removeCoupon}>제거</Button>
                    ) : (
                      <Button variant="secondary" onClick={applyCoupon} disabled={applyingCoupon}>
                        {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "적용"}
                      </Button>
                    )}
                  </div>
                  {couponError && <p className="text-sm text-destructive">{couponError}</p>}
                  {couponApplied && (
                    <p className="text-sm text-success flex items-center gap-1">
                      <Check className="h-4 w-4" /> 쿠폰 적용 (-{formatCheckoutMoney(couponDiscount)})
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Telegram section (Pro only) */}
            {plan.hasTelegram && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ChevronRight className="h-5 w-5 text-[#2AABEE]" /> 텔레그램 알림 연결
                  </CardTitle>
                  <CardDescription>실시간 시그널을 텔레그램으로 즉시 받아보세요</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 rounded-xl border border-border bg-blue-500/5 p-4">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0 text-[#2AABEE]">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">텔레그램 연결 방법 안내</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        결제 완료 후 <strong className="text-foreground">[설정]</strong> 페이지에서 텔레그램 계정을 연결해야 합니다.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">※ 텔레그램 알림은 Pro 플랜에서만 제공됩니다.</p>
                </CardContent>
              </Card>
            )}

            {/* Points */}
            {userPoints > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> 포인트 사용</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">보유 포인트</p>
                      <p className="text-sm text-muted-foreground">
                        {userPoints.toFixed(2)} P (최대 {formatCheckoutMoney(maxPointsUsable)} 사용 가능)
                      </p>
                    </div>
                    <Switch checked={usePoints} onCheckedChange={setUsePoints} />
                  </div>

                  {usePoints && (
                    <div className="space-y-2">
                      <Label htmlFor="points-amount">사용할 포인트</Label>
                      <Input
                        id="points-amount"
                        type="number"
                        min="0"
                        max={maxPointsUsable}
                        step="1"
                        value={pointsToUse}
                        onChange={(e) => setPointsToUse(Math.min(parseFloat(e.target.value) || 0, maxPointsUsable))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card>
                <CardHeader><CardTitle>주문 요약</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{plan.name} 플랜</span>
                        {plan.badge && <Badge variant="secondary">{plan.badge}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">월간 구독</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCheckoutMoney(plan.monthlyPrice)}/월</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span>결제 주기</span><span>월간</span></div>
                    <div className="flex justify-between text-sm"><span>기본 요금</span><span>{formatCheckoutMoney(plan.monthlyPrice)}/월</span></div>
                    {couponDiscount > 0 && <div className="flex justify-between text-sm text-success"><span>쿠폰 할인</span><span>-{formatCheckoutMoney(couponDiscount)}</span></div>}
                    {cryptoDiscount > 0 && <div className="flex justify-between text-sm text-primary"><span>암호화폐 할인 (5%)</span><span>-{formatCheckoutMoney(cryptoDiscount)}</span></div>}
                    {pointDiscount > 0 && <div className="flex justify-between text-sm text-primary"><span>포인트 사용</span><span>-{formatCheckoutMoney(pointDiscount)}</span></div>}
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-lg">총 결제 금액</span>
                    <span className={`text-2xl font-bold ${finalPrice === 0 ? "text-success" : ""}`}>
                      {formatCheckoutMoney(finalPrice)}
                    </span>
                  </div>

                  <Button onClick={handleCheckout} disabled={loading} className="w-full h-12 text-base" size="lg">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> 처리 중...
                      </>
                    ) : (
                      <>
                        {finalPrice === 0 ? "무료로 시작하기" : `${formatCheckoutMoney(finalPrice)} 결제하기`}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>안전한 SSL 암호화 결제</span>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  결제에 문제가 있으신가요? 고객센터
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
