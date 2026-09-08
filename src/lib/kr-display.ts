/**
 * 한국 시장 표시 규약: 상승·이익은 빨강(destructive), 하락·손실은 파랑(info).
 * hsl(var(--…)) 토큰 기반 Tailwind 클래스만 반환한다.
 */
export function krSignedValueTextClass(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'text-muted-foreground';
  return value > 0 ? 'text-destructive' : 'text-info';
}

/** 롱·숏 포지션 라벨 색 (가격 방향과 별개로 롱=강세 축, 숏=약세 축) */
export function krPositionSideTextClass(side: 'LONG' | 'SHORT'): string {
  return side === 'LONG' ? 'text-destructive' : 'text-info';
}

export function krSignedBarFillClass(value: number): string {
  if (!Number.isFinite(value) || value === 0) return 'bg-muted';
  return value > 0 ? 'bg-destructive/80' : 'bg-info/80';
}

export function krWinDotClass(win: boolean): string {
  return win ? 'text-destructive' : 'text-info';
}

export function krWinStreakBgClass(win: boolean): string {
  return win ? 'bg-destructive/5' : 'bg-info/5';
}

/** 24h 레인지 바에서 현재가가 중간 대비 위쪽이면 상승 축 색 */
export function krMidPositiveFillClass(fromMidPositive: boolean): string {
  return fromMidPositive ? 'bg-destructive' : 'bg-info';
}

export const krNewsSentimentBadge = {
  Bullish: 'bg-destructive/10 text-destructive',
  Bearish: 'bg-info/10 text-info',
  Neutral: 'bg-muted text-muted-foreground',
} as const;

/** StatsTab 등 하이라이트 열(강조 기간) — 손익 방향과 무관 */
export function krPeriodHighlightHeaderClass(): string {
  return 'bg-primary/10 text-primary';
}

export function krPeriodHighlightCellClass(): string {
  return 'bg-primary/5';
}
