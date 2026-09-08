import { TrendingDown, TrendingUp } from 'lucide-react';
import { ConfidenceGradeDot } from '@/components/icons/ConfidenceGradeDot';
import { calcPnL, type MockSignal } from '@/lib/mock/realistic-data';
import { findMockSignalForSymbol } from '@/lib/mock/symbol-detail-mock';
import { confGrade, minutesFromIso, sectionLabel, stratLabel } from '@/lib/symbol-detail/signal-info-helpers';
import { cn } from '@/lib/utils';

export function SignalInfoCard({ symbol }: { symbol: string }) {
  const signal = findMockSignalForSymbol(symbol);
  if (!signal) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">현재 활성 시그널이 없습니다.</p>
        <p className="mt-1">대기 섹션에서 곧 시그널이 생성될 예정입니다.</p>
      </div>
    );
  }
  return <SignalInfoBody signal={signal} />;
}

function SignalInfoBody({ signal }: { signal: MockSignal }) {
  const pnl = calcPnL(signal.entry_price, signal.current_price, signal.direction);
  const gradeScore = 70 + (signal.symbol.length * 3) % 28;
  const Arrow = signal.direction === 'long' ? TrendingUp : TrendingDown;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/70 bg-card/30 p-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span
            className={cn(
              'font-mono font-bold',
              signal.direction === 'long' ? 'text-semantic-bull' : 'text-semantic-bear',
            )}
          >
            {signal.direction.toUpperCase()}
          </span>
          <span className="text-xs text-muted-foreground">{sectionLabel(signal.section)}</span>
          <Arrow className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span className="font-mono text-xs text-muted-foreground">
            진입 ${signal.entry_price.toLocaleString()} · 현재 ${signal.current_price.toLocaleString()}
          </span>
          <span
            className={cn(
              'font-mono font-semibold tabular-nums',
              pnl.percent >= 0 ? 'text-semantic-bull' : 'text-semantic-bear',
            )}
          >
            {pnl.percent >= 0 ? '+' : ''}
            {pnl.percent.toFixed(2)}%
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{stratLabel(signal)}</span>
          <span>·</span>
          <span>{minutesFromIso(signal.created_at)}분 전</span>
          <ConfidenceGradeDot grade={confGrade(gradeScore)} className="translate-y-px" />
        </div>
      </div>
    </div>
  );
}
