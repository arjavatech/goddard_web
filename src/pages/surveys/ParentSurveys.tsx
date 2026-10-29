import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, CheckCircle, Clock, ChevronRight, Calendar, Search, Filter, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { SortDropdown, sortItems } from '../../components/ui/sort-dropdown';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { listMySurveys, type MySurveyItem, AUDIENCE_LABELS, type SurveyAudience } from '../../services/api/surveys';
import { ParentLayout } from '../parent/ParentLayout';
import { useUserContext } from '../../contexts/UserContext';
import { cn } from '../../lib/utils';

const AUDIENCE_COLOR: Record<SurveyAudience, string> = {
  parents: 'bg-blue-50 text-blue-700',
  employees: 'bg-purple-50 text-purple-700',
  all_staff: 'bg-indigo-50 text-indigo-700',
  classroom: 'bg-teal-50 text-teal-700',
  everyone: 'bg-violet-50 text-violet-700',
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const SORT_OPTIONS = [
  { label: 'Title A–Z', sortBy: 'title', sortOrder: 'asc' as const },
  { label: 'Title Z–A', sortBy: 'title', sortOrder: 'desc' as const },
  { label: 'Expires Soonest', sortBy: 'expires', sortOrder: 'asc' as const },
  { label: 'Expires Latest', sortBy: 'expires', sortOrder: 'desc' as const },
  { label: 'Newest First', sortBy: 'created', sortOrder: 'desc' as const },
  { label: 'Oldest First', sortBy: 'created', sortOrder: 'asc' as const },
];
const SORT_LABELS: Record<string, string> = { title: 'Title', expires: 'Expires', created: 'Created' };

export function ParentSurveys() {
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { userData } = useUserContext();
  const schoolPrefix = `/${schoolSlug || userData?.schoolId || 'goddard'}`;

  const [tab, setTab] = useState<'pending' | 'completed'>('pending');
  const [search, setSearch] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = usePageSize('parent-surveys', 10);
  const [surveys, setSurveys] = useState<MySurveyItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = userData?.schoolId;
    if (!schoolId) return;
    listMySurveys({ schoolId })
      .then(data => { setSurveys(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [userData?.schoolId]);

  const completedSurveys = surveys.filter(s => s.has_responded);
  const pendingSurveys = surveys.filter(s => !s.has_responded && s.status === 'published');
  const displaySurveys = tab === 'pending' ? pendingSurveys : completedSurveys;

  const filtered = displaySurveys.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !q || s.title.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q);
    const matchesAudience = audienceFilter === 'all' || s.audience === audienceFilter;
    return matchesSearch && matchesAudience;
  });

  const sorted = sortItems(filtered, sortBy, sortOrder, (s, key) => {
    if (key === 'expires') return s.expires_at ?? '';
    if (key === 'created') return s.created_at ?? '';
    return s.title;
  });

  const { currentPage, totalPages, paginatedData: pagedSurveys, setCurrentPage } =
    usePagination({ data: sorted, itemsPerPage });

  useEffect(() => { setCurrentPage(1); }, [tab, search, audienceFilter, sortBy, sortOrder]);

  const hasFilter = audienceFilter !== 'all';

  return (
    <ParentLayout>
    <div className="min-h-screen bg-[#EFF5FB]">
      <div className="container mx-auto px-4 py-6 pb-12 space-y-4 max-w-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="h-10 w-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5 text-[#0F2D52]" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-[#0F2D52]">Surveys</h1>
            <p className="text-xs text-slate-500 mt-0.5">Surveys from your child's school</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100 bg-white rounded-t-2xl px-4 pt-2">
          <button
            onClick={() => setTab('pending')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px',
              tab === 'pending' ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
            )}
          >
            <Clock className="h-4 w-4" /> Pending
            {pendingSurveys.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingSurveys.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('completed')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px',
              tab === 'completed' ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
            )}
          >
            <CheckCircle className="h-4 w-4" /> Completed
          </button>
        </div>

        {/* Search + Controls */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', search ? 'text-[#0F2D52]' : 'text-slate-400')} />
            <Input
              placeholder="Search surveys..."
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(p => !p)}
            className="h-9 rounded-xl bg-white text-[#0F2D52] border-slate-200 font-bold text-xs px-3 relative shrink-0"
          >
            {showFilters ? <X className="h-4 w-4 sm:mr-1.5" /> : <Filter className="h-4 w-4 sm:mr-1.5" />}
            <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
            {!showFilters && hasFilter && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#0F2D52] text-[9px] text-white font-bold flex items-center justify-center">1</span>
            )}
          </Button>
          <SortDropdown
            currentSortBy={sortBy}
            currentSortOrder={sortOrder}
            options={SORT_OPTIONS}
            labels={SORT_LABELS}
            onSort={(by, order) => { setSortBy(by); setSortOrder(order); }}
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
            {hasFilter && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">1 filter applied</span>
                <Button variant="outline" size="sm" onClick={() => setAudienceFilter('all')} className="h-8 text-xs rounded-lg">
                  <X className="h-3.5 w-3.5 mr-1" /> Clear All
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-500">Audience</label>
                <Select value={audienceFilter} onValueChange={v => { setAudienceFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                    <SelectValue placeholder="All audiences" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="parents">{AUDIENCE_LABELS['parents']}</SelectItem>
                    <SelectItem value="classroom">{AUDIENCE_LABELS['classroom']}</SelectItem>
                    <SelectItem value="everyone">{AUDIENCE_LABELS['everyone']}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Survey Cards Container with Records per page at top */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-5 bg-slate-200 rounded-full w-20" />
                  <div className="h-5 bg-slate-200 rounded-full w-16" />
                </div>
                <div className="mt-4 h-9 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Records per page selector - Top right */}
            {sorted.length > 0 && (
              <div className="flex justify-end items-center px-4 py-3 border-b border-slate-200 bg-white">
                <PageSizeSelector
                  pageSize={itemsPerPage}
                  onPageSizeChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                  options={[5, 10, 25]}
                />
              </div>
            )}

            {/* Survey Cards */}
            {sorted.length === 0 ? (
              <div className="p-14 text-center">
                <ClipboardList className="h-10 w-10 mx-auto mb-4 text-slate-200" />
                <p className="font-semibold text-slate-500">
                  {search || hasFilter ? 'No surveys match your search' : tab === 'pending' ? 'No pending surveys' : 'No completed surveys yet'}
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  {search || hasFilter ? 'Try clearing your filters.' : tab === 'pending' ? "You're all caught up!" : 'Surveys you fill out will appear here.'}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {pagedSurveys.map(survey => {
                  return (
                    <div key={survey.id} className="bg-slate-50 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                      <div className="p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0 mt-0.5">
                            <ClipboardList className="h-5 w-5 text-[#0F2D52]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-slate-900 leading-snug">{survey.title}</h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{survey.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${AUDIENCE_COLOR[survey.audience as SurveyAudience]}`}>
                            {AUDIENCE_LABELS[survey.audience as SurveyAudience]}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            {survey.question_count} questions
                          </span>
                          {survey.expires_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                              <Calendar className="h-3 w-3" /> Expires {formatDate(survey.expires_at)}
                            </span>
                          )}
                          {tab === 'completed' && survey.submitted_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle className="h-3 w-3" /> Submitted {formatDate(survey.submitted_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="px-5 pb-4">
                        {tab === 'pending' ? (
                          <Button
                            className="w-full rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-1.5 shadow-sm"
                            onClick={() => navigate(`${schoolPrefix}/surveys/${survey.id}/respond`)}
                          >
                            Fill Out <ChevronRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full rounded-xl text-slate-600" disabled>
                            <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" /> Response Submitted
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer: survey count (left) + pagination (right) */}
            {sorted.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-white">
                <div className="text-xs text-slate-500 text-center sm:text-left">
                  Showing <span className="font-semibold text-slate-900">{Math.min((currentPage - 1) * itemsPerPage + 1, sorted.length)}</span>–<span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, sorted.length)}</span> of <span className="font-semibold text-slate-900">{sorted.length}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1 || totalPages === 0}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
                  >
                    Prev
                  </Button>
                  <span className="text-xs text-slate-500 font-semibold px-1 whitespace-nowrap">
                    {totalPages === 0 ? '0 / 0' : `${currentPage} / ${totalPages}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </ParentLayout>
  );
}
