import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NewsSentiment, SymbolNewsItem } from '@/lib/mock/news-data';
import { ExternalLink } from '@/lib/icons';
import { krNewsSentimentBadge } from '@/lib/kr-display';

const sent: Record<NewsSentiment, string> = {
  Bullish: krNewsSentimentBadge.Bullish,
  Bearish: krNewsSentimentBadge.Bearish,
  Neutral: krNewsSentimentBadge.Neutral,
};

export function NewsFeedItem({ item }: { item: SymbolNewsItem }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex flex-1 items-start gap-1 text-sm font-semibold leading-snug text-foreground hover:text-primary hover:underline"
        >
          <span>{item.title}</span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
        </a>
        <Badge variant="secondary" className={cn('shrink-0 text-[10px]', sent[item.sentiment])}>
          {item.sentiment}
        </Badge>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {item.source} · {item.minutesAgo}분 전
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.llmComment}</p>
    </div>
  );
}
