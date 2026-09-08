/**
 * TermTooltip - 용어 설명 툴팁 컴포넌트
 * 주요 용어 옆에 물음표 아이콘과 함께 표시되며, hover 시 설명이 나타남
 */

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type GlossaryKey, getGlossaryItem } from '@/config/glossary';
import { useBilingualText } from '@/hooks/useBilingualText';

interface TermTooltipProps {
  term: GlossaryKey;
  className?: string;
  iconSize?: number;
}

export const TermTooltip = ({ term, className = '', iconSize = 14 }: TermTooltipProps) => {
  const glossaryItem = getGlossaryItem(term);
  const { isKo, tr } = useBilingualText();

  if (!glossaryItem) {
    return null;
  }

  const termLabel = isKo ? glossaryItem.term : (glossaryItem.termEn ?? glossaryItem.term);
  const definition = isKo
    ? glossaryItem.definition
    : (glossaryItem.definitionEn ?? glossaryItem.definition);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center ml-1 text-muted-foreground hover:text-primary transition-colors duration-200 ${className}`}
            aria-label={tr(`${termLabel} 설명 보기`, `View ${termLabel} explanation`)}
          >
            <HelpCircle size={iconSize} className="flex-shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs p-3 text-sm bg-popover border border-border shadow-lg"
        >
          <p className="font-semibold text-foreground mb-1">{termLabel}</p>
          <p className="text-muted-foreground leading-relaxed">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * InlineTermTooltip - 인라인 텍스트와 함께 사용하는 버전
 * 용어를 강조 표시하고 툴팁을 제공
 */
interface InlineTermTooltipProps {
  term: GlossaryKey;
  children: React.ReactNode;
  className?: string;
}

export const InlineTermTooltip = ({ term, children, className = '' }: InlineTermTooltipProps) => {
  const glossaryItem = getGlossaryItem(term);
  const { isKo, tr } = useBilingualText();

  if (!glossaryItem) {
    return <>{children}</>;
  }

  const termLabel = isKo ? glossaryItem.term : (glossaryItem.termEn ?? glossaryItem.term);
  const definition = isKo
    ? glossaryItem.definition
    : (glossaryItem.definitionEn ?? glossaryItem.definition);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-foreground/50 bg-transparent p-0 font-inherit text-inherit focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm ${className}`}
            aria-label={tr(`${termLabel}: 설명 보기`, `${termLabel}: view explanation`)}
          >
            <span>{children}</span>
            <HelpCircle size={14} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs p-3 text-sm bg-popover border border-border shadow-lg"
        >
          <p className="font-semibold text-foreground mb-1">{termLabel}</p>
          <p className="text-muted-foreground leading-relaxed">{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
