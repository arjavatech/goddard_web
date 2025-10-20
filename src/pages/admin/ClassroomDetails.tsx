import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, FileText, Search, Users, UserPlus, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link, useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassrooms, fetchClassEnrollmentStats, fetchSchoolEnrollments, renameClassroom, fetchClassBasedEnrollments, type ClassBasedEnrollment } from '../../services/api/admin';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';
interface Form {
  id: string;
  name: string;
  status: 'Default' | 'Active' | 'Inactive' | 'Archive';
}
interface Student {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentProgress: number;
  enrollmentStatus: 'Complete' | 'In Progress' | 'Not Started';
  formsCompleted: number;
  totalForms: number;
  parent: {
    id: string;
    name: string;
    email: string;
  };
}

function inferFormStatus(value: string | null | undefined): Form['status'] {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('default')) return 'Default';
  if (normalized.includes('inactive')) return 'Inactive';
  if (normalized.includes('archive')) return 'Archive';
  return 'Active';
}
function formsFromRecord(record: Record<string, string | null>): Form[] {
  return Object.entries(record).map(([formId, formName]) => ({
    id: formId,
    name: formName || 'Unnamed Form',
    status: 'Active' as Form['status']
  }));
}
function friendlyNameFromEmail(email: string): string {
  const local = email.split('@')[0];
  return local.replace(/[._]/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}
export function ClassroomDetails() {
  const {
    classroomId
  } = useParams<{
    classroomId: string;
  }>();
  const [classroom, setClassroom] = useState({
    id: '',
    name: '',
    capacity: 0,
    ageGroup: '',
    assignedForms: [] as Form[],
    students: [] as Student[]
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadClassroomData = async () => {
      if (!classroomId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const user = await fetchUserContext();
        if (!user.schoolId) {
          if (isMounted) {
            setError('No school ID found');
            setLoading(false);
          }
          return;
        }

        // Fetch class-based enrollments using the new API
        const [classrooms, classStats, classEnrollments] = await Promise.all([
          fetchClassrooms(user.schoolId).catch(() => []),
          fetchClassEnrollmentStats(user.schoolId).catch(() => []),
          fetchClassBasedEnrollments(user.schoolId, classroomId).catch(() => [])
        ]);

        const targetClassroom = classrooms.find(cls => cls.id === classroomId);
        if (!targetClassroom && isMounted) {
          setError('Classroom not found');
          setLoading(false);
          return;
        }

        const className = targetClassroom?.name || '';
        const stats = classStats.find(stat => stat.className === className);
        const assignedForms = stats ? formsFromRecord(stats.forms) : [];

        // Transform class-based enrollments to Student interface
        const students: Student[] = classEnrollments.map((enrollment: ClassBasedEnrollment) => {
          const entries = Object.entries(enrollment.forms || {});
          const completed = entries.filter(([, status]) => COMPLETION_STATUSES.has(normalizeFormStatus(status))).length;
          const total = entries.length || assignedForms.length || 4;
          const progress = total > 0 ? Math.round(completed / total * 100) : 0;
          const enrollmentStatus: Student['enrollmentStatus'] = progress === 100 ? 'Complete' : completed > 0 ? 'In Progress' : 'Not Started';
          const email = enrollment.primary_email || enrollment.additional_parent_email || 'guardian@example.com';

          // Construct parent name from first and last name
          const parentName = `${enrollment.parent_first_name || ''} ${enrollment.parent_last_name || ''}`.trim() || friendlyNameFromEmail(email);

          return {
            id: enrollment.child_id,
            firstName: enrollment.child_first_name,
            lastName: enrollment.child_last_name,
            enrollmentProgress: progress,
            enrollmentStatus,
            formsCompleted: completed,
            totalForms: total,
            parent: {
              id: enrollment.parent_id,
              name: parentName,
              email
            }
          } satisfies Student;
        });

        if (isMounted) {
          setClassroom({
            id: targetClassroom?.id || '',
            name: className,
            capacity: 0,
            ageGroup: '',
            assignedForms,
            students
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading classroom details:', error);
        if (isMounted) {
          setError('Failed to load classroom details');
          setLoading(false);
        }
      }
    };

    loadClassroomData();
    
    return () => {
      isMounted = false;
    };
  }, [classroomId]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return classroom.students.filter(student => {
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const parentName = student.parent.name.toLowerCase();
      return fullName.includes(query) || parentName.includes(query) || student.parent.email.toLowerCase().includes(query);
    });
  }, [classroom.students, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedData: paginatedStudents,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ data: filteredStudents });
  
  const enrollmentStats = useMemo(() => {
    const totalStudents = classroom.students.length;
    const complete = classroom.students.filter(s => s.enrollmentStatus === 'Complete').length;
    const inProgress = classroom.students.filter(s => s.enrollmentStatus === 'In Progress').length;
    const notStarted = classroom.students.filter(s => s.enrollmentStatus === 'Not Started').length;
    const totalProgress = classroom.students.reduce((acc, student) => acc + student.enrollmentProgress, 0);
    const averageProgress = totalStudents > 0 ? Math.round(totalProgress / totalStudents) : 0;
    return {
      complete,
      inProgress,
      notStarted,
      totalStudents,
      averageProgress
    };
  }, [classroom.students]);

  if (loading) {
    return <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto mb-2"></div>
          <p className="text-gray-500">Loading classroom details...</p>
        </div>
      </div>
    </AdminLayout>;
  }

  if (error) {
    return <AdminLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    </AdminLayout>;
  }
  const getStatusBadgeVariant = (status: Student['enrollmentStatus']): 'success' | 'secondary' | 'outline' | 'default' => {
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
  const getStatusIcon = (status: Student['enrollmentStatus']) => {
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
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/admin/classrooms" className="mr-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              {classroom.name}
            </h1>
          </div>
          <div className="flex space-x-2">
            {/* <Button variant="outline">
              Rename
            </Button> */}
            <Link to={`/admin/form-assignments?classroom=${classroomId ?? classroom.id}`}>
              <Button variant="outline" className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Manage Forms
              </Button>
            </Link>
            <Button className="bg-amazon-teal hover:bg-amazon-teal/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </div>
        </div>
        {/* Classroom Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Classroom Details</CardTitle>
          
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Capacity</span>
                  <span className="font-semibold">{classroom.capacity} students</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Age Group</span>
                  <span className="font-semibold">{classroom.ageGroup}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Lead Teacher</span>
                  <span className="font-semibold">TBD</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Assistants</span>
                  <span className="font-semibold">TBD</span>
                </div>
              </div>
            </CardContent>
          </Card> */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enrollment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Complete</span>
                  <Badge variant="success" className="px-2 py-1">
                    {enrollmentStats.complete} students
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">In Progress</span>
                  <Badge variant="secondary" className="px-2 py-1">
                    {enrollmentStats.inProgress} students
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Not Started</span>
                  <Badge variant="outline" className="px-2 py-1">
                    {enrollmentStats.notStarted} students
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Average Progress</span>
                  <span className="font-semibold">{enrollmentStats.averageProgress}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="activity">Students</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Classroom Summary</CardTitle>
                <CardDescription>
                  Key metrics for {classroom.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/70 rounded-lg border">
                    <div className="text-sm text-gray-500">Total Students</div>
                    <div className="text-2xl font-bold">
                      {enrollmentStats.totalStudents}
                    </div>
                  </div>
                  <div className="p-4 bg-white/70 rounded-lg border">
                    <div className="text-sm text-gray-500">Required Forms</div>
                    <div className="text-2xl font-bold">
                      {classroom.assignedForms.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle>Students</CardTitle>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search students..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No students found matching your search.</p>
                  </div> : <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">
                            Student
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">
                            Parent
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">
                            Enrollment Status
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">
                            Forms Completed
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map(student => <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-600">{student.parent.name}</span>
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
                          </tr>)}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredStudents.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      className="hidden md:flex"
                    />
                    <MobilePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      className="md:hidden"
                    />
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="forms">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Forms Assigned</CardTitle>
                <CardDescription>
                  Class-specific forms and their status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {classroom.assignedForms.map(form => <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{form.name}</p>
                    </div>
                    <Badge variant="secondary">{form.status}</Badge>
                  </div>)}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="activity">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle>Students</CardTitle>
                    <CardDescription>Students enrolled in {classroom.name}</CardDescription>
                  </div>
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input placeholder="Search students..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No students found matching your search.</p>
                  </div> : <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-600">
                            Student
                          </th>
                          <th className="text-left py-3 px-4 font-medium text-gray-600">
                            Parent
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">
                            Enrollment Status
                          </th>
                          <th className="text-center py-3 px-4 font-medium text-gray-600">
                            Forms Completed
                          </th>
                          <th className="text-right py-3 px-4 font-medium text-gray-600">
                            Progress
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedStudents.map(student => <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-gray-600">{student.parent.name}</span>
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
                          </tr>)}
                      </tbody>
                    </table>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredStudents.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      className="hidden md:flex"
                    />
                    <MobilePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      className="md:hidden"
                    />
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </AdminLayout>;
}