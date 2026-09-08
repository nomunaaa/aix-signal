import { useMemo } from 'react';
import { PositionCard } from '@/components/shared/PositionCard';
import { CycleTimeline } from '@/components/shared/CycleTimeline';
import { SectionBadgeRow } from '@/components/shared/SectionBadge';
import { FreshnessBar } from '@/components/shared/FreshnessBar';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { SignalEvaluationCard } from '@/components/symbol-detail/SignalEvaluationCard';
import { SignalInfoCard } from '@/components/symbol-detail/SignalInfoCard';
import {
  findMockSignalForSymbol,
  getCycleTimelineMock,
  getFreshnessBarMock,
  getMockOpenPosition,
  getSignalEvaluationMock,
  getZone1ConfidenceScore,
  mapSignalSectionToBadgeId,
} from '@/lib/mock/symbol-detail-mock';
import { zoneSignalsHref } from '@/lib/symbol-detail/zone-nav-href';
import { useAuth } from '@/contexts/AuthContext';

export function Zone1SignalSection({ symbol }: { symbol: string }) {
  const { user } = useAuth();
  const pos = getMockOpenPosition(symbol, Boolean(user));
  const evalData = useMemo(() => getSignalEvaluationMock(symbol), [symbol]);
  const cycles = useMemo(() => getCycleTimelineMock(symbol), [symbol]);
  const signal = findMockSignalForSymbol(symbol);
  const badgeId = signal ? mapSignalSectionToBadgeId(signal.section) : 'waiting_entry';
  const fresh = useMemo(() => getFreshnessBarMock(symbol), [symbol]);
  const conf = useMemo(() => getZone1ConfidenceScore(symbol), [symbol]);

  return (
    <ZoneWrapper title="시그널" color="teal" navHref={zoneSignalsHref()} navLabel="시그널 대시보드 →">
      <div className="space-y-4">
        <SectionBadgeRow activeId={badgeId} />
        <FreshnessBar
          score={fresh.score}
          axisALabel={fresh.axisALabel}
          axisAValue={fresh.axisAValue}
          axisBLabel={fresh.axisBLabel}
          axisBValue={fresh.axisBValue}
        />
        <div className="text-xs text-muted-foreground">
          신뢰도{' '}
          <span className="font-mono font-semibold text-foreground tabular-nums">{conf}</span>
        </div>
        <SignalInfoCard symbol={symbol} />
        <SignalEvaluationCard data={evalData} />
        <CycleTimeline bars={cycles} title="최근 10건" />
        {pos ? <PositionCard p={pos} /> : null}
      </div>
    </ZoneWrapper>
  );
}
