import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useBilingualText } from '@/hooks/useBilingualText';
import { toast } from 'sonner';
import { Bell, BellOff, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 가입 직후 SignupComplete에서만 브라우저 알림 권한을 물어봤고, 그 화면을 다시
 * 보지 않으면 재요청하거나 차단 상태를 되돌릴 방법이 없었다 — 여기서도 동일한
 * 권한 흐름을 노출한다.
 */
export function BrowserPushPanel() {
  const { tr } = useBilingualText();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(true);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

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
                'AiXSignal 탭이 열려 있는 동안 PULSE/WAVE 시그널을 데스크톱 알림으로 받습니다.',
                'Get PULSE/WAVE signal alerts as desktop notifications while an AiXSignal tab is open.'
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

      {/* 백그라운드 웹 푸시(서비스 워커 + VAPID)는 아직 붙지 않았다. 지금은 탭이
          열려 있을 때만 알림이 뜨므로, 그 한계를 UI에서 분명히 밝힌다. */}
      <p className="mt-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {tr(
          '현재는 AiXSignal 탭이 열려 있을 때만 알림이 표시됩니다. 브라우저를 완전히 닫으면 알림이 오지 않습니다.',
          'Alerts currently appear only while an AiXSignal tab is open. You will not receive them once the browser is fully closed.'
        )}
      </p>

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

      <button
        type="button"
        onClick={() => setShowSetupGuide((prev) => !prev)}
        className="mt-4 flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={showSetupGuide}
      >
        {tr('Chrome·Edge 알림 설정 방법 보기', 'How to set up notifications in Chrome / Edge')}
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', showSetupGuide && 'rotate-180')} />
      </button>

      {showSetupGuide && (
        <div className="mt-3 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              {tr('1. 브라우저에서 알림 허용', '1. Allow notifications in your browser')}
            </h3>
            <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
              <li>{tr('위의 스위치를 켜고 "허용" 버튼을 누릅니다.', 'Turn on the switch above and click "Allow" on the prompt.')}</li>
              <li>
                {tr(
                  '이미 차단한 적이 있다면 주소창 왼쪽의 자물쇠 아이콘 → "알림"을 "허용"으로 변경 후 새로고침합니다.',
                  'If you already blocked it, click the lock icon in the address bar → set "Notifications" to "Allow", then refresh.'
                )}
              </li>
            </ol>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              {tr('2. 운영체제 알림 설정도 확인하세요', "2. Also check your OS-level notification settings")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tr(
                '브라우저에서 알림을 허용해도, 운영체제에서 Chrome/Edge 알림을 막고 있으면 화면에 뜨지 않습니다.',
                'Even with browser permission granted, notifications won\'t appear if your OS is blocking Chrome/Edge notifications.'
              )}
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
              <li>
                {tr(
                  'macOS: 시스템 설정 → 알림 → Google Chrome(또는 Microsoft Edge) → "알림 허용" 켜기',
                  'macOS: System Settings → Notifications → Google Chrome (or Microsoft Edge) → enable "Allow Notifications"'
                )}
              </li>
              <li>
                {tr(
                  'Windows: 설정 → 시스템 → 알림 → Google Chrome(또는 Microsoft Edge) 항목 켜기',
                  'Windows: Settings → System → Notifications → turn on the Google Chrome (or Microsoft Edge) entry'
                )}
              </li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-semibold text-foreground">
              {tr('3. "방해 금지 모드"도 확인하세요', '3. Check "Do Not Disturb" / focus modes too')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tr(
                'macOS 집중 모드나 Windows 방해 금지 모드가 켜져 있으면 알림이 조용히 숨겨질 수 있습니다.',
                'macOS Focus mode or Windows Focus Assist can silently suppress notifications when turned on.'
              )}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
