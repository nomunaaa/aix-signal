/** Proof 페이지 숫자·부호 포맷 */

export function formatProofPercent(value: number, fractionDigits = 2): string {
  if (!Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(fractionDigits)}%`;
}

export function formatWinRate(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  return `${(rate * 100).toFixed(2)}%`;
}

export function pnlTextClass(pnl: number): string {
  if (pnl > 0) return 'text-success';
  if (pnl < 0) return 'text-destructive';
  return 'text-foreground';
}
