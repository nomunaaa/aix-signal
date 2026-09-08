/**
 * Pulse / CoinGlass-style numeric heat — frosted tint (max α 0.18), text-first.
 * Single source for heat backgrounds + paired text classes.
 */

export type CellScaleType = 'positive_good' | 'negative_good';
export type ScaleMode = CellScaleType;

// ====== Palette (HSL base + Tailwind text) ======
const COLORS = {
  positive: {
    textClass: 'text-emerald-400',
    textHex: '#34d399',
    bgBase: '160, 84%, 39%',
  },
  negative: {
    textClass: 'text-rose-400',
    textHex: '#fb7185',
    bgBase: '350, 89%, 60%',
  },
  neutral: {
    textClass: 'text-zinc-400',
    textHex: '#a1a1aa',
  },
} as const;

const MAX_OPACITY = 0.18;
const MIN_OPACITY = 0.02;

/** Magnitude → alpha: flat near zero, gentle rise, cap at MAX_OPACITY by ~20% input. */
export function getOpacity(absPercent: number): number {
  if (!Number.isFinite(absPercent) || absPercent <= 0) return 0;
  const normalized = Math.min(absPercent / 20, 1);
  const curved = Math.pow(normalized, 0.6);
  return MIN_OPACITY + curved * (MAX_OPACITY - MIN_OPACITY);
}

export interface CellStyleResult {
  backgroundColor: string;
  /** Hex for inline SVG / `style={{ color }}` */
  textHex: string;
  /** Same as `textHex` — kept for call sites using `style={{ color }}` */
  textColor: string;
  textClass: string;
}

/**
 * Discount $/% columns: always rose text + rose frosted tint from magnitude
 * (same visual family as realized loss), independent of sign.
 */
export function getDiscountHeatStyle(value: number): CellStyleResult {
  if (!Number.isFinite(value) || value === 0) {
    const hex = COLORS.neutral.textHex;
    return {
      backgroundColor: 'transparent',
      textHex: hex,
      textColor: hex,
      textClass: COLORS.neutral.textClass,
    };
  }
  const opacity = getOpacity(Math.abs(value));
  return {
    backgroundColor: `hsla(${COLORS.negative.bgBase}, ${opacity})`,
    textHex: COLORS.negative.textHex,
    textColor: COLORS.negative.textHex,
    textClass: COLORS.negative.textClass,
  };
}

export function getCellStyle(value: number, mode: ScaleMode = 'positive_good'): CellStyleResult {
  if (!Number.isFinite(value) || value === 0) {
    const hex = COLORS.neutral.textHex;
    return {
      backgroundColor: 'transparent',
      textHex: hex,
      textColor: hex,
      textClass: COLORS.neutral.textClass,
    };
  }
  const abs = Math.abs(value);
  const opacity = getOpacity(abs);
  const isGood = mode === 'positive_good' ? value > 0 : value < 0;
  const palette = isGood ? COLORS.positive : COLORS.negative;
  const hex = palette.textHex;
  return {
    backgroundColor: `hsla(${palette.bgBase}, ${opacity})`,
    textHex: hex,
    textColor: hex,
    textClass: palette.textClass,
  };
}

/** Background only — prefer `getCellStyle` when text must match the heat. */
export function getCellBg(value: number, type: CellScaleType): string {
  if (!Number.isFinite(value)) return 'transparent';
  return getCellStyle(value, type).backgroundColor;
}

/** Text class for a numeric value; pass `mode` when the cell uses `negative_good` heat. */
export function getNumericCellTextClass(value: number, mode: CellScaleType = 'positive_good'): string {
  if (!Number.isFinite(value) || value === 0) return COLORS.neutral.textClass;
  return getCellStyle(value, mode).textClass;
}

export function getFlashColor(direction: 'up' | 'down'): string {
  return direction === 'up'
    ? `hsla(${COLORS.positive.bgBase}, 0.25)`
    : `hsla(${COLORS.negative.bgBase}, 0.25)`;
}

export interface GradeColorSet {
  dot: string;
  text: string;
  ring: string;
  pillBg: string;
}

/**
 * Grade → color set. Quality grades (signal quality, win-rate, confidence)
 * live on the VIS-002 score axis, not the direction axis. Red is reserved
 * for direction and for true alerts only; a "low-quality" grade uses the
 * cool slate-600 score-bad token.
 */
export function getGradeColors(grade: 'high' | 'medium' | 'low'): GradeColorSet {
  return {
    high: {
      dot: 'bg-score-excellent',
      text: 'text-score-excellent',
      ring: 'ring-score-excellent/20',
      pillBg: 'bg-score-excellent/10',
    },
    medium: {
      dot: 'bg-score-neutral',
      text: 'text-score-neutral',
      ring: 'ring-score-neutral/20',
      pillBg: 'bg-score-neutral/10',
    },
    low: {
      dot: 'bg-score-bad',
      text: 'text-score-bad',
      ring: 'ring-score-bad/20',
      pillBg: 'bg-score-bad/10',
    },
  }[grade];
}
