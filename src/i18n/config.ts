/**
 * i18n 설정
 * 
 * react-i18next 설정 및 언어 관리
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 언어 리소스 import
import enCommon from './locales/en/common.json';
import koCommon from './locales/ko/common.json';
import jaCommon from './locales/ja/common.json';
import zhCommon from './locales/zh/common.json';

import enSignals from './locales/en/signals.json';
import koSignals from './locales/ko/signals.json';
import jaSignals from './locales/ja/signals.json';
import zhSignals from './locales/zh/signals.json';

import enTrading from './locales/en/trading.json';
import koTrading from './locales/ko/trading.json';
import jaTrading from './locales/ja/trading.json';
import zhTrading from './locales/zh/trading.json';

/**
 * 지원 언어 목록
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const SUPPORTED_LANG_SET = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));

function normalizeLanguageCode(code: string | null | undefined): LanguageCode | null {
  if (!code) return null;
  const base = code.toLowerCase().split('-')[0] ?? '';
  return SUPPORTED_LANG_SET.has(base) ? (base as LanguageCode) : null;
}

/**
 * 브라우저 저장소·navigator 기준 언어를 적용합니다.
 * SSR과 첫 클라이언트 페인트를 맞추기 위해 모듈 init 시점에는 detector를 쓰지 않고,
 * 마운트 이후(예: app/providers)에서만 호출하세요.
 */
export function syncI18nLanguageFromBrowser(): void {
  if (typeof window === 'undefined') return;
  try {
    const fromI18n = normalizeLanguageCode(localStorage.getItem('i18nextLng'));
    const fromApp = normalizeLanguageCode(localStorage.getItem('language'));
    const fromNav = normalizeLanguageCode(navigator.language);
    const detected = fromI18n ?? fromApp ?? fromNav;
    if (!detected) return;

    const current = normalizeLanguageCode(i18n.language) ?? 'ko';
    if (detected !== current) {
      void i18n.changeLanguage(detected);
    }
  } catch {
    /* localStorage 등 실패 시 기본 ko 유지 */
  }
}

/**
 * 리소스 구조
 */
const resources = {
  en: {
    common: enCommon,
    signals: enSignals,
    trading: enTrading,
  },
  ko: {
    common: koCommon,
    signals: koSignals,
    trading: koTrading,
  },
  ja: {
    common: jaCommon,
    signals: jaSignals,
    trading: jaTrading,
  },
  zh: {
    common: zhCommon,
    signals: zhSignals,
    trading: zhTrading,
  },
};

/**
 * i18n 초기화
 *
 * 하이드레이션 불일치 방지: 서버·클라이언트 첫 페인트는 동일하게 `lng: 'ko'`로 시작하고,
 * 사용자 선호 언어는 `syncI18nLanguageFromBrowser()`를 마운트 후에만 적용합니다.
 */
void i18n.use(initReactI18next).init({
  resources,
  lng: 'ko',
  fallbackLng: 'ko', // 기본 언어: 한국어
  supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
  defaultNS: 'common',
  ns: ['common', 'signals', 'trading'],

  interpolation: {
    escapeValue: false, // React already escapes
  },

  react: {
    useSuspense: false,
  },
});

export default i18n;
