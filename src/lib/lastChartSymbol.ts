/** 차트 페이지 이탈 후 복귀 시 마지막으로 보던 종목을 복원하기 위한 저장소. */
export function readLastChartSymbol(storageKey: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function writeLastChartSymbol(storageKey: string, symbol: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, symbol);
  } catch {
    /* ignore */
  }
}
