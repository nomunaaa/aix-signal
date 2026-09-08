/** Proof 페이지 숫자·부호 포맷 */

export function formatProofPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatWinRate(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  return `${(Math.round(rate * 1000) / 10).toFixed(1)}%`;
}

export function pnlTextClass(pnl: number): string {
  if (pnl > 0) return 'text-success';
  if (pnl < 0) return 'text-destructive';
  return 'text-foreground';
}
