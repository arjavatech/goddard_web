import React, { useEffect, useMemo, useState, Children } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, GraduationCap, School, Users, FileText, CheckCircle, Clock, AlertCircle, Filter, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassrooms } from '../../services/api/admin';
import { authedFetch, z } from '../../services/api/common';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { COMPLETION_STATUSES, normalizeFormStatus } from '../../lib/formStatus';

type EnrollmentStatus = 'Complete' | 'In Progress' | 'Not Started';

interface EnrollmentData {
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  class_name: string;
  primary_email: string;
  form_status: string;
  forms: Record<string, string>;
  additional_parent_email?: string | null;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    let isMounted = true;
    const loadStudentData = async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) {
          console.warn('No school ID found for user');
          setStudents([]);
          return;
        }
        const [enrollmentData, classrooms, templates] = await Promise.all([
          authedFetch({ method: 'GET', url: `/enrollments?school_id=${encodeURIComponent(user.schoolId)}` }, z.any()),
          fetchClassrooms(user.schoolId),
          fetchFormTemplates(user.schoolId)
        ]);
        
        const enrollments = enrollmentData.enrollments || [];
        if (!isMounted) return;
        console.log('Setting students with data from API');
        console.log('API Response - Enrollments:', enrollments);
        console.log('API Response - Classrooms:', classrooms);
        console.log('API Response - Templates:', templates);
        if (!enrollments || enrollments.length === 0) {
          console.log('No enrollments found');
          setStudents([]);
          return;
        }
        const classroomMap = new Map(classrooms.map(cls => [cls.name?.toLowerCase(), cls]));
        const templateMap = new Map(templates.map(template => [template.id, template]));
        const mappedStudents: Student[] = enrollments.map((enrollment: EnrollmentData, index: number) => {
          console.log('Processing enrollment:', enrollment);
          const studentId = enrollment.child_id || `student-${index}`;
          const firstName = enrollment.child_first_name || 'Unknown';
          const lastName = enrollment.child_last_name || 'Student';
          
          // Since forms is empty object, create default form status
          const formsArray = Object.keys(enrollment.forms || {}).length > 0 
            ? Object.entries(enrollment.forms).map(([key, value]) => ({
                id: key,
                name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                status: value || 'Not Started'
              }))
            : [{ id: 'default', name: 'Enrollment Form', status: enrollment.form_status || 'active' }];
          
          const completed = formsArray.filter(form => 
            form.status === 'completed' || form.status === 'active'
          ).length;
          const total = Math.max(formsArray.length, 1);
          const progress = enrollment.form_status === 'active' ? 50 : 0;
          
          const classroomName = enrollment.class_name;
          const classroom = classroomName ? classroomMap.get(classroomName.toLowerCase()) : null;
          
          const parentEmail = enrollment.primary_email || 'parent@example.com';
          const parentName = parentEmail.split('@')[0].replace(/[._+]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          
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
              id: classroom?.id || 'unassigned',
              name: classroomName || 'Unassigned'
            },
            parent: {
              id: parentEmail,
              name: parentName,
              email: parentEmail
            },
            assignedForms: formsArray
          };
          return student;
        });
        console.log('Final mapped students:', mappedStudents);
        if (mappedStudents.length > 0) {
          setStudents(mappedStudents);
        }
      } catch (error) {
        console.error('Failed to load student management data:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('Loading complete, students count:', students.length);
        }
      }
    };
    loadStudentData();
    return () => {
      isMounted = false;
    };
  }, []);
  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesSearch = `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) || student.parent.email.toLowerCase().includes(searchQuery.toLowerCase()) || student.classroom.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.enrollmentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }), [students, searchQuery, statusFilter]);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            Student Management
          </h1>
          <Button variant="outline" onClick={toggleFilters} className="flex items-center">
            {showFilters ? <>
                <X className="h-4 w-4 mr-2" /> Hide Filters
              </> : <>
                <Filter className="h-4 w-4 mr-2" /> Show Filters
              </>}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <GraduationCap className="h-12 w-12 text-amazon-teal mr-4" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Students
                  </p>
                  <p className="text-3xl font-bold">{students.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-12 w-12 text-amazon-teal mr-4" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Completion Rate
                  </p>
                  <p className="text-3xl font-bold">{completionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Forms Pending</p>
                  <p className="text-3xl font-bold">
                    {students.filter(student => student.enrollmentStatus !== 'Complete').length}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search students by name, parent, or classroom..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              {showFilters && <div className="w-full md:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Not Started">Not Started</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Classroom
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Parent
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-600">
                      Forms
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? filteredStudents.map((student, index) => <tr key={student.id || `row-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-3">
                              {student.firstName.charAt(0)}
                              {student.lastName.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                DOB:{' '}
                                {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '2019-06-18 (test)'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={`/admin/classrooms/${student.classroom.id}`} className="flex items-center text-amazon-teal hover:underline">
                            <School className="h-4 w-4 mr-1 text-gray-500" />
                            {student.classroom.name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Link to={`/admin/parents/${student.parent.id}`} className="text-amazon-teal hover:underline">
                            {student.parent.name}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {student.parent.email}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getStatusBadgeVariant(student.enrollmentStatus)} className="flex items-center w-fit mx-auto">
                            {getStatusIcon(student.enrollmentStatus)}
                            <span className="ml-1">
                              {student.enrollmentStatus}
                            </span>
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <FileText className="h-4 w-4 mr-1 text-gray-500" />
                            <span>
                              {student.formsCompleted} / {student.totalForms}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
                            {student.assignedForms.slice(0, 2).map((form, index) => <Badge key={`${student.id}-form-${form.id}-${index}`} variant="secondary" className="text-xs">
                                  {form.name}
                                </Badge>)}
                            {student.assignedForms.length > 2 && <Badge key={`${student.id}-more-forms`} variant="outline" className="text-xs">
                                +{student.assignedForms.length - 2} more
                              </Badge>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end">
                            <div className="w-32 mr-2">
                              <Progress value={student.enrollmentProgress} className="h-2" />
                            </div>
                            <span className="text-sm font-medium w-8 text-right">
                              {student.enrollmentProgress}%
                            </span>
                          </div>
                        </td>
                      </tr>) : <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No students found matching your search criteria.
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
}