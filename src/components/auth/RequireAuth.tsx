'use client';

import { useAuth } from '@/contexts/AuthContext';
import { PUBLIC_BROWSING } from '@/config/access';
import { Link } from '@/lib/navigation-compat';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export function RequireAuth({ children }: Props) {
  const { user, isLoading } = useAuth();

  // 공개 열람이 켜져 있으면 화면을 가리지 않는다. 데이터는 여전히 RLS가 막으므로
  // 비로그인 방문자에게는 레이아웃과 빈 상태만 보인다.
  if (PUBLIC_BROWSING) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            이 페이지를 이용하려면 먼저 로그인해 주세요.
          </p>
        </div>
        <Button asChild>
          <Link to="/auth">로그인하기</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
