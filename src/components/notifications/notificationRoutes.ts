import type { Notification } from '../../services/api/notifications';

/**
 * Converts legacy notification actions into the school's route namespace.
 * New rows are already generated as `/{schoolSlug}/…` by the API, but this
 * compatibility layer keeps older database rows from navigating to stale
 * global routes such as `/admin/notifications`.
 */
export function resolveNotificationAction(
  notification: Notification,
  schoolSlug: string,
): string | null {
  const raw = notification.action_url?.trim();
  const fallback = fallbackPath(notification.notification_type);
  const path = raw || fallback;
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) return path;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const prefix = `/${schoolSlug}/`;
  if (normalized === `/${schoolSlug}` || normalized.startsWith(prefix)) return normalized;

  // Old deployments used this invalid global target as a generic fallback.
  if (normalized === '/admin/notifications') return `/${schoolSlug}/dashboard`;

  return `/${schoolSlug}${normalized}`;
}

function fallbackPath(notificationType: string): string | null {
  switch (notificationType) {
    case 'form_submitted':
      return '/admin/forms/review';
    case 'document_submitted':
      return '/admin/documents/review';
    case 'form_assigned':
    case 'form_approved':
    case 'form_rejected':
    case 'child_added':
    case 'child_archived':
      return '/dashboard';
    case 'document_requested':
    case 'document_approved':
    case 'document_rejected':
      return '/dashboard/documents';
    case 'classroom_added':
    case 'classroom_deleted':
      return '/admin/classrooms';
    case 'admin_added':
    case 'admin_deactivated':
      return '/admin/admin-management';
    case 'form_template_added':
    case 'form_template_deleted':
      return '/admin/forms';
    default:
      return null;
  }
}
