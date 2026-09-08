import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MainContentProps {
  children: ReactNode;
  /** 전체 너비 사용 (max-width 제거) */
  fullWidth?: boolean;
  className?: string;
}

/**
 * 본문 래퍼: max-width, padding, min-height로 시각적으로 본문 영역 부각.
 * MainLayout 내부에서 사용하거나, 페이지에서 직접 사용 가능.
 */
export function MainContent({
  children,
  fullWidth = false,
  className,
}: MainContentProps) {
  return (
    <div
      className={cn(
        // flex-1: MainLayout의 flex column(main) 안에서 남는 세로 공간을 채워
        // Footer가 항상 하단에 고정되도록 한다. flex 부모가 아니면 영향 없음.
        //
        // w-full이 반드시 필요하다: 부모(main)가 flex column이라 자식은 원래 교차축으로
        // stretch되지만, mx-auto(margin-inline: auto)가 stretch를 무효화해서 콘텐츠 크기만큼
        // 줄어든다. 그래서 max-w는 상한일 뿐 실제 폭은 페이지 내용에 따라 제각각이었다
        // (측정: 프로필 333px / 설정 310px / 알림 832px / 결제 807px). w-full로 상한까지
        // 채워야 같은 카테고리 페이지가 같은 폭을 갖는다.
        "mx-auto w-full px-4 sm:px-6 py-6 min-h-[50vh] flex-1",
        fullWidth ? "max-w-none" : "max-w-[1400px]",
        className
      )}
    >
      {children}
    </div>
  );
}
