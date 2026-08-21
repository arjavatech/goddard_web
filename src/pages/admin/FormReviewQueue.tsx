import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Calendar, CheckCircle, Eye, Filter, LayoutGrid, List, Search, SlidersHorizontal, X } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useUserContext } from '../../contexts/UserContext';
import { fetchEmployeeFormReviewQueue, fetchStudentFormReviewQueue, type ReviewQueueItem } from '../../services/api/formReviewQueue';

type Props = { kind: 'student' | 'employee' };
type SortBy = 'date' | 'name';
type SortDirection = 'asc' | 'desc';

const displayDate = (value: string) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const initials = (name?: string) => (name || '').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || '—';

export function FormReviewQueue({ kind }: Props) {
  const { userData, schoolSubdomain } = useUserContext();
  const schoolId = userData?.schoolId;
  const storageKey = `${kind}FormReviewQueueView`;
  const [allItems, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formId, setFormId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useState<'table' | 'card'>(() => (localStorage.getItem(storageKey) as 'table' | 'card') || 'table');

  useEffect(() => {
    if (!schoolId) return;
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const options = { schoolId };
        const response = kind === 'student' ? await fetchStudentFormReviewQueue(options) : await fetchEmployeeFormReviewQueue(options);
        if (isMounted) setItems(response);
      } finally { if (isMounted) setLoading(false); }
    })();
    return () => { isMounted = false; };
  }, [schoolId, kind]);

  const forms = useMemo(() => Array.from(new Map(allItems.map(item => [item.formTemplateId, item.formName])).entries()), [allItems]);
  const classrooms = useMemo(() => Array.from(new Map(allItems.filter(item => item.classroomId).map(item => [item.classroomId!, item.classroomName!])).entries()), [allItems]);
  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const next = allItems.filter(item => {
      const matchesForm = !formId || item.formTemplateId === formId;
      const matchesClassroom = kind !== 'student' || !classroomId || item.classroomId === classroomId;
      const searchable = kind === 'student'
        ? `${item.formName} ${item.studentName} ${item.parentName} ${item.parentEmail}`
        : `${item.formName} ${item.employeeName} ${item.employeeEmail}`;
      return matchesForm && matchesClassroom && (!needle || searchable.toLowerCase().includes(needle));
    });
    next.sort((left, right) => {
      const leftValue = sortBy === 'name'
        ? (kind === 'student' ? left.studentName || '' : left.employeeName || '')
        : left.submittedAt;
      const rightValue = sortBy === 'name'
        ? (kind === 'student' ? right.studentName || '' : right.employeeName || '')
        : right.submittedAt;
      const comparison = leftValue.localeCompare(rightValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return next;
  }, [allItems, search, formId, classroomId, sortBy, sortDirection, kind]);
  const items = filteredItems;
  const activeFilters = Number(Boolean(formId)) + Number(kind === 'student' && Boolean(classroomId));
  const title = kind === 'student' ? 'Student Forms to Review' : 'Employee Forms to Review';
  const subtitle = kind === 'student' ? 'Review submitted parent and guardian forms awaiting a decision' : 'Review submitted employee forms awaiting a decision';
  const reviewPath = `/${schoolSubdomain || 'goddard'}/admin/forms/view`;
  const clearFilters = () => { setFormId(''); setClassroomId(''); };
  const setViewMode = (next: 'table' | 'card') => { setView(next); localStorage.setItem(storageKey, next); };
  const sortLabel = sortBy === 'name' ? `Name — ${sortDirection === 'asc' ? 'A–Z' : 'Z–A'}` : `Date — ${sortDirection === 'desc' ? 'Recent First' : 'Recent Last'}`;
  const reviewState = (item: ReviewQueueItem) => ({
    form: { id: item.assignmentId, title: item.formName, status: item.status, lastUpdated: item.submittedAt, link: item.filloutFormId, recentEditLink: item.recentEditLink, recentPdfLink: item.recentPdfLink },
    childName: item.studentName, parentEmail: item.parentEmail, classDetails: item.classroomName, employeeName: item.employeeName,
    returnPath: `/${schoolSubdomain || 'goddard'}/admin/${kind === 'student' ? 'forms/review' : 'employee-forms/review'}`,
    filloutFormId: item.filloutFormId, recentEditLink: item.recentEditLink, recentPdfLink: item.recentPdfLink,
    studentFormAssignmentId: item.assignmentId, schoolId: item.schoolId, isEmployeeForm: kind === 'employee',
  });

  if (loading && allItems.length === 0) return <AdminLayout><div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto"><div className="text-center animate-pulse"><div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8" /><p className="text-slate-500 text-sm font-semibold">Loading forms to review...</p></div></div></AdminLayout>;

  return <AdminLayout><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
      <div><h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">{title}</h1><p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">{subtitle}</p></div>
    </div>

    <div className="grid grid-cols-2 gap-4 sm:gap-6">
      <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white"><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">Ready for Review</p><p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{items.length}</p></div><div className="p-2.5 bg-[#EFF5FB] rounded-xl flex-shrink-0 ml-2"><Calendar className="h-4 w-4 text-[#0F2D52]" /></div></div></CardContent></Card>
      <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white"><CardContent className="p-4 sm:p-5"><div className="flex items-center justify-between"><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">Action Needed</p><p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{items.length}</p></div><div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0 ml-2"><CheckCircle className="h-4 w-4 text-blue-600" /></div></div></CardContent></Card>
    </div>

    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300"><CardContent className="p-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${search ? 'text-[#0F2D52]' : 'text-slate-400'}`} /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder={kind === 'student' ? 'Search forms, students, or parents...' : 'Search forms, employees, or emails...'} className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm" /></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setShowFilters(value => !value)} className="h-10 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold relative">{showFilters ? <><X className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Hide Filters</span></> : <><Filter className="h-4 w-4 sm:mr-1.5 text-slate-400" /><span className="hidden sm:inline">Filters</span></>}{!showFilters && activeFilters > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">{activeFilters}</span>}</Button>
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-10 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold">{sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5 sm:mr-1.5 text-slate-400" /> : <ArrowDown className="h-3.5 w-3.5 sm:mr-1.5 text-slate-400" />}<span className="hidden sm:inline">{sortLabel}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl"><DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('date'); setSortDirection('desc'); }}>Date — Recent First</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('date'); setSortDirection('asc'); }}>Date — Recent Last</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('name'); setSortDirection('asc'); }}>Name — A–Z</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('name'); setSortDirection('desc'); }}>Name — Z–A</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
      </div>
      {showFilters && <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3 mt-3">{activeFilters > 0 && <div className="flex items-center justify-between border-b border-slate-100 pb-2"><span className="text-xs text-slate-500 font-bold">{activeFilters} {activeFilters === 1 ? 'filter' : 'filters'} applied</span><Button variant="outline" size="sm" onClick={clearFilters} className="h-8 rounded-lg bg-white border-slate-200 text-slate-600 text-[10px] font-extrabold"><X className="h-3.5 w-3.5 mr-1" />Clear All</Button></div>}<div className={`grid gap-4 ${kind === 'student' ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}><div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Form</label><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold" value={formId} onChange={e => setFormId(e.target.value)}><option value="">Select form</option>{forms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>{kind === 'student' && <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Classroom</label><select className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold" value={classroomId} onChange={e => setClassroomId(e.target.value)}><option value="">Select classroom</option>{classrooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>}</div></div>}
    </CardContent></div>

    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"><CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-50 bg-slate-50/50 px-5"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-sm font-bold text-slate-900">Forms to Review ({items.length})</CardTitle><div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs"><button type="button" onClick={() => setViewMode('table')} className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500'}`}><List className="h-3.5 w-3.5" /><span className="hidden sm:inline">Table View</span></button><button type="button" onClick={() => setViewMode('card')} className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${view === 'card' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500'}`}><LayoutGrid className="h-3.5 w-3.5" /><span className="hidden sm:inline">Card View</span></button></div></div></CardHeader>
      <CardContent className="p-0">
        {loading ? <div className="py-14 text-center text-slate-500"><div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[#0F2D52] border-t-transparent" />Refreshing forms...</div>
          : items.length === 0 ? <div className="py-14 text-center text-slate-500"><SlidersHorizontal className="mx-auto mb-3 h-8 w-8 text-slate-300" />No forms are ready for review.</div>
          : view === 'table' ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50/60 border-b border-slate-100 text-left text-[10px] uppercase tracking-wider font-bold text-slate-400"><tr><th className="p-4">{kind === 'student' ? 'Student / Parent' : 'Employee'}</th><th className="p-4">Form</th>{kind === 'student' && <th className="p-4">Class</th>}<th className="p-4">Submitted</th><th className="p-4" /></tr></thead><tbody>{items.map(item => <tr key={item.assignmentId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/40"><td className="p-4"><div className="font-bold text-slate-800">{kind === 'student' ? item.studentName : item.employeeName}</div><div className="text-xs font-medium text-slate-400">{kind === 'student' ? `${item.parentName} · ${item.parentEmail}` : item.employeeEmail}</div></td><td className="p-4 font-semibold text-slate-700">{item.formName}</td>{kind === 'student' && <td className="p-4 text-slate-600">{item.classroomName}</td>}<td className="p-4 whitespace-nowrap text-xs text-slate-500">{displayDate(item.submittedAt)}</td><td className="p-4 text-right"><Link to={`${reviewPath}/${item.assignmentId}`} state={reviewState(item)}><Button size="sm" variant="outline" className="h-8 px-3 text-xs rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-90 hover:text-white border border-[#0F2D52] transition-all duration-200 font-bold"><Eye className="mr-1 h-3.5 w-3.5" />Review</Button></Link></td></tr>)}</tbody></table></div>
          : <div className="p-4 space-y-4"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{items.map(item => {
            const subjectName = kind === 'student' ? item.studentName : item.employeeName;
            return <Card key={item.assignmentId} className="p-5 rounded-2xl border border-slate-100 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-4"><CardContent className="p-0">
              <div className="flex items-start gap-2.5 min-w-0 flex-1 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-[#044ba0] text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 border border-slate-100">{initials(subjectName)}</div>
                <div className="min-w-0 flex-1"><p className="font-bold text-slate-900 text-sm truncate">{item.formName}</p><p className="text-[10px] font-extrabold text-slate-400 truncate mt-0.5 uppercase tracking-wider">{subjectName}{kind === 'student' && ` • ${item.classroomName}`}</p></div>
              </div>
              <div className="space-y-1.5 text-xs pt-3">
                {kind === 'student' ? <><div className="flex items-center justify-between gap-2"><span className="text-slate-400 font-semibold">Parent:</span><span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{item.parentName}</span></div><div className="flex items-center justify-between gap-2"><span className="text-slate-400 font-semibold">Email:</span><span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{item.parentEmail}</span></div></> : <div className="flex items-center justify-between gap-2"><span className="text-slate-400 font-semibold">Email:</span><span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{item.employeeEmail}</span></div>}
                <div className="flex items-center justify-between gap-2"><span className="text-slate-400 font-semibold">Submitted:</span><span className="font-bold text-slate-700 text-right">{displayDate(item.submittedAt)}</span></div>
              </div>
              <div className="pt-3 border-t border-slate-100 mt-4"><Link to={`${reviewPath}/${item.assignmentId}`} state={reviewState(item)}><Button variant="outline" className="w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-90 hover:text-white border border-[#0F2D52] transition-all duration-200" size="sm"><Eye className="mr-1 h-4 w-4" />Review Form</Button></Link></div>
            </CardContent></Card>;
          })}</div></div>}
      </CardContent>
    </div>
  </motion.div></AdminLayout>;
}
