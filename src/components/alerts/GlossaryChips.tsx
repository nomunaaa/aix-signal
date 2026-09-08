import { memo } from 'react';
import { TermTooltip } from '@/components/ui/term-tooltip';
import { GlossaryKey } from '@/config/glossary';
import { useBilingualText } from '@/hooks/useBilingualText';

const GLOSSARY_ITEMS: Array<{ label: string; term: GlossaryKey }> = [
  { label: 'ALC', term: 'alc' },
  { label: 'LDR', term: 'ldr' },
  { label: '단일 포지션', term: 'single-position' },
  { label: 'DND', term: 'dnd' },
  { label: '프리셋', term: 'preset' },
  { label: '채널 우선순위', term: 'channel-priority' },
];

export const GlossaryChips = memo(function GlossaryChips() {
  const { tr } = useBilingualText();
  const labelFor = (label: string) => {
    switch (label) {
      case '단일 포지션':
        return tr('단일 포지션', 'Single position');
      case '프리셋':
        return tr('프리셋', 'Preset');
      case '채널 우선순위':
        return tr('채널 우선순위', 'Channel priority');
      default:
        return label;
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {GLOSSARY_ITEMS.map(({ label, term }) => (
        <div key={term} className="flex items-center gap-1">
          <span className="text-sm font-medium">{labelFor(label)}</span>
          <TermTooltip term={term} />
        </div>
      ))}
    </div>
  );
});
