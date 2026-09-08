'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function MyGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-0 min-w-0 flex-1 lg:min-w-[800px]">{children}</div>
    </RequireAuth>
  );
}
