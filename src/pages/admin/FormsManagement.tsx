import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Link as LinkIcon, MoreHorizontal, School, ExternalLink, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
type FormStatus = 'Default' | 'Active' | 'Inactive' | 'Archive';
interface Form {
  id: string;
  name: string;
  link: string;
  status: FormStatus;
  classroomsCount: number;
}
export function FormsManagement() {
  const [forms, setForms] = useState<Form[]>([{
    id: '1',
    name: 'Admission Form',
    link: 'https://goddard.fillout.com/t/tdKTQWnb3Wus',
    status: 'Active',
    classroomsCount: 6
  }, {
    id: '2',
    name: 'Medical Authorization',
    link: 'https://goddard.fillout.com/t/med-auth',
    status: 'Active',
    classroomsCount: 6
  }, {
    id: '3',
    name: 'Emergency Contact Form',
    link: 'https://goddard.fillout.com/t/emergency',
    status: 'Active',
    classroomsCount: 6
  }, {
    id: '4',
    name: 'Photo Release Form',
    link: 'https://goddard.fillout.com/t/photo-release',
    status: 'Active',
    classroomsCount: 5
  }, {
    id: '5',
    name: 'Field Trip Permission',
    link: 'https://goddard.fillout.com/t/field-trip',
    status: 'Inactive',
    classroomsCount: 3
  }, {
    id: '6',
    name: 'Parent Handbook Acknowledgment',
    link: 'https://goddard.fillout.com/t/handbook',
    status: 'Default',
    classroomsCount: 6
  }, {
    id: '7',
    name: 'Meal Program Enrollment',
    link: 'https://goddard.fillout.com/t/meal-program',
    status: 'Archive',
    classroomsCount: 0
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>('Default');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const filteredForms = forms.filter(form => {
    const matchesSearch = form.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const handleAddForm = () => {
    if (formName.trim() && formLink.trim()) {
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
    }
  };
  const handleEditForm = () => {
    if (selectedForm && formName.trim() && formLink.trim()) {
      setForms(forms.map(form => form.id === selectedForm.id ? {
        ...form,
        name: formName.trim(),
        link: formLink.trim(),
        status: formStatus
      } : form));
      resetFormFields();
      setIsEditDialogOpen(false);
    }
  };
  const handleDeleteForm = () => {
    if (selectedForm) {
      setForms(forms.filter(form => form.id !== selectedForm.id));
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
  const getStatusBadgeVariant = (status: FormStatus) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Default':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Archive':
        return 'outline';
    }
  };
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
                    <SelectItem value="Default">Default</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Archive">Archive</SelectItem>
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
                  {filteredForms.length > 0 ? filteredForms.map(form => <tr key={form.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{form.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={getStatusBadgeVariant(form.status) as any}>
                            {form.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <LinkIcon className="h-4 w-4 mr-2 text-gray-500" />
                            <a href={form.link} target="_blank" rel="noopener noreferrer" className="text-amazon-teal hover:underline truncate max-w-xs">
                              {form.link.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {form.classroomsCount > 0 ? <div className="flex items-center justify-center">
                              <School className="h-4 w-4 mr-1 text-gray-500" />
                              <span>
                                {form.classroomsCount} classroom
                                {form.classroomsCount !== 1 ? 's' : ''}
                              </span>
                            </div> : <span className="text-gray-400 text-sm">
                              Not assigned
                            </span>}
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
                                Edit Form
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(form.link, '_blank')}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Open Form
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
                        No forms found. Try a different search or add a new
                        form.
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
            {selectedForm?.classroomsCount > 0 && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This form is assigned to {selectedForm.classroomsCount}{' '}
                  classroom{selectedForm.classroomsCount !== 1 ? 's' : ''}.
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