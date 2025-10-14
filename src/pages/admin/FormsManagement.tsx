import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Link as LinkIcon, MoreHorizontal, School, AlertCircle, FileText } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Loading } from '../../components/ui/loading';
import { ValidatedInput } from '../../components/ui/validated-input';
import { commonValidationRules } from '../../lib/validation';
import { Toast } from '../../components/ui/toast';
import { fetchUserContext } from '../../services/api/user';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { deleteForm, createFormTemplate, updateFormTemplate } from '../../services/api/admin';
type FormStatus = 'Default' | 'Active' | 'Inactive' | 'Archive';
interface Form {
  id: string;
  name: string;
  link: string;
  status: FormStatus;
  classroomsCount: number;
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
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ open: false, type: 'error', title: '', message: '' });

  const showToast = (message: string) => {
    setToast({
      open: true,
      type: 'error',
      title: '',
      message
    });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, open: false }));
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
        
        const mappedForms: Form[] = templates.map(template => ({
          id: template.id,
          name: template.formName,
          link: template.filloutFormUrl ?? '#',
          status: mapStatus(template.status),
          classroomsCount: 0
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
  const handleAddForm = async () => {
    if (formName.trim() && formLink.trim()) {
      try {
        setIsAddingForm(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await createFormTemplate(formName.trim(), formLink.trim(), user.schoolId);
        resetFormFields();
        setIsAddDialogOpen(false);
        window.location.reload();
      } catch (error) {
        setIsAddingForm(false);
      }
    }
  };
  const handleEditForm = async () => {
    if (!selectedForm || !formName.trim() || !formLink.trim()) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    const statusMap: Record<FormStatus, string> = {
      'Default': 'school_default',
      'Active': 'active',
      'Inactive': 'inactive',
      'Archive': 'archived'
    };
    const apiStatus = statusMap[formStatus] || formStatus.toLowerCase();
    
    await updateFormTemplate(selectedForm.id, formName.trim(), formLink.trim(), user.schoolId, apiStatus);
    
    resetFormFields();
    setIsEditDialogOpen(false);
    window.location.reload();
  };
  const handleDeleteForm = async () => {
    if (!selectedForm) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await deleteForm(selectedForm.id, user.schoolId);
    
    setForms(forms.filter((form: Form) => form.id !== selectedForm.id));
    setIsDeleteDialogOpen(false);
  };
  const resetFormFields = () => {
    setFormName('');
    setFormLink('');
    setFormStatus('Default');
  };
  const openEditDialog = (form: Form) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormLink(form.link);
    setFormStatus(form.status);
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (form: Form) => {
    setSelectedForm(form);
    setIsDeleteDialogOpen(true);
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Forms Management
            </h1>
            <p className="text-muted-foreground">
              Manage form templates and assignments
            </p>
          </div>
          <Button onClick={() => {
          resetFormFields();
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 self-start sm:self-center">
            <Plus className="h-4 w-4 mr-2" /> Add Form
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Forms
                  </p>
                  <p className="text-3xl font-bold text-foreground">{forms.length}</p>
                </div>
                <div className="p-3 bg-amazon-teal/10 rounded-full">
                  <FileText className="h-6 w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Active Forms
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {forms.filter(f => f.status === 'Active').length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Default Forms
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {forms.filter(f => f.status === 'Default').length}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="p-6 border-b bg-muted/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Form Directory</h2>
                <div className="text-sm text-muted-foreground">
                  {filteredForms.length} of {forms.length} forms
                </div>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search forms..." 
                  className="pl-10 h-11 bg-background" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status Filter</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
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
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600 w-1/4">
                      Form Name
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/6">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/2">
                      Form Link
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 w-1/8">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={4} className="py-8">
                        <Loading message="Loading forms..." size="sm" />
                      </td>
                    </tr> : filteredForms.length > 0 ? filteredForms.map(form => <tr key={form.id} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-2 flex-shrink-0">
                              {form.name.charAt(0)}
                            </div>
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
                          <div className="flex items-center text-amazon-teal min-w-0">
                            <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            {form.link ? <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline truncate">
                                {form.link}
                              </a> : <span className="text-gray-400">Not provided</span>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(form)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteDialog(form)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No forms match the current filters.
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 p-4">
              {loading ? (
                <div className="py-8">
                  <Loading message="Loading forms..." size="sm" />
                </div>
              ) : filteredForms.length > 0 ? (
                filteredForms.map(form => (
                  <Card key={form.id} className="p-3">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-foreground text-base">{form.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(form)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(form)} className="text-red-600 focus:text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Badge variant={getStatusBadgeVariant(form.status)}>
                          {form.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-amazon-teal">
                        <LinkIcon className="h-4 w-4 flex-shrink-0" />
                        {form.link ? (
                          <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline text-sm break-all">
                            {form.link}
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">No link provided</span>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No forms found matching your search criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Add Form Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Form</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <ValidatedInput 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="Enter form name" 
                className="w-full" 
                validationRules={commonValidationRules.name}
                showToast={showToast}
                hideToast={hideToast}
                autoFocus 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://example.com/form" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={value => setFormStatus(value as FormStatus)}>
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <AsyncButton onClick={handleAddForm} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!formName.trim() || !formLink.trim() || isAddingForm}>
              {isAddingForm ? 'Adding Form...' : 'Add Form'}
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Form Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Name
              </label>
              <ValidatedInput 
                value={formName} 
                onChange={e => setFormName(e.target.value)} 
                placeholder="Enter form name" 
                className="w-full" 
                validationRules={commonValidationRules.name}
                showToast={showToast}
                hideToast={hideToast}
                autoFocus 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Form Link
              </label>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="https://example.com/form" className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={formStatus} onValueChange={value => setFormStatus(value as FormStatus)}>
                <SelectTrigger>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <AsyncButton onClick={handleEditForm} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!formName.trim() || !formLink.trim()}>
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Form Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedForm?.name}</span>? This
              action cannot be undone.
            </p>
            {selectedForm?.classroomsCount && selectedForm.classroomsCount > 0 && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This form is assigned to {selectedForm?.classroomsCount}{' '}
                  classroom{selectedForm?.classroomsCount !== 1 ? 's' : ''}.
                  Deleting it will remove all assignments.
                </p>
              </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleDeleteForm}>
              Delete Form
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </AdminLayout>;
}