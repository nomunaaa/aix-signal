/**
 * 차트 워크스페이스 레이아웃 — 좌: 차트 영역(툴바 + 차트 + 하단 포지션), 우: 모의매매 사이드바.
 * 차트 렌더링 자체는 chart 슬롯으로 그대로 전달만 하며 이 컴포넌트가 관여하지 않는다.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChartWorkspaceShellProps {
  /** 심볼 선택·타임프레임·줌 등 기존 차트 툴바. */
  readonly toolbar: ReactNode;
  /** 차트 캔버스 + 오버레이 (수정 금지 영역). */
  readonly chart: ReactNode;
  /** 차트 하단 지표 토글. */
  readonly indicators?: ReactNode;
  /** 차트 하단 진입/종료 포지션 테이블 2열. */
  readonly positions?: ReactNode;
  /** 우측 사이드바 (시그널 카드 · 모의매매 · 도움말). */
  readonly sidebar?: ReactNode;
  /** 전체화면 여부 — 사이드바·포지션 영역을 숨겨 차트에 집중한다. */
  readonly isFullscreen?: boolean;
  readonly className?: string;
}

export function ChartWorkspaceShell({
  toolbar,
  chart,
  indicators,
  positions,
  sidebar,
  isFullscreen = false,
  className,
}: ChartWorkspaceShellProps) {
  // MainLayout이 /chart1m 등 모든 차트 라우트를 h-dvh + overflow-hidden 고정 뷰포트 셸로
  // 감싼다(페이지 자체는 스크롤되지 않음 — 원본 chart.html 목업도 body { overflow:hidden }
  // 고정 레이아웃이다). 따라서 포지션 테이블은 남은 세로 공간 안에서 "그 영역만" 자체
  // 스크롤되어야 하며, 이 컴포넌트 트리 전체가 min-h-0로 높이를 위임해야 그 계산이 성립한다.
  return (
    <div className={cn('flex min-h-0 w-full flex-1 bg-background', className)}>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {toolbar}

        {/* 차트: 전체화면이면 남은 높이 전부, 아니면 고정 높이 확보 (차트 자체 렌더링은 그대로 유지) */}
        <div
          className={cn(
            'relative flex min-h-0 flex-col',
            isFullscreen ? 'flex-1' : 'h-[420px] flex-none'
          )}
        >
          {chart}
        </div>

        {indicators}

        {!isFullscreen && positions ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden border-t border-border px-3.5 py-4 lg:grid-cols-2">
            {positions}
          </div>
        ) : null}
      </main>

      {!isFullscreen && sidebar ? (
        <aside className="flex w-[340px] flex-none flex-col gap-3 overflow-y-auto border-l border-border bg-card/40 p-3.5">
          {sidebar}
        </aside>
      ) : null}
    </div>
  );
}
