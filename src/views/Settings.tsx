'use client';

/**
 * /settings — 통합 설정 허브
 * 3탭 네비게이션: 내 프로필 / 알림 / 구독
 * 각 탭은 기존 페이지로 연결
 *
 * REB-171: 설정 탭 통합
 */

import { useNavigate } from '@/lib/navigation-compat';
import { ChevronRight } from 'lucide-react';
import { SETTINGS_SECTIONS } from '@/config/settings';
import { cn } from '@/lib/utils';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="w-full py-6">
      <h1 className="mb-6 text-xl font-bold">설정</h1>

      <div className="space-y-2">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => navigate(section.path)}
              className={cn(
                'flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left',
                'border border-border/50 bg-card hover:border-border hover:bg-accent/50',
                'group cursor-pointer transition-colors'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
