import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { School, FileText, Users, Clock, UserCheck, Plus, Mail } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { StatCard } from '../../components/ui/stat-card';
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState('school_default');
  const [formDueDate, setFormDueDate] = useState('');
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
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
  const [inviteFormErrors, setInviteFormErrors] = useState<{[key: string]: string}>({});
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [isAddClassroomDialogOpen, setIsAddClassroomDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
      

        if (!schoolId) {
          throw new Error('Unable to determine school context for the current admin.');
        }

        const dashboardMetrics = await fetchDashboardMetrics(schoolId);

        const progressItems: ProgressItem[] = dashboardMetrics.classwiseMetrics.map(metric => ({
          classroom: metric.classroomName,
          completed: metric.completedEnrollments,
          total: metric.totalEnrollments
        })).sort((a, b) => a.classroom.localeCompare(b.classroom));

        if (!isMounted) return;
        setMetrics(dashboardMetrics);
        setEnrollmentProgress(progressItems);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setMetrics(null);
        setEnrollmentProgress([]);
        const message = err instanceof Error ? err.message : null;
        setError(message && message !== 'Received unexpected response from the server.' ? message : "We couldn't load the admin dashboard data right now. Please try again shortly.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const validateForm = () => {
    const errors = validateAddFormFields({ formName, formLink, formDueDate });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetAddFormState = () => {
    setFormName('');
    setFormLink('');
    setFormStatus('school_default');
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
    } catch {}
  };

  const handleAddForm = async () => {
    setHasTriedAddFormSubmit(true);
    if (!validateForm()) return;

    setIsAddingForm(true);
    try {
    
      if (!schoolId) return;

      await createFormTemplate(formName.trim(), formLink.trim(), schoolId, formDueDate, formStatus);

      setIsAddDialogOpen(false);
      resetAddFormState();

      window.location.reload();
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
    const errors: {[key: string]: string} = {};

    const parentEmailError = validateEmail(parentEmail);
    if (parentEmailError) errors.parentEmail = parentEmailError;
    
    if (!childFirstName.trim()) errors.childFirstName = 'Child first name is required';
    if (!childLastName.trim()) errors.childLastName = 'Child last name is required';
    if (!childDob) errors.childDob = 'Child date of birth is required';
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

      // Check if primary parent email already exists
      const existingParents = await fetchParentDetails(schoolId);
      const allParents = [...existingParents.activeParents, ...existingParents.inactiveParents];
      
      const primaryEmailExists = allParents.some(p => p.email.toLowerCase() === parentEmail.toLowerCase());
      if (primaryEmailExists) {
        setInviteFormErrors(prev => ({ ...prev, parentEmail: 'Email already exists' }));
        showToast('error', 'Primary parent email already exists');
        return;
      }
      
      // Check if secondary parent email already exists (if provided)
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
        childDob,
        classroomId: childClassroom,
        gender: childGender,
        secondaryParentEmail: secondaryParentEmail.trim() || undefined,
        secondaryParentFirstName: secondaryParentFirstName.trim() || undefined,
        secondaryParentLastName: secondaryParentLastName.trim() || undefined,
        secondaryParentPhoneNumber: secondaryParentPhoneNumber.trim() || undefined
      });

      setIsInviteDialogOpen(false);
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

      showToast('success', 'Parent invitation sent successfully');
      window.location.reload();
    } catch (error) {
      console.error('Error inviting parent:', error);
      showToast('error', 'Failed to send parent invitation. Please try again.');
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
      
      window.location.reload();
    } catch (error) {
      showToast('error', 'Failed to create classroom. Please try again.');
    } 
  };

  if (loading) {
    return <PageLoader message="Loading dashboard data..." Layout={AdminLayout} />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Dashboard Overview
        </h1>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">
            {error}
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <StatCard
            label="Total Classrooms"
            value={metrics?.totalClassrooms || 0}
            icon={School}
            iconBgClass="bg-amazon-teal/10"
            iconColorClass="text-amazon-teal"
            className="hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/admin/classrooms')}
          />
          <StatCard
            label="Active Children"
            value={metrics?.totalActiveChildren || 0}
            icon={UserCheck}
            iconBgClass="bg-amazon-teal/10"
            iconColorClass="text-amazon-teal"
            className="hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/admin/students')}
          />
          <StatCard
            label="Active Forms"
            value={metrics?.totalForms || 0}
            icon={FileText}
            iconBgClass="bg-amazon-teal/10"
            iconColorClass="text-amazon-teal"
            className="hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/admin/forms')}
          />
          <StatCard
            label="Active Parents"
            value={metrics?.totalActiveParents || 0}
            icon={Users}
            iconBgClass="bg-amazon-teal/10"
            iconColorClass="text-amazon-teal"
            className="hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/admin/parents')}
          />
          <StatCard
            label="Pending Enrollments"
            value={metrics ? metrics.classwiseMetrics.reduce(
              (sum, metric) => sum + (metric.totalEnrollments - metric.completedEnrollments),
              0
            ) : 0}
            icon={Clock}
            iconBgClass="bg-amber-100"
            iconColorClass="text-amber-600"
            className="hover:scale-[1.02] transition-all duration-200"
            onClick={() => navigate('/admin/students')}
          />
        </div>

        {/* Quick Actions & Enrollment Progress Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="glass-card lg:col-span-3 order-2 lg:order-1">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Enrollment Progress by Classroom</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 sm:space-y-4">
                {enrollmentProgress.length === 0 ? (
                  <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                    No enrollment data available yet.
                  </div>
                ) : (
                  enrollmentProgress.map((classroom, index) => (
                    <div key={`${classroom.classroom}-${index}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-xs sm:text-sm truncate flex-1 mr-2">
                          {classroom.classroom}
                        </span>
                        <span className="text-xs sm:text-sm text-amazon-teal font-medium flex-shrink-0">
                          {classroom.total > 0 ? Math.round(classroom.completed / classroom.total * 100) : 0}%
                        </span>
                      </div>
                      <Progress value={classroom.total > 0 ? classroom.completed / classroom.total * 100 : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {classroom.completed} of {classroom.total} students marked complete
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Admin Actions */}
          <Card className="glass-card lg:col-span-1 order-1 lg:order-2">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal text-center"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                  <span className="text-xs font-medium">Add Form</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal text-center"
                  onClick={() => { loadClassroomsIfNeeded(); setIsInviteDialogOpen(true); }}
                >
                  <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                  <span className="text-xs font-medium">Invite Parent</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal text-center"
                  onClick={() => setIsAddClassroomDialogOpen(true)}
                >
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                  <span className="text-xs font-medium">Add Classrooms</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Form Modal */}
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
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          isSubmitting={isAddingForm}
        />

        {/* Invite Parent Dialog */}
        <InviteParentModal
          isOpen={isInviteDialogOpen}
          onClose={() => {
            setIsDialogClosing(true);
            setInviteFormErrors({});
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

        {/* Add Classroom Dialog */}
        <Dialog open={isAddClassroomDialogOpen} onOpenChange={(open) => {
            setIsAddClassroomDialogOpen(open);
        }}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Add New Classroom</DialogTitle>
            </DialogHeader>
            <div className="py-2 sm:py-3 md:py-4">
              <label className="block text-sm font-medium mb-2">
                Classroom Name
              </label>
              <Input
                value={newClassroomName}
                onChange={e => setNewClassroomName(e.target.value)}
                placeholder="Enter classroom name"
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
                autoFocus
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setIsAddClassroomDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
                Cancel
              </Button>
              <AsyncButton onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!newClassroomName.trim()}>
                Add Classroom
              </AsyncButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
