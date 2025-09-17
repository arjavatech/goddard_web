import React, { useState, Children } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Mail, UserCircle, Eye, MoreHorizontal, CheckCircle, XCircle, School, Calendar, Users } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Link } from 'react-router-dom';
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
export function ParentManagement() {
  const [parents, setParents] = useState<Parent[]>([{
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@example.com',
    children: [{
      id: '1',
      firstName: 'Emma',
      lastName: 'Johnson',
      dob: '05/12/2019',
      classroom: {
        id: '1',
        name: 'Sunshine Room'
      }
    }],
    status: 'Active',
    signupStatus: 'Complete'
  }, {
    id: '2',
    firstName: 'Michael',
    lastName: 'Smith',
    email: 'michael.smith@example.com',
    children: [{
      id: '2',
      firstName: 'Noah',
      lastName: 'Smith',
      dob: '03/15/2020',
      classroom: {
        id: '2',
        name: 'Rainbow Room'
      }
    }, {
      id: '3',
      firstName: 'Ava',
      lastName: 'Smith',
      dob: '06/22/2018',
      classroom: {
        id: '1',
        name: 'Sunshine Room'
      }
    }],
    status: 'Active',
    signupStatus: 'Complete'
  }, {
    id: '3',
    firstName: 'Jennifer',
    lastName: 'Brown',
    email: 'jennifer.brown@example.com',
    children: [{
      id: '4',
      firstName: 'Sophia',
      lastName: 'Brown',
      dob: '11/03/2019',
      classroom: {
        id: '3',
        name: 'Stars Room'
      }
    }],
    status: 'Active',
    signupStatus: 'Pending'
  }, {
    id: '4',
    firstName: 'David',
    lastName: 'Wilson',
    email: 'david.wilson@example.com',
    children: [{
      id: '5',
      firstName: 'Olivia',
      lastName: 'Wilson',
      dob: '02/18/2020',
      classroom: {
        id: '2',
        name: 'Rainbow Room'
      }
    }],
    status: 'Archive',
    signupStatus: 'Complete'
  }, {
    id: '5',
    firstName: 'Jessica',
    lastName: 'Martinez',
    email: 'jessica.martinez@example.com',
    children: [],
    status: 'Active',
    signupStatus: 'Invited'
  }]);
  const [classrooms, setClassrooms] = useState([{
    id: '1',
    name: 'Sunshine Room'
  }, {
    id: '2',
    name: 'Rainbow Room'
  }, {
    id: '3',
    name: 'Stars Room'
  }, {
    id: '4',
    name: 'Moon Room'
  }, {
    id: '5',
    name: 'Ocean Room'
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [signupFilter, setSignupFilter] = useState<string>('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
  // New parent invitation form state
  const [parentFirstName, setParentFirstName] = useState('');
  const [parentLastName, setParentLastName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [childFirstName, setChildFirstName] = useState('');
  const [childLastName, setChildLastName] = useState('');
  const [childDob, setChildDob] = useState('');
  const [childClassroom, setChildClassroom] = useState('');
  // Add child form state
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildClassroom, setNewChildClassroom] = useState('');
  const filteredParents = parents.filter(parent => {
    const fullName = `${parent.firstName} ${parent.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || parent.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
    const matchesSignup = signupFilter === 'all' || parent.signupStatus === signupFilter;
    return matchesSearch && matchesStatus && matchesSignup;
  });
  const handleInviteParent = () => {
    if (parentFirstName && parentLastName && parentEmail && childFirstName && childLastName && childDob && childClassroom) {
      const classroom = classrooms.find(c => c.id === childClassroom);
      const newParent: Parent = {
        id: (parents.length + 1).toString(),
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
            name: classroom?.name || ''
          }
        }],
        status: 'Active',
        signupStatus: 'Invited'
      };
      setParents([...parents, newParent]);
      resetInviteForm();
      setIsInviteDialogOpen(false);
    }
  };
  const handleAddChild = () => {
    if (selectedParent && newChildFirstName && newChildLastName && newChildDob && newChildClassroom) {
      const classroom = classrooms.find(c => c.id === newChildClassroom);
      const newChild: Child = {
        id: Math.random().toString(36).substring(2, 9),
        firstName: newChildFirstName,
        lastName: newChildLastName,
        dob: newChildDob,
        classroom: {
          id: newChildClassroom,
          name: classroom?.name || ''
        }
      };
      setParents(parents.map(parent => parent.id === selectedParent.id ? {
        ...parent,
        children: [...parent.children, newChild]
      } : parent));
      resetAddChildForm();
      setIsAddChildDialogOpen(false);
    }
  };
  const resetInviteForm = () => {
    setParentFirstName('');
    setParentLastName('');
    setParentEmail('');
    setChildFirstName('');
    setChildLastName('');
    setChildDob('');
    setChildClassroom('');
  };
  const resetAddChildForm = () => {
    setNewChildFirstName('');
    setNewChildLastName('');
    setNewChildDob('');
    setNewChildClassroom('');
  };
  const openAddChildDialog = (parent: Parent) => {
    setSelectedParent(parent);
    setNewChildLastName(parent.lastName); // Pre-fill last name
    setIsAddChildDialogOpen(true);
  };
  const toggleParentStatus = (parent: Parent) => {
    setParents(parents.map(p => p.id === parent.id ? {
      ...p,
      status: p.status === 'Active' ? 'Archive' : 'Active'
    } : p));
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
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search parents..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Archive">Archive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={signupFilter} onValueChange={setSignupFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by signup" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Signup Statuses</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Invited">Invited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Signup
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.length > 0 ? filteredParents.map(parent => <tr key={parent.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-3">
                              {parent.firstName.charAt(0)}
                              {parent.lastName.charAt(0)}
                            </div>
                            <span className="font-medium">
                              {parent.firstName} {parent.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{parent.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {parent.children.length > 0 ? <div className="flex items-center">
                              <Users className="h-4 w-4 mr-2 text-gray-500" />
                              <div>
                                {parent.children.map((child, index) => <div key={child.id} className="text-sm">
                                    {child.firstName} {child.lastName}
                                    {index < parent.children.length - 1 ? ', ' : ''}
                                  </div>)}
                              </div>
                            </div> : <span className="text-gray-400 text-sm">
                              No children
                            </span>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={parent.status === 'Active' ? 'success' : 'outline'}>
                            {parent.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={parent.signupStatus === 'Complete' ? 'success' : parent.signupStatus === 'Pending' ? 'secondary' : 'default'}>
                            {parent.signupStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/admin/parents/${parent.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center">
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openAddChildDialog(parent)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Child
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toggleParentStatus(parent)}>
                                  {parent.status === 'Active' ? <>
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Archive Parent
                                    </> : <>
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Activate Parent
                                    </>}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No parents found. Try a different search or invite a new
                        parent.
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite New Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <Button onClick={handleInviteParent} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!parentFirstName || !parentLastName || !parentEmail || !childFirstName || !childLastName || !childDob || !childClassroom}>
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