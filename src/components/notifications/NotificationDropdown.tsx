import { memo, useState, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from "@/lib/navigation-compat";
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Check, Trash2, Search, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useNotifications, type Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useBilingualText } from '@/hooks/useBilingualText';

type Translate = (koText: string, enText: string) => string;
type DateGroupKey = 'today' | 'yesterday' | 'thisWeek' | 'older';

// 날짜별 그룹 라벨 생성
function getDateGroupKey(date: Date): DateGroupKey {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === today.getTime()) return 'today';
  if (dateOnly.getTime() === yesterday.getTime()) return 'yesterday';
  if (dateOnly.getTime() >= thisWeek.getTime()) return 'thisWeek';
  return 'older';
}

function getDateGroupLabel(key: DateGroupKey, tr: Translate): string {
  switch (key) {
    case 'today':
      return tr('오늘', 'Today');
    case 'yesterday':
      return tr('어제', 'Yesterday');
    case 'thisWeek':
      return tr('이번 주', 'This week');
    case 'older':
      return tr('이전', 'Older');
    default:
      return key;
  }
}

// 알림 그룹화 함수
function groupNotificationsByDate(notifications: Notification[]): {
  key: DateGroupKey;
  items: Notification[];
}[] {
  const groups: Record<DateGroupKey, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  const orderedKeys: DateGroupKey[] = ['today', 'yesterday', 'thisWeek', 'older'];

  notifications.forEach((notification) => {
    const key = getDateGroupKey(new Date(notification.created_at));
    groups[key].push(notification);
  });

  return orderedKeys
    .filter((key) => groups[key].length > 0)
    .map((key) => ({
      key,
      items: groups[key],
    }));
}

// 알림 아이템 컴포넌트
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: () => void;
  dateFnsLocale: typeof ko;
  tr: Translate;
}

const NotificationItem = memo(function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
  dateFnsLocale,
  tr,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const getKindStyle = useCallback((kind: string) => {
    switch (kind) {
      case 'entry':
        return {
          icon: '🟢',
          label: tr('진입', 'Entry'),
          color: 'hsl(var(--semantic-bull))',
        };
      case 'exit':
        return {
          icon: '🔴',
          label: tr('청산', 'Exit'),
          color: 'hsl(var(--semantic-bear))',
        };
      case 'info':
        return {
          icon: 'i',
          label: tr('정보', 'Info'),
          color: 'hsl(var(--primary))',
        };
      default:
        return {
          icon: '📢',
          label: tr('알림', 'Notification'),
          color: 'hsl(var(--primary))',
        };
    }
  }, [tr]);

  const kindStyle = getKindStyle(notification.kind);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.kind !== 'info') {
      navigate(`/signals/${notification.symbol}`);
    }
    onNavigate();
  };

  // 키보드 접근성: Enter/Space로 클릭 동작 지원
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-all cursor-pointer',
        'min-h-[60px] hover:shadow-sm',
        notification.is_read
          ? 'border-transparent bg-transparent hover:bg-muted/50'
          : 'border-primary/20 bg-primary/5 hover:bg-primary/10'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <span className="text-xl flex-shrink-0 mt-0.5">{kindStyle.icon}</span>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 pr-1">
              <span
                className="truncate text-xs font-bold uppercase tracking-wide"
                style={{ color: kindStyle.color }}
              >
                {notification.symbol}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                style={{
                  background: `${kindStyle.color}20`,
                  color: kindStyle.color,
                }}
              >
                {kindStyle.label}
              </span>
              {!notification.is_read && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-pulse"
                  style={{
                    background: 'hsl(var(--primary))',
                    color: 'hsl(var(--primary-foreground))',
                  }}
                >
                  NEW
                </span>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1">
              <span
                className="text-[10px] tabular-nums whitespace-nowrap"
                style={{ color: 'hsl(var(--ink-lo))' }}
              >
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale: dateFnsLocale,
                })}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="rounded p-1 text-destructive/70 opacity-70 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tr('삭제', 'Delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p
            className="text-sm leading-snug line-clamp-2"
            style={{ color: 'hsl(var(--ink-mid))' }}
          >
            {notification.message}
          </p>
        </div>
      </div>

    </div>
  );
});

// 빈 상태 컴포넌트
function EmptyState({ searchQuery, tr }: { searchQuery: string; tr: Translate }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full mb-3"
        style={{ background: 'hsl(var(--muted))' }}
      >
        <BellOff className="h-6 w-6" style={{ color: 'hsl(var(--ink-lo))' }} />
      </div>
      <p className="text-sm font-medium mb-1" style={{ color: 'hsl(var(--ink-mid))' }}>
        {searchQuery ? tr('검색 결과가 없습니다', 'No search results') : tr('알림이 없습니다', 'No notifications')}
      </p>
      <p className="text-xs" style={{ color: 'hsl(var(--ink-lo))' }}>
        {searchQuery
          ? tr('다른 검색어를 시도해보세요', 'Try another search term')
          : tr('새 시그널이 도착하면 알려드릴게요', 'New signals will appear here')}
      </p>
    </div>
  );
}

