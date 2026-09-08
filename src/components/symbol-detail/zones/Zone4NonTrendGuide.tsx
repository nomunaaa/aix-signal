/**
 * Zone 4-1 — 비추세만 구조화 3단 (SRD-002 v5)
 */
import { getActionRecommendationForSignal } from '@/lib/mock/action-recommendations';
import { getVolatilityType, type MockSignal } from '@/lib/mock/realistic-data';
import { cn } from '@/lib/utils';

function StepCard({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn('rounded-md border border-border/50 bg-muted/10 px-3 py-2', className)}>
      <div className="text-[11px] font-semibold text-muted-foreground">{title}</div>
      <p className="mt-1 text-xs leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

export function Zone4NonTrendGuide({ symbol, signal }: { symbol: string; signal: MockSignal }) {
  const rec = getActionRecommendationForSignal(symbol, signal);
  const vol = getVolatilityType(symbol) === 'high' ? '변동성 확대 구간' : '변동성 완만 구간';
  const st = signal.short_trend === 'up' ? '단기 상승' : '단기 하락';
  const lt = signal.long_trend === 'up' ? '장기 상승' : '장기 하락';
  const mismatch = `${st} vs ${lt} — 단·장기 방향 정합성 점검`;

  return (
    <div className="space-y-2" aria-label="비추세 구조화 가이드">
      <div className="text-[11px] font-medium text-muted-foreground">비추세 가이드</div>
      <StepCard title="불일치" body={mismatch} />
      <StepCard title="시장 상황" body={vol} />
      <StepCard title="행동 지침" body={`${rec.primary.label} — ${rec.primary.detail}`} />
    </div>
  );
}
