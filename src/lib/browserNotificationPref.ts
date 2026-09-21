/**
 * 브라우저 알림 "사용자 설정"을 브라우저 권한과 분리해 둔다.
 *
 * 권한(Notification.permission)은 페이지에서 요청만 가능하고 취소할 수 없다.
 * 그래서 스위치를 권한에만 묶으면 켜는 건 되지만 끄는 건 아무 일도 일어나지
 * 않는다(다시 켜진 상태로 돌아온다). 실제로 끄고 켤 수 있는 값은 앱이 들고
 * 있어야 하므로, 여기서 관리하고 알림을 띄우기 직전에 확인한다.
 */
const STORAGE_KEY = 'aixsignal-browser-notifications-enabled';
const CHANGE_EVENT = 'aixsignal:browser-notifications-pref';

/** 권한을 방금 허용한 사용자는 알림을 받고 싶다는 뜻이므로 기본값은 켜짐이다. */
const DEFAULT_ENABLED = true;

export function readBrowserNotificationPref(): boolean {
  if (typeof window === 'undefined') return DEFAULT_ENABLED;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_ENABLED;
    return raw === 'true';
  } catch {
    return DEFAULT_ENABLED;
  }
}

export function writeBrowserNotificationPref(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // 저장이 막혀 있어도(시크릿 모드 등) 현재 탭 동작은 이어가야 한다.
  }
  window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: enabled }));
}

export function subscribeBrowserNotificationPref(listener: (enabled: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    listener(readBrowserNotificationPref());
  };
  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<boolean>).detail;
    listener(typeof detail === 'boolean' ? detail : readBrowserNotificationPref());
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(CHANGE_EVENT, handleCustomEvent);
  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleCustomEvent);
  };
}
