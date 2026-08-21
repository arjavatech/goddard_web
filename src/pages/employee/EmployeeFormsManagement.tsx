import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Link as LinkIcon, MoreHorizontal, FileText, UserPlus, X, LayoutGrid, List, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { AddFormModal } from '../../components/admin/AddFormModal';
import { useUserContext } from '../../contexts/UserContext';
import { StatCard } from '../../components/ui/stat-card';
import { DataGrid, ColumnDef } from '../../components/ui/data-grid';

type FormStatus = 'school_default' | 'active' | 'inactive' | 'archived' | 'draft' | 'available';
interface Form {
  id: string;
  name: string;
  link: string;
  status: FormStatus;
  dueDate?: string;
}

const mapStatus = (status: string | null | undefined): FormStatus => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('default') || value.includes('school_default')) return 'school_default';
  if (value.includes('inactive')) return 'inactive';
  if (value.includes('archive') || value.includes('archived')) return 'archived';
  if (value.includes('draft')) return 'draft';
  if (value.includes('available')) return 'available';
  return 'active';
};

const getStatusBadgeVariant = (status: FormStatus): any => {
  switch (status) {
    case 'active': return 'success';
    case 'school_default': return 'default';
    case 'inactive': return 'secondary';
    default: return 'outline';
  }
};

const getStatusBadgeClass = (status: FormStatus): string => {
  if (status === 'school_default') return 'bg-[#085cb0] text-white border-transparent';
  return '';
};

