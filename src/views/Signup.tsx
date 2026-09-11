'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from '@/lib/navigation-compat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { faIcon } from '@/lib/fontawesome';
import { GoogleIcon, FacebookIcon, AppleIcon } from '@/components/auth/SocialIcons';
import { syncDomainSessionFromUser } from '@/lib/auth-domains/session';
import {
  buildAuthCallbackUrl,
  buildSignupReferralPath,
  REFERRAL_STORAGE_KEY,
} from '@/lib/auth/referral-navigation';
import { getFunctionErrorMessage } from '@/lib/functionErrorMessage';
import { CheckCircle2 } from 'lucide-react';
import { z } from 'zod';

// Validation schemas — parameterized by language since these live outside the component tree
const getEmailSchema = (isKo: boolean) =>
  z
    .string()
    .email(isKo ? '올바른 이메일 주소를 입력하세요' : 'Please enter a valid email address')
    .max(255);
const getPasswordSchema = (isKo: boolean) =>
  z
    .string()
    .min(
      6,
      isKo ? '비밀번호는 최소 6자 이상이어야 합니다' : 'Password must be at least 6 characters'
    )
    .max(100);
const getNicknameSchema = (isKo: boolean) =>
  z
    .string()
    .trim()
    .min(1, isKo ? '닉네임을 입력하세요' : 'Please enter a nickname')
    .max(50);
const getPhoneSchema = (isKo: boolean) =>
  z
    .string()
    .regex(
      /^0[0-9]{9,10}$/,
      isKo
        ? '올바른 한국 전화번호를 입력하세요 (010으로 시작)'
        : 'Please enter a valid Korean phone number (starting with 010)'
    );
const referralCodeSchema = z.string().trim().min(1).max(20);

function safeSeed(seed: string) {
  return encodeURIComponent(seed.trim().toLowerCase());
}

