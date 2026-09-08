import { useEffect, useRef, useState } from 'react';

export type SignalStreamId = 'pulse' | 'wave';

/**
 * Periodic refetch for open signal cycles (CoinGlass-style table refresh).
 * Parent supplies `refetchSignals` (e.g. useSignalCycles().refetchOpenSignals).
 */
export function useSignalPolling(options: {
  stream: SignalStreamId;
  refetchSignals: () => Promise<unknown>;
  intervalMs?: number;
}) {
  const { stream, refetchSignals, intervalMs = 10_000 } = options;
  const refetchRef = useRef(refetchSignals);
  refetchRef.current = refetchSignals;
  const [lastUpdate, setLastUpdate] = useState(() => new Date());

  useEffect(() => {
    const run = async () => {
      try {
        await refetchRef.current();
      } catch (e) {
        console.warn('[useSignalPolling] refetch failed:', e);
      } finally {
        setLastUpdate(new Date());
      }
    };

    void run();
    const id = window.setInterval(() => void run(), intervalMs);
    return () => window.clearInterval(id);
  }, [stream, intervalMs]);

  return { lastUpdate };
}
