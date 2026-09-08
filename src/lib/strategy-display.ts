/**
 * FRD-003 / AIX-54 — 4전략 라벨·accent 단일 출처 (Proof §4, CycleStrategyCards 공용)
 */
export type CycleStrategyKey = 'basic' | 'dca' | 'partial_exit' | 'dca_partial';

export type StrategyAccentColor = 'teal' | 'amber' | 'purple' | 'rose';

/** VEILE 스펙 — Proof StrategyGrid border-left 직접 적용용 */
export const STRATEGY_ACCENT_HEX: Record<StrategyAccentColor, string> = {
  teal: '#14B8A6',
  amber: '#F59E0B',
  purple: '#A855F7',
  rose: '#F43F5E',
};

export const STRATEGY_KEY_TO_ACCENT: Record<CycleStrategyKey, StrategyAccentColor> = {
  basic: 'teal',
  dca: 'amber',
  partial_exit: 'purple',
  dca_partial: 'rose',
};

export const STRATEGY_LABEL_KO: Record<CycleStrategyKey, string> = {
  basic: '오리지널',
  dca: '물타기',
  partial_exit: '분할청산',
  dca_partial: '모두',
};

/** CycleStrategyCards — Tailwind 좌측 보더 (HEX와 동계열) */
export const STRATEGY_BORDER_L_CLASS: Record<CycleStrategyKey, string> = {
  basic: 'border-l-teal-500',
  dca: 'border-l-amber-500',
  partial_exit: 'border-l-purple-500',
  dca_partial: 'border-l-rose-500',
};

export const STRATEGY_DISPLAY: Record<
  CycleStrategyKey,
  { name: string; accent: StrategyAccentColor }
> = {
  basic: { name: STRATEGY_LABEL_KO.basic, accent: 'teal' },
  dca: { name: STRATEGY_LABEL_KO.dca, accent: 'amber' },
  partial_exit: { name: STRATEGY_LABEL_KO.partial_exit, accent: 'purple' },
  dca_partial: { name: STRATEGY_LABEL_KO.dca_partial, accent: 'rose' },
};
