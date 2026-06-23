import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../services/api/notifications';
import { formatNotificationTime, getNotificationMeta } from './notificationMeta';

type Props = {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
};

export function NotificationItem({ notification, onMarkRead, onClose }: Props) {
  const navigate = useNavigate();
  const meta = getNotificationMeta(notification.notification_type);
  const Icon = meta.icon;

  const handleClick = () => {
    if (!notification.is_read) onMarkRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.accentClass}`}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm font-semibold text-slate-900">{notification.title}</p>
          <span className="shrink-0 text-xs text-slate-500">
            {formatNotificationTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.body}</p>
      </div>

      <div className="ml-1 flex h-10 shrink-0 items-center">
        {!notification.is_read ? (
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" aria-label="Unread" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" aria-hidden />
        )}
      </div>
    </button>
  );
}
