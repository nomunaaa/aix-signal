import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Pretendard Variable',
  				'Pretendard',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			mono: ['JetBrains Mono', ...((defaultTheme.fontFamily?.mono ?? []) as string[])],
  			/** /chart·시그널 숫자 — Tabular 우선 (quiet-motion 정렬) */
  			chartNums: [
  				'Tabular',
  				'SF Mono',
  				'Monaco',
  				'Consolas',
  				'ui-monospace',
  				'monospace',
  			],
  			serif: [
  				'Merriweather',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			heading: [
  				'NanumSquare',
  				'NanumSquareOTF',
  				'Pretendard Variable',
  				'sans-serif'
  			]
  		},
  		fontSize: {
  			h1: [
  				'var(--fs-h1)',
  				{
  					lineHeight: 'var(--lh-h1)',
  					fontWeight: 'var(--fw-h1)'
  				}
  			],
  			h2: [
  				'var(--fs-h2)',
  				{
  					lineHeight: 'var(--lh-h2)',
  					fontWeight: 'var(--fw-h2)'
  				}
  			],
  			body: [
  				'var(--fs-body)',
  				{
  					lineHeight: 'var(--lh-body)',
  					fontWeight: 'var(--fw-body)'
  				}
  			],
  			caption: [
  				'var(--fs-caption)',
  				{
  					lineHeight: 'var(--lh-caption)',
  					fontWeight: 'var(--fw-caption)'
  				}
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			'header-bg': 'var(--header-bg)',
  			'header-border': 'var(--header-border)',
  			'dropdown-bg': 'var(--dropdown-bg)',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			tertiary: {
  				DEFAULT: 'hsl(var(--tertiary))',
  				foreground: 'hsl(var(--tertiary-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			'semantic-bull': {
  				DEFAULT: 'hsl(var(--semantic-bull))',
  				foreground: 'hsl(var(--semantic-bull-foreground))'
  			},
  			'semantic-bear': {
  				DEFAULT: 'hsl(var(--semantic-bear))',
  				foreground: 'hsl(var(--semantic-bear-foreground))'
  			},
  			'semantic-neutral': {
  				DEFAULT: 'hsl(var(--semantic-neutral))',
  				foreground: 'hsl(var(--semantic-neutral-foreground))'
  			},
  			'semantic-cta': {
  				DEFAULT: 'hsl(var(--semantic-cta))',
  				foreground: 'hsl(var(--semantic-cta-foreground))'
  			},
  			'radar-buy': 'hsl(var(--radar-buy))',
  			'radar-buy-scan': 'hsl(var(--radar-buy-scan))',
  			'radar-sell': 'hsl(var(--radar-sell))',
  			'radar-sell-warning': 'hsl(var(--radar-sell-warning))',
  			'radar-standby': 'hsl(var(--radar-standby))',
  			'radar-standby-foreground': 'hsl(var(--radar-standby-foreground))',
  			icon: {
  				DEFAULT: 'hsl(var(--icon-default))',
  				muted: 'hsl(var(--icon-muted))',
  				primary: 'hsl(var(--icon-primary))',
  				secondary: 'hsl(var(--icon-secondary))',
  				success: 'hsl(var(--icon-success))',
  				danger: 'hsl(var(--icon-danger))',
  				warning: 'hsl(var(--icon-warning))',
  				info: 'hsl(var(--icon-info))',
  				bull: 'hsl(var(--icon-bull))',
  				bear: 'hsl(var(--icon-bear))',
  				neutral: 'hsl(var(--icon-neutral))'
  			},
  			success: 'hsl(var(--success))',
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: 'hsl(var(--info))',
  			'card-rise-tint': 'hsl(var(--card-rise-tint))',
  			'card-fall-tint': 'hsl(var(--card-fall-tint))',
  			'card-neutral-tint': 'hsl(var(--card-neutral-tint))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			brand: {
  				DEFAULT: '#D51113',
  				hover: '#B80E10',
  				active: '#9A0B0D',
  				muted: 'rgba(213, 17, 19, 0.12)',
  				glow: 'rgba(213, 17, 19, 0.25)'
  			},
  			trading: {
  				long: '#22C55E',
  				'long-hover': '#16A34A',
  				'long-muted': 'rgba(34, 197, 94, 0.12)',
  				'long-bg': 'rgba(34, 197, 94, 0.08)',
  				short: '#EF4444',
  				'short-hover': '#DC2626',
  				'short-muted': 'rgba(239, 68, 68, 0.12)',
  				'short-bg': 'rgba(239, 68, 68, 0.08)',
  				neutral: '#F59E0B',
  				'neutral-muted': 'rgba(245, 158, 11, 0.12)'
  			},
  			/**
  			 * VIS-002 · Axis 1 · Direction (VIS-001 preserved, must not regress).
  			 * Base tokens use `hsl(var(--x) / <alpha-value>)` so opacity modifiers
  			 * (e.g. `bg-direction-long/10`) resolve correctly. `-bg` variants remain
  			 * pre-mixed rgba for legacy inline-style consumers.
  			 */
  			direction: {
  				'long-strong': 'hsl(var(--long-strong) / <alpha-value>)',
  				long:          'hsl(var(--long) / <alpha-value>)',
  				neutral:       'hsl(var(--dir-neutral) / <alpha-value>)',
  				short:         'hsl(var(--short) / <alpha-value>)',
  				'short-strong':'hsl(var(--short-strong) / <alpha-value>)',
  				'long-strong-bg':  'var(--long-strong-bg)',
  				'long-bg':         'var(--long-bg)',
  				'neutral-bg':      'var(--dir-neutral-bg)',
  				'short-bg':        'var(--short-bg)',
  				'short-strong-bg': 'var(--short-strong-bg)'
  			},
  			/** VIS-002 · Axis 2 · Score (signal quality / win-rate / rating — NO red) */
  			score: {
  				excellent: 'hsl(var(--score-excellent) / <alpha-value>)',
  				good:      'hsl(var(--score-good) / <alpha-value>)',
  				neutral:   'hsl(var(--score-neutral) / <alpha-value>)',
  				poor:      'hsl(var(--score-poor) / <alpha-value>)',
  				bad:       'hsl(var(--score-bad) / <alpha-value>)',
  				'excellent-bg': 'var(--score-excellent-bg)',
  				'good-bg':      'var(--score-good-bg)',
  				'neutral-bg':   'var(--score-neutral-bg)',
  				'poor-bg':      'var(--score-poor-bg)',
  				'bad-bg':       'var(--score-bad-bg)'
  			},
  			/** VIS-002 · Axis 3 · Alert (system messages — 주의/경고/위험/심각, 4 tiers, all red family) */
  			alert: {
  				subtle:   'hsl(var(--alert-subtle) / <alpha-value>)',
  				warning:  'hsl(var(--alert-warning) / <alpha-value>)',
  				danger:   'hsl(var(--alert-danger) / <alpha-value>)',
  				critical: 'hsl(var(--alert-critical) / <alpha-value>)',
  				'subtle-bg':   'var(--alert-subtle-bg)',
  				'warning-bg':  'var(--alert-warning-bg)',
  				'danger-bg':   'var(--alert-danger-bg)',
  				'critical-bg': 'var(--alert-critical-bg)'
  			},
  			'pulse-strategy': {
  				oneshot: '#D51113',
  				safe: '#22C55E',
  				deep: '#8B5CF6',
  				full: '#F59E0B'
  			},
  			'pulse-zone': {
  				urgent: '#DC2626',
  				realtime: '#D51113',
  				'realtime-bg': 'rgba(213, 17, 19, 0.06)',
  				watching: '#F59E0B',
  				'watching-bg': 'rgba(245, 158, 11, 0.06)',
  				history: '#64748B',
  				'history-bg': 'rgba(100, 116, 139, 0.06)'
  			},
  			'pulse-indicator': {
  				discount: '#8B5CF6',
  				'discount-bg': 'rgba(139, 92, 246, 0.10)',
  				locked: '#06B6D4',
  				'locked-bg': 'rgba(6, 182, 212, 0.10)'
  			},
  			surface: {
  				base: 'hsl(var(--surface-base))',
  				DEFAULT: 'hsl(var(--background))',
  				card: 'hsl(var(--card))',
  				'card-hover': 'hsl(var(--card-hover))',
  				elevated: 'hsl(var(--surface-elevated))',
  				input: 'hsl(var(--input))'
  			}
  		},
  		zIndex: {
  			header: 'var(--z-header)',
  			dropdown: 'var(--z-dropdown)',
  			'mobile-scrim': 'var(--z-mobile-scrim)',
  			'mobile-drawer': 'var(--z-mobile-drawer)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'shimmer-slide': {
  				to: {
  					transform: 'translate(calc(100cqw - 100%), 0)'
  				}
  			},
  			'spin-around': {
  				'0%': {
  					transform: 'translateZ(0) rotate(0)'
  				},
  				'15%, 35%': {
  					transform: 'translateZ(0) rotate(90deg)'
  				},
  				'65%, 85%': {
  					transform: 'translateZ(0) rotate(270deg)'
  				},
  				'100%': {
  					transform: 'translateZ(0) rotate(360deg)'
  				}
  			},
  			gradient: {
  				to: {
  					backgroundPosition: 'var(--bg-size) 0'
  				}
  			},
  			sparkle: {
  				'0%, 100%': {
  					opacity: '0',
  					transform: 'scale(0)'
  				},
  				'50%': {
  					opacity: 'var(--sparkle-opacity)',
  					transform: 'scale(1)'
  				}
  			},
  			meteor: {
  				'0%': {
  					transform: 'rotate(215deg) translateX(0)',
  					opacity: '1'
  				},
  				'70%': {
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'rotate(215deg) translateX(-500px)',
  					opacity: '0'
  				}
  			},
  			'gradient-shift': {
  				'0%, 100%': {
  					'background-position': '0% 50%'
  				},
  				'50%': {
  					'background-position': '100% 50%'
  				}
  			},
  			'border-beam': {
  				'100%': {
  					'offset-distance': '100%'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(20px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'radar-pulse': {
  				'0%, 100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				},
  				'50%': {
  					transform: 'scale(1.5)',
  					opacity: '0'
  				}
  			},
  			'radar-scan': {
  				'0%': {
  					transform: 'rotate(0deg)'
  				},
  				'100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'radar-glow': {
  				'0%, 100%': {
  					opacity: '0.5'
  				},
  				'50%': {
  					opacity: '1'
  				}
  			},
  			orbit: {
  				'0%': {
  					transform: 'rotate(calc(var(--angle) * 1deg)) translateY(calc(var(--radius) * -1px)) rotate(calc(var(--angle) * -1deg))'
  				},
  				'100%': {
  					transform: 'rotate(calc(var(--angle) * 1deg + 360deg)) translateY(calc(var(--radius) * -1px)) rotate(calc((var(--angle) + 360) * -1deg))'
  				}
  			},
  			'pulse-ring': {
  				'0%, 100%': {
  					boxShadow: '0 0 0 0 var(--tw-shadow-color, hsl(var(--ring)))'
  				},
  				'50%': {
  					boxShadow: '0 0 0 6px var(--tw-shadow-color, hsl(var(--ring)))'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					opacity: '1',
  					boxShadow: '0 0 10px 2px currentColor'
  				},
  				'50%': {
  					opacity: '0.7',
  					boxShadow: '0 0 20px 6px currentColor'
  				}
  			},
  			'price-flash-up': {
  				'0%': {
  					backgroundColor: 'rgb(34 197 94 / 0.3)'
  				},
  				'100%': {
  					backgroundColor: 'transparent'
  				}
  			},
  			'price-flash-down': {
  				'0%': {
  					backgroundColor: 'rgb(239 68 68 / 0.3)'
  				},
  				'100%': {
  					backgroundColor: 'transparent'
  				}
  			},
  			'signal-urgency': {
  				'0%, 100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				},
  				'50%': {
  					transform: 'scale(1.02)',
  					opacity: '0.9'
  				}
  			},
  			'x-spin': {
  				'0%': {
  					transform: 'rotate(0deg)'
  				},
  				'100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'x-pulse': {
  				'0%, 100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				},
  				'50%': {
  					opacity: '0.8',
  					transform: 'scale(1.05)'
  				}
  			},
  			marquee: {
  				from: {
  					transform: 'translateX(0)'
  				},
  				to: {
  					transform: 'translateX(calc(-100% - var(--gap)))'
  				}
  			},
  			'marquee-vertical': {
  				from: {
  					transform: 'translateY(0)'
  				},
  				to: {
  					transform: 'translateY(calc(-100% - var(--gap)))'
  				}
  			},
  			'text-shimmer': {
  				'0%, 90%, 100%': {
  					'background-position': 'calc(-100% - var(--shimmer-width)) 0'
  				},
  				'30%, 60%': {
  					'background-position': 'calc(100% + var(--shimmer-width)) 0'
  				}
  			},
  			'background-shine': {
  				from: {
  					backgroundPosition: '0 0'
  				},
  				to: {
  					backgroundPosition: '-200% 0'
  				}
  			},
  			'gate-card-shrink': {
  				'0%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'scale(0.6)',
  					opacity: '0.8'
  				}
  			},
  			'gate-card-fadeout': {
  				'0%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				}
  			},
  			'gate-card-to-segment': {
  				'0%': {
  					transform: 'translateY(0) scale(0.6)',
  					opacity: '0.8'
  				},
  				'100%': {
  					transform: 'translateY(-200px) scale(0.3)',
  					opacity: '1'
  				}
  			},
  			'gate-segment-fadein': {
  				'0%': {
  					transform: 'translateY(10px) scale(0.8)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0) scale(1)',
  					opacity: '1'
  				}
  			},
  			'gate-dashboard-reveal': {
  				'0%': {
  					transform: 'translateY(20px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'gate-pulse-once': {
  				'0%, 100%': {
  					boxShadow: '0 0 0 0 hsl(var(--primary) / 0)'
  				},
  				'50%': {
  					boxShadow: '0 0 0 8px hsl(var(--primary) / 0.3)'
  				}
  			},
  			'gate-tooltip-appear': {
  				'0%': {
  					transform: 'translateY(4px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			/** Sidebar P/W stream chip — subtle inhale/exhale */
  			'sidebar-stream-breathe': {
  				'0%, 100%': {
  					transform: 'scale(1)'
  				},
  				'50%': {
  					transform: 'scale(1.06)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
  			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
  			gradient: 'gradient 8s linear infinite',
  			sparkle: 'sparkle 3s ease-in-out infinite',
  			'meteor-effect': 'meteor 5s linear infinite',
  			'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-up': 'slide-up 0.4s ease-out',
  			shimmer: 'shimmer 2s linear infinite',
  			'gradient-shift': 'gradient-shift 8s ease infinite',
  			'gold-stream': 'gold-stream 3s linear infinite',
  			'sparkle-float': 'sparkle-float 2s ease-in-out infinite',
  			'radar-pulse': 'radar-pulse 2s ease-out infinite',
  			'radar-scan': 'radar-scan 4s linear infinite',
  			'radar-glow': 'radar-glow 2s ease-in-out infinite',
  			orbit: 'orbit calc(var(--duration)*1s) linear infinite',
  			'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'price-flash-up': 'price-flash-up 0.6s ease-out',
  			'price-flash-down': 'price-flash-down 0.6s ease-out',
  			'signal-urgency': 'signal-urgency 2s ease-in-out infinite',
  			'x-spin': 'x-spin 1.2s linear infinite',
  			'x-pulse': 'x-pulse 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
  			marquee: 'marquee var(--duration, 40s) linear infinite',
  			'marquee-vertical': 'marquee-vertical var(--duration, 40s) linear infinite',
  			'text-shimmer': 'text-shimmer 8s ease-in-out infinite',
  			'background-shine': 'background-shine 2s linear infinite',
  			'gate-card-shrink': 'gate-card-shrink 300ms ease-in-out forwards',
  			'gate-card-fadeout': 'gate-card-fadeout 200ms ease-out forwards',
  			'gate-card-to-segment': 'gate-card-to-segment 300ms ease-in-out forwards',
  			'gate-segment-fadein': 'gate-segment-fadein 300ms ease-out forwards',
  			'gate-dashboard-reveal': 'gate-dashboard-reveal 300ms ease-out forwards',
  			'gate-pulse-once': 'gate-pulse-once 600ms ease-in-out',
  			'gate-tooltip-appear': 'gate-tooltip-appear 300ms ease-out forwards',
  			'sidebar-stream-breathe': 'sidebar-stream-breathe 2.75s ease-in-out infinite'
  		},
  		boxShadow: {
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		}
  	}
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
