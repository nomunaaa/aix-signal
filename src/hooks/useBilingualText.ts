import { useCallback, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

export function useBilingualText() {
  const { i18n } = useTranslation();
  const language = useSyncExternalStore(
    (onStoreChange) => {
      i18n.on('languageChanged', onStoreChange);
      return () => i18n.off('languageChanged', onStoreChange);
    },
    () => (i18n.resolvedLanguage ?? i18n.language ?? 'ko').toLowerCase(),
    () => 'ko'
  );
  const isKo = language.startsWith('ko');
  const locale = isKo ? 'ko-KR' : 'en-US';
  const tr = useCallback((ko: string, en: string) => (isKo ? ko : en), [isKo]);

  return { isKo, locale, tr };
}
