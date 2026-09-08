import {
  getStrategyConfidence,
  getMarketFitness,
  getStrategyRisk,
  getStrategyComparison,
} from '@/lib/mock/confidence-mock';
import {
  getConfidenceColor,
  getFitnessColor,
  STRATEGY_LABELS,
  type ConfidenceStrategyType,
} from '@/lib/confidence';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StrategyConfidenceCardProps {
  strategy: ConfidenceStrategyType;
  /** Pulse 시뮬레이션 기준 금액 (USD) */
  simulationAmount: number;
  /** Pulse 전략 표시명 (예: 딥바이) */
  displayName?: string;
  /** 상위 패널에 제목이 있을 때 중복 제목 숨김 */
  hideTitle?: boolean;
  /** 상위에서 vs 원샷 한 줄을 표시할 때 하단 비교 문구 숨김 */
  hideComparison?: boolean;
  /** 상위에서 리스크를 표시할 때 카드 내 경고 한 줄 숨김 */
  hideRisk?: boolean;
  className?: string;
}

function fitnessSummaryLine(marketLabel: string, score: number): string {
  if (score >= 100) return `${marketLabel}에 강한 전략`;
  if (score >= 80) return `${marketLabel}에서 보통 수준`;
  return `${marketLabel}에서 약한 전략`;
}

export function StrategyConfidenceCard({
  strategy,
  simulationAmount,
  displayName,
  hideTitle = false,
  hideComparison = false,
  hideRisk = false,
  className,
}: StrategyConfidenceCardProps) {
  const sc = getStrategyConfidence(strategy);
  const mf = getMarketFitness(strategy);
  const risk = getStrategyRisk(strategy, simulationAmount);
  const comparison = getStrategyComparison(strategy);
  const meta = STRATEGY_LABELS[strategy];
  const title = displayName ?? meta.name;
  const confCol = getConfidenceColor(sc.grade);
  const fitCol = getFitnessColor(mf.grade);
  const sampleBar = Math.min(100, (sc.sample_size / 40) * 100);

  return (
    <div className={cn('rounded-lg border border-border bg-card/90 p-4 space-y-4', className)}>
      {hideTitle ? (
        <p className="text-xs font-medium text-zinc-400">신뢰도 · 시장 적합도</p>
      ) : (
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-400">{meta.desc}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">신뢰도</span>
          <span className={cn('inline-block h-2 w-2 rounded-full', confCol.dot)} />
          <span className={cn('text-sm font-mono font-semibold', confCol.text)}>{sc.score}</span>
          <span className="text-[10px] text-zinc-500">{sc.grade}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-zinc-400">시장적합도</span>
          <span className={cn('inline-block h-2 w-2 rounded-full', fitCol.dot)} />
          <span className={cn('text-sm font-mono font-semibold', fitCol.text)}>{mf.score}</span>
          <span className="text-[10px] text-zinc-500">{fitCol.label}</span>
        </div>
      </div>

      <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-3">
        <p className="text-xs font-medium text-zinc-400">신뢰도 분해</p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">승률</span>
            <span className="font-mono text-sm text-white">
              {sc.win_rate}% ({Math.round((sc.win_rate / 100) * sc.sample_size)}/{sc.sample_size})
            </span>
          </div>
          <Progress value={sc.win_rate} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">{sc.unique_label}</span>
            <span className="font-mono text-sm text-white">{sc.unique_effect}%</span>
          </div>
          <Progress value={sc.unique_effect} className="h-2" />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-400">샘플</span>
            <span className="font-mono text-sm text-white">{sc.sample_size}건 ✓</span>
          </div>
          <Progress value={sampleBar} className="h-2" />
        </div>
      </div>

      <div className="rounded-md border border-border/80 bg-muted/20 p-3 space-y-2">
        <p className="text-xs font-medium text-zinc-400">시장 적합도</p>
        <p className="text-sm text-white">
          현재 시장 <span className="font-medium">{mf.market_label}</span>
        </p>
        <p className="text-sm font-mono text-zinc-200">
          이 시장 승률 {mf.strategy_win_in_market}% <span className="text-zinc-500">vs</span> 전체 {mf.overall_win}%
        </p>
        <p className="text-xs text-zinc-300">→ {fitnessSummaryLine(mf.market_label, mf.score)}</p>
      </div>

      {!hideRisk ? (
        <p className="flex items-start gap-2 text-xs text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          {risk}
        </p>
      ) : null}

      {!hideComparison && comparison ? (
        <p className="flex items-start gap-2 text-xs text-zinc-300">
          <BarChart3 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          {comparison}
        </p>
      ) : null}
    </div>
  );
}
