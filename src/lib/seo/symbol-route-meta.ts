/**
 * /signals/[symbol] SEO — 서버 layout의 generateMetadata 전용 (클라이언트 훅 없음)
 */

export function normalizeSymbolParam(raw: string): string {
  try {
    return decodeURIComponent(raw).replaceAll(/\s+/g, '').toUpperCase();
  } catch {
    return raw.replaceAll(/\s+/g, '').toUpperCase();
  }
}

/** 예: BTCUSDT → BTC/USDT */
export function symbolLabelForSeo(symbol: string): string {
  const s = normalizeSymbolParam(symbol);
  if (s.endsWith('USDT')) {
    return `${s.slice(0, -4)}/USDT`;
  }
  return s;
}

export function buildSymbolHubMetadata(symbol: string): {
  normalized: string;
  label: string;
  title: string;
  description: string;
} {
  const normalized = normalizeSymbolParam(symbol);
  const label = symbolLabelForSeo(normalized);
  const title = `${label} 선물 시그널·차트·성과 아카이브 | AiXSignal`;
  const description = `${label} USDT 무기한 선물 기준 AiXSignal 시그널 보드, 차트, 사이클·성과 히스토리를 한 화면에서 확인합니다.`;
  return { normalized, label, title, description };
}