export const NotificationDropdown = memo(function NotificationDropdown() {
  const { isKo, locale, tr } = useBilingualText();
  const {
    notifications,
    loading: isLoading,
    unreadCount,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dateFnsLocale = isKo ? ko : enUS;
  const formattedNotificationCount = notifications.length.toLocaleString(locale);
  const formattedUnreadCount = unreadCount.toLocaleString(locale);

  const handlePointerEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = undefined;
    }
    setDropdownOpen(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setDropdownOpen(true);
    } else {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      setDropdownOpen(false);
      setSearchQuery(''); // 닫을 때 검색어 초기화
    }
  }, []);

  // 검색 필터링
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const query = searchQuery.toLowerCase().trim();
    return notifications.filter(
      (n) =>
        n.symbol.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query)
    );
  }, [notifications, searchQuery]);

  // 날짜별 그룹화
  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  return (
    <div onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      <DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange} modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative transition-colors"
            aria-label={tr('알림', 'Notifications')}
            aria-expanded={dropdownOpen}
            style={{ color: 'hsl(var(--ink-mid))' }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold animate-pulse"
                style={{
                  background: 'hsl(var(--semantic-bear))',
                  color: 'hsl(var(--semantic-bear-foreground))',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="p-0 text-sm overflow-hidden"
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          style={{
            width: '360px',
            zIndex: 'var(--z-dropdown)',
            marginTop: 'var(--dropdown-offset)',
            background: 'hsl(var(--surface-base))',
            // 반드시 단축 속성 하나로 쓴다. borderColor를 먼저 쓰고 border: '1px solid'를
            // 뒤에 두면, 색을 생략한 단축 속성이 border-color를 currentColor로 되돌려
            // 앞의 borderColor가 통째로 날아간다(인라인 스타일이 'border: 1px solid;'만 남음).
            // 그 결과 다크 모드에서 currentColor(거의 흰색)가 테두리로 나왔다.
            border: '1px solid var(--glass-stroke)',
            backdropFilter: 'blur(var(--header-blur))',
          }}
        >
          {/* Header */}
          <div
            className="flex flex-col gap-3 p-4 border-b"
            style={{ borderColor: 'var(--glass-stroke)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--ink-hi))' }}>
                  {tr('알림', 'Notifications')}
                </h3>
                {notifications.length > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: 'hsl(var(--muted))',
                      color: 'hsl(var(--ink-mid))',
                    }}
                  >
                    {isKo ? `${formattedNotificationCount}개` : formattedNotificationCount}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: 'hsl(var(--semantic-bear) / 0.1)',
                      color: 'hsl(var(--semantic-bear))',
                    }}
                  >
                    {isKo
                      ? `${formattedUnreadCount}개 안읽음`
                      : `${formattedUnreadCount} unread`}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="h-7 px-2 text-xs"
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {tr('모두 읽음', 'Mark all read')}
                  </Button>
                )}
              </div>
            </div>

            {/* 검색 */}
            {notifications.length > 3 && (
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: 'hsl(var(--ink-lo))' }}
                />
                <Input
                  type="search"
                  placeholder={tr('심볼 또는 메시지 검색...', 'Search symbol or message...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-8 text-sm"
                  style={{
                    background: 'hsl(var(--muted))',
                    borderColor: 'transparent',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-background min-w-[28px] min-h-[28px] flex items-center justify-center"
                    style={{ color: 'hsl(var(--ink-lo))' }}
                    aria-label={tr('검색어 지우기', 'Clear search')}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <BellOff className="h-12 w-12 mb-3 opacity-30" style={{ color: 'hsl(var(--ink-lo))' }} />
                <p className="text-sm text-center font-medium mb-2" style={{ color: 'hsl(var(--ink-mid))' }}>
                  {error}
                </p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <EmptyState searchQuery={searchQuery} tr={tr} />
            ) : (
              <div className="p-2">
                {groupedNotifications.map((group, groupIdx) => (
                  <div key={group.key} className={groupIdx > 0 ? 'mt-4' : ''}>
                    {/* 그룹 라벨 */}
                    <div
                      className="sticky top-0 z-10 px-2 py-1.5 mb-1"
                      style={{
                        background: 'hsl(var(--surface-base))',
                      }}
                    >
                      <h4
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'hsl(var(--ink-lo))' }}
                      >
                        {getDateGroupLabel(group.key, tr)}
                      </h4>
                    </div>
                    {/* 알림 목록 */}
                    <div className="flex flex-col gap-1">
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onMarkAsRead={markAsRead}
                          onDelete={deleteNotification}
                          onNavigate={() => setDropdownOpen(false)}
                          dateFnsLocale={dateFnsLocale}
                          tr={tr}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="p-3 border-t text-center"
              style={{ borderColor: 'var(--glass-stroke)' }}
            >
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="w-full h-8 text-xs font-medium"
                style={{ color: 'hsl(var(--primary))' }}
              >
                <Link to="/notifications" onClick={() => setDropdownOpen(false)}>
                  {tr('모든 알림 보기', 'View all notifications')} →
                </Link>
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
