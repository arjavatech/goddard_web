import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationsContext } from '../../contexts/NotificationsContext';
import { NotificationDrawer } from './NotificationDrawer';

type Props = {
  /**
   * Kept for backward compatibility with the existing call sites. The provider
   * already gates polling on login state, so this prop is now informational only.
   */
  enabled?: boolean;
};

export function NotificationBell({ enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotificationsContext();

  if (!enabled) return null;

  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <NotificationDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}
