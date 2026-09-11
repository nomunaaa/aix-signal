'use client';

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "@/lib/navigation-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { faIcon } from "@/lib/fontawesome";
import { GoogleIcon, FacebookIcon, AppleIcon } from "@/components/auth/SocialIcons";
import { syncDomainSessionFromUser } from "@/lib/auth-domains/session";
import { buildAuthCallbackUrl, REFERRAL_STORAGE_KEY } from "@/lib/auth/referral-navigation";
import { z } from "zod";

// Validation schemas — parameterized by language since these live outside the component tree
const getEmailSchema = (isKo: boolean) =>
  z.string().email(isKo ? "올바른 이메일 주소를 입력하세요" : "Please enter a valid email address").max(255);
const getPasswordSchema = (isKo: boolean) =>
  z.string().min(6, isKo ? "비밀번호는 최소 6자 이상이어야 합니다" : "Password must be at least 6 characters").max(100);

function isPasswordLoginFailure(error: unknown) {
  if (!(error instanceof Error) || error instanceof z.ZodError) return false;
  return /invalid login credentials|email not confirmed|identity|provider|password/i.test(error.message);
}

const Auth = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  const isKo = i18n.language === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    navigate(redirect || "/home", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Validate inputs
      getEmailSchema(isKo).parse(email);
      getPasswordSchema(isKo).parse(password);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      if (data.session) {
        syncDomainSessionFromUser('member', data.session.user, 'member');
        toast.success(tr("로그인되었습니다!", "Logged in!"));

        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        navigate(redirect || "/home", { replace: true });
      }

    } catch (error: any) {
      if (isPasswordLoginFailure(error)) {
        toast.error(
          tr(
            "Email or password is incorrect. Existing operator accounts keep their old password; use the reset link if needed.",
            "Email or password is incorrect. Existing operator accounts keep their old password; use the reset link if needed.",
          ),
        );
      } else if (error instanceof z.ZodError) {
        toast.error(error.issues[0]?.message ?? tr("입력값을 확인해 주세요.", "Please check your input."));
      } else {
        toast.error(error.message || tr("로그인 중 오류가 발생했습니다.", "An error occurred while logging in."));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (
    provider: "google" | "facebook" | "apple"
  ) => {
    try {
      // localStorage-с referral кодыг авах
      const referralCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, referralCode),
          // 브라우저에 이미 로그인된 세션이 있어도 항상 계정 선택 화면을 띄운다.
          // 없으면 원치 않는 계정으로 조용히 자동 로그인돼, 사용자가 다른 계정으로
          // 전환할 방법이 없어진다.
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });

      if (error) throw error;

    } catch (error: any) {
      toast.error(
        error.message || tr(`${provider} 로그인 중 오류가 발생했습니다.`, `An error occurred while signing in with ${provider}.`)
      );
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Video Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/auth-background.mov" type="video/mp4" />
        </video>

        {/* Overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-transparent" />

        {/* Text Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="text-4xl font-bold mb-6 leading-tight">
            {isKo ? (
              <>기관급 투자 인사이트를<br />일상에서 실현하세요.</>
            ) : (
              <>Bring institutional-grade<br />investment insight to your daily life.</>
            )}
          </h1>
          <p className="text-lg text-white/90 leading-relaxed">
            {tr(
              "하나의 강력한 시그널과 차트로 여러분의 투자를 수익으로 전환하세요. 700개가 넘는 고품질 전략에 의해 백테스팅과 유니크한 지표가 있는 대시보드로 전환하세요.",
              "Turn your investments into profit with one powerful signal and chart. Get a dashboard backed by backtesting across 700+ high-quality strategies and unique indicators."
            )}
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              {tr("로그인 또는 등록", "Log In or Sign Up")}
            </h2>
            <p className="text-muted-foreground">{tr("이메일 또는 소셜계정 이용", "Use email or a social account")}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">{tr("이메일", "Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={tr("이메일을 입력하세요", "Enter your email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="password">{tr("암호", "Password")}</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {tr("암호 재설정", "Reset Password")}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={tr("비밀번호를 입력하세요", "Enter your password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              disabled={isLoading}
            >
              {isLoading && (
                <i className={`${faIcon("fa-spinner")} fa-spin mr-2`} />
              )}
              {tr("로그인", "Log In")}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">
                {tr("또는", "or")}
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin("google")}
            >
              <GoogleIcon />
              {tr("Google로 계속하기", "Continue with Google")}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin("facebook")}
            >
              <FacebookIcon />
              {tr("Facebook로 계속하기", "Continue with Facebook")}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleSocialLogin("apple")}
            >
              <AppleIcon />
              {tr("Apple로 계속하기", "Continue with Apple")}
            </Button>
          </div>

          {/* Sign Up Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              {tr("아직 무료 계정이 없으신가요?", "Don't have a free account yet?")}
            </p>
            <Link
              to="/signup"
              className="text-sm text-primary font-medium hover:underline mt-1 inline-block"
            >
              {tr("계정 만들기", "Create an account")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
