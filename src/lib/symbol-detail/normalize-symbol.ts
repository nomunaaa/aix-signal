/**
 * /signals/:symbol 라우트 파라미터 정규화 (SRD-002 §11.6)
 * — *USDT 형식, 잘못된 값은 null
 */
export function normalizeSymbolParam(raw: string | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!upper) return null;
  const sym = upper.endsWith('USDT') ? upper : `${upper}USDT`;
  const base = sym.slice(0, -4);
  if (base.length < 2 || base.length > 20) return null;
  return sym;
}
