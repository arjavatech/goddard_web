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
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
            <div>
              <DialogPrimitive.Title className="text-base font-extrabold text-slate-900 tracking-tight">
                Notifications
              </DialogPrimitive.Title>
              {unreadCount > 0 && (
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{unreadCount} unread</p>
              )}
            </div>
            <DialogPrimitive.Close
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Tabs + Mark all as read */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 bg-slate-50/50">
            <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              {TABS.map(tab => {
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilter(tab.key)}
                    className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                      active
                        ? 'bg-white text-[#0F2D52] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                  >
                    {tab.label}
                    {tab.key === 'unread' && unreadCount > 0 && (
                      <span className="ml-1 text-[10px] font-extrabold">({unreadCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="text-[11px] font-bold text-[#0F2D52] hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline transition-colors"
            >
              Mark all read
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
                      <div className="px-5 pt-4 pb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
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
    <div className="space-y-1 px-5 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 py-3">
          <div className="h-9 w-9 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 w-3/4 rounded-full bg-slate-100" />
            <div className="h-2.5 w-1/2 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#EFF5FB] flex items-center justify-center mb-4">
        <span className="text-xl">🔔</span>
      </div>
      <p className="text-sm font-extrabold text-slate-800">{title}</p>
      <p className="mt-1.5 text-xs font-semibold text-slate-400 max-w-[220px] leading-relaxed">{body}</p>
    </div>
  );
}