const getStatusDisplay = (status: FormStatus) => {
  switch (status) {
    case 'school_default': return 'School Default';
    default: return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export function EmployeeFormsManagement() {
  const [forms, setForms] = useState<Form[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('school_default');
  const [formDueDate, setFormDueDate] = useState('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isAddingForm, setIsAddingForm] = useState(false);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<Form | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem('empFormsViewMode') as 'card' | 'table') || 'table');
  const [itemsPerPage, setItemsPerPage] = usePageSize('empForm', 10);

  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('empFormsViewMode', mode);
  };

  const fetchForms = async (showLoader = true) => {
    if (!schoolId) return;
    try {
      if (showLoader) setLoading(true);
      const [templates, emps] = await Promise.all([
        EmployeeService.fetchEmployeeFormTemplates(schoolId).catch(() => []),
        EmployeeService.fetchEmployees(schoolId).catch(() => [])
      ]);
      setForms(templates.map((t) => ({
        id: t.id,
        name: t.formName,
        link: t.filloutFormId ?? '#',
        status: mapStatus(t.status),
        dueDate: t.dueDate || ''
      })));
      setEmployees(emps.filter(e => e.status === 'active'));
    } catch {
      showToast('error', 'Failed to load forms');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => { fetchForms(); }, [schoolId]);

  const filteredForms = useMemo(() => forms.filter((form) => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'active'
      ? (form.status === 'active' || form.status === 'school_default')
      : (form.status === 'inactive');
    return matchesSearch && matchesTab;
  }), [forms, searchQuery, activeTab]);

  const { currentPage, totalPages, paginatedData: paginatedForms, setCurrentPage } = usePagination({ data: filteredForms, itemsPerPage });

  const handleAddForm = async () => {
    if (!formName || !formLink) {
      setFormErrors({ formName: !formName ? 'Form name is required' : '', formLink: !formLink ? 'Form link is required' : '' });
      return;
    }
    try {
      if (!schoolId) return;
      setIsAddingForm(true);
      await EmployeeService.createEmployeeFormTemplate({ schoolId, formName, filloutFormId: formLink || undefined, dueDate: formDueDate || undefined, status: formStatus });
      showToast('success', 'Form created successfully');
      setIsAddDialogOpen(false);
      resetForm();
      await fetchForms(true);
    } catch {
      showToast('error', 'Failed to create form');
    } finally {
      setIsAddingForm(false);
    }
  };

  const handleEditForm = async () => {
    if (!selectedForm || !formName.trim() || !schoolId) return;
    try {
      await EmployeeService.updateEmployeeFormTemplate({ id: selectedForm.id, schoolId, formName: formName.trim(), filloutFormId: formLink.trim() || undefined, status: formStatus, dueDate: formDueDate || undefined });
      showToast('success', 'Form updated successfully');
      setIsEditDialogOpen(false);
      await fetchForms(true);
    } catch {
      showToast('error', 'Failed to update form');
    }
  };

  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormLink(form.link);
    setFormStatus(form.status);
    setFormDueDate(form.dueDate || '');
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (form: Form) => {
    setSelectedFormForAssign(form);
    setSelectedEmployeeId('');
    setIsAssignDialogOpen(true);
  };

  const handleAssignToEmployee = async () => {
    if (!selectedFormForAssign || !selectedEmployeeId || !schoolId) return;
    try {
      await EmployeeService.assignFormToEmployee(selectedEmployeeId, selectedFormForAssign.id, schoolId, `${userData?.firstName} ${userData?.lastName}`.trim() || 'Admin');
      showToast('success', 'Form assigned successfully');
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to assign form');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormLink('');
    setFormDueDate('');
    setFormStatus('school_default');
    setFormErrors({});
  };

  const formColumns = useMemo<ColumnDef<Form>[]>(() => [
    {
      id: 'name',
      header: 'Form Name',
      className: 'w-1/3',
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
      className: 'w-1/6',
      hideInCardBody: true,
      cell: (form) => (
        <span className="text-xs font-semibold text-slate-600">
          {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
        </span>
      )
    },
    {
      id: 'link',
      header: 'Form Link',
      className: 'w-1/4',
      hideInCardBody: true,
      cell: (form) => (
        <div className="flex items-center text-xs font-semibold text-[#0F2D52] max-w-xs">
          <LinkIcon className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
          {form.link && form.link !== '#' ? (
            <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline truncate flex-1 font-medium text-[#1a6fc4]">
              {form.link}
            </a>
          ) : (
            <span className="text-slate-400 font-medium">Not provided</span>
          )}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      className: 'w-1/8',
      hideInCardBody: true,
      cell: (form) => (
        <Badge variant={getStatusBadgeVariant(form.status)} className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${getStatusBadgeClass(form.status)}`}>
          {getStatusDisplay(form.status)}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      className: 'w-1/8 text-right',
      hideInCardBody: true,
      cell: (form) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
            {form.link && form.link !== '#' && (
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => window.open(form.link, '_blank')}>
                <Eye className="h-4 w-4 mr-2 text-slate-400" /> View Form
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => openEditDialog(form)}>
              <Edit className="h-4 w-4 mr-2 text-slate-400" /> Edit Form
            </DropdownMenuItem>
            {form.status !== 'inactive' && (
              <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => openAssignDialog(form)}>
                <UserPlus className="h-4 w-4 mr-2 text-slate-400" /> Assign to Employee
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ], []);

  if (loading && forms.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12  mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading employee forms...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeForms = forms.filter(f => f.status === 'active' || f.status === 'school_default');
  const inactiveForms = forms.filter(f => f.status === 'inactive');

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12  space-y-6 pb-12"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Employee Forms Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage and assign form templates to employees</p>
          </div>
          <Button
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add New Form
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Total Forms"
            value={forms.length}
            icon={FileText}
            iconBgClass="bg-[#EFF5FB]"
            iconColorClass="text-[#0F2D52]"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
          <StatCard
            label="Active Forms"
            value={activeForms.length}
            icon={CheckCircle}
            iconBgClass="bg-emerald-50"
            iconColorClass="text-emerald-600"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
          <StatCard
            label="Inactive Forms"
            value={inactiveForms.length}
            icon={AlertCircle}
            iconBgClass="bg-amber-50"
            iconColorClass="text-amber-600"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
        </div>

        {/* Form Directory */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <CardContent className="p-0">
            <div className="p-4 sm:p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Form Directory</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{filteredForms.length} of {forms.length} forms</p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto shadow-xs">
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('table')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                  >
                    <List className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Table View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewModeChange('card')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Card View</span>
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }} className="mb-4">
                <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100/60 border border-slate-100 rounded-xl gap-1">
                  <TabsTrigger value="active" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F2D52] data-[state=active]:shadow-sm transition-all">
                    Active ({activeForms.length})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F2D52] data-[state=active]:shadow-sm transition-all">
                    Inactive ({inactiveForms.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Search */}
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search forms..."
                  className="pl-9 pr-9 h-10 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 rounded-md" onClick={() => setSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
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
              renderCard={(form) => (
                <div key={form.id} className="relative rounded-2xl border border-slate-100 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-slate-900 truncate leading-tight">{form.name}</h3>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                        Due: {form.dueDate ? new Date(form.dueDate).toLocaleDateString('en-US') : 'No due date'}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 px-2 rounded-xl text-slate-400 hover:text-[#0F2D52] hover:bg-slate-50 flex-shrink-0">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                        {form.link && form.link !== '#' && (
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => window.open(form.link, '_blank')}>
                            <Eye className="h-4 w-4 mr-2 text-slate-400" /> View Form
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => openEditDialog(form)}>
                          <Edit className="h-4 w-4 mr-2 text-slate-400" /> Edit Form
                        </DropdownMenuItem>
                        {form.status !== 'inactive' && (
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => openAssignDialog(form)}>
                            <UserPlus className="h-4 w-4 mr-2 text-slate-400" /> Assign to Employee
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mx-4 border-t border-slate-50" />

                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <Badge variant={getStatusBadgeVariant(form.status)} className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 flex-shrink-0 ${getStatusBadgeClass(form.status)}`}>
                      {getStatusDisplay(form.status)}
                    </Badge>
                    {form.link && form.link !== '#' ? (
                      <a href={form.link} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[#1a6fc4] hover:underline truncate max-w-[140px]">
                        {form.link}
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">No link</span>
                    )}
                  </div>
                </div>
              )}
            />
          </CardContent>
        </div>
      </motion.div>

      {/* Add Form Modal */}
      <AddFormModal
        isOpen={isAddDialogOpen}
        onClose={() => { resetForm(); setIsAddDialogOpen(false); }}
        onSubmit={handleAddForm}
        formName={formName}
        setFormName={setFormName}
        formLink={formLink}
        setFormLink={setFormLink}
        formDueDate={formDueDate}
        setFormDueDate={setFormDueDate}
        formStatus={formStatus}
        setFormStatus={(v) => setFormStatus(v as FormStatus)}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        isSubmitting={isAddingForm}
      />

      {/* Edit Form Modal */}
      <AddFormModal
        isOpen={isEditDialogOpen}
        onClose={() => { setIsEditDialogOpen(false); }}
        onSubmit={handleEditForm}
        formName={formName}
        setFormName={setFormName}
        formLink={formLink}
        setFormLink={setFormLink}
        formDueDate={formDueDate}
        setFormDueDate={setFormDueDate}
        formStatus={formStatus}
        setFormStatus={(v) => setFormStatus(v as FormStatus)}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        isSubmitting={false}
        title="Edit Form"
        submitButtonText="Save Changes"
      />

      {/* Assign to Employee Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">Assign Form to Employee</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-slate-600">
              Assigning form: <strong className="text-[#0F2D52]">{selectedFormForAssign?.name}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Select Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id} className="text-sm">
                      {emp.firstName} {emp.lastName} ({emp.employeeType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)} className="w-full sm:w-auto h-10 rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all">
              Cancel
            </Button>
            <Button onClick={handleAssignToEmployee} disabled={!selectedEmployeeId} className="w-full sm:w-auto h-10 rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white font-semibold transition-all">
              Assign Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
