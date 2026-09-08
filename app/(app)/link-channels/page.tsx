'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import RouteModule from '@/views/LinkChannels';

export default function Page() {
  return (
    <RequireAuth>
      <RouteModule />
    </RequireAuth>
  );
}
