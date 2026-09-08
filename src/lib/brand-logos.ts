/**
 * Brand logos under `public/` (served at site root in Vite).
 * `logo-dark` / `logo-light` match the active UI theme background.
 */
export const PUBLIC_BRAND_LOGO = {
  dark: '/logo-dark.svg',
  light: '/logo-light.svg',
} as const;

export type BrandLogoTheme = keyof typeof PUBLIC_BRAND_LOGO;

export function publicBrandLogoSrc(theme: BrandLogoTheme): string {
  return PUBLIC_BRAND_LOGO[theme];
}

/** Collapsed sidebar: compact icon (`/logo-icon.svg`). */
export function publicSidebarCollapsedMarkSrc(): string {
  return '/logo-icon.svg';
}
