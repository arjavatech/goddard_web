import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, FileText, Search, Users, UserPlus, School, AlertCircle, CheckCircle, Clock, Calendar, Plus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
export function ClassroomDetails() {
  const {
    classroomId
  } = useParams<{
    classroomId: string;
  }>();
  const navigate = useNavigate();
  // Mock classroom data
  const [classroom, setClassroom] = useState({
    id: classroomId || '1',
    name: classroomId === '1' ? 'Sunshine Room' : classroomId === '2' ? 'Rainbow Room' : classroomId === '3' ? 'Stars Room' : classroomId === '4' ? 'Moon Room' : classroomId === '5' ? 'Ocean Room' : 'Mountain Room',
    capacity: 20,
    ageGroup: '3-4 years',
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
    }] as Form[],
    students: [{
      id: '1',
      firstName: 'Emma',
      lastName: 'Johnson',
      enrollmentProgress: 85,
      enrollmentStatus: 'In Progress',
      formsCompleted: 3,
      totalForms: 4,
      parent: {
        id: '1',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@example.com'
      }
    }, {
      id: '2',
      firstName: 'Noah',
      lastName: 'Smith',
      enrollmentProgress: 100,
      enrollmentStatus: 'Complete',
      formsCompleted: 4,
      totalForms: 4,
      parent: {
        id: '2',
        name: 'Michael Smith',
        email: 'michael.smith@example.com'
      }
    }, {
      id: '3',
      firstName: 'Olivia',
      lastName: 'Wilson',
      enrollmentProgress: 50,
      enrollmentStatus: 'In Progress',
      formsCompleted: 2,
      totalForms: 4,
      parent: {
        id: '4',
        name: 'David Wilson',
        email: 'david.wilson@example.com'
      }
    }, {
      id: '4',
      firstName: 'Sophia',
      lastName: 'Brown',
      enrollmentProgress: 25,
      enrollmentStatus: 'In Progress',
      formsCompleted: 1,
      totalForms: 4,
      parent: {
        id: '3',
        name: 'Jennifer Brown',
        email: 'jennifer.brown@example.com'
      }
    }, {
      id: '5',
      firstName: 'Liam',
      lastName: 'Davis',
      enrollmentProgress: 0,
      enrollmentStatus: 'Not Started',
      formsCompleted: 0,
      totalForms: 4,
      parent: {
        id: '5',
        name: 'Robert Davis',
        email: 'robert.davis@example.com'
      }
    }] as Student[]
  });
  const [searchQuery, setSearchQuery] = useState('');
  // Filter students based on search query
  const filteredStudents = classroom.students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const parentName = student.parent.name.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || parentName.includes(searchQuery.toLowerCase());
  });
  // Calculate enrollment statistics
  const enrollmentStats = {
    complete: classroom.students.filter(s => s.enrollmentStatus === 'Complete').length,
    inProgress: classroom.students.filter(s => s.enrollmentStatus === 'In Progress').length,
    notStarted: classroom.students.filter(s => s.enrollmentStatus === 'Not Started').length,
    totalStudents: classroom.students.length,
    averageProgress: Math.round(classroom.students.reduce((acc, student) => acc + student.enrollmentProgress, 0) / classroom.students.length) || 0
  };
  // Get status badge variant
  const getStatusBadgeVariant = (status: Student['enrollmentStatus']) => {
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
  // Get status icon
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
            <Link to={`/admin/form-assignments?classroom=${classroomId}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-amazon-teal mr-2" />
                  <span className="text-3xl font-bold">
                    {classroom.students.length}
                  </span>
                </div>
                <Badge variant="outline" className="text-sm">
                  Capacity: {classroom.capacity}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Age group: {classroom.ageGroup}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Enrollment Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold">
                  {enrollmentStats.averageProgress}%
                </span>
                <div className="flex space-x-1">
                  <Badge variant="success" className="text-xs">
                    {enrollmentStats.complete} Complete
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {enrollmentStats.inProgress} In Progress
                  </Badge>
                </div>
              </div>
              <Progress value={enrollmentStats.averageProgress} className="h-2" />
              <div className="mt-2 text-sm text-gray-500">
                Average completion across all students
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Required Forms</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-amazon-teal mr-2" />
                  <span className="text-3xl font-bold">
                    {classroom.assignedForms.length}
                  </span>
                </div>
                <Link to={`/admin/form-assignments?classroom=${classroomId}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {classroom.assignedForms.map(form => <Badge key={form.id} variant="secondary" className="text-xs">
                    {form.name}
                  </Badge>)}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Student List */}
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
                    {filteredStudents.map(student => <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                          <Link to={`/admin/parents/${student.parent.id}`} className="text-amazon-teal hover:underline">
                            {student.parent.name}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {student.parent.email}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={getStatusBadgeVariant(student.enrollmentStatus) as any} className="flex items-center w-fit mx-auto">
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
              </div>}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
}