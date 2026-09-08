'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function Chart1mLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
