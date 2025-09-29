import React, { useEffect, useMemo, useState, Children } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Mail, UserCircle, Eye, MoreHorizontal, CheckCircle, XCircle, Calendar, Users, Clock } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui/loading';
import { fetchUserContext } from '../../services/api/user';
import { fetchParentDetails, fetchSchoolEnrollments, fetchClassrooms, inviteParent, addChild } from '../../services/api/admin';
type ParentStatus = 'Active' | 'Archive';
type SignupStatus = 'Complete' | 'Pending' | 'Invited';
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
  const [newChildClassroom, setNewChildClassroom] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        const [parentDetails, enrollments, classroomList] = await Promise.all([fetchParentDetails(user.schoolId).catch(() => []), fetchSchoolEnrollments(user.schoolId).catch(() => []), fetchClassrooms(user.schoolId).catch(() => [])]);
        if (!isMounted) return;
        setClassrooms(classroomList.map(cls => ({
          id: cls.id,
          name: cls.name
        })));
        console.log('Parent details received:', parentDetails);
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
              signupStatus: detail.isSigned ? 'Complete' : 'Invited'
            } satisfies Parent;
          });
          console.log('Mapped parents:', mappedParents);
          setParents(mappedParents);
        }
      } catch (error) {
        console.warn('Failed to load parent management data', error);
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
    if (parentFirstName && parentLastName && parentEmail && childFirstName && childLastName && childDob && childGender && childClassroom) {
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
          signupStatus: 'Invited'
        };
        setParents([...parents, newParent]);
        resetInviteForm();
        setIsInviteDialogOpen(false);
      } catch (error) {
        console.error('Failed to invite parent:', error);
      }
    }
  };
  const handleAddChild = async () => {
    if (selectedParent && newChildFirstName && newChildLastName && newChildDob && newChildClassroom) {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        // Use first child's enrollment ID or generate one
        const enrollmentId = selectedParent.children[0]?.id || `enrollment-${Date.now()}`;
        await addChild(user.schoolId, enrollmentId, {
          childFullName: `${newChildFirstName} ${newChildLastName}`,
          childDob: newChildDob,
          classroomId: newChildClassroom
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
      } catch (error) {
        console.error('Failed to add child:', error);
      }
    }
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
    setNewChildClassroom('');
  };
  const getSignupStatusBadge = (status: SignupStatus): 'success' | 'secondary' | 'outline' | 'default' => {
    switch (status) {
      case 'Complete':
        return 'success';
      case 'Pending':
        return 'secondary';
      case 'Invited':
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
                  <SelectItem value="Complete">Complete</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Invited">Invited</SelectItem>
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
                        <Loading message="Loading parents..." size="sm" />
                      </td>
                    </tr> : filteredParents.length > 0 ? filteredParents.map(parent => <tr key={parent.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-3">
                              {parent.firstName.charAt(0)}
                              {parent.lastName.charAt(0)}
                            </div>
                            <div>
                              <Link to={`/admin/parents/${parent.id}`} state={{
                          parentData: parent
                        }} className="font-medium text-amazon-teal hover:underline">
                                {parent.firstName} {parent.lastName}
                              </Link>
                              <div className={`text-xs ${parent.status === 'Active' ? 'text-green-600' : 'text-gray-500'}`}>
                                {parent.status === 'Active' ? 'Verified' : 'Archived'}
                              </div>
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
                            {parent.signupStatus === 'Complete' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {parent.signupStatus === 'Invited' && <Calendar className="h-4 w-4 mr-1" />}
                            {parent.signupStatus === 'Pending' && <Clock className="h-4 w-4 mr-1" />}
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
                              <DropdownMenuItem asChild>
                                <Link to={`/admin/parents/${parent.id}`} state={{
                            parentData: parent
                          }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                          setSelectedParent(parent);
                          setIsAddChildDialogOpen(true);
                        }}>
                                <UserCircle className="h-4 w-4 mr-2" />
                                Add Child
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
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
                    <Input value={parentFirstName} onChange={e => setParentFirstName(e.target.value)} placeholder="Enter first name" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <Input value={parentLastName} onChange={e => setParentLastName(e.target.value)} placeholder="Enter last name" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} placeholder="Enter email address" className="w-full" />
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
                    <Input value={childFirstName} onChange={e => setChildFirstName(e.target.value)} placeholder="Enter first name" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Last Name
                    </label>
                    <Input value={childLastName} onChange={e => setChildLastName(e.target.value)} placeholder="Enter last name" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Date of Birth
                    </label>
                    <Input type="date" value={childDob} onChange={e => setChildDob(e.target.value)} className="w-full" />
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
            <Button onClick={handleInviteParent} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childGender || !childClassroom}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
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
              <Input value={newChildFirstName} onChange={e => setNewChildFirstName(e.target.value)} placeholder="Enter first name" className="w-full" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name
              </label>
              <Input value={newChildLastName} onChange={e => setNewChildLastName(e.target.value)} placeholder="Enter last name" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <Input type="date" value={newChildDob} onChange={e => setNewChildDob(e.target.value)} className="w-full" />
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
            <Button onClick={handleAddChild} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newChildFirstName || !newChildLastName || !newChildDob || !newChildClassroom}>
              Add Child
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}