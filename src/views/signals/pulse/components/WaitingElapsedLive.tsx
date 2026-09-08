/**
 * 대기시간 — 마지막 청산 이후 경과, 1분마다 갱신
 */
import { useNowMs } from '@/hooks/use-now-ms';
import { formatDuration } from '../utils/formatters';

export function WaitingElapsedLive({ exitIso }: { exitIso: string | Date | undefined }) {
  const nowMs = useNowMs(60_000);
  if (!exitIso) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const exitMs = typeof exitIso === 'string' ? new Date(exitIso).getTime() : exitIso.getTime();
  if (!Number.isFinite(exitMs)) return <span className="text-muted-foreground">{'\u2014'}</span>;
  const sec = Math.max(0, Math.floor((nowMs - exitMs) / 1000));
  return (
    <span className="whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground">
      {formatDuration(sec)}
    </span>
  );
}
