import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Card, CardContent } from '../../components/ui/card';
import { FileText, Clock, CheckCircle, AlertCircle, User } from 'lucide-react';
import { EmployeeService, type EmployeeFormAssignment } from '../../services/api/employee';
import { useUserContext } from '../../contexts/UserContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';

type EnrichedAssignment = EmployeeFormAssignment & {
  formTitle: string;
  formDescription: string;
};

export function EmployeeDashboard() {
  const { userData, schoolSubdomain } = useUserContext();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const employeeId = userData?.parentId ?? '';

  const MOCK_ASSIGNMENTS: EnrichedAssignment[] = [
    { id: 'mock-1', formId: 'f1', employeeId: 'emp-1', schoolId: 's1', status: 'Assigned', assignedBy: 'admin', assignedOn: new Date().toISOString(), formTitle: 'Employee Handbook Acknowledgement', formDescription: 'HR Documentation' },
    { id: 'mock-2', formId: 'f2', employeeId: 'emp-1', schoolId: 's1', status: 'Submitted', assignedBy: 'admin', assignedOn: new Date(Date.now() - 86400000 * 2).toISOString(), formTitle: 'Background Check Consent', formDescription: 'Compliance Form' },
    { id: 'mock-3', formId: 'f3', employeeId: 'emp-1', schoolId: 's1', status: 'Approved', assignedBy: 'admin', assignedOn: new Date(Date.now() - 86400000 * 5).toISOString(), formTitle: 'Emergency Contact Form', formDescription: 'Required documentation' },
    { id: 'mock-4', formId: 'f4', employeeId: 'emp-1', schoolId: 's1', status: 'Rejected', assignedBy: 'admin', assignedOn: new Date(Date.now() - 86400000 * 1).toISOString(), formTitle: 'Health & Safety Training', formDescription: 'Training Acknowledgement' },
  ];

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (!userData?.schoolId) {
          if (isMounted) { setAssignments(MOCK_ASSIGNMENTS); setLoading(false); }
          return;
        }
        setLoading(true);

        const [rawAssignments, templates] = await Promise.all([
          EmployeeService.fetchEmployeeFormAssignments(employeeId),
          fetchFormTemplates(userData.schoolId).catch(() => [])
        ]);

        if (!isMounted) return;

        const enriched = rawAssignments.map(assignment => {
          const template = templates.find((t: any) => t.id === assignment.formId);
          return {
            ...assignment,
            formTitle: template?.formName || 'Employee Form',
            formDescription: template?.formType || 'Required documentation'
          };
        });

        setAssignments(enriched);
      } catch (err) {
        if (isMounted) setError("We couldn't load your dashboard details right now. Please try again shortly.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [userData?.schoolId, employeeId]);

  const handleOpenForm = (assignment: EnrichedAssignment) => {
    navigate(`/${schoolSubdomain}/employee/form/${assignment.id}`, {
      state: { assignment }
    });
  };

  const totalForms = assignments.length;
  const completedForms = assignments.filter(a => a.status === 'Approved' || a.status === 'Submitted').length;
  const pendingForms = assignments.filter(a => a.status === 'Assigned' || a.status === 'Rejected').length;
  const progress = totalForms > 0 ? Math.round((completedForms / totalForms) * 100) : 0;

  const employeeName = userData
    ? [userData.firstName, userData.lastName].filter(Boolean).join(' ') || userData.email || 'Employee'
    : 'Demo Employee';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 w-full px-2 sm:px-3 lg:px-4 py-0 pb-8">
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
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 sm:gap-5 mt-4">
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
                        { label: 'Role', value: 'Employee' },
                        { label: 'Forms Due', value: `${pendingForms} pending` },
                        { label: 'Status', value: progress === 100 ? 'All Complete' : 'In Progress' },
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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Forms</h3>
                {totalForms > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {totalForms} form{totalForms !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-slate-300" />
                  </div>
                  <div className="text-base font-bold text-slate-900 mb-1">No forms assigned</div>
                  <div className="text-sm text-slate-500">You're all caught up!</div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {assignments.map((assignment, idx) => (
                    <motion.div
                      key={assignment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.04 }}
                    >
                      <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white rounded-2xl">
                        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-[#0F2D52]" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-sm truncate">{assignment.formTitle}</h4>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{assignment.formDescription}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <StatusBadge status={assignment.status} />
                                <span className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(assignment.assignedOn).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto flex-shrink-0">
                            <Button
                              className="w-full sm:w-auto bg-[#0F2D52] hover:bg-[#1c477c] text-white font-semibold rounded-xl text-sm h-9 px-4"
                              onClick={() => handleOpenForm(assignment)}
                            >
                              {assignment.status === 'Assigned' || assignment.status === 'Rejected' ? 'Fill Form' : 'View Form'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
}
