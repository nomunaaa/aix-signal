import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useBilingualText } from '@/hooks/useBilingualText';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';

/**
 * 가입 직후 SignupComplete에서만 브라우저 알림 권한을 물어봤고, 그 화면을 다시
 * 보지 않으면 재요청하거나 차단 상태를 되돌릴 방법이 없었다 — 여기서도 동일한
 * 권한 흐름을 노출한다.
 */
export function BrowserPushPanel() {
  const { tr } = useBilingualText();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('Notification' in window)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!checked) {
      toast.info(
        tr(
          '브라우저 알림 차단은 브라우저 설정에서만 가능합니다.',
          'Notifications can only be blocked from your browser settings.'
        )
      );
      return;
    }
    if (!('Notification' in window)) return;
    const next = await Notification.requestPermission();
    setPermission(next);
    if (next === 'granted') {
      toast.success(tr('브라우저 알림이 활성화되었습니다!', 'Browser notifications are now enabled!'));
    } else if (next === 'denied') {
      toast.error(
        tr(
          '알림 권한이 거부되었습니다. 브라우저 설정에서 변경해주세요.',
          'Notification permission was denied. Change it in your browser settings.'
        )
      );
    }
  };

  return (
    <Card className="glass-subtle p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 shrink-0 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <h2 className="text-xl font-bold">{tr('브라우저 알림', 'Browser notifications')}</h2>
            <p className="text-sm text-muted-foreground">
              {tr(
                '사이트를 열어두지 않아도 PULSE/WAVE 시그널을 데스크톱 알림으로 받습니다.',
                'Get PULSE/WAVE signal alerts as desktop notifications without keeping the site open.'
              )}
            </p>
          </div>
        </div>
        <Switch
          checked={permission === 'granted'}
          onCheckedChange={handleToggle}
          disabled={!supported || permission === 'denied'}
          aria-label={tr('브라우저 알림 켜기/끄기', 'Toggle browser notifications')}
        />
      </div>

      {!supported && (
        <p className="mt-4 text-sm text-muted-foreground">
          {tr(
            '현재 브라우저는 알림 기능을 지원하지 않습니다.',
            'Your current browser does not support notifications.'
          )}
        </p>
      )}

      {permission === 'denied' && (
        <div className="mt-4 space-y-1 text-sm text-destructive">
          <p>
            {tr(
              '브라우저에서 알림이 차단되어 있어 다시 요청할 수 없습니다. 아래 순서로 직접 허용해주세요.',
              'Notifications are blocked in your browser and can’t be re-requested. Allow them manually with the steps below.'
            )}
          </p>
          <ol className="list-decimal space-y-0.5 pl-4 text-xs">
            <li>
              {tr(
                '주소창 왼쪽의 자물쇠(또는 사이트 정보) 아이콘 클릭',
                'Click the lock (or site info) icon to the left of the address bar'
              )}
            </li>
            <li>
              {tr('"알림" 항목을 "허용"으로 변경', 'Change "Notifications" to "Allow"')}
            </li>
            <li>{tr('페이지를 새로고침', 'Refresh the page')}</li>
          </ol>
        </div>
      )}
    </Card>
  );
}
