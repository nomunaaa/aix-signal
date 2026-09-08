'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatPlanMoney } from '@/lib/plan-settings';
import { toast } from 'sonner';

type PaymentRow = {
  id: string;
  provider: string;
  plan_code: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string;
};

type RefundRequestRow = {
  id: string;
  payment_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'failed';
  error_message: string | null;
};

/**
 * payments / refund_requests / payment_is_refundable는 이번 마이그레이션에서
 * 새로 생기므로 아직 생성된 Supabase 타입(src/integrations/supabase/types.ts)에 없다.
 * 마이그레이션을 적용한 뒤 타입을 재생성하면 이 캐스팅을 걷어낼 수 있다.
 * (usePlanSettings 등 기존 코드와 같은 방식)
 */
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown }>;
};

const STATUS_LABEL: Record<RefundRequestRow['status'], string> = {
  pending: '검토 중',
  approved: '환불 완료',
  rejected: '반려됨',
  failed: '처리 실패',
};

/**
 * 환불 요청 — 결제 원장(payments)에서 본인 결제를 읽어 기간 내 건에만 버튼을 연다.
 *
 * 기간(7일)은 여기서 계산하지 않고 DB의 payment_is_refundable()에 물어본다.
 * 화면이 자체 판단을 하면 정책을 바꿀 때 서버와 어긋나고, 무엇보다 화면 계산은
 * 신뢰 경계 밖이라 실제 방어가 되지 못한다.
 */
export default function RefundRequestCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [requests, setRequests] = useState<RefundRequestRow[]>([]);
  const [eligible, setEligible] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: pays }, { data: reqs }] = await Promise.all([
      db
        .from('payments')
        .select('id, provider, plan_code, amount_cents, currency, status, paid_at')
        .order('paid_at', { ascending: false })
        .limit(12),
      db.from('refund_requests').select('id, payment_id, status, error_message'),
    ]);

    const paymentRows = (pays ?? []) as PaymentRow[];
    setPayments(paymentRows);
    setRequests((reqs ?? []) as RefundRequestRow[]);

    // 자격 판정은 건별로 DB에 위임한다.
    const flags = await Promise.all(
      paymentRows.map(async (p) => {
        const { data } = await db.rpc('payment_is_refundable', { p_payment_id: p.id });
        return [p.id, Boolean(data)] as const;
      })
    );
    setEligible(Object.fromEntries(flags));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (paymentId: string) => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-refund', {
        body: { paymentId, reason },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);

      toast.success('환불 요청이 접수되었습니다. 검토 후 결과를 알려드립니다.');
      setReason('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '환불 요청에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">환불 요청</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-4 w-4 text-primary" />
          환불 요청
        </CardTitle>
        <CardDescription>
          결제 후 7일 이내 건에 한해 환불을 요청할 수 있습니다. 요청은 검토 후 처리됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {payments.map((p) => {
          const req = requests.find((r) => r.payment_id === p.id);
          const canRequest = eligible[p.id] && !req;

          return (
            <div
              key={p.id}
              className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatPlanMoney(p.amount_cents, p.currency)}
                  <span className="ml-2 text-xs uppercase text-muted-foreground">{p.provider}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.paid_at).toLocaleString('ko-KR')}
                  {p.plan_code ? ` · ${p.plan_code.toUpperCase()}` : ''}
                </p>
                {req?.status === 'failed' && req.error_message && (
                  <p className="mt-1 text-xs text-destructive">{req.error_message}</p>
                )}
              </div>

              {req ? (
                <Badge variant={req.status === 'approved' ? 'default' : 'secondary'}>
                  {STATUS_LABEL[req.status]}
                </Badge>
              ) : canRequest ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      환불 요청
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>환불을 요청하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {formatPlanMoney(p.amount_cents, p.currency)} 결제 건에 대한 환불을
                        요청합니다. 검토 후 승인되면 결제하신 수단으로 환불됩니다.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Textarea
                      placeholder="환불 사유를 적어주시면 처리에 도움이 됩니다 (선택)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={1000}
                    />
                    <AlertDialogFooter>
                      <AlertDialogCancel>돌아가기</AlertDialogCancel>
                      <AlertDialogAction onClick={() => submit(p.id)} disabled={submitting}>
                        {submitting ? '처리 중...' : '환불 요청'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {p.status === 'refunded' ? '환불됨' : '기간 만료'}
                </span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
