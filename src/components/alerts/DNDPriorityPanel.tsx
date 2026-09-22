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
import { NotifyChannel, NotificationAlertType } from '@/types/alerts';
import { NOTIFICATION_TYPE_OPTIONS } from '@/config/notificationTypes';

interface DNDPriorityPanelProps {
  dndStart: string;
  dndEnd: string;
  onDNDChange: (start: string, end: string) => void | Promise<void>;
  channelPriority: NotifyChannel[];
  onPriorityChange?: (priority: NotifyChannel[]) => void;
  /** 빠른 시작에서 고른 알림 종류 — 채널 아래에 현재 설정으로 표시한다. */
  notificationTypes?: NotificationAlertType[];
}

export const DNDPriorityPanel = memo(function DNDPriorityPanel({
  dndStart,
  dndEnd,
  onDNDChange,
  channelPriority,
  notificationTypes = [],
}: DNDPriorityPanelProps) {
  const { tr } = useBilingualText();
  const [dndEnabled, setDndEnabled] = useState(true);
  const [draftStart, setDraftStart] = useState(dndStart);
  const [draftEnd, setDraftEnd] = useState(dndEnd);
  const [isSaving, setIsSaving] = useState(false);
  const hasDndChanges = draftStart !== dndStart || draftEnd !== dndEnd;
  const selectedNotificationTypes = NOTIFICATION_TYPE_OPTIONS.filter((option) =>
    notificationTypes.includes(option.value)
  );

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

          {/* 알림 종류는 위쪽 빠른 시작에서 고르지만, 저장 후에는 그 화면을 다시
              펼치지 않는 한 무엇을 켜 뒀는지 확인할 방법이 없었다 — 채널 바로
              아래에서 현재 설정을 같이 보여 준다. */}
          <div className="space-y-2 pt-4 border-t border-border/50">
            <Label className="text-sm font-semibold">{tr('알림 종류', 'Notification types')}</Label>
            {selectedNotificationTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tr('선택된 알림 종류가 없습니다', 'No notification types selected')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedNotificationTypes.map((option) => (
                  <Badge key={option.value} variant="secondary" className="font-normal">
                    {tr(option.labelKo, option.labelEn)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});
