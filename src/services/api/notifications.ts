import { authedFetch, z } from './common';

// ---- Schemas (mirror lambda/goddard/src/models/notification.rs) ----

export const NotificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  school_id: z.string(),
  notification_type: z.string(),
  title: z.string(),
  body: z.string(),
  related_entity_id: z.string().nullable(),
  related_entity_type: z.string().nullable(),
  action_url: z.string().nullable(),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationListResponseSchema = z.object({
  items: z.array(NotificationSchema),
  total: z.number(),
  unread_count: z.number(),
});

export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

const UnreadCountResponseSchema = z.object({ count: z.number() });
const MarkAllReadResponseSchema = z.object({ updated: z.number() });

export type NotificationFilter = 'all' | 'unread' | 'read';

export type FetchNotificationsParams = {
  filter?: NotificationFilter;
  limit?: number;
  offset?: number;
};

export async function fetchNotifications(
  params: FetchNotificationsParams = {}
): Promise<NotificationListResponse> {
  const search = new URLSearchParams();
  if (params.filter) search.set('filter', params.filter);
  if (typeof params.limit === 'number') search.set('limit', String(params.limit));
  if (typeof params.offset === 'number') search.set('offset', String(params.offset));
  const qs = search.toString();
  const url = qs ? `/notifications?${qs}` : '/notifications';
  return authedFetch({ method: 'GET', url }, NotificationListResponseSchema);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await authedFetch(
    { method: 'GET', url: '/notifications/unread-count' },
    UnreadCountResponseSchema
  );
  return res.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  // 204 No Content — use raw fetch since authedFetch expects JSON.
  await authedFetch(
    { method: 'PATCH', url: `/notifications/${id}/read` },
    z.unknown()
  );
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await authedFetch(
    { method: 'PATCH', url: '/notifications/mark-all-read' },
    MarkAllReadResponseSchema
  );
  return res.updated;
}
