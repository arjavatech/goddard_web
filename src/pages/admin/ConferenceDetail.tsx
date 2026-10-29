import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays, ArrowLeft, Bell, Users, Clock, CheckCircle2,
  MailOpen, AlertCircle, BookOpen, BarChart2,
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import {
  getConferenceReport, sendConferenceReminders, sendConferenceReminderToParent,
  type ConferenceReportResponse, type ClassroomReport, type SlotReport,
} from '../../services/api/conferences';

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// ── Slot row (table format) ───────────────────────────────────────────────────

function SlotRow({ slot }: { slot: SlotReport }) {
  const full = slot.booked_count >= slot.capacity;
  const hasBookings = slot.bookings.length > 0;

  return (
    <div className="grid grid-cols-[150px_90px_1fr] items-start px-4 py-3 border-b border-slate-100 last:border-0 gap-3">
      <span className="text-sm font-medium text-slate-900 pt-0.5">
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </span>
      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium w-fit',
        full ? 'bg-green-50 text-green-700' : hasBookings ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
        {full ? 'Full' : hasBookings ? 'Partial' : 'Empty'}
      </span>
      <div className="space-y-0.5">
        {slot.bookings.length === 0 ? (
          <span className="text-sm text-slate-400">—</span>
        ) : slot.bookings.map(b => (
          <div key={b.booking_id} className="flex items-center gap-1.5 text-sm">
            <span className="font-medium text-slate-800">{b.parent_name}</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500 text-xs">{b.child_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Classroom card ────────────────────────────────────────────────────────────

interface ClassroomCardProps {
  cr: ClassroomReport;
  conferenceId: string;
  remindingParent: string | null;
  onRemindParent: (conferenceId: string, parentEmail: string) => void;
}

function ClassroomCard({ cr, conferenceId, remindingParent, onRemindParent }: ClassroomCardProps) {
  const bookedTotal = cr.slots.reduce((acc, s) => acc + s.booked_count, 0);
  const capacityTotal = cr.slots.reduce((acc, s) => acc + s.capacity, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0F2D52]/10 flex items-center justify-center">
            <Users className="h-4.5 w-4.5 text-[#0F2D52]" style={{ height: '1.125rem', width: '1.125rem' }} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{cr.classroom_name}</h3>
            <p className="text-xs text-slate-500">{cr.student_count} student{cr.student_count !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2.5 py-1 rounded-full">
            {bookedTotal}/{capacityTotal} booked
          </span>
          {cr.unbooked_count > 0 && (
            <span className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {cr.unbooked_count} unbooked
            </span>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Time Slots</p>
        {cr.slots.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No slots defined</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[150px_90px_1fr] px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-400 uppercase tracking-wide gap-3">
              <span>Time</span>
              <span>Status</span>
              <span>Booked By</span>
            </div>
            {cr.slots.map(slot => <SlotRow key={slot.slot_id} slot={slot} />)}
          </div>
        )}

        {cr.unbooked_parents.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              <span className="text-red-600">{cr.unbooked_parents.length} parent{cr.unbooked_parents.length !== 1 ? 's' : ''}</span> haven't booked
            </p>
            <div className="space-y-1">
              {cr.unbooked_parents.map(p => (
                <div key={p.parent_id + p.child_id}
                  className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                    {p.parent_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 font-medium truncate">{p.parent_name}</p>
                    <p className="text-xs text-slate-400 truncate">{p.parent_email}</p>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 mr-2">{p.child_name}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={remindingParent === p.parent_email}
                    onClick={() => onRemindParent(conferenceId, p.parent_email)}
                    className="flex-shrink-0 gap-1.5 text-xs h-7">
                    <Bell className="h-3 w-3" />
                    {remindingParent === p.parent_email ? 'Sending...' : 'Remind'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminConferenceDetail() {
  const { schoolSlug, id } = useParams<{ schoolSlug: string; id: string }>();
  const navigate = useNavigate();
  const { userData, schoolSubdomain } = useUserContext();
  const { showToast } = useToast();
  const schoolPrefix = `/${schoolSlug || schoolSubdomain || userData?.schoolId || 'goddard'}`;

  const [report, setReport] = useState<ConferenceReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [remindingParent, setRemindingParent] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setReport(await getConferenceReport(id)); } catch { } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRemind() {
    if (!id) return;
    setReminding(true);
    try {
      const res = await sendConferenceReminders(id);
      showToast('success', `Reminder sent to ${res.reminders_sent} parent${res.reminders_sent !== 1 ? 's' : ''}`, 'Reminders Sent');
    } catch {
      showToast('error', 'Failed to send reminders', 'Error');
    } finally {
      setReminding(false);
    }
  }

  async function handleRemindParent(conferenceId: string, parentEmail: string) {
    setRemindingParent(parentEmail);
    try {
      const res = await sendConferenceReminderToParent(conferenceId, parentEmail);
      if (res.reminders_sent === 0) {
        showToast('warning', `${parentEmail} has already booked a slot`);
      } else {
        showToast('success', `Reminder sent to ${parentEmail}`, 'Reminder Sent');
      }
    } catch {
      showToast('error', 'Failed to send reminder', 'Error');
    } finally {
      setRemindingParent(null);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F2D52]" />
        </div>
      </AdminLayout>
    );
  }

  if (!report) {
    return (
      <AdminLayout>
        <div className="text-center py-24">
          <p className="text-slate-500">Conference not found.</p>
          <button onClick={() => navigate(`${schoolPrefix}/admin/conferences`)} className="mt-3 text-[#0F2D52] text-sm hover:underline">Back to Conferences</button>
        </div>
      </AdminLayout>
    );
  }

  const { conference, report: classrooms } = report;
  const totalBooked = classrooms.reduce((acc, cr) => acc + cr.slots.reduce((a, s) => a + s.booked_count, 0), 0);
  const totalUnbooked = classrooms.reduce((acc, cr) => acc + cr.unbooked_count, 0);
  const targetedParents = totalBooked + totalUnbooked;
  const bookingRate = targetedParents > 0 ? Math.round((totalBooked / targetedParents) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">
        {/* Back + Header */}
        <div>
          <button onClick={() => navigate(`${schoolPrefix}/admin/conferences`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Conferences
          </button>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4]" />
            <div className="p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                {conference.image_url ? (
                  <img src={conference.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1a6fc4] flex-shrink-0" />
                )}
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{conference.title}</h1>
                  <p className="text-sm text-slate-500 mt-0.5 max-w-lg">{conference.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-slate-400" />{formatDate(conference.conference_date)}</span>
                    {conference.booking_close_at && (
                      <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" />Deadline: {new Date(conference.booking_close_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full',
                  conference.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                  {conference.status === 'active' ? 'Active' : 'Expired'}
                </span>
                <Button
                  disabled={reminding}
                  onClick={handleRemind}
                  className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                  <Bell className="h-4 w-4" />
                  {reminding ? 'Sending...' : 'Send Reminder'}
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'TARGETED PARENTS', value: targetedParents, icon: <Users className="h-5 w-5 text-violet-500" />, color: 'bg-violet-50' },
            { label: 'CLASSROOMS', value: classrooms.length, icon: <BookOpen className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50' },
            { label: 'BOOKED', value: totalBooked, icon: <CheckCircle2 className="h-5 w-5 text-green-500" />, color: 'bg-green-50' },
            { label: 'PENDING', value: totalUnbooked, icon: <MailOpen className="h-5 w-5 text-orange-500" />, color: 'bg-orange-50' },
            { label: 'BOOKING RATE', value: `${bookingRate}%`, icon: <BarChart2 className="h-5 w-5 text-teal-500" />, color: 'bg-teal-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s.color)}>{s.icon}</div>
              <div>
                <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Classroom reports */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">Classroom Reports</h2>
          {classrooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <p className="text-slate-400">No classroom data available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {classrooms.map(cr => (
                <ClassroomCard
                  key={cr.classroom_id}
                  cr={cr}
                  conferenceId={id!}
                  remindingParent={remindingParent}
                  onRemindParent={handleRemindParent}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
