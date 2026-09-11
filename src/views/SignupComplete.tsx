'use client';

/**
 * 회원가입 완료 온보딩 페이지
 * - 회원가입 축하 메시지
 * - 알림 설정
 * - CTA 버튼 (3일 무료체험, 수익인증 보러가기)
 * - 고객 후기
 * @route /signup-complete
 */

import { useState, useEffect, useRef, useCallback, type MouseEvent } from "react";
import { useNavigate } from "@/lib/navigation-compat";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Loader2,
  Bell,
  BellOff,
  Trophy,
  Rocket,
  PartyPopper,
  Star,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePlanSettings } from "@/hooks/usePlanSettings";

// 고객 후기 데이터
const TESTIMONIALS = [
  {
    id: "1",
    name: "김투자",
    role: "개인 투자자",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kim",
    content: "PULSE 시그널 덕분에 매매 타이밍을 잡기가 훨씬 쉬워졌어요. 이제 차트만 보고 있지 않아도 됩니다.",
    profit: "+127%",
  },
  {
    id: "2",
    name: "이트레이더",
    role: "전업 트레이더",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lee",
    content: "알림 기능이 정말 유용해요. 중요한 시그널을 놓치지 않고 바로 대응할 수 있습니다.",
    profit: "+89%",
  },
  {
    id: "3",
    name: "박코인",
    role: "직장인 투자자",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=park",
    content: "출퇴근 시간에도 시그널 알림으로 수익 기회를 잡을 수 있어서 좋습니다.",
    profit: "+156%",
  },
  {
    id: "4",
    name: "최수익",
    role: "신규 투자자",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=choi",
    content: "처음 시작하는 초보자도 쉽게 따라할 수 있어요. UI도 직관적이고 시그널 해석도 명확합니다.",
    profit: "+67%",
  },
  {
    id: "5",
    name: "정분석",
    role: "데이터 분석가",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jung",
    content: "AI 기반 분석이 정말 인상적입니다. 기술적 분석과 AI의 조합이 최고네요.",
    profit: "+203%",
  },
  {
    id: "6",
    name: "한승리",
    role: "풀타임 트레이더",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=han",
    content: "WAVE 시그널로 큰 추세를 잡고, PULSE로 단타 기회를 잡아요. 완벽한 조합입니다.",
    profit: "+312%",
  },
];

