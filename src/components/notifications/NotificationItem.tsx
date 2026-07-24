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
      className={`flex w-full items-start gap-3 px-5 py-3.5 text-left transition-all hover:bg-[#EFF5FB] focus:bg-[#EFF5FB] focus:outline-none ${
        !notification.is_read ? 'bg-blue-50/40' : 'bg-white'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.accentClass}`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={`flex-1 text-xs leading-snug truncate ${
            !notification.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
          }`}>{notification.title}</p>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">
            {formatNotificationTime(notification.created_at)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 font-medium">{notification.body}</p>
      </div>

      <div className="ml-1 flex h-9 shrink-0 items-center">
        {!notification.is_read ? (
          <span className="h-2 w-2 rounded-full bg-[#0F2D52]" aria-label="Unread" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-slate-200" aria-hidden />
        )}
      </div>
    </button>
  );
}
