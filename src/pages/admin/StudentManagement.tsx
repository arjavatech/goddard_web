import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, GraduationCap, School, Users, FileText, CheckCircle, Clock, AlertCircle, Filter, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { fetchUserContext } from '../../services/api/user';

import { normalizeFormStatus } from '../../lib/formStatus';
import { fetchStudentEnrollments, updateChildStatus } from '@/services/api/admin';

type EnrollmentStatus = 'Complete' | 'In Progress' | 'Not Started';

interface EnrollmentData {
  parent_id: string;
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  class_name: string;
  primary_email: string;
  form_status: string;
  forms: Record<string, string>;
  additional_parent_email?: string | null;
  child_status?: string;
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  enrollmentProgress: number;
  enrollmentStatus: EnrollmentStatus;
  formsCompleted: number;
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
  assignedForms: {
    id: string;
    name: string;
    status: string;
  }[];
  childStatus: 'active' | 'archive';
}
export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const statusFromProgress = (progress: number): EnrollmentStatus => {
    if (progress === 100) return 'Complete';
    if (progress > 0) return 'In Progress';
    return 'Not Started';
  };
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [childStatusFilter, setChildStatusFilter] = useState<string>('all');
  const [classroomFilter, setClassroomFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newStatus, setNewStatus] = useState<'active' | 'archive'>('active');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Reset status filter when form filter changes
  const handleFormFilterChange = (value: string) => {
    setFormFilter(value);
    setStatusFilter('all'); // Reset status filter to avoid incompatible values
  };
  useEffect(() => {
    let isMounted = true;
    const loadStudentData = async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) {
          setStudents([]);
          return;
        }
        const enrollmentData = await fetchStudentEnrollments(user.schoolId);
        
        const enrollments = enrollmentData.enrollments || [];
        if (!isMounted) return;
        if (!enrollments || enrollments.length === 0) {
          setStudents([]);
          return;
        }
        const mappedStudents: Student[] = enrollments.map((enrollment: EnrollmentData, index: number) => {
          const studentId = enrollment.child_id || `student-${index}`;
          const firstName = enrollment.child_first_name || 'Unknown';
          const lastName = enrollment.child_last_name || 'Student';

          // Map forms from API response
          const formsArray = Object.keys(enrollment.forms || {}).length > 0
            ? Object.entries(enrollment.forms).map(([key, value]) => ({
                id: key,
                name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                status: value || 'Not Started'
              }))
            : [];

          // Count forms with 'approved' status as completed
          const completed = formsArray.filter(form => {
            const normalized = normalizeFormStatus(form.status);
            return normalized === 'Approved';
          }).length;

          const total = formsArray.length;

          // Calculate progress based on completed forms
          const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

          const classroomName = enrollment.class_name;

          const parentEmail = enrollment.primary_email || 'parent@example.com';
          const parentName = parentEmail.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const parentId = enrollment.parent_id;

          const student = {
            id: studentId,
            firstName,
            lastName,
            dateOfBirth: undefined, // API doesn't provide DOB
            enrollmentProgress: progress,
            enrollmentStatus: statusFromProgress(progress),
            formsCompleted: completed,
            totalForms: total,
            classroom: {
              id: 'unassigned',
              name: classroomName || 'Unassigned'
            },
            parent: {
              id: parentId,
              name: parentName,
              email: parentEmail
            },
            assignedForms: formsArray,
            childStatus: (enrollment.child_status || 'active') as 'active' | 'archive'
          };
          return student;
        });
        if (mappedStudents.length > 0) {
          setStudents(mappedStudents);
        }
      } catch (error) {
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadStudentData();
    return () => {
      isMounted = false;
    };
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

  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || student.parent.email.toLowerCase().includes(searchQuery.toLowerCase()) || student.classroom.name.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by form - only show students who have the selected form
    const matchesForm = formFilter === 'all' || student.assignedForms.some(form => form.name === formFilter);

    // Filter by status - if a form is selected, filter by that form's status; otherwise by overall enrollment status
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (formFilter === 'all') {
        // Overall enrollment status
        matchesStatus = student.enrollmentStatus === statusFilter;
      } else {
        // Specific form status
        const selectedForm = student.assignedForms.find(form => form.name === formFilter);
        if (selectedForm) {
          const normalizedStatus = normalizeFormStatus(selectedForm.status);
          // "Incomplete" filter should match both "incomplete" and "draft" statuses
          if (statusFilter.toLowerCase() === 'incomplete') {
            matchesStatus = normalizedStatus.toLowerCase() === 'incomplete' ||
                           selectedForm.status.toLowerCase() === 'draft' ||
                           normalizedStatus.toLowerCase() === 'draft';
          } else {
            matchesStatus = normalizedStatus.toLowerCase() === statusFilter.toLowerCase();
          }
        } else {
          matchesStatus = false;
        }
      }
    }

    // Filter by child status
    const matchesChildStatus = childStatusFilter === 'all' || student.childStatus === childStatusFilter;

    // Filter by classroom
    const matchesClassroom = classroomFilter === 'all' || student.classroom.name === classroomFilter;

    return matchesSearch && matchesForm && matchesStatus && matchesChildStatus && matchesClassroom;
  }), [students, searchQuery, formFilter, statusFilter, childStatusFilter, classroomFilter]);
  const completionRate = useMemo(() => {
    if (students.length === 0) return 0;
    const complete = students.filter(student => student.enrollmentStatus === 'Complete').length;
    return Math.round(complete / students.length * 100);
  }, [students]);
  const getStatusBadgeVariant = (status: EnrollmentStatus): 'success' | 'secondary' | 'outline' | 'default' => {
    switch (status) {
      case 'Complete':
        return 'success';
      case 'In Progress':
        return 'secondary';
      case 'Not Started':
        return 'outline';
      default:
        return 'default';
    }
  };
  const getStatusIcon = (status: EnrollmentStatus) => {
    switch (status) {
      case 'Complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'Not Started':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };
  const toggleFilters = () => setShowFilters(prev => !prev);

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
  if (loading) {
    return <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading student data...</p>
          </div>
        </div>
      </AdminLayout>;
  }
  return <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Student Management
            </h1>
            <p className="text-muted-foreground">
              Manage student enrollments and track progress
            </p>
          </div>
          <Button variant="outline" onClick={toggleFilters} className="flex items-center gap-2 self-start sm:self-center">
            {showFilters ? (
              <>
                <X className="h-4 w-4" /> Hide Filters
              </>
            ) : (
              <>
                <Filter className="h-4 w-4" /> Show Filters
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold text-foreground">{students.length}</p>
                </div>
                <div className="p-3 bg-amazon-teal/10 rounded-full">
                  <GraduationCap className="h-6 w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Completion Rate
                  </p>
                  <p className="text-3xl font-bold text-foreground">{completionRate}%</p>
                  <div className="w-24 mt-2">
                    <Progress value={completionRate} className="h-2" />
                  </div>
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
                    Forms Pending
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {students.filter(student => student.enrollmentStatus !== 'Complete').length}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 rounded-full">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="glass-card">
          <CardContent className="p-0">
            <div className="p-6 border-b bg-muted/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Student Directory</h2>
                <div className="text-sm text-muted-foreground">
                  {filteredStudents.length} of {students.length} students
                  {classroomFilter !== 'all' && (
                    <span className="ml-2 text-amazon-teal">• {classroomFilter}</span>
                  )}
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input 
                  placeholder="Search students by name, parent, or classroom..." 
                  className="pl-10 h-11 bg-background" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background rounded-lg border">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Form Type</label>
                    <Select value={formFilter} onValueChange={handleFormFilterChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by form" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Forms</SelectItem>
                        {allFormNames.map(formName => (
                          <SelectItem key={formName} value={formName}>
                            {formName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {formFilter === 'all' ? (
                          <>
                            <SelectItem value="Complete">Complete</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Submitted">Submitted</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Needs Revision">Needs Revision</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Incomplete">Incomplete</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Child Status</label>
                    <Select value={childStatusFilter} onValueChange={setChildStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Child Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Children</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archive">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Classroom</label>
                    <Select value={classroomFilter} onValueChange={setClassroomFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by classroom" />
                      </SelectTrigger>
                      <SelectContent>
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
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="text-left py-4 px-4 font-semibold text-foreground w-[280px]">
                        Student
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground w-[160px]">
                        Classroom
                      </th>
                      <th className="text-left py-4 px-4 font-semibold text-foreground w-[240px]">
                        Parent
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-foreground w-[140px]">
                        Status
                      </th>
                      <th className="text-center py-4 px-4 font-semibold text-foreground w-[120px]">
                        Child Status
                      </th>
                      <th className="text-right py-4 px-4 font-semibold text-foreground w-[200px]">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length > 0 ? filteredStudents.map((student, index) => (
                      <tr key={student.id || `row-${index}`} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-sm shadow-sm flex-shrink-0">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground truncate">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground truncate">
                                ID: {student.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <Link to={`/admin/classrooms/${student.classroom.id}`} className="flex items-center text-amazon-teal hover:text-amazon-teal/80 transition-colors group">
                            <School className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform flex-shrink-0" />
                            <span className="font-medium group-hover:underline truncate">{student.classroom.name}</span>
                          </Link>
                        </td>
                        <td className="py-4 px-4">
                          <div className="min-w-0">
                            <Link to={`/admin/parents/${student.parent.id}`} className="text-amazon-teal hover:text-amazon-teal/80 font-medium hover:underline transition-colors block truncate">
                              {student.parent.name}
                            </Link>
                            <div className="text-sm text-muted-foreground mt-1 truncate">
                              {student.parent.email}
                            </div>
                          </div>
                        </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex justify-center">
                          {(() => {
                            if (formFilter !== 'all') {
                              const selectedForm = student.assignedForms.find(form => form.name === formFilter);
                              if (selectedForm) {
                                const normalizedStatus = normalizeFormStatus(selectedForm.status);
                                const displayStatus = selectedForm.status.toLowerCase() === 'draft' ? 'Incomplete' : normalizedStatus;
                                const statusVariant = displayStatus === 'Approved' ? 'success' : displayStatus === 'In Progress' ? 'secondary' : 'outline';
                                const statusIcon = displayStatus === 'Approved' ? <CheckCircle className="h-3 w-3" /> : displayStatus === 'In Progress' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />;
                                return (
                                  <Badge variant={statusVariant as any} className="flex items-center gap-1 text-xs px-2 py-1">
                                    {statusIcon}
                                    <span className="truncate max-w-[80px]">{displayStatus}</span>
                                  </Badge>
                                );
                              }
                              return <span className="text-muted-foreground text-sm">N/A</span>;
                            }
                            const statusIcon = student.enrollmentStatus === 'Complete' ? <CheckCircle className="h-3 w-3" /> : student.enrollmentStatus === 'In Progress' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />;
                            return (
                              <Badge variant={getStatusBadgeVariant(student.enrollmentStatus)} className="flex items-center gap-1 text-xs px-2 py-1">
                                {statusIcon}
                                <span className="truncate max-w-[80px]">{student.enrollmentStatus}</span>
                              </Badge>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setNewStatus(student.childStatus);
                            setIsStatusDialogOpen(true);
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                            student.childStatus === 'active'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {student.childStatus === 'active' ? 'Active' : 'Archived'}
                        </button>
                      </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end space-x-2">
                            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded whitespace-nowrap">
                              <FileText className="h-3 w-3 mr-1" />
                              {student.formsCompleted}/{student.totalForms}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Progress value={student.enrollmentProgress} className="w-16 h-2" />
                              <span className="text-xs font-semibold w-8 text-right text-foreground">
                                {student.enrollmentProgress}%
                              </span>
                            </div>
                          </div>
                        </td>
                    </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <GraduationCap className="h-12 w-12 text-muted-foreground/50" />
                            <div className="text-muted-foreground">
                              <p className="font-medium">No students found</p>
                              <p className="text-sm">Try adjusting your search criteria</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 p-4">
              {filteredStudents.length > 0 ? filteredStudents.map((student, index) => (
                <Card key={student.id || `card-${index}`} className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-xs">
                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {student.firstName} {student.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.classroom.name}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudent(student);
                        setNewStatus(student.childStatus);
                        setIsStatusDialogOpen(true);
                      }}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.childStatus === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {student.childStatus === 'active' ? 'Active' : 'Archived'}
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Parent:</span>
                      <Link to={`/admin/parents/${student.parent.id}`} className="text-xs text-amazon-teal hover:underline">
                        {student.parent.name}
                      </Link>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {(() => {
                        if (formFilter !== 'all') {
                          const selectedForm = student.assignedForms.find(form => form.name === formFilter);
                          if (selectedForm) {
                            const normalizedStatus = normalizeFormStatus(selectedForm.status);
                            const displayStatus = selectedForm.status.toLowerCase() === 'draft' ? 'Incomplete' : normalizedStatus;
                            const statusVariant = displayStatus === 'Approved' ? 'success' : displayStatus === 'In Progress' ? 'secondary' : 'outline';
                            return <Badge variant={statusVariant as any} className="text-xs px-1.5 py-0.5">{displayStatus}</Badge>;
                          }
                          return <span className="text-muted-foreground text-xs">N/A</span>;
                        }
                        return <Badge variant={getStatusBadgeVariant(student.enrollmentStatus)} className="text-xs px-1.5 py-0.5">{student.enrollmentStatus}</Badge>;
                      })()}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Forms:</span>
                      <span className="text-xs">{student.formsCompleted}/{student.totalForms}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Progress:</span>
                      <div className="flex items-center space-x-1.5">
                        <Progress value={student.enrollmentProgress} className="w-12 h-1.5" />
                        <span className="text-xs font-medium">{student.enrollmentProgress}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No students found matching your search criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Status Change Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Child Status</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Change status for <strong>{selectedStudent?.firstName} {selectedStudent?.lastName}</strong> to:
            </p>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'active' | 'archive')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)} disabled={isUpdatingStatus}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={isUpdatingStatus} className="bg-amazon-teal hover:bg-amazon-teal/90">
              {isUpdatingStatus ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}