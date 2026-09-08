/**
 * 환경변수 검증 및 관리
 * Next.js 14 App Router — 클라이언트 키는 `process.env.NEXT_PUBLIC_*` 정적 접근만 사용.
 */

/**
 * Next.js는 클라이언트 번들에서 `process.env.NEXT_PUBLIC_*` 정적 멤버 접근만
 * 빌드 시 인라인한다. 동적 키 접근(`process.env[key]`)은 항상 undefined.
 */
function getPublicEnvSnapshot(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_PROJECT_ID: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_REST_URL: process.env.NEXT_PUBLIC_REST_URL,
    NEXT_PUBLIC_SYMBOLS: process.env.NEXT_PUBLIC_SYMBOLS,
    NEXT_PUBLIC_DEFAULT_SYMBOL: process.env.NEXT_PUBLIC_DEFAULT_SYMBOL,
    NEXT_PUBLIC_DEFAULT_INTERVAL: process.env.NEXT_PUBLIC_DEFAULT_INTERVAL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_ONESIGNAL_APP_ID: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
    NEXT_PUBLIC_TG_BOT_NAME: process.env.NEXT_PUBLIC_TG_BOT_NAME,
    NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK,
    NEXT_PUBLIC_USE_MOCK_TREND: process.env.NEXT_PUBLIC_USE_MOCK_TREND,
    NEXT_PUBLIC_USE_MOCK_SIGNALS: process.env.NEXT_PUBLIC_USE_MOCK_SIGNALS,
    NEXT_PUBLIC_USE_MOCK_MY: process.env.NEXT_PUBLIC_USE_MOCK_MY,
    NEXT_PUBLIC_USE_MOCK_PROOF: process.env.NEXT_PUBLIC_USE_MOCK_PROOF,
    NEXT_PUBLIC_USE_MOCK_INSIGHTS: process.env.NEXT_PUBLIC_USE_MOCK_INSIGHTS,
    NEXT_PUBLIC_USE_MOCK_MARKET_COMMENTARY: process.env.NEXT_PUBLIC_USE_MOCK_MARKET_COMMENTARY,
    NEXT_PUBLIC_DELAY_FACTOR: process.env.NEXT_PUBLIC_DELAY_FACTOR,
    NEXT_PUBLIC_DELAY_TOAST_TTL: process.env.NEXT_PUBLIC_DELAY_TOAST_TTL,
    NEXT_PUBLIC_VOL_CUT_LOW: process.env.NEXT_PUBLIC_VOL_CUT_LOW,
    NEXT_PUBLIC_VOL_CUT_NORMAL: process.env.NEXT_PUBLIC_VOL_CUT_NORMAL,
    NEXT_PUBLIC_ATR_PERIOD: process.env.NEXT_PUBLIC_ATR_PERIOD,
    NEXT_PUBLIC_EDGE_C: process.env.NEXT_PUBLIC_EDGE_C,
    NEXT_PUBLIC_EDGE_TAU: process.env.NEXT_PUBLIC_EDGE_TAU,
    NEXT_PUBLIC_TRUST_MIN_N: process.env.NEXT_PUBLIC_TRUST_MIN_N,
    NEXT_PUBLIC_TRUST_PRIOR_MU: process.env.NEXT_PUBLIC_TRUST_PRIOR_MU,
    NEXT_PUBLIC_TRUST_PRIOR_N0: process.env.NEXT_PUBLIC_TRUST_PRIOR_N0,
  };
}

function readPublic(key: string): string | undefined {
  const snap = getPublicEnvSnapshot();
  if (Object.prototype.hasOwnProperty.call(snap, key)) {
    return snap[key];
  }
  return undefined;
}

/** 클라이언트 공개 키 조회. 미설정 시 undefined */
export function getOptionalPublicEnv(key: string): string | undefined {
  return readPublic(key) || undefined;
}

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PROJECT_ID',
] as const;

const optionalEnvVars = [
  'NEXT_PUBLIC_WS_URL',
  'NEXT_PUBLIC_SOCKET_URL',
  'NEXT_PUBLIC_REST_URL',
  'NEXT_PUBLIC_SYMBOLS',
  'NEXT_PUBLIC_DEFAULT_SYMBOL',
  'NEXT_PUBLIC_DEFAULT_INTERVAL',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_ONESIGNAL_APP_ID',
  'NEXT_PUBLIC_TG_BOT_NAME',
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !readPublic(key));

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join('\n')}`;

    console.error('\n' + '='.repeat(60));
    console.error(errorMsg);
    console.error('='.repeat(60) + '\n');

    console.warn('App will continue but some features may not work correctly.');
  }

  const missingOptional = optionalEnvVars.filter((key) => !readPublic(key));
  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
    console.debug(`[env] Optional variables not set (OK): ${missingOptional.join(', ')}`);
  }
}

/** 환경변수 가져오기 (NEXT_PUBLIC_* 키만 허용) */
export function getEnv(key: string, defaultValue?: string): string {
  const value = readPublic(key);
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set and no default value provided.`);
  }
  return value || defaultValue || '';
}

/** 숫자형 환경변수 가져오기 */
export function getEnvNumber(key: string, defaultValue: number): number {
  const value = readPublic(key);
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/** Boolean 환경변수 가져오기 */
export function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = readPublic(key);
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}
