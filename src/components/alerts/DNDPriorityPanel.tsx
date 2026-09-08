import { memo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FAIcon } from '@/components/icons/FAIcon';
import { useBilingualText } from '@/hooks/useBilingualText';
import { Loader2, Save } from 'lucide-react';
import { NotifyChannel } from '@/types/alerts';

interface DNDPriorityPanelProps {
  dndStart: string;
  dndEnd: string;
  onDNDChange: (start: string, end: string) => void | Promise<void>;
  channelPriority: NotifyChannel[];
  onPriorityChange?: (priority: NotifyChannel[]) => void;
}

export const DNDPriorityPanel = memo(function DNDPriorityPanel({
  dndStart,
  dndEnd,
  onDNDChange,
  channelPriority,
}: DNDPriorityPanelProps) {
  const { tr } = useBilingualText();
  const [dndEnabled, setDndEnabled] = useState(true);
  const [draftStart, setDraftStart] = useState(dndStart);
  const [draftEnd, setDraftEnd] = useState(dndEnd);
  const [isSaving, setIsSaving] = useState(false);
  const hasDndChanges = draftStart !== dndStart || draftEnd !== dndEnd;

  useEffect(() => {
    setDraftStart(dndStart);
    setDraftEnd(dndEnd);
  }, [dndEnd, dndStart]);

  const handleSaveDND = async () => {
    if (!hasDndChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onDNDChange(draftStart, draftEnd);
    } finally {
      setIsSaving(false);
    }
  };

  const channelLabel = (channel: NotifyChannel) =>
    channel === '앱 내 알림(기본)' ? tr('앱 내 알림(기본)', 'In-app alerts (default)') : channel;

  return (
    <Card className="glass-subtle p-6">
      <h2 className="text-2xl font-bold mb-6">{tr('방해금지 & 우선순위', 'DND & priority')}</h2>
      
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dnd-toggle" className="text-base font-semibold">
              {tr('방해금지 모드 (DND)', 'Do Not Disturb (DND)')}
            </Label>
            <Switch
              id="dnd-toggle"
              checked={dndEnabled}
              onCheckedChange={setDndEnabled}
            />
          </div>
          
          {dndEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div className="space-y-2">
                <Label htmlFor="dnd-start">{tr('시작 시간', 'Start time')}</Label>
                <Input
                  id="dnd-start"
                  type="time"
                  value={draftStart}
                  onChange={(e) => setDraftStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dnd-end">{tr('종료 시간', 'End time')}</Label>
                <Input
                  id="dnd-end"
                  type="time"
                  value={draftEnd}
                  onChange={(e) => setDraftEnd(e.target.value)}
                />
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-3">
                <Badge variant="secondary" className="text-xs">
                  {tr('ALC_EXIT는 DND 중에도 알림 전송', 'ALC_EXIT still sends during DND')}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveDND}
                  disabled={!hasDndChanges || isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {tr('DND 저장', 'Save DND')}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-6 border-t">
          <Label className="text-base font-semibold">{tr('채널 우선순위', 'Channel priority')}</Label>
          <div className="space-y-2">
            {channelPriority.map((channel, idx) => (
              <div
                key={channel}
                className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border border-border/50"
              >
                <FAIcon icon="grip-vertical" className="h-4 w-4 text-muted-foreground cursor-move" />
                <span className="flex-1">{channelLabel(channel)}</span>
                <Badge variant="outline" className="text-xs">
                  {tr(`${idx + 1}순위`, `Priority ${idx + 1}`)}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {tr('현재는 앱 내 알림 센터만 사용합니다', 'Currently only the in-app notification center is used')}
          </p>
        </div>
      </div>
    </Card>
  );
});
