import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Link as LinkIcon, MoreHorizontal, School, FileText, Eye, ArrowUp, ArrowDown, Settings, Copy, Check, LayoutGrid, List, Download, Printer } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { createFormTemplate, updateFormTemplate, assignFormToAllStudents, uploadFormTemplatePdf, getFormTemplatePdfUrl, removeFormTemplatePdf } from '../../services/api/admin';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { DataGrid, ColumnDef } from '../../components/ui/data-grid';

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
  pdfFileName?: string | null;
}
const parseLocalDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
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
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem('formsViewMode') as 'card' | 'table') || 'table');
  const handleViewModeChange = (mode: 'card' | 'table') => { setViewMode(mode); localStorage.setItem('formsViewMode', mode); };

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
    setPdfFile(null);
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
          dueDate: template.due_date || ['2024-01-15', '2024-01-20', '2024-01-25', '2024-02-01'][index % 4],
          pdfFileName: template.pdfFileName
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

  const [itemsPerPage, setItemsPerPage] = usePageSize('form', 10);
  
  const {
    currentPage,
    totalPages,
    paginatedData: paginatedForms,
    setCurrentPage
  } = usePagination({ data: sortedForms, itemsPerPage });

  const formColumns = useMemo<ColumnDef<Form>[]>(() => [
    {
      id: 'name',
      header: 'Form Name',
      className: 'w-[20%]',
      hideInCardBody: true,
      cell: (form) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
          <span className="font-bold text-slate-900 text-sm truncate">{form.name}</span>
        </div>
      )
    },
    {
      id: 'due_date',
      header: 'Due Date',
      className: 'w-[12%]',
      hideInCardBody: true,
      cell: (form) => (
        <span className="text-xs font-semibold text-slate-600">
          {form.dueDate ? parseLocalDate(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
        </span>
      )
    },
    {
      id: 'link',
      header: 'Form Link',
      className: 'w-[28%]',
      hideInCardBody: true,
      cell: (form) => (
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
      )
    },
    {
      id: 'status',
      header: 'Status',
      className: 'w-[12%]',
      hideInCardBody: true,
      cell: (form) => (
        <Badge variant={getStatusBadgeVariant(form.status)} className="text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-[#085cb0] text-white">
          {getStatusDisplayName(form.status)}
        </Badge>
      )
    },
    {
      id: 'pdf_template',
      header: 'Template',
      className: 'w-[18%]',
      hideInCardBody: true,
      cell: (form) => form.pdfFileName && schoolId ? (
        <div className="flex items-center gap-1" aria-label={`Template actions for ${form.name}`}>
          <Button variant="ghost" size="icon" title="View template" aria-label="View template" className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#0F2D52]" onClick={async () => { try { window.open(await getFormTemplatePdfUrl(form.id, schoolId), '_blank', 'noopener,noreferrer'); } catch { showToast('error', 'Unable to open PDF template'); } }}><Eye className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" title="Print template" aria-label="Print template" className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#0F2D52]" onClick={async () => { try { window.open(await getFormTemplatePdfUrl(form.id, schoolId), '_blank', 'noopener,noreferrer'); } catch { showToast('error', 'Open the PDF and use your browser print action.'); } }}><Printer className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" title="Download template" aria-label="Download template" className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#0F2D52]" onClick={async () => { try { window.open(await getFormTemplatePdfUrl(form.id, schoolId, true), '_blank', 'noopener,noreferrer'); } catch { showToast('error', 'Unable to download PDF template'); } }}><Download className="h-3.5 w-3.5" /></Button>
        </div>
      ) : <span className="text-xs text-slate-400">—</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'w-[10%] text-center whitespace-nowrap',
      hideInCardBody: true,
      cell: (form) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
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
            {form.pdfFileName && schoolId && <>
              <DropdownMenuItem className="cursor-pointer" onClick={async () => { try { window.open(await getFormTemplatePdfUrl(form.id, schoolId), '_blank', 'noopener,noreferrer'); } catch { showToast('error', 'Unable to open PDF template'); } }}>
                <Eye className="h-4 w-4 mr-2 text-slate-400" /> View template
              </DropdownMenuItem>
            </>}
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
              Assign to Students
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], [copiedFormId, schoolId, showToast]);

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
        dueDate: template.due_date || ['2024-01-15', '2024-01-20', '2024-01-25', '2024-02-01'][index % 4],
        pdfFileName: template.pdfFileName
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
      
      const created = await createFormTemplate(formName.trim(), formLink.trim(), schoolId, formDueDate, formStatus);
      if (pdfFile) await uploadFormTemplatePdf(created.id, schoolId, pdfFile);
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
      if (pdfFile) await uploadFormTemplatePdf(selectedForm.id, schoolId, pdfFile);
      
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
    setPdfFile(null);
    setFormErrors({});
  };
  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormLink(form.link);
    setFormStatus(form.status);
    setFormDueDate(form.dueDate || '');
    setPdfFile(null);
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
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12  mx-auto">
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
        className="container mx-auto px-2 sm:px-4  py-0 sm:pt-12  space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
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
                        onClick={() => handleViewModeChange('table')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'table'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Table View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewModeChange('card')}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          viewMode === 'card'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Card View</span>
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

                {/* Data Grid */}
                <DataGrid
                  data={paginatedForms}
                  columns={formColumns}
                  viewMode={viewMode}
                  loading={loading}
                  loadingMessage="Loading forms..."
                  emptyMessage="No forms match the current filters."
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredForms.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                  gridClassName="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  renderCard={(form, dynamicColumns) => (
                    <div key={form.id} className="relative rounded-2xl border border-slate-100 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                      {/* Header */}
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center flex-shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm text-slate-900 truncate leading-tight">{form.name}</h3>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            Due: {form.dueDate ? parseLocalDate(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-xl text-slate-400 hover:text-[#0F2D52] hover:bg-slate-50 flex-shrink-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                            {form.link && (
                              <DropdownMenuItem className="cursor-pointer" onClick={() => window.open(form.link, '_blank')}>
                                <Eye className="h-4 w-4 mr-2 text-slate-400" />View Form
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(form)}>
                              <Edit className="h-4 w-4 mr-2 text-slate-400" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" disabled={form.status === 'inactive'} onClick={() => { setSelectedFormForAssign(form); setIsAssignToAllDialogOpen(true); }}>
                              <School className="h-4 w-4 mr-2 text-slate-400" />Assign to All Students
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mx-4 border-t border-slate-50" />

                      {/* Status & Link */}
                      <div className="px-4 py-3 flex items-center justify-between gap-2">
                        <Badge variant={getStatusBadgeVariant(form.status)} className="text-[10px] font-bold rounded-full px-2.5 py-0.5 bg-[#085cb0] text-white flex-shrink-0">
                          {getStatusDisplayName(form.status)}
                        </Badge>
                        {form.link ? (
                          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                            <a href={form.link} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[#1a6fc4] hover:underline truncate max-w-[120px]">
                              {form.link}
                            </a>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(form.link); setCopiedFormId(form.id); setTimeout(() => setCopiedFormId(null), 3000); }} className="p-1 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
                              {copiedFormId === form.id ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-slate-400" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No link</span>
                        )}
                      </div>
                      
                      {/* Dynamic Columns */}
                      {dynamicColumns.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-50 space-y-2">
                          {dynamicColumns.map(col => (
                            <div key={col.id} className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{col.header}</span>
                              <div className="text-sm">{col.cell(form)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                />
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
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
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
        pdfFile={pdfFile}
        setPdfFile={setPdfFile}
        existingPdfFileName={selectedForm?.pdfFileName ?? undefined}
        onRemoveExistingPdf={async () => { if (!selectedForm || !schoolId) return; await removeFormTemplatePdf(selectedForm.id, schoolId); setSelectedForm({ ...selectedForm, pdfFileName: null }); showToast('success', 'PDF template removed'); }}
      />

      {/* Assign to All Students Dialog */}
      <Dialog open={isAssignToAllDialogOpen} onOpenChange={setIsAssignToAllDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[92vh] overflow-y-auto no-scrollbar">
          <DialogHeader className="mb-1">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 pr-6">Assign Form to All Students</DialogTitle>
          </DialogHeader>
          <div className="py-2 sm:py-3 space-y-3 sm:space-y-4">
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              Are you sure you want to assign{' '}
              <span className="font-extrabold text-[#0F2D52]">{selectedFormForAssign?.name}</span>{' '}
              to all students in the school? This will add the form to every student's enrollment.
            </p>
            <div>
              <label className="block text-[10px] sm:text-xs font-bold uppercase tracking-wider text-black mb-1.5">Due Date (Optional)</label>
              <Input
                type="date"
                value={formDueDate}
                onChange={e => setFormDueDate(e.target.value)}
                className="w-full h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                Leave empty to use default 30-day due date
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 pt-1">
            <Button variant="outline" onClick={() => setIsAssignToAllDialogOpen(false)} className="w-full sm:w-auto h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] transition-all duration-200">
              Cancel
            </Button>
            <AsyncButton onClick={handleAssignToAllStudents} className="w-full sm:w-auto h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200">
              Assign to All Students
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
