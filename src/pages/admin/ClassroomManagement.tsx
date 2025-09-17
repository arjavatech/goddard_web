import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, X, Check, AlertCircle, Eye, Link as LinkIcon } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Link } from 'react-router-dom';
interface Form {
  id: string;
  name: string;
  status: 'Default' | 'Active' | 'Inactive' | 'Archive';
}
interface Classroom {
  id: string;
  name: string;
  studentsCount: number;
  formsCount: number;
  assignedForms: Form[];
}
export function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([{
    id: '1',
    name: 'Sunshine Room',
    studentsCount: 18,
    formsCount: 8,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Active'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Active'
    }]
  }, {
    id: '2',
    name: 'Rainbow Room',
    studentsCount: 15,
    formsCount: 7,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Active'
    }]
  }, {
    id: '3',
    name: 'Stars Room',
    studentsCount: 12,
    formsCount: 6,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }]
  }, {
    id: '4',
    name: 'Moon Room',
    studentsCount: 14,
    formsCount: 8,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '5',
      name: 'Field Trip Permission',
      status: 'Inactive'
    }]
  }, {
    id: '5',
    name: 'Ocean Room',
    studentsCount: 16,
    formsCount: 7,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '6',
      name: 'Parent Handbook Acknowledgment',
      status: 'Default'
    }]
  }, {
    id: '6',
    name: 'Mountain Room',
    studentsCount: 10,
    formsCount: 6,
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }]
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const filteredClassrooms = classrooms.filter(classroom => classroom.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const handleAddClassroom = () => {
    if (newClassroomName.trim()) {
      const newClassroom: Classroom = {
        id: (classrooms.length + 1).toString(),
        name: newClassroomName.trim(),
        studentsCount: 0,
        formsCount: 0,
        assignedForms: []
      };
      setClassrooms([...classrooms, newClassroom]);
      setNewClassroomName('');
      setIsAddDialogOpen(false);
    }
  };
  const handleEditClassroom = () => {
    if (selectedClassroom && newClassroomName.trim()) {
      setClassrooms(classrooms.map(classroom => classroom.id === selectedClassroom.id ? {
        ...classroom,
        name: newClassroomName.trim()
      } : classroom));
      setNewClassroomName('');
      setIsEditDialogOpen(false);
    }
  };
  const handleDeleteClassroom = () => {
    if (selectedClassroom) {
      setClassrooms(classrooms.filter(classroom => classroom.id !== selectedClassroom.id));
      setIsDeleteDialogOpen(false);
    }
  };
  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setNewClassroomName(classroom.name);
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setIsDeleteDialogOpen(true);
  };
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Classroom Management
          </h1>
          <Button onClick={() => {
          setNewClassroomName('');
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search classrooms..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Classroom Name
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Students
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Assigned Forms
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClassrooms.length > 0 ? filteredClassrooms.map(classroom => <tr key={classroom.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">
                          <Link to={`/admin/classrooms/${classroom.id}`} className="text-amazon-teal hover:underline flex items-center">
                            {classroom.name}
                            <Eye className="h-4 w-4 ml-2 opacity-60" />
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <Users className="h-4 w-4 mr-1 text-gray-500" />
                            <span>{classroom.studentsCount}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {classroom.assignedForms.length > 0 ? classroom.assignedForms.slice(0, 3).map(form => <Badge key={form.id} variant="secondary" className="text-xs">
                                    {form.name}
                                  </Badge>) : <span className="text-gray-400 text-sm">
                                No forms assigned
                              </span>}
                            {classroom.assignedForms.length > 3 && <Badge variant="outline" className="text-xs">
                                +{classroom.assignedForms.length - 3} more
                              </Badge>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/admin/form-assignments?classroom=${classroom.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                Manage Forms
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(classroom)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openDeleteDialog(classroom)} className="text-red-600 focus:text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        No classrooms found. Try a different search or add a new
                        classroom.
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Add Classroom Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input value={newClassroomName} onChange={e => setNewClassroomName(e.target.value)} placeholder="Enter classroom name" className="w-full" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newClassroomName.trim()}>
              Add Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input value={newClassroomName} onChange={e => setNewClassroomName(e.target.value)} placeholder="Enter new classroom name" className="w-full" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newClassroomName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedClassroom?.name}</span>?
              This action cannot be undone.
            </p>
            {selectedClassroom?.studentsCount > 0 && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  This classroom has {selectedClassroom.studentsCount} student
                  {selectedClassroom.studentsCount !== 1 ? 's' : ''} enrolled.
                  Deleting it will remove all student associations.
                </p>
              </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClassroom}>
              Delete Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}