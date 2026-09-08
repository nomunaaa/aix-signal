'use client';

import RouteModule from '@/views/Settings';
import { RequireAuth } from '@/components/auth/RequireAuth';

export default function Page() {
  return (
    <RequireAuth>
      <RouteModule />
    </RequireAuth>
  );
}