// 후기 카드 컴포넌트
const TestimonialCard = ({ name, role, avatar, content, profit }: {
  name: string;
  role: string;
  avatar: string;
  content: string;
  profit: string;
}) => (
  <div className="flex flex-col gap-4 rounded-xl p-5 bg-card/50 backdrop-blur border border-border/50 w-[320px] shrink-0">
    <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={name} />
          <AvatarFallback>{name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-green-500">{profit}</p>
        <p className="text-xs text-muted-foreground">수익률</p>
      </div>
    </div>
  </div>
);

export default function SignupComplete() {
  const { user, session, subscription, refreshSubscription, refreshPhoneVerified } = useAuth();
  const navigate = useNavigate();
  const { getPlanSetting } = usePlanSettings();
  const trialDays = getPlanSetting('pro').trialDays;

  const [isSaving, setIsSaving] = useState(false);
  const [confirmTrialOpen, setConfirmTrialOpen] = useState(false);

  // 가입 직후 바로 무료체험 이벤트를 제안한다 — 버튼을 눌러야만 다이얼로그가 뜨던
  // 이전 방식과 달리, 페이지 진입과 동시에 확인창을 띄운다. 이미 체험 중이거나
  // 구독 중인 계정(예: 뒤로가기로 재진입)이면 띄우지 않는다.
  useEffect(() => {
    if (subscription.subscribed) return;
    setConfirmTrialOpen(true);
  }, [subscription.subscribed]);

  // 이메일/비밀번호 가입 경로는 onAuthStateChange가 쏘는 백그라운드
  // checkPhoneVerified가 profiles.phone_verified UPDATE보다 먼저 읽어 stale한
  // false를 캐시해 버릴 수 있다(Signup.tsx의 signUp -> verify-phone-otp(userId)
  // 순서 참고) — 그러면 Header가 새로고침 전까지 "로그인 안 됨"처럼 보인다.
  // 이 페이지에 도달했다는 것 자체가 인증을 마쳤다는 뜻이므로, 진입 시 한 번 더
  // 확실히 재확인한다. "아니요"를 눌러도(=이 useEffect만 도는 경로) 여기서
  // 이미 갱신되므로 새로고침 없이 헤더가 정상 표시된다.
  useEffect(() => {
    void refreshPhoneVerified();
  }, []);

  // 알림 설정 상태
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // 알림 권한 확인
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  // 후기 캐러셀 상태
  const testimonialTrackRef = useRef<HTMLDivElement>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const [isTestimonialHovered, setIsTestimonialHovered] = useState(false);

  const scrollToTestimonial = useCallback((index: number) => {
    const track = testimonialTrackRef.current;
    if (!track) return;
    const clamped = ((index % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length;
    const card = track.children[clamped] as HTMLElement | undefined;
    if (card) {
      track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
    }
    setTestimonialIndex(clamped);
  }, []);

  // 자동 롤링: 4초마다 다음 후기로 이동, hover 중에는 멈춤
  useEffect(() => {
    if (isTestimonialHovered) return;
    const interval = setInterval(() => {
      scrollToTestimonial(testimonialIndex + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isTestimonialHovered, testimonialIndex, scrollToTestimonial]);

  // 알림 권한 요청
  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      return;
    }

    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      setNotificationsEnabled(permission === "granted");

      if (permission === "granted") {
        toast.success("알림이 활성화되었습니다!");
      } else if (permission === "denied") {
        toast.error("알림 권한이 거부되었습니다. 브라우저 설정에서 변경해주세요.");
      }
    }
  };

  // 저장 및 3일 무료체험 시작
  // AlertDialogAction(Radix)은 기본적으로 클릭 즉시 다이얼로그를 닫아 버려 응답을
  // 기다리지 않으므로, preventDefault로 기본 동작을 막고 성공했을 때만 닫는다.
  const handleComplete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (session) {
        const { error: trialError } = await supabase.functions.invoke("start-trial", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (trialError) throw trialError;
        await refreshSubscription();
      }
      toast.success(`${trialDays}일 무료체험이 시작되었습니다!`);
      setConfirmTrialOpen(false);
      navigate("/signals/pulse");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("저장에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-b dark:from-background dark:to-[hsl(220_30%_6%)]">
      {/* 축하 헤더 */}
      <div className="pt-12 pb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 rounded-full bg-primary/10 animate-bounce">
            <PartyPopper className="w-10 h-10 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          회원가입을 축하합니다!
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto px-4">
          <span className="whitespace-nowrap">{user?.email}님, AiXSignal에 오신 것을 환영합니다.</span>
          <br />
          시작하기 전에 몇 가지 설정을 완료해주세요.
        </p>
      </div>

      <div className="container max-w-4xl mx-auto px-4 pb-12 space-y-8">
        {/* 알림 설정 카드 */}
        <Card className="glass border-primary/20">
          <CardContent className="p-6 md:p-8">
            <div className="max-w-md mx-auto">
              {/* 알림 설정 섹션 */}
              <div className="space-y-6 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">시그널 알림 설정</h2>
                    <p className="text-sm text-muted-foreground">중요한 시그널을 놓치지 마세요</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col p-6 rounded-xl bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {notificationsEnabled ? (
                        <Bell className="w-6 h-6 text-primary" />
                      ) : (
                        <BellOff className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-base">푸시 알림</p>
                        <p className="text-sm text-muted-foreground">
                          {notificationsEnabled ? "알림이 활성화되어 있습니다" : "알림을 켜서 시그널을 받으세요"}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-center pt-4 border-t border-border/50 space-y-3">
                    {notificationsEnabled && (
                      <p className="text-sm font-medium text-green-500 flex items-center gap-2">
                        <Check className="w-4 h-4" /> 알림이 설정되었습니다
                      </p>
                    )}
                    <p className="text-sm font-medium text-foreground">받아보실 알림 종류</p>
                    <ul className="text-base text-muted-foreground space-y-2.5">
                      <li className="flex items-center gap-2">• PULSE™ 매수/매도 시그널</li>
                      <li className="flex items-center gap-2">• WAVE™ 추세 전환 알림</li>
                      <li className="flex items-center gap-2">• 급등락 코인 알림</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      웹 브라우저 알림은 Chrome, Edge 등 최신 브라우저에서 지원됩니다. 브라우저 알림 권한을 허용해두시면 사이트를 열어두지 않아도 알림을 받을 수 있습니다.
                    </p>
                  </div>

                  {notificationPermission === "default" && (
                    <div className="text-xs text-muted-foreground space-y-1 rounded-lg bg-background/60 p-3">
                      <p className="font-medium text-foreground">알림 켜는 방법</p>
                      <p>
                        위 스위치를 켜면 브라우저가 알림 권한을 묻는 팝업을 띄웁니다.
                        <span className="font-medium text-foreground">&quot;허용&quot;(Allow)</span>
                        을 눌러주세요.
                      </p>
                      <p>
                        Chrome, Edge 모두 주소창 오른쪽 근처에 작은 팝업으로 뜨며, 사용법은 두
                        브라우저가 동일합니다.
                      </p>
                    </div>
                  )}

                  {notificationPermission === "denied" && (
                    <div className="text-sm text-destructive space-y-1">
                      <p>브라우저에서 알림이 차단되어 있어 다시 요청할 수 없습니다. 아래 순서로 직접 허용해주세요.</p>
                      <ol className="list-decimal space-y-0.5 pl-4 text-xs">
                        <li>주소창 왼쪽의 자물쇠(또는 사이트 정보) 아이콘 클릭</li>
                        <li>&quot;알림&quot; 항목을 &quot;허용&quot;으로 변경</li>
                        <li>페이지를 새로고침</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA 버튼 섹션 */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl" />
          <div className="relative p-8 md:p-12 text-center space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              이제 시작할 준비가 되었습니다!
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              AiXSignal의 강력한 AI 시그널을 경험해보세요.<br />
              {trialDays}일 무료 체험으로 프리미엄 기능을 모두 이용할 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="gap-2 text-lg px-8 py-6"
                onClick={() => setConfirmTrialOpen(true)}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Rocket className="w-5 h-5" />
                )}
                {trialDays}일 무료체험 시작하기
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-lg px-8 py-6"
                onClick={() => navigate("/proof")}
              >
                <Trophy className="w-5 h-5" />
                수익인증 보러가기
              </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              신용카드 등록 없이 바로 시작 • 언제든 취소 가능
            </p>
          </div>
        </div>

        <AlertDialog open={confirmTrialOpen} onOpenChange={setConfirmTrialOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                {trialDays}일 PRO 무료체험 이벤트가 진행 중입니다. 지금 활성화하시겠습니까?
              </AlertDialogTitle>
              <AlertDialogDescription>
                지금 활성화하면 Pro 플랜 기능을 {trialDays}일간 무료로 이용할 수 있습니다. 체험 기간이 끝나면 별도 결제 없이 자동으로 Free 플랜으로 전환되며, 무료체험은 계정당 한 번만 이용할 수 있습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSaving}>아니요</AlertDialogCancel>
              <AlertDialogAction onClick={handleComplete} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                예
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 고객 후기 섹션 */}
        <div className="space-y-8 pt-8">
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">
              실제 사용자들의 후기
            </h2>
            <p className="text-muted-foreground">
              AiXSignal로 수익을 내고 있는 트레이더들의 이야기
            </p>
          </div>

          {/* 후기 캐러셀 — 스크롤 + 자동 롤링 + 이전/다음 버튼 */}
          <div
            className="relative"
            onMouseEnter={() => setIsTestimonialHovered(true)}
            onMouseLeave={() => setIsTestimonialHovered(false)}
          >
            <div
              ref={testimonialTrackRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {TESTIMONIALS.map((testimonial) => (
                <div key={testimonial.id} className="snap-start">
                  <TestimonialCard {...testimonial} />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent" />

            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-10"
              onClick={() => scrollToTestimonial(testimonialIndex - 1)}
              aria-label="이전 후기"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-10"
              onClick={() => scrollToTestimonial(testimonialIndex + 1)}
              aria-label="다음 후기"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* 인디케이터 */}
          <div className="flex justify-center gap-1.5">
            {TESTIMONIALS.map((testimonial, i) => (
              <button
                key={testimonial.id}
                onClick={() => scrollToTestimonial(i)}
                aria-label={`${i + 1}번째 후기로 이동`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === testimonialIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
