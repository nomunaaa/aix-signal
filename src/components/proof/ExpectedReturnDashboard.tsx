import Image from 'next/image';
import type { ProofCycleStatsSlice } from '@/lib/mock/proof-mock';
import {
  hasData,
  projectedCycleUsd,
  projectedPct,
  projectedUsd,
  type ProofLanguage,
} from './proofFormat';

const COPY = {
  ko: {
    title: '매매 성과 요약',
    headerTagline: '데이터로 만드는 더 나은 투자',
    entries: ['총 진입 횟수', '매매에 진입한 총 횟수'],
    winRate: ['승률', '수익 거래 비율'],
    riskReward: ['손익비', '평균 수익 ÷ 평균 손실'],
    accountReturn: ['계좌 수익률', '시작 대비 현재 수익률'],
    accountProfit: ['계좌 수익금', '시작 대비 누적 수익금'],
    avgWinRate: '1회 평균 계좌 수익률',
    avgLossRate: '1회 평균 계좌 손실률',
    avgWin: ['1회 평균 계좌 수익금', '수익 거래 1회당 평균 수익금'],
    avgLoss: ['1회 평균 계좌 손실금', '손실 거래 1회당 평균 손실금'],
    maxWin: ['최대 수익금', '단일 거래 기준 최대 수익금'],
    maxLoss: ['최대 손실금', '단일 거래 기준 최대 손실금'],
    footnote: '위 통계는 선택 기간의 모의매매 기준으로 산출된 결과입니다.',
    brand: 'AIX ｜ AI로 더 똑똑한 투자',
    times: '회',
  },
  en: {
    title: 'Trading Performance',
    headerTagline: 'Better investing through data',
    entries: ['Total Entries', 'Total number of trade entries'],
    winRate: ['Win Rate', 'Share of profitable trades'],
    riskReward: ['Risk/Reward', 'Average win ÷ average loss'],
    accountReturn: ['Account Return', 'Return since starting balance'],
    accountProfit: ['Account Profit', 'Cumulative profit since start'],
    avgWinRate: 'Average Win Return',
    avgLossRate: 'Average Loss Return',
    avgWin: ['Average Winning Profit', 'Average winning trade profit'],
    avgLoss: ['Average Losing Amount', 'Average losing trade loss'],
    maxWin: ['Highest Profit', 'Highest single trade profit'],
    maxLoss: ['Highest Loss', 'Highest single trade loss'],
    footnote: 'These results are based on simulated trades in the selected period.',
    brand: 'AIX ｜ Smarter investing with AI',
    times: 'entries',
  },
} as const;

type MetricCopy = readonly [string, string];
type Accent = 'purple' | 'green' | 'blue' | 'red';

