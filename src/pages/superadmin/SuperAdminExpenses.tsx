import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { RequestService, type Request, type RequestExpenseData } from '../../services/api/requests';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import {
  DollarSign, ShoppingBag, Clock, Play, CheckCircle2,
  TrendingUp, RefreshCw, Layers, Users, School, PieChart as PieIcon, ListCollapse
} from 'lucide-react';
import { AdminLayout } from '../admin/AdminLayout';

export function SuperAdminExpenses() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [expenseData, setExpenseData] = useState<RequestExpenseData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, data] = await Promise.all([
        RequestService.fetchRequests(),
        RequestService.fetchExpenseData()
      ]);
      setRequests(reqList);
      setExpenseData(data);
    } catch (e) {
      showToast('error', 'Failed to load expense metrics.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Request status metrics
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;
  const inProgressRequests = requests.filter(r => r.status === 'In Progress').length;
  const completedRequests = requests.filter(r => r.status === 'Completed').length;

  // Spending analytics — aggregated server-side by the mock/expense API
  const summary = expenseData?.summary;
  const totalSpent = summary?.totalSpent ?? 0;
  const classroomSpendingData = summary?.byClassroom ?? [];
  const teacherSpendingData = summary?.byTeacher ?? [];
  const scopeSpendingData = (summary?.byScope ?? [])
    .map(item => ({ name: item.name, value: item.amount }))
    .filter(item => item.value > 0);
  const categorySpendingData = (summary?.byCategory ?? [])
    .map(item => ({ name: item.name, value: item.amount }))
    .filter(item => item.value > 0);
  const schoolWideSpent = scopeSpendingData
    .filter(item => item.name === 'Entire School')
    .reduce((sum, item) => sum + item.value, 0);

  // Request-wise spending ledger
  const completedList = expenseData?.expenses ?? [];

  // Colors for Pie Charts
  const COLORS = ['#0F2D52', '#1E4B83', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        
        {/* Upper Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <PieIcon className="w-6 h-6 text-[#0F2D52]" /> Procurement Expense Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Analyze total material spending by classrooms, teachers, school scope, and categories.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="rounded-xl h-10 border-slate-200 hover:bg-slate-50 flex items-center gap-2 bg-white"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
        </div>

        {/* Main Metric Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-white border border-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Spent */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white rounded-2xl overflow-hidden relative">
                <div className="absolute -right-4 -bottom-4 opacity-10 text-white"><DollarSign className="w-24 h-24" /></div>
                <CardContent className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-200 block">Total Amount Spent</span>
                  <span className="text-2xl font-black mt-2 block">${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold uppercase mt-2">
                    <TrendingUp className="w-3.5 h-3.5" /> Checked & Verified
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Total Requests */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Requests</span>
                      <span className="text-2xl font-black text-slate-800 mt-2 block">{totalRequests}</span>
                    </div>
                    <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-2">Submitted across all locations</span>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pending Requests */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pending Requests</span>
                      <span className="text-2xl font-black text-amber-600 mt-2 block">{pendingRequests}</span>
                    </div>
                    <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-2">Awaiting initial validation</span>
                </CardContent>
              </Card>
            </motion.div>

            {/* Approved/In Progress Requests */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Validated / In Progress</span>
                      <span className="text-2xl font-black text-blue-600 mt-2 block">{inProgressRequests}</span>
                    </div>
                    <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-500">
                      <Play className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-2">Pending final purchase</span>
                </CardContent>
              </Card>
            </motion.div>

            {/* Completed Requests */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className="border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] bg-white rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Completed Purchases</span>
                      <span className="text-2xl font-black text-emerald-600 mt-2 block">{completedRequests}</span>
                    </div>
                    <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block mt-2">Procured and closed</span>
                </CardContent>
              </Card>
            </motion.div>

          </div>
        )}

        {/* Charts Section */}
        {!loading && (
          <div className="space-y-6">
            
            {/* Row 1: Classroom-wise & Teacher-wise Spending Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Classroom Spending */}
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <School className="w-4 h-4 text-[#0F2D52]" /> Classroom-wise Spending Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {classroomSpendingData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                      No classroom spending data recorded yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classroomSpendingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                            labelClassName="font-bold text-slate-800 text-xs" 
                            formatter={(value: any) => [`$${value}`, 'Amount Spent']}
                          />
                          <Bar dataKey="amount" fill="#1E4B83" radius={[6, 6, 0, 0]} barSize={36} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Teacher Spending */}
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0F2D52]" /> Teacher-wise Spending Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {teacherSpendingData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                      No teacher-specific spending data recorded yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teacherSpendingData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                          <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                            labelClassName="font-bold text-slate-800 text-xs"
                            formatter={(value: any) => [`$${value}`, 'Amount Spent']}
                          />
                          <Bar dataKey="amount" fill="#10B981" radius={[0, 6, 6, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Row 2: Scope Breakdown & Category Breakdown (Pie charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Scope-wise Spending Pie Chart */}
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0F2D52]" /> Spending Share by Request Scope
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-around gap-4">
                  {scopeSpendingData.length === 0 ? (
                    <div className="h-60 w-full flex items-center justify-center text-slate-400 text-xs italic">
                      No scope spending data available.
                    </div>
                  ) : (
                    <>
                      <div className="h-60 w-60 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={scopeSpendingData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {scopeSpendingData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `$${value}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Legend List */}
                      <div className="space-y-3 w-full max-w-[200px]">
                        {scopeSpendingData.map((item, index) => {
                          const percentage = ((item.value / totalSpent) * 100).toFixed(1);
                          return (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="font-semibold text-slate-600 truncate">{item.name}</span>
                              </div>
                              <span className="font-bold text-slate-800">{percentage}%</span>
                            </div>
                          );
                        })}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>School Scope Spent:</span>
                          <span>${schoolWideSpent.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Category-wise Spending Donut Chart */}
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-5 py-4">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-[#0F2D52]" /> Spending Breakdown by Category
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col sm:flex-row items-center justify-around gap-4">
                  {categorySpendingData.length === 0 ? (
                    <div className="h-60 w-full flex items-center justify-center text-slate-400 text-xs italic">
                      No category spending data available.
                    </div>
                  ) : (
                    <>
                      <div className="h-60 w-60 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categorySpendingData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {categorySpendingData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => `$${value}`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Legend List */}
                      <div className="space-y-2.5 w-full max-w-[240px]">
                        {categorySpendingData.map((item, index) => {
                          const percentage = ((item.value / totalSpent) * 100).toFixed(1);
                          return (
                            <div key={item.name} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                                <span className="font-semibold text-slate-600 truncate max-w-[140px]" title={item.name}>{item.name}</span>
                              </div>
                              <span className="font-bold text-slate-800">${item.value.toFixed(2)} ({percentage}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Transaction Ledger Table */}
            <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-50 px-5 py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ListCollapse className="w-4 h-4 text-[#0F2D52]" /> Individual Request-wise Spending Ledger
                </CardTitle>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {completedList.length} transactions
                </span>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {completedList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    No completed purchases have been logged yet.
                    Complete purchases from the Requests Queue to populate this ledger.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-5 py-3">Item Description</th>
                        <th className="px-4 py-3">Requester</th>
                        <th className="px-4 py-3">Scope / Target</th>
                        <th className="px-4 py-3">Payment Method</th>
                        <th className="px-4 py-3">Purchase Date</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completedList.map((req) => (
                        <tr key={req.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-800">{req.item}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{req.category || 'Classroom Supplies'}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-700">{req.requesterName}</div>
                            <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">{req.requesterRole}</div>
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-medium">
                            {req.scope === 'classroom' && (
                              <span>Classroom: <b className="text-slate-700">{req.classroomName}</b></span>
                            )}
                            {req.scope === 'teacher' && (
                              <span>Teacher: <b className="text-slate-700">{req.teacherName}</b></span>
                            )}
                            {req.scope === 'school' && (
                              <span className="text-slate-400 italic">Entire School</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 font-semibold">{req.paymentMethod}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-medium">{req.purchaseDate}</td>
                          <td className="px-5 py-3.5 text-right font-extrabold text-emerald-800 text-sm">
                            ${req.amountSpent?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

          </div>
        )}

      </div>
    </AdminLayout>
  );
}
