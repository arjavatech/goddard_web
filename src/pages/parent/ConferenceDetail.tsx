import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CalendarDays, ArrowLeft, Users, CheckCircle2 } from 'lucide-react';
import { ParentLayout } from './ParentLayout';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { cn } from '../../lib/utils';
import { listMyConferences, type ConferenceListItem } from '../../services/api/conferences';
import { fetchSingleParent } from '../../services/api/admin';
import { SlotGrid, ChildOption } from './Conferences';

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function ParentConferenceDetail() {
  const { id, schoolSlug } = useParams<{ id: string; schoolSlug: string }>();
  const { userData } = useUserContext();
  const { user } = useAuth();
  const schoolId = userData?.schoolId || '';

  const [conference, setConference] = useState<ConferenceListItem | null>(null);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [booked, setBooked] = useState(false);

  function showBookedBanner() {
    setBooked(true);
    setTimeout(() => setBooked(false), 4000);
  }

  const load = useCallback(async () => {
    if (!schoolId || !id) return;
    setLoading(true);
    try {
      const confs = await listMyConferences(schoolId);
      const conf = confs.find(c => c.id === id) || null;
      setConference(conf);
    } catch { } finally { setLoading(false); }
  }, [schoolId, id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const parentId = userData?.parentId || user?.id;
    if (!parentId || !schoolId || !conference) return;
    fetchSingleParent(parentId, schoolId)
      .then(pd => {
        if (pd) {
          const opts = (pd.children || [])
            .map((c: any) => ({
              id: c.childId || '',
              name: c.childFullName || '',
              classroomId: c.classroomId || '',
            }))
            .filter((c: ChildOption) => c.id && conference.classroom_tags.some(t => t.classroom_id === c.classroomId));
          setChildren(opts);
          if (opts.length > 0) setSelectedChildId(opts[0].id);
        }
      })
      .catch(() => {});
  }, [userData?.parentId, user?.id, schoolId, conference]);

  const selectedChild = children.find(c => c.id === selectedChildId);

  if (loading) {
    return (
      <ParentLayout>
        <div className="min-h-screen bg-[#EFF5FB] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0F2D52]" />
        </div>
      </ParentLayout>
    );
  }

  if (!conference) {
    return (
      <ParentLayout>
        <div className="min-h-screen bg-[#EFF5FB]">
          <div className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-100 shadow-sm">
              <CalendarDays className="h-10 w-10 mx-auto mb-4 text-slate-200" />
              <p className="font-semibold text-slate-500">Conference not found</p>
              <Link to={`/${schoolSlug}/dashboard/conferences`} className="mt-4 inline-block text-sm text-[#0F2D52] hover:underline">
                ← Back to Conferences
              </Link>
            </div>
          </div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="container mx-auto px-4 pt-6 pb-12 space-y-4 max-w-2xl">

          {/* Back */}
          <Link
            to={`/${schoolSlug}/dashboard/conferences`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F2D52] hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to Conferences
          </Link>

          {/* Banner image */}
          {conference.image_url && (
            <div className="rounded-2xl overflow-hidden h-48 sm:h-64 w-full">
              <img src={conference.image_url} alt={conference.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Header card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-extrabold text-[#0F2D52] leading-snug">{conference.title}</h1>
              <span className={cn('text-xs font-semibold px-2 py-1 rounded-full shrink-0',
                conference.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>
                {conference.status === 'active' ? 'Open' : 'Closed'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                <CalendarDays className="h-3.5 w-3.5" /> {formatDate(conference.conference_date)}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                <Users className="h-3.5 w-3.5" /> {conference.classroom_tags.map(t => t.classroom_name).join(', ')}
              </span>
            </div>
            {conference.description && (
              <p className="text-sm text-slate-500 leading-relaxed">{conference.description}</p>
            )}
          </div>

          {/* Success banner */}
          {booked && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Booking confirmed!</p>
                <p className="text-xs text-emerald-600 mt-0.5">A confirmation email has been sent to you.</p>
              </div>
            </div>
          )}

          {/* Booking section */}
          {conference.status !== 'active' ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <CalendarDays className="h-8 w-8 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-500">Booking is closed for this conference.</p>
            </div>
          ) : children.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="font-semibold text-slate-500">No children enrolled in this conference's classrooms.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
              <h2 className="text-base font-extrabold text-slate-900">Select a Time Slot</h2>

              {/* Child selector */}
              {children.length > 1 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Select Child</p>
                  <div className="flex flex-wrap gap-2">
                    {children.map(child => (
                      <button key={child.id} onClick={() => setSelectedChildId(child.id)}
                        className={cn('px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                          selectedChildId === child.id ? 'bg-[#0F2D52] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                        {child.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Slot grid for selected child's classroom */}
              {selectedChild?.classroomId && conference.classroom_tags
                .filter(t => t.classroom_id === selectedChild.classroomId)
                .map(t => (
                  <SlotGrid
                    key={t.classroom_id}
                    conferenceId={conference.id}
                    classroomId={t.classroom_id}
                    classroomName={t.classroom_name}
                    childId={selectedChildId}
                    schoolId={schoolId}
                    onBooked={showBookedBanner}
                  />
                ))
              }
            </div>
          )}

      </div>
    </ParentLayout>
  );
}
