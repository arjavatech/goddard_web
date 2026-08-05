import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Link as LinkIcon, MoreHorizontal, FileText, UserPlus, X, LayoutGrid, List } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { createFormTemplate, updateFormTemplate } from '../../services/api/admin';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { usePagination } from '../../hooks/usePagination';
import { AddFormModal } from '../../components/admin/AddFormModal';
import { useUserContext } from '../../contexts/UserContext';

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

export function EmployeeFormsManagement() {
  const [forms, setForms] = useState<Form[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('school_default');
  const [formDueDate, setFormDueDate] = useState('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isAddingForm, setIsAddingForm] = useState(false);
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<Form | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => window.innerWidth < 768 ? 'card' : (localStorage.getItem('empFormsViewMode') as 'card' | 'table') || 'table');
  
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;

  const handleViewModeChange = (mode: 'card' | 'table') => { 
    setViewMode(mode); 
    localStorage.setItem('empFormsViewMode', mode); 
  };

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setViewMode('card'); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchForms = async (showLoader = true) => {
    if (!schoolId) return;
    try {
      if (showLoader) setLoading(true);
      const [templates, emps] = await Promise.all([
        fetchFormTemplates(schoolId).catch(() => []),
        EmployeeService.fetchEmployees(schoolId).catch(() => [])
      ]);
      
      const mappedForms: Form[] = templates.map((template: any) => ({
        id: template.id,
        name: template.formName,
        link: template.filloutFormUrl ?? '#',
        status: mapStatus(template.status),
        dueDate: template.due_date || ''
      }));
      setForms(mappedForms);
      setEmployees(emps.filter(e => e.status === 'active'));
    } catch (error) {
      showToast('error', 'Failed to load forms');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [schoolId]);

  const filteredForms = useMemo(() => forms.filter((form) => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'active'
      ? (form.status === 'active' || form.status === 'school_default')
      : (form.status === 'inactive');
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesTab && matchesStatus;
  }), [forms, searchQuery, activeTab, statusFilter]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedForms,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ 
    data: filteredForms,
    itemsPerPage: viewMode === 'card' ? 9 : 10,
    mobileItemsPerPage: 5
  });

  const handleAddForm = async () => {
    if (!formName || !formLink) {
      setFormErrors({
        formName: !formName ? 'Form name is required' : '',
        formLink: !formLink ? 'Form link is required' : ''
      });
      return;
    }
    
    try {
      if (!schoolId) return;
      setIsAddingForm(true);
      await createFormTemplate(formName, formLink, schoolId, formDueDate, formStatus);
      showToast('success', 'Form created successfully');
      setIsAddDialogOpen(false);
      setFormName('');
      setFormLink('');
      setFormDueDate('');
      setFormStatus('school_default');
      setFormErrors({});
      await fetchForms(true);
    } catch (error) {
      showToast('error', 'Failed to create form');
    } finally {
      setIsAddingForm(false);
    }
  };

  const handleEditForm = async () => {
    if (!selectedForm || !formName.trim() || !schoolId) return;
    try {
      await updateFormTemplate(selectedForm.id, formName.trim(), formLink.trim(), schoolId, formStatus, formDueDate);
      showToast('success', 'Form updated successfully');
      setIsEditDialogOpen(false);
      await fetchForms(true);
    } catch (error) {
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
      await EmployeeService.assignFormToEmployee(
        selectedEmployeeId, 
        selectedFormForAssign.id, 
        schoolId, 
        `${userData?.firstName} ${userData?.lastName}`.trim() || 'Admin'
      );
      showToast('success', `Form assigned successfully`);
      setIsAssignDialogOpen(false);
    } catch (error: any) {
      showToast('error', error.message || 'Failed to assign form');
    }
  };

  const getStatusBadgeVariant = (status: FormStatus) => {
    switch (status) {
      case 'active': return 'success';
      case 'school_default': return 'default';
      case 'inactive': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusDisplay = (status: FormStatus) => {
    switch (status) {
      case 'school_default': return 'School Default';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  if (loading && forms.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl animate-fade-in mt-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Employee Forms Management</h1>
            <p className="text-sm text-slate-500 mt-1">Manage and assign forms to employees.</p>
          </div>
          <Button 
            className="bg-[#0F2D52] hover:bg-[#1c477c] text-white" 
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Add New Form
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setCurrentPage(1); }} className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList className="bg-slate-100/80 p-1">
              <TabsTrigger value="active" className="rounded-md">Active Forms</TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-md">Inactive Forms</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full"
                />
              </div>
              
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => handleViewModeChange('table')}
                  className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-white shadow-sm text-[#0F2D52]' : 'text-slate-500'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewModeChange('card')}
                  className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-white shadow-sm text-[#0F2D52]' : 'text-slate-500'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Tabs>

        {viewMode === 'card' ? (
          <MobileCardList
            loading={loading}
            emptyMessage="No forms found."
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            gridClassName="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            cards={paginatedForms.map(form => (
              <Card key={form.id} className="p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{form.name}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(form.link, '_blank')}>
                          <LinkIcon className="w-4 h-4 mr-2" /> View Form
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(form)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Form
                        </DropdownMenuItem>
                        {form.status !== 'inactive' && (
                          <DropdownMenuItem onClick={() => openAssignDialog(form)}>
                            <UserPlus className="w-4 h-4 mr-2" /> Assign to Employee
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Badge variant={getStatusBadgeVariant(form.status)}>{getStatusDisplay(form.status)}</Badge>
                </div>
              </Card>
            ))}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <DataTable
              loading={loading}
              emptyMessage="No forms found."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredForms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Form Name', className: 'w-1/3' },
                { header: 'Status', className: 'w-1/6' },
                { header: 'Due Date', className: 'w-1/6' },
                { header: 'Actions', className: 'w-1/6 text-right' }
              ]}
              rows={paginatedForms.map(form => (
                <tr key={form.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{form.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge variant={getStatusBadgeVariant(form.status)}>{getStatusDisplay(form.status)}</Badge>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{form.dueDate || '—'}</td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => window.open(form.link, '_blank')}>
                          <LinkIcon className="w-4 h-4 mr-2" /> View Form
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(form)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Form
                        </DropdownMenuItem>
                        {form.status !== 'inactive' && (
                          <DropdownMenuItem onClick={() => openAssignDialog(form)}>
                            <UserPlus className="w-4 h-4 mr-2" /> Assign to Employee
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            />
          </div>
        )}

        {/* Add Form Dialog */}
        <AddFormModal
          isOpen={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSubmit={handleAddForm}
          formName={formName}
          setFormName={setFormName}
          formLink={formLink}
          setFormLink={setFormLink}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          isSubmitting={isAddingForm}
        />

        {/* Edit Form Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold mb-1 block">Form Name</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Form Link</label>
                <Input value={formLink} onChange={e => setFormLink(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Status</label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="school_default">School Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Due Date</label>
                <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditForm}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Form Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Form to Employee</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-slate-600">Assigning form: <strong>{selectedFormForAssign?.name}</strong></p>
              <div>
                <label className="text-sm font-semibold block mb-2">Select Employee</label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAssignToEmployee} 
                disabled={!selectedEmployeeId}
                className="bg-[#0F2D52] text-white"
              >
                Assign Form
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
