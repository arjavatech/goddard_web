import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Link as LinkIcon, MoreHorizontal, School, FileText, Eye, ArrowUp, ArrowDown, Settings, Copy, Check } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { createFormTemplate, updateFormTemplate, assignFormToAllStudents } from '../../services/api/admin';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { usePagination } from '../../hooks/usePagination';
import { PageLoader } from '../../components/ui/page-loader';
import { AddFormModal } from '../../components/admin/AddFormModal';
import { validateAddFormFields } from '../../lib/addFormValidation';

type FormStatus = 'school_default' | 'active' | 'inactive' | 'archived' | 'draft' | 'available';
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
  if (value.includes('default') || value.includes('school_default')) return 'school_default';
  if (value.includes('inactive')) return 'inactive';
  if (value.includes('archive') || value.includes('archived')) return 'archived';
  if (value.includes('draft')) return 'draft';
  if (value.includes('available')) return 'available';
  if (value.includes('active')) return 'active';
  return 'active';
};
export function FormsManagement() {
  const [forms, setForms] = useState<Form[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('school_default');
  const [formDueDate, setFormDueDate] = useState('');
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [hasTriedAddFormSubmit, setHasTriedAddFormSubmit] = useState(false);
  const [isAssignToAllDialogOpen, setIsAssignToAllDialogOpen] = useState(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<Form | null>(null);
  const { showToast } = useToast();

  const schoolId = localStorage.getItem('schoolId');

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
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // const user = await fetchUserContext();
        if (!schoolId) return;
        const templates = await fetchFormTemplates(schoolId).catch(() => []);
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
        console.error('Failed to load forms on mount:', error);
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
    
    // Tab filter: Active tab contains 'active' and 'school_default', Inactive tab contains 'inactive'
    const matchesTab = activeTab === 'active'
      ? (form.status === 'active' || form.status === 'school_default')
      : (form.status === 'inactive');

    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesTab && matchesStatus;
  }), [forms, searchQuery, activeTab, statusFilter]);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortLabel = () => {
    const labels: Record<string, string> = {
      name: 'Name',
      status: 'Status',
      dueDate: 'Due Date',
    };
    return labels[sortBy] || 'Sort';
  };

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
  const fetchForms = async (showLoader = true) => {
    if (!schoolId) return;
    try {
      if (showLoader) setLoading(true);
      const templates = await fetchFormTemplates(schoolId).catch(() => []);
      
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
      console.error('Failed to fetch forms:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const handleAddForm = async () => {
    setHasTriedAddFormSubmit(true);
    if (!validateForm()) return;
     
    try {
      setIsAddingForm(true);
      // const user = await fetchUserContext();
      if (!schoolId) return;
      
      await createFormTemplate(formName.trim(), formLink.trim(), schoolId, formDueDate, formStatus);
      showToast('success', 'Form created successfully');
      resetAddFormState();
      setIsAddDialogOpen(false);
      await fetchForms(true);
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

  const handleEditForm = async () => {
    if (!selectedForm || !formName.trim()) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) throw new Error('School context not found');

      
      
      // Don't send due date if status is inactive
      const dueDateToSend = formStatus === 'inactive' ? undefined : formDueDate;
      
      await updateFormTemplate(selectedForm.id, formName.trim(), formLink.trim(), schoolId, formStatus, dueDateToSend);
      
      showToast('success', 'Form updated successfully');
      resetFormFields();
      setIsEditDialogOpen(false);
      await fetchForms(true);
    } catch (error) {
      showToast('error', 'Failed to update form. Please try again.');
    }
  };
  const resetFormFields = () => {
    setFormName('');
    setFormLink('');
    setFormStatus('school_default');
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

  
  const handleAssignToAllStudents = async () => {
    if (!selectedFormForAssign) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) return;
      
      await assignFormToAllStudents(schoolId, selectedFormForAssign.id, true, formDueDate);
      showToast('success', `Form "${selectedFormForAssign.name}" assigned to all students successfully!`);
      setIsAssignToAllDialogOpen(false);
      setFormDueDate('');
    } catch (error) {
      showToast('error', 'Failed to assign form to all students. Please try again.');
    }
  };
  const getStatusBadgeVariant = (status: FormStatus): 'success' | 'default' | 'secondary' | 'outline' | 'info' | 'warning' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'school_default':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'archived':
        return 'outline';
      case 'draft':
        return 'warning';
      case 'available':
        return 'info';
      default:
        return 'default';
    }
  };
  const getStatusDisplayName = (status: FormStatus): string => {
    switch (status) {
      case 'school_default':
        return 'Default';
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'archived':
        return 'Archived';
      case 'draft':
        return 'Draft';
      case 'available':
        return 'Available';
      default:
        return status;
    }
  };
  const statuses: FormStatus[] = ['active', 'inactive', 'school_default'];
  if (loading) {
    return <PageLoader message="Loading forms management..." Layout={AdminLayout} />;
  }

  return <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-14 animate-fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Forms Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage form templates and assignments
            </p>
          </div>
          <Button onClick={() => {
          resetFormFields();
          setIsAddDialogOpen(true);
        }} className="bg-white text-[#1a2740] border-2 border-[#1a2740] hover:bg-[#1a2740] hover:text-white rounded-xl w-full h-10 sm:w-auto transition-all duration-200" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Form
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px] bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full border-b-2 border-[#1a2740] mx-auto mb-4 h-8 w-8"></div>
              <p className="text-muted-foreground text-sm font-medium">Loading forms management...</p>
            </div>
          </div>
        ) : (
          <>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '0ms' }}>
            <Card className="h-full rounded-2xl border border-slate-100 hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1 truncate">
                      Total Forms
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{forms.length}</p>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-cyan-50 rounded-xl flex-shrink-0 ml-2">
                    <FileText className="h-5 w-5 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '40ms' }}>
            <Card className="h-full rounded-2xl border border-slate-100 hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1 truncate">
                      Active Forms
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {forms.filter(f => f.status === 'active').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-green-50 rounded-xl flex-shrink-0 ml-2">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '80ms' }}>
            <Card className="h-full rounded-2xl border border-slate-100 hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1 truncate">
                      Default Forms
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {forms.filter(f => f.status === 'school_default').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-amber-50 rounded-xl flex-shrink-0 ml-2">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '120ms' }}>
            <Card className="h-full rounded-2xl border border-slate-100 hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1 truncate">
                      Inactive Forms
                    </p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                      {forms.filter(f => f.status === 'inactive').length}
                    </p>
                  </div>
                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl flex-shrink-0 ml-2">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">Form Directory</h2>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {sortedForms.length} of {forms.length} forms
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'inactive')} className="mb-4 sm:mb-6">
                <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
                  <TabsTrigger value="active" className="text-xs sm:text-sm">
                    Active ({forms.filter(f => f.status === 'active' || f.status === 'school_default').length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs sm:text-sm">
                    Inactive ({forms.filter(f => f.status === 'inactive').length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
               <div className="relative mb-3 sm:mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search forms..." 
                  className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#1a2740]/20 focus:border-[#1a2740]" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Status Filter</label>
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#1a2740]/20 focus:border-[#1a2740]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map(status => <SelectItem key={status} value={status}>
                          {getStatusDisplayName(status)}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Sort By</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full h-10 sm:h-11 justify-between rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200">
                        {sortOrder === 'asc'
                          ? <ArrowUp className="h-4 w-4 mr-2" />
                          : <ArrowDown className="h-4 w-4 mr-2" />}
                        {getSortLabel()}
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
            <DataTable
              className="hidden lg:block"
              loading={loading}
              loadingMessage="Loading forms..."
              emptyMessage="No forms match the current filters."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredForms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Form Name', className: 'w-1/5' },
                { header: 'Due Date', className: 'w-1/8' },
                { header: 'Form Link', className: 'w-1/3 pr-10' },
                { header: 'Status', className: 'w-1/8 pl-2' },
                { header: 'Actions', className: 'w-1/8 text-center' },
              ]}
              rows={paginatedForms.map(form => (
                <tr key={form.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all duration-200 ease-in-out">
                  <td className="py-3 px-3">
                    <div className="flex items-center">
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{form.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm text-foreground">
                      {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                    </div>
                  </td>
                   <td className="py-3 px-2 pr-10">
                    <div className="flex items-center text-[#1a2740] min-w-0">
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
                  <td className="py-3 px-2 pl-4">
                    <Badge variant={getStatusBadgeVariant(form.status)} className="text-xs px-2 py-1">
                      {getStatusDisplayName(form.status)}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => openEditDialog(form)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={form.status === 'inactive'}
                          onClick={() => {
                            setSelectedFormForAssign(form);
                            setIsAssignToAllDialogOpen(true);
                          }}
                        >
                          <School className="h-4 w-4 mr-2" />
                          Assign to All Students
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            />

            {/* Mobile Card View */}
             <MobileCardList
              className="lg:hidden p-3 sm:p-4"
              loading={loading}
              loadingMessage="Loading forms..."
              emptyMessage="No forms found matching your search criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              gridClassName="space-y-2 sm:space-y-3"
              cards={paginatedForms.map(form => (
                <Card key={form.id} className="p-3 sm:p-4 rounded-2xl border border-slate-100 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 shadow-sm bg-white">
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
                        <DropdownMenuItem onClick={() => openEditDialog(form)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={form.status === 'inactive'}
                          onClick={() => {
                            setSelectedFormForAssign(form);
                            setIsAssignToAllDialogOpen(true);
                          }}
                        >
                          <School className="h-4 w-4 mr-2" />
                          Assign to All Students
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusBadgeVariant(form.status)} className="text-xs">
                        {getStatusDisplayName(form.status)}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        Due: {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                      </div>
                    </div>
                    
                     <div className="flex items-start space-x-2 text-[#1a2740] min-w-0">
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
              ))}
            />
          </CardContent>
        </div>
        </>
      )}
      </div>
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
        setFormStatus={(value) => setFormStatus(value as FormStatus)}
        formDueDate={formDueDate}
        setFormDueDate={setFormDueDate}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        isSubmitting={isAddingForm}
      />
      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Form</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${formErrors.formName ? 'border-red-500' : ''}`} 
                autoFocus 
              />
              {formErrors.formName && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formName}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
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
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${formErrors.formLink ? 'border-red-500' : ''}`} 
              />
              {formErrors.formLink && (
                <p className="text-xs sm:text-sm text-red-600 mt-1">{formErrors.formLink}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Status</label>
              <Select value={formStatus} onValueChange={value => setFormStatus(value as FormStatus)}>
                <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="school_default">Default</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <AsyncButton onClick={handleEditForm} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#1a2740] hover:bg-[#0f1d30] text-white transition-all duration-200 font-semibold" disabled={!formName.trim() || !formLink.trim()}>
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Assign to All Students Dialog */}
      <Dialog open={isAssignToAllDialogOpen} onOpenChange={setIsAssignToAllDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Assign Form to All Students</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <p className="text-sm sm:text-base text-slate-500">
              Are you sure you want to assign{' '}
              <span className="font-semibold text-slate-800">{selectedFormForAssign?.name}</span>{' '}
              to all students in the school? This will add the form to every student's enrollment.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use default 30-day due date
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAssignToAllDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <AsyncButton onClick={handleAssignToAllStudents} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#1a2740] hover:bg-[#0f1d30] text-white transition-all duration-200 font-semibold">
              Assign to All Students
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}