function buildDiceBearAvatarUrl(seed: string) {
  const style = 'bottts';
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed(seed)}`;
}

function getProviderLabel(provider: string | undefined) {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'facebook':
      return 'Facebook';
    case 'apple':
      return 'Apple';
    default:
      return null;
  }
}

/**
 * supabase.functions.invoke()의 error.message는 "Edge Function returned a
 * non-2xx status code" 같은 고정 문구라 실제 원인이 안 보인다. 진짜 메시지는
 * FunctionsHttpError.context(Response)의 JSON 바디에 있어 직접 파싱해야 한다.
 */
async function extractFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return String(body.error);
    } catch {
      /* 본문이 JSON이 아니면 fallback으로 진행 */
    }
  }
  return error instanceof Error ? error.message : fallback;
}

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const isKo = i18n.language === 'ko';
  /** 코드 곳곳에서 반복되는 ko/en 선택을 짧게 쓰기 위한 헬퍼. */
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const { user, isAuthenticated, isLoading: authLoading, refreshPhoneVerified } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const countryCode = '+82';
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isReferralLocked, setIsReferralLocked] = useState(false);
  const [agreeAge14, setAgreeAge14] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const allRequiredAgreed = agreeAge14 && agreeTerms && agreePrivacy;
  const allAgreed = allRequiredAgreed && agreeMarketing;
  const setAllRequiredAgreed = (checked: boolean) => {
    setAgreeAge14(checked);
    setAgreeTerms(checked);
    setAgreePrivacy(checked);
    setAgreeMarketing(checked);
  };

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);

  const validateReferralCode = async (value: string) => {
    const normalized = value.trim().toUpperCase();
    if (!normalized) return null;

    referralCodeSchema.parse(normalized);
    const { data, error } = await (supabase as any).rpc('validate_member_or_store_referral_code', {
      p_ref_code: normalized,
    });
    if (error) throw error;

    const resolved = Array.isArray(data) ? data[0] : null;
    if (!resolved?.valid) {
      throw new Error(
        tr(
          '유효하지 않거나 비활성화된 추천 코드입니다.',
          'The referral code is invalid or inactive.'
        )
      );
    }

    return normalized;
  };

  // ----------------------------
  // SNS 로그인 후 추가 정보 입력 (Form 2) 상태 — 같은 /signup 페이지에서 처리한다.
  // 별도 /verify-phone 라우트로 보내면 페이지가 바뀌는 느낌을 주므로, 로그인
  // 상태이면서 phone_verified가 아직 안 된 사용자는 이 페이지에서 바로
  // "추가 정보 입력" 폼을 이어서 보여준다.
  // ----------------------------
  const [checkingSocialProfile, setCheckingSocialProfile] = useState(true);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const [needsReferral, setNeedsReferral] = useState(false);
  const providerLabel = getProviderLabel(user?.app_metadata?.provider);

  // Check for referral code in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code') || searchParams.get('ref');
    if (codeFromUrl) {
      const upperCode = codeFromUrl.toUpperCase();
      setReferralCode(upperCode);
      setIsReferralLocked(true);
      localStorage.setItem(REFERRAL_STORAGE_KEY, upperCode);
      return;
    }

    const savedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (savedCode) {
      setReferralCode(savedCode.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      setNeedsPhoneVerification(false);
      setCheckingSocialProfile(false);
      return;
    }
    (async () => {
      const [{ data: profile }, { data: referral }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, phone_verified')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('referral_relationships')
          .select('id')
          .eq('referee_id', user.id)
          .maybeSingle(),
      ]);

      if (profile?.phone_verified) {
        // 이미 가입이 끝난 계정이 /signup에 들어온 경우 — 볼 것이 없으니 앱으로 보낸다.
        navigate('/signals', { replace: true });
        return;
      }

      setName(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '');
      setNickname(profile?.display_name ?? '');
      setNeedsReferral(!referral);
      setNeedsPhoneVerification(true);
      setCheckingSocialProfile(false);
    })();
  }, [isAuthenticated, authLoading, user, navigate]);

  const handleSendOtp = async () => {
    if (needsPhoneVerification) {
      if (!name.trim()) {
        toast.error(tr('이름을 입력해 주세요.', 'Please enter your name.'));
        return;
      }
      if (!nickname.trim()) {
        toast.error(tr('닉네임을 입력해 주세요.', 'Please enter a nickname.'));
        return;
      }
    }
    try {
      getPhoneSchema(isKo).parse(phoneNumber);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(
          err.issues[0]?.message ??
            tr('올바른 전화번호를 입력하세요', 'Please enter a valid phone number')
        );
      }
      return;
    }

    setSendingOtp(true);
    try {
      const { error } = await supabase.functions.invoke('send-phone-otp', {
        body: { phone: phoneNumber, countryCode },
      });
      if (error) throw error;
      setOtpSent(true);
      setOtpCode('');
      toast.success(tr('인증번호가 발송되었습니다.', 'Verification code sent.'));
    } catch (err: unknown) {
      toast.error(
        await extractFunctionErrorMessage(
          err,
          tr(
            '인증번호 발송 중 오류가 발생했습니다.',
            'An error occurred while sending the verification code.'
          )
        )
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!allRequiredAgreed) {
        toast.error(tr('필수 약관에 모두 동의해 주세요.', 'Please agree to all required terms.'));
        return;
      }

      if (password !== confirmPassword) {
        toast.error(tr('비밀번호가 일치하지 않습니다.', 'Passwords do not match.'));
        return;
      }

      getEmailSchema(isKo).parse(email);
      getPasswordSchema(isKo).parse(password);
      getNicknameSchema(isKo).parse(nickname);
      getPhoneSchema(isKo).parse(phoneNumber);
      const normalizedReferralCode = await validateReferralCode(referralCode);

      if (!otpSent || otpCode.length !== 6) {
        toast.error(
          tr('전화번호 인증번호를 입력해 주세요.', 'Please enter the phone verification code.')
        );
        return;
      }

      const { error: otpError } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phone: phoneNumber, countryCode, code: otpCode },
      });
      if (otpError) {
        toast.error(
          await extractFunctionErrorMessage(
            otpError,
            tr('인증번호가 올바르지 않습니다.', 'The verification code is incorrect.')
          )
        );
        return;
      }

      const avatarUrl = buildDiceBearAvatarUrl(email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: nickname,
            phone: `${countryCode}${phoneNumber}`,
            referral_code: normalizedReferralCode,
            avatar_url: avatarUrl,
            marketing_agreed: agreeMarketing,
            age_over_14_confirmed: agreeAge14,
            terms_agreed: agreeTerms,
            privacy_agreed: agreePrivacy,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        if (data.session?.user) {
          syncDomainSessionFromUser('member', data.session.user, 'member');
        }

        // 방금 만든 계정으로 직접 profiles.update()를 호출하면 새 세션이 아직
        // client에 완전히 반영되지 않아 RLS(auth.uid() = id)에 걸려 0 rows
        // 조용히 실패할 수 있다(에러 없이). verify-phone-otp Edge Function은
        // service role로 업데이트하므로 이 타이밍 문제 없이 안정적으로 반영된다.
        const { error: confirmErr } = await supabase.functions.invoke('verify-phone-otp', {
          body: { phone: phoneNumber, countryCode, code: otpCode, userId: data.user.id },
        });
        if (confirmErr) {
          toast.error(
            await extractFunctionErrorMessage(
              confirmErr,
              tr(
                '이미 다른 계정에 등록된 전화번호입니다.',
                'This phone number is already registered to another account.'
              )
            )
          );
          return;
        }
        toast.success(tr('회원가입이 완료되었습니다!', 'Sign up complete!'));
        navigate('/signup-complete', { state: { userId: data.user.id } });
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        toast.error(
          error.issues[0]?.message ?? tr('입력값을 확인해 주세요.', 'Please check your input.')
        );
      } else if (error instanceof Error) {
        toast.error(
          error.message ||
            tr('회원가입 중 오류가 발생했습니다.', 'An error occurred during sign up.')
        );
      } else {
        toast.error(tr('회원가입 중 오류가 발생했습니다.', 'An error occurred during sign up.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSocialSignup = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error(tr('이름을 입력해 주세요.', 'Please enter your name.'));
      return;
    }
    if (!nickname.trim()) {
      toast.error(tr('닉네임을 입력해 주세요.', 'Please enter a nickname.'));
      return;
    }
    if (!allRequiredAgreed) {
      toast.error(tr('필수 약관에 모두 동의해 주세요.', 'Please agree to all required terms.'));
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('verify-phone-otp', {
        body: { phone: phoneNumber, countryCode, code: otpCode, userId: user.id },
      });
      if (error) throw error;

      await supabase.from('profiles').update({ display_name: nickname.trim() }).eq('id', user.id);
      await supabase.auth.updateUser({
        data: { display_name: nickname.trim(), name: name.trim() },
      });

      const trimmedReferral = needsReferral
        ? await validateReferralCode(referralCode)
        : referralCode.trim().toUpperCase();
      if (needsReferral) {
        const { error: referralError } = await supabase.rpc('process_referral_code', {
          p_referee_id: user.id,
          p_ref_code: trimmedReferral ?? '',
        });
        if (referralError) throw referralError;
      }

      await supabase.auth.updateUser({
        data: {
          age_over_14_confirmed: true,
          terms_agreed: true,
          privacy_agreed: true,
        },
      });

      await refreshPhoneVerified();
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      toast.success(tr('가입이 완료되었습니다!', 'Sign up complete!'));
      // 이메일 가입과 동일하게 /signup-complete로 보내 알림 설정 안내와 무료체험
      // 시작 확인 다이얼로그를 거치게 한다 — 예전에는 여기서 바로 /signals로
      // 보내 SNS 가입자만 안내 없이 무료체험도 시작되지 않은 채 앱에 들어갔다.
      navigate('/signup-complete', { state: { userId: user.id } });
    } catch (error: unknown) {
      toast.error(
        await getFunctionErrorMessage(
          error,
          tr('가입 완료 중 오류가 발생했습니다.', 'An error occurred while completing sign up.')
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      // Keep referral in localStorage; apply it in auth/callback after session
      const normalizedReferralCode = await validateReferralCode(referralCode);
      if (normalizedReferralCode) {
        localStorage.setItem(REFERRAL_STORAGE_KEY, normalizedReferralCode);
      } else {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, normalizedReferralCode),
          // 브라우저에 이미 로그인된 세션이 있어도 항상 계정 선택 화면을 띄운다.
          // 없으면 원치 않는 계정으로 조용히 자동 로그인돼, 사용자가 다른 계정으로
          // 전환할 방법이 없어진다.
          ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
        },
      });

      if (error) throw error;
    } catch (error: unknown) {
      const fallback = tr(
        `${provider} 로그인 중 오류가 발생했습니다.`,
        `An error occurred while signing in with ${provider}.`
      );
      toast.error(error instanceof Error ? error.message || fallback : fallback);
    }
  };

  if (checkingSocialProfile) return null;

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Video Background */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-1/2">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/auth-background.mov" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-transparent" />

        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <h1 className="mb-6 text-4xl font-bold leading-tight">
            {isKo ? (
              <>
                기관급 투자 인사이트를
                <br />
                일상에서 실현하세요.
              </>
            ) : (
              <>
                Bring institutional-grade
                <br />
                investment insight to your daily life.
              </>
            )}
          </h1>
          <p className="text-lg leading-relaxed text-white/90">
            {tr(
              '하나의 강력한 시그널과 차트로 여러분의 투자를 수익으로 전환하세요. 700개가 넘는 고품질 전략에 의해 백테스팅과 유니크한 지표가 있는 대시보드로 전환하세요.',
              'Turn your investments into profit with one powerful signal and chart. Get a dashboard backed by backtesting across 700+ high-quality strategies and unique indicators.'
            )}
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {needsPhoneVerification ? (
            <>
              <div className="text-center">
                <h2 className="mb-2 text-3xl font-bold text-foreground">
                  {tr('추가 정보 입력', 'Complete Your Profile')}
                </h2>
                <p className="text-muted-foreground">
                  {tr(
                    'SNS 인증을 마쳤어요. 서비스 이용에 필요한 정보만 입력하면 가입이 완료됩니다.',
                    'Social verification is done. Just a few more details and your sign-up is complete.'
                  )}
                </p>
              </div>

              {providerLabel && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="text-sm leading-snug">
                    <p className="font-semibold text-foreground">
                      {tr(
                        `${providerLabel} 계정으로 인증되었습니다`,
                        `Verified with your ${providerLabel} account`
                      )}
                    </p>
                    {user?.email && (
                      <p className="text-muted-foreground">
                        {tr(
                          `${user.email} · 이름·이메일 자동 입력됨`,
                          `${user.email} · name & email auto-filled`
                        )}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {user?.email && (
                  <div>
                    <Label htmlFor="socialEmail">{tr('이메일', 'Email')}</Label>
                    <Input
                      id="socialEmail"
                      type="email"
                      value={user.email}
                      readOnly
                      disabled
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="socialName">{tr('이름', 'Name')}</Label>
                  <Input
                    id="socialName"
                    type="text"
                    placeholder={tr('이름을 입력하세요', 'Enter your name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={otpSent}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="socialNickname">
                    {tr('닉네임', 'Nickname')}{' '}
                    <span className="font-normal text-muted-foreground">
                      {tr('(서비스 내 표시 이름)', '(shown in the app)')}
                    </span>
                  </Label>
                  <Input
                    id="socialNickname"
                    type="text"
                    placeholder={tr('사용할 닉네임을 입력하세요', 'Enter a nickname to use')}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={otpSent}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="socialPhone">{tr('전화번호', 'Phone Number')}</Label>
                  <div className="mt-1 flex gap-2">
                    <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-input bg-muted text-sm text-muted-foreground">
                      +82
                    </div>
                    <Input
                      id="socialPhone"
                      type="tel"
                      placeholder="01012345678"
                      value={phoneNumber}
                      onChange={(e) => {
                        setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''));
                        setOtpSent(false);
                        setOtpCode('');
                      }}
                      disabled={otpSent}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      disabled={sendingOtp || !phoneNumber}
                      onClick={handleSendOtp}
                    >
                      {sendingOtp && <i className={`${faIcon('fa-spinner')} fa-spin mr-1`} />}
                      {otpSent ? tr('재발송', 'Resend') : tr('인증번호 발송', 'Send Code')}
                    </Button>
                  </div>

                  {otpSent && (
                    <Input
                      type="text"
                      placeholder={tr('인증번호 6자리', '6-digit code')}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                      }
                      maxLength={6}
                      className="mt-2"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="socialReferralCode">
                    {tr('스토어 또는 회원 추천 코드 (선택)', 'Store or member referral code (optional)')}
                  </Label>
                  <Input
                    id="socialReferralCode"
                    type="text"
                    placeholder={tr(
                      '제휴 스토어 코드가 있다면 입력하세요',
                      'Enter a store code if you have one'
                    )}
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    disabled={isLoading || isReferralLocked}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-border pb-2 font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={allRequiredAgreed}
                    onChange={(e) => setAllRequiredAgreed(e.target.checked)}
                    className="accent-primary"
                  />
                  {tr('전체 동의', 'Agree to All')}
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreeAge14}
                    onChange={(e) => setAgreeAge14(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="mr-1 text-xs text-destructive">
                      {tr('[필수]', '[Required]')}
                    </span>
                    {tr('만 14세 이상입니다', 'I am 14 years of age or older')}
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="mr-1 text-xs text-destructive">
                      {tr('[필수]', '[Required]')}
                    </span>
                    {isKo ? (
                      <>
                        <Link
                          to="/terms"
                          className="underline hover:text-foreground"
                          target="_blank"
                        >
                          이용약관
                        </Link>
                        에 동의합니다
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <Link
                          to="/terms"
                          className="underline hover:text-foreground"
                          target="_blank"
                        >
                          Terms of Service
                        </Link>
                      </>
                    )}
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="mr-1 text-xs text-destructive">
                      {tr('[필수]', '[Required]')}
                    </span>
                    {isKo ? (
                      <>
                        <Link
                          to="/privacy"
                          className="underline hover:text-foreground"
                          target="_blank"
                        >
                          개인정보 수집·이용
                        </Link>
                        에 동의합니다
                      </>
                    ) : (
                      <>
                        I agree to the{' '}
                        <Link
                          to="/privacy"
                          className="underline hover:text-foreground"
                          target="_blank"
                        >
                          collection and use of my personal information
                        </Link>
                      </>
                    )}
                  </span>
                </label>
              </div>

              <Button
                type="button"
                className="w-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isLoading || otpCode.length !== 6}
                onClick={handleCompleteSocialSignup}
              >
                {isLoading && <i className={`${faIcon('fa-spinner')} fa-spin mr-2`} />}
                {tr('가입 완료', 'Complete Sign Up')}
              </Button>

              <div className="pt-4 text-center text-xs text-muted-foreground">
                {tr('다른 계정으로 인증하시겠어요? ', 'Want to verify with a different account? ')}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() =>
                    supabase.auth
                      .signOut()
                      .then(() => navigate(buildSignupReferralPath(referralCode), { replace: true }))
                  }
                >
                  {tr('SNS 다시 선택', 'Choose SNS again')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="mb-2 text-3xl font-bold text-foreground">
                  {tr('계정 만들기', 'Create an account')}
                </h2>
                <p className="text-muted-foreground">{tr('무료로 시작하세요', 'Start for free')}</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">{tr('이메일', 'Email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={tr('이메일을 입력하세요', 'Enter your email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">{tr('비밀번호', 'Password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={tr(
                        '비밀번호를 입력하세요 (최소 6자)',
                        'Enter your password (min. 6 characters)'
                      )}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">
                      {tr('비밀번호 확인', 'Confirm Password')}
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={tr('비밀번호를 다시 입력하세요', 'Re-enter your password')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="nickname">
                      {tr('닉네임', 'Nickname')}{' '}
                      <span className="font-normal text-muted-foreground">
                        {tr('(서비스 내 표시 이름)', '(shown in the app)')}
                      </span>
                    </Label>
                    <Input
                      id="nickname"
                      type="text"
                      placeholder={tr('사용할 닉네임을 입력하세요', 'Enter a nickname to use')}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                      disabled={isLoading}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">{tr('전화번호', 'Phone Number')}</Label>
                    <div className="mt-1 flex gap-2">
                      <div className="flex h-10 w-16 shrink-0 items-center justify-center rounded-md border border-input bg-muted text-sm text-muted-foreground">
                        +82
                      </div>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01012345678"
                        value={phoneNumber}
                        onChange={(e) => {
                          setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''));
                          setOtpSent(false);
                          setOtpCode('');
                        }}
                        required
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={sendingOtp || isLoading || !phoneNumber}
                        onClick={handleSendOtp}
                      >
                        {sendingOtp && <i className={`${faIcon('fa-spinner')} fa-spin mr-1`} />}
                        {otpSent ? tr('재발송', 'Resend') : tr('인증번호 발송', 'Send Code')}
                      </Button>
                    </div>

                    {otpSent && (
                      <>
                        <Input
                          type="text"
                          placeholder={tr('인증번호 6자리', '6-digit code')}
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                          }
                          maxLength={6}
                          disabled={isLoading}
                          className="mt-2"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tr(
                            '인증번호가 발송되었습니다. 5분 내 입력해 주세요. 아래 회원가입 버튼을 누르면 함께 확인됩니다.',
                            'Code sent. Please enter it within 5 minutes — pressing Sign Up below will verify it too.'
                          )}
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="referralCode">
                      {tr('스토어 또는 회원 추천 코드 (선택)', 'Store or member referral code (optional)')}
                    </Label>
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder={tr(
                        '제휴 스토어 코드가 있다면 입력하세요',
                        'Enter a store code if you have one'
                      )}
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      disabled={isLoading || isReferralLocked}
                      className="mt-1"
                    />
                    {isReferralLocked && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {tr(
                          'URL에서 자동으로 적용된 추천 코드입니다.',
                          'This referral code was automatically applied from the URL.'
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
                  <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-border pb-2 font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={allAgreed}
                      onChange={(e) => setAllRequiredAgreed(e.target.checked)}
                      className="accent-primary"
                    />
                    {tr('전체 동의', 'Agree to All')}
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreeAge14}
                      onChange={(e) => setAgreeAge14(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      <span className="mr-1 text-xs text-destructive">
                        {tr('[필수]', '[Required]')}
                      </span>
                      {tr('만 14세 이상입니다', 'I am 14 years of age or older')}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      <span className="mr-1 text-xs text-destructive">
                        {tr('[필수]', '[Required]')}
                      </span>
                      {isKo ? (
                        <>
                          <Link
                            to="/terms"
                            className="underline hover:text-foreground"
                            target="_blank"
                          >
                            이용약관
                          </Link>
                          에 동의합니다
                        </>
                      ) : (
                        <>
                          I agree to the{' '}
                          <Link
                            to="/terms"
                            className="underline hover:text-foreground"
                            target="_blank"
                          >
                            Terms of Service
                          </Link>
                        </>
                      )}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2">
                    <input
                      type="checkbox"
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      <span className="mr-1 text-xs text-destructive">
                        {tr('[필수]', '[Required]')}
                      </span>
                      {isKo ? (
                        <>
                          <Link
                            to="/privacy"
                            className="underline hover:text-foreground"
                            target="_blank"
                          >
                            개인정보처리방침
                          </Link>
                          에 동의합니다
                        </>
                      ) : (
                        <>
                          I agree to the{' '}
                          <Link
                            to="/privacy"
                            className="underline hover:text-foreground"
                            target="_blank"
                          >
                            Privacy Policy
                          </Link>
                        </>
                      )}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={agreeMarketing}
                      onChange={(e) => setAgreeMarketing(e.target.checked)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      <span className="mr-1 text-xs">{tr('[선택]', '[Optional]')}</span>
                      {tr(
                        '마케팅 정보 수신에 동의합니다',
                        'I agree to receive marketing information'
                      )}
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-foreground text-background hover:bg-foreground/90"
                  disabled={isLoading}
                >
                  {isLoading && <i className={`${faIcon('fa-spinner')} fa-spin mr-2`} />}
                  {tr('회원가입', 'Sign Up')}
                </Button>
              </form>

              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin('google')}
                >
                  <GoogleIcon />
                  {tr('Google로 계속하기', 'Continue with Google')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin('facebook')}
                >
                  <FacebookIcon />
                  {tr('Facebook로 계속하기', 'Continue with Facebook')}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSocialLogin('apple')}
                >
                  <AppleIcon />
                  {tr('Apple로 계속하기', 'Continue with Apple')}
                </Button>
              </div>

              <div className="pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {tr('이미 계정이 있으신가요?', 'Already have an account?')}
                </p>
                <Link
                  to="/auth"
                  className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                >
                  {tr('로그인하기', 'Log In')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
