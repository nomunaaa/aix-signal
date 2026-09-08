'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  Clock,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SMSSetup } from '@/components/charts/channels/SMSSetup';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from '@/lib/navigation-compat';

type TelegramGroupStatus =
  | 'not_linked'
  | 'no_group_expected'
  | 'unchecked'
  | 'member'
  | 'not_member'
  | 'check_failed';

type TelegramStatus = {
  linked: boolean;
  plan: 'free' | 'pro';
  subscription_status: string;
  expected_group: {
    id: number;
    name: string;
  } | null;
  cached_group_access: boolean;
  last_synced_at: string | null;
  membership: {
    checked: boolean;
    is_member: boolean;
    error: string | null;
  };
  status: TelegramGroupStatus;
  invite_sent?: boolean;
  invite_error?: string | null;
};

type TelegramStatusResponse = {
  phone_number: string | null;
  telegram: TelegramStatus;
};

function formatSyncTime(value: string | null) {
  if (!value) return '확인 이력 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '확인 이력 없음';
  return date.toLocaleString('ko-KR');
}

function getTelegramBotName() {
  const botName = (
    process.env.NEXT_PUBLIC_TG_BOT_NAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME ||
    ''
  ).replace(/^@/, '');

  return botName || null;
}

function buildLegacyTelegramLink(userId: string) {
  const botName = getTelegramBotName();
  if (!botName) return null;

  const payload = `link_${userId}_${Date.now()}`;
  return `https://t.me/${botName}?start=${encodeURIComponent(payload)}`;
}

function getStatusMeta(status: TelegramGroupStatus, inviteSent?: boolean) {
  if (inviteSent) {
    return {
      label: '초대 발송됨',
      description: '새 그룹 초대 링크를 텔레그램 채팅으로 보냈습니다.',
      className: 'border-sky-500/25 bg-sky-500/10 text-sky-500',
      icon: Send,
    };
  }

  switch (status) {
    case 'member':
      return {
        label: '그룹 접근 활성',
        description: '현재 지정된 텔레그램 그룹에 참여 중입니다.',
        className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
        icon: ShieldCheck,
      };
    case 'not_member':
      return {
        label: '미참여',
        description: '현재 플랜에 그룹 접근 권한이 있지만 봇이 아직 참여 상태를 확인하지 못했습니다.',
        className: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
        icon: AlertCircle,
      };
    case 'no_group_expected':
      return {
        label: '현재 플랜은 그룹 미포함',
        description: '현재 플랜에는 텔레그램 그룹 접근 권한이 포함되어 있지 않습니다.',
        className: 'border-muted bg-muted/30 text-muted-foreground',
        icon: Clock,
      };
    case 'check_failed':
      return {
        label: '확인 실패',
        description: '지금은 봇이 그룹 참여 상태를 확인할 수 없습니다.',
        className: 'border-destructive/25 bg-destructive/10 text-destructive',
        icon: AlertCircle,
      };
    case 'not_linked':
      return {
        label: '텔레그램 미연결',
        description: '먼저 텔레그램 계정을 연결하세요.',
        className: 'border-muted bg-muted/30 text-muted-foreground',
        icon: MessageCircle,
      };
    default:
      return {
        label: '미확인',
        description: '상태를 새로고침해 텔레그램 그룹 접근 권한을 확인하세요.',
        className: 'border-muted bg-muted/30 text-muted-foreground',
        icon: Clock,
      };
  }
}

