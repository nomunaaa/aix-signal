'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Gift, Loader2, RefreshCw, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBilingualText } from '@/hooks/useBilingualText';
import { supabase } from '@/integrations/supabase/client';
import { formatBps, formatMoneyCents } from '@/lib/partner-portal/format';

type ReferralOverview = {
  member_user_id: string;
  referral_code: string | null;
  referral_path: string | null;
  code_status: 'active' | 'disabled' | null;
  store_partner_id: string | null;
  store_name: string | null;
  referred_member_count: number;
  lifetime_earned_cents: number;
  pending_unpaid_cents: number;
  paid_cents: number;
  clawback_cents: number;
  net_bonus_cents: number;
  currency: string;
  bonus_mode: 'percent' | 'fixed_amount' | null;
  bonus_bps: number | null;
  fixed_amount_cents: number | null;
  attribution_required: boolean;
};

type BonusHistoryRow = {
  allocation_id: string;
  payment_event_id: string;
  original_allocation_id: string | null;
  created_at: string;
  payment_date: string;
  referred_member_name: string | null;
  referred_member_email: string | null;
  payment_status: 'paid' | 'refunded' | 'chargeback';
  gross_payment_cents: number;
  currency: string;
  bonus_mode: 'percent' | 'fixed_amount';
  bonus_bps: number | null;
  fixed_amount_cents: number | null;
  allocation_type: 'earning' | 'clawback';
  bonus_amount_cents: number;
  clawback_amount_cents: number;
  net_amount_cents: number;
  refund_ratio: number | null;
  settlement_status: 'unpaid' | 'processing' | 'paid';
};

