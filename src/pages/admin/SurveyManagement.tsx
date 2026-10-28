import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ClipboardList, Plus, Search, X, BarChart2, Users, CheckCircle, TrendingUp,
  Edit, Trash2, ChevronRight, Clock, FileText, Bookmark, BookmarkCheck, Share2, Copy,
  EyeOff, UserCheck, Filter, Loader2, LayoutGrid, List
} from 'lucide-react';
import { DataTable } from '../../components/ui/data-table';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { StatCard } from '../../components/ui/stat-card';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { SortDropdown, sortItems } from '../../components/ui/sort-dropdown';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { listSurveys, updateSurvey, deleteSurvey, type SurveyListItem, AUDIENCE_LABELS, type SurveyStatus, type SurveyAudience } from '../../services/api/surveys';
import { useUserContext } from '../../contexts/UserContext';
import { cn } from '../../lib/utils';

const STATUS_BADGE: Record<SurveyStatus, { variant: 'success' | 'warning' | 'secondary' | 'destructive'; label: string }> = {
  published: { variant: 'success', label: 'Published' },
  draft: { variant: 'warning', label: 'Draft' },
  closed: { variant: 'secondary', label: 'Closed' },
  expired: { variant: 'destructive', label: 'Expired' },
};

const AUDIENCE_BADGE_COLOR: Record<SurveyAudience, string> = {
  parents: 'bg-blue-50 text-blue-700',
  employees: 'bg-purple-50 text-purple-700',
  all_staff: 'bg-indigo-50 text-indigo-700',
  classroom: 'bg-teal-50 text-teal-700',
  everyone: 'bg-violet-50 text-violet-700',
};

const STATUS_TABS: { value: SurveyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
  { value: 'expired', label: 'Expired' },
];

const SORT_OPTIONS = [
  { label: 'Title A–Z', sortBy: 'title', sortOrder: 'asc' as const },
  { label: 'Title Z–A', sortBy: 'title', sortOrder: 'desc' as const },
  { label: 'Expires Soonest', sortBy: 'expires', sortOrder: 'asc' as const },
  { label: 'Expires Latest', sortBy: 'expires', sortOrder: 'desc' as const },
  { label: 'Newest First', sortBy: 'created', sortOrder: 'desc' as const },
  { label: 'Oldest First', sortBy: 'created', sortOrder: 'asc' as const },
  { label: 'Most Responses', sortBy: 'responses', sortOrder: 'desc' as const },
];
const SORT_LABELS: Record<string, string> = { title: 'Title', expires: 'Expires', created: 'Created', responses: 'Responses' };

