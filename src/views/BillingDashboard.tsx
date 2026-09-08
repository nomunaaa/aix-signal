'use client';

import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, Link } from "@/lib/navigation-compat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RefundRequestCard from "@/components/billing/RefundRequestCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Calendar,
  Receipt,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Rocket,
  Download,
  RefreshCw,
  Settings,
  Shield,
  Gift,
  ChevronRight,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  FileText,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAN_CATALOG, normalizePlanCode, type PlanCode } from "@/config/plans";
import { usePlanSettings } from "@/hooks/usePlanSettings";
import { formatPlanMoney, type RuntimePlanSettings } from "@/lib/plan-settings";
import { PUBLIC_BROWSING } from "@/config/access";

interface Subscription {
  id: string;
  plan_code: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at: string | null;
  provider: string;
}

interface Invoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  provider_invoice_id: string;
}

const planIcons: Record<PlanCode, ReactNode> = {
  free: <Gift className="h-5 w-5" />,
  pro: <Rocket className="h-5 w-5" />,
};

const getPlanConfig = (plan: PlanCode, setting?: RuntimePlanSettings) => ({
  name: setting?.displayName ?? PLAN_CATALOG[plan].name,
  icon: planIcons[plan],
  color: PLAN_CATALOG[plan].gradientClass,
  priceCents: setting?.monthlyPriceCents ?? Math.round(PLAN_CATALOG[plan].monthlyPrice * 100),
  currency: setting?.currency ?? 'USD',
  trialDays: setting?.trialDays ?? 3,
  limits: PLAN_CATALOG[plan].usageLimits,
});

