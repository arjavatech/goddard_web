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
  const [inviteFormErrors, setInviteFormErrors] = useState<{[key: string]: string}>({});
  const [isDialogClosing, setIsDialogClosing] = useState(false);
  const [isAddClassroomDialogOpen, setIsAddClassroomDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [isAddingClassroom, setIsAddingClassroom] = useState(false);
  const [isClassroomDialogClosing, setIsClassroomDialogClosing] = useState(false);
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
    if (!isClassroomDialogClosing) {
      console.error(message);
    }
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

  const validateInviteForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!parentEmail.trim()) errors.parentEmail = 'Parent email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) errors.parentEmail = 'Please enter a valid email address';
    if (!childFirstName.trim()) errors.childFirstName = 'Child first name is required';
    if (!childLastName.trim()) errors.childLastName = 'Child last name is required';
    if (!childDob) errors.childDob = 'Child date of birth is required';
    if (!childGender) errors.childGender = 'Child gender is required';
    if (!childClassroom) errors.childClassroom = 'Child classroom is required';
    
    setInviteFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInviteParent = async () => {
    if (!validateInviteForm()) return;

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
      setInviteFormErrors({});

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
    <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
        Dashboard Overview
      </h1>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-700">
        {error}
      </div>}
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => <Card key={index} className="glass-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]" onClick={stat.onClick}>
          <CardContent className="p-4 sm:p-5 lg:p-6">
            <div className="flex justify-between items-start">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-foreground">
                  {stat.value}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {stat.change}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-50 rounded-full flex-shrink-0 ml-2">{stat.icon}</div>
            </div>
          </CardContent>
        </Card>)}
      </div>

      {/* Quick Actions & Enrollment Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="glass-card lg:col-span-3 order-2 lg:order-1">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Enrollment Progress by Classroom</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 sm:space-y-4">
              {loading ? <Loading message="Loading enrollment data..." size="sm" /> : enrollmentProgress.length === 0 ? <div className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                No enrollment data available yet.
              </div> : enrollmentProgress.map((classroom, index) => <div key={`${classroom.classroom}-${index}`}>
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
              </div>)}
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
                onClick={() => setIsInviteDialogOpen(true)}
              >
                <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Invite Parent</span>
              </Button>
              {/* <Button
                variant="outline"
                className="h-16 sm:h-20 flex-col gap-1 sm:gap-2 hover:bg-amazon-teal/5 hover:border-amazon-teal text-center"
                onClick={() => setIsInviteDialogOpen(true)}
              >
                <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                <span className="text-xs font-medium">Add Student</span>
              </Button> */}
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

        {/* Enrollment Progress */}

      </div>


      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[400px] max-w-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Form</DialogTitle>
          </DialogHeader>
          <div className="py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <Input
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Enter form name"
                className="w-full h-10 sm:h-11 text-sm sm:text-base"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://example.com/form" className="w-full h-10 sm:h-11 text-sm sm:text-base" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="h-10 sm:h-11">
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
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <Button onClick={handleAddForm} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!formName.trim() || !formLink.trim() || isAddingForm}>
              {isAddingForm ? 'Adding Form...' : 'Add Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogClosing(true);
          setInviteFormErrors({});
          setTimeout(() => setIsDialogClosing(false), 100);
        }
        setIsInviteDialogOpen(open);
      }}>
        <DialogContent className="w-[92vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-4xl max-h-[90vh] overflow-y-auto" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Invite New Parent</DialogTitle>
          </DialogHeader>
          <div className="py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              <div>
                <h3 className="text-base sm:text-lg font-medium mb-4">Parent Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      First Name
                    </label>
                    <Input 
                      value={parentFirstName} 
                      onChange={e => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setParentFirstName(value);
                        if (inviteFormErrors.parentFirstName) {
                          setInviteFormErrors(prev => ({...prev, parentFirstName: ''}));
                        }
                      }}
                      placeholder="Enter first name" 
                      className={`w-full ${inviteFormErrors.parentFirstName ? 'border-red-500' : ''}`}
                    />
                    {inviteFormErrors.parentFirstName && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.parentFirstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <Input 
                      value={parentLastName} 
                      onChange={e => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setParentLastName(value);
                        if (inviteFormErrors.parentLastName) {
                          setInviteFormErrors(prev => ({...prev, parentLastName: ''}));
                        }
                      }}

                      placeholder="Enter last name" 
                      className={`w-full ${inviteFormErrors.parentLastName ? 'border-red-500' : ''}`}
                    />
                    {inviteFormErrors.parentLastName && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.parentLastName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input 
                      type="email" 
                      value={parentEmail} 
                      onChange={e => {
                        setParentEmail(e.target.value);
                        if (inviteFormErrors.parentEmail) {
                          setInviteFormErrors(prev => ({...prev, parentEmail: ''}));
                        }
                      }}
                      onBlur={() => {
                        if (!isDialogClosing) {
                          if (!parentEmail.trim()) {
                            setInviteFormErrors(prev => ({...prev, parentEmail: 'Parent email is required'}));
                          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
                            setInviteFormErrors(prev => ({...prev, parentEmail: 'Please enter a valid email address'}));
                          }
                        }
                      }}
                      placeholder="Enter email address" 
                      className={`w-full ${inviteFormErrors.parentEmail ? 'border-red-500' : ''}`}
                    />
                    {inviteFormErrors.parentEmail && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.parentEmail}</p>
                    )}
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
                    <Input 
                      value={childFirstName} 
                      onChange={e => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setChildFirstName(value);
                        if (inviteFormErrors.childFirstName) {
                          setInviteFormErrors(prev => ({...prev, childFirstName: ''}));
                        }
                      }}
                      onBlur={() => {
                        if (!isDialogClosing && !childFirstName.trim()) {
                          setInviteFormErrors(prev => ({...prev, childFirstName: 'Child first name is required'}));
                        }
                      }}
                      placeholder="Enter first name" 
                      className={`w-full ${inviteFormErrors.childFirstName ? 'border-red-500' : ''}`}
                    />
                    {inviteFormErrors.childFirstName && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childFirstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <Input 
                      value={childLastName} 
                      onChange={e => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setChildLastName(value);
                        if (inviteFormErrors.childLastName) {
                          setInviteFormErrors(prev => ({...prev, childLastName: ''}));
                        }
                      }}
                      onBlur={() => {
                        if (!isDialogClosing && !childLastName.trim()) {
                          setInviteFormErrors(prev => ({...prev, childLastName: 'Child last name is required'}));
                        }
                      }}
                      placeholder="Enter last name" 
                      className={`w-full ${inviteFormErrors.childLastName ? 'border-red-500' : ''}`}
                    />
                    {inviteFormErrors.childLastName && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childLastName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date of Birth
                    </label>
                    <Input 
                      type="date" 
                      value={childDob} 
                      onChange={e => {
                        setChildDob(e.target.value);
                        if (inviteFormErrors.childDob) {
                          setInviteFormErrors(prev => ({...prev, childDob: ''}));
                        }
                      }}
                      onBlur={() => {
                        if (!isDialogClosing && !childDob) {
                          setInviteFormErrors(prev => ({...prev, childDob: 'Child date of birth is required'}));
                        }
                      }}
                      className={`w-full ${inviteFormErrors.childDob ? 'border-red-500' : ''}`} 
                      min="2000-01-01" 
                      max="2020-12-31" 
                    />
                    {inviteFormErrors.childDob && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childDob}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Gender
                    </label>
                    <Select value={childGender} onValueChange={(value) => {
                      setChildGender(value);
                      if (inviteFormErrors.childGender) {
                        setInviteFormErrors(prev => ({...prev, childGender: ''}));
                      }
                    }}>
                      <SelectTrigger className={inviteFormErrors.childGender ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {inviteFormErrors.childGender && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childGender}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Classroom
                    </label>
                    <Select value={childClassroom} onValueChange={(value) => {
                      setChildClassroom(value);
                      if (inviteFormErrors.childClassroom) {
                        setInviteFormErrors(prev => ({...prev, childClassroom: ''}));
                      }
                    }}>
                      <SelectTrigger className={inviteFormErrors.childClassroom ? 'border-red-500' : ''}>
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
                    {inviteFormErrors.childClassroom && (
                      <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childClassroom}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>




          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <Button onClick={handleInviteParent} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim() || !childFirstName.trim() || !childLastName.trim() || !childDob || !childGender || !childClassroom || isInvitingParent}>
              <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              {isInvitingParent ? 'Sending Invitation...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <Dialog open={isAddClassroomDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsClassroomDialogClosing(true);
          setTimeout(() => setIsClassroomDialogClosing(false), 100);
        }
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
            <ValidatedInput
              value={newClassroomName}
              onChange={e => setNewClassroomName(e.target.value)}
              placeholder="Enter classroom name"
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
              validationRules={commonValidationRules.classroom}
              showToast={showValidationToast}
              hideToast={hideValidationToast}
              autoFocus
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAddClassroomDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <Button onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!newClassroomName.trim() || isAddingClassroom}>
              {isAddingClassroom ? 'Adding Classroom...' : 'Add Classroom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  </AdminLayout>;
}