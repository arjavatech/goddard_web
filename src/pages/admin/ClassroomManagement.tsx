import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Link } from 'react-router-dom';
import { Loading } from '../../components/ui/loading';
import { ValidatedInput } from '../../components/ui/validated-input';
import { commonValidationRules } from '../../lib/validation';
import { Toast } from '../../components/ui/toast';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassEnrollmentStats, renameClassroom, deleteClassroom, createClassroom, type Classroom } from '../../services/api/admin';
export function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
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
        if (!user.schoolId) {
          throw new Error('Unable to determine school context for this admin.');
        }
        const enrollmentStats = await fetchClassEnrollmentStats(user.schoolId).catch(() => []);
        if (!isMounted) return;
        
        const mapped: Classroom[] = enrollmentStats.map((stat) => ({
          id: stat.classId || crypto.randomUUID(),
          name: stat.className,
          studentsCount: stat.studentCount,
          formsCount: Object.keys(stat.forms ?? {}).length,
          assignedForms: Object.entries(stat.forms ?? {}).map(([formId, formName]) => ({
            id: formId,
            name: formName,
            status: 'Active' as any
          }))
        }));
        
        setClassrooms(mapped);
      } catch (err) {
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
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(classroom => classroom.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classrooms, searchQuery]);
  const handleAddClassroom = async () => {
    if (!newClassroomName.trim()) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await createClassroom(user.schoolId, newClassroomName.trim());
    
    // Refetch classrooms to get the actual server data
    const enrollmentStats = await fetchClassEnrollmentStats(user.schoolId);
    const mapped: Classroom[] = enrollmentStats.map((stat) => ({
      id: stat.classId || crypto.randomUUID(),
      name: stat.className,
      studentsCount: stat.studentCount,
      formsCount: Object.keys(stat.forms ?? {}).length,
      assignedForms: Object.entries(stat.forms ?? {}).map(([formId, formName]) => ({
        id: formId,
        name: formName,
        status: 'Active' as any
      }))
    }));
    
    setClassrooms(mapped);
    setNewClassroomName('');
    setIsAddDialogOpen(false);
  };
  const handleEditClassroom = async () => {
    if (!selectedClassroom || !newClassroomName.trim()) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await renameClassroom(selectedClassroom.name, newClassroomName.trim(), user.schoolId);
    
    // Refetch classrooms to get updated data
    const enrollmentStats = await fetchClassEnrollmentStats(user.schoolId);
    const mapped: Classroom[] = enrollmentStats.map((stat) => ({
      id: stat.classId || crypto.randomUUID(),
      name: stat.className,
      studentsCount: stat.studentCount,
      formsCount: Object.keys(stat.forms ?? {}).length,
      assignedForms: Object.entries(stat.forms ?? {}).map(([formId, formName]) => ({
        id: formId,
        name: formName,
        status: 'Active' as any
      }))
    }));
    
    setClassrooms(mapped);
    setNewClassroomName('');
    setIsEditDialogOpen(false);
  };
  const handleDeleteClassroom = async () => {
    if (!selectedClassroom) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await deleteClassroom(selectedClassroom.id, user.schoolId);
    
    // Refetch classrooms after deletion
    const enrollmentStats = await fetchClassEnrollmentStats(user.schoolId);
    const mapped: Classroom[] = enrollmentStats.map((stat) => ({
      id: stat.classId || crypto.randomUUID(),
      name: stat.className,
      studentsCount: stat.studentCount,
      formsCount: Object.keys(stat.forms ?? {}).length,
      assignedForms: Object.entries(stat.forms ?? {}).map(([formId, formName]) => ({
        id: formId,
        name: formName,
        status: 'Active' as any
      }))
    }));
    
    setClassrooms(mapped);
    setIsDeleteDialogOpen(false);
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
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            Classroom Management
          </h1>
          <Button onClick={() => {
          setNewClassroomName('');
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search classrooms..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {loading ? (
                <Loading message="Loading classrooms..." size="sm" />
              ) : filteredClassrooms.length > 0 ? (
                filteredClassrooms.map((classroom, index) => (
                  <Card key={classroom.id || `classroom-${index}`} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-sm">
                            {classroom.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 2)}
                          </div>
                          <div>
                            <Link to={`/admin/classrooms/${classroom.id}`} className="text-base font-medium text-foreground hover:text-amazon-teal">
                              {classroom.name}
                            </Link>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {classroom.studentsCount} student{classroom.studentsCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
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
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {classroom.assignedForms.length > 0 ? (
                            classroom.assignedForms.slice(0, 2).map(form => (
                              <Badge key={form.id} variant="secondary" className="text-xs">
                                {form.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">No forms assigned</span>
                          )}
                          {classroom.assignedForms.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{classroom.assignedForms.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <Link to={`/admin/form-assignments?classroom=${classroom.id}`} className="block">
                          <Button variant="outline" size="sm" className="w-full flex items-center justify-center">
                            <FileText className="h-4 w-4 mr-1" />
                            Manage Forms
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No classrooms found. Try a different search or add a new classroom.
                </div>
              )}
            </div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Classroom
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
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
                  {loading ? <tr>
                      <td colSpan={4} className="py-8">
                        <Loading message="Loading classrooms..." size="sm" />
                      </td>
                    </tr> : filteredClassrooms.length > 0 ? filteredClassrooms.map((classroom, index) => <tr key={classroom.id || `classroom-${index}`} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold">
                              {classroom.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 2)}
                            </div>
                            <div>
                              <Link to={`/admin/classrooms/${classroom.id}`} className="text-base font-medium text-foreground hover:text-amazon-teal">
                                {classroom.name}
                              </Link>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />{' '}
                                {classroom.studentsCount} student
                                {classroom.studentsCount === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {classroom.studentsCount}
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
                              <Button variant="outline" size="sm" className="hidden lg:flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                Manage Forms
                              </Button>
                              <Button variant="outline" size="sm" className="lg:hidden">
                                <FileText className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <ValidatedInput 
              value={newClassroomName} 
              onChange={e => setNewClassroomName(e.target.value)} 
              placeholder="Enter classroom name" 
              className="w-full" 
              validationRules={commonValidationRules.classroom}
              showToast={showToast}
              hideToast={hideToast}
              autoFocus 
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <AsyncButton onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" disabled={!newClassroomName.trim()}>
              Add Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <ValidatedInput 
              value={newClassroomName} 
              onChange={e => setNewClassroomName(e.target.value)} 
              placeholder="Enter new classroom name" 
              className="w-full" 
              validationRules={commonValidationRules.classroom}
              showToast={showToast}
              hideToast={hideToast}
              autoFocus 
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <AsyncButton onClick={handleEditClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" disabled={!newClassroomName.trim()}>
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedClassroom?.name}</span>?
              This action cannot be undone.
            </p>
            {selectedClassroom?.studentsCount && selectedClassroom.studentsCount > 0 && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    This classroom has {selectedClassroom?.studentsCount}{' '}
                    student{selectedClassroom?.studentsCount !== 1 ? 's' : ''}{' '}
                    enrolled. Deleting it will remove all student associations.
                  </p>
                </div>}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleDeleteClassroom} className="w-full sm:w-auto">
              Delete Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </AdminLayout>;
}