import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { Loading } from '../../components/ui/loading';
import { useToast } from '../../contexts/ToastContext';
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
  const [classroomErrors, setClassroomErrors] = useState<{[key: string]: string}>({});
  const { showToast } = useToast();
  const navigate = useNavigate();

  const schoolId = localStorage.getItem('schoolId');

  const validateClassroom = () => {
    const errors: {[key: string]: string} = {};
    
    if (!newClassroomName.trim()) errors.newClassroomName = 'Classroom name is required';
    else if (newClassroomName.trim().length < 2) errors.newClassroomName = 'Classroom name must be at least 2 characters';
    
    setClassroomErrors(errors);
    return Object.keys(errors).length === 0;
  };
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // const user = await fetchUserContext();
        if (!schoolId) {
          throw new Error('Unable to determine school context for this admin.');
        }
        const enrollmentStats = await fetchClassEnrollmentStats(schoolId).catch(() => []);
        if (!isMounted) return;
        
        const mapped: Classroom[] = enrollmentStats.map((stat) => ({
          id: stat.classId || stat.className.toLowerCase().replace(/\s+/g, '-'),
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

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortLabel = () => {
    const labels: Record<string, string> = {
      name: 'Name',
      students: 'Students',
      forms: 'Forms',
    };
    return labels[sortBy] || 'Sort';
  };

  const sortedClassrooms = useMemo(() => {
    return [...filteredClassrooms].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'students': aVal = a.studentsCount; bVal = b.studentsCount; break;
        case 'forms': aVal = a.formsCount; bVal = b.formsCount; break;
        default: aVal = a.name; bVal = b.name;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }, [filteredClassrooms, sortBy, sortOrder]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedClassrooms,
    itemsPerPage,
    setCurrentPage
  } = usePagination({
    data: sortedClassrooms,
    itemsPerPage: 5,
    mobileItemsPerPage: 5
  });
  const handleAddClassroom = async () => {
    if (!validateClassroom()) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) throw new Error('School context not found');
      
      await createClassroom(schoolId, newClassroomName.trim());
      
      // Refetch classrooms to get the actual server data
      const enrollmentStats = await fetchClassEnrollmentStats(schoolId);
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
      setClassroomErrors({});
      setIsAddDialogOpen(false);
      showToast('success', `Classroom "${newClassroomName.trim()}" created successfully`);
    } catch (error) {
      showToast('error', 'Failed to create classroom. Please try again.');
    }
  };
  const handleEditClassroom = async () => {
    if (!selectedClassroom || !validateClassroom()) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) throw new Error('School context not found');
      
      await renameClassroom(selectedClassroom.name, newClassroomName.trim(), schoolId);
      
      // Refetch classrooms to get updated data
      const enrollmentStats = await fetchClassEnrollmentStats(schoolId);
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
      setClassroomErrors({});
      setIsEditDialogOpen(false);
      showToast('success', `Classroom renamed to "${newClassroomName.trim()}" successfully`);
    } catch (error) {
      showToast('error', 'Failed to rename classroom. Please try again.');
    }
  };
  const handleDeleteClassroom = async () => {
    if (!selectedClassroom) return;
    
    try {
      // const user = await fetchUserContext();
      if (!schoolId) throw new Error('School context not found');
      
      await deleteClassroom(selectedClassroom.id, schoolId);
      
      // Refetch classrooms after deletion
      const enrollmentStats = await fetchClassEnrollmentStats(schoolId);
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
      showToast('success', `Classroom "${selectedClassroom.name}" deleted successfully`);
    } catch (error) {
      showToast('error', 'Failed to delete classroom. Please try again.');
    }
  };
  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setNewClassroomName(classroom.name);
    setClassroomErrors({});
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setIsDeleteDialogOpen(true);
  };
  return <AdminLayout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Classroom Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage classrooms and student assignments
            </p>
          </div>
          <Button onClick={() => {
          setNewClassroomName('');
          setClassroomErrors({});
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    Total Classrooms
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{classrooms.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    Total Students
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {classrooms.reduce((sum, c) => sum + c.studentsCount, 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
                    Assigned Forms
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {classrooms.reduce((sum, c) => sum + c.formsCount, 0)}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="p-4 sm:p-6 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Classroom Directory</h2>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {sortedClassrooms.length} of {classrooms.length} classrooms
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search classrooms..." 
                    className="pl-10 h-10 sm:h-11 bg-background text-sm sm:text-base" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 sm:h-11">
                      {sortOrder === 'asc'
                        ? <ArrowUp className="h-4 w-4 mr-2" />
                        : <ArrowDown className="h-4 w-4 mr-2" />}
                      {getSortLabel()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>Name A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>Name Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('students'); setSortOrder('desc'); }}>Most Students</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('forms'); setSortOrder('desc'); }}>Most Forms</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-2 sm:space-y-3 p-3 sm:p-4">
              {loading ? (
                <div className="py-6 sm:py-8">
                  <Loading message="Loading classrooms..." size="sm" />
                </div>
              ) : paginatedClassrooms.length > 0 ? (
                paginatedClassrooms.map((classroom, index) => (
                  <Card key={classroom.id || `classroom-${index}`} className="p-3 sm:p-4">
                    <CardContent className="p-0">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0">
                            {classroom.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link to={`/admin/classrooms/${classroom.id}`} className="text-sm sm:text-base font-medium text-foreground hover:text-amazon-teal block truncate">
                              {classroom.name}
                            </Link>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{classroom.studentsCount} student{classroom.studentsCount === 1 ? '' : 's'}</span>
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/admin/form-assignments?classroom=${classroom.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Manage Forms
                            </DropdownMenuItem>
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
                              <Badge key={form.id} variant="secondary" className="text-xs truncate max-w-[120px]">
                                {form.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs sm:text-sm">No forms assigned</span>
                          )}
                          {classroom.assignedForms.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{classroom.assignedForms.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="py-6 sm:py-8 text-center text-muted-foreground text-xs sm:text-sm">
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
                    <th className="text-left py-3 px-3 font-medium text-gray-600 w-1/3">Classroom</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/6">Students</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 w-1/3">Assigned Forms</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-600 w-1/6">Actions</th>
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/form-assignments?classroom=${classroom.id}`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Manage Forms
                              </DropdownMenuItem>
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
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input 
              value={newClassroomName} 
              onChange={e => {
                setNewClassroomName(e.target.value);
                if (classroomErrors.newClassroomName) {
                  setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }
              }} 
              placeholder="Enter classroom name" 
              className={`w-full h-10 sm:h-11 text-sm sm:text-base ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`} 
              autoFocus 
            />
            {classroomErrors.newClassroomName && (
              <p className="text-xs sm:text-sm text-red-600 mt-1">{classroomErrors.newClassroomName}</p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!newClassroomName.trim()}>
              Add Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Rename Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input 
              value={newClassroomName} 
              onChange={e => {
                setNewClassroomName(e.target.value);
                if (classroomErrors.newClassroomName) {
                  setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }
              }} 
              placeholder="Enter new classroom name" 
              className={`w-full h-10 sm:h-11 text-sm sm:text-base ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`} 
              autoFocus 
            />
            {classroomErrors.newClassroomName && (
              <p className="text-xs sm:text-sm text-red-600 mt-1">{classroomErrors.newClassroomName}</p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton onClick={handleEditClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto h-9 sm:h-10 text-sm" disabled={!newClassroomName.trim()}>
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <p className="text-sm sm:text-base text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedClassroom?.name}</span>?
              This action cannot be undone.
            </p>
            {selectedClassroom?.studentsCount && selectedClassroom.studentsCount > 0 && <div className="mt-3 sm:mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-amber-800">
                    This classroom has {selectedClassroom?.studentsCount}{' '}
                    student{selectedClassroom?.studentsCount !== 1 ? 's' : ''}{' '}
                    enrolled. Deleting it will remove all student associations.
                  </p>
                </div>}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Cancel
            </Button>
            <AsyncButton variant="destructive" onClick={handleDeleteClassroom} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
              Delete Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}