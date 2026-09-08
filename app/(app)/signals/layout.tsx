'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';

export default function SignalsGroupLayout({ children }: { children: React.ReactNode }) {
  return <RequireAuth>{children}</RequireAuth>;
}
