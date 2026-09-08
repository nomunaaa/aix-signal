/**
 * ThemeSwitcherButton - 다크/라이트 모드 토글 버튼
 * Sun/Moon 아이콘 전환 애니메이션 (CSS only — framer-motion은 메인 번들 비용이 커서 제외)
 */

import { memo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export const ThemeSwitcherButton = memo(function ThemeSwitcherButton({
  className,
}: {
  className?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-md',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      <span
        key={isDark ? 'sun' : 'moon'}
        className="flex items-center justify-center animate-in spin-in-90 zoom-in-50 fade-in duration-150"
      >
        {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </span>
    </button>
  );
});
