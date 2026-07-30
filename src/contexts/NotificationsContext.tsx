import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDeviceToken,
  type Notification,
  type NotificationFilter,
} from '../services/api/notifications';
import { requestFcmToken, onForegroundMessage } from '../services/firebase';
import { getNotificationWebSocket, disconnectNotificationWebSocket } from '../services/websocket/notificationWebSocket';
import { wsApiUrl } from '../config/env';
import { useUserContext } from './UserContext';

const PAGE_SIZE = 100;

type NotificationsContextValue = {
  /** All notifications currently cached, newest first. */
  allItems: Notification[];
  /** Items filtered by the current tab (All / Unread / Read). */
  items: Notification[];
  unreadCount: number;
  total: number;
  loading: boolean;
  /** True only on the very first fetch; subsequent refetches don't flip this. */
  initialLoading: boolean;
  error: string | null;
  filter: NotificationFilter;
  setFilter: (f: NotificationFilter) => void;
  refetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Pre-fetches the user's notifications immediately when they're logged in,
 * polls every 30s while the tab is visible, and exposes a single shared state
 * to the bell + drawer. Also wires the browser Notification API so the user
 * gets an OS-level alert when a new unread arrives.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { userData, isReady } = useUserContext();
  const loggedIn = !!userData;       // stable once authenticated — drives polling
  const enabled = loggedIn && isReady; // also gates permission prompt

  const [allItems, setAllItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');

  // Track previously-seen unread IDs so we only push a desktop notification
  // for ones the user hasn't seen this session.
  const seenUnreadIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);
  const isFetchingRef = useRef(false);
  const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const fireDesktopNotification = useCallback((notification: Notification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const safeTitle = String(notification.title ?? '').slice(0, 200);
      const safeBody = String(notification.body ?? '').slice(0, 500);
      const n = new Notification(safeTitle, {
        body: safeBody,
        tag: notification.id,
        icon: '/images/gs_logo_lynnwood.png',
      });
      // Auto-close after 6s to avoid clutter.
      setTimeout(() => n.close(), 6_000);
    } catch (err) {
      // Some browsers throw if the page isn't focused — ignore.
    }
  }, []);

  const refetch = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNotifications({ filter: 'all', limit: PAGE_SIZE, offset: 0 });
      setAllItems(res.items);
      setTotal(res.total);
      setUnreadCount(res.unread_count);

      // Desktop notification dispatch: any unread we haven't seen before fires
      // a notification. Skip on the very first fetch to avoid spamming for
      // already-existing unread items.
      if (!isFirstFetchRef.current) {
        const newlyArrived = res.items.filter(
          item => !item.is_read && !seenUnreadIdsRef.current.has(item.id)
        );
        // Only fire for the most recent 3 to avoid OS notification spam.
        newlyArrived.slice(0, 3).forEach(fireDesktopNotification);
      }
      // Update the seen-set with whatever's currently unread.
      seenUnreadIdsRef.current = new Set(
        res.items.filter(item => !item.is_read).map(item => item.id)
      );
      isFirstFetchRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, [fireDesktopNotification]);

  // Keep a ref to the latest refetch so the polling effect doesn't re-run
  // every time refetch's identity changes.
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  // Register SW, obtain FCM token, wire foreground listener — fires once on login.
  useEffect(() => {
    if (!enabled) return;

    let unsubscribeForeground: (() => void) | null = null;

    const setup = async () => {
      // 1. Request OS notification permission if not yet decided.
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission().catch(() => {});
        }
      }

      // 2. Register the FCM service worker and obtain the push token.
      //    requestFcmToken() handles SW registration internally and is idempotent.
      const token = await requestFcmToken();
      if (token) {
        try {
          localStorage.setItem('goddard.fcm-token', token);
        } catch (err) {
          console.warn('[FCM] failed to store token in localStorage:', err);
        }
        await registerDeviceToken(token, 'web').catch((err) =>
          console.warn('[FCM] registerDeviceToken failed:', err)
        );
      }

      // 3. Handle messages that arrive while the tab is open (foreground).
      //    Background messages are handled entirely by firebase-messaging-sw.js.
      unsubscribeForeground = await onForegroundMessage(() => {
        // Refetch so the bell count and drawer update immediately.
        void refetchRef.current();
      });
    };

    void setup();

    return () => {
      unsubscribeForeground?.();
    };
  }, [enabled]);

  // WebSocket connection for real-time notifications
  useEffect(() => {
    if (!loggedIn) {
      setAllItems([]);
      setUnreadCount(0);
      setTotal(0);
      setInitialLoading(true);
      isFirstFetchRef.current = true;
      seenUnreadIdsRef.current = new Set();
      disconnectNotificationWebSocket();
      return;
    }

    // Initial fetch on login
    void refetchRef.current();

    // Setup WebSocket connection
    const ws = getNotificationWebSocket(wsApiUrl);
    
    const unsubscribe = ws.subscribe(event => {
      if (event.type === 'notification:new') {
        const notification = event.data;
        setAllItems(prev => [notification, ...prev]);
        setTotal(prev => prev + 1);
        
        if (!notification.is_read) {
          setUnreadCount(prev => prev + 1);
          if (!seenUnreadIdsRef.current.has(notification.id)) {
            seenUnreadIdsRef.current.add(notification.id);
            fireDesktopNotification(notification);
          }
        }
      } else if (event.type === 'notification:updated') {
        const updated = event.data;
        setAllItems(prev =>
          prev.map(item =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
        );
        
        if (updated.is_read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      } else if (event.type === 'sync') {
        // Handle missed notifications on reconnect
        const missedNotifications = event.data;
        setAllItems(prev => {
          const newIds = new Set(missedNotifications.map((n: any) => n.id));
          const existing = prev.filter(n => !newIds.has(n.id));
          return [...missedNotifications, ...existing];
        });
      }
    });

    void ws.connect();

    return () => {
      unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, fireDesktopNotification]);

  const items = useMemo(() => {
    if (filter === 'all') return allItems;
    if (filter === 'unread') return allItems.filter(item => !item.is_read);
    return allItems.filter(item => item.is_read);
  }, [allItems, filter]);

  const markRead = useCallback(async (id: string) => {
    let wasUnread = false;
    setAllItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        if (!item.is_read) {
          wasUnread = true;
          return { ...item, is_read: true, read_at: new Date().toISOString() };
        }
        return item;
      })
    );
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.warn('[notifications] mark read failed', err);
      void refetch();
    }
  }, [refetch]);

  const markAllRead = useCallback(async () => {
    const prevSnapshot = allItems;
    const prevUnread = unreadCount;
    setAllItems(prev =>
      prev.map(item =>
        item.is_read ? item : { ...item, is_read: true, read_at: new Date().toISOString() }
      )
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.warn('[notifications] mark all read failed', err);
      setAllItems(prevSnapshot);
      setUnreadCount(prevUnread);
    }
  }, [allItems, unreadCount]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      allItems,
      items,
      unreadCount,
      total,
      loading,
      initialLoading,
      error,
      filter,
      setFilter,
      refetch,
      markRead,
      markAllRead,
    }),
    [allItems, items, unreadCount, total, loading, initialLoading, error, filter, refetch, markRead, markAllRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  return ctx;
}
