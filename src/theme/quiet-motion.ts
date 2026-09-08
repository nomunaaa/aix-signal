/**
 * Quiet Motion™ Design Tokens
 * "잡음은 지우고, 흐름만 남긴다."
 */

export const quietMotionTokens = {
  // Color Tokens
  color: {
    quiet: {
      bg: '#F5F5F5',
      bgDark: '#0F1115',
      text: '#1E1E1E',
    },
    state: {
      flow: '#16A34A',      // Green - 정상 흐름
      caution: '#F59E0B',   // Yellow - 주의
      noise: '#9CA3AF',     // Gray - 소음
    },
    border: {
      hairline: 'rgba(0, 0, 0, 0.08)',
    },
  },

  // Radius Tokens
  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
  },

  // Elevation (Shadow) Tokens
  elevation: {
    0: 'none',
    1: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    3: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    4: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // Motion Tokens
  motion: {
    open: {
      duration: 240,
      easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    },
    close: {
      duration: 180,
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
    },
    hover: {
      duration: 80,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    focus: {
      duration: 80,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    stagger: {
      delay: 30, // ms between elements
    },
  },

  // Typography Tokens
  typography: {
    fontFamily: {
      kr: "'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      en: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      mono: "'Tabular', 'SF Mono', 'Monaco', 'Consolas', monospace",
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  // Component Tokens
  card: {
    size: {
      width: 320,
      height: 200,
      padding: {
        sm: 16,
        md: 20,
      },
    },
    sparkline: {
      height: 20,
    },
  },

  // Breakpoints
  breakpoint: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
  },
} as const;

// CSS 변수로 변환
export const quietMotionCSSVars = {
  '--quiet-bg': quietMotionTokens.color.quiet.bg,
  '--quiet-bg-dark': quietMotionTokens.color.quiet.bgDark,
  '--quiet-text': quietMotionTokens.color.quiet.text,
  '--state-flow': quietMotionTokens.color.state.flow,
  '--state-caution': quietMotionTokens.color.state.caution,
  '--state-noise': quietMotionTokens.color.state.noise,
  '--border-hairline': quietMotionTokens.color.border.hairline,
  '--radius-sm': quietMotionTokens.radius.sm,
  '--radius-md': quietMotionTokens.radius.md,
  '--radius-lg': quietMotionTokens.radius.lg,
  '--motion-open-duration': `${quietMotionTokens.motion.open.duration}ms`,
  '--motion-open-easing': quietMotionTokens.motion.open.easing,
  '--motion-close-duration': `${quietMotionTokens.motion.close.duration}ms`,
  '--motion-close-easing': quietMotionTokens.motion.close.easing,
  '--motion-hover-duration': `${quietMotionTokens.motion.hover.duration}ms`,
  '--motion-stagger-delay': `${quietMotionTokens.motion.stagger.delay}ms`,
} as const;

