import { useMemo } from 'react';
import { NewsFeedItem } from '@/components/shared/NewsFeedItem';
import { KairosComment } from '@/components/symbol-detail/KairosComment';
import { Zone4NonTrendGuide } from '@/components/symbol-detail/zones/Zone4NonTrendGuide';
import { ZoneWrapper } from '@/components/symbol-detail/primitives/ZoneWrapper';
import { getMockNewsForSymbol } from '@/lib/mock/news-data';
import { findMockSignalForSymbol } from '@/lib/mock/symbol-detail-mock';
import { zoneInsightsHref } from '@/lib/symbol-detail/zone-nav-href';

export function Zone4InsightsSection({ symbol, isOutlier }: { symbol: string; isOutlier: boolean }) {
  const news = useMemo(() => getMockNewsForSymbol(symbol).slice(0, 3), [symbol]);
  const signal = findMockSignalForSymbol(symbol);
  const showNt = signal?.section === 'non_trend';
  const displayNews = isOutlier ? [] : news;

  return (
    <ZoneWrapper
      title="AI + 뉴스"
      color="purple"
      navHref={zoneInsightsHref()}
      navLabel="인사이트 전체 보러가기 →"
    >
      <div className="space-y-3">
        {showNt && signal ? <Zone4NonTrendGuide symbol={symbol} signal={signal} /> : null}
        <KairosComment symbol={symbol} isOutlier={isOutlier} />
        <div className="space-y-2">
          {displayNews.length > 0 ? (
            displayNews.map((item) => <NewsFeedItem key={item.id} item={item} />)
          ) : (
            <p className="rounded-md border border-border/50 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              관련 뉴스 없음
            </p>
          )}
        </div>
      </div>
    </ZoneWrapper>
  );
}
