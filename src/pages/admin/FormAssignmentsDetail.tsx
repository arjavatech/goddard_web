import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ChevronRight, Clock, FileText, Search, Users, X, XCircle } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { StatCard } from '../../components/ui/stat-card';
import { SortDropdown, SortOption, sortItems } from '../../components/ui/sort-dropdown';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { useUserContext } from '../../contexts/UserContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { fetchFormAssignmentsByTemplate, type FormAssignmentDetailItem } from '../../services/api/admin';
import { EmployeeService, fetchEmployeeFormAssignmentsByTemplate, type EmployeeFormAssignmentDetailItem } from '../../services/api/employee';

type Props = { audience: 'student' | 'employee' };

type RowItem = {
  id: string;
  name: string;
  email: string | null;
  parentName: string | null;
  parentEmail: string | null;
  classroom: string | null;
  status: string | null;
  parentId: string | null;
  childId: string | null;
  employeeId: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  incomplete: 'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-blue-50 text-blue-700',
  manually_uploaded: 'bg-purple-50 text-purple-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const SORT_OPTIONS: SortOption[] = [
  { label: 'Name A–Z', sortBy: 'name', sortOrder: 'asc' },
  { label: 'Name Z–A', sortBy: 'name', sortOrder: 'desc' },
  { label: 'Status A–Z', sortBy: 'status', sortOrder: 'asc' },
  { label: 'Status Z–A', sortBy: 'status', sortOrder: 'desc' },
];
const SORT_LABELS: Record<string, string> = { name: 'Name', status: 'Status' };

const STATUS_OPTIONS_STUDENT = ['incomplete', 'in_progress', 'completed', 'manually_uploaded', 'approved', 'rejected'];
const STATUS_OPTIONS_EMPLOYEE = ['incomplete', 'in_progress', 'completed', 'manually_uploaded', 'approved', 'rejected'];

function initials(name: string) {
  return name.split(' ').map(n => n[0] ?? '').slice(0, 2).join('').toUpperCase();
}

function mapStudentItem(item: FormAssignmentDetailItem): RowItem {
  return {
    id: item.id,
    name: item.student_name,
    email: item.parent_email,
    parentName: item.parent_name,
    parentEmail: item.parent_email,
    classroom: item.classroom_name ?? null,
    status: item.status ?? null,
    parentId: item.parent_id ?? null,
    childId: item.child_id,
    employeeId: null,
  };
}

function mapEmployeeItem(item: EmployeeFormAssignmentDetailItem): RowItem {
  return {
    id: item.id,
    name: item.employee_name,
    email: item.employee_email ?? null,
    parentName: null,
    parentEmail: null,
    classroom: null,
    status: item.status ?? null,
    parentId: null,
    childId: null,
    employeeId: item.employee_id,
  };
}

