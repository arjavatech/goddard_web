import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, AlertCircle, LayoutGrid, List } from 'lucide-react';
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

// Helper to return the standard background color for classroom avatars
const getAvatarColorClass = (name: string) => {
  return '!bg-[#044ba0] !text-white';
};

export function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => window.innerWidth < 768 ? 'card' : 'table');
  useEffect(() => {
    const handleResize = () => { if (window.innerWidth < 768) setViewMode('card'); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
    itemsPerPage: 6,
    mobileItemsPerPage: 6
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
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 max-w-7xl mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading classroom data...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4  py-0 sm:pt-12 max-w-7xl space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Classroom Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage classrooms, student assignments, and template overrides</p>
          </div>
          <Button 
            onClick={() => { setNewClassroomName(''); setClassroomErrors({}); setIsAddDialogOpen(true); }}
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Classroom
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="h-full">
            <StatCard 
              label="Total Classrooms" 
              value={classrooms.length} 
              icon={Users} 
              iconBgClass="bg-[#EFF5FB]" 
              iconColorClass="text-[#0F2D52]" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
          <div className="h-full">
            <StatCard 
              label="Total Students" 
              value={classrooms.reduce((s, c) => s + c.studentsCount, 0)} 
              icon={Users} 
              iconBgClass="bg-emerald-50" 
              iconColorClass="text-emerald-600" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
          <div className="h-full">
            <StatCard 
              label="Assigned Forms" 
              value={classrooms.reduce((s, c) => s + c.formsCount, 0)} 
              icon={FileText} 
              iconBgClass="bg-amber-50" 
              iconColorClass="text-amber-600" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
        </div>

        {/* Directory Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Classroom Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">{sortedClassrooms.length} of {classrooms.length} classrooms</p>
              </div>
              
              {/* Premium Segmented View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 self-start sm:self-auto shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Card View</span>
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search classrooms…"
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <SortDropdown currentSortBy={sortBy} currentSortOrder={sortOrder} options={sortOptions} labels={sortLabels} onSort={(by, order) => { setSortBy(by); setSortOrder(order); }} />
            </div>
          </div>

          {/* Conditional Rendering of Views */}
          {viewMode === 'card' ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] text-slate-400 font-semibold">{paginatedClassrooms.length} of {sortedClassrooms.length}</span>
              </div>
              {paginatedClassrooms.length === 0 ? (
                <div className="py-16 text-center">
                  <Users className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-semibold">No classrooms found matching your search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedClassrooms.map((classroom, index) => (
                    <div key={classroom.id || `classroom-${index}`} className="relative rounded-2xl border border-slate-100 bg-white shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                      {/* Header */}
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                          {classroom.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/admin/classrooms/${classroom.id}`} className="font-bold text-sm text-slate-900 hover:text-[#0F2D52] hover:underline block truncate leading-tight">
                            {classroom.name}
                          </Link>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              <Users className="h-3 w-3" />{classroom.studentsCount} students
                            </span>
                            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                              <FileText className="h-3 w-3" />{classroom.formsCount} forms
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2 rounded-xl text-slate-400 hover:text-[#0F2D52] hover:bg-slate-50 flex-shrink-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                            <DropdownMenuItem className="cursor-pointer font-semibold text-xs text-slate-700" onClick={() => navigate(`/admin/form-assignments?classroom=${classroom.id}`)}>
                              <FileText className="h-4 w-4 mr-2 text-slate-400" />Manage Forms
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-semibold text-xs text-slate-700" onClick={() => openEditDialog(classroom)}>
                              <Edit className="h-4 w-4 mr-2 text-slate-400" />Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem className={`cursor-pointer font-semibold text-xs text-red-600 ${classroom.studentsCount > 0 ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={classroom.studentsCount > 0} onClick={() => openDeleteDialog(classroom)}>
                              <Trash2 className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mx-4 border-t border-slate-50" />

                      {/* Stats */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Students</span>
                          <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-1">
                            <Users className="h-3.5 w-3.5 text-[#0F2D52]" />{classroom.studentsCount}
                          </span>
                        </div>
                        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Forms</span>
                          <span className="text-base font-extrabold text-slate-900 flex items-center gap-1.5 mt-1">
                            <FileText className="h-3.5 w-3.5 text-emerald-600" />{classroom.formsCount}
                          </span>
                        </div>
                      </div>

                      <div className="mx-4 border-t border-slate-50" />

                      {/* Form badges */}
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Assigned Forms</p>
                        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                          {classroom.assignedForms.length > 0 ? (
                            <>
                              {classroom.assignedForms.slice(0, 3).map(form => (
                                <Badge key={form.id} variant="secondary" className="text-[10px] rounded-full px-2.5 py-0.5 font-bold bg-[#EFF5FB] text-[#0F2D52] border-none truncate max-w-[130px]">{form.name}</Badge>
                              ))}
                              {classroom.assignedForms.length > 3 && (
                                <Badge variant="outline" className="text-[10px] rounded-full px-2.5 py-0.5 font-bold border-slate-200 text-slate-500">+{classroom.assignedForms.length - 3}</Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic font-medium">No forms assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-4 pb-4 pt-1">
                        <Link to={`/admin/classrooms/${classroom.id}`} className="text-xs font-bold text-[#0F2D52] hover:underline flex items-center gap-1">
                          View classroom profile →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400 font-semibold">Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200">Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200">Next</Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <DataTable
              className="relative z-0"
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
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2.5">
                      <AvatarInitials initials={classroom.name.split(' ').map(w => w[0]).join('')} className={`${getAvatarColorClass(classroom.name)} font-bold`} />
                      <div className="min-w-0">
                        <Link to={`/admin/classrooms/${classroom.id}`} className="text-sm font-bold text-slate-900 hover:text-[#0F2D52] hover:underline block truncate">
                          {classroom.name}
                        </Link>
                        <p className="text-xs text-slate-400 font-semibold mt-0.5">{classroom.studentsCount} student{classroom.studentsCount === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 text-slate-650 font-semibold text-sm">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{classroom.studentsCount}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-wrap gap-1">
                      {classroom.assignedForms.length > 0 ? classroom.assignedForms.slice(0, 2).map(form => (
                        <Badge key={form.id} variant="secondary" className="text-[10px] rounded-full px-2.5 py-0.5 font-bold">{form.name}</Badge>
                      )) : <span className="text-xs text-slate-400 font-semibold">No forms assigned</span>}
                      {classroom.assignedForms.length > 2 && <Badge variant="outline" className="text-[10px] rounded-full px-2.5 py-0.5 font-bold">+{classroom.assignedForms.length - 2} more</Badge>}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-650"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/admin/form-assignments?classroom=${classroom.id}`)}>
                          <FileText className="h-4 w-4 mr-2 text-slate-400" />Manage Forms
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(classroom)}>
                          <Edit className="h-4 w-4 mr-2 text-slate-400" />Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className={`cursor-pointer ${classroom.studentsCount > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-red-650 focus:text-red-700 focus:bg-red-50'}`} disabled={classroom.studentsCount > 0} onClick={() => openDeleteDialog(classroom)}>
                          <Trash2 className="h-4 w-4 mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            />
          )}
        </div>
      </motion.div>

      {/* Add Classroom Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Add New Classroom</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classroom Name</label>
              <Input
                value={newClassroomName}
                onChange={e => {
                  setNewClassroomName(e.target.value);
                  if (classroomErrors.newClassroomName) setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }}
                placeholder="Enter classroom name"
                className={`w-full h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`}
                autoFocus
              />
              {classroomErrors.newClassroomName && (
                <p className="text-xs text-red-600 mt-1 font-bold">{classroomErrors.newClassroomName}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <AsyncButton
              onClick={handleAddClassroom}
              className="h-10 rounded-xl text-xs font-bold px-4 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all"
              disabled={!newClassroomName.trim()}
            >
              Add Classroom
            </AsyncButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Rename Classroom</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Classroom Name</label>
              <Input
                value={newClassroomName}
                onChange={e => {
                  setNewClassroomName(e.target.value);
                  if (classroomErrors.newClassroomName) setClassroomErrors(prev => ({...prev, newClassroomName: ''}));
                }}
                placeholder="Enter new classroom name"
                className={`w-full h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white ${classroomErrors.newClassroomName ? 'border-red-500' : ''}`}
                autoFocus
              />
              {classroomErrors.newClassroomName && (
                <p className="text-xs text-red-600 mt-1 font-bold">{classroomErrors.newClassroomName}</p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <AsyncButton
              onClick={handleEditClassroom}
              className="h-10 rounded-xl text-xs font-bold px-4 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all"
              disabled={!newClassroomName.trim()}
            >
              Save Changes
            </AsyncButton>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Delete Classroom</DialogTitle>
          </div>
          <div className="p-6">
            {selectedClassroom?.studentsCount && selectedClassroom.studentsCount > 0 ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 font-semibold leading-relaxed">
                  Cannot delete this classroom. It has {selectedClassroom?.studentsCount}{' '}
                  student{selectedClassroom?.studentsCount !== 1 ? 's' : ''} enrolled.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-extrabold text-[#0F2D52]">{selectedClassroom?.name}</span>?
                This action cannot be undone.
              </p>
            )}
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <AsyncButton
              variant="destructive"
              onClick={handleDeleteClassroom}
              disabled={(selectedClassroom?.studentsCount ?? 0) > 0}
              className="h-10 rounded-xl text-xs font-bold px-4 text-white transition-all"
            >
              Delete Classroom
            </AsyncButton>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}