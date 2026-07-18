import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { School, FileText, Users, UserCheck, Plus, Mail } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { AsyncButton } from '../../components/ui/async-button';
import { PageLoader } from '../../components/ui/page-loader';

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

  if (loading) {
    return <PageLoader message="Loading dashboard data..." Layout={AdminLayout} />;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
            <p className="text-sm text-slate-500 mt-0.5">Monitor your school's enrollment at a glance</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(item.path)}
                className="group glass-card p-5 cursor-pointer hover:-translate-y-[3px]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 truncate">{item.label}</p>
                    <p className="text-[2rem] font-extrabold text-slate-900 tabular-nums tracking-tight leading-none">{item.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${item.iconBg} group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enrollment + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Enrollment table */}
          <div className="glass-card overflow-hidden lg:col-span-3 order-2 lg:order-1 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Enrollment Progress by Classroom</h2>
              <p className="text-xs text-slate-400 mt-0.5">Form completion rate across all classrooms</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left stagger-rows">
                <thead>
                  <tr>
                    <th className="px-5 py-3.5">Classroom</th>
                    <th className="px-5 py-3.5">Completed</th>
                    <th className="px-5 py-3.5 hidden sm:table-cell">Progress</th>
                    <th className="px-5 py-3.5 text-right">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrollmentProgress.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">No enrollment data available yet.</td></tr>
                  ) : (
                    enrollmentProgress.map((cls, i) => {
                      const pct = cls.total > 0 ? Math.round(cls.completed / cls.total * 100) : 0;
                      const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-[#1a6fc4]' : 'bg-amber-400';
                      const badgeClass = pct === 100
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                        : pct >= 60
                        ? 'bg-[#EFF5FB] text-[#0F2D52] border border-blue-200/60'
                        : 'bg-amber-50 text-amber-700 border border-amber-200/60';
                      return (
                        <tr key={`${cls.classroom}-${i}`} className="transition-colors duration-150 cursor-default">
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
                            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="space-y-3 lg:col-span-1 order-1 lg:order-2 stagger-children">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 px-0.5">Quick Actions</h3>
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <div key={idx} className="glass-card p-4 hover:shadow-md">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-xl ${action.iconBg} flex-shrink-0 transition-transform duration-200 group-hover:scale-105`}>
                      <Icon className={`w-4 h-4 ${action.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug">{action.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{action.description}</p>
                    </div>
                  </div>
                  <Button
                    onClick={action.onClick}
                    variant="default"
                    className="w-full h-9 text-xs"
                  >
                    {action.btnText}
                  </Button>
                </div>
              );
            })}
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