export function FormAssignmentsDetail({ audience }: Props) {
  const { schoolSlug, formId } = useParams<{ schoolSlug: string; formId: string }>();
  const navigate = useNavigate();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;

  const [formName, setFormName] = useState<string | null>(null);
  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = usePageSize(`form-assignments-${audience}`, 25);

  useEffect(() => {
    if (!schoolId || !formId) return;
    setLoading(true);
    if (audience === 'student') {
      Promise.all([
        fetchFormTemplates(schoolId),
        fetchFormAssignmentsByTemplate(schoolId, formId),
      ]).then(([templates, items]) => {
        const tpl = templates.find(t => t.id === formId);
        setFormName(tpl?.formName ?? null);
        setRows(items.map(mapStudentItem));
      }).finally(() => setLoading(false));
    } else {
      Promise.all([
        EmployeeService.fetchEmployeeFormTemplates(schoolId),
        fetchEmployeeFormAssignmentsByTemplate(schoolId, formId),
      ]).then(([templates, items]) => {
        const tpl = templates.find(t => t.id === formId);
        setFormName(tpl?.formName ?? null);
        setRows(items.map(mapEmployeeItem));
      }).finally(() => setLoading(false));
    }
  }, [schoolId, formId, audience]);

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.parentName ?? '').toLowerCase().includes(q) ||
        (r.parentEmail ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter(r => r.status === statusFilter);
    return sortItems(result, sortBy, sortOrder, (item, key) => (item as Record<string, unknown>)[key] ?? '');
  }, [rows, search, statusFilter, sortBy, sortOrder]);

  const { currentPage, totalPages, paginatedData, setCurrentPage } = usePagination({ data: filtered, itemsPerPage });

  const counts = useMemo(() => ({
    total: rows.length,
    incomplete: rows.filter(r => r.status === 'incomplete').length,
    submitted: rows.filter(r => r.status === 'in_progress' || r.status === 'completed' || r.status === 'manually_uploaded').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  }), [rows]);

  const handleRowClick = (item: RowItem) => {
    if (audience === 'student' && item.parentId) {
      navigate(`/${schoolSlug}/admin/parents/${item.parentId}?childId=${item.childId}`);
    } else if (audience === 'employee' && item.employeeId) {
      navigate(`/${schoolSlug}/admin/employees/${item.employeeId}`);
    }
  };

  const backPath = `/${schoolSlug}/admin/${audience === 'student' ? 'forms' : 'employee-forms'}`;
  const statusOptions = audience === 'student' ? STATUS_OPTIONS_STUDENT : STATUS_OPTIONS_EMPLOYEE;
  const colSpan = audience === 'student' ? 6 : 4;

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={() => navigate(backPath)} className="rounded-xl shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" />Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold text-[#0F2D52] truncate">
                {loading && !formName ? 'Loading...' : (formName ?? 'Form Assignments')}
              </h1>
            </div>
            <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${audience === 'student' ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'bg-purple-50 text-purple-700'}`}>
              {audience === 'student' ? 'Students' : 'Employees'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <StatCard label="Total" value={counts.total} icon={Users} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" />
          <StatCard label="Incomplete" value={counts.incomplete} icon={Clock} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" />
          <StatCard label="Submitted" value={counts.submitted} icon={FileText} iconBgClass="bg-blue-50" iconColorClass="text-blue-600" />
          <StatCard label="Approved" value={counts.approved} icon={CheckCircle} iconBgClass="bg-emerald-50" iconColorClass="text-emerald-600" />
          <StatCard label="Rejected" value={counts.rejected} icon={XCircle} iconBgClass="bg-rose-50" iconColorClass="text-rose-600" />
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">

          {/* Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${search ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder={`Search ${audience === 'student' ? 'students or parents' : 'employees'}...`}
                  className="pl-10 pr-8 h-9 transition-all rounded-xl focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white border-slate-200 text-sm placeholder:text-slate-400"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                />
                {search && (
                  <button
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => { setSearch(''); setCurrentPage(1); }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Select
                value={statusFilter || 'all'}
                onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setCurrentPage(1); }}
              >
                <SelectTrigger className="h-9 w-full sm:w-48 rounded-xl border-slate-200 bg-white text-sm shadow-none focus:ring-0">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map(s => (
                    <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SortDropdown
                currentSortBy={sortBy}
                currentSortOrder={sortOrder}
                options={SORT_OPTIONS}
                labels={SORT_LABELS}
                onSort={(by, order) => { setSortBy(by); setSortOrder(order); }}
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  {audience === 'student' ? (
                    <>
                      <th className="p-4 font-bold">Student</th>
                      <th className="p-4 font-bold">Parent Name</th>
                      <th className="p-4 font-bold">Parent Email</th>
                      <th className="p-4 font-bold">Class</th>
                    </>
                  ) : (
                    <>
                      <th className="p-4 font-bold">Employee</th>
                      <th className="p-4 font-bold">Email</th>
                    </>
                  )}
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={colSpan} className="p-12 text-center text-slate-500">Loading assignments...</td>
                  </tr>
                ) : paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="p-12 text-center text-slate-400">
                      {search || statusFilter ? 'No matching assignments.' : 'No assignments yet.'}
                    </td>
                  </tr>
                ) : paginatedData.map(item => {
                  const isNavigable = audience === 'student' ? !!item.parentId : !!item.employeeId;
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-slate-50 transition-colors duration-150 ${isNavigable ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''}`}
                      onClick={() => handleRowClick(item)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#044ba0] text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
                            {initials(item.name)}
                          </div>
                          <span className="font-bold text-slate-900">{item.name}</span>
                        </div>
                      </td>
                      {audience === 'student' ? (
                        <>
                          <td className="p-4 text-slate-700">{item.parentName ?? '—'}</td>
                          <td className="p-4 text-slate-500 text-xs">{item.parentEmail ?? '—'}</td>
                          <td className="p-4 text-slate-600">{item.classroom ?? '—'}</td>
                        </>
                      ) : (
                        <td className="p-4 text-slate-500 text-xs">{item.email ?? '—'}</td>
                      )}
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLORS[item.status ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                          {item.status ? item.status.replace('_', ' ') : '—'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {isNavigable && <ChevronRight className="h-4 w-4 text-slate-300 inline-block" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filtered.length}
                itemsPerPage={itemsPerPage}
                onPageSizeChange={setItemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
