'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function TrendGroupLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
