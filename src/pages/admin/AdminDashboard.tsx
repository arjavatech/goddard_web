import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { School, FileText, Users, UserCheck, Plus, Mail, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AsyncButton } from '../../components/ui/async-button';
import { PageLoader } from '../../components/ui/page-loader';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { fetchDashboardMetrics, createFormTemplate, inviteParent, fetchClassrooms, createClassroom, fetchParentDetails } from '../../services/api/admin';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { validateEmail } from '../../lib/emailValidation';
import { InviteParentModal } from '../../components/admin/InviteParentModal';
import { AddFormModal } from '../../components/admin/AddFormModal';
import { validateAddFormFields } from '../../lib/addFormValidation';

type DashboardMetrics = {
  totalClassrooms: number;
  totalActiveChildren: number;
  totalForms: number;
  totalActiveParents: number;
  classwiseMetrics: {
    classroomName: string;
    completedEnrollments: number;
    totalEnrollments: number;
  }[];
};

type ProgressItem = {
  classroom: string;
  completed: number;
  total: number;
};

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [enrollmentProgress, setEnrollmentProgress] = useState<ProgressItem[]>([]);
  const [isAnimated, setIsAnimated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [hasTriedAddFormSubmit, setHasTriedAddFormSubmit] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [secondaryParentFirstName, setSecondaryParentFirstName] = useState('');
  const [secondaryParentLastName, setSecondaryParentLastName] = useState('');
  const [secondaryParentEmail, setSecondaryParentEmail] = useState('');
  const [secondaryParentPhoneNumber, setSecondaryParentPhoneNumber] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [childClassroom, setChildClassroom] = useState('');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);
  const [inviteFormErrors, setInviteFormErrors] = useState<{ [key: string]: string }>({});
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [isAddClassroomDialogOpen, setIsAddClassroomDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolId = localStorage.getItem('schoolId');

  const loadDashboardData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      if (!schoolId) {
        throw new Error('Unable to determine school context for the current admin.');
      }

      const dashboardMetrics = await fetchDashboardMetrics(schoolId);

      const progressItems: ProgressItem[] = dashboardMetrics.classwiseMetrics.map(metric => ({
        classroom: metric.classroomName,
        completed: metric.completedEnrollments,
        total: metric.totalEnrollments
      })).sort((a, b) => a.classroom.localeCompare(b.classroom));

      setMetrics(dashboardMetrics);
      setEnrollmentProgress(progressItems);
      setError(null);
    } catch (err) {
      setMetrics(null);
      setEnrollmentProgress([]);
      const message = err instanceof Error ? err.message : null;
      setError(message && message !== 'Received unexpected response from the server.' ? message : "We couldn't load the admin dashboard data right now. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsAnimated(true), 80);
      return () => clearTimeout(timer);
    } else {
      setIsAnimated(false);
    }
  }, [loading]);

  const validateForm = () => {
    const errors = validateAddFormFields({ formName, formLink, formDueDate });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetInviteFormState = () => {
    setParentFirstName('');
    setParentLastName('');
    setParentEmail('');
    setParentPhoneNumber('');
    setSecondaryParentFirstName('');
    setSecondaryParentLastName('');
    setSecondaryParentEmail('');
    setSecondaryParentPhoneNumber('');
    setChildFirstName('');
    setChildLastName('');
    setChildDob('');
    setChildGender('');
    setChildClassroom('');
    setInviteFormErrors({});
  };

  const resetAddFormState = () => {
    setFormName('');
    setFormLink('');
    setFormDueDate('');
    setFormErrors({});
    setHasTriedAddFormSubmit(false);
  };

  useEffect(() => {
    if (!isAddDialogOpen) return;
    if (!hasTriedAddFormSubmit && Object.keys(formErrors).length === 0) return;
    setFormErrors(validateAddFormFields({ formName, formLink, formDueDate }));
  }, [formName, formLink, formDueDate, hasTriedAddFormSubmit, isAddDialogOpen]);

  const loadClassroomsIfNeeded = async () => {
    if (classroomsLoaded || !schoolId) return;
    try {
      const classroomData = await fetchClassrooms(schoolId);
      setClassrooms(classroomData.map(c => ({ id: c.id, name: c.name })));
      setClassroomsLoaded(true);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
  };

  const handleAddForm = async () => {
    setHasTriedAddFormSubmit(true);
    if (!validateForm()) return;

    setIsAddingForm(true);
    try {
      if (!schoolId) return;

      await createFormTemplate(formName.trim(), formLink.trim(), schoolId, formDueDate);

      setIsAddDialogOpen(false);
      resetAddFormState();

      showToast('success', 'Form template created successfully');
      await loadDashboardData(true);
    } catch (error) {
      const errorText =
        (error as any)?.response?.error ||
        (error as any)?.response?.message ||
        (error instanceof Error ? error.message : '');

      if (
        typeof errorText === 'string' &&
        (errorText.includes('unique_active_form_name_per_school') ||
          errorText.includes('duplicate key value violates unique constraint'))
      ) {
        setFormErrors((prev) => ({
          ...prev,
          formName: 'A form with this name already exists.'
        }));
        showToast('error', 'Form already exists with the same name.');
      } else {
        showToast('error', 'Failed to create form. Please try again.');
      }
    } finally {
      setIsAddingForm(false);
    }
  };

  const validateInviteForm = () => {
    const errors: { [key: string]: string } = {};

    const parentEmailError = validateEmail(parentEmail);
    if (parentEmailError) errors.parentEmail = parentEmailError;

    if (!childFirstName.trim()) errors.childFirstName = 'Child first name is required';
    if (!childLastName.trim()) errors.childLastName = 'Child last name is required';
    if (!childGender) errors.childGender = 'Child gender is required';
    if (!childClassroom) errors.childClassroom = 'Child classroom is required';

    if (secondaryParentEmail.trim()) {
      const secondaryEmailError = validateEmail(secondaryParentEmail);
      if (secondaryEmailError) errors.secondaryParentEmail = secondaryEmailError;

      if (!secondaryParentFirstName.trim()) {
        errors.secondaryParentFirstName = 'First name is required when email is provided';
      }
      if (!secondaryParentLastName.trim()) {
        errors.secondaryParentLastName = 'Last name is required when email is provided';
      }
    }

    setInviteFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteParent = async () => {
    if (!validateInviteForm()) return;

    try {
      if (!schoolId) return;

      const existingParents = await fetchParentDetails(schoolId);
      const allParents = [...existingParents.activeParents, ...existingParents.inactiveParents];

      const primaryEmailExists = allParents.some(p => p.email.toLowerCase() === parentEmail.toLowerCase());
      if (primaryEmailExists) {
        setInviteFormErrors(prev => ({ ...prev, parentEmail: 'Email already exists' }));
        showToast('error', 'Primary parent email already exists');
        return;
      }

      if (secondaryParentEmail.trim()) {
        const secondaryEmailExists = allParents.some(p => p.email.toLowerCase() === secondaryParentEmail.toLowerCase());
        if (secondaryEmailExists) {
          setInviteFormErrors(prev => ({ ...prev, secondaryParentEmail: 'Email already exists' }));
          showToast('error', 'Secondary parent email already exists');
          return;
        }
      }

      await inviteParent(schoolId, {
        parentFirstName,
        parentLastName,
        parentEmail,
        parentPhoneNumber: parentPhoneNumber.trim() || undefined,
        childFullName: `${childFirstName} ${childLastName}`,
        childDob: childDob || undefined,
        classroomId: childClassroom,
        gender: childGender,
        secondaryParentEmail: secondaryParentEmail.trim() || undefined,
        secondaryParentFirstName: secondaryParentFirstName.trim() || undefined,
        secondaryParentLastName: secondaryParentLastName.trim() || undefined,
        secondaryParentPhoneNumber: secondaryParentPhoneNumber.trim() || undefined
      });

      setIsInviteDialogOpen(false);
      resetInviteFormState();

      showToast('success', 'Parent invitation sent successfully');
      await loadDashboardData(true);
    } catch (error: any) {
      console.error('Error inviting parent:', error);

      if (error?.code === 'EMAIL_BOUNCE' || error?.status === 502) {
        setInviteFormErrors(prev => ({ ...prev, parentEmail: error.message }));
        showToast('error', error.message);
      }
      else if (error?.code === 'CONFLICT' || error?.message?.includes('Email already exists')) {
        setInviteFormErrors(prev => ({ ...prev, parentEmail: 'Email already exists' }));
        showToast('error', 'Email already exists');
      } else if (error?.response?.status === 409 || error?.message?.includes('User with this email already exists')) {
        setInviteFormErrors(prev => ({ ...prev, parentEmail: 'Email already exists' }));
        showToast('error', 'Email already exists');
      } else {
        showToast('error', error?.message || 'Failed to send parent invitation. Please try again.');
      }
    }
  };

  const handleAddClassroom = async () => {
    if (!newClassroomName.trim()) return;

    try {
      if (!schoolId) throw new Error('School context not found');

      await createClassroom(schoolId, newClassroomName.trim());

      setIsAddClassroomDialogOpen(false);
      setNewClassroomName('');
      showToast('success', `Classroom "${newClassroomName.trim()}" created successfully`);

      setClassroomsLoaded(false);
      await loadDashboardData(true);
    } catch (error) {
      const errorText =
        (error as any)?.response?.error ||
        (error as any)?.response?.message ||
        (error instanceof Error ? error.message : '');

      if (
        typeof errorText === 'string' &&
        (errorText.includes('duplicate key value violates unique constraint') ||
          errorText.toLowerCase().includes('already exists') ||
          errorText.toLowerCase().includes('unique'))
      ) {
        showToast('error', 'Classroom name already exists');
      } else {
        showToast('error', 'Failed to create classroom. Please try again.');
      }
      throw error;
    }
  };

  const statItems = [
    {
      label: "Classrooms",
      value: metrics?.totalClassrooms || 0,
      icon: School,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#0F2D52]",
      path: "/admin/classrooms"
    },
    {
      label: "Active Students",
      value: metrics?.totalActiveChildren || 0,
      icon: UserCheck,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#0F2D52]",
      path: "/admin/students"
    },
    {
      label: "Active Forms",
      value: metrics?.totalForms || 0,
      icon: FileText,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#1a6fc4]",
      path: "/admin/forms"
    },
    {
      label: "Active Parents",
      value: metrics?.totalActiveParents || 0,
      icon: Users,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#0F2D52]",
      path: "/admin/parents"
    }
  ];

  const quickActions = [
    {
      title: "Invite Parent",
      description: "Send portal access invitation to a parent and student.",
      icon: Mail,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#0F2D52]",
      btnText: "Send Invite",
      onClick: () => { loadClassroomsIfNeeded(); setIsInviteDialogOpen(true); }
    },
    {
      title: "Add Classroom",
      description: "Create a new classroom group in the school.",
      icon: School,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#0F2D52]",
      btnText: "Add Classroom",
      onClick: () => setIsAddClassroomDialogOpen(true)
    },
    {
      title: "Add Form",
      description: "Create and assign new form templates.",
      icon: Plus,
      iconBg: "bg-[#EFF5FB]",
      iconColor: "text-[#1a6fc4]",
      btnText: "Add Form",
      onClick: () => setIsAddDialogOpen(true)
    }
  ];

  const totalCompleted = enrollmentProgress.reduce((sum, item) => sum + item.completed, 0);
  const totalEnrollments = enrollmentProgress.reduce((sum, item) => sum + item.total, 0);
  const totalPending = Math.max(0, totalEnrollments - totalCompleted);
  const completionPercentage = totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0;

  const pieData = [
    { name: 'Completed', value: totalCompleted, color: '#10b981' },
    { name: 'Pending / Due', value: totalPending, color: '#E2E8F0' }
  ];

  const barData = enrollmentProgress.map(item => ({
    name: item.classroom,
    rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
    completed: item.completed,
    total: item.total
  }));

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-xs font-semibold text-slate-800">
          <p className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
            {payload[0].name}: <span className="font-extrabold text-[#0F2D52]">{payload[0].value} forms</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-xs text-slate-600">
          <p className="font-bold text-slate-900 mb-1">{data.name}</p>
          <p className="flex justify-between gap-4 font-semibold text-slate-700">
            <span>Completion Rate:</span>
            <span className="text-[#1a6fc4] font-extrabold">{data.rate}%</span>
          </p>
          <p className="flex justify-between gap-4 text-[11px] text-slate-400 mt-0.5">
            <span>Forms:</span>
            <span>{data.completed} / {data.total} completed</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <PageLoader message="Loading dashboard data..." Layout={AdminLayout} />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">Monitor your school's enrollment at a glance</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Stat cards */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                onClick={() => navigate(item.path)}
                className="group glass-card p-5 cursor-pointer border border-slate-100 hover:border-[#1a6fc4]/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#EFF5FB]/50 rounded-full blur-xl group-hover:bg-[#EFF5FB]/80 transition-all duration-300" />
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 truncate">{item.label}</p>
                    <p className="text-[2.25rem] font-extrabold text-[#0F2D52] tabular-nums tracking-tight leading-none">{item.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${item.iconBg} group-hover:scale-115 transition-all duration-300 flex-shrink-0 shadow-sm border border-white`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Visual Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* Donut Chart Card */}
          <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between relative overflow-hidden border border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F2D52]">Enrollment Rate</h3>
              </div>
              <p className="text-xs text-slate-400">Total submitted and approved forms</p>
            </div>
            
            <div className="h-48 relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[1.85rem] font-extrabold text-[#0F2D52] leading-none">{completionPercentage}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Completed</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                <p className="text-lg font-bold text-emerald-600">{totalCompleted}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending</p>
                <p className="text-lg font-bold text-slate-600">{totalPending}</p>
              </div>
            </div>
          </div>

          {/* Bar Chart Card */}
          <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between border border-slate-100">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#1a6fc4] border border-blue-100">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0F2D52]">Classroom Comparison</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">{enrollmentProgress.length} classes active</span>
              </div>
              <p className="text-xs text-slate-400">Completion percentage by classroom</p>
            </div>

            <div className="h-48 my-4">
              {barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">No classroom data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(26, 111, 196, 0.04)', radius: 8 }} />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={32}>
                      {barData.map((entry, index) => {
                        const color = entry.rate === 100 ? '#10b981' : entry.rate >= 60 ? '#1a6fc4' : '#f59e0b';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-bold pt-3 border-t border-slate-50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-slate-500 uppercase tracking-wider">100% Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1a6fc4]" />
                <span className="text-slate-500 uppercase tracking-wider">On Track (≥60%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-slate-500 uppercase tracking-wider">Needs Attention (&lt;60%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enrollment + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enrollment table */}
          <div className="glass-card overflow-hidden lg:col-span-3 order-2 lg:order-1 animate-fade-in-up border border-slate-100 shadow-sm" style={{ animationDelay: '200ms' }}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Enrollment Progress by Classroom</h2>
                <p className="text-xs text-slate-400 mt-0.5">Form completion rate across all classrooms</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left stagger-rows">
                <thead>
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Classroom</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed</th>
                    <th className="px-5 py-3.5 hidden sm:table-cell text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</th>
                    <th className="px-5 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrollmentProgress.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No enrollment data available yet.</td></tr>
                  ) : (
                    enrollmentProgress.map((cls, i) => {
                      const pct = cls.total > 0 ? Math.round(cls.completed / cls.total * 100) : 0;
                      const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[#1a6fc4]' : 'bg-amber-500';
                      const badgeClass = pct === 100
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : pct >= 60
                        ? 'bg-[#EFF5FB] text-[#0F2D52] border border-blue-200/60'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/60';
                      return (
                        <tr key={`${cls.classroom}-${i}`} className="transition-colors duration-150 cursor-default hover:bg-slate-50/50">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                                <School className="w-4 h-4 text-[#0F2D52]" />
                              </div>
                              <span className="text-sm font-semibold text-slate-800">{cls.classroom}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">{cls.completed} / {cls.total}</td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${isAnimated ? pct : 0}%` }} />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{pct}%</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4 lg:col-span-1 order-1 lg:order-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 px-0.5">Quick Actions</h3>
            <div className="space-y-3 stagger-children">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <div key={idx} className="glass-card p-4 hover:shadow-md border border-slate-100 flex flex-col justify-between group transition-all duration-300">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`p-2.5 rounded-xl ${action.iconBg} flex-shrink-0 transition-all duration-300 group-hover:scale-110 shadow-sm`}>
                        <Icon className={`w-4 h-4 ${action.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-snug">{action.title}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-medium">{action.description}</p>
                      </div>
                    </div>
                    <Button
                      onClick={action.onClick}
                      variant="default"
                      className="w-full h-9 text-xs rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 shadow-sm border-none font-bold"
                    >
                      {action.btnText}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Existing Modals and Dialogs */}
        <AddFormModal
          isOpen={isAddDialogOpen}
          onClose={() => {
            resetAddFormState();
            setIsAddDialogOpen(false);
          }}
          onSubmit={handleAddForm}
          formName={formName}
          setFormName={setFormName}
          formLink={formLink}
          setFormLink={setFormLink}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          isSubmitting={isAddingForm}
        />

        <InviteParentModal
          isOpen={isInviteDialogOpen}
          onClose={() => {
            setIsDialogClosing(true);
            resetInviteFormState();
            setTimeout(() => setIsDialogClosing(false), 100);
            setIsInviteDialogOpen(false);
          }}
          onInvite={handleInviteParent}
          parentFirstName={parentFirstName}
          setParentFirstName={setParentFirstName}
          parentLastName={parentLastName}
          setParentLastName={setParentLastName}
          parentEmail={parentEmail}
          setParentEmail={setParentEmail}
          parentPhoneNumber={parentPhoneNumber}
          setParentPhoneNumber={setParentPhoneNumber}
          secondaryParentFirstName={secondaryParentFirstName}
          setSecondaryParentFirstName={setSecondaryParentFirstName}
          secondaryParentLastName={secondaryParentLastName}
          setSecondaryParentLastName={setSecondaryParentLastName}
          secondaryParentEmail={secondaryParentEmail}
          setSecondaryParentEmail={setSecondaryParentEmail}
          secondaryParentPhoneNumber={secondaryParentPhoneNumber}
          setSecondaryParentPhoneNumber={setSecondaryParentPhoneNumber}
          childFirstName={childFirstName}
          setChildFirstName={setChildFirstName}
          childLastName={childLastName}
          setChildLastName={setChildLastName}
          childDob={childDob}
          setChildDob={setChildDob}
          childGender={childGender}
          setChildGender={setChildGender}
          childClassroom={childClassroom}
          setChildClassroom={setChildClassroom}
          classrooms={classrooms}
          inviteFormErrors={inviteFormErrors}
          setInviteFormErrors={setInviteFormErrors}
          isDialogClosing={isDialogClosing}
        />

        <Dialog open={isAddClassroomDialogOpen} onOpenChange={(open) => {
          setIsAddClassroomDialogOpen(open);
        }}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
            <DialogHeader>
              <DialogTitle>Add New Classroom</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Classroom Name
              </label>
              <Input
                value={newClassroomName}
                onChange={e => setNewClassroomName(e.target.value)}
                placeholder="e.g. Toddlers A"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddClassroomDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClassroom}
                disabled={!newClassroomName.trim()}
              >
                Add Classroom
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
