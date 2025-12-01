import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Mail, UserCircle, Eye, MoreHorizontal, CheckCircle, XCircle, Users, Clock, RefreshCw, UserCheck } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui/loading';
import { fetchUserContext } from '../../services/api/user';
import { useToast } from '../../contexts/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { fetchParentDetails, fetchClassrooms, inviteParent, addChild, resendParentConfirmation, deactivateParent, activateParent } from '../../services/api/admin';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
  const [secondaryParentFirstName, setSecondaryParentFirstName] = useState('');
  const [secondaryParentLastName, setSecondaryParentLastName] = useState('');
  const [secondaryParentEmail, setSecondaryParentEmail] = useState('');
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
  const [resendingParentId, setResendingParentId] = useState<string | null>(null);
  const [deactivatingParentId, setDeactivatingParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [deactivatedParents, setDeactivatedParents] = useState<Parent[]>([]);
  const [parentToActivate, setParentToActivate] = useState<Parent | null>(null);
  const [activatingParentId, setActivatingParentId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;

        // Fetch both parent details and classrooms
        const [parentDetailsResponse, classroomData] = await Promise.all([
          fetchParentDetails(user.schoolId).catch(() => ({ activeParents: [], inactiveParents: [] })),
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

        // Helper function to map parent details to Parent type
        const mapParentDetails = (detail: any): Parent => {
          console.log('Mapping parent detail:', { parentId: detail.parentId, email: detail.email, originalDetail: detail });
          const firstName = detail.firstName || friendlyNameFromEmail(detail.email).first;
          const lastName = detail.lastName || friendlyNameFromEmail(detail.email).last;
          const children: Child[] = detail.children?.map((child: any) => {
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
          const hasCompletedForms = detail.children?.some((child: any) => Array.isArray(child.forms) && child.forms.some((form: any) => form.status === 'completed')) || false;
          return {
            id: detail.parentId,
            firstName,
            lastName,
            email: detail.email,
            children,
            status: hasCompletedForms ? 'Active' : 'Archive',
            signupStatus: detail.signedStatus === 'signed' ? 'Signed' : 'Not Signed'
          } satisfies Parent;
        };

        // Map active parents
        if (parentDetailsResponse.activeParents.length > 0) {
          const mappedActiveParents = parentDetailsResponse.activeParents.map(mapParentDetails);
          console.log('Mapped active parents:', mappedActiveParents.map(p => ({ id: p.id, email: p.email, originalParentId: parentDetailsResponse.activeParents.find(orig => orig.email === p.email)?.parentId })));
          setParents(mappedActiveParents);
        }

        // Map inactive parents
        if (parentDetailsResponse.inactiveParents.length > 0) {
          const mappedInactiveParents = parentDetailsResponse.inactiveParents.map(mapParentDetails);
          setDeactivatedParents(mappedInactiveParents);
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
  const filteredParents = useMemo(() => {
    const currentParents = activeTab === 'active' ? parents : deactivatedParents;
    return currentParents.filter(parent => {
      const fullName = `${parent.firstName} ${parent.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || parent.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
      const matchesSignup = signupFilter === 'all' || parent.signupStatus === signupFilter;
      return matchesSearch && matchesStatus && matchesSignup;
    });
  }, [parents, deactivatedParents, activeTab, searchQuery, statusFilter, signupFilter]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedParents,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ 
    data: filteredParents,
    itemsPerPage: 10,
    mobileItemsPerPage: 5
  });
  const [inviteFormErrors, setInviteFormErrors] = useState<{[key: string]: string}>({});
  const [isDialogClosing, setIsDialogClosing] = useState(false);

  const validateInviteForm = () => {
    const errors: {[key: string]: string} = {};

    if (!parentEmail.trim()) errors.parentEmail = 'Parent email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) errors.parentEmail = 'Please enter a valid email address';
    if (!childFirstName.trim()) errors.childFirstName = 'Child first name is required';
    if (!childLastName.trim()) errors.childLastName = 'Child last name is required';
    if (!childDob) errors.childDob = 'Child date of birth is required';
    if (!childGender) errors.childGender = 'Child gender is required';
    if (!childClassroom) errors.childClassroom = 'Child classroom is required';

    // Secondary parent validation - only required if email is provided
    if (secondaryParentEmail.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryParentEmail)) {
        errors.secondaryParentEmail = 'Please enter a valid email address';
      }
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
        gender: childGender,
        secondaryParentEmail: secondaryParentEmail.trim() || undefined,
        secondaryParentFirstName: secondaryParentFirstName.trim() || undefined,
        secondaryParentLastName: secondaryParentLastName.trim() || undefined
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
      
      showToast('success', `Invitation sent to ${parentEmail}`);
      
    } catch (error: any) {
      // Handle specific error cases and show notification
      let errorMessage = 'Failed to send invitation. Please try again.';
      
      if (error?.response?.status === 409 || error?.code === 'CONFLICT' || 
          (error?.message && error.message.includes('User with this email already exists'))) {
        errorMessage = 'Email already exists';
      }
      
      showToast('error', errorMessage);
      
      throw new Error(errorMessage);
    }
  };
  const [addChildFormErrors, setAddChildFormErrors] = useState<{[key: string]: string}>({});

  const validateAddChildForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newChildFirstName.trim()) errors.newChildFirstName = 'Child first name is required';
    if (!newChildLastName.trim()) errors.newChildLastName = 'Child last name is required';
    if (!newChildDob) errors.newChildDob = 'Child date of birth is required';
    if (!newChildGender) errors.newChildGender = 'Child gender is required';
    if (!newChildClassroom) errors.newChildClassroom = 'Child classroom is required';
    
    setAddChildFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddChild = async () => {
    if (!selectedParent || !validateAddChildForm()) return;
    
    try {
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
      
      showToast('success', `${newChildFirstName} ${newChildLastName} added successfully`);
    } catch (error: any) {
      showToast('error', 'Failed to add child. Please try again.');
    }
  };


  const resetInviteForm = () => {
    setParentFirstName('');
    setParentLastName('');
    setParentEmail('');
    setSecondaryParentFirstName('');
    setSecondaryParentLastName('');
    setSecondaryParentEmail('');
    setChildFirstName('');
    setChildLastName('');
    setChildDob('');
    setChildGender('');
    setChildClassroom('');
    setInviteFormErrors({});
  };
  const resetAddChildForm = () => {
    setNewChildFirstName('');
    setNewChildLastName('');
    setNewChildDob('');
    setNewChildGender('');
    setNewChildClassroom('');
    setAddChildFormErrors({});
  };
  const handleResendConfirmation = async (parentId: string, parentEmail: string) => {
    console.log('Resending confirmation for parentId:', parentId);
    console.log('Parent email:', parentEmail);
    console.log('BACKEND CALL - Sending parentId to resendParentConfirmation API:', parentId);
    setResendingParentId(parentId);
    try {
      await resendParentConfirmation(parentId);
      showToast('success', `Confirmation email resent to ${parentEmail}`);
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      
      // Check if it's a real HTTP error (status code >= 400)
      if (error?.status >= 400 || error?.response?.status >= 400) {
        let errorMessage = 'Failed to resend confirmation. Please try again.';
        
        const status = error.status || error.response?.status;
        if (status === 404) {
          errorMessage = 'Parent not found. Please refresh the page and try again.';
        } else if (status === 400) {
          errorMessage = 'Invalid request. Please check the parent information.';
        }
        
        showToast('error', errorMessage);
        throw error;
      }
      
      // If it's not a real HTTP error, assume success and show success toast
      showToast('success', `Confirmation email resent to ${parentEmail}`);
    } finally {
      setResendingParentId(null);
    }
  };
  const handleDeactivateParent = async () => {
    if (!parentToDeactivate) return;
    
    setDeactivatingParentId(parentToDeactivate.id);
    try {
      const parentName = `${parentToDeactivate.firstName} ${parentToDeactivate.lastName}`;
      await deactivateParent(parentToDeactivate.id);
      
      // Move parent from active to deactivated
      const deactivatedParent = { ...parentToDeactivate, status: 'Archive' as ParentStatus };
      setParents(parents.filter(p => p.id !== parentToDeactivate.id));
      setDeactivatedParents([...deactivatedParents, deactivatedParent]);
      setParentToDeactivate(null);
      showToast('success', `${parentName} deactivated`);
    } catch (error: any) {
      showToast('error', 'Failed to deactivate parent. Please try again.');
    } finally {
      setDeactivatingParentId(null);
    }
  };

  const handleActivateParent = async () => {
    if (!parentToActivate) return;

    setActivatingParentId(parentToActivate.id);
    try {
      const parentName = `${parentToActivate.firstName} ${parentToActivate.lastName}`;
      await activateParent(parentToActivate.id);

      // Move parent from deactivated to active
      const activatedParent = { ...parentToActivate, status: 'Active' as ParentStatus };
      setDeactivatedParents(deactivatedParents.filter(p => p.id !== parentToActivate.id));
      setParents([...parents, activatedParent]);
      setParentToActivate(null);
      showToast('success', `${parentName} activated`);
    } catch (error: any) {
      showToast('error', 'Failed to activate parent. Please try again.');
    } finally {
      setActivatingParentId(null);
    }
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
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 lg:space-y-8 min-h-0 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Parent Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage parent accounts and family information
            </p>
          </div>
          <Button onClick={() => {
          resetInviteForm();
          setInviteFormErrors({});
          setIsInviteDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Invite Parent
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Parents
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{parents.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full flex-shrink-0 ml-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Signed Up
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {parents.filter(p => p.signupStatus === 'Signed').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Pending Signup
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {parents.filter(p => p.signupStatus === 'Not Signed').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="glass-card h-fit">
          <CardContent className="p-0 overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Parent Directory</h2>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {filteredParents.length} of {activeTab === 'active' ? parents.length : deactivatedParents.length} parents
                </div>
              </div>
              
              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4 sm:mb-6">
                <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
                  <TabsTrigger value="active" className="text-xs sm:text-sm">Active ({parents.length})</TabsTrigger>
                  <TabsTrigger value="deactivated" className="text-xs sm:text-sm">Deactivated ({deactivatedParents.length})</TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Search Bar */}
              <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search parents by name or email..." 
                  className="pl-10 h-10 sm:h-11 bg-background text-sm sm:text-base" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Signup Status</label>
                  <Select value={signupFilter} onValueChange={setSignupFilter}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Signup status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Signup Statuses</SelectItem>
                      <SelectItem value="Signed">Signed</SelectItem>
                      <SelectItem value="Not Signed">Not Signed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600 w-1/4">
                      Parent
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/4">
                      Email
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/4">
                      Children
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600 w-1/8">
                      Signup Status
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 w-1/8">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={5} className="py-8">
                        <Loading message="Loading parents..." size="sm"/>
                      </td>
                    </tr> : paginatedParents.length > 0 ? paginatedParents.map(parent => <tr key={parent.id} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-2 flex-shrink-0">
                              {parent.firstName.charAt(0)}
                              {parent.lastName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              {parent.signupStatus === 'Signed' ? (
                                <Link to={`/admin/parents/${parent.id}`} state={{
                          parentData: parent
                        }} className="font-medium text-amazon-teal hover:underline block truncate">
                                  {parent.firstName} {parent.lastName}
                                </Link>
                              ) : (
                                <span className="font-medium text-gray-400 cursor-not-allowed block truncate">
                                  {parent.firstName} {parent.lastName}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center text-gray-700 min-w-0">
                            <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                            <span className="truncate text-sm max-w-[200px]">{parent.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-600">
                          {parent.children.length === 0 ? <span>No children linked yet</span> : <div className="space-y-1">
                              {parent.children.map(child => <div key={child.id} className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <Link 
                                    to={`/admin/parents/${parent.id}`} 
                                    state={{
                                      parentData: parent,
                                      selectedChildId: child.id
                                    }} 
                                    className="text-amazon-teal hover:underline cursor-pointer"
                                  >
                                    {child.firstName} {child.lastName}
                                  </Link>
                                  <Badge variant="secondary" className="text-xs">
                                    {child.classroom.name}
                                  </Badge>
                                </div>)}
                            </div>}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={getSignupStatusBadge(parent.signupStatus)} className="flex items-center justify-center w-fit mx-auto">
                            {parent.signupStatus === 'Signed' && <CheckCircle className="h-4 w-4 mr-1" />}
                            {parent.signupStatus === 'Not Signed' && <XCircle className="h-4 w-4 mr-1" />}
                            {parent.signupStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}>
                                <Link to={`/admin/parents/${parent.id}`} state={{
                            parentData: parent
                          }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}
                                onClick={() => {
                          setSelectedParent(parent);
                          setIsAddChildDialogOpen(true);
                        }}>
                                <UserCircle className="h-4 w-4 mr-2" />
                                Add Child
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={parent.signupStatus === 'Signed' || resendingParentId === parent.id || activeTab === 'deactivated'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleResendConfirmation(parent.id, parent.email);
                                }}
                              >
                                {resendingParentId === parent.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Resend
                                  </>
                                )}
                              </DropdownMenuItem>
                              {activeTab === 'active' ? (
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setParentToDeactivate(parent)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  className="text-green-600 focus:text-green-600"
                                  onClick={() => setParentToActivate(parent)}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </DropdownMenuItem>
                              )}
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
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredParents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              className="hidden lg:flex"
            />
            
            {/* Mobile Card View */}
            <div className="lg:hidden p-3 sm:p-4">
              <div className="space-y-2 sm:space-y-3">
              {loading ? (
                <div className="py-6 sm:py-8">
                  <Loading message="Loading parents..." size="sm" />
                </div>
              ) : paginatedParents.length > 0 ? (
                paginatedParents.map(parent => (
                  <Card key={parent.id} className="p-3 sm:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                          {parent.firstName.charAt(0)}
                          {parent.lastName.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          {parent.signupStatus === 'Signed' ? (
                            <Link to={`/admin/parents/${parent.id}`} state={{
                              parentData: parent
                            }} className="font-medium text-amazon-teal hover:underline text-sm block truncate">
                              {parent.firstName} {parent.lastName}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-400 cursor-not-allowed text-sm block truncate">
                              {parent.firstName} {parent.lastName}
                            </span>
                          )}
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {parent.email}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}>
                            <Link to={`/admin/parents/${parent.id}`} state={{
                              parentData: parent
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}
                            onClick={() => {
                              setSelectedParent(parent);
                              setIsAddChildDialogOpen(true);
                            }}>
                            <UserCircle className="h-4 w-4 mr-2" />
                            Add Child
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={parent.signupStatus === 'Signed' || resendingParentId === parent.id || activeTab === 'deactivated'}
                            onClick={(e) => {
                              e.preventDefault();
                              handleResendConfirmation(parent.id, parent.email);
                            }}
                          >
                            {resendingParentId === parent.id ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend
                              </>
                            )}
                          </DropdownMenuItem>
                          {activeTab === 'active' ? (
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setParentToDeactivate(parent)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-600 focus:text-green-600"
                              onClick={() => setParentToActivate(parent)}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant={getSignupStatusBadge(parent.signupStatus)} className="text-xs px-1.5 py-0.5">
                        {parent.signupStatus === 'Signed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {parent.signupStatus === 'Not Signed' && <XCircle className="h-3 w-3 mr-1" />}
                        {parent.signupStatus}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1.5">
                      {parent.children.length === 0 ? (
                        <div className="text-muted-foreground text-xs">No children linked yet</div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Children:</div>
                          {parent.children.map(child => (
                            <div key={child.id} className="flex items-center gap-2 text-xs">
                              <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <Link 
                                to={`/admin/parents/${parent.id}`} 
                                state={{
                                  parentData: parent,
                                  selectedChildId: child.id
                                }} 
                                className="text-amazon-teal hover:underline cursor-pointer"
                              >
                                {child.firstName} {child.lastName}
                              </Link>
                              <Badge variant="secondary" className="text-xs">
                                {child.classroom.name}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No parents found matching your search criteria.
                </div>
              )}
              
              
            </div>
            <MobilePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
              </div>
          </CardContent>
        </Card>
      </div>
      {/* Invite Parent Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDialogClosing(true);
          setInviteFormErrors({});
          setTimeout(() => setIsDialogClosing(false), 100);
        }
        setIsInviteDialogOpen(open);
      }}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[80vw] max-w-4xl max-h-[85vh] overflow-y-auto mx-4" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Invite New Parent</DialogTitle>
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
                    <Input 
                      value={parentFirstName} 
                      onChange={e => {
                        const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setParentFirstName(value);

                      }}
 
                      placeholder="Enter first name" 
                      className="w-full"
                    />

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

                      }}
 
                      placeholder="Enter last name" 
                      className="w-full"
                    />

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
                {/* Secondary Parent Information - Optional */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-4 text-gray-600">
                    Secondary Parent Information (Optional)
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        First Name
                      </label>
                      <Input
                        value={secondaryParentFirstName}
                        onChange={e => {
                          const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                          setSecondaryParentFirstName(value);
                          if (inviteFormErrors.secondaryParentFirstName) {
                            setInviteFormErrors(prev => ({...prev, secondaryParentFirstName: ''}));
                          }
                        }}
                        placeholder="Enter first name"
                        className={`w-full ${inviteFormErrors.secondaryParentFirstName ? 'border-red-500' : ''}`}
                      />
                      {inviteFormErrors.secondaryParentFirstName && (
                        <p className="text-sm text-red-600 mt-1">{inviteFormErrors.secondaryParentFirstName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Last Name
                      </label>
                      <Input
                        value={secondaryParentLastName}
                        onChange={e => {
                          const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                          setSecondaryParentLastName(value);
                          if (inviteFormErrors.secondaryParentLastName) {
                            setInviteFormErrors(prev => ({...prev, secondaryParentLastName: ''}));
                          }
                        }}
                        placeholder="Enter last name"
                        className={`w-full ${inviteFormErrors.secondaryParentLastName ? 'border-red-500' : ''}`}
                      />
                      {inviteFormErrors.secondaryParentLastName && (
                        <p className="text-sm text-red-600 mt-1">{inviteFormErrors.secondaryParentLastName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        value={secondaryParentEmail}
                        onChange={e => {
                          setSecondaryParentEmail(e.target.value);
                          if (inviteFormErrors.secondaryParentEmail) {
                            setInviteFormErrors(prev => ({...prev, secondaryParentEmail: ''}));
                          }
                        }}
                        onBlur={() => {
                          if (!isDialogClosing && secondaryParentEmail.trim()) {
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(secondaryParentEmail)) {
                              setInviteFormErrors(prev => ({...prev, secondaryParentEmail: 'Please enter a valid email address'}));
                            }
                          }
                        }}
                        placeholder="Enter email address"
                        className={`w-full ${inviteFormErrors.secondaryParentEmail ? 'border-red-500' : ''}`}
                      />
                      {inviteFormErrors.secondaryParentEmail && (
                        <p className="text-sm text-red-600 mt-1">{inviteFormErrors.secondaryParentEmail}</p>
                      )}
                    </div>
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
                        if (!childFirstName.trim()) {
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
                        if (!childLastName.trim()) {
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
                        if (!childDob) {
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
                        {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>)}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsInviteDialogOpen(false);
              setInviteFormErrors({});
            }}>
              Cancel
            </Button>
            <AsyncButton 
              onClick={handleInviteParent} 
              className="bg-amazon-teal hover:bg-amazon-teal/90"
              disabled={!parentFirstName.trim() || !parentLastName.trim() || !parentEmail.trim() || !childFirstName.trim() || !childLastName.trim() || !childDob || !childGender || !childClassroom || (secondaryParentEmail.trim() && (!secondaryParentFirstName.trim() || !secondaryParentLastName.trim()))}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Child Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] max-w-lg max-h-[85vh] overflow-y-auto mx-4" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Add Child to {selectedParent?.firstName}{' '}
              {selectedParent?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                First Name
              </label>
              <Input 
                value={newChildFirstName} 
                onChange={e => {
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setNewChildFirstName(value);
                  if (addChildFormErrors.newChildFirstName) {
                    setAddChildFormErrors(prev => ({...prev, newChildFirstName: ''}));
                  }
                }} 
                placeholder="Enter first name" 
                className={`w-full ${addChildFormErrors.newChildFirstName ? 'border-red-500' : ''}`} 
                autoFocus 
              />
              {addChildFormErrors.newChildFirstName && (
                <p className="text-sm text-red-600 mt-1">{addChildFormErrors.newChildFirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Last Name
              </label>
              <Input 
                value={newChildLastName} 
                onChange={e => {
                  const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setNewChildLastName(value);
                  if (addChildFormErrors.newChildLastName) {
                    setAddChildFormErrors(prev => ({...prev, newChildLastName: ''}));
                  }
                }} 
                placeholder="Enter last name" 
                className={`w-full ${addChildFormErrors.newChildLastName ? 'border-red-500' : ''}`} 
              />
              {addChildFormErrors.newChildLastName && (
                <p className="text-sm text-red-600 mt-1">{addChildFormErrors.newChildLastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Date of Birth
              </label>
              <Input 
                type="date" 
                value={newChildDob} 
                onChange={e => {
                  setNewChildDob(e.target.value);
                  if (addChildFormErrors.newChildDob) {
                    setAddChildFormErrors(prev => ({...prev, newChildDob: ''}));
                  }
                }} 
                className={`w-full ${addChildFormErrors.newChildDob ? 'border-red-500' : ''}`} 
                min="2000-01-01" 
                max="2020-12-31" 
              />
              {addChildFormErrors.newChildDob && (
                <p className="text-sm text-red-600 mt-1">{addChildFormErrors.newChildDob}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Gender
              </label>
              <Select value={newChildGender} onValueChange={(value) => {
                setNewChildGender(value);
                if (addChildFormErrors.newChildGender) {
                  setAddChildFormErrors(prev => ({...prev, newChildGender: ''}));
                }
              }}>
                <SelectTrigger className={addChildFormErrors.newChildGender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
              {addChildFormErrors.newChildGender && (
                <p className="text-sm text-red-600 mt-1">{addChildFormErrors.newChildGender}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Classroom
              </label>
              <Select value={newChildClassroom} onValueChange={(value) => {
                setNewChildClassroom(value);
                if (addChildFormErrors.newChildClassroom) {
                  setAddChildFormErrors(prev => ({...prev, newChildClassroom: ''}));
                }
              }}>
                <SelectTrigger className={addChildFormErrors.newChildClassroom ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {addChildFormErrors.newChildClassroom && (
                <p className="text-sm text-red-600 mt-1">{addChildFormErrors.newChildClassroom}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddChildDialogOpen(false)}>
              Cancel
            </Button>
            <AsyncButton onClick={handleAddChild} className="bg-amazon-teal hover:bg-amazon-teal/90">
              Add Child
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={parentToDeactivate !== null} onOpenChange={() => setParentToDeactivate(null)}>
        <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] max-w-md mx-4" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Deactivate Parent</DialogTitle>
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
            <Button
              variant="destructive"
              onClick={handleDeactivateParent}
              className="bg-red-600 hover:bg-red-700"
              disabled={deactivatingParentId === parentToDeactivate?.id}
            >
              {deactivatingParentId === parentToDeactivate?.id ? (
                <>
                  <XCircle className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Deactivate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Confirmation Dialog */}
      <Dialog open={parentToActivate !== null} onOpenChange={() => setParentToActivate(null)}>
        <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] max-w-md mx-4" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Activate Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to activate{' '}
              <span className="font-semibold text-foreground">
                {parentToActivate?.firstName} {parentToActivate?.lastName}
              </span>
              ? This will restore their access.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setParentToActivate(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleActivateParent}
              className="bg-green-600 hover:bg-green-700"
              disabled={activatingParentId === parentToActivate?.id}
            >
              {activatingParentId === parentToActivate?.id ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}