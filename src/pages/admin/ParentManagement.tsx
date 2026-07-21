import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Mail, UserCircle, Eye, MoreHorizontal, CheckCircle, XCircle, Users, Clock, RefreshCw, UserCheck, Download, GraduationCap } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { StatCard } from '../../components/ui/stat-card';
import { SortDropdown, sortItems, type SortOption } from '../../components/ui/sort-dropdown';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { PageLoader } from '../../components/ui/page-loader';

import { fetchParentDetails, fetchClassrooms, inviteParent, addChild, resendParentConfirmation, deactivateParent, activateParent } from '../../services/api/admin';
import { validateEmail } from '../../lib/emailValidation';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { InviteParentModal } from '../../components/admin/InviteParentModal';
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
  const [classroomsLoaded, setClassroomsLoaded] = useState(false);

  const loadClassroomsIfNeeded = async () => {
    if (classroomsLoaded || !schoolId) return;
    try {
      const classroomData = await fetchClassrooms(schoolId);
      if (classroomData.length > 0) {
        setClassrooms(classroomData.map(c => ({ id: c.id, name: c.name })));
      }
      setClassroomsLoaded(true);
    } catch {}
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [signupFilter, setSignupFilter] = useState<string>('all');
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null);
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
  const [newChildFirstName, setNewChildFirstName] = useState('');
  const [newChildLastName, setNewChildLastName] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildGender, setNewChildGender] = useState('');
  const [newChildClassroom, setNewChildClassroom] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const toggleParentExpanded = (parentId: string) => {
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };
  const [loading, setLoading] = useState(true);
  const [parentToDeactivate, setParentToDeactivate] = useState<Parent | null>(null);
  const [resendingParentId, setResendingParentId] = useState<string | null>(null);
  const [deactivatingParentId, setDeactivatingParentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [deactivatedParents, setDeactivatedParents] = useState<Parent[]>([]);
  const [parentToActivate, setParentToActivate] = useState<Parent | null>(null);
  const [activatingParentId, setActivatingParentId] = useState<string | null>(null);
  const { showToast } = useToast();

  const schoolId = localStorage.getItem('schoolId');

  const mapParentDetails = useCallback((detail: any): Parent => {
    console.log('Mapping parent detail:', {
      parentId: detail.parentId,
      parent_id: detail.parent_id,
      email: detail.email,
      originalDetail: detail
    });

    const parentId = detail.parentId || detail.parent_id || '';
    if (!parentId) {
      console.warn('No parent ID found in detail:', detail);
    }

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

    const mappedParent = {
      id: parentId,
      firstName,
      lastName,
      email: detail.email,
      children,
      status: hasCompletedForms ? 'Active' : 'Archive',
      signupStatus: detail.signedStatus === 'signed' ? 'Signed' : 'Not Signed'
    } satisfies Parent;

    console.log('Mapped parent:', { id: mappedParent.id, email: mappedParent.email });
    return mappedParent;
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // const user = await fetchUserContext();
        if (!schoolId) return;

        // Fetch parent details only — classrooms are loaded lazily when modals open
        const parentDetailsResponse = await fetchParentDetails(schoolId).catch(() => ({ activeParents: [], inactiveParents: [] }));

        if (!isMounted) return;

        // Map active parents
        if (parentDetailsResponse.activeParents.length > 0) {
          const mappedActiveParents = parentDetailsResponse.activeParents.map(mapParentDetails);
          console.log('Mapped active parents:', mappedActiveParents.map(p => ({ id: p.id, email: p.email, originalParentId: parentDetailsResponse.activeParents.find((orig: any) => orig.email === p.email)?.parentId })));
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
  // Sort functionality
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortLabels: Record<string, string> = { name: 'Name', email: 'Email', status: 'Status', children: 'Children' };
  const sortOptions: SortOption[] = [
    { label: 'Name A-Z', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Name Z-A', sortBy: 'name', sortOrder: 'desc' },
    { label: 'Email A-Z', sortBy: 'email', sortOrder: 'asc' },
    { label: 'Email Z-A', sortBy: 'email', sortOrder: 'desc' },
    { label: 'Most Children', sortBy: 'children', sortOrder: 'desc' },
  ];

  const filteredParents = useMemo(() => {
    const currentParents = activeTab === 'active' ? parents : deactivatedParents;
    return currentParents.filter(parent => {
      const fullName = `${parent.firstName} ${parent.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || parent.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || parent.status === statusFilter;
      const matchesSignup = signupFilter === 'all' || parent.signupStatus === signupFilter;
      return matchesSearch && matchesStatus && matchesSignup;
    });
  }, [activeTab, parents, deactivatedParents, searchQuery, statusFilter, signupFilter]);

  const sortedParents = useMemo(() =>
    sortItems(filteredParents, sortBy, sortOrder, (p, key) => {
      if (key === 'email') return p.email;
      if (key === 'status') return p.status;
      if (key === 'children') return p.children.length;
      return `${p.firstName} ${p.lastName}`;
    }),
  [filteredParents, sortBy, sortOrder]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedParents,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ data: sortedParents });


  const [inviteFormErrors, setInviteFormErrors] = useState<{[key: string]: string}>({});
  const [isDialogClosing, setIsDialogClosing] = useState(false);

  const validateInviteForm = () => {
    const errors: {[key: string]: string} = {};

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
    
    if (!schoolId) throw new Error('School context not found');
    
    try {
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
        childDob: childDob || undefined,
        classroomId: childClassroom,
        gender: childGender,
        secondaryParentEmail: secondaryParentEmail.trim() || undefined,
        secondaryParentFirstName: secondaryParentFirstName.trim() || undefined,
        secondaryParentLastName: secondaryParentLastName.trim() || undefined,
        secondaryParentPhoneNumber: secondaryParentPhoneNumber.trim() || undefined
      });
      
      // Re-fetch to get the real parent_id assigned by the DB
      const refreshed = await fetchParentDetails(schoolId).catch(() => null);
      if (refreshed) {
        setParents(refreshed.activeParents.map(mapParentDetails));
        setDeactivatedParents(refreshed.inactiveParents.map(mapParentDetails));
      }
      resetInviteForm();
      setIsInviteDialogOpen(false);
      
      showToast('success', `Invitation sent to ${parentEmail}`);
      
    } catch (error: any) {
      // Check for email bounce error - don't retry
      if (error?.code === 'EMAIL_BOUNCE' || error?.status === 502 || error?.noRetry) {
        const errorMessage = error.message || 'External service error: Email was suppressed by the mail provider. The address may have previously bounced — please ask the recipient to check with their IT or try a different address.';
        showToast('error', errorMessage);
        // Don't throw - just show error and keep dialog open for user to fix
        return;
      }
      
      // Handle specific error cases and show notification
      let errorMessage = error?.message || 'Failed to send invitation. Please try again.';

      // Check for conflict error (email already exists)
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
    if (!newChildGender) errors.newChildGender = 'Child gender is required';
    if (!newChildClassroom) errors.newChildClassroom = 'Child classroom is required';
    
    setAddChildFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddChild = async () => {
    if (!selectedParent || !validateAddChildForm()) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) throw new Error('School context not found');
      
      const enrollmentId = selectedParent.children[0]?.id || `enrollment-${Date.now()}`;
      await addChild(schoolId, enrollmentId, {
        childFirstName: newChildFirstName,
        childLastName: newChildLastName,
        childDob: newChildDob || undefined,
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
    
    // Validate parent ID format - should be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!parentId || !uuidRegex.test(parentId)) {
      console.error('Invalid parent ID detected:', parentId);
      showToast('error', 'Invalid parent ID. Please refresh the page and try again.');
      return;
    }
    
    console.log('BACKEND CALL - Sending parentId to resendParentConfirmation API:', parentId);
    setResendingParentId(parentId);
    try {
      await resendParentConfirmation(parentId);
      showToast('success', `Confirmation email resent to ${parentEmail}`);
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      
      // Check for email bounce error - don't retry
      if (error?.code === 'EMAIL_BOUNCE' || error?.status === 502 || error?.noRetry) {
        const errorMessage = error.message || 'External service error: Email was suppressed by the mail provider. The address may have previously bounced — please ask the recipient to check with their IT or try a different address.';
        showToast('error', errorMessage);
        // Don't throw - just show error
        return;
      }
      
      // Check if it's a real HTTP error (status code >= 400)
      if (error?.status >= 400 || error?.response?.status >= 400) {
        let errorMessage = 'Failed to resend confirmation. Please try again.';
        
        const status = error.status || error.response?.status;
        if (status === 404) {
          errorMessage = 'Parent not found. Please refresh the page and try again.';
        } else if (status === 400 || status === 422) {
          errorMessage = 'Invalid parent ID. Please refresh the page and try again.';
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

  const exportToCSV = () => {
    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = ['Parent Name', 'Email', 'Children', 'Classrooms', 'Signup Status'];

    const rows = sortedParents.map(parent => [
      `${parent.firstName} ${parent.lastName}`,
      parent.email,
      parent.children.map(c => `${c.firstName} ${c.lastName}`).join('; '),
      parent.children.map(c => c.classroom.name).join('; '),
      parent.signupStatus
    ]);

    const csvContent = [
      'The Goddard School',
      '',
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parents_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const headers = ['Parent Name', 'Email', 'Children', 'Classrooms', 'Signup Status'];

    const rows = sortedParents.map(parent => [
      `${parent.firstName} ${parent.lastName}`,
      parent.email,
      parent.children.map(c => `${c.firstName} ${c.lastName}`).join(', '),
      parent.children.map(c => c.classroom.name).join(', '),
      parent.signupStatus
    ]);

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>Parent Directory Export</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  .header { text-align: center; margin-bottom: 16px; }
  .logo { height: 60px; width: auto; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  p { font-size: 12px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background-color: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) { background-color: #fafafa; }
  @media print { body { margin: 0; } }
</style></head><body>
<div class="header">
  <img src="${window.location.origin}/images/gs_logo_lynnwood.png" alt="The Goddard School" class="logo" />
  <h1>Parent Directory Export</h1>
  <p>Exported on ${new Date().toLocaleDateString()} &bull; ${rows.length} parents</p>
</div>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>
</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return <PageLoader message="Loading parent management..." Layout={AdminLayout} />;
  }

  return <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Parent Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage parent accounts and family information</p>
          </div>
          <Button onClick={() => { resetInviteForm(); setInviteFormErrors({}); loadClassroomsIfNeeded(); setIsInviteDialogOpen(true); }}
            className="bg-white text-[#0F2D52] border-2 border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white rounded-xl w-full h-10 sm:w-auto transition-all duration-200" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Invite Parent
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '0ms' }}>
            <StatCard label="Total Parents" value={parents.length} icon={Users} iconBgClass="bg-cyan-50" iconColorClass="text-cyan-600" className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '40ms' }}>
            <StatCard label="Signed Up" value={parents.filter(p=>p.signupStatus==='Signed').length} icon={CheckCircle} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '80ms' }}>
            <StatCard label="Pending Signup" value={parents.filter(p=>p.signupStatus==='Not Signed').length} icon={Clock} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out animate-fade-in-up h-fit" style={{ animationDelay: '120ms' }}>
          <CardContent className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Parent Directory</h2>
                <div className="flex items-center gap-3">
                  <div className="text-xs sm:text-sm text-slate-500">
                    {sortedParents.length} of {activeTab === 'active' ? parents.length : deactivatedParents.length} parents
                  </div>
                  {sortedParents.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="bg-white text-[#0F2D52] border-2 border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white rounded-xl h-9 sm:h-10 transition-all duration-200">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToCSV}>
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF}>
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div title="No records to export">
                      <Button size="sm" className="bg-white text-[#0F2D52]/40 border-2 border-[#0F2D52]/20 rounded-xl h-9 sm:h-10 cursor-not-allowed" disabled>
                        <Download className="h-4 w-4 mr-2" />
                      </Button>
                    </div>
                  )}
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
                  className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Signup Status</label>
                  <Select value={signupFilter} onValueChange={setSignupFilter}>
                    <SelectTrigger className="h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                      <SelectValue placeholder="Signup status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Signup Statuses</SelectItem>
                      <SelectItem value="Signed">Signed</SelectItem>
                      <SelectItem value="Not Signed">Not Signed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Sort By</label><br />
                  <SortDropdown
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    options={sortOptions}
                    labels={sortLabels}
                    onSort={(by, order) => { setSortBy(by); setSortOrder(order); }}
                  />
                </div>
              </div>
            </div>
            {/* Desktop Table View */}
            <DataTable
              className="hidden md:block"
              loading={loading}
              loadingMessage="Loading parents..."
              emptyMessage="No parents match the current filters."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedParents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Parent', className: 'w-1/3' },
                { header: 'Email', className: 'w-1/4 hidden lg:table-cell' },
                { header: 'Children', className: 'w-1/3' },
                { header: 'Signup Status', className: 'w-1/6 text-center' },
                { header: 'Actions', className: 'w-1/6 text-center' },
              ]}
              rows={paginatedParents.map((parent, index) => (
                <tr key={parent.id || `parent-${index}`} className="border-b border-gray-100 hover:bg-[#F8FAFC] transition-all duration-200 ease-in-out">
                  <td className="py-3 px-3 max-w-0">
                    <div className="flex items-center gap-2">
                      <AvatarInitials initials={`${parent.firstName[0]}${parent.lastName[0]}`} className="flex-shrink-0" />
                      <div className="min-w-0">
                        {parent.signupStatus === 'Signed' ? (
                          <Link to={`/admin/parents/${parent.id}`} state={{ parentData: parent }} className="font-medium text-amazon-teal hover:underline block truncate">
                            {parent.firstName.charAt(0).toUpperCase() + parent.firstName.slice(1)} {parent.lastName.charAt(0).toUpperCase() + parent.lastName.slice(1)}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-400 cursor-not-allowed block truncate">
                            {parent.firstName.charAt(0).toUpperCase() + parent.firstName.slice(1)} {parent.lastName.charAt(0).toUpperCase() + parent.lastName.slice(1)}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground truncate lg:hidden">{parent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 max-w-0 hidden lg:table-cell">
                    <div className="flex items-center text-gray-700 min-w-0">
                      <Mail className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate text-sm">{parent.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-600 max-w-0">
                    {parent.children.length === 0 ? (
                      <span className="text-muted-foreground text-xs italic">No children linked yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-2 py-1 max-w-sm">
                        {(expandedParents[parent.id] ? parent.children : parent.children.slice(0, 2)).map(child => (
                          <div 
                            key={child.id} 
                            className="inline-flex items-center gap-1.5 bg-amazon-teal/[0.04] border border-amazon-teal/10 hover:border-amazon-teal/30 hover:bg-amazon-teal/[0.08] rounded-full pl-2 pr-2.5 py-1 text-xs transition-all shadow-sm duration-200 group"
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-amazon-teal/70 group-hover:text-amazon-teal flex-shrink-0" />
                            <Link
                              to={`/admin/parents/${parent.id}`}
                              state={{ parentData: parent, selectedChildId: child.id }}
                              className="font-semibold text-amazon-teal/90 group-hover:text-amazon-teal hover:underline truncate max-w-[110px]"
                            >
                              {child.firstName} {child.lastName}
                            </Link>
                            <span className="h-1.5 w-1.5 rounded-full bg-amazon-teal/20 group-hover:bg-amazon-teal/40 flex-shrink-0" />
                            <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                              {child.classroom.name}
                            </span>
                          </div>
                        ))}
                        {parent.children.length > 2 && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              toggleParentExpanded(parent.id);
                            }}
                            className="inline-flex items-center justify-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-full px-3 py-1 text-[11px] font-bold text-gray-600 transition-all duration-200 shadow-sm"
                          >
                            {expandedParents[parent.id] ? 'Show Less' : `Show More (+${parent.children.length - 2})`}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge variant={getSignupStatusBadge(parent.signupStatus)} className="flex items-center justify-center w-fit mx-auto text-xs">
                      {parent.signupStatus === 'Signed' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {parent.signupStatus === 'Not Signed' && <XCircle className="h-3 w-3 mr-1" />}
                      {parent.signupStatus}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}>
                          <Link to={`/admin/parents/${parent.id}`} state={{ parentData: parent }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={parent.signupStatus === 'Not Signed' || activeTab === 'deactivated'}
                          onClick={() => { setSelectedParent(parent); loadClassroomsIfNeeded(); setIsAddChildDialogOpen(true); }}
                        >
                          <UserCircle className="h-4 w-4 mr-2" />
                          Add Child
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={parent.signupStatus === 'Signed' || resendingParentId === parent.id || activeTab === 'deactivated'}
                          onClick={(e) => { e.preventDefault(); handleResendConfirmation(parent.id, parent.email); }}
                        >
                          {resendingParentId === parent.id ? (
                            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending...</>
                          ) : (
                            <><RefreshCw className="h-4 w-4 mr-2" />Resend</>
                          )}
                        </DropdownMenuItem>
                        {activeTab === 'active' ? (
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            disabled={parent.signupStatus === 'Not Signed'}
                            onClick={() => setParentToDeactivate(parent)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600"
                            disabled={parent.signupStatus === 'Not Signed'}
                            onClick={() => setParentToActivate(parent)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />Activate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            />
            
            {/* Mobile Card View */}
            <MobileCardList
              className="md:hidden p-3 sm:p-4"
              loading={loading}
              loadingMessage="Loading parents..."
              emptyMessage="No parents found matching your search criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              gridClassName="grid grid-cols-1 sm:grid-cols-2 gap-3"
              cards={paginatedParents.map((parent, index) => (
                <Card key={parent.id || `parent-card-${index}`} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <AvatarInitials initials={`${parent.firstName[0]}${parent.lastName[0]}`} className="flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        {parent.signupStatus === 'Signed' ? (
                          <Link to={`/admin/parents/${parent.id}`} state={{
                            parentData: parent
                          }} className="font-medium text-amazon-teal hover:underline text-sm block truncate">
                            {parent.firstName.charAt(0).toUpperCase() + parent.firstName.slice(1)} {parent.lastName.charAt(0).toUpperCase() + parent.lastName.slice(1)}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-400 cursor-not-allowed text-sm block truncate">
                            {parent.firstName.charAt(0).toUpperCase() + parent.firstName.slice(1)} {parent.lastName.charAt(0).toUpperCase() + parent.lastName.slice(1)}
                          </span>
                        )}
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {parent.email}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 rounded-xl">
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
                            loadClassroomsIfNeeded();
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
                            disabled={parent.signupStatus === 'Not Signed'}
                            onClick={() => setParentToDeactivate(parent)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600 focus:text-green-600"
                            disabled={parent.signupStatus === 'Not Signed'}
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
                      <div className="text-muted-foreground text-xs italic">No children linked yet</div>
                    ) : (
                      <div className="space-y-2 mt-2 border-t pt-2.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Children</div>
                        <div className="flex flex-wrap gap-2">
                          {(expandedParents[parent.id] ? parent.children : parent.children.slice(0, 2)).map(child => (
                            <div 
                              key={child.id} 
                              className="inline-flex items-center gap-1.5 bg-amazon-teal/[0.04] border border-amazon-teal/10 hover:border-amazon-teal/30 hover:bg-amazon-teal/[0.08] rounded-full pl-2 pr-2.5 py-1 text-xs transition-all shadow-sm duration-200 group"
                            >
                              <GraduationCap className="h-3.5 w-3.5 text-amazon-teal/70 group-hover:text-amazon-teal flex-shrink-0" />
                              <Link 
                                to={`/admin/parents/${parent.id}`} 
                                state={{
                                  parentData: parent,
                                  selectedChildId: child.id
                                }} 
                                className="font-semibold text-amazon-teal/90 group-hover:text-amazon-teal hover:underline truncate max-w-[110px]"
                              >
                                {child.firstName} {child.lastName}
                              </Link>
                              <span className="h-1.5 w-1.5 rounded-full bg-amazon-teal/20 group-hover:bg-amazon-teal/40 flex-shrink-0" />
                              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                {child.classroom.name}
                              </span>
                            </div>
                          ))}
                          {parent.children.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                toggleParentExpanded(parent.id);
                              }}
                              className="inline-flex items-center justify-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-full px-3 py-1 text-[11px] font-bold text-gray-600 transition-all duration-200 shadow-sm"
                            >
                              {expandedParents[parent.id] ? 'Show Less' : `Show More (+${parent.children.length - 2})`}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            />
          </CardContent>
        </div>
      </div>
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
      {/* Add Child Dialog */}
      <Dialog open={isAddChildDialogOpen} onOpenChange={setIsAddChildDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl no-scrollbar shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Add Child to {selectedParent?.firstName}{' '}
              {selectedParent?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${addChildFormErrors.newChildFirstName ? 'border-red-500' : ''}`} 
                autoFocus 
              />
              {addChildFormErrors.newChildFirstName && (
                <p className="text-xs text-red-600 mt-1">{addChildFormErrors.newChildFirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${addChildFormErrors.newChildLastName ? 'border-red-500' : ''}`} 
              />
              {addChildFormErrors.newChildLastName && (
                <p className="text-xs text-red-600 mt-1">{addChildFormErrors.newChildLastName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Date of Birth (Optional)
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
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${addChildFormErrors.newChildDob ? 'border-red-500' : ''}`} 
                min="2000-01-01" 
                max="2020-12-31" 
              />
              {addChildFormErrors.newChildDob && (
                <p className="text-xs text-red-600 mt-1">{addChildFormErrors.newChildDob}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Gender
              </label>
              <Select value={newChildGender} onValueChange={(value) => {
                setNewChildGender(value);
                if (addChildFormErrors.newChildGender) {
                  setAddChildFormErrors(prev => ({...prev, newChildGender: ''}));
                }
              }}>
                <SelectTrigger className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${addChildFormErrors.newChildGender ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="others">Others</SelectItem>
                </SelectContent>
              </Select>
              {addChildFormErrors.newChildGender && (
                <p className="text-xs text-red-600 mt-1">{addChildFormErrors.newChildGender}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Classroom
              </label>
              <Select value={newChildClassroom} onValueChange={(value) => {
                setNewChildClassroom(value);
                if (addChildFormErrors.newChildClassroom) {
                  setAddChildFormErrors(prev => ({...prev, newChildClassroom: ''}));
                }
              }}>
                <SelectTrigger className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${addChildFormErrors.newChildClassroom ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Select a classroom" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                  {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              {addChildFormErrors.newChildClassroom && (
                <p className="text-xs text-red-600 mt-1">{addChildFormErrors.newChildClassroom}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAddChildDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <AsyncButton onClick={handleAddChild} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold">
              Add Child
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog open={parentToDeactivate !== null} onOpenChange={() => setParentToDeactivate(null)}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Deactivate Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500">
              Are you sure you want to deactivate{' '}
              <span className="font-semibold text-slate-800">
                {parentToDeactivate?.firstName} {parentToDeactivate?.lastName}
              </span>
              ? This action will remove their access.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setParentToDeactivate(null)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivateParent}
              className="bg-red-600 hover:bg-red-700 w-full sm:w-auto h-9 sm:h-10 rounded-xl"
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
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Activate Parent</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-500">
              Are you sure you want to activate{' '}
              <span className="font-semibold text-slate-800">
                {parentToActivate?.firstName} {parentToActivate?.lastName}
              </span>
              ? This will restore their access.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setParentToActivate(null)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <Button
              onClick={handleActivateParent}
              className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto h-9 sm:h-10 rounded-xl text-white font-medium flex items-center justify-center gap-1.5"
              disabled={activatingParentId === parentToActivate?.id}
            >
              {activatingParentId === parentToActivate?.id ? (
                <>
                  <UserCheck className="h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}