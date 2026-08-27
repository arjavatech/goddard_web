import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDeviceToken,
  fetchDeviceTokenStatus,
  type Notification,
  type NotificationFilter,
} from '../services/api/notifications';
import { requestFcmToken, onForegroundMessage } from '../services/firebase';
import { useUserContext } from './UserContext';
import { useToast } from './ToastContext';

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
  pushPermission: NotificationPermission | 'unsupported';
  pushRegistration: 'unknown' | 'registered' | 'not_registered' | 'failed';
  pushError: string | null;
  enablePush: () => Promise<boolean>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * Pre-fetches the user's notifications immediately when they're logged in.
 * FCM is the only real-time transport; it is enabled explicitly from Profile
 * settings and refreshes the in-app state when a message arrives.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { userData, isReady } = useUserContext();
  const loggedIn = !!userData;       // stable once authenticated — drives polling
  const enabled = loggedIn && isReady;

  const [allItems, setAllItems] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [pushRegistration, setPushRegistration] = useState<'unknown' | 'registered' | 'not_registered' | 'failed'>('unknown');
  const [pushError, setPushError] = useState<string | null>(null);
  const { showToast } = useToast();

  const isFirstFetchRef = useRef(true);
  const isFetchingRef = useRef(false);
  const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());

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

      isFirstFetchRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setInitialLoading(false);
    }
  }, []);

  // Keep a ref to the latest refetch so the polling effect doesn't re-run
  // every time refetch's identity changes.
  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  const enablePush = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPushPermission('unsupported');
      setPushRegistration('failed');
      setPushError('This browser does not support web notifications.');
      return false;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== 'granted') {
      setPushRegistration('not_registered');
      setPushError(permission === 'denied' ? 'Notifications are blocked in browser settings.' : null);
      return false;
    }
    const token = await requestFcmToken();
    if (!token) {
      setPushRegistration('failed');
      setPushError('Unable to create a browser notification token.');
      return false;
    }
    try {
      localStorage.setItem('goddard.fcm-token', token);
      await registerDeviceToken(token, 'web');
      const status = await fetchDeviceTokenStatus();
      setPushRegistration(status.web_devices > 0 ? 'registered' : 'not_registered');
      setPushError(null);
      return status.web_devices > 0;
    } catch (error) {
      setPushRegistration('failed');
      setPushError(error instanceof Error ? error.message : 'Unable to save this browser for notifications.');
      return false;
    }
  }, []);

  // FCM foreground events refresh the bell. The service worker owns all
  // background browser notification rendering.
  useEffect(() => {
    if (!enabled) return;

    let unsubscribeForeground: (() => void) | null = null;

    const setup = async () => {
      // Refresh an already-authorized browser token without prompting.
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const token = await requestFcmToken();
        if (token) {
          try {
            localStorage.setItem('goddard.fcm-token', token);
            await registerDeviceToken(token, 'web');
            const status = await fetchDeviceTokenStatus();
            setPushRegistration(status.web_devices > 0 ? 'registered' : 'not_registered');
            setPushError(null);
          } catch (error) {
            setPushRegistration('failed');
            setPushError(error instanceof Error ? error.message : 'Unable to register this browser for notifications.');
            console.warn('[notifications] FCM token registration failed', error);
          }
        } else {
          setPushRegistration('failed');
          setPushError('Unable to create a browser notification token.');
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        setPushRegistration('not_registered');
      }
      unsubscribeForeground = await onForegroundMessage((payload) => {
        const data = payload.data ?? {};
        const title = data.title || 'New notification';
        const body = data.body || 'You have a new notification.';

        // FCM can deliver through the page listener even when the browser tab
        // is inactive. An in-app toast would not be visible in that state, so
        // use the active service worker to show the same native notification.
        if (document.visibilityState !== 'visible' && 'serviceWorker' in navigator) {
          void navigator.serviceWorker.ready.then((registration) =>
            registration.showNotification(title, {
              body,
              tag: data.notification_id,
              icon: '/images/gs_logo_lynnwood.png',
              badge: '/images/gs_logo_lynnwood.png',
              data: { url: data.action_url || '/admin/notifications' },
            })
          );
        } else {
          // Foreground notifications stay visible long enough to read, while
          // retaining the normal manual close control.
          showToast('info', body, title, 9000);
        }
        void refetchRef.current();
      });
    };

    void setup();

    return () => {
      unsubscribeForeground?.();
    };
  }, [enabled, showToast]);

  // REST provides the initial in-app state. Subsequent real-time refreshes
  // come from FCM foreground messages, not a timer or focus listener.
  useEffect(() => {
    if (!loggedIn) {
      setAllItems([]);
      setUnreadCount(0);
      setTotal(0);
      setInitialLoading(true);
      isFirstFetchRef.current = true;
      return;
    }

    // Initial fetch on login
    void refetchRef.current();

    return undefined;
  }, [loggedIn]);

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
      pushPermission,
      pushRegistration,
      pushError,
      enablePush,
    }),
    [allItems, items, unreadCount, total, loading, initialLoading, error, filter, refetch, markRead, markAllRead, pushPermission, pushRegistration, pushError, enablePush]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsContext must be used within a NotificationsProvider');
  return ctx;
}
