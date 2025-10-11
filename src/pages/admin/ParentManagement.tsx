import React, { useEffect, useMemo, useState, Children } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Mail, UserCircle, Eye, MoreHorizontal, CheckCircle, XCircle, Calendar, Users, Clock, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui/loading';
import { Toast } from '../../components/ui/toast';
import { ValidatedInput } from '../../components/ui/validated-input';
import { commonValidationRules } from '../../lib/validation';
import { fetchUserContext } from '../../services/api/user';
import { fetchParentDetails, fetchClassrooms, inviteParent, addChild, resendParentConfirmation, deactivateParent } from '../../services/api/admin';
type ParentStatus = 'Active' | 'Archive';
type SignupStatus = 'Signed' | 'Not Signed';
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  classroom: {
    id: string;
    name: string;
  };
}
interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  children: Child[];
  status: ParentStatus;
  signupStatus: SignupStatus;
}
const friendlyNameFromEmail = (email: string): {
  first: string;
  last: string;
} => {
  const local = email.split('@')[0] ?? 'guardian';
  const parts = local.replace(/[._]/g, ' ').split(' ').filter(Boolean);
  const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'Guardian';
  const last = parts.slice(1).map(part => part[0].toUpperCase() + part.slice(1)).join(' ') || 'Family';
  return {
    first,
    last
  };
};
export function ParentManagement() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [classrooms, setClassrooms] = useState<{
    id: string;
    name: string;
  }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [signupFilter, setSignupFilter] = useState<string>('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childGender, setChildGender] = useState('');
  const [childClassroom, setChildClassroom] = useState('');
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildGender, setNewChildGender] = useState('');
  const [newChildClassroom, setNewChildClassroom] = useState('');
  const [loading, setLoading] = useState(true);
  const [parentToDeactivate, setParentToDeactivate] = useState<Parent | null>(null);
  const [toast, setToast] = useState<{
    open: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({ open: false, type: 'info', title: '', message: '' });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;

        // Fetch both parent details and classrooms
        const [parentDetails, classroomData] = await Promise.all([
          fetchParentDetails(user.schoolId).catch(() => []),
          fetchClassrooms(user.schoolId).catch((error) => {
            console.error('fetchClassrooms failed:', error);
            return [];
          })
        ]);

        console.log('Classroom data received:', classroomData);
        console.log('School ID:', user.schoolId);

        if (!isMounted) return;

        // Set classrooms for the dropdowns
        if (classroomData.length > 0) {
          const classroomList = classroomData.map(classroom => ({
            id: classroom.id,
            name: classroom.name
          }));
          console.log('Setting classrooms:', classroomList);
          setClassrooms(classroomList);
        } else {
          console.warn('No classroom data available');
        }
        if (parentDetails.length > 0) {
          const mappedParents: Parent[] = parentDetails.map(detail => {
            const firstName = detail.firstName || friendlyNameFromEmail(detail.email).first;
            const lastName = detail.lastName || friendlyNameFromEmail(detail.email).last;
            const children: Child[] = detail.children?.map(child => {
              const [childFirstName, ...childLastNameParts] = child.childFullName.split(' ');
              return {
                id: child.childId,
                firstName: childFirstName || 'Unknown',
                lastName: childLastNameParts.join(' ') || 'Child',
                dob: child.childDob || '—',
                classroom: {
                  id: child.classroomId || 'unassigned',
                  name: child.classroomName || 'Unassigned'
                }
              };
            }) || [];
            const hasCompletedForms = detail.children?.some(child => Array.isArray(child.forms) && child.forms.some((form: any) => form.status === 'completed')) || false;
            return {
              id: detail.parentId,
              firstName,
              lastName,
              email: detail.email,
              children,
              status: hasCompletedForms ? 'Active' : 'Archive',
              signupStatus: detail.signedStatus === 'signed' ? 'Signed' : 'Not Signed'
            } satisfies Parent;
          });
          setParents(mappedParents);
        }
      } catch (error) {
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
  const filteredParents = useMemo(() => parents.filter(parent => {
    const fullName = `${parent.firstName} ${parent.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || parent.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
    const matchesSignup = signupFilter === 'all' || parent.signupStatus === signupFilter;
    return matchesSearch && matchesStatus && matchesSignup;
  }), [parents, searchQuery, statusFilter, signupFilter]);
  const handleInviteParent = async () => {
    if (!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childGender || !childClassroom) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    try {
      await inviteParent(user.schoolId, {
        parentFirstName,
        parentLastName,
        parentEmail,
        childFullName: `${childFirstName} ${childLastName}`,
        childDob,
        classroomId: childClassroom,
        gender: childGender
      });
      
      // Success - update UI and show success notification
      const classroom = classrooms.find(c => c.id === childClassroom);
      const newParent: Parent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        firstName: parentFirstName,
        lastName: parentLastName,
        email: parentEmail,
        children: [{
          id: Math.random().toString(36).substring(2, 9),
          firstName: childFirstName,
          lastName: childLastName,
          dob: childDob,
          classroom: {
            id: childClassroom,
            name: classroom?.name || 'Unassigned'
          }
        }],
        status: 'Active',
        signupStatus: 'Not Signed'
      };
      setParents([...parents, newParent]);
      resetInviteForm();
      setIsInviteDialogOpen(false);
      
      setToast({
        open: true,
        type: 'success',
        title: '',
        message: `Invitation sent to ${parentEmail}`
      });
      
    } catch (error: any) {
      // Handle specific error cases and show notification
      let errorTitle = 'Invitation Failed';
      let errorMessage = 'Failed to send invitation. Please try again.';
      
      if (error?.response?.status === 409 || error?.code === 'CONFLICT' || 
          (error?.message && error.message.includes('User with this email already exists'))) {
        errorMessage = 'Email already exists';
      }
      
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: errorMessage
      });
      
      throw new Error(errorMessage);
    }
  };
  const handleAddChild = async () => {
    if (!selectedParent || !newChildFirstName || !newChildLastName || !newChildDob || !newChildGender || !newChildClassroom) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    const enrollmentId = selectedParent.children[0]?.id || `enrollment-${Date.now()}`;
    await addChild(user.schoolId, enrollmentId, {
      childFirstName: newChildFirstName,
      childLastName: newChildLastName,
      childDob: newChildDob,
      gender: newChildGender,
      classroomId: newChildClassroom,
      parentId: selectedParent.id
    });
    
    const classroom = classrooms.find(c => c.id === newChildClassroom);
    const newChild: Child = {
      id: Math.random().toString(36).substring(2, 9),
      firstName: newChildFirstName,
      lastName: newChildLastName,
      dob: newChildDob,
      classroom: {
        id: newChildClassroom,
        name: classroom?.name || 'Unassigned'
      }
    };
    setParents(parents.map(parent => parent.id === selectedParent.id ? {
      ...parent,
      children: [...parent.children, newChild]
    } : parent));
    resetAddChildForm();
    setIsAddChildDialogOpen(false);
  };
  const showToast = (message: string) => {
    setToast({
      open: true,
      type: 'error',
      title: '',
      message
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, open: false }));
  };

  const resetInviteForm = () => {
    setParentFirstName('');
    setParentLastName('');
    setParentEmail('');
    setChildFirstName('');
    setChildLastName('');
    setChildDob('');
    setChildGender('');
    setChildClassroom('');

  };
  const resetAddChildForm = () => {
    setNewChildFirstName('');
    setNewChildLastName('');
    setNewChildDob('');
    setNewChildGender('');
    setNewChildClassroom('');
  };
  const handleResendConfirmation = async (parentId: string, parentEmail: string) => {
    await resendParentConfirmation(parentId);
    setToast({
      open: true,
      type: 'success',
      title: '',
      message: `Confirmation email resent to ${parentEmail}`
    });
  };
  const handleDeactivateParent = async () => {
    if (!parentToDeactivate) return;
    
    const parentName = `${parentToDeactivate.firstName} ${parentToDeactivate.lastName}`;
    await deactivateParent(parentToDeactivate.id);
    
    setParents(parents.filter(p => p.id !== parentToDeactivate.id));
    setParentToDeactivate(null);
    setToast({
      open: true,
      type: 'success',
      title: '',
      message: `${parentName} deactivated`
    });
  };
  const getSignupStatusBadge = (status: SignupStatus): 'success' | 'secondary' | 'outline' | 'default' => {
    switch (status) {
      case 'Signed':
        return 'success';
      case 'Not Signed':
        return 'outline';
      default:
        return 'default';
    }
  };
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Parent Management
          </h1>
          <Button onClick={() => {
          resetInviteForm();
          setIsInviteDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90">
            <Plus className="h-4 w-4 mr-2" /> Invite Parent
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-3 space-y-3 md:space-y-0 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search parents..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Archive">Archive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={signupFilter} onValueChange={setSignupFilter}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue placeholder="Signup status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Signup Statuses</SelectItem>
                  <SelectItem value="Signed">Signed</SelectItem>
                  <SelectItem value="Not Signed">Not Signed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Parent
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Children
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Signup Status
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={5} className="py-8">
                        <Loading message="Loading parents..." size="sm"/>
                      </td>
                    </tr> : filteredParents.length > 0 ? filteredParents.map(parent => <tr key={parent.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-3">
                              {parent.firstName.charAt(0)}
                              {parent.lastName.charAt(0)}
                            </div>
                            <div>
                              {parent.signupStatus === 'Signed' ? (
                                <Link to={`/admin/parents/${parent.id}`} state={{
                          parentData: parent
                        }} className="font-medium text-amazon-teal hover:underline">
                                  {parent.firstName} {parent.lastName}
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-400 cursor-not-allowed">
                                  {parent.firstName} {parent.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center text-gray-700">
                            <Mail className="h-4 w-4 mr-2" />
                            {parent.email}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {parent.children.length === 0 ? <span>No children linked yet</span> : <div className="space-y-1">
                              {parent.children.map(child => <div key={child.id} className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span>
                                    {child.firstName} {child.lastName}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {child.classroom.name}
                                  </Badge>
                                </div>)}
                            </div>}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getSignupStatusBadge(parent.signupStatus)} className="flex items-center justify-center w-fit mx-auto">
                            {parent.signupStatus === 'Signed' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {parent.signupStatus === 'Not Signed' && <XCircle className="h-4 w-4 mr-1" />}
                            {parent.signupStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild disabled={parent.signupStatus === 'Not Signed'}>
                                <Link to={`/admin/parents/${parent.id}`} state={{
                            parentData: parent
                          }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={parent.signupStatus === 'Not Signed'}
                                onClick={() => {
                          setSelectedParent(parent);
                          setIsAddChildDialogOpen(true);
                        }}>
                                <UserCircle className="h-4 w-4 mr-2" />
                                Add Child
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild disabled={parent.signupStatus === 'Signed'}>
                                <AsyncButton
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start p-2 h-auto font-normal"
                                  onClick={() => handleResendConfirmation(parent.id, parent.email)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Resend
                                </AsyncButton>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setParentToDeactivate(parent)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No parents match the current filters.
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Invite Parent Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invite New Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Parent Information</h3>
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
                      showToast={showToast}
                      hideToast={hideToast}
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
                      showToast={showToast}
                      hideToast={hideToast}
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
                      showToast={showToast}
                      hideToast={hideToast}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-4">Child Information</h3>
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
                      showToast={showToast}
                      hideToast={hideToast}
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
                      showToast={showToast}
                      hideToast={hideToast}
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
                        {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>)}
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
            <AsyncButton onClick={handleInviteParent} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childGender || !childClassroom}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Child Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add Child to {selectedParent?.firstName}{' '}
              {selectedParent?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                First Name
              </label>
              <ValidatedInput 
                value={newChildFirstName} 
                onChange={e => setNewChildFirstName(e.target.value)} 
                placeholder="Enter first name" 
                className="w-full" 
                validationRules={commonValidationRules.name}
                showToast={showToast}
                hideToast={hideToast}
                autoFocus 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name
              </label>
              <ValidatedInput 
                value={newChildLastName} 
                onChange={e => setNewChildLastName(e.target.value)} 
                placeholder="Enter last name" 
                className="w-full" 
                validationRules={commonValidationRules.name}
                showToast={showToast}
                hideToast={hideToast}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <Input 
                type="date" 
                value={newChildDob} 
                onChange={e => setNewChildDob(e.target.value)} 
                className="w-full" 
                min="2000-01-01" 
                max="2020-12-31" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Gender
              </label>
              <Select value={newChildGender} onValueChange={setNewChildGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Classroom
              </label>
              <Select value={newChildClassroom} onValueChange={setNewChildClassroom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChildDialogOpen(false)}>
              Cancel
            </Button>
            <AsyncButton onClick={handleAddChild} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newChildFirstName || !newChildLastName || !newChildDob || !newChildGender || !newChildClassroom}>
              Add Child
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={parentToDeactivate !== null} onOpenChange={() => setParentToDeactivate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-foreground">
                {parentToDeactivate?.firstName} {parentToDeactivate?.lastName}
              </span>
              ? This action will remove their access.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentToDeactivate(null)}>
              Cancel
            </Button>
            <AsyncButton
              variant="destructive"
              onClick={handleDeactivateParent}
              className="bg-red-600 hover:bg-red-700"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Deactivate
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        onOpenChange={(open) => setToast(prev => ({ ...prev, open }))}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </AdminLayout>;
}