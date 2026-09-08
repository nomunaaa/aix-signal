/**
 * KAIROS 코멘트 Mock — symbol-detail 트리는 시뮬레이터 미포함, 텍스트만 표시 (SRD-002)
 */
import { getKairosCommentMock } from '@/lib/mock/kairos-comments';

export function KairosComment({ symbol, isOutlier }: { symbol: string; isOutlier: boolean }) {
  if (isOutlier) {
    return (
      <div className="rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        <div className="mb-1 text-[11px] font-medium text-muted-foreground">KAIROS comment</div>
        해석 준비 중—추세 데이터만 노출
      </div>
    );
  }
  const text = getKairosCommentMock(symbol);
  return (
    <div className="rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs leading-relaxed text-foreground">
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">KAIROS comment</div>
      {text}
    </div>
  );
}
