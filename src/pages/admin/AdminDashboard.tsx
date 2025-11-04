import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { School, FileText, Users, Clock, UserCheck, Plus, UserPlus, Mail, GraduationCap, Settings, BarChart3, BookOpen } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { fetchUserContext } from '../../services/api/user';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

import { fetchDashboardMetrics, createFormTemplate, inviteParent, fetchClassrooms, createClassroom } from '../../services/api/admin';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';
import { ValidatedInput } from '@/components/ui/validated-input';
import { commonValidationRules } from '@/lib/validation';

type StatCard = {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
  onClick?: () => void;
};

type ProgressItem = {
  classroom: string;
  completed: number;
  total: number;
};
export function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [enrollmentProgress, setEnrollmentProgress] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [childClassroom, setChildClassroom] = useState('');
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [isInvitingParent, setIsInvitingParent] = useState(false);
  const [isAddClassroomDialogOpen, setIsAddClassroomDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [isAddingClassroom, setIsAddingClassroom] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) {
          throw new Error('Unable to determine school context for the current admin.');
        }

        const [metrics, classroomData] = await Promise.all([
          fetchDashboardMetrics(user.schoolId),
          fetchClassrooms(user.schoolId).catch(() => [])
        ]);

        // Calculate pending enrollments
        const pendingEnrollments = metrics.classwiseMetrics.reduce(
          (sum, metric) => sum + (metric.totalEnrollments - metric.completedEnrollments),
          0
        );

        const statCards: StatCard[] = [
          {
            title: 'Total Classrooms',
            value: metrics.totalClassrooms,
            icon: <School className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data',
            onClick: () => navigate('/admin/classrooms')
          },
          {
            title: 'Active Children',
            value: metrics.totalActiveChildren,
            icon: <UserCheck className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data',
            onClick: () => navigate('/admin/students')
          },
          {
            title: 'Active Forms',
            value: metrics.totalForms,
            icon: <FileText className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data',
            onClick: () => navigate('/admin/forms')
          },
          {
            title: 'Active Parents',
            value: metrics.totalActiveParents,
            icon: <Users className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data',
            onClick: () => navigate('/admin/parents')
          },

          {
            title: 'Pending Enrollments',
            value: pendingEnrollments,
            icon: <Clock className="h-6 w-6 text-amazon-orange" />,
            change: 'Awaiting completion',
            onClick: () => navigate('/admin/students')
          }
        ];

        const progressItems: ProgressItem[] = metrics.classwiseMetrics.map(metric => ({
          classroom: metric.classroomName,
          completed: metric.completedEnrollments,
          total: metric.totalEnrollments
        })).sort((a, b) => a.classroom.localeCompare(b.classroom));

        if (!isMounted) return;
        setStats(statCards);
        setEnrollmentProgress(progressItems);
        setClassrooms(classroomData.map(c => ({ id: c.id, name: c.name })));
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setStats([]);
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

  const showValidationToast = (message: string) => {
    console.error(message);
  };

  const hideValidationToast = () => {
    // No-op for compatibility
  };

  const handleAddClassroom = async () => {
    if (!newClassroomName.trim()) return;
    
    setIsAddingClassroom(true);
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) throw new Error('School context not found');
      
      await createClassroom(user.schoolId, newClassroomName.trim());
      
      setIsAddClassroomDialogOpen(false);
      setNewClassroomName('');
      showToast('success', `Classroom "${newClassroomName.trim()}" created successfully`);
      
      // Refresh the page to show updated stats
      window.location.reload();
    } catch (error) {
      showToast('error', 'Failed to create classroom. Please try again.');
    } finally {
      setIsAddingClassroom(false);
    }
  };

  const handleInviteParent = async () => {
    if (!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childGender || !childClassroom) return;

    setIsInvitingParent(true);
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) return;

      await inviteParent(user.schoolId, {
        parentFirstName,
        parentLastName,
        parentEmail,
        childFullName: `${childFirstName} ${childLastName}`,
        childDob,
        classroomId: childClassroom,
        gender: childGender
      });

      setIsInviteDialogOpen(false);
      setParentFirstName('');
      setParentLastName('');
      setParentEmail('');
      setChildFirstName('');
      setChildLastName('');
      setChildDob('');
      setChildGender('');
      setChildClassroom('');

      // Refresh the page to show updated stats
      window.location.reload();
    } catch (error) {
      console.error('Error inviting parent:', error);
    } finally {
      setIsInvitingParent(false);
    }
  };

  const handleAddForm = async () => {
    if (!formName.trim() || !formLink.trim()) return;

    setIsAddingForm(true);
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) return;

      await createFormTemplate(formName.trim(), formLink.trim(), user.schoolId);

      setIsAddDialogOpen(false);
      setFormName('');
      setFormLink('');
      setFormStatus('Active');

      // Refresh the stats to show updated form count
      window.location.reload();
    } catch (error) {
      console.error('Error adding form:', error);
    } finally {
      setIsAddingForm(false);
    }
  };

  return <AdminLayout>
    <div className="space-y-6 p-2 ">
      <h1 className="text-2xl font-bold text-foreground">
        Dashboard Overview
      </h1>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, index) => <Card key={index} className="glass-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]" onClick={stat.onClick}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-3xl font-bold mt-2 text-foreground">
                  {stat.value}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-full">{stat.icon}</div>
            </div>
          </CardContent>
        </Card>)}
      </div>

      {/* Quick Actions & Enrollment Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="glass-card lg:col-span-3">
          <CardHeader>
            <CardTitle>Enrollment Progress by Classroom</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? <Loading message="Loading enrollment data..." size="sm" /> : enrollmentProgress.length === 0 ? <div className="text-sm text-muted-foreground">
                No enrollment data available yet.
              </div> : enrollmentProgress.map((classroom, index) => <div key={`${classroom.classroom}-${index}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm">
                    {classroom.classroom}
                  </span>
                  <span className="text-sm text-amazon-teal">
                    {classroom.total > 0 ? Math.round(classroom.completed / classroom.total * 100) : 0}%
                  </span>
                </div>
                <Progress value={classroom.total > 0 ? classroom.completed / classroom.total * 100 : 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {classroom.completed} of {classroom.total} students marked complete
                </p>
              </div>)}
            </div>
          </CardContent>
        </Card>
        {/* Admin Actions */}
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-1  gap-4 ">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="h-6 w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Add Form</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal"
                onClick={() => setIsInviteDialogOpen(true)}
              >
                <Mail className="h-6 w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Invite Parent</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal"
                onClick={() => setIsInviteDialogOpen(true)}
              >
                <UserPlus className="h-6 w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Add Student</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal"
                onClick={() => setIsAddClassroomDialogOpen(true)}
              >
                <School className="h-6 w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Add Classrooms</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Progress */}

      </div>


      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent preventClose>
          <DialogHeader>
            <DialogTitle>Add New Form</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Enter form name"
                className="w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://example.com/form" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Default">Default</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddForm} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!formName.trim() || !formLink.trim() || isAddingForm}>
              {isAddingForm ? 'Adding Form...' : 'Add Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" preventClose>
          <DialogHeader>
            <DialogTitle>Invite New Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h3 className="text-base sm:text-lg font-medium mb-4">Parent Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      First Name
                    </label>
                    <ValidatedInput
                      value={parentFirstName}
                      onChange={e => setParentFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full"
                      validationRules={commonValidationRules.name}
                      showToast={showValidationToast}
                      hideToast={hideValidationToast}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <ValidatedInput
                      value={parentLastName}
                      onChange={e => setParentLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full"
                      validationRules={commonValidationRules.name}
                      showToast={showValidationToast}
                      hideToast={hideValidationToast}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <ValidatedInput
                      type="email"
                      value={parentEmail}
                      onChange={e => setParentEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full"
                      validationRules={commonValidationRules.email}
                      showToast={showValidationToast}
                      hideToast={hideValidationToast}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-medium mb-4">Child Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      First Name
                    </label>
                    <ValidatedInput
                      value={childFirstName}
                      onChange={e => setChildFirstName(e.target.value)}
                      placeholder="Enter first name"
                      className="w-full"
                      validationRules={commonValidationRules.name}
                      showToast={showValidationToast}
                      hideToast={hideValidationToast}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <ValidatedInput
                      value={childLastName}
                      onChange={e => setChildLastName(e.target.value)}
                      placeholder="Enter last name"
                      className="w-full"
                      validationRules={commonValidationRules.name}
                      showToast={showValidationToast}
                      hideToast={hideValidationToast}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={childDob}
                      onChange={e => setChildDob(e.target.value)}
                      className="w-full"
                      min="2000-01-01"
                      max="2020-12-31"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gender
                    </label>
                    <Select value={childGender} onValueChange={setChildGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Classroom
                    </label>
                    <Select value={childClassroom} onValueChange={setChildClassroom}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a classroom" />
                      </SelectTrigger>
                      <SelectContent>
                        {classrooms.map(classroom => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </div>




          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteParent} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childGender || !childClassroom || isInvitingParent}>
              <Mail className="h-4 w-4 mr-2" />
              {isInvitingParent ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={isAddClassroomDialogOpen} onOpenChange={setIsAddClassroomDialogOpen}>
        <DialogContent className="sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle>Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <ValidatedInput
              value={newClassroomName}
              onChange={e => setNewClassroomName(e.target.value)}
              placeholder="Enter classroom name"
              className="w-full"
              validationRules={commonValidationRules.classroom}
              showToast={(message) => showToast('error', message)}
              hideToast={hideValidationToast}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAddClassroomDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" disabled={!newClassroomName.trim() || isAddingClassroom}>
              {isAddingClassroom ? 'Adding Classroom...' : 'Add Classroom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  </AdminLayout>;
}