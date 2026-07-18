import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { fetchClassEnrollmentStats, renameClassroom, deleteClassroom, createClassroom, type Classroom } from '../../services/api/admin';
import { usePagination } from '../../hooks/usePagination';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { StatCard } from '../../components/ui/stat-card';
import { SortDropdown, sortItems, type SortOption } from '../../components/ui/sort-dropdown';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { PageLoader } from '../../components/ui/page-loader';

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

  const mapEnrollmentStats = (stats: Awaited<ReturnType<typeof fetchClassEnrollmentStats>>): Classroom[] =>
    stats.map(stat => ({
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
        setClassrooms(mapEnrollmentStats(enrollmentStats));
      } catch (err) {
        console.error('Failed to load classroom stats:', err);
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

  const sortLabels: Record<string, string> = { name: 'Name', students: 'Students', forms: 'Forms' };
  const sortOptions: SortOption[] = [
    { label: 'Name A-Z', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Name Z-A', sortBy: 'name', sortOrder: 'desc' },
    { label: 'Most Students', sortBy: 'students', sortOrder: 'desc' },
    { label: 'Most Forms', sortBy: 'forms', sortOrder: 'desc' },
  ];

  const sortedClassrooms = useMemo(() =>
    sortItems(filteredClassrooms, sortBy, sortOrder, (c, key) => {
      if (key === 'students') return c.studentsCount;
      if (key === 'forms') return c.formsCount;
      return c.name;
    }),
  [filteredClassrooms, sortBy, sortOrder]);

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
      if (!schoolId) throw new Error('School context not found');
      const name = newClassroomName.trim();
      await createClassroom(schoolId, name);
      setClassrooms(mapEnrollmentStats(await fetchClassEnrollmentStats(schoolId)));
      setNewClassroomName('');
      setClassroomErrors({});
      setIsAddDialogOpen(false);
      showToast('success', `Classroom "${name}" created successfully`);
    } catch (error) {
      const errorText =
        (error as any)?.response?.error ||
        (error as any)?.response?.message ||
        (error instanceof Error ? error.message : '');

      if (
        typeof errorText === 'string' &&
        (errorText.includes('duplicate key value violates unique constraint') ||
         errorText.toLowerCase().includes('already exists') ||
         errorText.toLowerCase().includes('unique'))
      ) {
        showToast('error', 'Classroom name already exists');
      } else {
        showToast('error', 'Failed to create classroom. Please try again.');
      }
      throw error;
    }
  };
  const handleEditClassroom = async () => {
    if (!selectedClassroom || !validateClassroom()) return;
    try {
      if (!schoolId) throw new Error('School context not found');
      const oldName = selectedClassroom.name;
      const newName = newClassroomName.trim();
      await renameClassroom(oldName, newName, schoolId);
      setClassrooms(mapEnrollmentStats(await fetchClassEnrollmentStats(schoolId)));
      setNewClassroomName('');
      setClassroomErrors({});
      setIsEditDialogOpen(false);
      showToast('success', `Classroom renamed to "${newName}" successfully`);
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
      setClassrooms(mapEnrollmentStats(await fetchClassEnrollmentStats(schoolId)));
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
  if (loading) {
    return <PageLoader message="Loading classroom data..." Layout={AdminLayout} />;
  }
  return <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Classroom Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage classrooms and student assignments</p>
          </div>
          <Button onClick={() => { setNewClassroomName(''); setClassroomErrors({}); setIsAddDialogOpen(true); }}
            className="bg-white text-[#1a2740] border-2 border-[#1a2740] hover:bg-[#1a2740] hover:text-white rounded-xl w-full h-10 sm:w-auto transition-all duration-200" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
            <StatCard label="Total Classrooms" value={classrooms.length} icon={Users} iconBgClass="bg-cyan-50" iconColorClass="text-cyan-600" className="hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '40ms' }}>
            <StatCard label="Total Students" value={classrooms.reduce((s,c)=>s+c.studentsCount,0)} icon={Users} iconBgClass="bg-violet-50" iconColorClass="text-violet-600" className="hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <StatCard label="Assigned Forms" value={classrooms.reduce((s,c)=>s+c.formsCount,0)} icon={FileText} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" className="hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
        </div>

        {/* Directory card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Classroom Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">{sortedClassrooms.length} of {classrooms.length} classrooms</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                <input
                  placeholder="Search classrooms…"
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <SortDropdown currentSortBy={sortBy} currentSortOrder={sortOrder} options={sortOptions} labels={sortLabels} onSort={(by,order)=>{setSortBy(by);setSortOrder(order);}} />
            </div>
          </div>
            {/* Mobile Card View */}
            <MobileCardList
              className="lg:hidden p-3 sm:p-4"
              loading={loading}
              loadingMessage="Loading classrooms..."
              emptyMessage="No classrooms found matching your search criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              gridClassName="space-y-2 sm:space-y-3"
              cards={paginatedClassrooms.map((classroom, index) => (
                <Card key={classroom.id || `classroom-${index}`} className="p-3 sm:p-4">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <AvatarInitials initials={classroom.name.split(' ').map(w => w[0]).join('')} />
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
                          <DropdownMenuItem onClick={() => openDeleteDialog(classroom)} className="text-red-600 focus:text-red-600" disabled={classroom.studentsCount > 0}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                        <Badge variant="outline" className="text-xs">+{classroom.assignedForms.length - 2} more</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            />
            {/* Desktop Table View */}
            <DataTable
              className="hidden lg:block"
              loading={loading}
              loadingMessage="Loading classrooms..."
              emptyMessage="No classrooms found. Try a different search or add a new classroom."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredClassrooms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Classroom', className: 'w-1/4' },
                { header: 'Students', className: 'w-1/8' },
                { header: 'Assigned Forms', className: 'w-1/4' },
                { header: 'Actions', className: 'w-1/8 text-right' },
              ]}
              rows={paginatedClassrooms.map((classroom, index) => (
                <tr key={classroom.id || `classroom-${index}`} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all duration-200 ease-in-out">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <AvatarInitials initials={classroom.name.split(' ').map(w => w[0]).join('')} className="mr-0" />
                      <div className="min-w-0">
                        <Link to={`/admin/classrooms/${classroom.id}`} className="text-sm font-semibold text-cyan-600 hover:text-cyan-700 transition-colors hover:underline block truncate">
                          {classroom.name}
                        </Link>
                        <p className="text-xs text-slate-400 truncate">{classroom.studentsCount} student{classroom.studentsCount === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-medium">{classroom.studentsCount}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {classroom.assignedForms.length > 0 ? classroom.assignedForms.slice(0, 2).map(form => (
                        <Badge key={form.id} variant="secondary" className="text-xs rounded-full">{form.name}</Badge>
                      )) : <span className="text-xs text-slate-400">No forms assigned</span>}
                      {classroom.assignedForms.length > 2 && <Badge variant="outline" className="text-xs rounded-full">+{classroom.assignedForms.length - 2} more</Badge>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-lg">
                        <DropdownMenuItem onClick={() => navigate(`/admin/form-assignments?classroom=${classroom.id}`)} className="rounded-lg">
                          <FileText className="h-4 w-4 mr-2 text-slate-400" />Manage Forms
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(classroom)} className="rounded-lg">
                          <Edit className="h-4 w-4 mr-2 text-slate-400" />Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteDialog(classroom)} className={`rounded-lg ${classroom.studentsCount > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-red-600 focus:text-red-600'}`} disabled={classroom.studentsCount > 0}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            />
        </div>
      </div>
      {/* Add Classroom Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classroom Name</label>
              <Input
                value={newClassroomName}
                onChange={e => {
                  setNewClassroomName(e.target.value);
                  if (classroomErrors.newClassroomName) setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }}
                placeholder="Enter classroom name"
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`}
                autoFocus
              />
              {classroomErrors.newClassroomName && (
                <p className="text-xs text-red-600 mt-1">{classroomErrors.newClassroomName}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <AsyncButton
              onClick={handleAddClassroom}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#1a2740] hover:bg-[#0f1d30] text-white transition-all duration-200 font-semibold"
              disabled={!newClassroomName.trim()}
            >
              Add Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Rename Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classroom Name</label>
              <Input
                value={newClassroomName}
                onChange={e => {
                  setNewClassroomName(e.target.value);
                  if (classroomErrors.newClassroomName) setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }}
                placeholder="Enter new classroom name"
                className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`}
                autoFocus
              />
              {classroomErrors.newClassroomName && (
                <p className="text-xs text-red-600 mt-1">{classroomErrors.newClassroomName}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <AsyncButton
              onClick={handleEditClassroom}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#1a2740] hover:bg-[#0f1d30] text-white transition-all duration-200 font-semibold"
              disabled={!newClassroomName.trim()}
            >
              Save Changes
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            {selectedClassroom?.studentsCount && selectedClassroom.studentsCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  Cannot delete this classroom. It has {selectedClassroom?.studentsCount}{' '}
                  student{selectedClassroom?.studentsCount !== 1 ? 's' : ''} enrolled.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-slate-900">{selectedClassroom?.name}</span>?
                This action cannot be undone.
              </p>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#1a2740] border border-[#1a2740] hover:bg-[#1a2740] hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <AsyncButton
              variant="destructive"
              onClick={handleDeleteClassroom}
              disabled={(selectedClassroom?.studentsCount ?? 0) > 0}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl transition-all duration-200 font-semibold"
            >
              Delete Classroom
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>;
}