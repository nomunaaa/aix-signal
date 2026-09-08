import type { SignalStreamId, StrategyId } from '../types/pulse.types';

const COOKIE_NAME = 'aixsignal_signals_entry';
const MAX_AGE_SEC = 365 * 24 * 60 * 60;

const STRATEGIES = new Set<StrategyId>(['oneshot', 'safe', 'deep', 'full']);

export interface SignalsEntryPayload {
  stream: SignalStreamId;
  strategy: StrategyId;
}

function parsePayload(raw: unknown): SignalsEntryPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const stream = o.stream;
  const strategy = o.strategy;
  if (stream !== 'pulse' && stream !== 'wave') return null;
  if (typeof strategy !== 'string' || !STRATEGIES.has(strategy as StrategyId)) return null;
  return { stream, strategy: strategy as StrategyId };
}

export function readSignalsEntryCookie(): SignalsEntryPayload | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    const decoded = decodeURIComponent(match[1]);
    const parsed = JSON.parse(decoded) as unknown;
    return parsePayload(parsed);
  } catch {
    return null;
  }
}

export function writeSignalsEntryCookie(payload: SignalsEntryPayload): void {
  if (typeof document === 'undefined') return;
  const body = encodeURIComponent(JSON.stringify(payload));
  document.cookie = `${COOKIE_NAME}=${body};path=/;max-age=${MAX_AGE_SEC};SameSite=Lax`;
}
