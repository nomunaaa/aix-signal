'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function Chart10mLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
