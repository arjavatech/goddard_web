import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays, Clock, Users, CheckCircle2, X, ChevronRight,
  AlertCircle, Ticket, RefreshCw, Search, LayoutGrid, List,
} from 'lucide-react';
import { ParentLayout } from './ParentLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { SortDropdown, sortItems } from '../../components/ui/sort-dropdown';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import {
  listMyConferences, listMyBookings, getConferenceSlots,
  bookSlot, updateBooking, cancelBooking,
  type ConferenceListItem, type BookingListItem, type SlotDetail,
} from '../../services/api/conferences';
import { fetchSingleParent } from '../../services/api/admin';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONF_SORT_OPTIONS = [
  { label: 'Title A–Z', sortBy: 'title', sortOrder: 'asc' as const },
  { label: 'Title Z–A', sortBy: 'title', sortOrder: 'desc' as const },
  { label: 'Date Soonest', sortBy: 'date', sortOrder: 'asc' as const },
  { label: 'Date Latest', sortBy: 'date', sortOrder: 'desc' as const },
  { label: 'Most Slots Available', sortBy: 'slots', sortOrder: 'desc' as const },
  { label: 'Fewest Slots Available', sortBy: 'slots', sortOrder: 'asc' as const },
];

const BOOKING_SORT_OPTIONS = [
  { label: 'Title A–Z', sortBy: 'title', sortOrder: 'asc' as const },
  { label: 'Title Z–A', sortBy: 'title', sortOrder: 'desc' as const },
  { label: 'Date Soonest', sortBy: 'date', sortOrder: 'asc' as const },
  { label: 'Date Latest', sortBy: 'date', sortOrder: 'desc' as const },
];

