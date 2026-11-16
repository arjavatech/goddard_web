import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { RequestService, type Request, type RequestExpenseData, type ExpenseRecord } from '../../services/api/requests';
import { fetchRequestSettings } from '../../services/api/settings';
import { fetchClassrooms, fetchAdminUsers, type Classroom, type AdminUser } from '../../services/api/admin';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, Legend
} from 'recharts';
import {
  DollarSign, ShoppingBag, Clock, Play, CheckCircle2,
  TrendingUp, RefreshCw, Layers, Users, School,
  PieChart as PieIcon, ListCollapse, Plus, LayoutGrid, TableProperties, Search, X, Filter, ImageIcon,
  Pencil, Trash2, MoreHorizontal, FileText
} from 'lucide-react';
import { MultiFileUpload } from '../../components/admin/MultiFileUpload';
import { SuperAdminLayout } from './SuperAdminLayout';
import { AdminLayout } from '../admin/AdminLayout';

const COLORS = ['#0F2D52', '#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function StatCard({
  label, value, sub, icon: Icon, color, delay
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string; delay: number;
}) {
  const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
    slate:   { bg: 'bg-slate-50',   icon: 'text-slate-500',   text: 'text-slate-800' },
    amber:   { bg: 'bg-amber-50',   icon: 'text-amber-500',   text: 'text-amber-700' },
    blue:    { bg: 'bg-blue-50',    icon: 'text-blue-500',    text: 'text-blue-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-500', text: 'text-emerald-700' },
  };
  const c = colorMap[color];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="h-full">
      <Card className="border border-slate-100 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`text-2xl font-black ${c.text}`}>{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
              <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-3">{sub}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Cash', 'Check', 'Bank Transfer', 'Other'];
const SCOPES = ['classroom', 'teacher', 'school'] as const;

type AddExpenseForm = {
  item: string;
  requesterName: string;
  scope: 'classroom' | 'teacher' | 'school';
  classroomName: string;
  teacherName: string;
  category: string;
  quantity: string;
  location: string;
  productLink: string;
  notes: string;
  amountSpent: string;
  paymentMethod: string;
  paymentMethodOther: string;
  purchaseDate: string;
  paymentNotes: string;
};

const EMPTY_FORM: AddExpenseForm = {
  item: '', requesterName: '', scope: 'school',
  classroomName: '', teacherName: '', category: 'Classroom Supplies',
  quantity: '1', location: '', productLink: '', notes: '',
  amountSpent: '', paymentMethod: 'Credit Card', paymentMethodOther: '',
  purchaseDate: new Date().toISOString().slice(0, 10), paymentNotes: ''
};

type EditExpenseForm = {
  item: string;
  quantity: string;
  category: string;
  scope: 'classroom' | 'teacher' | 'school';
  classroomName: string;
  teacherName: string;
  location: string;
  productLink: string;
  notes: string;
  amountSpent: string;
  paymentMethod: string;
  paymentNotes: string;
  purchaseDate: string;
};

const EMPTY_EDIT_FORM: EditExpenseForm = {
  item: '', quantity: '1', category: '', scope: 'school',
  classroomName: '', teacherName: '', location: '', productLink: '',
  notes: '', amountSpent: '', paymentMethod: 'Credit Card',
  paymentNotes: '', purchaseDate: '',
};

