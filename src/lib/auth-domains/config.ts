export type AuthDomain = 'member' | 'admin' | 'partner';

export const DOMAIN_SESSION_COOKIE_NAMES: Record<AuthDomain, string> = {
  member: 'member_session',
  admin: 'admin_session',
  partner: 'partner_session',
};

export const DOMAIN_AUTH_HINT_COOKIE_NAME = 'aix-authenticated';

export const DOMAIN_LOGIN_PATHS: Record<AuthDomain, string> = {
  member: '/auth',
  admin: '/admin/login',
  partner: '/partner-login',
};

export const DOMAIN_DEFAULT_PATHS: Record<AuthDomain, string> = {
  member: '/home',
  admin: '/admin-panel',
  partner: '/partner',
};
