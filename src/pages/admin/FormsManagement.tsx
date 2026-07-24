import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Link as LinkIcon, MoreHorizontal, School, FileText, Eye, ArrowUp, ArrowDown, Settings, Copy, Check, LayoutGrid, List } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
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
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 max-w-7xl mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading forms management...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-12 sm:mt-12 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              Forms Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Manage form templates, availability status, and student assignments
            </p>
          </div>
          <Button 
            onClick={() => {
              resetFormFields();
              setIsAddDialogOpen(true);
            }} 
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Form
          </Button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] bg-white rounded-2xl border border-slate-100 shadow-xs">
            <div className="text-center">
              <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-7 w-7"></div>
              <p className="text-slate-400 text-xs font-semibold">Loading forms management...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                        Total Forms
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{forms.length}</p>
                    </div>
                    <div className="p-2.5 bg-[#EFF5FB] rounded-xl flex-shrink-0 ml-2">
                      <FileText className="h-4 w-4 text-[#0F2D52]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                        Active Forms
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {forms.filter(f => f.status === 'active').length}
                      </p>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl flex-shrink-0 ml-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                        Default Forms
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {forms.filter(f => f.status === 'school_default').length}
                      </p>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-xl flex-shrink-0 ml-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                        Inactive Forms
                      </p>
                      <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                        {forms.filter(f => f.status === 'inactive').length}
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-100 rounded-xl flex-shrink-0 ml-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Form Directory */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
              <CardContent className="p-0">
                <div className="p-5 border-b border-slate-50 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Form Directory</h2>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">{sortedForms.length} of {forms.length} forms</p>
                    </div>

                    {/* Segmented View Switcher */}
                    <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto shadow-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'table'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span>Table View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'card'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span>Card View</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'active' | 'inactive')} className="mb-4">
                    <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100/60 border border-slate-100 rounded-xl gap-1">
                      <TabsTrigger value="active" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F2D52] data-[state=active]:shadow-sm transition-all">
                        Active ({forms.filter(f => f.status === 'active' || f.status === 'school_default').length})
                      </TabsTrigger>
                      <TabsTrigger value="inactive" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F2D52] data-[state=active]:shadow-sm transition-all">
                        Inactive ({forms.filter(f => f.status === 'inactive').length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <div className="relative mb-3">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                    <Input 
                      placeholder="Search forms..." 
                      className="pl-9 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all" 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status Filter</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl">
                          <SelectItem value="all" className="cursor-pointer text-xs">All Statuses</SelectItem>
                          {statuses.map(status => (
                            <SelectItem key={status} value={status} className="cursor-pointer text-xs">
                              {getStatusDisplayName(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sort By</label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-between rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-semibold transition-all">
                            <span className="flex items-center gap-1.5">
                              {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-slate-400" /> : <ArrowDown className="h-3.5 w-3.5 text-slate-400" />}
                              <span>{getSortLabel()}</span>
                            </span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>Name A-Z</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>Name Z-A</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Conditional Rendering of Views */}
                {viewMode === 'card' ? (
                  <MobileCardList
                    className="p-4"
                    loading={loading}
                    loadingMessage="Loading forms..."
                    emptyMessage="No forms found matching your search criteria."
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    cards={paginatedForms.map(form => (
                      <Card key={form.id} className="p-5 rounded-2xl border border-slate-100 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                        <div>
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                              <h3 className="font-bold text-slate-900 text-sm truncate">{form.name}</h3>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-650 flex-shrink-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                                {form.link && (
                                  <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(form.link, '_blank')}>
                                    <Eye className="h-4 w-4 mr-2 text-slate-400" />
                                    View Form
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(form)}>
                                  <Edit className="h-4 w-4 mr-2 text-slate-400" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  disabled={form.status === 'inactive'}
                                  onClick={() => {
                                    setSelectedFormForAssign(form);
                                    setIsAssignToAllDialogOpen(true);
                                  }}
                                >
                                  <School className="h-4 w-4 mr-2 text-slate-400" />
                                  Assign to All Students
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          
                          <div className="space-y-2.5 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant={getStatusBadgeVariant(form.status)} className="text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-[#085cb0] text-white">
                                {getStatusDisplayName(form.status)}
                              </Badge>
                              <div className="text-xs font-semibold text-slate-500">
                                Due: {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center text-xs font-semibold text-[#0F2D52] min-w-0 pt-4 mt-3 border-t border-slate-50">
                          <LinkIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mr-1.5" />
                          {form.link ? (
                            <>
                              <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1 font-medium text-[#1a6fc4]">
                                {form.link}
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(form.link);
                                  setCopiedFormId(form.id);
                                  setTimeout(() => setCopiedFormId(null), 3000);
                                }}
                                className="ml-1.5 p-1 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                                title="Copy link"
                              >
                                {copiedFormId === form.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 font-medium">No link provided</span>
                          )}
                        </div>
                      </Card>
                    ))}
                  />
                ) : (
                  <DataTable
                    className="relative z-0"
                    loading={loading}
                    loadingMessage="Loading forms..."
                    emptyMessage="No forms match the current filters."
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredForms.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    columns={[
                      { header: 'Form Name', className: 'w-1/4' },
                      { header: 'Due Date', className: 'w-1/8' },
                      { header: 'Form Link', className: 'w-1/3' },
                      { header: 'Status', className: 'w-1/8' },
                      { header: 'Actions', className: 'w-1/8 text-right' },
                    ]}
                    rows={paginatedForms.map(form => (
                      <tr key={form.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all duration-200 ease-in-out">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                            <span className="font-bold text-slate-900 text-sm truncate">{form.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                          {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center text-xs font-semibold text-[#0F2D52] max-w-xs">
                            <LinkIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                            {form.link ? (
                              <>
                                <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1 font-medium">
                                  {form.link}
                                </a>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(form.link);
                                    setCopiedFormId(form.id);
                                    setTimeout(() => setCopiedFormId(null), 3000);
                                  }}
                                  className="ml-1.5 p-1 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                                  title="Copy link"
                                >
                                  {copiedFormId === form.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-400 font-medium">Not provided</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant={getStatusBadgeVariant(form.status)} className="text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-[#085cb0] text-white">
                            {getStatusDisplayName(form.status)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                              {form.link && (
                                <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(form.link, '_blank')}>
                                  <Eye className="h-4 w-4 mr-2 text-slate-400" />
                                  View Form
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(form)}>
                                <Edit className="h-4 w-4 mr-2 text-slate-400" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                disabled={form.status === 'inactive'}
                                onClick={() => {
                                  setSelectedFormForAssign(form);
                                  setIsAssignToAllDialogOpen(true);
                                }}
                              >
                                <School className="h-4 w-4 mr-2 text-slate-400" />
                                Assign to All Students
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  />
                )}
              </CardContent>
            </div>
          </>
        )}
      </motion.div>

      {/* Add Form Modal Component */}
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

      {/* Edit Form Modal — reuses AddFormModal for consistent responsive behaviour */}
      <AddFormModal
        isOpen={isEditDialogOpen}
        onClose={() => {
          resetFormFields();
          setIsEditDialogOpen(false);
        }}
        onSubmit={handleEditForm}
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
        isSubmitting={false}
        title="Edit Form"
        submitButtonText="Save Changes"
      />

      {/* Assign to All Students Dialog */}
      <Dialog open={isAssignToAllDialogOpen} onOpenChange={setIsAssignToAllDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">Assign Form to All Students</DialogTitle>
          </div>
          <div className="px-5 sm:px-6 py-5 space-y-4">
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Are you sure you want to assign{' '}
              <span className="font-extrabold text-[#0F2D52]">{selectedFormForAssign?.name}</span>{' '}
              to all students in the school? This will add the form to every student's enrollment.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Leave empty to use default 30-day due date
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 px-5 sm:px-6 py-4 border-t bg-slate-50/20 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end">
            <Button variant="outline" onClick={() => setIsAssignToAllDialogOpen(false)} className="w-full sm:w-auto h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4">
              Cancel
            </Button>
            <AsyncButton onClick={handleAssignToAllStudents} className="w-full sm:w-auto h-10 rounded-xl text-xs font-bold px-4 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all">
              Assign to All Students
            </AsyncButton>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
