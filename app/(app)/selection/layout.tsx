'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function SelectionLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
