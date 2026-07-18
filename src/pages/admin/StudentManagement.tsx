import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, GraduationCap, School, Users, FileText, CheckCircle, Clock, AlertCircle, Filter, X, UserPlus, Settings, MoreHorizontal, ChevronDown, Download, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { usePagination } from '../../hooks/usePagination';
import { StatCard } from '../../components/ui/stat-card';
import { SortDropdown, sortItems, type SortOption } from '../../components/ui/sort-dropdown';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { downloadCSV, printAsPDF } from '../../lib/export';
import { normalizeFormStatus } from '../../lib/formStatus';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { Checkbox } from '../../components/ui/checkbox';
import { fetchStudentEnrollments, updateChildStatus, fetchClassrooms, assignFormsToStudent, promoteStudent, bulkPromoteStudents } from '@/services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { useToast } from '../../contexts/ToastContext';
import { PageLoader } from '../../components/ui/page-loader';

type EnrollmentStatus = 'Completed-AdminApproved' | 'Completed-Pending Approval' | 'Draft';

interface EnrollmentData {
  parent_id: string;
  parent_first_name: string;
  parent_last_name: string;
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  class_name: string;
  primary_email: string;
  form_status: string;
  forms: Record<string, string>;
  additional_parent_email?: string | null;
  child_status?: string;
  enrollment_id?: string;
  secondary_parent_id?: string | null;
  secondary_parent_first_name?: string | null;
  secondary_parent_last_name?: string | null;
  secondary_parent_email?: string | null;
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  enrollmentProgress: number;
  enrollmentStatus: EnrollmentStatus;
  formsCompleted: number;
  formsApproved: number;
  formsInProgress: number;
  totalForms: number;
  classroom: {
    id: string;
    name: string;
  };
  parent: {
    id: string;
    name: string;
    email: string;
  };
  secondaryParent?: {
    id: string;
    name: string;
    email: string;
  } | null;
  assignedForms: {
    id: string;
    name: string;
    status: string;
    assignedAt?: string | null;
    dueDate?: string | null;
  }[];
  childStatus: 'active' | 'archive';
  enrollmentId?: string;
  formStatus?: string;
}
export function StudentManagement() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const statusFromProgress = (progress: number): EnrollmentStatus => {
    if (progress === 100) return 'Completed-AdminApproved';
    if (progress > 0) return 'Completed-Pending Approval';
    return 'Draft';
  };
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formFilter, setFormFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [childStatusFilter, setChildStatusFilter] = useState<string[]>([]);
  const [classroomFilter, setClassroomFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>([]);

  const [showFilters, setShowFilters] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'archive'>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  // Form assignment states
  const [isAssignFormDialogOpen, setIsAssignFormDialogOpen] = useState(false);
  const [selectedStudentsForForm, setSelectedStudentsForForm] = useState<string[]>([]);
  const [selectedFormToAssign, setSelectedFormToAssign] = useState('');
  const [assignDialogClassroomFilter, setAssignDialogClassroomFilter] = useState('all');
  const [assignDialogSearchTerm, setAssignDialogSearchTerm] = useState('');
  const [availableForms, setAvailableForms] = useState<{id: string, name: string, status?: string}[]>([]);
  
  // Individual student form assignment states
  const [isStudentFormDialogOpen, setIsStudentFormDialogOpen] = useState(false);
  const [selectedStudentForForms, setSelectedStudentForForms] = useState<Student | null>(null);
  const [selectedFormsToAdd, setSelectedFormsToAdd] = useState<string[]>([]);
  
  // Class transfer states
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedStudentForTransfer, setSelectedStudentForTransfer] = useState<Student | null>(null);
  const [newClassroomId, setNewClassroomId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [downloadingEnrollmentId, setDownloadingEnrollmentId] = useState<string | null>(null);


  const schoolId = localStorage.getItem('schoolId');

  const handleDownloadAllForms = async (enrollmentId: string) => {
    if (!enrollmentId) return;
    setDownloadingEnrollmentId(enrollmentId);
    try {
      const { downloadAllForms } = await import('../../services/api/admin');
      await downloadAllForms(enrollmentId);
    } catch (err) {
      console.error('Download failed:', err);
      showToast('error', 'Failed to download forms. Please try again.');
    } finally {
      setDownloadingEnrollmentId(null);
    }
  };

  const [availableClassrooms, setAvailableClassrooms] = useState<{id: string, name: string}[]>([]);
  const [formsLoaded, setFormsLoaded] = useState(false);

  const loadFormsIfNeeded = async () => {
    if (formsLoaded || !schoolId) return;
    try {
      const formsData = await fetchFormTemplates(schoolId);
      setAvailableForms(formsData.map(t => ({ id: t.id, name: t.formName, status: t.status || undefined })));
      setFormsLoaded(true);
    } catch (err) {
      console.error('Failed to load forms:', err);
    }
  };

  // Bulk transfer states
  const [isBulkTransferDialogOpen, setIsBulkTransferDialogOpen] = useState(false);
  const [selectedStudentsForTransfer, setSelectedStudentsForTransfer] = useState<string[]>([]);
  const [bulkTransferFromGrade, setBulkTransferFromGrade] = useState('');
  const [bulkTransferToGrade, setBulkTransferToGrade] = useState('');
  const [selectedStudentsForBulkAction, setSelectedStudentsForBulkAction] = useState<string[]>([]);

  const handleMultiSelectChange = (value: string, currentValues: string[], setter: (values: string[]) => void) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter(v => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const MultiSelectDropdown = ({ 
    value, 
    onValueChange, 
    options, 
    placeholder, 
  }: { 
    value: string[], 
    onValueChange: (values: string[]) => void, 
    options: string[], 
    placeholder: string,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 sm:h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-background px-3 py-2 text-sm text-slate-700 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
        >
          <span className="truncate">
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-100 bg-popover text-popover-foreground shadow-lg">
            <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
              {options.map((option) => (
                <div
                  key={option}
                  className="relative flex cursor-pointer select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-slate-50 hover:text-slate-900"
                  onClick={() => handleMultiSelectChange(option, value, onValueChange)}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.includes(option)}
                      onChange={() => { /* noop */ }}
                      className="pointer-events-none"
                    />
                    <span>{option}</span>
                  </div>
                </div>
              ))}
              {options.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No options available
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  const loadStudentData = async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    }
    try {
      if (!schoolId) {
        setStudents([]);
        return;
      }
      const [enrollmentData, classrooms] = await Promise.all([
        fetchStudentEnrollments(schoolId),
        fetchClassrooms(schoolId)
      ]);
      
      const enrollments = enrollmentData.enrollments || [];
      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        return;
      }
      const mappedStudents: Student[] = enrollments.map((enrollment: EnrollmentData, index: number) => {
        const studentId = enrollment.child_id || `student-${index}`;
        const firstName = enrollment.child_first_name || 'Unknown';
        const lastName = enrollment.child_last_name || 'Student';

        // Map forms from new API response format
        const formsArray = enrollment.forms && typeof enrollment.forms === 'object'
          ? Object.entries(enrollment.forms).map(([formName, formData]: [string, any]) => {
              const assignedDate = formData.assigned_at;
              let dueDate = null;
              if (assignedDate) {
                // Add 30 days to assigned date for due date
                const assigned = new Date(assignedDate);
                if (!isNaN(assigned.getTime())) {
                  const due = new Date(assigned);
                  due.setDate(due.getDate() + 30);
                  dueDate = due.toISOString().split('T')[0];
                }
              }
              return {
                id: formName,
                name: formName,
                status: formData.status || 'Not Started',
                assignedAt: assignedDate || null,
                dueDate
              };
            })
          : [];

        // Count approved forms
        const approved = formsArray.filter(form => {
          const normalized = normalizeFormStatus(form.status);
          return normalized === 'Approved';
        }).length;

        // Count in-progress forms
        const inProgress = formsArray.filter(form => {
          const normalized = normalizeFormStatus(form.status);
          return normalized === 'In Progress';
        }).length;

        const completed = approved + inProgress;
        const total = formsArray.length;

        // Calculate progress based on completed forms
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        const classroomName = enrollment.class_name;
        // Find the classroom ID by matching the name
        const classroom = classrooms.find(c => c.name === classroomName);
        const classroomId = classroom?.id || 'unassigned';

        const parentEmail = enrollment.primary_email || 'parent@example.com';
        const parentName = `${enrollment.parent_first_name || 'Unknown'} ${enrollment.parent_last_name || 'Parent'}`;
        const parentId = enrollment.parent_id;

        // Extract secondary parent info when available
        let secondaryParent = null;
        if (enrollment.secondary_parent_id) {
          secondaryParent = {
            id: enrollment.secondary_parent_id,
            name: `${enrollment.secondary_parent_first_name || ''} ${enrollment.secondary_parent_last_name || ''}`.trim(),
            email: enrollment.secondary_parent_email || ''
          };
        }

        const student = {
          id: studentId,
          firstName,
          lastName,
          dateOfBirth: undefined, // API doesn't provide DOB
          enrollmentProgress: progress,
          enrollmentStatus: statusFromProgress(progress),
          formsCompleted: completed,
          formsApproved: approved,
          formsInProgress: inProgress,
          totalForms: total,
          classroom: {
            id: classroomId,
            name: classroomName || 'Unassigned'
          },
          parent: {
            id: parentId,
            name: parentName,
            email: parentEmail
          },
          secondaryParent,
          assignedForms: formsArray,
          childStatus: (enrollment.child_status || 'active') as 'active' | 'archive',
          enrollmentId: enrollment.enrollment_id,
          formStatus: enrollment.form_status
        };
        return student;
      });
      if (mappedStudents.length > 0) {
        setStudents(mappedStudents);
      }
      
      // Set available classrooms
      const classroomsList = classrooms.map(classroom => ({
        id: classroom.id,
        name: classroom.name
      }));
      setAvailableClassrooms(classroomsList);
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Extract all unique form names from students
  const allFormNames = useMemo(() => {
    const formNamesSet = new Set<string>();
    students.forEach(student => {
      student.assignedForms.forEach(form => {
        formNamesSet.add(form.name);
      });
    });
    return Array.from(formNamesSet).sort();
  }, [students]);

  // Extract all unique classroom names from students
  const allClassrooms = useMemo(() => {
    const classroomSet = new Set<string>();
    students.forEach(student => {
      if (student.classroom.name && student.classroom.name !== 'Unassigned') {
        classroomSet.add(student.classroom.name);
      }
    });
    return Array.from(classroomSet).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || student.parent.email.toLowerCase().includes(searchQuery.toLowerCase()) || student.classroom.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter by forms - show students who have any of the selected forms
      const matchesForm = formFilter.length === 0 || formFilter.some(form => student.assignedForms.some(assignedForm => assignedForm.name === form));

      // Filter by status
      const matchesStatus = statusFilter.length === 0 || statusFilter.some(status => {
        return student.formStatus === status;
      });

      // Filter by child status
      const matchesChildStatus = childStatusFilter.length === 0 || childStatusFilter.includes(student.childStatus);

      // Filter by classroom
      const matchesClassroom = classroomFilter.length === 0 || classroomFilter.includes(student.classroom.name);

      // Filter by year
      const matchesYear = yearFilter.length === 0 || yearFilter.some(year => {
        return student.assignedForms.some(form => {
          if (!form.assignedAt) return false;
          try {
            const date = new Date(form.assignedAt);
            if (!isNaN(date.getTime())) {
              return date.getFullYear().toString() === year;
            } else {
              const parts = form.assignedAt.split('-');
              return parts.length === 3 && parts[2] === year;
            }
          } catch (e) {
            const parts = form.assignedAt.split('-');
            return parts.length === 3 && parts[2] === year;
          }
        });
      });

      return matchesSearch && matchesForm && matchesStatus && matchesChildStatus && matchesClassroom && matchesYear;
    });
  }, [students, searchQuery, formFilter, statusFilter, childStatusFilter, classroomFilter, yearFilter]);

  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortLabels: Record<string, string> = { name: 'Name', classroom: 'Classroom', parent: 'Parent', progress: 'Progress', status: 'Status' };
  const sortOptions: SortOption[] = [
    { label: 'Name A-Z', sortBy: 'name', sortOrder: 'asc' },
    { label: 'Name Z-A', sortBy: 'name', sortOrder: 'desc' },
    { label: 'Classroom A-Z', sortBy: 'classroom', sortOrder: 'asc' },
    { label: 'Classroom Z-A', sortBy: 'classroom', sortOrder: 'desc' },
    { label: 'Parent A-Z', sortBy: 'parent', sortOrder: 'asc' },
    { label: 'Parent Z-A', sortBy: 'parent', sortOrder: 'desc' },
    { label: 'Progress High-Low', sortBy: 'progress', sortOrder: 'desc' },
    { label: 'Status', sortBy: 'status', sortOrder: 'asc' },
  ];

  const filteredAndSortedStudents = useMemo(() =>
    sortItems(filteredStudents, sortBy, sortOrder, (s, key) => {
      if (key === 'classroom') return s.classroom.name;
      if (key === 'parent') return s.parent.name;
      if (key === 'status') return s.enrollmentStatus;
      if (key === 'progress') return s.enrollmentProgress;
      return `${s.firstName} ${s.lastName}`;
    }),
  [filteredStudents, sortBy, sortOrder]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedStudents,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ data: filteredAndSortedStudents });
  const completionRate = useMemo(() => {
    if (students.length === 0) return 0;
    const complete = students.filter(student => student.enrollmentStatus === 'Completed-AdminApproved').length;
    return Math.round(complete / students.length * 100);
  }, [students]);
  const getStatusBadgeVariant = (status: EnrollmentStatus): 'success' | 'secondary' | 'outline' | 'default' => {
    switch (status) {
      case 'Completed-AdminApproved':
        return 'success';
      case 'Completed-Pending Approval':
        return 'secondary';
      case 'Draft':
        return 'outline';
      default:
        return 'default';
    }
  };
  const toggleFilters = () => setShowFilters(prev => !prev);

  const activeFilterCount = useMemo(() => {
    return [formFilter, statusFilter, childStatusFilter, classroomFilter, yearFilter]
      .filter(arr => arr.length > 0).length;
  }, [formFilter, statusFilter, childStatusFilter, classroomFilter, yearFilter]);

  const clearAllFilters = () => {
    setFormFilter([]);
    setStatusFilter([]);
    setChildStatusFilter([]);
    setClassroomFilter([]);
    setYearFilter([]);
    setCurrentPage(1);
  };

  const handleStatusChange = async () => {
    if (!selectedStudent) return;

    try {
      setIsUpdatingStatus(true);
      await updateChildStatus(selectedStudent.id, newStatus);

      // Update local state
      setStudents(students.map(s =>
        s.id === selectedStudent.id ? { ...s, childStatus: newStatus } : s
      ));

      setIsStatusDialogOpen(false);
    } catch (error) {
      console.error('Error updating child status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleStudentSelectForForm = (studentId: string) => {
    setSelectedStudentsForForm(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };
  
  const handleAssignFormToStudents = () => {
    if (!selectedFormToAssign || selectedStudentsForForm.length === 0) return;
    
    console.log('Assigning form', selectedFormToAssign, 'to students', selectedStudentsForForm);
    
    setIsAssignFormDialogOpen(false);
    setSelectedStudentsForForm([]);
    setSelectedFormToAssign('');
    setAssignDialogClassroomFilter('all');
    setAssignDialogSearchTerm('');
  };
  const studentExportHeaders = [
    'Student Name', 'Classroom', 'Parent Name', 'Parent Email',
    'Secondary Parent', 'Secondary Parent Email',
    'Enrollment Status', 'Child Status', 'Forms Completed', 'Progress'
  ];
  const getStudentExportRows = () => filteredAndSortedStudents.map(s => [
    `${s.firstName} ${s.lastName}`,
    s.classroom.name, s.parent.name, s.parent.email,
    s.secondaryParent?.name ?? '', s.secondaryParent?.email ?? '',
    s.enrollmentStatus, s.childStatus,
    `${s.formsCompleted}/${s.totalForms}`, `${s.enrollmentProgress}%`
  ]);

  const exportToCSV = () => downloadCSV(
    `students_export_${new Date().toISOString().split('T')[0]}.csv`,
    studentExportHeaders, getStudentExportRows()
  );
  const exportToPDF = () => printAsPDF('Student Directory Export', studentExportHeaders, getStudentExportRows());

  if (loading) {
    return <PageLoader message="Loading student data..." Layout={AdminLayout} />;
  }
  return <AdminLayout>
      <div className="container mx-auto px-0 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 lg:space-y-8 min-h-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mt-14 animate-fade-in duration-200">
          <div className='px-3'>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Student Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage student enrollments and track progress
            </p>
          </div>

        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '0ms' }}>
            <StatCard label="Total Students" value={students.length} icon={GraduationCap} iconBgClass="bg-amazon-teal/10" iconColorClass="text-amazon-teal" className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm" />
          </div>
          <div className="animate-fade-in-up h-full" style={{ animationDelay: '40ms' }}>
            <StatCard
              label="Completion Rate"
              value={
                <div className="flex flex-col items-start gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums leading-none">
                    {completionRate}%
                  </span>
                  <div className="w-16 sm:w-20 lg:w-24">
                    <Progress value={completionRate} className="h-2" />
                  </div>
                </div>
              }
              icon={Users}
              iconBgClass="bg-green-100"
              iconColorClass="text-green-600"
              className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm"
            />
          </div>
          <div className="animate-fade-in-up h-full sm:col-span-2 lg:col-span-1" style={{ animationDelay: '80ms' }}>
            <StatCard
              label="Forms Pending"
              value={students.filter(s => s.enrollmentStatus !== 'Completed-AdminApproved').length}
              icon={AlertCircle}
              iconBgClass="bg-amber-100"
              iconColorClass="text-amber-600"
              className="h-full hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out shadow-sm"
            />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <CardContent className="p-0">
            <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Student Directory</h2>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {filteredAndSortedStudents.length} of {students.length} students
                  {classroomFilter.length > 0 && (
                    <span className="ml-2 text-amazon-teal">• {classroomFilter.length} classroom{classroomFilter.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search students..." 
                    className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                </div>
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <Button
                    variant="outline"
                    onClick={toggleFilters}
                    size="sm"
                    className="h-10 sm:h-11 rounded-xl bg-white text-[#0F2D52] border-2 border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200 relative flex-shrink-0"
                  >
                    {showFilters ? (
                      <><X className="h-4 w-4 mr-1 sm:mr-2" /><span className="hidden xs:inline">Hide </span>Filters</>
                    ) : (
                      <><Filter className="h-4 w-4 mr-1 sm:mr-2" />Filters</>
                    )}
                    {!showFilters && activeFilterCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white animate-pulse">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>

                  <SortDropdown
                    currentSortBy={sortBy}
                    currentSortOrder={sortOrder}
                    options={sortOptions}
                    labels={sortLabels}
                    onSort={(by, order) => { setSortBy(by); setSortOrder(order); }}
                  />

                  {selectedStudentsForBulkAction.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-10 sm:h-11 rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 flex-shrink-0">
                          <Download className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Export Selected ({selectedStudentsForBulkAction.length})</span>
                          <span className="sm:hidden">({selectedStudentsForBulkAction.length})</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          const selectedStudentObjects = students.filter(s => selectedStudentsForBulkAction.includes(s.id));
                          const headers = studentExportHeaders;
                          const rows = selectedStudentObjects.map(s => [
                            `${s.firstName} ${s.lastName}`,
                            s.classroom.name, s.parent.name, s.parent.email,
                            s.secondaryParent?.name ?? '', s.secondaryParent?.email ?? '',
                            s.enrollmentStatus, s.childStatus,
                            `${s.formsCompleted}/${s.totalForms}`, `${s.enrollmentProgress}%`
                          ]);
                          downloadCSV(
                            `selected_students_export_${new Date().toISOString().split('T')[0]}.csv`,
                            headers, rows
                          );
                        }}>
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const selectedStudentObjects = students.filter(s => selectedStudentsForBulkAction.includes(s.id));
                          const headers = studentExportHeaders;
                          const rows = selectedStudentObjects.map(s => [
                            `${s.firstName} ${s.lastName}`,
                            s.classroom.name, s.parent.name, s.parent.email,
                            s.secondaryParent?.name ?? '', s.secondaryParent?.email ?? '',
                            s.enrollmentStatus, s.childStatus,
                            `${s.formsCompleted}/${s.totalForms}`, `${s.enrollmentProgress}%`
                          ]);
                          printAsPDF('Selected Students Export', headers, rows);
                        }}>
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {selectedStudentsForBulkAction.length > 0 && (
                    <Button
                      onClick={() => {
                        setSelectedStudentsForTransfer(selectedStudentsForBulkAction);
                        const selectedStudentObjects = students.filter(s => selectedStudentsForBulkAction.includes(s.id));
                        if (selectedStudentObjects.length > 0) {
                          setBulkTransferFromGrade(selectedStudentObjects[0].classroom.id);
                        }
                        setIsBulkTransferDialogOpen(true);
                      }}
                      size="sm"
                      className="bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white rounded-xl h-10 sm:h-11 transition-all duration-200 flex-shrink-0"
                    >
                      <GraduationCap className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Transfer Selected ({selectedStudentsForBulkAction.length})</span>
                      <span className="sm:hidden">Transfer ({selectedStudentsForBulkAction.length})</span>
                    </Button>
                  )}

                  {filteredAndSortedStudents.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-10 sm:h-11 bg-white text-[#0F2D52] border-2 border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white rounded-xl transition-all duration-200 flex-shrink-0">
                          <Download className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Export All</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportToCSV}>Export as CSV</DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF}>Export as PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <div title="No records to export">
                      <Button size="sm" className="h-10 sm:h-11 rounded-xl flex-shrink-0" disabled>
                        <Download className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Export All</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="p-3 sm:p-4 bg-background rounded-xl border border-slate-100 space-y-3">
                  {activeFilterCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">
                        {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                      </span>
                      <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-10 sm:h-11 rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
                        <X className="h-4 w-4 mr-2" />
                        Clear All
                      </Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
                    <MultiSelectDropdown
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      options={[
                        'incomplete',
                        'completed'
                      ]}
                      placeholder="Select statuses"
                    />
                  </div>
                  
                  
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Child Status</label>
                    <MultiSelectDropdown
                      value={childStatusFilter}
                      onValueChange={setChildStatusFilter}
                      options={['active', 'archive']}
                      placeholder="Select child status"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Classroom</label>
                    <MultiSelectDropdown
                      value={classroomFilter}
                      onValueChange={setClassroomFilter}
                      options={allClassrooms}
                      placeholder="Select classrooms"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Year</label>
                    <MultiSelectDropdown
                      value={yearFilter}
                      onValueChange={setYearFilter}
                      options={Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => 
                        (new Date().getFullYear() - i).toString()
                      )}
                      placeholder="Select years"
                    />
                  </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table View (md+) */}
            <DataTable
              className="hidden md:block relative z-0"
              loading={loading}
              loadingMessage="Loading students..."
              emptyMessage="No students match the current filters."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAndSortedStudents.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { 
                  header: (
                    <Checkbox
                      checked={selectedStudentsForBulkAction.length === paginatedStudents.length && paginatedStudents.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudentsForBulkAction(paginatedStudents.map(s => s.id));
                        } else {
                          setSelectedStudentsForBulkAction([]);
                        }
                      }}
                    />
                  ), 
                  className: 'text-center w-[5%]' 
                },
                { header: 'Student', className: 'w-[22%]' },
                { header: 'Classroom', className: 'w-[14%]' },
                { header: 'Parent', className: 'w-[16%]' },
                { header: 'Status', className: 'text-center w-[14%]' },
                { header: 'Child Status', className: 'text-center w-[10%]' },
                { header: 'Actions', className: 'text-center w-[12%]' },
                { header: 'Progress', className: 'text-right w-[12%]' },
              ]}
              rows={paginatedStudents.map((student, index) => (
                <tr key={student.id || `row-${index}`} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-all duration-200 ease-in-out">
                  <td className="py-3 px-2 text-center">
                    <Checkbox
                      checked={selectedStudentsForBulkAction.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudentsForBulkAction(prev => [...prev, student.id]);
                        } else {
                          setSelectedStudentsForBulkAction(prev => prev.filter(id => id !== student.id));
                        }
                      }}
                    />
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center">
                      <AvatarInitials initials={`${student.firstName[0]}${student.lastName[0]}`} className="mr-2" />
                      <div className="min-w-0">
                        <Link 
                          to={`/admin/parents/${student.parent.id}?student=${encodeURIComponent(student.firstName + ' ' + student.lastName)}`} 
                          state={{ fromStudents: true }}
                          className="font-medium text-foreground hover:text-amazon-teal transition-colors hover:underline block truncate relative z-10"
                        >
                          {student.firstName.charAt(0).toUpperCase() + student.firstName.slice(1)} {student.lastName.charAt(0).toUpperCase() + student.lastName.slice(1)}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <Link to={`/admin/classrooms/${student.classroom.id}`} className="flex items-center text-cyan-600 hover:text-cyan-700 transition-colors group">
                      <School className="h-4 w-4 mr-1 group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="font-medium group-hover:underline truncate">{student.classroom.name}</span>
                    </Link>
                  </td>
                  <td className="py-3 px-2">
                    <div className="min-w-0 space-y-2">
                      <div>
                        <Link
                          to={`/admin/parents/${student.parent.id}`}
                          state={{ fromStudents: true }}
                          className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline transition-colors block truncate"
                        >
                          {student.parent.name}
                        </Link>
                        <div className="text-xs text-gray-500 truncate">{student.parent.email}</div>
                      </div>
                      {student.secondaryParent && (
                        <div className="border-t pt-2">
                          <Link
                            to={`/admin/parents/${student.secondaryParent.id}`}
                            state={{ fromStudents: true }}
                            className="text-cyan-600 hover:text-cyan-700 font-medium hover:underline transition-colors block truncate text-sm"
                          >
                            {student.secondaryParent.name}
                          </Link>
                          <div className="text-xs text-gray-500 truncate">{student.secondaryParent.email}</div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {(() => {
                      const apiFormStatus = student.formStatus || 'incomplete';
                      const displayStatus = apiFormStatus === 'incomplete' ? 'Incomplete' : apiFormStatus === 'complete' ? 'Complete' : apiFormStatus;
                      const statusVariant = apiFormStatus === 'complete' ? 'success' : apiFormStatus === 'incomplete' ? 'secondary' : 'outline';
                      const statusIcon = apiFormStatus === 'complete' ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />;
                      return (
                        <Badge variant={statusVariant as any} className="flex items-center justify-center w-fit mx-auto text-xs px-2 py-1">
                          {statusIcon}
                          <span className="truncate">{displayStatus}</span>
                        </Badge>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setNewStatus(student.childStatus);
                        setIsStatusDialogOpen(true);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                        student.childStatus === 'active'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{student.childStatus === 'active' ? 'Active' : 'Archived'}</span>
                      <Edit className="h-3 w-3 opacity-70" />
                    </button>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedStudentForForms(student);
                          loadFormsIfNeeded();
                          setIsStudentFormDialogOpen(true);
                        }}>
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Forms
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedStudentForTransfer(student);
                          setNewClassroomId('');
                          setIsTransferDialogOpen(true);
                        }}>
                          <School className="h-4 w-4 mr-2" />
                          Transfer Class
                        </DropdownMenuItem>
                        {student.enrollmentId && (
                          <DropdownMenuItem
                            disabled={downloadingEnrollmentId === student.enrollmentId}
                            onClick={() => handleDownloadAllForms(student.enrollmentId!)}
                          >
                            {downloadingEnrollmentId === student.enrollmentId
                              ? <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-amazon-teal border-t-transparent inline-block" />
                              : <Download className="h-4 w-4 mr-2" />}
                            Download All Forms
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="py-3 px-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-600 mb-1">{student.formsCompleted}/{student.totalForms}</div>
                      <div className="flex items-center justify-end space-x-1">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                          {student.totalForms > 0 && student.formsApproved > 0 && (
                            <div
                              className="h-full bg-green-500 transition-all"
                              style={{ width: `${(student.formsApproved / student.totalForms) * 100}%` }}
                            />
                          )}
                          {student.totalForms > 0 && student.formsInProgress > 0 && (
                            <div
                              className="h-full bg-amber-400 transition-all"
                              style={{ width: `${(student.formsInProgress / student.totalForms) * 100}%` }}
                            />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-foreground min-w-[28px]">{student.enrollmentProgress}%</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            />

            {/* Mobile Card View */}
            <MobileCardList
              className="md:hidden p-3 space-y-3"
              loading={loading}
              loadingMessage="Loading students..."
              emptyMessage="No students found matching your search criteria."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              gridClassName="space-y-3"
              cards={[
                <div key="select-all" className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedStudentsForBulkAction.length === paginatedStudents.length && paginatedStudents.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedStudentsForBulkAction(paginatedStudents.map(s => s.id));
                      } else {
                        setSelectedStudentsForBulkAction([]);
                      }
                    }}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>,
                ...paginatedStudents.map((student, index) => (
                  <div key={student.id || `card-${index}`} className="border rounded-lg p-3 sm:p-4 bg-card space-y-2 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedStudentsForBulkAction.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentsForBulkAction(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentsForBulkAction(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                          className="flex-shrink-0"
                        />
                        <AvatarInitials initials={`${student.firstName[0]}${student.lastName[0]}`} />
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/admin/parents/${student.parent.id}?student=${encodeURIComponent(student.firstName + ' ' + student.lastName)}`}
                            state={{ fromStudents: true }}
                            className="font-medium text-sm text-amazon-teal hover:underline block truncate"
                          >
                            {student.firstName.charAt(0).toUpperCase() + student.firstName.slice(1)} {student.lastName.charAt(0).toUpperCase() + student.lastName.slice(1)}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">{student.classroom.name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setNewStatus(student.childStatus);
                          setIsStatusDialogOpen(true);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                          student.childStatus === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{student.childStatus === 'active' ? 'Active' : 'Archived'}</span>
                        <Edit className="h-3 w-3 opacity-70" />
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Parent:</span>
                        <Link
                          to={`/admin/parents/${student.parent.id}`}
                          state={{ fromStudents: true }}
                          className="font-medium text-amazon-teal hover:underline truncate max-w-[60%] text-right"
                        >
                          {student.parent.name}
                        </Link>
                      </div>
                      {student.secondaryParent && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Secondary:</span>
                          <Link
                            to={`/admin/parents/${student.secondaryParent.id}`}
                            state={{ fromStudents: true }}
                            className="font-medium text-amazon-teal hover:underline truncate max-w-[60%] text-right"
                          >
                            {student.secondaryParent.name}
                          </Link>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium truncate max-w-[60%] text-right">
                          {(() => {
                            if (formFilter.length > 0) {
                              const selectedForm = student.assignedForms.find(form => formFilter.includes(form.name));
                              if (selectedForm) {
                                const normalizedStatus = normalizeFormStatus(selectedForm.status);
                                const displayStatus = normalizedStatus === 'Approved' ? 'Completed - Admin Approved' : normalizedStatus === 'In Progress' ? 'Completed - Pending Approval' : normalizedStatus;
                                const statusVariant = normalizedStatus === 'Approved' ? 'success' : normalizedStatus === 'In Progress' ? 'secondary' : 'outline';
                                return <Badge variant={statusVariant as any} className="text-xs">{displayStatus}</Badge>;
                              }
                              return <span className="text-muted-foreground">N/A</span>;
                            }
                            return <Badge variant={getStatusBadgeVariant(student.enrollmentStatus)} className="text-xs">{student.enrollmentStatus}</Badge>;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Forms:</span>
                        <span className="font-medium">{student.formsCompleted}/{student.totalForms}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Progress:</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                            {student.totalForms > 0 && student.formsApproved > 0 && (
                              <div className="h-full bg-green-500 transition-all" style={{ width: `${(student.formsApproved / student.totalForms) * 100}%` }} />
                            )}
                            {student.totalForms > 0 && student.formsInProgress > 0 && (
                              <div className="h-full bg-amber-400 transition-all" style={{ width: `${(student.formsInProgress / student.totalForms) * 100}%` }} />
                            )}
                          </div>
                          <span className="font-medium">{student.enrollmentProgress}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setSelectedStudentForForms(student); loadFormsIfNeeded(); setIsStudentFormDialogOpen(true); }}
                        className="w-full h-8 text-xs rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Manage Forms
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => { setSelectedStudentForTransfer(student); setNewClassroomId(''); setIsTransferDialogOpen(true); }}
                        className="w-full h-8 text-xs rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                      >
                        <School className="h-3 w-3 mr-1" />
                        Transfer Class
                      </Button>
                      {student.enrollmentId && (
                        <Button
                          variant="outline" size="sm"
                          disabled={downloadingEnrollmentId === student.enrollmentId}
                          onClick={() => handleDownloadAllForms(student.enrollmentId!)}
                          className="w-full h-8 text-xs rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                        >
                          {downloadingEnrollmentId === student.enrollmentId
                            ? <span className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-[#0F2D52] border-t-transparent inline-block" />
                            : <Download className="h-3 w-3 mr-1" />}
                          Download All Forms
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ]}
            />
          </CardContent>
        </div>
      </div>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Change Child Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4 text-sm text-slate-500">
              Change status for <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong> to:
            </p>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'active' | 'archive')}>
              <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              disabled={isUpdatingStatus}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={isUpdatingStatus}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold"
            >
              {isUpdatingStatus ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignFormDialogOpen} onOpenChange={setIsAssignFormDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Assign Form to Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Form</label>
              <Select value={selectedFormToAssign} onValueChange={setSelectedFormToAssign}>
                <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                  <SelectValue placeholder="Choose a form to assign" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                  {availableForms.map(form => (
                    <SelectItem key={form.id} value={form.id}>
                      {form.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by student name..."
                    value={assignDialogSearchTerm}
                    onChange={(e) => setAssignDialogSearchTerm(e.target.value)}
                    className="pl-10 h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Filter by Classroom</label>
                <Select value={assignDialogClassroomFilter} onValueChange={setAssignDialogClassroomFilter}>
                  <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <SelectValue placeholder="All Classrooms" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                    <SelectItem value="all">All Classrooms</SelectItem>
                    {allClassrooms.map(classroom => (
                      <SelectItem key={classroom} value={classroom}>
                        {classroom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Students ({selectedStudentsForForm.length} selected)
              </label>
              <div className="border border-slate-100 rounded-xl max-h-60 overflow-y-auto">
                {filteredAndSortedStudents.filter(student => {
                  const matchesClassroom = assignDialogClassroomFilter === 'all' || student.classroom.name === assignDialogClassroomFilter;
                  const matchesSearch = assignDialogSearchTerm === '' || 
                    `${student.firstName} ${student.lastName}`.toLowerCase().includes(assignDialogSearchTerm.toLowerCase());
                  return matchesClassroom && matchesSearch;
                }).map((student) => (
                  <div key={student.id} className="flex items-center space-x-3 p-3 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50">
                    <Checkbox
                      checked={selectedStudentsForForm.includes(student.id)}
                      onCheckedChange={() => handleStudentSelectForForm(student.id)}
                    />
                    <AvatarInitials initials={`${student.firstName[0]}${student.lastName[0]}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">{student.firstName} {student.lastName}</div>
                      <div className="text-xs text-slate-400">
                        {student.classroom.name} • {student.parent.name}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAndSortedStudents.filter(student => {
                  const matchesClassroom = assignDialogClassroomFilter === 'all' || student.classroom.name === assignDialogClassroomFilter;
                  const matchesSearch = assignDialogSearchTerm === '' || 
                    `${student.firstName} ${student.lastName}`.toLowerCase().includes(assignDialogSearchTerm.toLowerCase());
                  return matchesClassroom && matchesSearch;
                }).length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No students found matching your criteria.
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsAssignFormDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <Button 
              onClick={handleAssignFormToStudents} 
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold"
              disabled={!selectedFormToAssign || selectedStudentsForForm.length === 0}
            >
              Assign Form ({selectedStudentsForForm.length} students)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStudentFormDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsStudentFormDialogOpen(false);
          setSelectedFormsToAdd([]);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-lg">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <AvatarInitials initials={`${selectedStudentForForms?.firstName[0] ?? ''}${selectedStudentForForms?.lastName[0] ?? ''}`} size="lg" />
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900">
                  {selectedStudentForForms?.firstName} {selectedStudentForForms?.lastName}
                </DialogTitle>
                <p className="text-sm text-slate-500">
                  {selectedStudentForForms?.classroom.name} • {selectedStudentForForms?.parent.name}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 overflow-y-auto max-h-[60vh]">
            {/* Currently Assigned Forms */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Assigned Forms</h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedStudentForForms?.assignedForms?.length || 0} forms
                </Badge>
              </div>
              
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {selectedStudentForForms?.assignedForms && selectedStudentForForms.assignedForms.length > 0 ? (
                  selectedStudentForForms.assignedForms.map((form, index) => {
                    const normalizedStatus = normalizeFormStatus(form.status);
                    const statusVariant = normalizedStatus === 'Approved' ? 'success' : 
                                        normalizedStatus === 'In Progress' ? 'secondary' : 'outline';
                    const statusIcon = normalizedStatus === 'Approved' ? 
                      <CheckCircle className="h-3 w-3" /> : 
                      normalizedStatus === 'In Progress' ? 
                      <Clock className="h-3 w-3" /> : 
                      <AlertCircle className="h-3 w-3" />;
                    

                    
                    return (
                      <div key={form.id} className={`flex items-center justify-between p-3 hover:bg-gray-50 transition-colors ${
                        index !== selectedStudentForForms.assignedForms.length - 1 ? 'border-b' : ''
                      }`}>
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-amazon-teal flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{form.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                Assigned: {form.assignedAt || 'No date'}
                              </span>

                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={statusVariant as any} className="flex items-center gap-1 text-xs flex-shrink-0">
                            {statusIcon}
                            {normalizedStatus}
                          </Badge>

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium text-sm">No forms assigned</p>
                        <p className="text-xs text-muted-foreground">Add forms from the available list</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add New Forms */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Available Forms</h3>
                <Badge variant="outline" className="text-xs">
                  {selectedFormsToAdd.length} selected
                </Badge>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {availableForms.filter(form => 
                  !selectedStudentForForms?.assignedForms.some(assigned => assigned.name === form.name)
                ).length > 0 ? (
                  availableForms.filter(form => 
                    !selectedStudentForForms?.assignedForms.some(assigned => assigned.name === form.name)
                  ).map((form) => {
                    const isInactive = form.status === 'inactive';
                    return (
                      <Card key={form.id} className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                        isInactive ? 'opacity-60 cursor-not-allowed' : selectedFormsToAdd.includes(form.id) ? 'ring-2 ring-amazon-teal bg-amazon-teal/5' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center space-x-3"
                             onClick={() => {
                               if (isInactive) return;
                               if (selectedFormsToAdd.includes(form.id)) {
                                 setSelectedFormsToAdd(prev => prev.filter(id => id !== form.id));
                               } else {
                                 setSelectedFormsToAdd(prev => [...prev, form.id]);
                               }
                             }}>
                          <Checkbox
                            checked={selectedFormsToAdd.includes(form.id)}
                            onChange={() => { /* noop */ }}
                            className="pointer-events-none"
                            disabled={isInactive}
                          />
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{form.name}</h4>
                            <p className="text-xs text-muted-foreground">Click to select</p>
                          </div>
                          {isInactive && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="p-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="p-3 bg-green-100 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">All forms assigned</p>
                        <p className="text-xs text-muted-foreground">This student has all available forms</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-slate-500">
                {selectedFormsToAdd.length > 0 && (
                  <span>{selectedFormsToAdd.length} form{selectedFormsToAdd.length !== 1 ? 's' : ''} selected</span>
                )}
              </div>
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsStudentFormDialogOpen(false);
                    setSelectedFormsToAdd([]);
                  }}
                  className="h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    if (selectedFormsToAdd.length > 0 && selectedStudentForForms) {
                      try {
                        // const user = await fetchUserContext();
                        if (!selectedStudentForForms.enrollmentId) {
                          console.error('No enrollment ID found for student');
                          return;
                        }
                        
                        const assignments = selectedFormsToAdd.map(formId => ({
                          enrollment_id: selectedStudentForForms.enrollmentId!,
                          child_id: selectedStudentForForms.id,
                          form_template_id: formId,
                          is_required: true
                        }));
                        
                        await assignFormsToStudent(schoolId || '', assignments);
                        setIsStudentFormDialogOpen(false);
                        setSelectedFormsToAdd([]);
                        await loadStudentData(true);
                      } catch (error) {
                        console.error('Error assigning forms:', error);
                      }
                    }

                  }}
                  className="h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold"
                  disabled={selectedFormsToAdd.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Forms ({selectedFormsToAdd.length})
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Transfer Student to New Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="font-medium">{selectedStudentForTransfer?.firstName} {selectedStudentForTransfer?.lastName}</div>
              <div className="text-sm text-slate-500">Current: {selectedStudentForTransfer?.classroom.name}</div>
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">New Classroom</label>
              <Select value={newClassroomId} onValueChange={setNewClassroomId}>
                <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                  <SelectValue placeholder="Select new classroom" />
                </SelectTrigger>
                <SelectContent>
                  {availableClassrooms
                    .filter(classroom => classroom.id !== selectedStudentForTransfer?.classroom.id)
                    .map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            

          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedStudentForTransfer || !newClassroomId) return;
                try {
                  setIsTransferring(true);
                  if (!selectedStudentForTransfer.enrollmentId) {
                    console.error('No enrollment ID found');
                    return;
                  }
                  
                  await promoteStudent(
                    selectedStudentForTransfer.enrollmentId,
                    newClassroomId,
                    'Age progression to new class',
                    new Date().toISOString()
                  );
                  
                  setIsTransferDialogOpen(false);
                  showToast('success', 'Student transferred successfully!');
                  await loadStudentData(true);
                } catch (error) {
                  console.error('Error transferring student:', error);
                  showToast('error', 'Error transferring student. Please try again.');
                } finally {
                  setIsTransferring(false);
                }
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold"
              disabled={!newClassroomId || isTransferring}
            >
              {isTransferring ? 'Transferring...' : 'Transfer Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkTransferDialogOpen} onOpenChange={setIsBulkTransferDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-lg" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Bulk Grade Transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">From Grade/Class</label>
                <Select value={bulkTransferFromGrade} onValueChange={setBulkTransferFromGrade} disabled={selectedStudentsForTransfer.length > 0}>
                  <SelectTrigger className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${selectedStudentsForTransfer.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Select current grade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                    {availableClassrooms.map(classroom => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">To Grade/Class</label>
                <Select value={bulkTransferToGrade} onValueChange={setBulkTransferToGrade}>
                  <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                    <SelectValue placeholder="Select target grade" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                    {availableClassrooms
                      .filter(classroom => classroom.id !== bulkTransferFromGrade)
                      .map(classroom => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {bulkTransferFromGrade && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select Students to Transfer ({selectedStudentsForTransfer.length} selected)
                </label>
                <div className="border border-slate-100 rounded-xl max-h-80 overflow-y-auto">
                  {(selectedStudentsForTransfer.length > 0 
                    ? students.filter(student => selectedStudentsForTransfer.includes(student.id))
                    : students.filter(student => student.classroom.id === bulkTransferFromGrade)
                  ).map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
                      {selectedStudentsForTransfer.length === 0 && (
                        <Checkbox
                          checked={selectedStudentsForTransfer.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudentsForTransfer(prev => [...prev, student.id]);
                            } else {
                              setSelectedStudentsForTransfer(prev => prev.filter(id => id !== student.id));
                            }
                          }}
                        />
                      )}
                      <AvatarInitials initials={`${student.firstName[0]}${student.lastName[0]}`} />
                      <div className="flex-1">
                        <div className="font-medium">{student.firstName} {student.lastName}</div>
                        <div className="text-sm text-slate-500">
                          {student.parent.name} • Progress: {student.enrollmentProgress}%
                        </div>
                      </div>
                      <Badge variant={student.enrollmentStatus === 'Completed-AdminApproved' ? 'success' : 'secondary'} className="text-xs">
                        {student.enrollmentStatus}
                      </Badge>
                    </div>
                  ))}
                  {(selectedStudentsForTransfer.length > 0 
                    ? students.filter(student => selectedStudentsForTransfer.includes(student.id))
                    : students.filter(student => student.classroom.id === bulkTransferFromGrade)
                  ).length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No students found in selected grade/class.
                    </div>
                  )}
                </div>
                
                 {selectedStudentsForTransfer.length === 0 && students.filter(student => student.classroom.id === bulkTransferFromGrade).length > 0 && (
                  <div className="flex justify-between items-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allStudentIds = students
                          .filter(student => student.classroom.id === bulkTransferFromGrade)
                          .map(student => student.id);
                        setSelectedStudentsForTransfer(allStudentIds);
                      }}
                      className="rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStudentsForTransfer([])}
                      className="rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => {
              setIsBulkTransferDialogOpen(false);
              setSelectedStudentsForTransfer([]);
              setBulkTransferFromGrade('');
              setBulkTransferToGrade('');
              setSelectedStudentsForBulkAction([]);
            }} className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!bulkTransferToGrade || selectedStudentsForTransfer.length === 0) return;
                try {
                  // const user = await fetchUserContext();
                  
                  // Prepare promotions array
                  const promotions = selectedStudentsForTransfer.map(studentId => {
                    const student = students.find(s => s.id === studentId);
                    return {
                      enrollment_id: student?.enrollmentId || '',
                      to_classroom_id: bulkTransferToGrade,
                      reason: 'Bulk transfer to new class',
                      effective_date: new Date().toISOString()
                    };
                  }).filter(p => p.enrollment_id);
                  
                  // Use bulk promotion API
                  await bulkPromoteStudents(schoolId || '', promotions);
                  
                  // Show success message
                  showToast('success', `Successfully transferred ${selectedStudentsForTransfer.length} students!`);
                  
                  setIsBulkTransferDialogOpen(false);
                  setSelectedStudentsForTransfer([]);
                  setBulkTransferFromGrade('');
                  setBulkTransferToGrade('');
                  setSelectedStudentsForBulkAction([]);
                  await loadStudentData(true);
                } catch (error) {
                  console.error('Error in bulk transfer:', error);
                  showToast('error', 'Error transferring students. Please try again.');
                }
              }}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200 font-semibold"
              disabled={!bulkTransferToGrade || selectedStudentsForTransfer.length === 0}
            >
              Transfer {selectedStudentsForTransfer.length} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
}