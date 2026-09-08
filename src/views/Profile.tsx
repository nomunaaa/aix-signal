'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/navigation-compat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBilingualText } from '@/hooks/useBilingualText';
import { getFunctionErrorMessage } from '@/lib/functionErrorMessage';
import { Loader2, MessageCircle, Bell, Settings, AlertTriangle } from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { PLAN_CATALOG, normalizePlanCode } from '@/config/plans';
import { describeTrialPeriod } from '@/lib/format-plan-date';
import MemberReferralPanel from '@/components/member-referral/MemberReferralPanel';
import { PhoneNumberSection } from '@/components/profile/PhoneNumberSection';
import { PUBLIC_BROWSING } from '@/config/access';
import { BETA_MESSAGES } from '@/config/beta';

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

function getProfileInitials(value: string | null | undefined) {
  const source = String(value ?? '').trim();
  if (!source) return 'AIX';

  const initials = source
    .split(/\s+/)
    .map((part) => Array.from(part)[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'AIX';
}

const Profile = () => {
  const { user, signOut, subscription, isLoading } = useAuth();
  const navigate = useNavigate();
  const { tr } = useBilingualText();
  const providerLabel = getProviderLabel(user?.app_metadata?.provider);
  const isSnsUser = providerLabel != null;

  const [profile, setProfile] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [nicknameInput, setNicknameInput] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [walletNetworkInput, setWalletNetworkInput] = useState('');
  const [walletAddressInput, setWalletAddressInput] = useState('');
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    setNicknameInput(
      profile?.display_name ||
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        ''
    );
  }, [profile, user]);

  useEffect(() => {
    setWalletNetworkInput(profile?.wallet_network || '');
    setWalletAddressInput(profile?.wallet_address || '');
  }, [profile]);

  const handleSaveNickname = async () => {
    if (!user?.id || !nicknameInput.trim()) {
      toast.error(tr('닉네임을 입력해 주세요', 'Please enter a nickname'));
      return;
    }
    setIsSavingNickname(true);
    try {
      const trimmed = nicknameInput.trim();
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { display_name: trimmed } });
      setProfile((prev: any) => (prev ? { ...prev, display_name: trimmed } : prev));
      toast.success(tr('닉네임이 저장되었습니다', 'Nickname saved'));
    } catch (error: unknown) {
      toast.error(
        await getFunctionErrorMessage(
          error,
          tr('닉네임 저장 중 오류가 발생했습니다', 'Could not save nickname')
        )
      );
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleSaveWallet = async () => {
    if (!user?.id) return;
    const trimmedAddress = walletAddressInput.trim();
    const trimmedNetwork = walletNetworkInput.trim();
    if (trimmedAddress && !trimmedNetwork) {
      toast.error(tr('네트워크를 입력해 주세요 (예: TRC20)', 'Please enter a network (e.g. TRC20)'));
      return;
    }
    setIsSavingWallet(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          wallet_network: trimmedNetwork || null,
          wallet_address: trimmedAddress || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfile((prev: any) =>
        prev ? { ...prev, wallet_network: trimmedNetwork || null, wallet_address: trimmedAddress || null } : prev
      );
      toast.success(tr('지갑 주소가 저장되었습니다', 'Wallet address saved'));
    } catch (error: unknown) {
      toast.error(
        await getFunctionErrorMessage(
          error,
          tr('지갑 주소 저장 중 오류가 발생했습니다', 'Could not save wallet address')
        )
      );
    } finally {
      setIsSavingWallet(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error(tr('현재 비밀번호를 입력해 주세요', 'Please enter your current password'));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(tr('비밀번호는 6자 이상이어야 합니다', 'Password must be at least 6 characters'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(tr('비밀번호가 일치하지 않습니다', 'Passwords do not match'));
      return;
    }
    if (!user?.email) {
      toast.error(tr('계정 정보를 확인할 수 없습니다', 'Could not verify account information'));
      return;
    }
    setIsChangingPassword(true);
    try {
      // updateUser()는 현재 세션만 있으면 통과하므로, 실제로 현재 비밀번호를 아는지는
      // signInWithPassword로 별도 검증해야 한다 — 그러지 않으면 세션을 탈취한 사람도
      // 비밀번호를 바꿀 수 있다.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error(tr('현재 비밀번호가 일치하지 않습니다', 'Current password is incorrect'));
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success(tr('비밀번호가 변경되었습니다', 'Password changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      toast.error(
        await getFunctionErrorMessage(
          error,
          tr('비밀번호 변경 중 오류가 발생했습니다', 'Could not change password')
        )
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // 공개 열람 중에는 /auth 로 보내지 않는다. 프로필 데이터는 RLS가 막는다.
      if (!PUBLIC_BROWSING) navigate('/auth');
      // 로딩 상태를 반드시 내려야 한다. loadProfile()이 호출되지 않는 경로라
      // 그냥 return하면 스피너가 영원히 돌고 화면이 비어 있는 것처럼 보인다.
      setIsProfileLoading(false);
      return;
    }
    loadProfile();
  }, [user, isLoading, navigate]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setIsProfileLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading profile:', profileError);
      }

      let finalProfile = profileData;
      if (!finalProfile) {
        const seed = user.email ?? user.id;
        const avatarUrl = buildDiceBearAvatarUrl(seed);

        const { data: upsertedProfile, error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: user.id,
              email: user.email ?? null,
              display_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              avatar_url: avatarUrl,
            },
            { onConflict: 'id' }
          )
          .select('*')
          .single();

        if (upsertError) {
          console.error('Error creating profile:', upsertError);
        } else {
          finalProfile = upsertedProfile;
        }
      }

      if (finalProfile) {
        setProfile(finalProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error(tr('로그인이 필요합니다', 'Login required'));
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;

      toast.success(tr('회원 탈퇴가 완료되었습니다', 'Account deleted'));
      await signOut();
      navigate('/');
    } catch (error: unknown) {
      toast.error(
        await getFunctionErrorMessage(
          error,
          tr('회원 탈퇴 중 오류가 발생했습니다', 'Could not delete account')
        )
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const getPlanBadge = (plan: string) => {
    const normalizedPlan = normalizePlanCode(plan);
    const badges = {
      free: { variant: 'outline' as const, label: PLAN_CATALOG.free.name },
      pro: { variant: 'default' as const, label: PLAN_CATALOG.pro.name },
    };
    return badges[normalizedPlan];
  };

  if (isLoading || isProfileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  // 공개 열람으로 들어온 비로그인 방문자에게는 "불러올 수 없습니다"가 오류처럼 읽힌다.
  // 실패한 게 아니라 보여줄 개인 데이터가 없는 것이므로, 로그인 안내로 구분해 준다.
  if (!user) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-muted-foreground">
          {tr('로그인하면 내 프로필을 확인할 수 있습니다.', 'Log in to view your profile.')}
        </p>
        <Button onClick={() => navigate('/auth')}>{tr('로그인하기', 'Log in')}</Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        {tr('프로필 정보를 불러올 수 없습니다.', 'Profile information could not be loaded.')}
      </div>
    );
  }

  const planBadge = subscription?.subscribed
    ? {
        ...getPlanBadge(subscription.plan),
        label: subscription.in_trial
          ? tr(
              `${getPlanBadge(subscription.plan).label} 체험 중`,
              `${getPlanBadge(subscription.plan).label} trial`
            )
          : getPlanBadge(subscription.plan).label,
      }
    : { variant: 'outline' as const, label: 'Free' };
  const trial = subscription?.in_trial
    ? describeTrialPeriod(subscription.subscription_end)
    : null;
  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    (user?.email
      ? buildDiceBearAvatarUrl(user.email)
      : user?.id
        ? buildDiceBearAvatarUrl(user.id)
        : null);
  const profileDisplayName =
    nicknameInput.trim() ||
    profile?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'AIX User';
  const profileInitials = getProfileInitials(profileDisplayName);

  return (
    <div className="w-full space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {tr('내 프로필', 'My Profile')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tr('계정 정보 및 알림 설정', 'Account information and alert settings')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] lg:items-stretch">
        <div className="flex flex-col gap-6 lg:h-full">
          <Card>
            <CardHeader>
              <CardTitle>{tr('기본 정보', 'Basic information')}</CardTitle>
              <CardDescription>
                {tr('회원 정보 및 플랜', 'Member information and plan')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                <div className="flex min-w-0 flex-col items-center gap-3 rounded-md bg-muted/30 px-4 py-5 text-center">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-primary/40 bg-primary/10">
                    <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-primary">
                      {profileInitials}
                    </div>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        className="relative h-full w-full bg-background object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                  </div>
                  <div className="w-full min-w-0 space-y-1">
                    <div className="w-full truncate text-sm font-semibold">
                      {profileDisplayName}
                    </div>
                    <div className="w-full truncate text-xs text-muted-foreground">
                      {user?.email || tr('이메일 없음', 'No email')}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>{tr('닉네임', 'Nickname')}</Label>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
                      <Input
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder={tr('닉네임을 입력하세요', 'Enter a nickname')}
                        className="min-w-0"
                      />
                      <Button
                        type="button"
                        onClick={handleSaveNickname}
                        disabled={isSavingNickname || !nicknameInput.trim()}
                        className="w-full"
                      >
                        {isSavingNickname ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {tr('저장', 'Save')}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{tr('이메일', 'Email')}</Label>
                    <Input value={user?.email || ''} readOnly className="bg-muted/30" />
                  </div>

                  <div className="space-y-2">
                    <Label>{tr('지갑 주소', 'Wallet address')}</Label>
                    <p className="text-xs text-muted-foreground">
                      {tr(
                        '정산금을 받으실 지갑 주소입니다. 네트워크(예: TRC20)와 주소를 함께 입력해 주세요.',
                        'The wallet address settlements will be sent to. Enter both the network (e.g. TRC20) and the address.'
                      )}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
                      <Input
                        value={walletNetworkInput}
                        onChange={(e) => setWalletNetworkInput(e.target.value)}
                        placeholder={tr('네트워크', 'Network')}
                        className="min-w-0"
                      />
                      <Input
                        value={walletAddressInput}
                        onChange={(e) => setWalletAddressInput(e.target.value)}
                        placeholder={tr('지갑 주소를 입력하세요', 'Enter your wallet address')}
                        className="min-w-0"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleSaveWallet}
                      disabled={isSavingWallet}
                      className="w-full sm:w-auto"
                    >
                      {isSavingWallet ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {tr('저장', 'Save')}
                    </Button>
                  </div>

                  {user?.id ? (
                    <PhoneNumberSection
                      userId={user.id}
                      phoneNumber={profile?.phone_number ?? null}
                      phoneVerified={Boolean(profile?.phone_verified)}
                      onUpdated={(phoneNumber) =>
                        setProfile((prev: any) =>
                          prev ? { ...prev, phone_number: phoneNumber, phone_verified: true } : prev
                        )
                      }
                    />
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border/60 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    {tr('플랜', 'Plan')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={planBadge.variant} className="shrink-0 whitespace-nowrap">
                      {planBadge.label}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/pricing')}
                      className="ml-auto h-8"
                    >
                      {tr('플랜 업그레이드', 'Upgrade plan')}
                    </Button>
                  </div>
                  {trial?.unlimited ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {BETA_MESSAGES.trialUnlimited}
                    </p>
                  ) : trial?.endDate ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {tr('체험 종료일', 'Trial ends')}: {trial.endDate}
                      {trial.daysRemaining !== null
                        ? tr(
                            ` (${trial.daysRemaining}일 남음)`,
                            ` (${trial.daysRemaining} days left)`
                          )
                        : ''}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-md border border-border/60 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    {tr('텔레그램 알림', 'Telegram alerts')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {profile.telegram_chat_id ? (
                      <>
                        <Badge variant="default" className="bg-green-500">
                          <MessageCircle className="mr-1 h-3 w-3" />
                          {tr('연결됨', 'Connected')}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/link-channels')}
                          className="ml-auto h-8"
                        >
                          {tr('관리', 'Manage')}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/link-channels')}
                        className="h-8"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {tr('연결하기', 'Connect')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <CardTitle>{tr('계정 관리', 'Account management')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="destructive" onClick={handleSignOut}>
                {tr('로그아웃', 'Log out')}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    {tr('회원 탈퇴', 'Delete account')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {tr('정말 탈퇴하시겠습니까?', 'Delete your account?')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tr(
                        '탈퇴 시 프로필, 구독, 알림 설정 등 모든 개인정보가 지체 없이 영구적으로 삭제되며 복구할 수 없습니다.',
                        'Your profile, subscription, alert settings, and personal data will be permanently deleted and cannot be restored.'
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeletingAccount}>
                      {tr('취소', 'Cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {tr('탈퇴하기', 'Delete account')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:h-full">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {tr('알림 설정', 'Alert settings')}
              </CardTitle>
              <CardDescription>
                {tr(
                  '텔레그램 알림 종목 및 방해금지 시간 설정',
                  'Configure alert symbols and quiet hours'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/alerts')} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                {tr('알림 설정으로 이동', 'Go to alert settings')}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-1 flex-col">
            <CardHeader>
              <CardTitle>{tr('비밀번호 변경', 'Change password')}</CardTitle>
              <CardDescription>
                {tr(
                  '현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다',
                  'Verify your current password before setting a new one'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-3">
              {isSnsUser ? (
                <p className="text-sm text-muted-foreground">
                  {tr(
                    `${providerLabel} 계정으로 로그인되어 있어 비밀번호를 변경할 수 없습니다. SNS 사용자로 로그인되어 있습니다.`,
                    `You're signed in with ${providerLabel}. Password changes aren't available for SNS accounts.`
                  )}
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>{tr('현재 비밀번호', 'Current password')}</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={tr('현재 비밀번호 입력', 'Enter current password')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr('새 비밀번호', 'New password')}</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={tr('6자 이상 입력', 'At least 6 characters')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{tr('새 비밀번호 확인', 'Confirm new password')}</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={tr('다시 입력', 'Re-enter password')}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={
                      isChangingPassword || !currentPassword || !newPassword || !confirmPassword
                    }
                  >
                    {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {tr('비밀번호 변경', 'Change password')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <MemberReferralPanel />
    </div>
  );
};

export default Profile;
