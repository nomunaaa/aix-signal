'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

type OpenCycle = {
  id: string;
  symbol: string;
  side: string;
  entry_price: number;
  entry_time: string;
  barinterval: string;
  flow: string | null;
};

export default function OpenPositionsPage() {
  const [rows, setRows] = useState<OpenCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from('signal_cycles')
      .select('id,symbol,side,entry_price,entry_time,barinterval,flow')
      .eq('is_open', true)
      .order('entry_time', { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as OpenCycle[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">열린 포지션</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            시그널 사이클(<span className="font-mono">signal_cycles</span>) 중 미청산 포지션입니다.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          새로고침
        </Button>
      </div>

      {err ? (
        <p className="text-sm text-destructive" role="alert">
          불러오기 실패: {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">로딩 중…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">열린 포지션이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border/60">
          <Table data-testid="open-positions-table">
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">종목</TableHead>
                <TableHead className="text-xs">방향</TableHead>
                <TableHead className="text-xs">진입가</TableHead>
                <TableHead className="text-xs">봉</TableHead>
                <TableHead className="text-xs">플로우</TableHead>
                <TableHead className="text-xs">진입 시각</TableHead>
                <TableHead className="w-24 text-xs"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const sym = r.symbol.replace(/USDT$/i, '');
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.symbol}</TableCell>
                    <TableCell className="text-xs">{r.side}</TableCell>
                    <TableCell className="font-mono text-xs">{r.entry_price}</TableCell>
                    <TableCell className="font-mono text-xs">{r.barinterval}</TableCell>
                    <TableCell className="text-xs">{r.flow ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(r.entry_time).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="link" className="h-auto p-0 text-xs">
                        <Link href={`/signals/${sym}`}>시그널</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
