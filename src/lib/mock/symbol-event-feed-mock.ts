/**
 * event.symbol_feed 뷰 Mock — Zone 6 이벤트 3종 (AIX-43 스키마 전까지)
 */
export type SymbolFeedEventKind = 'signal_cycle' | 'price_tick' | 'ai_alert';

export interface SymbolFeedEventRow {
  id: string;
  kind: SymbolFeedEventKind;
  atMs: number;
  title: string;
  detail: string;
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const KIND_LABEL: Record<SymbolFeedEventKind, string> = {
  signal_cycle: '시그널·사이클',
  price_tick: '시세',
  ai_alert: 'AI·알림',
};

export function symbolFeedKindLabel(kind: SymbolFeedEventKind): string {
  return KIND_LABEL[kind];
}

export function getSymbolFeedEventsMock(symbol: string, limit = 12): SymbolFeedEventRow[] {
  const h = hashSymbol(symbol);
  const base = Date.now() - (h % 86_400_000);
  const kinds: SymbolFeedEventKind[] = ['signal_cycle', 'price_tick', 'ai_alert'];
  const rows: SymbolFeedEventRow[] = [];
  for (let i = 0; i < limit; i++) {
    const kind = kinds[(h + i) % 3];
    const atMs = base - i * (11 + ((h + i) % 47)) * 60_000;
    if (kind === 'signal_cycle') {
      rows.push({
        id: `${symbol}-sc-${i}`,
        kind,
        atMs,
        title: '사이클 상태 갱신',
        detail: `전략 스냅샷 · ${symbol.replace('USDT', '')} 포지션 동기화`,
      });
    } else if (kind === 'price_tick') {
      rows.push({
        id: `${symbol}-px-${i}`,
        kind,
        atMs,
        title: '시세 갱신',
        detail: `Mark · 펀딩 · OI 반영`,
      });
    } else {
      rows.push({
        id: `${symbol}-ai-${i}`,
        kind,
        atMs,
        title: 'AI 코멘트',
        detail: '요약·리스크 플래그 갱신',
      });
    }
  }
  return rows;
}
