import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EmployeeLayout } from './EmployeeLayout';
import { Card, CardContent } from '../../components/ui/card';
import { FileText, Clock, CheckCircle, User, Download, Printer, Eye, LayoutGrid, List, HelpCircle, Phone, MapPin } from 'lucide-react';
import { EmployeeService, type EmployeeFormAssignment } from '../../services/api/employee';
import { RequestService } from '../../services/api/requests';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { normalizeFormStatus, type NormalizedFormStatus } from '../../lib/formStatus';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { EmployeeGuideContent } from '../../components/EmployeeGuideContent';
import { useToast } from '../../contexts/ToastContext';
import { Label } from 'recharts';

type EnrichedAssignment = EmployeeFormAssignment & {
  formTitle: string;
  formDescription: string;
  normalizedStatus: NormalizedFormStatus;
};

export function EmployeeDashboard() {
  const { userData, schoolSubdomain } = useUserContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [employee, setEmployee] = useState<import('../../services/api/employee').Employee | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [showGuide, setShowGuide] = useState(false);
  const [userOverride, setUserOverride] = useState(false);
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    setUserOverride(true);
    localStorage.setItem('empDashFormsViewMode', mode);
  };

  // Auto-switch based on screen size, unless user has manually changed
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!userOverride) {
        setViewMode(e.matches ? 'card' : 'table');
      }
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [userOverride]);

  // Show a toast when returning from a successful form submission
  useEffect(() => {
    if ((location.state as any)?.formCompleted) {
      showToast('success', 'Form submitted successfully');
      // Clear the state so the toast doesn't re-appear on further navigation
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!userData?.schoolId) return;
        setLoading(true);

        // First resolve the current user's employee record to get their employee UUID.
        const employee = await EmployeeService.fetchCurrentEmployee(userData.schoolId);
        if (!isMounted) return;
        setEmployee(employee);

        const empId = employee.userId || user?.id || userData.email || '';
        const [rawAssignments, allRequests] = await Promise.all([
          EmployeeService.fetchEmployeeFormAssignments(employee.id),
          RequestService.fetchRequests(userData.schoolId, 'employee', empId).catch(() => [] as import('../../services/api/requests').Request[]),
        ]);
        if (!isMounted) return;
        setPendingRequestsCount(allRequests.filter(r => r.status === 'Pending').length);

        const enriched = rawAssignments.map(assignment => ({
          ...assignment,
          formTitle: assignment.formName || 'Employee Form',
          formDescription: assignment.dueDate ? `Due: ${assignment.dueDate}` : 'Required documentation',
          normalizedStatus: normalizeFormStatus(assignment.status),
        }));

        setAssignments(enriched);
      } catch (err) {
        if (isMounted) setError("We couldn't load your dashboard details right now. Please try again shortly.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userData?.schoolId, location.key]);

  const handleOpenForm = (assignment: EnrichedAssignment) => {
    navigate(`/${schoolSubdomain}/employee/form/${assignment.id}`, {
      state: { assignment }
    });
  };

  const totalForms = assignments.length;
  const completedForms = assignments.filter(a => a.normalizedStatus === 'Approved' || a.normalizedStatus === 'Submitted').length;
  const pendingForms = assignments.filter(a => a.normalizedStatus !== 'Approved' && a.normalizedStatus !== 'Submitted').length;
  const progress = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

  const handleDownload = async (a: EnrichedAssignment) => {
    if (!a.recentPdfLink) return;
    const res = await fetch(a.recentPdfLink);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `${a.formTitle}.pdf`;
    document.body.appendChild(el); el.click(); el.remove();
    URL.revokeObjectURL(url);
  };

  const handlePrint = async (a: EnrichedAssignment) => {
    if (!a.recentPdfLink) return;
    const res = await fetch(a.recentPdfLink);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    w?.addEventListener('load', () => { w.print(); URL.revokeObjectURL(url); });
  };

  const employeeName = userData
    ? [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email || 'Employee'
    : 'Demo Employee';

  return (
    <EmployeeLayout>
      <div className="w-full px-2 sm:px-3 lg:px-4 py-0 pb-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-muted-foreground text-sm flex items-center justify-center min-h-screen">
            <div className="animate-pulse">
              <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
              <p className="text-slate-500 text-sm font-semibold">Loading employee dashboard...</p>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Top row: Progress (left) + Employee Info (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-5 mt-16">
              {/* Progress Card */}
              <div className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '0.06s' }}>
                <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white h-full">
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-bold text-slate-900">Form Completion Progress</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {completedForms} of {totalForms} assigned forms completed
                        </p>
                      </div>
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="42" className="text-slate-100 stroke-current" strokeWidth="10" fill="none" />
                          <circle
                            cx="50" cy="50" r="42"
                            className="text-[#0F2D52] stroke-current transition-all duration-1000 ease-out"
                            strokeWidth="10" fill="none"
                            strokeDasharray="264"
                            strokeDashoffset={264 - (264 * progress) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-extrabold text-[#0F2D52]">{progress}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Stat pills */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[
                        { label: 'Total', value: totalForms, color: 'bg-slate-50 text-slate-700', icon: FileText },
                        { label: 'Completed', value: completedForms, color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle },
                        { label: 'Pending', value: pendingForms, color: 'bg-amber-50 text-amber-700', icon: Clock },
                      ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className={`rounded-xl p-3 ${color} flex flex-col items-center gap-1`}>
                          <Icon className="w-4 h-4 opacity-70" />
                          <span className="text-xl font-extrabold leading-none">{value}</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        <span>Overall Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Employee Info Card */}
              <div className="lg:col-span-3 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
                <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white h-full">
                  <CardContent className="p-5 sm:p-6">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Employee Info</h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-[#0F2D52]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{employeeName}</p>
                        <p className="text-xs text-slate-500 truncate">{userData?.email || '—'}</p>
                      </div>
                    </div>
                    <div className="space-y-2.5 border-t border-slate-50 pt-3">
                      {[
                        { label: 'Forms Completed', value: `${completedForms} completed` },
                        { label: 'Forms Due', value: `${pendingForms} pending` },
                        { label: 'Pending Requests', value: `${pendingRequestsCount} pending` },
                        { label: 'Salary Date', value: employee?.salaryDate || '—' }
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-center">
                          <span className="text-[11px] font-semibold text-slate-400">{label}</span>
                          <span className="text-[11px] font-bold text-slate-700">{value}</span>
                        </div>
                      ))}
                      
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Assigned Forms */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
              {/* Section header — matches parent FormsDocuments gradient header */}
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-4">
                <div className="bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4] px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Employee</p>
                      <h2 className="text-sm font-bold text-white leading-tight">Assigned Forms</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totalForms > 0 && (
                      <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                        {totalForms} form{totalForms !== 1 ? 's' : ''}
                      </span>
                    )}
                   
                    <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
                       <button
                        type="button"
                        onClick={() => handleViewModeChange('table')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                      >
                        <List className="h-3 w-3" />
                        <span className="hidden sm:inline">Table</span>
                      </button> 
                      <button
                        type="button"
                        onClick={() => handleViewModeChange('card')}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                      >
                        <LayoutGrid className="h-3 w-3" />
                        <span className="hidden sm:inline">Card</span>
                      </button>
                     
                    </div>
                  </div>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-slate-300" />
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-1">No forms assigned</div>
                  <div className="text-sm text-slate-500">You're all caught up!</div>
                </div>
              ) : viewMode === 'table' ? (
                <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto shadow-sm">
                  <table className="w-full min-w-[320px] text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-[45%]">Form</th>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Assigned</th>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Due</th>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                        <th className="text-right px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-[80px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((assignment) => {
                        const ns = assignment.normalizedStatus;
                        const isApproved = ns === 'Approved';
                        return (
                          <tr
                            key={assignment.id}
                            className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                            onClick={() => handleOpenForm(assignment)}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                                  <FileText className="h-3 w-3 text-white" />
                                </div>
                                <span className="font-semibold text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight">{assignment.formTitle}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 text-[11px] hidden sm:table-cell whitespace-nowrap">
                              {assignment.assignedOn ? new Date(assignment.assignedOn).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 text-[11px] hidden sm:table-cell whitespace-nowrap">
                              {assignment.dueDate || '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              <StatusBadge status={ns} className="text-[10px] px-1.5 py-0.5 gap-0.5 mt-0" />
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
                                {!isApproved && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" onClick={() => handleOpenForm(assignment)} title="Open Form">
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                                {isApproved && assignment.recentPdfLink && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" onClick={() => handleDownload(assignment)} title="Download PDF">
                                      <Download className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" onClick={() => handlePrint(assignment)} title="Print">
                                      <Printer className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {assignments.map((assignment, idx) => {
                    const ns = assignment.normalizedStatus;
                    const isApproved = ns === 'Approved';
                    return (
                      <motion.div
                        key={assignment.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.04 }}
                      >
                        <div
                          className={cn(
                            "rounded-2xl border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 cursor-pointer"
                          )}
                          onClick={() => handleOpenForm(assignment)}
                        >
                          {/* Card body */}
                          <div className="p-4 flex items-start gap-3 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                              <FileText className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{assignment.formTitle}</p>
                              <div className="mt-1.5">
                                <StatusBadge status={ns} />
                              </div>
                            </div>
                          </div>
                          {/* Divider */}
                          <div className="mx-4 border-t border-slate-50" />
                          {/* Footer */}
                          <div className="px-4 py-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-slate-400 font-medium truncate">
                                Assigned: {assignment.assignedOn ? new Date(assignment.assignedOn).toLocaleDateString() : '—'}
                              </p>
                              {assignment.dueDate && (
                                <p className="text-[11px] text-slate-400 font-medium truncate">Due: {assignment.dueDate}</p>
                              )}
                            </div>
                            <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                              {isApproved && assignment.recentPdfLink && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                                    onClick={() => handleDownload(assignment)}
                                    title="Download PDF"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                                    onClick={() => handlePrint(assignment)}
                                    title="Print PDF"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {!isApproved && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                                  onClick={() => handleOpenForm(assignment)}
                                  title="Open Form"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent className="w-[95vw] max-w-lg rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-4 w-4 text-amazon-teal" />
              Employee Guide
            </DialogTitle>
          </DialogHeader>
          <EmployeeGuideContent />
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
}
