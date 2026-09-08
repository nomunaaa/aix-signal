/** 차트 페이지 이탈 후 복귀 시 마지막으로 보던 시간대(뷰포트)를 복원하기 위한 저장소. */
export interface ChartViewport {
  fromMs: number;
  toMs: number;
}

function storageKey(barInterval: string, symbol: string): string {
  return `aixsignal:chart-viewport:${barInterval}:${symbol.trim().toUpperCase()}`;
}

export function readChartViewport(barInterval: string, symbol: string): ChartViewport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(barInterval, symbol));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChartViewport>;
    if (
      typeof parsed.fromMs === 'number' &&
      typeof parsed.toMs === 'number' &&
      Number.isFinite(parsed.fromMs) &&
      Number.isFinite(parsed.toMs) &&
      parsed.fromMs < parsed.toMs
    ) {
      return { fromMs: parsed.fromMs, toMs: parsed.toMs };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeChartViewport(barInterval: string, symbol: string, viewport: ChartViewport): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(barInterval, symbol), JSON.stringify(viewport));
  } catch {
    /* ignore */
  }
}
