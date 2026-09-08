/**
 * AIXSignal Design Tokens - Color Palette
 *
 * Bybit-style dark theme with red accent.
 * Single source of truth for all color values.
 */

export const colors = {
  // ── Brand ──
  primary: '#D51113',
  primaryHover: '#B80E10',
  primaryMuted: '#D5111320',

  // ── Background ──
  bgBase: 'hsl(var(--background))',
  bgSurface: 'hsl(var(--surface-base))',
  bgCard: 'hsl(var(--card))',
  bgCardHover: 'hsl(var(--card-hover))',
  bgElevated: 'hsl(var(--surface-elevated))',

  // ── Text ──
  textPrimary: 'hsl(var(--foreground))',
  textSecondary: 'hsl(var(--muted-foreground))',
  textTertiary: 'hsl(var(--text-muted))',
  textMuted: 'hsl(var(--text-muted))',

  // ── Trading Semantic (PnL only: green = profit, red = loss) ──
  long: '#22C55E',
  longBg: '#22C55E15',
  short: '#EF4444',
  shortBg: '#EF444415',

  // ── Direction (position side, distinct from PnL) ──
  directionLong: '#3B82F6',
  directionLongBg: '#3B82F615',
  directionShort: '#F97316',
  directionShortBg: '#F9731615',

  // ── Strategy Colors ──
  strategy: {
    oneshot: '#6B7280',
    safe: '#3B82F6',
    deep: '#F59E0B',
    full: '#10B981',
  },

  // ── Section Zones ──
  zoneRealtime: '#D51113',
  zoneWaiting: '#F59E0B',
  zoneHistory: '#64748B',

  // ── Urgent Zone ──
  urgent: '#DC2626',
  urgentBg: '#DC262615',
  urgentBgLight: '#DC262608',
  urgentBorder: '#DC262640',

  // ── Warning ──
  warning: '#FBBF24',

  // ── Proprietary Indicators ──
  discount: '#8B5CF6',
  locked: '#06B6D4',

  // ── Border ──
  border: 'hsl(var(--border))',
  borderHover: '#334155',
  borderSubtle: '#1E293B80',
} as const;

export type ColorKey = keyof typeof colors;
