'use client';

import { RequireAuth } from '@/components/auth/RequireAuth';
import { PulseHistoryPage } from '@/views/signals/pulse';

export default function HistoryPage() {
  return (
    <RequireAuth>
      <PulseHistoryPage />
    </RequireAuth>
  );
}
