import { useEffect, useId, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBilingualText } from "@/hooks/useBilingualText";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type NotificationKind = "entry" | "exit" | "info";

export interface Notification {
  id: string;
  user_id: string;
  symbol: string;
  kind: NotificationKind;
  message: string;
  bar_interval: string | null;
  trading_category: string | null;
  flow: string | null;
  trend_confidence: number | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

type NotificationSyncReason = "read" | "unread" | "read-all" | "delete" | "delete-all";

type NotificationSyncDetail = {
  userId: string;
  sourceId: string;
  reason: NotificationSyncReason;
};

const NOTIFICATIONS_SYNC_EVENT = "aixsignal:notifications-sync";
export const NOTIFICATIONS_DEFAULT_PAGE_SIZE = 50;
export const NOTIFICATION_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

type NotificationKindCounts = Record<NotificationKind, number>;

type UseNotificationsOptions = {
  page?: number;
  pageSize?: number;
};

const normalizePositiveInteger = (value: number | undefined, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value ?? fallback));
};

const decrement = (value: number) => Math.max(0, value - 1);

type BrowserAlertSettings = {
  enabled: boolean | null;
  signal_alerts: boolean | null;
  event_entry: boolean | null;
  event_exit: boolean | null;
  symbols: string[] | null;
  favorites: string[] | null;
  scope: string | null;
  dnd_enabled: boolean | null;
  dnd_start: string | null;
  dnd_end: string | null;
  dnd_exceptions: string[] | null;
  timezone: string | null;
  notification_types: string[] | null;
};

const normalizeSymbols = (symbols: string[] | null | undefined) =>
  new Set((symbols ?? []).map((symbol) => symbol.trim().toUpperCase()).filter(Boolean));

const parseTimeToMinutes = (value: string | null | undefined) => {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour > 23 || minute > 59) {
    return null;
  }

  return hour * 60 + minute;
};

const getCurrentMinutesInTimezone = (timezone: string) => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const rawHour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    const hour = rawHour === 24 ? 0 : rawHour;

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  } catch {
    return null;
  }
};

const isDndActive = (settings: BrowserAlertSettings) => {
  if (settings.dnd_enabled === false) return false;

  const start = parseTimeToMinutes(settings.dnd_start);
  const end = parseTimeToMinutes(settings.dnd_end);
  if (start === null || end === null || start === end) return false;

  const timezone = settings.timezone?.trim() || "Asia/Seoul";
  const current =
    getCurrentMinutesInTimezone(timezone) ??
    getCurrentMinutesInTimezone("Asia/Seoul");

  if (current === null) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
};

const shouldShowRealtimePopup = (
  notification: Notification,
  settings: BrowserAlertSettings | null
) => {
  if (!settings) return true;
  if (settings.enabled === false) return false;
  if (notification.kind === "info") return true;
  if (settings.signal_alerts === false) return false;
  if (notification.kind === "entry" && settings.event_entry === false) return false;
  if (notification.kind === "exit" && settings.event_exit === false) return false;

  const symbol = notification.symbol.trim().toUpperCase();
  const symbols = normalizeSymbols(settings.symbols);
  const favorites = normalizeSymbols(settings.favorites);
  const scope = settings.scope?.trim().toLowerCase() || "favorites";
  const hasSymbolPrefs = symbols.size > 0 || favorites.size > 0;
  const symbolAllowed =
    symbols.has(symbol) ||
    favorites.has(symbol) ||
    (scope === "all" && !hasSymbolPrefs);

  if (!symbolAllowed) return false;

  const eventKey = notification.kind.toUpperCase();
  const dndExceptions = new Set(
    (settings.dnd_exceptions ?? []).map((item) => item.trim().toUpperCase()).filter(Boolean)
  );

  if (isDndActive(settings) && !dndExceptions.has(eventKey)) {
    return false;
  }

  return true;
};

const WAVE_PULSE_WINDOW_MS = 5 * 60 * 1000;

