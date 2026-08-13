import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { RequestService, type Request, type RequestExpenseData } from '../../services/api/requests';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import {
  DollarSign, ShoppingBag, Clock, Play, CheckCircle2,
  TrendingUp, RefreshCw, Layers, Users, School,
  PieChart as PieIcon, ListCollapse, Plus, LayoutGrid, TableProperties
} from 'lucide-react';
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="border border-slate-100 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow">
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

const CATEGORIES = ['Classroom Supplies', 'STEM & Toys', 'Books & Learning', 'Office & Equipment', 'Play & Outdoor', 'Health & Safety', 'Other'];
const PAYMENT_METHODS = ['Credit Card', 'Purchase Order', 'Cash', 'Check', 'Bank Transfer'];
const SCOPES = ['classroom', 'teacher', 'school'] as const;

type AddExpenseForm = {
  item: string;
  requesterName: string;
  scope: 'classroom' | 'teacher' | 'school';
  classroomName: string;
  teacherName: string;
  category: string;
  quantity: string;
  amountSpent: string;
  paymentMethod: string;
  purchaseDate: string;
  paymentNotes: string;
};

const EMPTY_FORM: AddExpenseForm = {
  item: '', requesterName: '', scope: 'school',
  classroomName: '', teacherName: '', category: 'Classroom Supplies',
  quantity: '1', amountSpent: '', paymentMethod: 'Credit Card',
  purchaseDate: new Date().toISOString().slice(0, 10), paymentNotes: ''
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
  const [ledgerView, setLedgerView] = useState<'cards' | 'table'>('table');
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState('');
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, data] = await Promise.all([
        RequestService.fetchRequests(),
        RequestService.fetchExpenseData()
      ]);
      setRequests(reqList);
      setExpenseData(data);
    } catch {
      showToast('error', 'Failed to load expense metrics.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddExpense = async () => {
    if (!form.item.trim() || !form.amountSpent || !form.requesterName.trim()) {
      showToast('error', 'Item, requester name, and amount are required.', 'Validation');
      return;
    }
    setSaving(true);
    try {
      await RequestService.recordExpense({
        requestId: `manual-${Date.now()}`,
        schoolId: userData?.schoolId || '00000000-0000-0000-0000-000000000000',
        item: form.item.trim(),
        requesterName: form.requesterName.trim(),
        requesterRole: 'superadmin',
        scope: form.scope,
        category: form.category,
        quantity: parseInt(form.quantity) || 1,
        classroomName: form.scope === 'classroom' ? form.classroomName : undefined,
        teacherName: form.scope === 'teacher' ? form.teacherName : undefined,
        amountSpent: parseFloat(form.amountSpent),
        paymentMethod: form.paymentMethod,
        purchaseDate: form.purchaseDate,
        paymentNotes: form.paymentNotes || undefined,
      });
      showToast('success', 'Expense added successfully.', 'Added');
      setShowAddModal(false);
      setForm(EMPTY_FORM);
      await loadData();
    } catch {
      showToast('error', 'Failed to add expense.', 'Error');
    } finally {
      setSaving(false);
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
  const filteredCompletedList = completedList.filter(exp => 
    exp.item.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) || 
    exp.requesterName.toLowerCase().includes(ledgerSearchTerm.toLowerCase()) ||
    (exp.category && exp.category.toLowerCase().includes(ledgerSearchTerm.toLowerCase()))
  );

  const {
    currentPage: ledgerPage,
    totalPages: ledgerTotalPages,
    paginatedData: paginatedExpenses,
    itemsPerPage: ledgerItemsPerPage,
    setCurrentPage: setLedgerPage,
  } = usePagination({ data: filteredCompletedList, itemsPerPage: recordsPerPage });

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: '#fff', borderRadius: '10px',
      border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
      fontSize: '12px'
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto px-4 sm:px-6 py-8 space-y-8 mt-10">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            <Button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 rounded-xl bg-[#0F2D52] hover:bg-[#1a3d6e] text-white text-xs font-semibold gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </Button>
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
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-0 rounded-2xl overflow-hidden bg-[#0F2D52] text-white shadow-lg relative lg:col-span-1">
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

              <DonutCard
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

              <BarChartCard
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

            {/* Ledger Table */}
            <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardHeader className="px-4 sm:px-5 pt-5 pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <ListCollapse className="w-4 h-4 text-[#0F2D52]" /> Spending Ledger
                </CardTitle>
                <div className="flex flex-col sm:flex-row w-full sm:w-auto items-start sm:items-center justify-between sm:justify-end gap-3 sm:gap-2 mt-3 sm:mt-0">
                  <div className="relative w-full sm:w-48 lg:w-64">
                    <input
                      type="text"
                      placeholder="Search ledger..."
                      value={ledgerSearchTerm}
                      onChange={e => setLedgerSearchTerm(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0F2D52] transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={recordsPerPage}
                      onChange={e => setRecordsPerPage(Number(e.target.value))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2D52] bg-white text-slate-700"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5" aria-label="Ledger view">
                      <button
                        type="button"
                        onClick={() => setLedgerView('cards')}
                        aria-label="Show card view"
                        title="Card view"
                        className={`rounded-md p-1.5 transition-colors ${ledgerView === 'cards' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerView('table')}
                        aria-label="Show table view"
                        title="Table view"
                        className={`rounded-md p-1.5 transition-colors ${ledgerView === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <TableProperties className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                      {filteredCompletedList.length} txns
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={ledgerView === 'table' ? 'p-0 overflow-x-auto' : 'p-3 sm:p-4'}>
                {filteredCompletedList.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    No completed purchases matched your criteria.
                  </div>
                ) : ledgerView === 'cards' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {paginatedExpenses.map((expense) => (
                      <div key={expense.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-slate-800 line-clamp-2">{expense.item}</p>
                            <p className="mt-1 text-[10px] font-medium text-slate-400">{expense.category || 'Classroom Supplies'}</p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">${expense.amountSpent.toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-[11px]">
                          <div><p className="text-slate-400">Requester</p><p className="font-medium text-slate-700 truncate">{expense.requesterName}</p></div>
                          <div><p className="text-slate-400">Target</p><p className="font-medium text-slate-700 truncate">{expense.scope === 'classroom' ? expense.classroomName : expense.scope === 'teacher' ? expense.teacherName : 'Entire School'}</p></div>
                          <div><p className="text-slate-400">Payment</p><p className="font-medium text-slate-700 truncate">{expense.paymentMethod}</p></div>
                          <div><p className="text-slate-400">Purchase date</p><p className="font-medium text-slate-700">{expense.purchaseDate}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {['Item', 'Requester', 'Scope / Target', 'Payment', 'Date', 'Amount'].map(h => (
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
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-bold text-emerald-700 text-sm">${req.amountSpent?.toFixed(2)}</span>
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

          <div className="space-y-3 py-1">
            {/* Item & Requester */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Item *</label>
                <Input value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} placeholder="e.g. Crayola Crayons" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Requester Name *</label>
                <Input value={form.requesterName} onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))} placeholder="Full name" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Quantity</label>
                <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
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
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Classroom Name</label>
                <Input value={form.classroomName} onChange={e => setForm(f => ({ ...f, classroomName: e.target.value }))} placeholder="e.g. Preschool A" className="mt-1 h-9 text-sm" />
              </div>
            )}
            {form.scope === 'teacher' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Teacher Name</label>
                <Input value={form.teacherName} onChange={e => setForm(f => ({ ...f, teacherName: e.target.value }))} placeholder="e.g. Sarah Jenkins" className="mt-1 h-9 text-sm" />
              </div>
            )}

            {/* Category & Payment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Payment Method</label>
                <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="mt-1 w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20">
                  {PAYMENT_METHODS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Amount Spent ($) *</label>
                <Input type="number" min={0} step={0.01} value={form.amountSpent} onChange={e => setForm(f => ({ ...f, amountSpent: e.target.value }))} placeholder="0.00" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Purchase Date</label>
                <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes (optional)</label>
              <Input value={form.paymentNotes} onChange={e => setForm(f => ({ ...f, paymentNotes: e.target.value }))} placeholder="Receipt info, PO number, etc." className="mt-1 h-9 text-sm" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowAddModal(false); setForm(EMPTY_FORM); }} disabled={saving} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={saving} className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3d6e] text-white">
              {saving ? 'Saving…' : 'Add Expense'}
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
