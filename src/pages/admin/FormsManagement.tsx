import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Link as LinkIcon, MoreHorizontal, School, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Loading } from '../../components/ui/loading';
import { fetchUserContext } from '../../services/api/user';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { fetchClassEnrollmentStats, deleteForm, createFormTemplate, updateFormTemplate } from '../../services/api/admin';
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
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        const [templates, classStats] = await Promise.all([fetchFormTemplates(user.schoolId).catch(() => []), fetchClassEnrollmentStats(user.schoolId).catch(() => [])]);
        if (!isMounted) return;
        if (templates.length === 0) return;
        const classCounts = new Map<string, number>();
        classStats.forEach(stat => {
          Object.keys(stat.forms).forEach(formId => {
            classCounts.set(formId, (classCounts.get(formId) ?? 0) + 1);
          });
        });
        const mappedForms: Form[] = templates.map(template => ({
          id: template.id,
          name: template.formName,
          link: template.filloutFormUrl ?? '#',
          status: mapStatus(template.status),
          classroomsCount: classCounts.get(template.id) ?? 0
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
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await createFormTemplate(formName.trim(), formLink.trim(), user.schoolId);
        const newForm: Form = {
          id: (forms.length + 1).toString(),
          name: formName.trim(),
          link: formLink.trim(),
          status: formStatus,
          classroomsCount: 0
        };
        setForms([...forms, newForm]);
        resetFormFields();
        setIsAddDialogOpen(false);
      } catch (error) {
      }
    }
  };
  const handleEditForm = async () => {
    if (selectedForm && formName.trim() && formLink.trim()) {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await updateFormTemplate(selectedForm.id, formName.trim(), formLink.trim(), user.schoolId);
        setForms(forms.map((form: Form) => form.id === selectedForm.id ? {
          ...form,
          name: formName.trim(),
          link: formLink.trim(),
          status: formStatus
        } : form));
        resetFormFields();
        setIsEditDialogOpen(false);
      } catch (error) {
      }
    }
  };
  const handleDeleteForm = async () => {
    if (selectedForm) {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await deleteForm(selectedForm.id, user.schoolId);
      } catch (error) {
      }
      // Remove from local state regardless of API success
      setForms(forms.filter((form: Form) => form.id !== selectedForm.id));
      setIsDeleteDialogOpen(false);
    }
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Forms Management
          </h1>
          <Button onClick={() => {
          resetFormFields();
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90">
            <Plus className="h-4 w-4 mr-2" /> Add Form
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search forms..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Form Name
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Form Link
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Assigned To
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={5} className="py-8">
                        <Loading message="Loading forms..." size="sm" />
                      </td>
                    </tr> : filteredForms.length > 0 ? filteredForms.map(form => <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{form.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusBadgeVariant(form.status)}>
                            {form.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2 text-amazon-teal">
                            <LinkIcon className="h-4 w-4" />
                            {form.link ? <a href={form.link} target="_blank" rel="noreferrer" className="hover:underline">
                                {form.link}
                              </a> : <span className="text-gray-400">Not provided</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-sm text-gray-500">
                          <div className="flex items-center justify-center gap-1">
                            <School className="h-4 w-4 text-gray-400" />
                            {form.classroomsCount}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
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
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        No forms match the current filters.
                      </td>
                    </tr>}
                </tbody>
              </table>
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
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter form name" className="w-full" autoFocus />
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
            <Button onClick={handleAddForm} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!formName.trim() || !formLink.trim()}>
              Add Form
            </Button>
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
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Enter form name" className="w-full" autoFocus />
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
            <Button onClick={handleEditForm} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!formName.trim() || !formLink.trim()}>
              Save Changes
            </Button>
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
            <Button variant="destructive" onClick={handleDeleteForm}>
              Delete Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}