const ACCENTS: Record<Accent, { row: string; icon: string }> = {
  purple: {
    row: 'border-purple-200 bg-purple-50 dark:border-purple-500/50 dark:!bg-[linear-gradient(90deg,rgba(88,28,135,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-purple-200 dark:bg-purple-800',
  },
  green: {
    row: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/50 dark:!bg-[linear-gradient(90deg,rgba(6,95,70,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-emerald-200 dark:bg-emerald-700',
  },
  blue: {
    row: 'border-blue-200 bg-blue-50 dark:border-blue-500/50 dark:!bg-[linear-gradient(90deg,rgba(30,58,138,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-blue-200 dark:bg-blue-700',
  },
  red: {
    row: 'border-red-200 bg-red-50 dark:border-red-500/50 dark:!bg-[linear-gradient(90deg,rgba(127,29,29,0.4)_0%,rgba(15,23,42,0.9)_100%)]',
    icon: 'bg-red-200 dark:bg-red-700',
  },
};

function MetricRow({
  copy,
  value,
  valueClassName,
  icon,
  accent,
}: {
  copy: MetricCopy;
  value: string;
  valueClassName: string;
  icon: string;
  accent: Accent;
}) {
  const colors = ACCENTS[accent];
  return (
    <div
      className={`proof-performance-metric proof-performance-metric-${accent} relative flex h-[72px] min-w-0 items-start gap-2 overflow-hidden rounded-lg border px-2 py-2 sm:px-[8px] ${colors.row}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-md ${colors.icon}`}
        >
          <Image src={`/proof/expected-return/${icon}`} alt="" width={20} height={20} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[12px] font-bold text-foreground dark:text-white sm:text-[13px]">
            {copy[0]}
          </div>
          <div className="hidden truncate text-[11px] leading-4 text-muted-foreground dark:text-slate-400 sm:block">
            {copy[1]}
          </div>
        </div>
      </div>
      <div
        className={`absolute bottom-1 right-3 whitespace-nowrap text-right text-sm font-bold tabular-nums sm:right-[15px] sm:text-base ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

export function ExpectedReturnDashboard({
  language,
  period,
  slice,
  seed,
  entryRatio,
  leverage,
}: {
  language: ProofLanguage;
  period: string;
  slice: ProofCycleStatsSlice;
  seed: number;
  entryRatio: number;
  leverage: number;
}) {
  const copy = language === 'ko' ? COPY.ko : COPY.en;
  const present = hasData(slice);
  const entries = slice.cycleCount;
  const wins = Math.min(entries, Math.max(0, Math.round(entries * slice.winRate)));
  const losses = Math.max(0, entries - wins);
  const ratio = slice.winLossRatio;
  const denominator = ratio == null ? 0 : wins * ratio - losses;
  const averageLossRate =
    ratio != null && losses > 0 && denominator !== 0
      ? Math.abs(slice.pnlPerEntryNotionalRateSum / denominator)
      : null;
  const averageWinRate = averageLossRate != null && ratio != null ? averageLossRate * ratio : null;
  const positionNotional = seed * (entryRatio / 100) * leverage;

  const formatMoney = (value: number | null) => {
    if (!present || value == null || !Number.isFinite(value)) return '—';
    const formatted = Math.round(Math.abs(value)).toLocaleString('en-US');
    return `${value > 0 ? '+' : value < 0 ? '-' : ''}$${formatted}`;
  };
  const formatPercent = (value: number | null, signed = false) => {
    if (!present || value == null || !Number.isFinite(value)) return '—';
    const prefix = signed ? (value > 0 ? '+' : value < 0 ? '-' : '') : '';
    return `${prefix}${Math.abs(value).toFixed(2)}%`;
  };
  const valueClassName = (value: number | null) => {
    if (!present || value == null || !Number.isFinite(value)) return 'text-muted-foreground';
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-foreground';
  };

  const accountReturn = projectedPct(slice, seed, entryRatio, leverage);
  const accountProfit = projectedUsd(slice, seed, entryRatio, leverage);
  const maxWin = projectedCycleUsd(slice.maxPnlPerEntryNotionalRate, seed, entryRatio, leverage);
  const maxLoss = projectedCycleUsd(slice.minPnlPerEntryNotionalRate, seed, entryRatio, leverage);
  const averageWinAccountPct =
    averageWinRate == null ? null : averageWinRate * entryRatio * leverage;
  const averageLossAccountPct =
    averageLossRate == null ? null : averageLossRate * entryRatio * leverage;
  const avgWinRateCopy: MetricCopy = [
    copy.avgWinRate,
    language === 'ko' ? `수익 거래 1회당 평균 수익률` : `Average winning trade return`,
  ];
  const avgLossRateCopy: MetricCopy = [
    copy.avgLossRate,
    language === 'ko' ? `손실 거래 1회당 평균 손실률` : `Average losing trade return`,
  ];

  return (
    <div className="rounded-xl border-2 border-border bg-card p-4 text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:border-blue-900 dark:bg-[linear-gradient(135deg,#070b14_0%,#101c36_100%)] dark:text-white dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:p-5">
      <div className="mb-5 flex flex-col gap-3 border-b border-border pb-[15px] dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-[15px] gap-y-2">
          <div className="text-[22px] font-bold tracking-wider">
            AI<span className="text-pink-500">X</span>
          </div>
          <div className="text-lg font-bold">{copy.title}</div>
          <div className="rounded bg-muted px-2.5 py-1 text-[13px] text-muted-foreground dark:bg-white/5 dark:text-slate-400">
            {period}
          </div>
        </div>
        <div className="text-xs text-muted-foreground dark:text-slate-400">
          {copy.headerTagline}
        </div>
      </div>

      <div className="mb-[15px] flex flex-col gap-2">
        <div className="proof-performance-summary proof-performance-summary-blue flex min-h-[58px] items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500 dark:!bg-[linear-gradient(135deg,rgba(30,58,138,0.4),rgba(15,23,42,0.8))]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-[35px] items-center justify-center rounded-md bg-blue-600">
              <Image src="/proof/expected-return/entries.png" alt="" width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold text-slate-300">{copy.entries[0]}</div>
              <div className="hidden truncate text-[12px] text-slate-400 sm:block">
                {copy.entries[1]}
              </div>
            </div>
          </div>
          <div className="shrink-0 whitespace-nowrap text-right text-xl font-bold tabular-nums sm:text-2xl">
            {present ? entries.toLocaleString('en-US') : '—'}{' '}
            <span className="text-sm font-normal">{copy.times}</span>
          </div>
        </div>
        <div className="proof-performance-summary proof-performance-summary-green grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500 dark:!bg-[linear-gradient(135deg,rgba(6,95,70,0.4),rgba(15,23,42,0.8))]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-[35px] items-center justify-center rounded-md bg-emerald-600">
              <Image src="/proof/expected-return/win-rate.png" alt="" width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold text-slate-300">{copy.winRate[0]}</div>
              <div className="hidden truncate text-[12px] text-slate-400 sm:block">
                {copy.winRate[1]}
              </div>
            </div>
          </div>
          <div>
            <div className="shrink-0 whitespace-nowrap text-right text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">
              {present ? `${(slice.winRate * 100).toFixed(1)}%` : '—'}
            </div>
            <div className="col-start-2 hidden whitespace-nowrap text-right text-[11px] text-slate-400 2xl:block">
              {present
                ? language === 'ko'
                  ? `${wins.toLocaleString('en-US')}승 / ${entries.toLocaleString('en-US')}회`
                  : `${wins.toLocaleString('en-US')} won / ${entries.toLocaleString('en-US')} total`
                : '—'}
            </div>
          </div>
        </div>
        <div className="proof-performance-summary proof-performance-summary-amber grid min-h-[58px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-yellow-500 dark:!bg-[linear-gradient(135deg,rgba(113,63,18,0.4),rgba(15,23,42,0.8))]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-[35px] items-center justify-center rounded-md bg-amber-600">
              <Image src="/proof/expected-return/risk-reward.png" alt="" width={20} height={20} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold text-slate-300">
                {copy.riskReward[0]}
              </div>
              <div className="hidden truncate text-[12px] text-slate-400 sm:block">
                {copy.riskReward[1]}
              </div>
            </div>
          </div>
          <div>
            <div className="shrink-0 whitespace-nowrap text-right text-xl font-bold tabular-nums text-yellow-400 sm:text-2xl">
              {present && ratio != null ? ratio.toFixed(2) : '—'}
            </div>
            <div className="col-start-2 hidden whitespace-nowrap text-right text-[11px] text-slate-400 2xl:block">
              {present && averageWinAccountPct != null && averageLossAccountPct != null
                ? language === 'ko'
                  ? `평균수익 ${formatPercent(averageWinAccountPct)} : 평균손실 ${formatPercent(averageLossAccountPct)}`
                  : `Avg win ${formatPercent(averageWinAccountPct)} : avg loss ${formatPercent(averageLossAccountPct)}`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-[10px] grid grid-cols-1 gap-2 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-4">
        <MetricRow
          copy={copy.accountReturn}
          value={formatPercent(accountReturn, true)}
          valueClassName={valueClassName(accountReturn)}
          icon="account-return.png"
          accent="purple"
        />
        <MetricRow
          copy={avgWinRateCopy}
          value={formatPercent(averageWinAccountPct, true)}
          valueClassName={valueClassName(averageWinAccountPct)}
          icon="average-win-rate.png"
          accent="green"
        />
        <MetricRow
          copy={copy.avgWin}
          value={formatMoney(averageWinRate == null ? null : averageWinRate * positionNotional)}
          valueClassName={valueClassName(
            averageWinRate == null ? null : averageWinRate * positionNotional
          )}
          icon="average-win.png"
          accent="blue"
        />
        <MetricRow
          copy={copy.maxWin}
          value={formatMoney(maxWin)}
          valueClassName={valueClassName(maxWin)}
          icon="max-win.png"
          accent="purple"
        />
        <MetricRow
          copy={copy.accountProfit}
          value={formatMoney(accountProfit)}
          valueClassName={valueClassName(accountProfit)}
          icon="account-profit.png"
          accent="blue"
        />
        <MetricRow
          copy={avgLossRateCopy}
          value={formatPercent(averageLossAccountPct == null ? null : -averageLossAccountPct, true)}
          valueClassName={valueClassName(
            averageLossAccountPct == null ? null : -averageLossAccountPct
          )}
          icon="average-loss-rate.png"
          accent="red"
        />
        <MetricRow
          copy={copy.avgLoss}
          value={formatMoney(averageLossRate == null ? null : -averageLossRate * positionNotional)}
          valueClassName={valueClassName(
            averageLossRate == null ? null : -averageLossRate * positionNotional
          )}
          icon="average-loss.png"
          accent="red"
        />
        <MetricRow
          copy={copy.maxLoss}
          value={formatMoney(maxLoss)}
          valueClassName={valueClassName(maxLoss)}
          icon="max-loss.png"
          accent="red"
        />
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-2.5 text-[11px] text-muted-foreground dark:border-white/10 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-1">
          <span aria-hidden>ⓘ</span>
          <span>{copy.footnote}</span>
        </div>
        <div>{copy.brand}</div>
      </div>
    </div>
  );
}
