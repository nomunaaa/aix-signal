/**
 * Pulse Entry Gate - strategy drawer wrapper.
 *
 * The first-visit stream/strategy gate is intentionally not mounted here;
 * users can still change their stream/strategy from the action bar drawer.
 */

import { usePulseStore } from '../stores/pulseStore';
import { PulseStrategyDrawer } from './PulseStrategyDrawer';

export function PulseEntryGate({ children }: { children: React.ReactNode }) {
  const isStrategyDrawerOpen = usePulseStore((s) => s.isStrategyDrawerOpen);
  const setStrategyDrawerOpen = usePulseStore((s) => s.setStrategyDrawerOpen);

  return (
    <>
      {children}

      <PulseStrategyDrawer
        open={isStrategyDrawerOpen}
        onOpenChange={setStrategyDrawerOpen}
        mode="change"
      />
    </>
  );
}
