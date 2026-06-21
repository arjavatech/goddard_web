import { useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import type { NotificationFilter } from '../../services/api/notifications';
import { groupForDate } from './notificationMeta';
import { NotificationItem } from './NotificationItem';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TABS: { key: NotificationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export function NotificationDrawer({ open, onOpenChange }: Props) {
  const {
    items,
    unreadCount,
    initialLoading,
    error,
    filter,
    setFilter,
    markRead,
    markAllRead,
  } = useNotificationsContext();

  // Group items by Today / Yesterday / Earlier
  const grouped = useMemo(() => {
    const buckets: { Today: typeof items; Yesterday: typeof items; Earlier: typeof items } = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    const now = new Date();
    items.forEach(item => {
      const g = groupForDate(new Date(item.created_at), now);
      buckets[g].push(item);
    });
    return buckets;
  }, [items]);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    await markAllRead();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <DialogPrimitive.Title className="text-base font-semibold text-slate-900">
              Notifications
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Tabs + Mark all as read */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2">
            <div className="flex gap-1">
              {TABS.map(tab => {
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1.5 text-xs">({unreadCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-sm font-medium text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
            >
              Mark all as read
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {initialLoading && items.length === 0 ? (
              <SkeletonList />
            ) : error && items.length === 0 ? (
              <EmptyState title="Couldn't load notifications" body={error} />
            ) : items.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                body="New notifications will appear here when there's activity on your account."
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {(['Today', 'Yesterday', 'Earlier'] as const).map(section => {
                  const sectionItems = grouped[section];
                  if (sectionItems.length === 0) return null;
                  return (
                    <div key={section}>
                      <div className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {section}
                      </div>
                      {sectionItems.map(item => (
                        <NotificationItem
                          key={item.id}
                          notification={item}
                          onMarkRead={markRead}
                          onClose={() => onOpenChange(false)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 py-2">
          <div className="h-10 w-10 rounded-lg bg-slate-200" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}
