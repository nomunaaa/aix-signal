import type { Position } from '@/lib/my/types';

function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${dd} ${hh}:${mi}`;
}

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${mo}${dd}`;
}

const HEADERS = [
  '청산일',
  '종목',
  '방향',
  '전략',
  '엔진',
  '진입가',
  '청산가',
  '보유(초)',
  'PnL(%)',
  'PnL(USDT)',
];

export function exportHistoryCsv(rows: Position[], period: string): void {
  const lines: string[] = [HEADERS.map(escapeCell).join(',')];

  for (const row of rows) {
    const cells = [
      fmtDate(row.closedAt),
      row.symbol,
      row.direction,
      row.strategy,
      row.engine,
      row.entryPrice,
      row.exitPrice ?? '',
      row.holdSec,
      row.totalPnlPct,
      row.totalPnlUsd,
    ];
    lines.push(cells.map(escapeCell).join(','));
  }

  const csv = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aixsignal-history-${period}-${todayYYYYMMDD()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
