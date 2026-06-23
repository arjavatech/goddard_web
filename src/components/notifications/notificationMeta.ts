import {
  Baby,
  Bell,
  Building2,
  CheckCircle2,
  Clock,
  FilePlus,
  FileText,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

export type NotificationMeta = {
  icon: LucideIcon;
  /** Tailwind classes for the icon container — bg + text */
  accentClass: string;
};

/**
 * Single source of truth for the visual styling of each notification_type.
 * Backend stores only the discriminator string; FE maps to icon + color.
 * Order roughly matches docs/IN_APP_NOTIFICATIONS.md.
 */
export const NOTIFICATION_META: Record<string, NotificationMeta> = {
  form_approved:        { icon: CheckCircle2, accentClass: 'bg-green-100 text-green-600' },
  form_rejected:        { icon: XCircle,      accentClass: 'bg-red-100 text-red-600' },
  form_assigned:        { icon: FilePlus,     accentClass: 'bg-blue-100 text-blue-600' },
  form_submitted:       { icon: Clock,        accentClass: 'bg-amber-100 text-amber-600' },
  child_added:          { icon: UserPlus,     accentClass: 'bg-blue-100 text-blue-600' },
  child_archived:       { icon: Baby,         accentClass: 'bg-slate-100 text-slate-600' },
  parent_invited:       { icon: Users,        accentClass: 'bg-green-100 text-green-600' },
  parent_deactivated:   { icon: UserMinus,    accentClass: 'bg-red-100 text-red-600' },
  admin_added:          { icon: UserPlus,     accentClass: 'bg-violet-100 text-violet-600' },
  admin_deactivated:    { icon: UserMinus,    accentClass: 'bg-red-100 text-red-600' },
  classroom_added:      { icon: Building2,    accentClass: 'bg-purple-100 text-purple-600' },
  classroom_deleted:    { icon: Trash2,       accentClass: 'bg-slate-100 text-slate-600' },
  form_template_added:  { icon: FileText,     accentClass: 'bg-blue-100 text-blue-600' },
  form_template_deleted:{ icon: Trash2,       accentClass: 'bg-slate-100 text-slate-600' },
};

const FALLBACK: NotificationMeta = {
  icon: Bell,
  accentClass: 'bg-slate-100 text-slate-600',
};

export function getNotificationMeta(type: string): NotificationMeta {
  return NOTIFICATION_META[type] ?? FALLBACK;
}

/** Time-group key used to render the "Today" / "Yesterday" / "Earlier" section headers. */
export type TimeGroup = 'Today' | 'Yesterday' | 'Earlier';

export function groupForDate(date: Date, now = new Date()): TimeGroup {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now).getTime();
  const yesterday = today - 24 * 60 * 60 * 1000;
  const t = startOfDay(date).getTime();
  if (t === today) return 'Today';
  if (t === yesterday) return 'Yesterday';
  return 'Earlier';
}

/** Format a notification's created_at for display in the right column of the row. */
export function formatNotificationTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const group = groupForDate(d, now);
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (group === 'Today') return timeStr;
  if (group === 'Yesterday') return `Yesterday, ${timeStr}`;
  // "Earlier" — show month + day; include year only if it's a different year.
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
