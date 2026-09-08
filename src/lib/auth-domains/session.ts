import {
  DOMAIN_AUTH_HINT_COOKIE_NAME,
  DOMAIN_SESSION_COOKIE_NAMES,
  type AuthDomain,
} from '@/lib/auth-domains/config';

export type { AuthDomain } from '@/lib/auth-domains/config';

export interface DomainSession {
  domain: AuthDomain;
  userId: string;
  email: string;
  role: string;
  displayName?: string;
  roles?: string[];
  organizationName?: string | null;
  partnerAccountId?: string | null;
  expiresAt?: string;
}

const DOMAIN_SESSION_STORAGE_KEY = 'aix.auth.domain.sessions';

function readSessions(): Record<AuthDomain, DomainSession | null> {
  if (typeof window === 'undefined') {
    return {
      member: null,
      admin: null,
      partner: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(DOMAIN_SESSION_STORAGE_KEY);
    if (!raw) {
      return {
        member: null,
        admin: null,
        partner: null,
      };
    }

    return JSON.parse(raw) as Record<AuthDomain, DomainSession | null>;
  } catch {
    return {
      member: null,
      admin: null,
      partner: null,
    };
  }
}

function writeSessions(sessions: Record<AuthDomain, DomainSession | null>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DOMAIN_SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

function setMemberSessionCookie(userId: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (userId) {
    document.cookie = `${DOMAIN_SESSION_COOKIE_NAMES.member}=${encodeURIComponent(userId)}; path=/; max-age=1800; SameSite=Lax`;
    return;
  }

  document.cookie = `${DOMAIN_SESSION_COOKIE_NAMES.member}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function setDomainSession(domain: AuthDomain, session: DomainSession) {
  const sessions = readSessions();
  sessions[domain] = session;
  writeSessions(sessions);
}

export function upsertDomainSession(domain: AuthDomain, session: DomainSession) {
  setDomainSession(domain, session);
  setDomainAuthCookie(true, domain);
}

export function getDomainSession(domain: AuthDomain) {
  const sessions = readSessions();
  return sessions[domain] ?? null;
}

export function clearDomainSession(domain: AuthDomain) {
  const sessions = readSessions();
  sessions[domain] = null;
  writeSessions(sessions);
}

export interface AuthUserLike {
  id?: string;
  userId?: string;
  email?: string | null;
}

export function syncDomainSessionFromUser(
  domain: AuthDomain,
  user: AuthUserLike | null,
  role: string = domain === 'member' ? 'member' : domain,
) {
  const userId = user?.id ?? user?.userId;

  if (!userId) {
    clearDomainSession(domain);
    if (domain === 'member') {
      setMemberSessionCookie(null);
      setDomainAuthCookie(false, 'member');
    }
    return null;
  }

  const session = {
    domain,
    userId,
    email: user?.email ?? '',
    role,
  } satisfies DomainSession;

  upsertDomainSession(domain, session);
  if (domain === 'member') {
    setMemberSessionCookie(userId);
  }
  return session;
}

export function setDomainAuthCookie(isAuthenticated: boolean, domain: AuthDomain = 'member') {
  if (typeof window === 'undefined') {
    return;
  }

  const cookieValue = JSON.stringify({
    authenticated: isAuthenticated,
    domain,
  });

  if (isAuthenticated) {
    document.cookie = `${DOMAIN_AUTH_HINT_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; path=/; max-age=1800; SameSite=Lax`;
    return;
  }

  document.cookie = `${DOMAIN_AUTH_HINT_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function clearDomainAuthCookie() {
  setDomainAuthCookie(false);
}

export function canAccessDomain(targetDomain: AuthDomain, sourceDomain: AuthDomain) {
  if (targetDomain === sourceDomain) {
    return Boolean(getDomainSession(targetDomain));
  }

  const sourceSession = getDomainSession(sourceDomain);
  const targetSession = getDomainSession(targetDomain);

  if (!sourceSession || !targetSession) {
    return false;
  }

  return sourceDomain === 'member' ? false : sourceDomain === targetDomain;
}
