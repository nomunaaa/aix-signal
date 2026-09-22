import { ChevronsUp, ChevronsDown, Target, TrendingDown } from 'lucide-react';
import type { RiskAnalysisResult } from '@/lib/proof/risk-analysis';
import {
  formatPct,
  projectedCyclePct,
  projectedCycleUsd,
  type ProofLanguage,
} from './proofFormat';

const COPY = {
  ko: {
    title: '연속 거래 및 리스크 분석',
    subtitle: '(Consecutive Trading & Risk Analysis)',
    consecutiveWin: '연속 수익',
    consecutiveWinCount: '최대 연속 수익 횟수',
    consecutiveWinAmount: '수익 금액',
    consecutiveLoss: '연속 손실',
    consecutiveLossCount: '최대 연속 손실 횟수',
    consecutiveLossAmount: '손실 금액',
    mur: 'MUR (최대 상승폭, Max Upside Run)',
    murRate: 'MUR 수익률',
    murAmount: 'MUR 수익금',
    mdd: 'MDD (최대 낙폭, Max Drawdown)',
    mddRate: 'MDD 손실률',
    mddAmount: 'MDD 손실금',
    times: '회',
    footnote: '위 통계는 선택 기간의 모의매매 기준으로 산출된 결과입니다.',
  },
  en: {
    title: 'Consecutive Trading & Risk Analysis',
    subtitle: '(연속 거래 및 리스크 분석)',
    consecutiveWin: 'Winning streak',
    consecutiveWinCount: 'Longest winning streak',
    consecutiveWinAmount: 'Streak profit',
    consecutiveLoss: 'Losing streak',
    consecutiveLossCount: 'Longest losing streak',
    consecutiveLossAmount: 'Streak loss',
    mur: 'MUR (Max Upside Run)',
    murRate: 'MUR return',
    murAmount: 'MUR profit',
    mdd: 'MDD (Max Drawdown)',
    mddRate: 'MDD loss rate',
    mddAmount: 'MDD loss',
    times: '',
    footnote: 'These results are based on simulated trades in the selected period.',
  },
  ja: {
    title: '連続取引・リスク分析',
    subtitle: '(Consecutive Trading & Risk Analysis)',
    consecutiveWin: '連続利益',
    consecutiveWinCount: '最大連続利益回数',
    consecutiveWinAmount: '利益金額',
    consecutiveLoss: '連続損失',
    consecutiveLossCount: '最大連続損失回数',
    consecutiveLossAmount: '損失金額',
    mur: 'MUR (最大上昇幅, Max Upside Run)',
    murRate: 'MUR 収益率',
    murAmount: 'MUR 収益金',
    mdd: 'MDD (最大下落幅, Max Drawdown)',
    mddRate: 'MDD 損失率',
    mddAmount: 'MDD 損失金',
    times: '回',
    footnote: '上記の統計は選択期間の模擬売買に基づく結果です。',
  },
} as const;

type Accent = 'green' | 'red' | 'amber';

