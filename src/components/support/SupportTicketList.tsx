/**
 * 내가 제출한 문의 목록 — 상태(대기/처리중/완료) 확인용.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUPPORT_TICKET_STATUS_LABEL, type SupportTicket } from '@/lib/support/types';

const STATUS_TONE: Record<SupportTicket['status'], string> = {
  open: 'bg-muted text-muted-foreground',
  in_progress: 'bg-[hsl(var(--info)/0.15)] text-[hsl(var(--info))]',
  resolved: 'bg-[hsl(var(--pnl-up)/0.15)] text-[hsl(var(--pnl-up))]',
};

export function SupportTicketList({ tickets }: { readonly tickets: readonly SupportTicket[] }) {
  if (tickets.length === 0) return null;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">내 문의 내역</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.subject}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.message}</p>
              </div>
              <Badge className={STATUS_TONE[t.status]} variant="secondary">
                {SUPPORT_TICKET_STATUS_LABEL[t.status]}
              </Badge>
            </div>
            {t.adminNote ? (
              <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                <p className="font-medium text-foreground">관리자 답변</p>
                <p className="mt-0.5 whitespace-pre-line text-muted-foreground">{t.adminNote}</p>
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              {new Date(t.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
