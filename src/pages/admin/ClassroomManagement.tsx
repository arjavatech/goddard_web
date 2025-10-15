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
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
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

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedClassrooms,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ 
    data: filteredClassrooms,
    itemsPerPage: 10,
    mobileItemsPerPage: 5
  });
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
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Classroom Management
            </h1>
            <p className="text-muted-foreground">
              Manage classrooms and student assignments
            </p>
          </div>
          <Button onClick={() => {
          setNewClassroomName('');
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 self-start sm:self-center">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Classrooms
                  </p>
                  <p className="text-3xl font-bold text-foreground">{classrooms.length}</p>
                </div>
                <div className="p-3 bg-amazon-teal/10 rounded-full">
                  <Users className="h-6 w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {classrooms.reduce((sum, c) => sum + c.studentsCount, 0)}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Assigned Forms
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {classrooms.reduce((sum, c) => sum + c.formsCount, 0)}
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
                <h2 className="text-xl font-semibold">Classroom Directory</h2>
                <div className="text-sm text-muted-foreground">
                  {filteredClassrooms.length} of {classrooms.length} classrooms
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search classrooms..." 
                  className="pl-10 h-11 bg-background" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>
            </div>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 p-4">
              {loading ? (
                <div className="py-8">
                  <Loading message="Loading classrooms..." size="sm" />
                </div>
              ) : paginatedClassrooms.length > 0 ? (
                paginatedClassrooms.map((classroom, index) => (
                  <Card key={classroom.id || `classroom-${index}`} className="p-3">
                    <CardContent className="p-0">
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
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No classrooms found matching your search criteria.
                </div>
              )}
              
              <MobilePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-medium text-gray-600 w-1/3">
                      Classroom
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/6">
                      Students
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/3">
                      Assigned Forms
                    </th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 w-1/6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr>
                      <td colSpan={4} className="py-8">
                        <Loading message="Loading classrooms..." size="sm" />
                      </td>
                    </tr> : paginatedClassrooms.length > 0 ? paginatedClassrooms.map((classroom, index) => <tr key={classroom.id || `classroom-${index}`} className="border-b border-gray-100">
                        <td className="py-3 px-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-2 flex-shrink-0">
                              {classroom.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <Link to={`/admin/classrooms/${classroom.id}`} className="font-medium text-amazon-teal hover:text-amazon-teal/80 transition-colors hover:underline block truncate">
                                {classroom.name}
                              </Link>
                              <div className="text-xs text-gray-500 truncate">
                                {classroom.studentsCount} student{classroom.studentsCount === 1 ? '' : 's'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center text-gray-700">
                            <Users className="h-4 w-4 mr-1 text-gray-400" />
                            <span className="font-medium">{classroom.studentsCount}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {classroom.assignedForms.length > 0 ? classroom.assignedForms.slice(0, 2).map(form => <Badge key={form.id} variant="secondary" className="text-xs">
                                    {form.name}
                                  </Badge>) : <span className="text-gray-400 text-sm">
                                No forms assigned
                              </span>}
                            {classroom.assignedForms.length > 2 && <Badge variant="outline" className="text-xs">
                                +{classroom.assignedForms.length - 2} more
                              </Badge>}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
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
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClassrooms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              className="hidden lg:flex"
            />
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