export default function LinkChannels() {
  const { user } = useAuth();
  const [telegramLink, setTelegramLink] = useState('');
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [resendingInvite, setResendingInvite] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-status', {
        body: { action: 'status' },
      });

      if (error) throw error;

      const result = data as TelegramStatusResponse;
      setTelegramStatus(result.telegram);
      setTelegramLinked(result.telegram.linked);
      setPhoneNumber(result.phone_number ?? null);
      if (result.telegram.plan === 'free') setTelegramLink('');
    } catch (error) {
      console.error('Error loading channel status:', error);
      toast.error('텔레그램 채널 상태를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const generateTelegramLink = useCallback(async () => {
    if (!user?.id) return;
    if (telegramStatus?.plan === 'free') {
      setTelegramLink('');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('tg-link-token');

      if (error) throw error;

      const deepLink = typeof data?.deepLink === 'string' ? data.deepLink : '';
      if (!deepLink) throw new Error('텔레그램 링크가 반환되지 않았습니다.');

      setTelegramLink(deepLink);
    } catch (error) {
      console.error('Error generating Telegram link:', error);
      const fallbackLink = buildLegacyTelegramLink(user.id);
      if (fallbackLink) {
        setTelegramLink(fallbackLink);
        toast.info('보안 텔레그램 링크를 임시로 사용할 수 없어 기본 봇 링크를 사용합니다.');
      } else {
        toast.error('텔레그램 링크를 생성하지 못했습니다. 봇 설정을 확인하세요.');
      }
    } finally {
      setGenerating(false);
    }
  }, [telegramStatus?.plan, user?.id]);

  const unlinkTelegram = async () => {
    if (!user?.id) return;

    setUnlinking(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          telegram_chat_id: null,
          telegram_group_access: false,
          telegram_last_synced_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id);

      if (error) throw error;

      setTelegramLinked(false);
      setTelegramStatus((prev) =>
        prev
          ? {
              ...prev,
              linked: false,
              cached_group_access: false,
              status: 'not_linked',
              last_synced_at: new Date().toISOString(),
              membership: { checked: false, is_member: false, error: null },
            }
          : null
      );
      setTelegramLink('');
      toast.success('텔레그램 연결이 해제되었습니다.');
    } catch (error) {
      console.error('Error unlinking Telegram:', error);
      toast.error('텔레그램 연결 해제에 실패했습니다.');
    } finally {
      setUnlinking(false);
    }
  };

  const resendInvite = async () => {
    if (!user?.id) return;
    if (!telegramStatus?.linked) {
      toast.info('먼저 텔레그램 계정을 연결하세요.');
      return;
    }
    if (telegramStatus.plan === 'free' || !telegramStatus.expected_group) {
      toast.info('Free 플랜은 텔레그램 그룹 초대 대상이 아닙니다.');
      return;
    }

    setResendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-status', {
        body: { action: 'resend_invite' },
      });

      if (error) throw error;

      const result = data as TelegramStatusResponse;
      setTelegramStatus(result.telegram);
      setTelegramLinked(result.telegram.linked);
      setPhoneNumber(result.phone_number ?? null);

      if (result.telegram.invite_sent) {
        toast.success('텔레그램 그룹 초대를 보냈습니다.');
      } else {
        toast.error(result.telegram.invite_error || '초대 링크 발송에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      toast.error('텔레그램 초대 발송에 실패했습니다.');
    } finally {
      setResendingInvite(false);
    }
  };

  const isPaidTelegramPlan = telegramStatus?.plan === 'pro';
  const isFreeTelegramPlan = telegramStatus?.plan === 'free';

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!telegramLinked && isPaidTelegramPlan) void generateTelegramLink();
  }, [generateTelegramLink, isPaidTelegramPlan, telegramLinked]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statusMeta = getStatusMeta(telegramStatus?.status ?? 'unchecked', telegramStatus?.invite_sent);
  const StatusIcon = statusMeta.icon;
  const canSendInvite = Boolean(
    telegramStatus?.linked &&
      isPaidTelegramPlan &&
      telegramStatus.expected_group &&
      telegramStatus.status !== 'member'
  );

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-normal">알림 채널</h1>
        <p className="text-sm text-muted-foreground">
          텔레그램 또는 SMS를 연결해 시그널 및 계정 알림을 받으세요.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Telegram
          </CardTitle>
          <CardDescription>
            {isPaidTelegramPlan
              ? '텔레그램 계정을 연결해 봇 메시지와 Pro 그룹 초대를 받으세요.'
              : 'Free 플랜에서는 텔레그램 그룹 초대를 제공하지 않습니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {telegramLinked ? (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-4">
                <Check className="h-5 w-5 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-emerald-500">연결됨</div>
                  <div className="text-xs text-muted-foreground">텔레그램 알림이 활성화되었습니다.</div>
                </div>
                <Badge variant="outline">활성</Badge>
              </div>

              <div className={`rounded-lg border p-4 ${statusMeta.className}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <div className="text-sm font-semibold">{statusMeta.label}</div>
                      <div className="text-xs opacity-80">{statusMeta.description}</div>
                    </div>

                    <div className="grid gap-2 text-xs text-foreground sm:grid-cols-2">
                      <div>
                        <div className="text-muted-foreground">현재 플랜</div>
                        <div className="font-mono uppercase">
                          {telegramStatus?.plan ?? 'free'}
                          {telegramStatus?.subscription_status ? ` / ${telegramStatus.subscription_status}` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">예상 그룹</div>
                        <div className="font-medium">
                          {telegramStatus?.expected_group?.name ?? '없음'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">실제 참여 상태</div>
                        <div className="font-medium">
                          {telegramStatus?.membership.checked
                            ? telegramStatus.membership.is_member
                              ? '참여 중'
                              : '미참여'
                            : '미확인'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">마지막 확인</div>
                        <div className="font-mono">{formatSyncTime(telegramStatus?.last_synced_at ?? null)}</div>
                      </div>
                    </div>

                    {telegramStatus?.membership.error ? (
                      <div className="text-xs text-destructive">{telegramStatus.membership.error}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={unlinkTelegram} disabled={unlinking} className="flex-1">
                  {unlinking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                  연결 해제
                </Button>
                <Button variant="outline" onClick={loadStatus} disabled={loading} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  상태 새로고침
                </Button>
                {canSendInvite ? (
                  <Button onClick={resendInvite} disabled={resendingInvite} className="flex-1">
                    {resendingInvite ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    초대 보내기
                  </Button>
                ) : null}
                <Button asChild className="flex-1">
                  <Link to="/alerts">
                    <Bell className="mr-2 h-4 w-4" />
                    알림 설정
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              {isFreeTelegramPlan || !isPaidTelegramPlan ? (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                    <div className="text-sm font-semibold">Free 플랜은 텔레그램 그룹 초대 대상이 아닙니다.</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Pro로 업그레이드하면 텔레그램 그룹 접근 권한과 초대 링크를 받을 수 있습니다.
                    </div>
                  </div>
                  <Button asChild className="w-full">
                    <Link to="/pricing">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Pro 플랜 보기
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                    아래 텔레그램 링크를 열고 봇 채팅에서 Start를 누른 뒤, 이 페이지로 돌아와 상태를 새로고침하세요.
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    {telegramLink && !generating ? (
                      <Button asChild size="lg" className="flex-1">
                        <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-2 h-5 w-5" />
                          텔레그램 봇 열기
                        </a>
                      </Button>
                    ) : (
                      <Button size="lg" className="flex-1" disabled>
                        {generating ? (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                          <MessageCircle className="mr-2 h-5 w-5" />
                        )}
                        텔레그램 봇 열기
                      </Button>
                    )}
                    <Button variant="outline" size="lg" onClick={generateTelegramLink} disabled={generating}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      새 링크
                    </Button>
                  </div>

                  <Button variant="ghost" size="sm" onClick={loadStatus} className="w-full">
                    연결 상태 확인
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            SMS
          </CardTitle>
          <CardDescription>중요한 SMS 알림을 받을 전화번호를 저장하세요.</CardDescription>
        </CardHeader>
        <CardContent>
          <SMSSetup userId={user!.id} phoneNumber={phoneNumber} onUpdate={loadStatus} />
        </CardContent>
      </Card>
    </div>
  );
}