function responseRate(survey: SurveyListItem): number {
  if (survey.total_targeted === 0) return 0;
  return Math.round((survey.total_responded / survey.total_targeted) * 100);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function SurveyManagement() {
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { userData } = useUserContext();
  const schoolPrefix = `/${schoolSlug || userData?.schoolId || 'goddard'}`;

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<SurveyStatus | 'all'>('all');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'anonymous' | 'identified'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = usePageSize('survey-management', 10);
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareSurvey, setShareSurvey] = useState<SurveyListItem | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [deletingSurvey, setDeletingSurvey] = useState<SurveyListItem | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<SurveyListItem | null>(null);
  const [togglingTemplate, setTogglingTemplate] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem('surveyViewMode') as 'card' | 'table') || 'table');
  const handleViewModeChange = (mode: 'card' | 'table') => { setViewMode(mode); localStorage.setItem('surveyViewMode', mode); };

  useEffect(() => {
    const schoolId = userData?.schoolId;
    if (!schoolId) return;
    listSurveys({ schoolId })
      .then(data => { setSurveys(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, [userData?.schoolId]);

  const confirmToggleTemplate = (survey: SurveyListItem) => {
    setTogglingTemplate(true);
    updateSurvey(survey.id, { id: survey.id, is_template: !survey.is_template }).then(updated => {
      setSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, is_template: updated.is_template } : s));
      setPendingTemplate(null);
      setTogglingTemplate(false);
    }).catch(() => {
      setPendingTemplate(null);
      setTogglingTemplate(false);
    });
  };

  const handleDelete = (survey: SurveyListItem) => {
    deleteSurvey(survey.id).then(() => {
      setSurveys(prev => prev.filter(s => s.id !== survey.id));
      setDeletingSurvey(null);
    }).catch(() => {
      setDeletingSurvey(null);
    });
  };

  const copyShareLink = (survey: SurveyListItem) => {
    const url = `${window.location.origin}/${schoolSlug || userData?.schoolId || 'goddard'}/surveys/${survey.id}/respond`;
    navigator.clipboard.writeText(url).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const filtered = useMemo(() => {
    return surveys.filter(s => {
      const matchesStatus = statusTab === 'all' || s.status === statusTab;
      const q = search.toLowerCase();
      const matchesSearch = !q || s.title.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q);
      const matchesAudience = audienceFilter === 'all' || s.audience === audienceFilter;
      const matchesType = typeFilter === 'all' || (typeFilter === 'anonymous' ? s.is_anonymous : !s.is_anonymous);
      return matchesStatus && matchesSearch && matchesAudience && matchesType;
    });
  }, [surveys, search, statusTab, audienceFilter, typeFilter]);

  const sorted = sortItems(filtered, sortBy, sortOrder, (s, key) => {
    if (key === 'expires') return s.expires_at ?? '';
    if (key === 'created') return s.created_at ?? '';
    if (key === 'responses') return String(s.total_responded).padStart(6, '0');
    return s.title;
  });

  const { currentPage, totalPages, paginatedData: pagedSurveys, setCurrentPage } =
    usePagination({ data: sorted, itemsPerPage });

  useEffect(() => { setCurrentPage(1); }, [statusTab, search, audienceFilter, typeFilter, sortBy, sortOrder]);

  const activeFilterCount =
    (statusTab !== 'all' ? 1 : 0) +
    (audienceFilter !== 'all' ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0);
  const hasFilter = activeFilterCount > 0;

  const clearAllFilters = () => {
    setStatusTab('all');
    setAudienceFilter('all');
    setTypeFilter('all');
  };

  // Stats
  const totalSurveys = surveys.filter(s => !s.is_template).length;
  const activeSurveys = surveys.filter(s => s.status === 'published' && !s.is_template).length;
  const totalResponses = surveys.reduce((acc, s) => acc + s.total_responded, 0);
  const avgRate = surveys.filter(s => s.total_targeted > 0).reduce((acc, s, _, arr) => {
    return acc + responseRate(s) / arr.length;
  }, 0);

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-4 space-y-6 pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0">
              <ClipboardList className="h-5 w-5 text-[#0F2D52]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-[#0F2D52] truncate">Surveys</h1>
              <p className="text-xs text-slate-500 mt-0.5">Create and manage surveys for parents, staff, and classrooms</p>
            </div>
          </div>
          <Button
            className="shrink-0 rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-2 shadow-sm"
            onClick={() => navigate(`${schoolPrefix}/admin/surveys/create`)}
          >
            <Plus className="h-4 w-4" />
            Create Survey
          </Button>
        </div>

        {/* Stat Cards */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="Total Surveys" value={totalSurveys} icon={FileText} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" />
            <StatCard label="Active (Published)" value={activeSurveys} icon={CheckCircle} iconBgClass="bg-emerald-50" iconColorClass="text-emerald-600" />
            <StatCard label="Total Responses" value={totalResponses} icon={Users} iconBgClass="bg-blue-50" iconColorClass="text-blue-600" />
            <StatCard label="Avg Response Rate" value={`${Math.round(avgRate)}%`} icon={TrendingUp} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" />
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">

          {/* Filters section */}
          <div className="p-4 sm:p-5 border-b border-slate-50 bg-slate-50/50 space-y-3">

            {/* Status Tab Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                      statusTab === tab.value
                        ? 'bg-[#0F2D52] text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-[#0F2D52]/30 hover:text-[#0F2D52]'
                    }`}
                  >
                    {tab.label}
                    {tab.value !== 'all' && (
                      <span className={`ml-1.5 ${statusTab === tab.value ? 'opacity-70' : 'text-slate-400'}`}>
                        ({surveys.filter(s => s.status === tab.value).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {/* View Mode Toggle - Right side */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Card View</span>
                </button>
              </div>
            </div>

            {/* Search + Filters button + Sort */}
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <Search className={cn('absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors', search ? 'text-[#0F2D52]' : 'text-slate-400')} />
                <Input
                  placeholder="Search surveys..."
                  className="pl-9 pr-8 h-9 rounded-xl text-sm border-slate-200 focus:border-[#0F2D52] focus:ring-[#0F2D52]/15 bg-white"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => setSearch('')}>
                    <X className="h-3.5 w-3.5" />
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
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#0F2D52] text-[9px] text-white font-bold flex items-center justify-center">{activeFilterCount}</span>
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

            {/* Collapsible filter panel */}
            {showFilters && (
              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3">
                {hasFilter && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
                    </span>
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 text-xs rounded-lg">
                      <X className="h-3.5 w-3.5 mr-1" /> Clear All
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Status</label>
                    <Select value={statusTab} onValueChange={v => { setStatusTab(v as SurveyStatus | 'all'); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Audience</label>
                    <Select value={audienceFilter} onValueChange={v => { setAudienceFilter(v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                        <SelectValue placeholder="All audiences" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="parents">{AUDIENCE_LABELS['parents']}</SelectItem>
                        <SelectItem value="employees">{AUDIENCE_LABELS['employees']}</SelectItem>
                        <SelectItem value="all_staff">{AUDIENCE_LABELS['all_staff']}</SelectItem>
                        <SelectItem value="classroom">{AUDIENCE_LABELS['classroom']}</SelectItem>
                        <SelectItem value="everyone">{AUDIENCE_LABELS['everyone']}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500">Type</label>
                    <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as 'all' | 'anonymous' | 'identified'); setCurrentPage(1); }}>
                      <SelectTrigger className="h-9 rounded-xl text-sm border-slate-200">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="anonymous">Anonymous</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* View Mode Toggle + Page Size Selector */}
          <div className="flex items-center justify-end px-4 sm:px-5 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <PageSizeSelector
                pageSize={itemsPerPage}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
                options={[10, 25, 50, 100]}
              />
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="flex justify-end items-center px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
              <div className="flex items-center gap-2">
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse stagger-rows table-auto">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-500/50">
                    {[
                      { header: 'Survey', className: 'w-auto min-w-[200px]' },
                      { header: 'Audience', className: 'hidden md:table-cell w-1/6' },
                      { header: 'Status', className: 'w-1/6' },
                      { header: 'Type', className: 'hidden md:table-cell w-1/6' },
                      { header: 'Responses', className: 'hidden sm:table-cell w-1/6' },
                      { header: 'Expires', className: 'hidden lg:table-cell w-1/6' },
                      { header: 'Actions', className: 'w-1/6 text-right' },
                    ].map((col, i) => (
                      <th
                        key={i}
                        className={`text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 ${col.className ?? ''}`}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-6 w-6"></div>
                        </div>
                      </td>
                    </tr>
                  ) : pagedSurveys.length > 0 ? (
                    pagedSurveys.map(survey => {
                      const rate = responseRate(survey);
                      const sb = STATUS_BADGE[survey.status];
                      return (
                        <tr
                          key={survey.id}
                          className="border-b border-slate-50 hover:bg-[#F8FAFC] cursor-pointer transition-colors duration-150"
                          onClick={() => navigate(`${schoolPrefix}/admin/surveys/${survey.id}`)}
                        >
                          {/* Survey info */}
                          <td className="p-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-9 w-9 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0">
                                <ClipboardList className="h-4 w-4 text-[#0F2D52]" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[200px] sm:max-w-[280px]">{survey.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{survey.question_count} questions · by {survey.created_by_name ?? '—'}</p>
                              </div>
                            </div>
                          </td>
                          {/* Audience */}
                          <td className="p-4 hidden md:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${AUDIENCE_BADGE_COLOR[survey.audience]}`}>
                              {survey.classroom_name ? survey.classroom_name.split(' — ')[0] : AUDIENCE_LABELS[survey.audience]}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <Badge variant={sb.variant} className="text-xs w-fit">{sb.label}</Badge>
                              {survey.is_template && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 w-fit">
                                  <BookmarkCheck className="h-2.5 w-2.5" /> Template
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Type */}
                          <td className="p-4 hidden md:table-cell">
                            {survey.is_anonymous ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                <EyeOff className="h-3 w-3" /> Anonymous
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                <UserCheck className="h-3 w-3" /> Identified
                              </span>
                            )}
                          </td>
                          {/* Response progress */}
                          <td className="p-4 hidden sm:table-cell">
                            {survey.status !== 'published' ? (
                              <span className="text-slate-400 text-xs">Not published</span>
                            ) : survey.total_targeted > 0 ? (
                              <div className="space-y-1 min-w-[100px]">
                                <div className="flex items-center justify-between text-xs text-slate-600">
                                  <span className="font-semibold">{survey.total_responded}</span>
                                  <span className="text-slate-400">/ {survey.total_targeted}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">{rate}% response rate</p>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-slate-700">{survey.total_responded}</span>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {survey.total_responded === 1 ? 'response' : 'responses'}
                                </p>
                              </div>
                            )}
                          </td>
                          {/* Expiry */}
                          <td className="p-4 hidden lg:table-cell">
                            {survey.expires_at ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Clock className="h-3 w-3 text-slate-400" />
                                {formatDate(survey.expires_at)}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs">No expiry</span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="p-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`${schoolPrefix}/admin/surveys/${survey.id}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F2D52] hover:bg-[#EFF5FB] transition-all"
                                title="View Report"
                              >
                                <BarChart2 className="h-4 w-4" />
                              </button>
                              {survey.status === 'published' && (
                                <button
                                  onClick={() => setShareSurvey(survey)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                  title="Share Link"
                                >
                                  <Share2 className="h-4 w-4" />
                                </button>
                              )}
                              {survey.status === 'published' && (
                                <button
                                  onClick={() => setPendingTemplate(survey)}
                                  className={cn('p-1.5 rounded-lg transition-all', survey.is_template ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50')}
                                  title={survey.is_template ? 'Remove from Templates' : 'Save as Template'}
                                >
                                  {survey.is_template ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                                </button>
                              )}
                              {survey.total_responded === 0 && (
                                <>
                                  <button
                                    onClick={() => navigate(`${schoolPrefix}/admin/surveys/create?edit=${survey.id}`)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingSurvey(survey)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              <ChevronRight className="h-4 w-4 text-slate-300" />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-400">
                        No surveys found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Card View */}
          {viewMode === 'card' && (
            <div className="p-4">
              {loading ? (
                <div className="py-12 text-center">
                  <div className="flex items-center justify-center mb-3">
                    <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-6 w-6"></div>
                  </div>
                  <p className="text-slate-500 text-sm font-semibold">Loading surveys...</p>
                </div>
              ) : pagedSurveys.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pagedSurveys.map(survey => {
                    const rate = responseRate(survey);
                    const sb = STATUS_BADGE[survey.status];
                    return (
                      <Card
                        key={survey.id}
                        className="border border-slate-100 bg-white hover:border-slate-200 hover:shadow-md transition-all rounded-2xl overflow-hidden cursor-pointer h-full flex flex-col justify-between"
                        onClick={() => navigate(`${schoolPrefix}/admin/surveys/${survey.id}`)}
                      >
                        <div className="p-4 space-y-3">
                          {/* Top: Status badge + Audience */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex flex-col gap-1.5">
                              <Badge variant={sb.variant} className="text-xs w-fit">{sb.label}</Badge>
                              {survey.is_template && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 w-fit">
                                  <BookmarkCheck className="h-2.5 w-2.5" /> Template
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${AUDIENCE_BADGE_COLOR[survey.audience]}`}>
                              {survey.classroom_name ? survey.classroom_name.split(' — ')[0] : AUDIENCE_LABELS[survey.audience]}
                            </span>
                          </div>

                          {/* Survey title + icon */}
                          <div className="flex gap-3 items-start">
                            <div className="h-9 w-9 rounded-xl bg-[#EFF5FB] flex items-center justify-center shrink-0">
                              <ClipboardList className="h-4 w-4 text-[#0F2D52]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-slate-900 text-sm leading-snug mb-0.5">{survey.title}</h3>
                              <p className="text-xs text-slate-400">{survey.question_count} questions · by {survey.created_by_name ?? '—'}</p>
                            </div>
                          </div>

                          {/* Details grid */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-50">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Type</p>
                              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {survey.is_anonymous ? 'Anonymous' : 'Identified'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Responses</p>
                              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                                {survey.total_targeted > 0 ? `${survey.total_responded}/${survey.total_targeted}` : survey.total_responded}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Created</p>
                              <p className="text-xs font-semibold text-slate-600 mt-0.5">{formatDate(survey.created_at)}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expires</p>
                              <p className="text-xs font-semibold text-slate-600 mt-0.5">{survey.expires_at ? formatDate(survey.expires_at) : 'No expiry'}</p>
                            </div>
                            {survey.total_targeted > 0 && (
                              <div className="col-span-2">
                                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                  <span className="font-semibold">Response Rate</span>
                                  <span className="font-bold">{rate}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions section */}
                        <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-50 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => navigate(`${schoolPrefix}/admin/surveys/${survey.id}`)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-[#0F2D52] hover:bg-[#EFF5FB] transition-all"
                              title="View Report"
                            >
                              <BarChart2 className="h-4 w-4" />
                            </button>
                            {survey.status === 'published' && (
                              <button
                                onClick={() => setShareSurvey(survey)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                                title="Share Link"
                              >
                                <Share2 className="h-4 w-4" />
                              </button>
                            )}
                            {survey.status === 'published' && (
                              <button
                                onClick={() => setPendingTemplate(survey)}
                                className={cn('p-1.5 rounded-lg transition-all', survey.is_template ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50')}
                                title={survey.is_template ? 'Remove from Templates' : 'Save as Template'}
                              >
                                {survey.is_template ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {survey.total_responded === 0 && (
                              <>
                                <button
                                  onClick={() => navigate(`${schoolPrefix}/admin/surveys/create?edit=${survey.id}`)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingSurvey(survey)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">No surveys found</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    No matching surveys for the selected filters and criteria.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Custom Pagination - Always visible */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t border-slate-200 bg-white rounded-b-xl">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              Showing <span className="font-semibold text-slate-900">{sorted.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, sorted.length)}</span> of <span className="font-semibold text-slate-900">{sorted.length}</span>
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
        </div>
      </div>

      {/* ── Share Link Modal ── */}
      <Dialog open={!!shareSurvey} onOpenChange={open => { if (!open) { setShareSurvey(null); setLinkCopied(false); } }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Share Survey</DialogTitle>
          </DialogHeader>
          {shareSurvey && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                {shareSurvey.is_anonymous
                  ? <EyeOff className="h-4 w-4 text-amber-500 shrink-0" />
                  : <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />}
                <div>
                  <p className="text-xs font-semibold text-slate-900">{shareSurvey.is_anonymous ? 'Anonymous Survey' : 'Identified Survey'}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {shareSurvey.is_anonymous
                      ? 'Anyone with this link can respond — no login required.'
                      : 'Respondents must sign in with their Goddard account.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Survey Link</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${window.location.origin}/${schoolSlug || userData?.schoolId || 'goddard'}/surveys/${shareSurvey.id}/respond`}
                    className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-600 font-mono"
                  />
                  <button
                    onClick={() => copyShareLink(shareSurvey)}
                    className={cn('p-2 rounded-lg transition-all shrink-0', linkCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-[#EFF5FB] text-[#0F2D52] hover:bg-[#0F2D52]/10')}
                  >
                    {linkCopied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {linkCopied && <p className="text-xs text-emerald-600 font-medium">Link copied to clipboard!</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deletingSurvey} onOpenChange={open => { if (!open) setDeletingSurvey(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Delete Survey</DialogTitle>
          </DialogHeader>
          {deletingSurvey && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold">"{deletingSurvey.title}"</span>? This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setDeletingSurvey(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={() => handleDelete(deletingSurvey)}>
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* ── Template Toggle Confirmation Dialog ── */}
      <Dialog open={!!pendingTemplate} onOpenChange={open => { if (!open) setPendingTemplate(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">
              {pendingTemplate?.is_template ? 'Remove from Templates?' : 'Save as Template?'}
            </DialogTitle>
          </DialogHeader>
          {pendingTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                {pendingTemplate.is_template
                  ? <>Remove <span className="font-semibold">"{pendingTemplate.title}"</span> from templates? It will no longer appear in the template picker.</>
                  : <>Save <span className="font-semibold">"{pendingTemplate.title}"</span> as a template? It will appear in the template picker when creating new surveys.</>
                }
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" className="rounded-xl" disabled={togglingTemplate} onClick={() => setPendingTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={togglingTemplate}
                  className={cn('rounded-xl text-white gap-1.5', pendingTemplate.is_template ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0F2D52] hover:bg-[#1a3a6b]')}
                  onClick={() => confirmToggleTemplate(pendingTemplate)}
                >
                  {togglingTemplate && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {pendingTemplate.is_template ? 'Remove' : 'Save as Template'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