const SORT_LABELS: Record<string, string> = { title: 'Title', date: 'Date', slots: 'Slots' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export interface ChildOption { id: string; name: string; classroomId?: string; }

// ── Slot grid for a classroom ────────────────────────────────────────────────

export interface SlotGridProps {
  conferenceId: string;
  classroomId: string;
  classroomName: string;
  childId: string;
  existingBookingId?: string;
  schoolId: string;
  onBooked: () => void;
}

export function SlotGrid({ conferenceId, classroomId, classroomName, childId, existingBookingId, schoolId, onBooked }: SlotGridProps) {
  const { showToast } = useToast();
  const [slots, setSlots] = useState<SlotDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getConferenceSlots(conferenceId, classroomId);
      setSlots(data);
    } catch { } finally { setLoading(false); }
  }, [conferenceId, classroomId]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Detect existing booking from slot data (no need to pass as prop from detail page)
  const currentBookingId = existingBookingId ?? slots.find(s => s.my_booking_id)?.my_booking_id;

  async function handleConfirm() {
    if (!selected || !childId) return;
    setBooking(true);
    try {
      if (currentBookingId) {
        await updateBooking(currentBookingId, { slot_id: selected });
      } else {
        await bookSlot({
          conference_id: conferenceId,
          slot_id: selected,
          child_id: childId,
          school_id: schoolId,
        });
      }
      setSelected(null);
      await loadSlots();
      onBooked();
    } catch (e: any) {
      showToast('error', e?.message || 'Booking failed. Please try again.', 'Booking Error');
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel(bookingId: string) {
    setBooking(true);
    try {
      await cancelBooking(bookingId);
      setSelected(null);
      await loadSlots();
    } catch (e: any) {
      showToast('error', e?.message || 'Cancel failed. Please try again.', 'Error');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-3">{classroomName}</p>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : slots.length === 0 ? (
        <p className="text-slate-400 text-sm">No time slots available.</p>
      ) : (
        <>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
            {slots.map(slot => {
              const isMyBooking = !!slot.my_booking_id;
              const isFull = !slot.is_available && !isMyBooking;
              const isSelected = selected === slot.id;
              const timeLabel = `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`;

              return (
                <div key={slot.id}
                  className={cn(
                    'flex items-center justify-between px-4 py-3 transition-all border-l-4',
                    isSelected ? 'bg-blue-50 border-l-blue-500' :
                    isMyBooking ? 'bg-emerald-50 border-l-emerald-500' :
                    'bg-white border-l-transparent'
                  )}>
                  <span className={cn('text-sm font-semibold', isFull && !isMyBooking ? 'text-slate-400' : 'text-slate-900')}>
                    {timeLabel}
                  </span>
                  {isMyBooking ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">
                        <CheckCircle2 className="h-3 w-3" /> Booked
                      </span>
                      <button
                        onClick={() => setConfirmAction({
                          title: 'Cancel Booking',
                          description: `Cancel your booking for ${timeLabel}?`,
                          onConfirm: () => handleCancel(slot.my_booking_id!),
                        })}
                        disabled={booking}
                        className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 rounded-full px-3 py-1 transition-colors disabled:opacity-40">
                        Cancel
                      </button>
                    </div>
                  ) : isFull ? (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-400 rounded-full px-3 py-1">Full</span>
                  ) : (
                    <button
                      disabled={booking}
                      onClick={() => setSelected(id => id === slot.id ? null : slot.id)}
                      className={cn(
                        'text-sm font-semibold rounded-xl px-4 py-1.5 transition-all disabled:opacity-50',
                        isSelected ? 'bg-blue-500 text-white' : 'bg-[#0F2D52] text-white hover:bg-[#1a3a6b]'
                      )}>
                      {isSelected ? 'Selected' : currentBookingId ? 'Change Slot' : 'Book Now'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {selected && (() => {
            const slot = slots.find(s => s.id === selected);
            const timeLabel = slot ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}` : '';
            const actionLabel = currentBookingId ? 'Change Slot' : 'Confirm Booking';
            return (
              <div className="mt-4">
                <Button
                  onClick={() => setConfirmAction({
                    title: actionLabel,
                    description: currentBookingId
                      ? `Change your booking to ${timeLabel}?`
                      : `Book the ${timeLabel} slot?`,
                    onConfirm: handleConfirm,
                  })}
                  disabled={booking || !childId}
                  className="bg-[#0F2D52] hover:bg-[#0F2D52]/90 text-white gap-2">
                  {booking ? 'Saving...' : actionLabel}
                  {!booking && <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            );
          })()}
        </>
      )}

      {/* Confirmation modal — rendered via portal to escape any ancestor CSS transform */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">{confirmAction.title}</h3>
            <p className="text-sm text-slate-500">{confirmAction.description}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Back
              </Button>
              <Button
                onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
                className={cn(
                  'text-white',
                  confirmAction.title === 'Cancel Booking'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#0F2D52] hover:bg-[#0F2D52]/90'
                )}>
                {confirmAction.title === 'Cancel Booking' ? 'Yes, Cancel' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Booking modal ─────────────────────────────────────────────────────────────

interface BookingModalProps {
  conference: ConferenceListItem;
  children: ChildOption[];
  existingBookingId?: string;
  existingChildId?: string;
  schoolId: string;
  onClose: () => void;
  onBooked: () => void;
}

function BookingModal({ conference, children: allChildren, existingBookingId, existingChildId, schoolId, onClose, onBooked }: BookingModalProps) {
  // Only show children enrolled in one of this conference's classrooms
  const children = allChildren.filter(c =>
    conference.classroom_tags.some(t => t.classroom_id === c.classroomId)
  );

  const defaultChildId = existingChildId || children[0]?.id || '';
  const defaultClassroom = children[0]?.classroomId || conference.classroom_tags[0]?.classroom_id || '';

  const [activeClassroom, setActiveClassroom] = useState(defaultClassroom);
  const [selectedChildId, setSelectedChildId] = useState(defaultChildId);

  const selectedChild = children.find(c => c.id === selectedChildId);

  const handleChildSelect = (childId: string) => {
    setSelectedChildId(childId);
    const child = children.find(c => c.id === childId);
    if (child?.classroomId) setActiveClassroom(child.classroomId);
  };

  // Only show the classroom tab for the selected child's classroom
  const visibleClassroomTags = conference.classroom_tags.filter(t =>
    t.classroom_id === selectedChild?.classroomId
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{conference.title}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{formatDate(conference.conference_date)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none mt-0.5">&times;</button>
        </div>

        {children.length > 0 && (
          <div className="px-6 pt-4 pb-3 border-b border-slate-100">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Child</label>
            <div className="flex flex-wrap gap-2">
              {children.map(child => (
                <button key={child.id} onClick={() => handleChildSelect(child.id)}
                  className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedChildId === child.id ? 'bg-[#0F2D52] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                  {child.name}
                </button>
              ))}
            </div>
            {selectedChild && (
              <p className="text-xs text-slate-400 mt-2">
                Booking for <strong className="text-slate-600">{selectedChild.name}</strong>
              </p>
            )}
          </div>
        )}

        {visibleClassroomTags.length > 1 && (
          <div className="px-6 pt-4 flex gap-2 flex-wrap border-b border-slate-100 pb-3">
            {visibleClassroomTags.map(t => (
              <button key={t.classroom_id} onClick={() => setActiveClassroom(t.classroom_id)}
                className={cn('px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                  activeClassroom === t.classroom_id ? 'bg-[#0F2D52] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                {t.classroom_name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!selectedChildId ? (
            <p className="text-slate-400 text-sm text-center py-4">Please select a child to proceed.</p>
          ) : (
            conference.classroom_tags
              .filter(t => t.classroom_id === activeClassroom)
              .map(t => (
                <SlotGrid
                  key={t.classroom_id}
                  conferenceId={conference.id}
                  classroomId={t.classroom_id}
                  classroomName={t.classroom_name}
                  childId={selectedChildId}
                  existingBookingId={existingBookingId}
                  schoolId={schoolId}
                  onBooked={() => { onBooked(); onClose(); }}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ParentConferences() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const navigate = useNavigate();
  const { userData } = useUserContext();
  const { user } = useAuth();
  const schoolId = userData?.schoolId || '';

  const [tab, setTab] = useState<'available' | 'bookings' | 'past'>('available');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [conferences, setConferences] = useState<ConferenceListItem[]>([]);
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState<{
    conf: ConferenceListItem;
    existingBookingId?: string;
    existingChildId?: string;
  } | null>(null);

  // Search / sort
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = usePageSize('parent-conferences', 10);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const [confs, bks] = await Promise.all([
        listMyConferences(schoolId),
        listMyBookings(schoolId),
      ]);
      setConferences(confs);
      setBookings(bks);
    } catch { } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const parentId = userData?.parentId || user?.id;
    if (!parentId || !schoolId) return;
    fetchSingleParent(parentId, schoolId)
      .then(pd => {
        if (pd) {
          const opts = (pd.children || [])
            .filter((c: any) => c.childStatus === 'active')
            .map((c: any) => ({
              id: c.childId || '',
              name: c.childFullName || '',
              classroomId: c.classroomId || '',
            }))
            .filter((c: ChildOption) => c.id);
          setChildren(opts);
        }
      })
      .catch(() => {});
  }, [userData?.parentId, user?.id, schoolId]);

  // ── Filter / sort / paginate — Available Conferences ──────────────────────

  const bookedConferenceIds = new Set(
    bookings.filter(b => b.status === 'booked').map(b => b.conference_id)
  );

  const bookedChildConferencePairs = new Set(
    bookings.filter(b => b.status === 'booked').map(b => `${b.conference_id}:${b.child_id}`)
  );

  const activeBookings = bookings.filter(b =>
    conferences.find(c => c.id === b.conference_id)?.status === 'active'
  );

  const allExpiredBookings = bookings.filter(b => {
    const conf = conferences.find(c => c.id === b.conference_id);
    return conf && conf.status !== 'active';
  });

  const expiredBookingConferenceIds = new Set(allExpiredBookings.map(b => b.conference_id));

  const filteredAvailable = conferences.filter(c =>
    c.status === 'active' &&
    (
      children.length === 0
        ? !bookedConferenceIds.has(c.id)
        : children.some(child =>
            child.classroomId &&
            c.classroom_tags.some(t => t.classroom_id === child.classroomId) &&
            !bookedChildConferencePairs.has(`${c.id}:${child.id}`)
          )
    ) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredPast = conferences.filter(c =>
    c.status !== 'active' &&
    !expiredBookingConferenceIds.has(c.id) &&
    (!search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredExpiredBookings = allExpiredBookings.filter(b => {
    const q = search.toLowerCase();
    return !q || b.conference_title.toLowerCase().includes(q) || b.child_name.toLowerCase().includes(q);
  });

  const sortedAvailable = sortItems(filteredAvailable, sortBy, sortOrder, (c, key) => {
    if (key === 'date') return c.conference_date;
    if (key === 'slots') return String(c.available_slots).padStart(6, '0');
    return c.title;
  });

  const sortedPast = sortItems(filteredPast, sortBy, sortOrder, (c, key) => {
    if (key === 'date') return c.conference_date;
    return c.title;
  });

  const {
    currentPage: confPage, totalPages: confTotalPages,
    paginatedData: pagedConfs, setCurrentPage: setConfPage,
  } = usePagination({ data: sortedAvailable, itemsPerPage });

  const {
    currentPage: pastPage, totalPages: pastTotalPages,
    paginatedData: pagedPast, setCurrentPage: setPastPage,
  } = usePagination({ data: sortedPast, itemsPerPage });

  // ── Filter / sort / paginate — My Bookings ────────────────────────────────

  const filteredBookings = activeBookings.filter(b => {
    const q = search.toLowerCase();
    return !q || b.conference_title.toLowerCase().includes(q) || b.child_name.toLowerCase().includes(q);
  });

  const sortedBookings = sortItems(filteredBookings, sortBy, sortOrder, (b, key) => {
    if (key === 'date') return b.conference_date;
    return b.conference_title;
  });

  const {
    currentPage: bkPage, totalPages: bkTotalPages,
    paginatedData: pagedBookings, setCurrentPage: setBkPage,
  } = usePagination({ data: sortedBookings, itemsPerPage });

  useEffect(() => { setConfPage(1); setBkPage(1); setPastPage(1); }, [tab, search, sortBy, sortOrder]);

  function openEditBooking(booking: BookingListItem) {
    const conf = conferences.find(c => c.id === booking.conference_id);
    if (conf) setBookingModal({ conf, existingBookingId: booking.id, existingChildId: booking.child_id });
  }

  // Derived for current tab
  const sorted = tab === 'available' ? sortedAvailable : tab === 'past' ? sortedPast : sortedBookings;
  const currentPage = tab === 'available' ? confPage : tab === 'past' ? pastPage : bkPage;
  const totalPages = tab === 'available' ? confTotalPages : tab === 'past' ? pastTotalPages : bkTotalPages;
  const setPage = tab === 'available' ? setConfPage : tab === 'past' ? setPastPage : setBkPage;
  const pastIsEmpty = filteredExpiredBookings.length === 0 && sortedPast.length === 0;

  return (
    <ParentLayout>
      <div className="min-h-screen bg-[#EFF5FB]">
        <div className="container mx-auto px-4 py-6 pb-12 space-y-4 max-w-7xl">

          {/* Header */}
          <div className="flex items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0">
              <CalendarDays className="h-5 w-5 text-[#0F2D52]" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-[#0F2D52]">Conferences</h1>
              <p className="text-xs text-slate-500 mt-0.5">Book your parent-teacher conference slots</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-100 bg-white rounded-t-2xl px-4 pt-2">
            <button onClick={() => setTab('available')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px',
                tab === 'available' ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
              )}>
              <CalendarDays className="h-4 w-4" /> Available Conferences
              {filteredAvailable.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
              )}
            </button>
            <button onClick={() => setTab('bookings')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px',
                tab === 'bookings' ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
              )}>
              <Ticket className="h-4 w-4" /> My Bookings
            </button>
            <button onClick={() => setTab('past')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px',
                tab === 'past' ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
              )}>
              <Clock className="h-4 w-4" /> Past
            </button>
          </div>

          {/* Search + Controls */}
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', search ? 'text-[#0F2D52]' : 'text-slate-400')} />
              <Input
                placeholder={tab === 'available' ? 'Search conferences...' : 'Search by title or child...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-8 h-9 rounded-xl text-sm border-slate-200 bg-white"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <SortDropdown
              currentSortBy={sortBy}
              currentSortOrder={sortOrder}
              options={tab === 'available' ? CONF_SORT_OPTIONS : BOOKING_SORT_OPTIONS}
              labels={SORT_LABELS}
              onSort={(by, order) => { setSortBy(by); setSortOrder(order); }}
            />
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-1.5 rounded-lg transition-colors',
                  viewMode === 'list' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-1.5 rounded-lg transition-colors',
                  viewMode === 'grid' ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600')}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>


          {/* Results */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="flex gap-2 mt-2">
                        <div className="h-5 bg-slate-200 rounded-full w-24" />
                        <div className="h-5 bg-slate-200 rounded-full w-16" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 h-9 bg-slate-200 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

              {/* Page size selector */}
              {(tab === 'past' ? !pastIsEmpty : sorted.length > 0) && (
                <div className="flex justify-end items-center px-4 py-3 border-b border-slate-200 bg-white">
                  <PageSizeSelector
                    pageSize={itemsPerPage}
                    onPageSizeChange={size => { setItemsPerPage(size); setPage(1); }}
                    options={[5, 10, 25]}
                  />
                </div>
              )}

              {/* Empty state */}
              {(tab === 'past' ? pastIsEmpty : sorted.length === 0) ? (
                <div className="p-14 text-center">
                  <CalendarDays className="h-10 w-10 mx-auto mb-4 text-slate-200" />
                  <p className="font-semibold text-slate-500">
                    {search
                      ? 'No conferences match your search'
                      : tab === 'available'
                        ? 'No conferences available to book'
                        : tab === 'past'
                          ? 'No past conferences or bookings'
                          : 'No bookings yet'}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {search
                      ? 'Try clearing your search.'
                      : tab === 'available'
                        ? 'Check back soon for upcoming conferences.'
                        : tab === 'past'
                          ? 'Past conferences and attended bookings will appear here.'
                          : 'Browse available conferences and book a slot.'}
                  </p>
                  {tab === 'bookings' && !search && (
                    <button onClick={() => setTab('available')} className="mt-3 text-[#0F2D52] text-sm hover:underline">
                      View available conferences
                    </button>
                  )}
                </div>
              ) : tab === 'available' ? (
                viewMode === 'grid' ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pagedConfs.map(conf => (
                      <div key={conf.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 hover:shadow-md transition-shadow flex flex-col">
                        <div className="w-full h-36 overflow-hidden flex-shrink-0">
                          {conf.image_url
                            ? <img src={conf.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-[#0F2D52] to-[#1e4b83]" />}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-extrabold text-slate-900 leading-snug text-sm">{conf.title}</h3>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                              conf.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                              {conf.status === 'active' ? 'Open' : 'Closed'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3">{conf.description}</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                              <CalendarDays className="h-3 w-3" /> {formatDate(conf.conference_date)}
                            </span>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                              conf.available_slots > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                              <Clock className="h-3 w-3" /> {conf.available_slots} slot{conf.available_slots !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="mt-auto">
                            <Button
                              disabled={conf.status !== 'active' || conf.available_slots === 0}
                              onClick={() => navigate(`/${schoolSlug}/dashboard/conferences/${conf.id}`)}
                              className={cn('w-full rounded-xl gap-1.5 shadow-sm text-sm',
                                conf.status === 'active' && conf.available_slots > 0
                                  ? 'bg-[#0F2D52] hover:bg-[#1a3a6b] text-white'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
                              <Ticket className="h-4 w-4" />
                              {conf.status !== 'active' ? 'Closed' : conf.available_slots === 0 ? 'Fully Booked' : 'Book a Slot'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['CONFERENCE', 'DATE', 'CLASSROOMS', 'SLOTS', 'STATUS', 'ACTION'].map(h => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pagedConfs.map(conf => (
                          <tr key={conf.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {conf.image_url
                                  ? <img src={conf.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                  : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0F2D52] to-[#1e4b83] flex-shrink-0" />}
                                <div>
                                  <p className="font-medium text-slate-900 text-sm leading-tight">{conf.title}</p>
                                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{conf.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(conf.conference_date)}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {conf.classroom_tags.slice(0, 2).map(t => (
                                  <span key={t.classroom_id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.classroom_name}</span>
                                ))}
                                {conf.classroom_tags.length > 2 && (
                                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">+{conf.classroom_tags.length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                                conf.available_slots > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                                {conf.available_slots} available
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
                                conf.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                                {conf.status === 'active' ? 'Open' : 'Closed'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <Button size="sm"
                                disabled={conf.status !== 'active' || conf.available_slots === 0}
                                onClick={() => navigate(`/${schoolSlug}/dashboard/conferences/${conf.id}`)}
                                className={cn('rounded-xl gap-1 text-xs',
                                  conf.status === 'active' && conf.available_slots > 0
                                    ? 'bg-[#0F2D52] hover:bg-[#1a3a6b] text-white'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>
                                <Ticket className="h-3.5 w-3.5" />
                                {conf.status !== 'active' ? 'Closed' : conf.available_slots === 0 ? 'Full' : 'Book'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : tab === 'past' ? (
                <div className={cn('p-4', viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4')}>
                  {/* Expired bookings — attended conferences */}
                  {filteredExpiredBookings.map(b => viewMode === 'grid' ? (
                    <div key={`bk-${b.id}`} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 flex flex-col opacity-75">
                      <div className="w-full h-28 overflow-hidden flex-shrink-0">
                        {b.image_url
                          ? <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-extrabold text-slate-700 leading-snug text-sm truncate">{b.conference_title}</h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 bg-blue-50 text-blue-700">Attended</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{b.child_name}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{b.classroom_name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(b.conference_date)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(b.slot_start)} – {formatTime(b.slot_end)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={`bk-${b.id}`} className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden opacity-75">
                      <div className="p-5 flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          {b.image_url
                            ? <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-slate-700 leading-snug truncate">{b.conference_title}</h3>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-blue-50 text-blue-700">Attended</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{b.child_name}</span>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold">{b.classroom_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(b.conference_date)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(b.slot_start)} – {formatTime(b.slot_end)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Expired conferences not booked */}
                  {pagedPast.map(conf => viewMode === 'grid' ? (
                    <div key={conf.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 flex flex-col opacity-75">
                      <div className="w-full h-28 overflow-hidden flex-shrink-0">
                        {conf.image_url
                          ? <img src={conf.image_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-extrabold text-slate-700 leading-snug text-sm">{conf.title}</h3>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 bg-slate-100 text-slate-500">Closed</span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 mb-2">{conf.description}</p>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-500">
                            <CalendarDays className="h-3 w-3" /> {formatDate(conf.conference_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={conf.id} className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden opacity-75">
                      <div className="p-5 flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          {conf.image_url
                            ? <img src={conf.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-slate-700 leading-snug">{conf.title}</h3>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 bg-slate-100 text-slate-500">Closed</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{conf.description}</p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              <CalendarDays className="h-3 w-3" /> {formatDate(conf.conference_date)}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              <Users className="h-3 w-3" /> {conf.classroom_tags.length} classroom{conf.classroom_tags.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                viewMode === 'grid' ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pagedBookings.map(b => (
                      <div key={b.id} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50 hover:shadow-md transition-shadow flex flex-col">
                        <div className="w-full h-28 overflow-hidden flex-shrink-0">
                          {b.image_url
                            ? <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-[#0F2D52] to-[#1e4b83]" />}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-extrabold text-slate-900 leading-snug text-sm truncate">{b.conference_title}</h3>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                              b.status === 'booked' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                              {b.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{b.child_name}</span>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{b.classroom_name}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(b.conference_date)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(b.slot_start)} – {formatTime(b.slot_end)}</span>
                          </div>
                          <div className="mt-auto flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditBooking(b)} className="flex-1 rounded-xl text-xs gap-1">
                              <RefreshCw className="h-3 w-3" /> Change
                            </Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              try { await cancelBooking(b.id); load(); } catch { }
                            }} className="flex-1 rounded-xl text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50">
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['CONFERENCE', 'CHILD', 'CLASSROOM', 'DATE', 'TIME SLOT', 'ACTIONS'].map(h => (
                            <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {pagedBookings.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {b.image_url
                                  ? <img src={b.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                                  : <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0F2D52] to-[#1e4b83] flex-shrink-0" />}
                                <p className="font-medium text-slate-900 text-sm leading-tight">{b.conference_title}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{b.child_name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{b.classroom_name}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatDate(b.conference_date)}</td>
                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatTime(b.slot_start)} – {formatTime(b.slot_end)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button size="sm" variant="outline" onClick={() => openEditBooking(b)} className="rounded-xl text-xs gap-1">
                                  <RefreshCw className="h-3.5 w-3.5" /> Change Slot
                                </Button>
                                <Button size="sm" variant="outline" onClick={async () => {
                                  try { await cancelBooking(b.id); load(); } catch { }
                                }} className="rounded-xl text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50">
                                  <X className="h-3.5 w-3.5" /> Cancel
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {/* Pagination footer */}
              {sorted.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-white">
                  <div className="text-xs text-slate-500 text-center sm:text-left">
                    Showing{' '}
                    <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * itemsPerPage + 1, sorted.length)}</span>
                    –
                    <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, sorted.length)}</span>
                    {' '}of{' '}
                    <span className="font-semibold text-slate-900">{sorted.length}</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-end gap-1.5">
                    <Button variant="outline" size="sm"
                      onClick={() => setPage(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1 || totalPages === 0}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200">
                      Prev
                    </Button>
                    <span className="text-xs text-slate-500 font-semibold px-1 whitespace-nowrap">
                      {totalPages === 0 ? '0 / 0' : `${currentPage} / ${totalPages}`}
                    </span>
                    <Button variant="outline" size="sm"
                      onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200">
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Booking modal */}
      {bookingModal && (
        <BookingModal
          conference={bookingModal.conf}
          children={children}
          existingBookingId={bookingModal.existingBookingId}
          existingChildId={bookingModal.existingChildId}
          schoolId={schoolId}
          onClose={() => setBookingModal(null)}
          onBooked={() => { load(); setTab('bookings'); }}
        />
      )}
    </ParentLayout>
  );
}
