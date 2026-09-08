/**
 * Language Switcher Component
 * 언어 전환 컴포넌트 - Globe 아이콘 + 언어 코드
 *
 * Next.js SSR: 서버는 항상 lng `ko`로 렌더하고, 클라이언트는 마운트 후에만
 * `i18n.language`를 라벨에 반영해 하이드레이션 불일치(KO vs EN)를 방지합니다.
 */
'use client';

import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
];

function isKo(code: string | undefined): boolean {
  return (code ?? 'ko').toLowerCase().startsWith('ko');
}

function langLabel(code: string | undefined): 'KO' | 'EN' {
  return isKo(code) ? 'KO' : 'EN';
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  /** 서버·클라이언트 첫 렌더는 항상 KO (i18n lng `ko`와 동일). i18n.language는 렌더에서 읽지 않음 */
  const [label, setLabel] = useState<'KO' | 'EN'>('KO');

  useLayoutEffect(() => {
    setLabel(langLabel(i18n.language));
    const onLang = () => setLabel(langLabel(i18n.language));
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, [i18n]);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const isMenuLangActive = (code: string) =>
    (code === 'ko' && label === 'KO') || (code === 'en' && label === 'EN');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 items-center gap-1.5 rounded-md px-2',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'text-sm transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            className
          )}
          aria-label="언어 선택"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium" suppressHydrationWarning>
            {label}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={cn(
              'flex items-center justify-between gap-2 cursor-pointer',
              isMenuLangActive(lang.code) && 'bg-accent'
            )}
          >
            <span className="text-sm">{lang.label}</span>
            {isMenuLangActive(lang.code) && (
              <span className="text-xs text-primary font-medium">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
