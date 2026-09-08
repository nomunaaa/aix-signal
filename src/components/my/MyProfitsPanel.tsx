'use client';

import { useEffect, useState } from 'react';
import { MyPeriodFilter } from '@/components/my/MyPeriodFilter';
import { ProfitsKpiBar } from '@/components/my/profits/ProfitsKpiBar';
import { fetchProfitsSummary, type MyProfitsSummary } from '@/lib/my/fetch-profits';
import type { ProofPeriod } from '@/lib/mock/my-mock';

export function MyProfitsPanel() {
  const [period, setPeriod] = useState<ProofPeriod>('30d');
  const [summary, setSummary] = useState<MyProfitsSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchProfitsSummary(period).then((data) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">모의수익통계</h1>
        <MyPeriodFilter value={period} onChange={setPeriod} />
      </div>

      {summary ? (
        <ProfitsKpiBar summary={summary} />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md border border-border bg-card" />
          ))}
        </div>
      )}

      {summary && summary.totalTradeCount === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          아직 청산된 매매 기록이 없습니다.
        </p>
      )}
    </div>
  );
}
