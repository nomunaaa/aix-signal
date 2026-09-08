import type { MockSignal } from '@/lib/mock/realistic-data';

const STRAT: Record<string, string> = {
  basic: '베이직',
  dca: '딥바이',
  partial_exit: '분할청산',
  dca_partial: '딥바이+분할',
};

export function stratLabel(s: MockSignal): string {
  return STRAT[s.strategy_type] ?? s.strategy_type;
}

export function minutesFromIso(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

export function confGrade(score: number): 'high' | 'medium' | 'low' {
  if (score >= 75) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function sectionLabel(section: string): string {
  if (section === 'non_trend') return '비추세';
  if (section === 'trend_tp') return '추세/수익실현';
  return '추세/할인진입';
}
