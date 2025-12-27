import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Link as LinkIcon, MoreHorizontal, School, AlertCircle, FileText, Eye, ArrowUpDown, MoreVertical, Settings, Copy, Check } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Loading } from '../../components/ui/loading';
import { ValidatedInput } from '../../components/ui/validated-input';
import { commonValidationRules } from '../../lib/validation';
import { useToast } from '../../contexts/ToastContext';
import { fetchUserContext } from '../../services/api/user';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { deleteForm, createFormTemplate, updateFormTemplate, assignFormToAllStudents } from '../../services/api/admin';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';

type FormStatus = 'Default' | 'Active' | 'Inactive' | 'Archive';
interface Form {
  id: string;
  name: string;
  link: string;
  status: FormStatus;
  classroomsCount: number;
  dueDate?: string;
}
const mapStatus = (status: string | null | undefined): FormStatus => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('default')) return 'Default';
  if (value.includes('inactive')) return 'Inactive';
  if (value.includes('archive')) return 'Archive';
  if (value.includes('active')) return 'Active';
  return 'Active';
};
export function FormsManagement() {
  const [forms, setForms] = useState<Form[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('Default');
  const [formDueDate, setFormDueDate] = useState('');
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isAssignToAllDialogOpen, setIsAssignToAllDialogOpen] = useState(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<Form | null>(null);
  const { showToast } = useToast();

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formName.trim()) errors.formName = 'Form name is required';
    if (!formDueDate) errors.formDueDate = 'Due date is required';
    else {
      const today = new Date();
      const selectedDate = new Date(formDueDate);
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        errors.formDueDate = 'Due date must be greater than today';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        const templates = await fetchFormTemplates(user.schoolId).catch(() => []);
        if (!isMounted) return;
        if (templates.length === 0) return;
        
        const mappedForms: Form[] = templates.map((template, index) => ({
          id: template.id,
          name: template.formName,
          link: template.filloutFormUrl ?? '#',
          status: mapStatus(template.status),
          classroomsCount: 0,
          dueDate: template.due_date || ['2024-01-15', '2024-01-20', '2024-01-25', '2024-02-01'][index % 4]
        }));
        setForms(mappedForms);
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
  const filteredForms = useMemo(() => forms.filter((form: Form) => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [forms, searchQuery, statusFilter]);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedForms = useMemo(() => {
    return [...filteredForms].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'dueDate': aVal = a.dueDate || ''; bVal = b.dueDate || ''; break;
        default: aVal = a.name; bVal = b.name;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [filteredForms, sortBy, sortOrder]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedForms,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ 
    data: sortedForms,
    itemsPerPage: 10,
    mobileItemsPerPage: 5
  });
  const handleAddForm = async () => {
    if (!validateForm()) return;
    
    try {
      setIsAddingForm(true);
      const user = await fetchUserContext();
      if (!user.schoolId) return;
      
      const statusMap: Record<FormStatus, string> = {
        'Default': 'school_default',
        'Active': 'active',
        'Inactive': 'inactive',
        'Archive': 'archived'
      };
      const apiStatus = statusMap[formStatus] || 'school_default';
      
      await createFormTemplate(formName.trim(), formLink.trim(), user.schoolId, formDueDate, apiStatus);
      resetFormFields();
      setIsAddDialogOpen(false);
      window.location.reload();
    } catch (error) {
      setIsAddingForm(false);
      showToast('error', 'Failed to create form. Please try again.');
    }
  };
  const handleEditForm = async () => {
    if (!selectedForm || !formName.trim()) return;
    
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) throw new Error('School context not found');
      
      const statusMap: Record<FormStatus, string> = {
        'Default': 'school_default',
        'Active': 'active',
        'Inactive': 'inactive',
        'Archive': 'archived'
      };
      const apiStatus = statusMap[formStatus] || formStatus.toLowerCase();
      
      // Don't send due date if status is inactive
      const dueDateToSend = apiStatus === 'inactive' ? undefined : formDueDate;
      
      await updateFormTemplate(selectedForm.id, formName.trim(), formLink.trim(), user.schoolId, apiStatus, dueDateToSend);
      
      showToast('success', 'Form updated successfully');
      resetFormFields();
      setIsEditDialogOpen(false);
      window.location.reload();
    } catch (error) {
      showToast('error', 'Failed to update form. Please try again.');
    }
  };
  const handleDeleteForm = async () => {
    if (!selectedForm) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await deleteForm(selectedForm.id, user.schoolId);
    
    // Refetch forms from server to ensure consistency
    const templates = await fetchFormTemplates(user.schoolId).catch(() => []);
    const mappedForms: Form[] = templates.map((template, index) => ({
      id: template.id,
      name: template.formName,
      link: template.filloutFormUrl ?? '#',
      status: mapStatus(template.status),
      classroomsCount: 0,
      dueDate: template.due_date || ['2024-01-15', '2024-01-20', '2024-01-25', '2024-02-01'][index % 4]
    }));
    setForms(mappedForms);
    setIsDeleteDialogOpen(false);
  };
  const resetFormFields = () => {
    setFormName('');
    setFormLink('');
    setFormStatus('Default');
    setFormDueDate('');
    setFormErrors({});
  };
  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormLink(form.link);
    setFormStatus(form.status);
    setFormDueDate(form.dueDate || '');
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (form: Form) => {
    setSelectedForm(form);
    setIsDeleteDialogOpen(true);
  };
  
  const handleAssignToAllStudents = async () => {
    if (!selectedFormForAssign) return;
    
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) return;
      
      await assignFormToAllStudents(user.schoolId, selectedFormForAssign.id, true, formDueDate);
      showToast('success', `Form "${selectedFormForAssign.name}" assigned to all students successfully!`);
      setIsAssignToAllDialogOpen(false);
      setFormDueDate('');
    } catch (error) {
      showToast('error', 'Failed to assign form to all students. Please try again.');
    }
  };
  const getStatusBadgeVariant = (status: FormStatus): 'success' | 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Default':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Archive':
        return 'outline';
      default:
        return 'default';
    }
  };
  const statuses = useMemo(() => {
    const unique = new Set<FormStatus>();
    forms.forEach((form: Form) => unique.add(form.status));
    return Array.from(unique);
  }, [forms]);
  return <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Forms Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage form templates and assignments
            </p>
          </div>
          <Button onClick={() => {
          resetFormFields();
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Form
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Forms
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{forms.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full flex-shrink-0 ml-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Active Forms
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {forms.filter(f => f.status === 'Active').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Default Forms
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {forms.filter(f => f.status === 'Default').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 lg:p-6 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Form Directory</h2>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {sortedForms.length} of {forms.length} forms
                </div>
              </div>
              
              <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search forms..." 
                  className="pl-10 h-10 sm:h-11 bg-background text-sm sm:text-base" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status Filter</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-10 sm:h-11">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-muted-foreground">Sort By</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full h-10 sm:h-11 justify-between">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        Sort
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>Name A-Z</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>Name Z-A</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600 w-1/5">Form Name</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/8">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/8">Due Date</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/3">Form Link</th>
                    <th className="text-center py-3 px-3 font-medium text-gray-600 w-1/8">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={6} className="py-8">
                        <Loading message="Loading forms..." size="sm" />
                      </td>
                    </tr> : paginatedForms.length > 0 ? paginatedForms.map(form => <tr key={form.id} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          <div className="flex items-center">
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">{form.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusBadgeVariant(form.status)} className="text-xs px-2 py-1">
                            {form.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-foreground">
                            {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center text-amazon-teal min-w-0">
                            <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            {form.link ? (
                              <>
                                <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1">
                                  {form.link}
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(form.link);
                                    setCopiedFormId(form.id);
                                    setTimeout(() => setCopiedFormId(null), 3000);
                                  }}
                                  className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Copy link"
                                >
                                  {copiedFormId === form.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                </button>
                              </>
                            ) : (
                              <span className="text-gray-400">Not provided</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                               <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {form.link && (
                                <DropdownMenuItem onClick={() => window.open(form.link, '_blank')}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Form
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => openEditDialog(form)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedFormForAssign(form);
                                  setIsAssignToAllDialogOpen(true);
                                }}
                              >
                                <School className="h-4 w-4 mr-2" />
                                Assign to All Students
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(form)} 
                                className="text-red-600 focus:text-red-600"
                                disabled={form.status === 'Active'}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No forms match the current filters.
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredForms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              className="hidden lg:flex"
            />

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-2 sm:space-y-3 p-3 sm:p-4">
              {loading ? (
                <div className="py-6 sm:py-8">
                  <Loading message="Loading forms..." size="sm" />
                </div>
              ) : paginatedForms.length > 0 ? (
                paginatedForms.map(form => (
                  <Card key={form.id} className="p-3 sm:p-4">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-semibold text-foreground text-sm sm:text-base truncate flex-1">{form.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {form.link && (
                            <DropdownMenuItem onClick={() => window.open(form.link, '_blank')}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Form
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => openEditDialog(form)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedFormForAssign(form);
                              setIsAssignToAllDialogOpen(true);
                            }}
                          >
                            <School className="h-4 w-4 mr-2" />
                            Assign to All Students
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(form)} 
                            className="text-red-600 focus:text-red-600"
                            disabled={form.status === 'Active'}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(form.status)} className="text-xs">
                          {form.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          Due: {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-2 text-amazon-teal min-w-0">
                        <LinkIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                        {form.link ? (
                          <>
                            <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline text-xs sm:text-sm break-all min-w-0 flex-1">
                              {form.link}
                            </a>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(form.link);
                                setCopiedFormId(form.id);
                                setTimeout(() => setCopiedFormId(null), 3000);
                              }}
                              className="ml-1 p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                              title="Copy link"
                            >
                              {copiedFormId === form.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs sm:text-sm">No link provided</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm">
                  No forms found matching your search criteria.
                </div>
              )}
              
              <MobilePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Add Form Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Form</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <Input 
                value={formName} 
                onChange={e => {
                  setFormName(e.target.value);
                  if (formErrors.formName) {
                    setFormErrors(prev => ({...prev, formName: ''}));
                  }
                }} 
                placeholder="Enter form name" 
                className={`w-full h-10 sm:h-11 text-sm sm:text-base ${formErrors.formName ? 'border-red-500' : ''}`} 
                autoFocus 
              />
              {formErrors.formName && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input 
                value={formLink} 
                onChange={e => {
                  setFormLink(e.target.value);
                  if (formErrors.formLink) {
                    setFormErrors(prev => ({...prev, formLink: ''}));
                  }
                }} 
                placeholder="https://example.com/form" 
                className={`w-full h-10 sm:h-11 text-sm sm:text-base ${formErrors.formLink ? 'border-red-500' : ''}`} 
              />
              {formErrors.formLink && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formLink}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={value => setFormStatus(value as FormStatus)}>
                <SelectTrigger className="h-10 sm:h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Default">Default</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Archive">Archive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => {
                  setFormDueDate(e.target.value);
                  if (formErrors.formDueDate) {
                    setFormErrors(prev => ({...prev, formDueDate: ''}));
                  }
                }}
                className={`w-full h-10 sm:h-11 ${formErrors.formDueDate ? 'border-red-500' : ''}`}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              {formErrors.formDueDate && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formDueDate}</p>
              )}
            </div>

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton onClick={handleAddForm} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!formName.trim() || !formLink.trim() || !formDueDate || isAddingForm || !!formErrors.formName || !!formErrors.formLink || !!formErrors.formDueDate}>
              {isAddingForm ? 'Adding Form...' : 'Add Form'}
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Form</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <Input 
                value={formName} 
                onChange={e => {
                  setFormName(e.target.value);
                  if (formErrors.formName) {
                    setFormErrors(prev => ({...prev, formName: ''}));
                  }
                }} 
                placeholder="Enter form name" 
                className={`w-full h-10 sm:h-11 text-sm sm:text-base ${formErrors.formName ? 'border-red-500' : ''}`} 
                autoFocus 
              />
              {formErrors.formName && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input 
                value={formLink} 
                onChange={e => {
                  setFormLink(e.target.value);
                  if (formErrors.formLink) {
                    setFormErrors(prev => ({...prev, formLink: ''}));
                  }
                }} 
                placeholder="https://example.com/form" 
                className={`w-full h-10 sm:h-11 text-sm sm:text-base ${formErrors.formLink ? 'border-red-500' : ''}`} 
              />
              {formErrors.formLink && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formLink}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={value => setFormStatus(value as FormStatus)}>
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
            <div>
              <label className="block text-sm font-medium mb-2">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 sm:h-11"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                
              </p>
            </div>

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton onClick={handleEditForm} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!formName.trim() || !formLink.trim()}>
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Form Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Form</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <p className="text-sm sm:text-base text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedForm?.name}</span>? This
              action cannot be undone.
            </p>

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleDeleteForm} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Delete Form
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to All Students Dialog */}
      <Dialog open={isAssignToAllDialogOpen} onOpenChange={setIsAssignToAllDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Assign Form to All Students</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <p className="text-sm sm:text-base text-gray-600">
              Are you sure you want to assign{' '}
              <span className="font-medium">{selectedFormForAssign?.name}</span>{' '}
              to all students in the school? This will add the form to every student's enrollment.
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 sm:h-11"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use default 30-day due date
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAssignToAllDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton onClick={handleAssignToAllStudents} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm">
              Assign to All Students
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}