export function SuperAdminExpenses() {
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const [requests, setRequests] = useState<Request[]>([]);
  const [expenseData, setExpenseData] = useState<RequestExpenseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState<AddExpenseForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [billFiles, setBillFiles] = useState<File[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [ledgerView, setLedgerView] = useState<'cards' | 'table'>('table');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [ledgerSortConfig, setLedgerSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [ledgerScopeFilter, setLedgerScopeFilter] = useState<string>('all');
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<string>('all');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editExpenseStep, setEditExpenseStep] = useState<'details' | 'payment'>('details');
  const [editForm, setEditForm] = useState<EditExpenseForm>(EMPTY_EDIT_FORM);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [editBillFiles, setEditBillFiles] = useState<File[]>([]);
  const [deletedBillUrls, setDeletedBillUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const activeFilterCount = (ledgerSortConfig ? 1 : 0) + (ledgerScopeFilter !== 'all' ? 1 : 0) + (ledgerCategoryFilter !== 'all' ? 1 : 0);

  const loadData = async () => {
    if (!userData?.schoolId) return;
    setLoading(true);
    try {
      const [reqList, data, requestSettings, classroomList, empList, adminList] = await Promise.all([
        RequestService.fetchRequests(userData.schoolId),
        RequestService.fetchExpenseData(userData.schoolId),
        fetchRequestSettings(userData.schoolId),
        fetchClassrooms(userData.schoolId),
        EmployeeService.fetchEmployees(userData.schoolId),
        fetchAdminUsers(userData.schoolId)
      ]);
      setRequests(reqList);
      setExpenseData(data);
      setCategories(requestSettings.requestCategories.map(item => item.label));
      setLocationOptions(requestSettings.location.map(item => item.label));
      setClassrooms(classroomList);
      const activeEmployees = empList.filter(e => e.status === 'active');
      const adminsAsEmployees: Employee[] = adminList.map(admin => ({
        id: admin.id,
        userId: admin.id,
        firstName: admin.first_name,
        lastName: admin.last_name,
        email: admin.email,
        phone: '',
        address: '',
        employeeType: admin.role,
        joinedOn: '',
        schoolId: admin.school_id,
        status: 'active'
      }));
      setEmployees([...activeEmployees, ...adminsAsEmployees]);
    } catch {
      showToast('error', 'Failed to load expense metrics.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userData?.schoolId]);

  const handleOpenModal = () => {
    const currentUserName = userData
      ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Admin User'
      : 'Admin User';
    setForm({ ...EMPTY_FORM, requesterName: currentUserName });
    setShowAddModal(true);
    setStep(1);
  };

  const handleAddExpense = async () => {
    if (!form.item.trim() || !form.amountSpent || !form.requesterName.trim()) {
      showToast('error', 'Item, requester name, and amount are required.', 'Validation');
      return;
    }
    if (form.scope === 'classroom' && !form.classroomName.trim()) {
      showToast('error', 'Please select a classroom.', 'Validation');
      return;
    }
    if (form.scope === 'teacher' && !form.teacherName.trim()) {
      showToast('error', 'Please enter a teacher name.', 'Validation');
      return;
    }
    if (form.paymentMethod === 'Other' && !form.paymentMethodOther.trim()) {
      showToast('error', 'Please specify a payment method.', 'Validation');
      return;
    }
    setSaving(true);
    try {
      const paidByName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Admin'
        : 'Admin';
      const paidByUserId = userData?.parentId || undefined;
      await RequestService.recordExpense({
        requestId: `manual-${Date.now()}`,
        schoolId: userData?.schoolId || '00000000-0000-0000-0000-000000000000',
        item: form.item.trim(),
        requesterName: form.requesterName.trim(),
        requesterRole: (userData?.role ?? 'superadmin') as 'admin' | 'superadmin',
        scope: form.scope,
        category: form.category,
        quantity: parseInt(form.quantity) || 1,
        location: form.location || undefined,
        productLink: form.productLink || undefined,
        notes: form.notes || undefined,
        classroomName: form.scope === 'classroom' ? form.classroomName : undefined,
        teacherName: form.scope === 'teacher' ? form.teacherName : undefined,
        amountSpent: parseFloat(form.amountSpent),
        paymentMethod: form.paymentMethod === 'Other' ? form.paymentMethodOther.trim() : form.paymentMethod,
        purchaseDate: form.purchaseDate,
        paymentNotes: form.paymentNotes || undefined,
        paidByName,
        paidByUserId,
      }, billFiles.length > 0 ? billFiles : undefined);
      showToast('success', 'Expense added successfully.', 'Added');
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      setBillFiles([]);
      setStep(1);
      await loadData();
    } catch {
      showToast('error', 'Failed to add expense.', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (expense: ExpenseRecord) => {
    setEditingExpense(expense);
    setEditForm({
      item: expense.item,
      quantity: String(expense.quantity),
      category: expense.category || '',
      scope: expense.scope,
      classroomName: expense.classroomName || '',
      teacherName: expense.teacherName || '',
      location: expense.location || '',
      productLink: expense.productLink || '',
      notes: expense.notes || '',
      amountSpent: String(expense.amountSpent),
      paymentMethod: expense.paymentMethod,
      paymentNotes: expense.paymentNotes || '',
      purchaseDate: expense.purchaseDate,
    });
    setEditBillFiles([]);
    setDeletedBillUrls([]);
    setEditExpenseStep('details');
    setIsEditModalOpen(true);
  };

  const runEditSave = async () => {
    if (!editingExpense) return;
    if (!editForm.item.trim() || !editForm.amountSpent) {
      showToast('error', 'Item and amount are required.', 'Validation');
      return;
    }
    setSubmitting(true);
    try {
      const remainingBillUrls = (editingExpense.billImageUrls ?? []).filter(u => !deletedBillUrls.includes(u));
      await RequestService.updateExpense(editingExpense.id, {
        item: editForm.item.trim(),
        quantity: parseInt(editForm.quantity) || 1,
        category: editForm.category || null,
        scope: editForm.scope,
        classroomName: editForm.scope === 'classroom' ? editForm.classroomName : null,
        teacherName: editForm.scope === 'teacher' ? editForm.teacherName : null,
        location: editForm.location || null,
        productLink: editForm.productLink || null,
        notes: editForm.notes || null,
        amountSpent: parseFloat(editForm.amountSpent),
        paymentMethod: editForm.paymentMethod,
        purchaseDate: editForm.purchaseDate,
        paymentNotes: editForm.paymentNotes || null,
        billImageUrls: remainingBillUrls,
      }, editBillFiles.length > 0 ? editBillFiles : undefined);
      showToast('success', 'Expense updated successfully.', 'Expense Updated');
      setIsEditModalOpen(false);
      setEditingExpense(null);
      await loadData();
    } catch {
      showToast('error', 'Could not update expense. Please try again.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setSubmitting(true);
    try {
      await RequestService.deleteExpense(expenseToDelete.id);
      showToast('success', 'Expense deleted successfully.', 'Expense Deleted');
      setExpenseToDelete(null);
      await loadData();
    } catch {
      showToast('error', 'Could not delete expense. Please try again.', 'Delete Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const totalRequests    = requests.length;
  const pendingRequests  = requests.filter(r => r.status === 'Pending').length;
  const inProgressRequests = requests.filter(r => r.status === 'In Progress').length;
  const completedRequests  = requests.filter(r => r.status === 'Completed').length;

  const summary = expenseData?.summary;
  const totalSpent = summary?.totalSpent ?? 0;
  const classroomSpendingData = (summary?.byClassroom ?? []).map(i => ({ name: i.name, value: i.amount })).filter(i => i.value > 0);
  const teacherSpendingData   = (summary?.byTeacher ?? []).map(i => ({ name: i.name, value: i.amount })).filter(i => i.value > 0);
  const scopeSpendingData     = (summary?.byScope ?? []).map(i => ({ name: i.name, value: i.amount })).filter(i => i.value > 0);
  const categorySpendingData  = (summary?.byCategory ?? []).map(i => ({ name: i.name, value: i.amount })).filter(i => i.value > 0);
  const schoolWideSpent = scopeSpendingData.filter(i => i.name === 'Entire School').reduce((s, i) => s + i.value, 0);
  const completedList = expenseData?.expenses ?? [];
  
  const searchedAndFilteredList = completedList.filter(exp => {
    const matchesSearch = 
      exp.item.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) || 
      exp.requesterName.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
      (exp.category && exp.category.toLowerCase().includes(ledgerSearchTerm.toLowerCase()));
    
    const matchesScope = ledgerScopeFilter === 'all' || exp.scope === ledgerScopeFilter;
    const matchesCategory = ledgerCategoryFilter === 'all' || exp.category === ledgerCategoryFilter;
    
    return matchesSearch && matchesScope && matchesCategory;
  });

  const filteredCompletedList = [...searchedAndFilteredList].sort((a: any, b: any) => {
    if (!ledgerSortConfig) return 0;
    const { key, direction } = ledgerSortConfig;
    const aVal = a[key] ?? '';
    const bVal = b[key] ?? '';
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  const {
    currentPage: ledgerPage,
    totalPages: ledgerTotalPages,
    paginatedData: paginatedExpenses,
    itemsPerPage: ledgerItemsPerPage,
    setCurrentPage: setLedgerPage,
  } = usePagination({ data: filteredCompletedList, itemsPerPage: recordsPerPage });

  const clearAllFilters = () => {
    setLedgerSortConfig(null);
    setLedgerScopeFilter('all');
    setLedgerCategoryFilter('all');
    setLedgerPage(1);
  };

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#fff', borderRadius: '10px',
      border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      fontSize: '12px'
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-14 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0F2D52] flex items-center justify-center">
                <PieIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Procurement Expense Dashboard</h1>
            </div>
            <p className="text-xs text-slate-500 ml-10.5">
              Track and analyze material spending across classrooms, teachers, and categories.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {userData?.role !== 'admin' && (
              <Button
                onClick={handleOpenModal}
                className="h-9 px-4 rounded-xl bg-[#0F2D52] hover:bg-[#1a3d6e] text-white text-xs font-semibold gap-2"
              >
                <Plus className="h-3.5 w-3.5" /> Add Expense
              </Button>
            )}
            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="h-9 px-4 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold gap-2"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

            {/* Hero card — Total Spent */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="h-full">
              <Card className="border-0 rounded-2xl overflow-hidden bg-[#0F2D52] text-white shadow-lg relative h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F2D52] via-[#1a3d6e] to-[#0a1f3a]" />
                <div className="absolute -right-6 -bottom-6 opacity-[0.07]">
                  <DollarSign className="w-32 h-32" />
                </div>
                <CardContent className="relative p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Total Spent</p>
                  <p className="text-2xl font-black text-white mt-2">${fmt(totalSpent)}</p>
                  <div className="flex items-center gap-1 mt-3 text-[10px] font-semibold text-emerald-300">
                    <TrendingUp className="w-3 h-3" /> Verified & Reconciled
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <StatCard label="Total Requests"    value={totalRequests}    sub="Across all locations"    icon={ShoppingBag}   color="slate"   delay={0.1}  />
            <StatCard label="Pending"           value={pendingRequests}  sub="Awaiting validation"     icon={Clock}         color="amber"   delay={0.15} />
            <StatCard label="In Progress"       value={inProgressRequests} sub="Pending final purchase" icon={Play}         color="blue"    delay={0.2}  />
            <StatCard label="Completed"         value={completedRequests} sub="Procured & closed"      icon={CheckCircle2}  color="emerald" delay={0.25} />

          </div>
        )}

        {/* ── Charts ── */}
        {!loading && (
          <div className="space-y-6">

            {/* Charts (4 Charts in 2x2 Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <DonutCard
                title="Classroom-wise Spending"
                icon={School}
                data={classroomSpendingData}
                totalSpent={totalSpent}
                colorOffset={0}
              />

              <PieChartCard
                title="Teacher-wise Spending"
                icon={Users}
                data={teacherSpendingData}
                totalSpent={totalSpent}
                colorOffset={2}
              />

              <BarChartCard
                title="Combined Spending"
                icon={Layers}
                data={scopeSpendingData}
                isCurrency={true}
                colorOffset={4}
                tooltipLabel="Spending"
              />

              <LollipopChartCard
                title="Requests by Role"
                icon={Users}
                data={[
                  { name: 'Employee', value: requests.filter(r => r.requesterRole === 'employee').length },
                  { name: 'Admin', value: requests.filter(r => r.requesterRole === 'admin').length },
                  { name: 'Super Admin', value: requests.filter(r => r.requesterRole === 'superadmin').length }
                ].filter(i => i.value > 0)}
                isCurrency={false}
                colorOffset={1}
                tooltipLabel="Requests"
              />

            </div>

            {/* Ledger Section Header */}
            <div className="flex items-center gap-2 mb-2 mt-8">
              <ListCollapse className="w-5 h-5 text-[#0F2D52]" />
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Spending Ledger</h2>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
              <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search ledger by item, requester or category..."
                    value={ledgerSearchTerm}
                    onChange={e => { setLedgerSearchTerm(e.target.value); setLedgerPage(1); }}
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] transition-colors"
                  />
                  {ledgerSearchTerm && (
                    <button
                      onClick={() => { setLedgerSearchTerm(''); setLedgerPage(1); }}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(prev => !prev)}
                    size="sm"
                    className="h-10 rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all duration-200 relative font-bold text-xs px-3 sm:px-4 flex-shrink-0"
                  >
                    {showFilters ? <X className="h-4 w-4 sm:mr-1.5" /> : <Filter className="h-4 w-4 sm:mr-1.5" />}
                    <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
                    {!showFilters && activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F2D52] text-[9px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={loadData}
                    disabled={loading}
                    className="rounded-xl h-10 w-10 flex-shrink-0 border-slate-200 hover:bg-slate-50"
                    title="Refresh list"
                  >
                    <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Collapsible Filter Area */}
              {showFilters && (
                <div className="p-4 border-t border-slate-50 bg-slate-50/50">
                  {activeFilterCount > 0 && (
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                        {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                      </span>
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 rounded-lg bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs">
                        <X className="h-3.5 w-3.5 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-slate-500">Sort By</label>
                      <select
                        value={ledgerSortConfig ? `${ledgerSortConfig.key}-${ledgerSortConfig.direction}` : 'default'}
                        onChange={e => {
                          if (e.target.value === 'default') {
                            setLedgerSortConfig(null);
                          } else {
                            const [key, direction] = e.target.value.split('-');
                            setLedgerSortConfig({ key, direction: direction as 'asc' | 'desc' });
                          }
                          setLedgerPage(1);
                        }}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52]"
                      >
                        <option value="default">Default Sort</option>
                        <option value="purchaseDate-desc">Date (Newest)</option>
                        <option value="purchaseDate-asc">Date (Oldest)</option>
                        <option value="amountSpent-desc">Amount (High-Low)</option>
                        <option value="amountSpent-asc">Amount (Low-High)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-slate-500">Scope</label>
                      <select
                        value={ledgerScopeFilter}
                        onChange={e => { setLedgerScopeFilter(e.target.value); setLedgerPage(1); }}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                      >
                        <option value="all">All Scopes</option>
                        <option value="school">School</option>
                        <option value="classroom">Class</option>
                        <option value="teacher">Employee</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium text-slate-500">Category</label>
                      <select
                        value={ledgerCategoryFilter}
                        onChange={e => { setLedgerCategoryFilter(e.target.value); setLedgerPage(1); }}
                        className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                      >
                        <option value="all">All Categories</option>
                        <option value="Classroom Supplies">Classroom Supplies</option>
                        <option value="STEM & Toys">STEM & Toys</option>
                        <option value="Books & Learning">Books & Learning</option>
                        <option value="Office & Equipment">Office & Equipment</option>
                        <option value="Play & Outdoor">Play & Outdoor</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Count + View Toggle */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="text-sm font-medium text-slate-600">
                Showing <span className="font-bold text-slate-900">{filteredCompletedList.length}</span> txns
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={recordsPerPage} onChange={e => { setRecordsPerPage(Number(e.target.value)); setLedgerPage(1); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2D52] bg-white text-slate-700 h-9">
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                  <button onClick={() => setLedgerView('cards')}
                    className={`rounded-md p-1.5 transition-colors ${ledgerView === 'cards' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button onClick={() => setLedgerView('table')}
                    className={`rounded-md p-1.5 transition-colors ${ledgerView === 'table' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                    <TableProperties className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ledger Content */}
            <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardContent className={ledgerView === 'table' ? 'p-0 overflow-x-auto' : 'p-3 sm:p-4'}>
                {filteredCompletedList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    No completed purchases matched your criteria.
                  </div>
                ) : ledgerView === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {paginatedExpenses.map((expense) => (
                      <div key={expense.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 line-clamp-2">{expense.item}</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">{expense.category || 'Classroom Supplies'}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">${expense.amountSpent.toFixed(2)}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 flex-shrink-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpenEdit(expense); }}>
                                  <Pencil className="w-3.5 h-3.5 mr-2 text-slate-400" /> Edit Expense
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={e => { e.stopPropagation(); setExpenseToDelete(expense); }} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Expense
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
                          <div><p className="text-slate-400">Requester</p><p className="font-medium text-slate-700 truncate">{expense.requesterName}</p></div>
                          <div><p className="text-slate-400">Target</p><p className="font-medium text-slate-700 truncate">{expense.scope === 'classroom' ? expense.classroomName : expense.scope === 'teacher' ? expense.teacherName : 'Entire School'}</p></div>
                          <div><p className="text-slate-400">Payment</p><p className="font-medium text-slate-700 truncate">{expense.paymentMethod}</p></div>
                          <div><p className="text-slate-400">Purchase date</p><p className="font-medium text-slate-700">{expense.purchaseDate}</p></div>
                          {expense.paidByName && (
                            <div className="col-span-2">
                              <p className="text-slate-400">Completed By</p>
                              <p className="font-medium text-slate-700 truncate">{expense.paidByName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {['Item', 'Requester', 'Scope / Target', 'Payment', 'Date', 'Completed By', 'Amount', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap last:text-right">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedExpenses.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-slate-800">{req.item}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{req.category || 'Classroom Supplies'}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-700">{req.requesterName}</p>
                            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">{req.requesterRole}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {req.scope === 'classroom' && <span>Classroom: <b className="text-slate-700">{req.classroomName}</b></span>}
                            {req.scope === 'teacher'   && <span>Teacher: <b className="text-slate-700">{req.teacherName}</b></span>}
                            {req.scope === 'school'    && <span className="text-slate-400 italic">Entire School</span>}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-600">{req.paymentMethod}</td>
                          <td className="px-5 py-3.5 text-slate-500">{req.purchaseDate}</td>
                          <td className="px-5 py-3.5 text-slate-500">{req.paidByName || <span className="text-slate-300">—</span>}</td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-bold text-emerald-700 text-sm">${req.amountSpent?.toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" aria-label="Edit expense" onClick={() => handleOpenEdit(req)}
                                className="h-7 w-7 p-0 rounded-lg hover:border-[#0F2D52] hover:text-[#0F2D52]">
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="outline" size="sm" aria-label="Delete expense" onClick={() => setExpenseToDelete(req)}
                                className="h-7 w-7 p-0 rounded-lg text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
              {filteredCompletedList.length > 0 && (
                <Pagination
                  currentPage={ledgerPage}
                  totalPages={ledgerTotalPages}
                  totalItems={filteredCompletedList.length}
                  itemsPerPage={ledgerItemsPerPage}
                  onPageChange={setLedgerPage}
                />
              )}
            </Card>

          </div>
        )}
      </div>
      {/* Add Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-[95vw] max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Add New Expense</DialogTitle>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 1 ? 'text-[#0F2D52]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 1 ? 'bg-[#0F2D52] text-white' : 'bg-slate-200 text-slate-500'}`}>1</span>
              Request Details
            </div>
            <div className="w-12 h-px bg-slate-200" />
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 2 ? 'text-[#0F2D52]' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === 2 ? 'bg-[#0F2D52] text-white' : 'bg-slate-200 text-slate-500'}`}>2</span>
              Payment
            </div>
          </div>

          <div className="space-y-3 py-1">
            {/* STEP 1: Request Details */}
            {step === 1 && (
              <>
                {/* Item & Product Link */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item *</label>
                  <Input value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="e.g. Crayola Crayons" className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Product Link (optional)</label>
                  <Input value={form.productLink} onChange={e => setForm(f => ({ ...f, productLink: e.target.value }))} placeholder="https://example.com/product" className="mt-1 h-9 text-sm" />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quantity</label>
                  <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1 h-9 text-sm" />
                </div>

                {/* Scope */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scope</label>
                  <div className="flex gap-2 mt-1">
                    {SCOPES.map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, scope: s }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          form.scope === s ? 'bg-[#0F2D52] text-white border-[#0F2D52]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}>
                        {s === 'classroom' ? 'Classroom' : s === 'teacher' ? 'Teacher' : 'School-wide'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.scope === 'classroom' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Classroom Name <span className="text-red-500">*</span></label>
                    <select
                      value={form.classroomName}
                      onChange={e => setForm(f => ({ ...f, classroomName: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20"
                    >
                      <option value="">Select classroom...</option>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {form.scope === 'teacher' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Teacher Name <span className="text-red-500">*</span></label>
                    <select
                      value={form.teacherName}
                      onChange={e => setForm(f => ({ ...f, teacherName: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20"
                    >
                      <option value="">Select teacher / admin...</option>
                      {employees.map(e => (
                        <option key={e.id} value={`${e.firstName} ${e.lastName}`}>
                          {e.firstName} {e.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Location & Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Location (optional)</label>
                  <select value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20">
                    <option value="">Select location</option>
                    {locationOptions.map(loc => <option key={loc}>{loc}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes (optional)</label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Item details, specifications, etc." className="mt-1 h-9 text-sm" />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20">
                    <option value="">Select category</option>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* STEP 2: Payment */}
            {step === 2 && (
              <>
                {/* Payment Method */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value, paymentMethodOther: '' }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20">
                    {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                  {form.paymentMethod === 'Other' && (
                    <Input
                      value={form.paymentMethodOther}
                      onChange={e => setForm(f => ({ ...f, paymentMethodOther: e.target.value }))}
                      placeholder="Specify payment method"
                      className="mt-2 h-9 text-sm"
                    />
                  )}
                </div>

                {/* Amount & Purchase Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount Spent ($) *</label>
                    <Input type="number" min={0} step={0.01} value={form.amountSpent} onChange={e => setForm(f => ({ ...f, amountSpent: e.target.value }))} placeholder="0.00" className="mt-1 h-9 text-sm" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase Date</label>
                    <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="mt-1 h-9 text-sm" />
                  </div>
                </div>

                {/* Payment Notes */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Notes (optional)</label>
                  <Input value={form.paymentNotes} onChange={e => setForm(f => ({ ...f, paymentNotes: e.target.value }))} placeholder="Receipt info, PO number, etc." className="mt-1 h-9 text-sm" />
                </div>

                {/* Bill/Receipt Documents */}
                <MultiFileUpload
                  files={billFiles}
                  onChange={setBillFiles}
                  label="BILL / RECEIPT DOCUMENTS (OPTIONAL)"
                />
              </>
            )}
          </div>

          {/* Validation flags */}
          {(() => {
            const step1Valid = form.item.trim().length > 0 &&
              (form.scope === 'classroom' ? form.classroomName.trim().length > 0 : form.scope === 'teacher' ? form.teacherName.trim().length > 0 : true);
            const step2Valid = parseFloat(form.amountSpent) > 0 && (form.paymentMethod !== 'Other' || form.paymentMethodOther.trim().length > 0);

            return (
              <DialogFooter className="gap-2">
                {step === 1 ? (
                  <>
                    <Button variant="outline" onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); setBillFiles([]); setStep(1); }} disabled={saving} className="rounded-xl">
                      Cancel
                    </Button>
                    <Button onClick={() => setStep(2)} disabled={!step1Valid} className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3d6e] text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      Next →
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">
                      ← Back
                    </Button>
                    <Button onClick={handleAddExpense} disabled={!step2Valid || saving} className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3d6e] text-white disabled:opacity-50 disabled:cursor-not-allowed">
                      {saving ? 'Saving…' : 'Add Expense'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={open => { setIsEditModalOpen(open); if (!open) { setEditingExpense(null); setDeletedBillUrls([]); setEditBillFiles([]); setEditExpenseStep('details'); } }}>
        <DialogContent className="w-[95vw] max-w-lg rounded-2xl max-h-[90vh] bg-white p-0 flex flex-col overflow-hidden">
          <div className="px-6 pt-6 pb-0 flex-shrink-0">
            <DialogTitle className="text-base font-bold text-slate-900">Edit Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Editing: <span className="font-semibold text-slate-700">{editingExpense?.item}</span>
            </DialogDescription>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 flex-shrink-0 ${editExpenseStep === 'details' ? 'bg-[#0F2D52] border-[#0F2D52] text-white' : 'bg-white border-[#0F2D52] text-[#0F2D52]'}`}>1</div>
              <span className={`text-[11px] font-bold ${editExpenseStep === 'details' ? 'text-[#0F2D52]' : 'text-slate-400'}`}>Item Details</span>
              <div className={`flex-1 h-px mx-1 ${editExpenseStep === 'payment' ? 'bg-[#0F2D52]' : 'bg-slate-200'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 flex-shrink-0 ${editExpenseStep === 'payment' ? 'bg-[#0F2D52] border-[#0F2D52] text-white' : 'bg-white border-slate-200 text-slate-400'}`}>2</div>
              <span className={`text-[11px] font-bold ${editExpenseStep === 'payment' ? 'text-[#0F2D52]' : 'text-slate-400'}`}>Payment & Bills</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Step 1: Item Details */}
            {editExpenseStep === 'details' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item *</label>
                  <input value={editForm.item} onChange={e => setEditForm(f => ({ ...f, item: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quantity</label>
                    <input type="number" min={1} value={editForm.quantity} onChange={e => setEditForm(f => ({ ...f, quantity: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                    <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                      <option value="">Select category</option>
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Scope</label>
                  <div className="flex gap-2 mt-1">
                    {SCOPES.map(s => (
                      <button key={s} type="button" onClick={() => setEditForm(f => ({ ...f, scope: s, classroomName: '', teacherName: '' }))}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editForm.scope === s ? 'bg-[#0F2D52] text-white border-[#0F2D52]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                        {s === 'classroom' ? 'Classroom' : s === 'teacher' ? 'Teacher' : 'School-wide'}
                      </button>
                    ))}
                  </div>
                </div>
                {editForm.scope === 'classroom' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Classroom</label>
                    <select value={editForm.classroomName} onChange={e => setEditForm(f => ({ ...f, classroomName: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                      <option value="">Select classroom...</option>
                      {classrooms.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {editForm.scope === 'teacher' && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Teacher</label>
                    <select value={editForm.teacherName} onChange={e => setEditForm(f => ({ ...f, teacherName: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                      <option value="">Select teacher / admin...</option>
                      {employees.map(e => <option key={e.id} value={`${e.firstName} ${e.lastName}`}>{e.firstName} {e.lastName}</option>)}
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Location</label>
                    <select value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                      <option value="">Select location</option>
                      {locationOptions.map(loc => <option key={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Product Link</label>
                    <input value={editForm.productLink} onChange={e => setEditForm(f => ({ ...f, productLink: e.target.value }))} placeholder="https://..."
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes</label>
                  <input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                </div>
              </div>
            )}

            {/* Step 2: Payment & Bills */}
            {editExpenseStep === 'payment' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount Spent ($) *</label>
                    <input type="number" min={0} step={0.01} value={editForm.amountSpent} onChange={e => setEditForm(f => ({ ...f, amountSpent: e.target.value }))} placeholder="0.00"
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase Date</label>
                    <input type="date" value={editForm.purchaseDate} onChange={e => setEditForm(f => ({ ...f, purchaseDate: e.target.value }))}
                      className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Method</label>
                  <select value={editForm.paymentMethod} onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none">
                    {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Notes</label>
                  <input value={editForm.paymentNotes} onChange={e => setEditForm(f => ({ ...f, paymentNotes: e.target.value }))} placeholder="Receipt info, PO number, etc."
                    className="mt-1 w-full h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20" />
                </div>
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bill / Receipt Documents</label>
                  {(editingExpense?.billImageUrls ?? []).filter(u => !deletedBillUrls.includes(u)).map((url, i) => {
                    const filename = url.split('/').pop()?.split('?')[0] || `Image ${i + 1}`;
                    const isPdf = filename.toLowerCase().endsWith('.pdf');
                    return (
                      <div key={url} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                        {isPdf ? <FileText className="w-7 h-7 text-red-400 flex-shrink-0" /> : <img src={url} alt={filename} className="w-7 h-7 rounded object-cover flex-shrink-0" />}
                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-slate-600 truncate hover:text-blue-600">{filename}</a>
                        <button type="button" onClick={() => setDeletedBillUrls(prev => [...prev, url])} className="text-slate-400 hover:text-red-500 flex-shrink-0 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  <MultiFileUpload files={editBillFiles} onChange={setEditBillFiles} maxFiles={5} maxSizeMB={5} accept="image/*,.pdf" />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-50 flex-shrink-0 bg-white rounded-b-2xl gap-2 justify-end">
            {editExpenseStep === 'payment' ? (
              <Button type="button" variant="outline" onClick={() => setEditExpenseStep('details')}
                className="rounded-xl h-10 text-xs font-semibold px-6">← Back</Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => { setIsEditModalOpen(false); setEditingExpense(null); setEditExpenseStep('details'); setDeletedBillUrls([]); setEditBillFiles([]); }}
                className="rounded-xl h-10 text-xs font-semibold px-6">Cancel</Button>
            )}
            {editExpenseStep === 'details' ? (
              <Button type="button" onClick={() => setEditExpenseStep('payment')}
                className="rounded-xl h-10 px-6 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52]">
                Next →
              </Button>
            ) : (
              <Button type="button" onClick={runEditSave} disabled={submitting}
                className="rounded-xl h-10 px-6 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52]">
                {submitting ? 'Saving…' : 'Save Changes'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirm */}
      <Dialog open={!!expenseToDelete} onOpenChange={open => { if (!open) setExpenseToDelete(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Delete Expense</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <span className="font-semibold text-slate-700">"{expenseToDelete?.item}"</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setExpenseToDelete(null)} className="rounded-xl text-xs font-semibold">Cancel</Button>
            <Button onClick={handleDeleteExpense} disabled={submitting} className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold">
              {submitting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

/* ── Helpers ── */

function EmptyChart() {
  return (
    <div className="h-60 flex items-center justify-center text-slate-400 text-xs italic">
      No data available yet.
    </div>
  );
}

function DonutCard({
  title, icon: Icon, data, totalSpent, footer, colorOffset = 0
}: {
  title: string;
  icon: React.ElementType;
  data: { name: string; value: number }[];
  totalSpent: number;
  footer?: React.ReactNode;
  colorOffset?: number;
}) {
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0F2D52]" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="h-48 w-48 sm:h-52 sm:w-52 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={4} dataKey="value">
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E2E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 w-full">
              {data.map((item, i) => {
                const pct = totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : '0.0';
                const color = COLORS[(i + colorOffset) % COLORS.length];
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium text-slate-600 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-700 ml-2">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {footer && (
                <div className="pt-3 border-t border-slate-100 text-xs">{footer}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartCard({
  title, icon: Icon, data, isCurrency = true, colorOffset = 0, tooltipLabel = 'Value'
}: {
  title: string;
  icon: React.ElementType;
  data: { name: string; value: number }[];
  isCurrency?: boolean;
  colorOffset?: number;
  tooltipLabel?: string;
}) {
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white flex flex-col">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50 flex-shrink-0">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0F2D52]" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full h-48 sm:h-52 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    tickFormatter={(val: any) => isCurrency ? `$${val}` : val}
                  />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontWeight: 600, color: '#334155' }}
                    formatter={(v: any) => isCurrency ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : v}
                  />
                  <Bar dataKey="value" name={tooltipLabel} radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PieChartCard({
  title, icon: Icon, data, totalSpent, footer, colorOffset = 0
}: {
  title: string;
  icon: React.ElementType;
  data: { name: string; value: number }[];
  totalSpent: number;
  footer?: React.ReactNode;
  colorOffset?: number;
}) {
  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0F2D52]" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="h-48 w-48 sm:h-52 sm:w-52 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data} cx="50%" cy="50%" innerRadius={0} outerRadius={85} paddingAngle={0} dataKey="value">
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[(i + colorOffset) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `$${Number(v).toFixed(2)}`} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E2E8F0' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 w-full">
              {data.map((item, i) => {
                const pct = totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : '0.0';
                const color = COLORS[(i + colorOffset) % COLORS.length];
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="font-medium text-slate-600 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-700 ml-2">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {footer && (
                <div className="pt-3 border-t border-slate-100 text-xs">{footer}</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LollipopChartCard({
  title, icon: Icon, data, colorOffset = 0
}: {
  title: string;
  icon: React.ElementType;
  data: { name: string; value: number }[];
  isCurrency?: boolean;
  colorOffset?: number;
  tooltipLabel?: string;
}) {
  const roleOrder = ['Employee', 'Admin', 'Super Admin'];
  const sortedData = [...data].sort((a, b) => {
    const idxA = roleOrder.indexOf(a.name);
    const idxB = roleOrder.indexOf(b.name);
    return (idxA !== -1 ? idxA : 999) - (idxB !== -1 ? idxB : 999);
  });

  const getSeriesColor = (name: string, index: number) => {
    if (name === 'Employee') return '#3B82F6'; // Blue
    if (name === 'Admin') return '#8B5CF6'; // Purple
    if (name === 'Super Admin') return '#0D9488'; // Teal
    return COLORS[(index + colorOffset) % COLORS.length];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      const color = getSeriesColor(dataItem.name, 0);
      return (
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }} />
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#334155' }}>
              {dataItem.name} — {dataItem.value} Requests
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const LollipopBar = (props: any) => {
    const { x, y, width, height, payload, index } = props;
    const color = getSeriesColor(payload.name, index);
    const cx = x + width / 2;
    // Don't draw the stem if value is 0 or undefined
    if (payload.value === 0) return null;
    return (
      <g>
        <line x1={cx} y1={y + height} x2={cx} y2={y + 6} stroke={color} strokeWidth={2} strokeDasharray="3 3" />
        <circle cx={cx} cy={y} r={6} fill={color} />
        <text x={cx} y={y - 12} textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600">
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white flex flex-col">
      <CardHeader className="px-5 pt-5 pb-3 border-b border-slate-50 flex-shrink-0">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0F2D52]" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col justify-center">
        {data.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="w-full h-48 sm:h-52 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#F8FAFC' }}
                    content={<CustomTooltip />}
                  />
                  <Bar dataKey="value" shape={<LollipopBar />} isAnimationActive={false}>
                    {sortedData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getSeriesColor(entry.name, index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