const BillingDashboard = () => {
  const { user, session, isLoading: authLoading, subscription: authSubscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const { getPlanSetting } = usePlanSettings();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [usageData, _setUsageData] = useState({ symbols: 12, alerts: 45 });
  const [cancelLoading, setCancelLoading] = useState(false);

  /** 유료 구독이 살아 있는 동안에만 취소 카드를 노출한다. */
  const isSubscribed =
    normalizePlanCode(subscription?.plan_code) !== 'free' &&
    (subscription?.status === 'active' || subscription?.status === 'trialing');

  /**
   * 즉시 해지가 아니라 현재 결제 기간 끝에 종료(cancel_at_period_end).
   * subscriptions 테이블 반영은 Stripe가 쏘는 customer.subscription.updated를
   * stripe-webhook이 받아서 처리한다 — 여기서 직접 쓰지 않는다.
   */
  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      if (!session) {
        toast.error('로그인이 필요합니다');
        return;
      }

      const { error } = await supabase.functions.invoke('cancel-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      toast.success('구독 취소가 요청되었습니다. 현재 결제 기간이 끝나면 자동으로 종료됩니다.');
      await refreshSubscription();
      await loadBillingInfo();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('구독 취소에 실패했습니다');
    } finally {
      setCancelLoading(false);
    }
  };

  useEffect(() => {
    // 세션 복원이 끝나기 전에는 판단하지 않는다. AuthContext는 초기 1회 세션을
    // 복원하는 동안 isLoading=true / user=null 이므로, 이 값을 보지 않으면
    // 로그인한 사용자도 마운트 즉시 !user 로 걸려 /auth 로 튕겼다.
    // 그 뒤 /auth 가 로그인 상태를 보고 다시 /home 으로 보내면서
    // "결제 → 로그인 → 시그널" 로 되돌아가는 현상이 생긴다.
    if (authLoading) return;

    if (!user) {
      // 공개 열람 중에는 /auth 로 보내지 않고 빈 화면 그대로 보여준다.
      // 결제 데이터는 RLS가 막으므로 레이아웃만 노출된다.
      if (!PUBLIC_BROWSING) navigate('/auth');
      // loadBillingInfo()를 타지 않는 경로이므로 여기서 로딩을 내리지 않으면
      // 스켈레톤이 영원히 남는다.
      setLoading(false);
      return;
    }
    loadBillingInfo();
  }, [user, authLoading, navigate]);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('billing-info');

      if (error) throw error;

      setSubscription(data?.subscription || null);
      setInvoices(data?.invoices || []);
    } catch (error) {
      console.error('Failed to load billing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription();
      await loadBillingInfo();
      toast.success('구독 정보가 업데이트되었습니다');
    } catch {
      toast.error('업데이트에 실패했습니다');
    } finally {
      setRefreshing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error('구독 관리 페이지로 이동할 수 없습니다');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const getDaysRemaining = () => {
    if (!subscription?.current_period_end) return 0;
    const end = new Date(subscription.current_period_end);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: { label: '활성', variant: 'default' as const, icon: CheckCircle, color: 'text-success' },
      past_due: { label: '연체', variant: 'destructive' as const, icon: AlertCircle, color: 'text-destructive' },
      canceled: { label: '취소 예정', variant: 'secondary' as const, icon: Clock, color: 'text-amber-500' },
      trialing: { label: '체험 중', variant: 'default' as const, icon: Sparkles, color: 'text-primary' },
    };
    return configs[status as keyof typeof configs] || configs.active;
  };

  const currentPlanKey = normalizePlanCode(
    authSubscription.subscribed ? authSubscription.plan : 'free'
  );
  const currentPlan = getPlanConfig(currentPlanKey, getPlanSetting(currentPlanKey));
  const daysRemaining = getDaysRemaining();

  if (loading) {
    return (
        <div className="w-full space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <Skeleton className="h-96" />
        </div>
    );
  }

  return (
      <div className="w-full space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/signals">홈</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>결제 대시보드</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">결제 대시보드</h1>
            <p className="text-muted-foreground mt-1">구독 및 결제 정보를 관리하세요</p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            새로고침
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4">
          {/* Current Plan */}
          <Card className={cn(
            "relative overflow-hidden",
            authSubscription?.subscribed && "border-primary"
          )}>
            <div className={cn(
              "absolute inset-0 opacity-10 bg-gradient-to-br",
              currentPlan.color
            )} />
            <CardContent className="pt-6 relative">
              <div className="flex items-center justify-between mb-2">
                <div className={cn(
                  "p-2 rounded-lg bg-gradient-to-br text-white",
                  currentPlan.color
                )}>
                  {currentPlan.icon}
                </div>
                <Badge variant={authSubscription?.subscribed ? "default" : "secondary"}>
                  {authSubscription?.subscribed ? '활성' : '무료'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">현재 플랜</p>
              <p className="text-2xl font-bold">{currentPlan.name}</p>
            </CardContent>
          </Card>

          {/* Next Billing */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5" />
                </div>
                {daysRemaining <= 7 && daysRemaining > 0 && (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                    곧 갱신
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">다음 결제일</p>
              <p className="text-2xl font-bold">
                {subscription?.current_period_end
                  ? `${daysRemaining}일 후`
                  : '-'
                }
              </p>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(subscription.current_period_end)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Cost */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">월 요금</p>
              <p className="text-2xl font-bold">
                {formatPlanMoney(currentPlan.priceCents, currentPlan.currency)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {authSubscription?.subscribed ? '자동 갱신' : '무료'}
              </p>
            </CardContent>
          </Card>

          {/* Usage */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-muted">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">사용량</p>
              <p className="text-2xl font-bold">
                {usageData.symbols}/{currentPlan.limits.symbols === -1 ? '∞' : currentPlan.limits.symbols}
              </p>
              <p className="text-xs text-muted-foreground mt-1">모니터링 종목</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6 lg:items-stretch">
          {/* Left Column */}
          <div className="flex flex-col gap-6 lg:col-span-2 lg:h-full">
            {/* Subscription Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    구독 정보
                  </CardTitle>
                  {subscription && (
                    <Badge
                      variant={getStatusConfig(subscription.status).variant}
                      className="flex items-center gap-1"
                    >
                      {(() => {
                        const Icon = getStatusConfig(subscription.status).icon;
                        return <Icon className="h-3 w-3" />;
                      })()}
                      {getStatusConfig(subscription.status).label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription ? (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">플랜</p>
                        <p className="font-semibold flex items-center gap-2">
                          {currentPlan.icon}
                          {currentPlan.name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">결제 방식</p>
                        <p className="font-semibold capitalize">{subscription.provider}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">구독 시작일</p>
                        <p className="font-semibold">{formatDate(subscription.current_period_start)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">다음 결제일</p>
                        <p className="font-semibold">
                          {subscription.cancel_at
                            ? `${formatDate(subscription.cancel_at)} (취소 예정)`
                            : formatDate(subscription.current_period_end)
                          }
                        </p>
                      </div>
                    </div>

                    {/* Billing Period Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">결제 주기</span>
                        <span>{daysRemaining}일 남음</span>
                      </div>
                      <Progress value={((30 - daysRemaining) / 30) * 100} className="h-2" />
                    </div>

                    {subscription.cancel_at && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">
                          구독이 {formatDate(subscription.cancel_at)}에 종료됩니다
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={handleManageSubscription} className="flex-1">
                        <Settings className="h-4 w-4 mr-2" />
                        구독 관리
                      </Button>
                      <Link to="/pricing" className="flex-1">
                        <Button variant="outline" className="w-full">
                          <ArrowUpRight className="h-4 w-4 mr-2" />
                          플랜 변경
                        </Button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-5">
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                      <Gift className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="mx-auto max-w-md space-y-2">
                      {/* 체험 중(트라이얼)에는 상세 Stripe 구독 레코드가 없어 subscription이 null이지만,
                          실제로는 구독 중이므로 "활성 구독 없음"으로 표시하면 안 된다. */}
                      <p className="font-medium">
                        {authSubscription?.subscribed
                          ? `${authSubscription.plan?.toUpperCase()} 체험 중`
                          : '활성 구독이 없습니다'}
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {authSubscription?.subscribed
                          ? '결제 수단이 등록되지 않았습니다. 체험 종료 후에도 계속 이용하려면 결제 수단을 등록하세요.'
                          : '프리미엄 기능을 이용하려면 플랜을 선택하세요'}
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link to="/pricing">
                        <Button>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {authSubscription?.subscribed ? '구독 관리' : '플랜 선택하기'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice History */}
            <Card className="flex flex-1 flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  결제 내역
                </CardTitle>
                <CardDescription>최근 결제 및 청구서</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {invoices.length > 0 ? (
                  <div className="space-y-3">
                    {invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "p-2 rounded-lg",
                            invoice.status === 'paid' ? 'bg-success/10' : 'bg-muted'
                          )}>
                            <FileText className={cn(
                              "h-5 w-5",
                              invoice.status === 'paid' ? 'text-success' : 'text-muted-foreground'
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatAmount(invoice.amount_cents, invoice.currency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(invoice.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.status === 'paid' ? '결제 완료' : invoice.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>결제 내역이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6 lg:h-full">
            {/* Plan Features */}
            <Card className={currentPlanKey === 'pro' ? 'flex flex-1 flex-col' : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {currentPlan.icon}
                  {currentPlan.name} 플랜 혜택
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentPlanKey === 'pro' && (
                  <>
                    <Feature text="최대 30개 종목 모니터링" />
                    <Feature text="실시간 데이터 스트리밍" />
                    <Feature text="전체 근거 패널 접근" />
                    <Feature text="텔레그램 즉시 알림" />
                    <Feature text="AI 리스크 코치" />
                    <Feature text="우선 이메일 지원" />
                  </>
                )}
                {currentPlanKey === 'free' && (
                  <>
                    <Feature text={`${currentPlan.trialDays}일 무료 체험`} />
                    <Feature text="기본 차트 기능" />
                    <Feature text="커뮤니티 지원" />
                  </>
                )}

                {!authSubscription?.subscribed && (
                  <div className="pt-4">
                    <Link to="/pricing">
                      <Button className="w-full" variant="outline">
                        업그레이드하기
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>빠른 메뉴</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/pricing" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-3" />
                    플랜 비교
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleManageSubscription}
                >
                  <CreditCard className="h-4 w-4 mr-3" />
                  결제 수단 변경
                </Button>
                <Link to="/support" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-3" />
                    결제 문의
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Upgrade CTA */}
            {currentPlanKey !== 'pro' && (
              <Card className="bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                <CardContent className="pt-6 text-center space-y-3">
                  <Sparkles className="h-10 w-10 mx-auto text-primary" />
                  <div>
                    <p className="font-semibold">더 많은 기능이 필요하신가요?</p>
                    <p className="text-sm text-muted-foreground">
                      상위 플랜으로 업그레이드하고
                      <br />
                      프리미엄 기능을 이용하세요
                    </p>
                  </div>
                  <Link to="/pricing">
                    <Button className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      업그레이드
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 환불 요청 — payments 원장 기반, 자격 판정은 DB에 위임 */}
        <RefundRequestCard />

        {/* Cancel Subscription — /manage-subscription에서 이관 */}
        {isSubscribed && (
          <Card className="border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-destructive/10 p-3">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold">구독 취소</p>
                    <p className="text-sm text-muted-foreground">
                      현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다
                    </p>
                  </div>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    >
                      취소하기
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>구독을 취소하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        구독을 취소하면 현재 결제 기간이 끝날 때까지만 프리미엄 기능을 이용할 수
                        있습니다. 이후에는 무료 플랜으로 전환됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>돌아가기</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelSubscription}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={cancelLoading}
                      >
                        {cancelLoading ? '처리 중...' : '구독 취소'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
};

// Feature component
const Feature = ({ text }: { text: string }) => (
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
    <span className="text-sm">{text}</span>
  </div>
);

export default BillingDashboard;