/**
 * /alerts 4단계에서 고른 알림 종류와 이 알림이 맞는지 확인한다. 'all'이거나 선택이
 * 비어 있으면 전부 통과(기존 동작과 동일). 그 외에는 선택한 종류 중 하나라도
 * 맞으면 통과(OR) — 여러 종류를 동시에 받고 싶어 하는 게 자연스러운 기대치다.
 *
 * "wave/pulse 동시 발생"만 예외적으로 비동기 DB 조회가 필요하다 — 같은 종목의
 * 반대 봉주기(1m<->10m) 알림이 최근 5분 안에도 있었는지 확인해야 하기 때문이다.
 */
const matchesNotificationTypes = async (
  notification: Notification,
  types: string[] | null | undefined,
  userId: string
): Promise<boolean> => {
  const selected = new Set(
    (types ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  if (selected.size === 0 || selected.has("all")) return true;

  if (selected.has("trading_1m") && notification.bar_interval === "1m") return true;
  if (selected.has("trading_10m") && notification.bar_interval === "10m") return true;
  if (selected.has("trend_score_20") && (notification.trend_confidence ?? 0) >= 20) return true;
  if (selected.has("trend_signal") && notification.kind === "info") return true;

  if (selected.has("wave_pulse_same_time")) {
    const otherInterval =
      notification.bar_interval === "1m" ? "10m" :
      notification.bar_interval === "10m" ? "1m" :
      null;

    if (otherInterval) {
      const center = new Date(notification.created_at).getTime();
      const windowStart = new Date(center - WAVE_PULSE_WINDOW_MS).toISOString();
      const windowEnd = new Date(center + WAVE_PULSE_WINDOW_MS).toISOString();

      const { data } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("symbol", notification.symbol)
        .eq("bar_interval", otherInterval)
        .gte("created_at", windowStart)
        .lte("created_at", windowEnd)
        .limit(1)
        .maybeSingle();

      if (data) return true;
    }
  }

  return false;
};

const dispatchNotificationsSync = (detail: NotificationSyncDetail) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<NotificationSyncDetail>(NOTIFICATIONS_SYNC_EVENT, { detail })
  );
};

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tr } = useBilingualText();
  const instanceId = useId();
  const alertSettingsRef = useRef<BrowserAlertSettings | null | undefined>(undefined);
  const page = normalizePositiveInteger(options.page, 1);
  const pageSize = normalizePositiveInteger(options.pageSize, NOTIFICATIONS_DEFAULT_PAGE_SIZE);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [kindCounts, setKindCounts] = useState<NotificationKindCounts>({
    entry: 0,
    exit: 0,
    info: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // 응답이 도착한 시점에 "요청을 보낼 때의 user"가 여전히 최신인지 확인하기 위한
  // 참조값 — 다른 계정으로 전환된 뒤 이전 계정으로 보낸 요청이 뒤늦게 도착해
  // 새 계정의 데이터를 덮어쓰는 경쟁 상태를 막는다. useEffect가 아니라 렌더
  // 중에 직접 갱신해 effect 타이밍 지연 없이 항상 최신 user.id를 반영한다.
  const currentUserIdRef = useRef<string | null>(user?.id ?? null);
  currentUserIdRef.current = user?.id ?? null;

  useEffect(() => {
    if (!user) {
      // 계정이 바뀔 때 이전 계정의 알림 목록이 화면에 남아있지 않도록 전부
      // 초기화한다 — 예전에는 unreadCount만 지우고 나머지(notifications 등)는
      // 그대로 남겨두었다.
      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
      setKindCounts({ entry: 0, exit: 0, info: 0 });
      setError(null);
    }
  }, [user]);

  // 알림 로드
  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
      setKindCounts({ entry: 0, exit: 0, info: 0 });
      setLoading(false);
      setError(null);
      return;
    }

    // 이 요청이 응답받을 때도 여전히 최신 계정인지 나중에 비교하기 위해 지금
    // 시점의 user.id를 고정해 둔다.
    const requestedUserId = user.id;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    setLoading(true);

    // 타임아웃 설정 (10초)
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError(tr("알림을 불러오는 데 시간이 너무 오래 걸립니다.", "Notifications are taking too long to load."));
    }, 10000);

    try {
      const [pageResult, unreadResult, entryResult, exitResult, infoResult] = await Promise.all([
        supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "entry"),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "exit"),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("kind", "info"),
      ]);

      clearTimeout(timeoutId);

      if (currentUserIdRef.current !== requestedUserId) {
        // 응답이 도착한 사이 다른 계정으로 전환됨 — 화면에는 이미 새 계정의
        // 상태가 반영돼 있으므로 이 오래된 응답으로 덮어쓰지 않는다.
        return;
      }

      const queryError =
        pageResult.error ??
        unreadResult.error ??
        entryResult.error ??
        exitResult.error ??
        infoResult.error;
      if (queryError) throw queryError;

      const typedData = (pageResult.data || []).map(item => ({
        ...item,
        kind: item.kind as NotificationKind
      }));

      setNotifications(typedData);
      setTotalCount(pageResult.count ?? 0);
      setUnreadCount(unreadResult.count ?? 0);
      setKindCounts({
        entry: entryResult.count ?? 0,
        exit: exitResult.count ?? 0,
        info: infoResult.count ?? 0,
      });
      setError(null);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Failed to load notifications:", error);
      if (currentUserIdRef.current !== requestedUserId) {
        // 이미 다른 계정으로 전환된 뒤 도착한 오류 — 새 계정의 상태를 지우지 않는다.
        return;
      }
      setError(tr("알림을 불러올 수 없습니다.", "Notifications could not be loaded."));
      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
      setKindCounts({ entry: 0, exit: 0, info: 0 });
    } finally {
      setLoading(false);
    }
   
  }, [user, page, pageSize, tr]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<NotificationSyncDetail>).detail;
      if (!detail || detail.userId !== user.id || detail.sourceId === instanceId) return;

      void loadNotifications();
    };

    window.addEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(NOTIFICATIONS_SYNC_EVENT, handleSync);
  }, [user, instanceId, loadNotifications]);

  // Realtime popup preferences
  const loadRealtimeAlertSettings = useCallback(async () => {
    if (!user) {
      alertSettingsRef.current = null;
      return null;
    }

    const { data, error: settingsError } = await supabase
      .from("user_alert_settings")
      .select(
        "enabled, signal_alerts, event_entry, event_exit, symbols, favorites, scope, dnd_enabled, dnd_start, dnd_end, dnd_exceptions, timezone, notification_types"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.warn("Failed to load realtime alert settings:", settingsError);
      alertSettingsRef.current = undefined;
      return undefined;
    }

    alertSettingsRef.current = (data ?? null) as BrowserAlertSettings | null;
    return alertSettingsRef.current;
  }, [user]);

  const shouldSurfaceRealtimeNotification = useCallback(
    async (notification: Notification) => {
      let settings = alertSettingsRef.current;
      if (settings === undefined) {
        settings = await loadRealtimeAlertSettings();
      }

      if (settings === undefined) return false;
      if (!shouldShowRealtimePopup(notification, settings)) return false;
      if (!user) return true;
      return matchesNotificationTypes(notification, settings?.notification_types, user.id);
    },
    [loadRealtimeAlertSettings, user]
  );

  // 읽음 처리
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      const current = notifications.find((notification) => notification.id === notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      if (current && !current.is_read) {
        setUnreadCount(decrement);
      }
      dispatchNotificationsSync({
        userId: user.id,
        sourceId: instanceId,
        reason: "read",
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, [user, instanceId, notifications]);

  const markAsUnread = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: false })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      const current = notifications.find((notification) => notification.id === notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
      );
      if (current?.is_read) {
        setUnreadCount((count) => count + 1);
      }
      dispatchNotificationsSync({
        userId: user.id,
        sourceId: instanceId,
        reason: "unread",
      });
    } catch (error) {
      console.error("Failed to mark notification as unread:", error);
    }
  }, [user, instanceId, notifications]);

  const toggleReadStatus = useCallback(async (notificationId: string, isRead: boolean) => {
    if (isRead) {
      await markAsUnread(notificationId);
      return;
    }

    await markAsRead(notificationId);
  }, [markAsRead, markAsUnread]);

  // 일괄 읽음 처리
  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      dispatchNotificationsSync({
        userId: user.id,
        sourceId: instanceId,
        reason: "read-all",
      });

      toast({
        title: tr("모든 알림을 읽음 처리했습니다", "All notifications marked as read"),
      });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast({
        title: tr("읽음 처리 실패", "Could not mark notifications as read"),
        variant: "destructive",
      });
    }
  }, [user, instanceId, toast, tr]);

  // 알림 삭제
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return;

    try {
      const current = notifications.find((notification) => notification.id === notificationId);
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setTotalCount(decrement);
      if (current && !current.is_read) {
        setUnreadCount(decrement);
      }
      if (current) {
        setKindCounts((counts) => ({
          ...counts,
          [current.kind]: decrement(counts[current.kind]),
        }));
      }
      dispatchNotificationsSync({
        userId: user.id,
        sourceId: instanceId,
        reason: "delete",
      });

      toast({
        title: tr("알림이 삭제되었습니다", "Notification deleted"),
      });
      void loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast({
        title: tr("삭제 실패", "Delete failed"),
        variant: "destructive",
      });
    }
  }, [user, instanceId, toast, notifications, loadNotifications, tr]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setNotifications([]);
      setTotalCount(0);
      setUnreadCount(0);
      setKindCounts({ entry: 0, exit: 0, info: 0 });
      dispatchNotificationsSync({
        userId: user.id,
        sourceId: instanceId,
        reason: "delete-all",
      });

      toast({
        title: tr("모든 알림이 삭제되었습니다", "All notifications deleted"),
      });
      return true;
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      toast({
        title: tr("전체 삭제 실패", "Could not delete all notifications"),
        variant: "destructive",
      });
      return false;
    }
  }, [user, instanceId, toast, tr]);

  // 브라우저 알림 표시
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const kindLabel =
        notification.kind === "entry" ? tr("진입", "Entry") :
        notification.kind === "exit" ? tr("청산", "Exit") : tr("알림", "Notification");
      
      new Notification(
        tr(`${notification.symbol} ${kindLabel} 시그널`, `${notification.symbol} ${kindLabel} signal`),
        {
          body: notification.message,
          icon: "/favicon.ico",
          tag: notification.id,
        }
      );
    }
  }, [tr]);

  // 실시간 구독 설정
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadNotifications();
    void loadRealtimeAlertSettings();

    // Realtime 구독
    const channel = supabase
      .channel(`notifications-changes:${user.id}:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const newNotification = payload.new as Notification;
          
          console.warn("New notification received:", newNotification);
          
          setTotalCount((count) => count + 1);
          if (!newNotification.is_read) {
            setUnreadCount((count) => count + 1);
          }
          setKindCounts((counts) => ({
            ...counts,
            [newNotification.kind]: (counts[newNotification.kind] ?? 0) + 1,
          }));
          if (page === 1) {
            setNotifications((prev) => [newNotification, ...prev].slice(0, pageSize));
          } else {
            void loadNotifications();
          }

          // 브라우저 알림 표시
          void (async () => {
            const shouldSurface = await shouldSurfaceRealtimeNotification(newNotification);
            if (!shouldSurface) return;

            showBrowserNotification(newNotification);

            // Toast 알림 표시 - 시그널 종류에 따른 스타일링
            const kindLabel =
              newNotification.kind === 'entry' ? tr('🟢 진입', '🟢 Entry') :
              newNotification.kind === 'exit' ? tr('🔴 청산', '🔴 Exit') : tr('알림', 'Notification');

            toast({
              title: `${kindLabel} | ${newNotification.symbol}`,
              description: newNotification.message,
              variant: 'signal' as const,
              duration: 8000,
            });
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const updatedNotification = payload.new as Notification;
          
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Notification>) => {
          const deletedNotification = payload.old as Partial<Notification>;
          
          if (deletedNotification.id) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedNotification.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_alert_settings",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadRealtimeAlertSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    user,
    instanceId,
    loadNotifications,
    loadRealtimeAlertSettings,
    shouldSurfaceRealtimeNotification,
    showBrowserNotification,
    toast,
    page,
    pageSize,
  ]);

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    loading,
    totalCount,
    unreadCount,
    kindCounts,
    error,
    markAsRead,
    markAsUnread,
    toggleReadStatus,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refresh: loadNotifications,
  };
};