const ACCENTS: Record<Accent, { tile: string; icon: string; value: string }> = {
  green: {
    tile: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/50 dark:!bg-[linear-gradient(90deg,rgba(6,95,70,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100',
    value: 'text-emerald-600 dark:text-emerald-400',
  },
  red: {
    tile: 'border-red-200 bg-red-50 dark:border-red-500/50 dark:!bg-[linear-gradient(90deg,rgba(127,29,29,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100',
    value: 'text-red-600 dark:text-red-400',
  },
  amber: {
    tile: 'border-amber-200 bg-amber-50 dark:border-amber-500/50 dark:!bg-[linear-gradient(90deg,rgba(120,53,15,0.45)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-100',
    value: 'text-amber-600 dark:text-amber-400',
  },
};

function MetricTile({
  title,
  accent,
  icon,
  rows,
}: {
  title: string;
  accent: Accent;
  icon: React.ReactNode;
  rows: { label: string; value: string }[];
}) {
  const colors = ACCENTS[accent];
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-lg border px-2 py-2 ${colors.tile}`}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <div className={`flex size-5 shrink-0 items-center justify-center rounded ${colors.icon}`}>
          {icon}
        </div>
        <div className="truncate text-[11px] font-bold leading-tight text-foreground dark:text-white sm:text-[12px]">
          {title}
        </div>
      </div>
      <div className="space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[10px] leading-4 text-muted-foreground dark:text-slate-400">
              {row.label}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap text-[12px] font-bold tabular-nums sm:text-[13px] ${colors.value}`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMoney(value: number, present: boolean): string {
  if (!present) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
}

function formatCount(count: number, present: boolean, suffix: string): string {
  if (!present) return '—';
  return `${count}${suffix}`;
}

/**
 * 로딩 중 자리표시자 — 실제 패널과 같은 뼈대/높이를 그려서, 데이터가 들어올 때
 * 아래 내용이 밀리지 않게 한다. 요청이 몇 초 걸리므로 빈 화면 대신 이걸 띄운다.
 */
export function RiskAnalysisPanelSkeleton() {
  return (
    <div
      className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-2.5 dark:border-amber-500/40 dark:bg-amber-950/20"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <div className="size-7 shrink-0 animate-pulse rounded-md bg-amber-200/70 dark:bg-amber-700/50" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="h-3 w-2/5 animate-pulse rounded bg-amber-200/70 dark:bg-amber-700/50" />
          <div className="h-2 w-3/5 animate-pulse rounded bg-amber-200/50 dark:bg-amber-700/30" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-2 py-2"
          >
            <div className="flex items-center gap-1.5">
              <div className="size-5 shrink-0 animate-pulse rounded bg-muted-foreground/20" />
              <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted-foreground/20" />
            </div>
            <div className="space-y-1">
              <div className="h-2 w-full animate-pulse rounded bg-muted-foreground/15" />
              <div className="h-2 w-4/5 animate-pulse rounded bg-muted-foreground/15" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 h-2 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
    </div>
  );
}

export function RiskAnalysisPanel({
  result,
  seed,
  entryRatio,
  leverage,
  language,
}: {
  result: RiskAnalysisResult;
  seed: number;
  entryRatio: number;
  leverage: number;
  language: ProofLanguage;
}) {
  const copy = COPY[language];
  // 데이터가 없으면 0을 그럴듯하게 보여 주는 대신 전부 '—'로 비운다.
  const present = result.cycleCount > 0;

  const money = (rate: number) => projectedCycleUsd(rate, seed, entryRatio, leverage);
  const pct = (rate: number) => projectedCyclePct(rate, seed, entryRatio, leverage);

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-2.5 dark:border-amber-500/40 dark:bg-amber-950/20">
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-amber-200 text-amber-900 dark:bg-amber-700/70 dark:text-amber-100">
          <ChevronsUp className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold text-amber-900 dark:text-amber-200">
            {copy.title}
          </div>
          <div className="truncate text-[10px] leading-4 text-amber-700/80 dark:text-amber-300/70">
            {copy.subtitle}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          title={copy.consecutiveWin}
          accent="green"
          icon={<ChevronsUp className="size-3.5" aria-hidden />}
          rows={[
            {
              label: copy.consecutiveWinCount,
              value: formatCount(result.consecutiveWin.count, present, copy.times),
            },
            {
              label: copy.consecutiveWinAmount,
              value: formatMoney(money(result.consecutiveWin.rateSum), present),
            },
          ]}
        />
        <MetricTile
          title={copy.consecutiveLoss}
          accent="red"
          icon={<ChevronsDown className="size-3.5" aria-hidden />}
          rows={[
            {
              label: copy.consecutiveLossCount,
              value: formatCount(result.consecutiveLoss.count, present, copy.times),
            },
            {
              label: copy.consecutiveLossAmount,
              value: formatMoney(money(result.consecutiveLoss.rateSum), present),
            },
          ]}
        />
        <MetricTile
          title={copy.mur}
          accent="amber"
          icon={<Target className="size-3.5" aria-hidden />}
          rows={[
            { label: copy.murRate, value: formatPct(pct(result.maxUpsideRunRate), present) },
            {
              label: copy.murAmount,
              value: formatMoney(money(result.maxUpsideRunRate), present),
            },
          ]}
        />
        <MetricTile
          title={copy.mdd}
          accent="red"
          icon={<TrendingDown className="size-3.5" aria-hidden />}
          rows={[
            { label: copy.mddRate, value: formatPct(pct(result.maxDrawdownRate), present) },
            { label: copy.mddAmount, value: formatMoney(money(result.maxDrawdownRate), present) },
          ]}
        />
      </div>

      <p className="mt-2 text-[10px] leading-4 text-muted-foreground dark:text-slate-400">
        ⓘ {copy.footnote}
      </p>
    </div>
  );
}