type ReferredMemberRow = {
  member_user_id: string;
  display_name: string | null;
  email: string | null;
  signup_at: string;
  plan_code: string;
  subscription_status: string;
  first_payment_at: string | null;
  total_attributed_payment_cents: number;
  earned_bonus_cents: number;
  currency: string;
};

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function normalizeOverview(value: any): ReferralOverview {
  return {
    member_user_id: value?.member_user_id ?? '',
    referral_code: value?.referral_code ?? null,
    referral_path: value?.referral_path ?? null,
    code_status: value?.code_status ?? null,
    store_partner_id: value?.store_partner_id ?? null,
    store_name: value?.store_name ?? null,
    referred_member_count: toNumber(value?.referred_member_count),
    lifetime_earned_cents: toNumber(value?.lifetime_earned_cents),
    pending_unpaid_cents: toNumber(value?.pending_unpaid_cents),
    paid_cents: toNumber(value?.paid_cents),
    clawback_cents: toNumber(value?.clawback_cents),
    net_bonus_cents: toNumber(value?.net_bonus_cents),
    currency: value?.currency ?? 'USD',
    bonus_mode: value?.bonus_mode ?? null,
    bonus_bps: value?.bonus_bps == null ? null : toNumber(value.bonus_bps),
    fixed_amount_cents:
      value?.fixed_amount_cents == null ? null : toNumber(value.fixed_amount_cents),
    attribution_required: Boolean(value?.attribution_required),
  };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function settlementVariant(status: BonusHistoryRow['settlement_status']) {
  if (status === 'paid') return 'default' as const;
  if (status === 'processing') return 'secondary' as const;
  return 'outline' as const;
}

export default function MemberReferralPanel() {
  const { tr } = useBilingualText();
  const [overview, setOverview] = useState<ReferralOverview | null>(null);
  const [history, setHistory] = useState<BonusHistoryRow[]>([]);
  const [members, setMembers] = useState<ReferredMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'link' | 'code' | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = supabase as any;
    const [overviewResult, historyResult, membersResult] = await Promise.all([
      client.rpc('member_get_referral_overview'),
      client.rpc('member_list_referral_bonus_history', { p_limit: 100, p_offset: 0 }),
      client.rpc('member_list_referred_members', { p_limit: 100, p_offset: 0 }),
    ]);

    const firstError = overviewResult.error ?? historyResult.error ?? membersResult.error;
    if (firstError) {
      setError(
        firstError.message ??
          tr('추천 정보를 불러오지 못했습니다.', 'Referral data could not be loaded.')
      );
      setLoading(false);
      return;
    }

    setOverview(normalizeOverview(overviewResult.data));
    setHistory((historyResult.data ?? []) as BonusHistoryRow[]);
    setMembers((membersResult.data ?? []) as ReferredMemberRow[]);
    setLoading(false);
  }, [tr]);

  useEffect(() => {
    void load();
  }, [load]);

  const referralLink = useMemo(() => {
    if (!overview?.referral_path || typeof window === 'undefined') return null;
    return `${window.location.origin}${overview.referral_path}`;
  }, [overview?.referral_path]);

  const copyValue = async (kind: 'link' | 'code', value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    toast.success(tr('복사되었습니다.', 'Copied.'));
    window.setTimeout(() => setCopied(null), 1500);
  };

  const shareLink = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      await navigator.share({ title: 'AIX Signal', url: referralLink });
      return;
    }
    await copyValue('link', referralLink);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="size-5 text-primary" />
            {tr('회원 추천 보너스', 'Member Referral Bonus')}
          </CardTitle>
          <CardDescription>
            {overview?.store_name
              ? tr(`소속 스토어: ${overview.store_name}`, `Store: ${overview.store_name}`)
              : tr('스토어 연결이 필요합니다.', 'Store attribution is required.')}
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          <span className="sr-only">{tr('새로고침', 'Refresh')}</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {overview?.attribution_required ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
            {tr(
              '관리자가 소속 스토어를 지정한 뒤 추천 링크가 활성화됩니다.',
              'Your referral link will activate after an admin assigns your Store.'
            )}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0 space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {tr('추천 링크', 'Referral link')}
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-muted/20 p-2">
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  {referralLink ?? '-'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!referralLink}
                  onClick={() => referralLink && void copyValue('link', referralLink)}
                >
                  {copied === 'link' ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="sr-only">{tr('링크 복사', 'Copy link')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!referralLink}
                  onClick={() => void shareLink()}
                >
                  <Share2 className="size-4" />
                  <span className="sr-only">{tr('공유', 'Share')}</span>
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {tr('추천 코드', 'Referral code')}
              </div>
              <div className="flex h-[42px] items-center gap-2 rounded-md border border-border px-3">
                <span className="flex-1 font-mono font-semibold">
                  {overview?.referral_code ?? '-'}
                </span>
                {overview?.code_status ? (
                  <Badge variant={overview.code_status === 'active' ? 'default' : 'secondary'}>
                    {overview.code_status}
                  </Badge>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={!overview?.referral_code || overview.code_status !== 'active'}
                  onClick={() =>
                    overview?.referral_code && void copyValue('code', overview.referral_code)
                  }
                >
                  {copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />}
                  <span className="sr-only">{tr('코드 복사', 'Copy code')}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {[
            [tr('추천 회원', 'Referred'), overview?.referred_member_count ?? 0, 'count'],
            [tr('누적 적립', 'Lifetime'), overview?.lifetime_earned_cents ?? 0, 'money'],
            [tr('지급 대기', 'Pending'), overview?.pending_unpaid_cents ?? 0, 'money'],
            [tr('지급 완료', 'Paid'), overview?.paid_cents ?? 0, 'money'],
            [tr('환불 차감', 'Clawback'), overview?.clawback_cents ?? 0, 'money'],
            [tr('순 보너스', 'Net bonus'), overview?.net_bonus_cents ?? 0, 'money'],
          ].map(([label, value, kind]) => (
            <div key={String(label)} className="rounded-md border border-border px-3 py-3">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="mt-1 truncate font-mono text-lg font-semibold tabular-nums">
                {kind === 'count'
                  ? Number(value).toLocaleString('en-US')
                  : formatMoneyCents(Number(value), overview?.currency ?? 'USD')}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{tr('현재 보너스', 'Current bonus')}:</span>
          <span className="font-mono text-foreground">
            {overview?.bonus_mode === 'percent' && overview.bonus_bps != null
              ? formatBps(overview.bonus_bps)
              : overview?.bonus_mode === 'fixed_amount' && overview.fixed_amount_cents != null
                ? formatMoneyCents(overview.fixed_amount_cents, overview.currency)
                : '-'}
          </span>
        </div>

        <Tabs defaultValue="history">
          <TabsList className="grid w-full grid-cols-2 sm:w-[360px]">
            <TabsTrigger value="history">{tr('보너스 내역', 'Bonus history')}</TabsTrigger>
            <TabsTrigger value="members">{tr('추천 회원', 'Referred members')}</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-28">{tr('결제일', 'Payment date')}</TableHead>
                  <TableHead className="min-w-40">{tr('추천 회원', 'Member')}</TableHead>
                  <TableHead className="text-right">{tr('결제액', 'Payment')}</TableHead>
                  <TableHead className="text-center">{tr('보너스', 'Bonus')}</TableHead>
                  <TableHead className="text-right">{tr('금액', 'Amount')}</TableHead>
                  <TableHead className="text-center">{tr('정산', 'Settlement')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length ? (
                  history.map((row) => (
                    <TableRow key={row.allocation_id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.payment_date)}
                      </TableCell>
                      <TableCell>
                        <div>{row.referred_member_name ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.referred_member_email ?? '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatMoneyCents(row.gross_payment_cents, row.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={row.allocation_type === 'clawback' ? 'destructive' : 'outline'}
                        >
                          {row.allocation_type === 'clawback'
                            ? tr('환불 차감', 'Clawback')
                            : row.bonus_mode === 'percent' && row.bonus_bps != null
                              ? formatBps(row.bonus_bps)
                              : formatMoneyCents(row.fixed_amount_cents ?? 0, row.currency)}
                        </Badge>
                        {row.allocation_type === 'clawback' && row.refund_ratio != null ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.payment_status === 'chargeback' ? 'Chargeback' : 'Refund'} /{' '}
                            {(row.refund_ratio * 100).toFixed(0)}% cumulative
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-medium tabular-nums ${
                          row.net_amount_cents < 0 ? 'text-destructive' : ''
                        }`}
                      >
                        {formatMoneyCents(row.net_amount_cents, row.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={settlementVariant(row.settlement_status)}>
                          {row.settlement_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      {tr('보너스 내역이 없습니다.', 'No bonus history yet.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="members" className="overflow-hidden rounded-md border border-border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="min-w-40">{tr('회원', 'Member')}</TableHead>
                  <TableHead>{tr('가입일', 'Joined')}</TableHead>
                  <TableHead className="text-center">{tr('플랜', 'Plan')}</TableHead>
                  <TableHead>{tr('첫 결제', 'First payment')}</TableHead>
                  <TableHead className="text-right">{tr('누적 결제', 'Payments')}</TableHead>
                  <TableHead className="text-right">{tr('순 보너스', 'Net bonus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length ? (
                  members.map((row) => (
                    <TableRow key={row.member_user_id}>
                      <TableCell>
                        <div>{row.display_name ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{row.email ?? '-'}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.signup_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{row.plan_code}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.first_payment_at)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatMoneyCents(row.total_attributed_payment_cents, row.currency)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium tabular-nums">
                        {formatMoneyCents(row.earned_bonus_cents, row.currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                      {tr('추천 회원이 없습니다.', 'No referred members yet.')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
