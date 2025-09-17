import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, GraduationCap, School, Users, FileText, CheckCircle, Clock, AlertCircle, Eye, Filter, X } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Link } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
type EnrollmentStatus = 'Complete' | 'In Progress' | 'Not Started';
interface Student {
  id: string;
  firstName: string;
  lastName: string;
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
  // Mock student data combined from all classrooms
  const [students, setStudents] = useState<Student[]>([{
    id: '1',
    firstName: 'Emma',
    lastName: 'Johnson',
    enrollmentProgress: 85,
    enrollmentStatus: 'In Progress',
    formsCompleted: 3,
    totalForms: 4,
    classroom: {
      id: '1',
      name: 'Sunshine Room'
    },
    parent: {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Completed'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'In Progress'
    }]
  }, {
    id: '2',
    firstName: 'Noah',
    lastName: 'Smith',
    enrollmentProgress: 100,
    enrollmentStatus: 'Complete',
    formsCompleted: 4,
    totalForms: 4,
    classroom: {
      id: '2',
      name: 'Rainbow Room'
    },
    parent: {
      id: '2',
      name: 'Michael Smith',
      email: 'michael.smith@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Completed'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Completed'
    }]
  }, {
    id: '3',
    firstName: 'Olivia',
    lastName: 'Wilson',
    enrollmentProgress: 50,
    enrollmentStatus: 'In Progress',
    formsCompleted: 2,
    totalForms: 4,
    classroom: {
      id: '3',
      name: 'Stars Room'
    },
    parent: {
      id: '4',
      name: 'David Wilson',
      email: 'david.wilson@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '4',
    firstName: 'Sophia',
    lastName: 'Brown',
    enrollmentProgress: 25,
    enrollmentStatus: 'In Progress',
    formsCompleted: 1,
    totalForms: 4,
    classroom: {
      id: '4',
      name: 'Moon Room'
    },
    parent: {
      id: '3',
      name: 'Jennifer Brown',
      email: 'jennifer.brown@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Not Started'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '5',
    firstName: 'Liam',
    lastName: 'Davis',
    enrollmentProgress: 0,
    enrollmentStatus: 'Not Started',
    formsCompleted: 0,
    totalForms: 4,
    classroom: {
      id: '5',
      name: 'Ocean Room'
    },
    parent: {
      id: '5',
      name: 'Robert Davis',
      email: 'robert.davis@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Not Started'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Not Started'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '6',
    firstName: 'Ava',
    lastName: 'Smith',
    enrollmentProgress: 75,
    enrollmentStatus: 'In Progress',
    formsCompleted: 3,
    totalForms: 4,
    classroom: {
      id: '1',
      name: 'Sunshine Room'
    },
    parent: {
      id: '2',
      name: 'Michael Smith',
      email: 'michael.smith@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Completed'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '7',
    firstName: 'James',
    lastName: 'Miller',
    enrollmentProgress: 100,
    enrollmentStatus: 'Complete',
    formsCompleted: 4,
    totalForms: 4,
    classroom: {
      id: '2',
      name: 'Rainbow Room'
    },
    parent: {
      id: '6',
      name: 'Patricia Miller',
      email: 'patricia.miller@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Completed'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Completed'
    }]
  }, {
    id: '8',
    firstName: 'Charlotte',
    lastName: 'Taylor',
    enrollmentProgress: 50,
    enrollmentStatus: 'In Progress',
    formsCompleted: 2,
    totalForms: 4,
    classroom: {
      id: '3',
      name: 'Stars Room'
    },
    parent: {
      id: '7',
      name: 'Thomas Taylor',
      email: 'thomas.taylor@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Completed'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '9',
    firstName: 'Benjamin',
    lastName: 'Anderson',
    enrollmentProgress: 25,
    enrollmentStatus: 'In Progress',
    formsCompleted: 1,
    totalForms: 4,
    classroom: {
      id: '4',
      name: 'Moon Room'
    },
    parent: {
      id: '8',
      name: 'Jessica Anderson',
      email: 'jessica.anderson@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Completed'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Not Started'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }, {
    id: '10',
    firstName: 'Mia',
    lastName: 'Thomas',
    enrollmentProgress: 0,
    enrollmentStatus: 'Not Started',
    formsCompleted: 0,
    totalForms: 4,
    classroom: {
      id: '5',
      name: 'Ocean Room'
    },
    parent: {
      id: '9',
      name: 'Daniel Thomas',
      email: 'daniel.thomas@example.com'
    },
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Not Started'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Not Started'
    }, {
      id: '3',
      name: 'Emergency Contact Form',
      status: 'Not Started'
    }, {
      id: '4',
      name: 'Photo Release Form',
      status: 'Not Started'
    }]
  }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  // Filter students based on search query and status filter
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const parentName = student.parent.name.toLowerCase();
    const classroomName = student.classroom.name.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || parentName.includes(searchQuery.toLowerCase()) || classroomName.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || student.enrollmentStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });
  // Calculate enrollment statistics
  const enrollmentStats = {
    complete: students.filter(s => s.enrollmentStatus === 'Complete').length,
    inProgress: students.filter(s => s.enrollmentStatus === 'In Progress').length,
    notStarted: students.filter(s => s.enrollmentStatus === 'Not Started').length,
    totalStudents: students.length
  };
  // Get status badge variant
  const getStatusBadgeVariant = (status: EnrollmentStatus) => {
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
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Student Management
          </h1>
          <Button variant="outline" className="flex items-center" onClick={() => setShowFilters(!showFilters)}>
            {showFilters ? <X className="h-4 w-4 mr-2" /> : <Filter className="h-4 w-4 mr-2" />}
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Students
                  </p>
                  <h3 className="text-2xl font-bold mt-1">
                    {enrollmentStats.totalStudents}
                  </h3>
                </div>
                <div className="p-3 bg-gray-50 rounded-full">
                  <GraduationCap className="h-5 w-5 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Complete
                  </p>
                  <h3 className="text-2xl font-bold mt-1">
                    {enrollmentStats.complete}
                  </h3>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    In Progress
                  </p>
                  <h3 className="text-2xl font-bold mt-1">
                    {enrollmentStats.inProgress}
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-full">
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Not Started
                  </p>
                  <h3 className="text-2xl font-bold mt-1">
                    {enrollmentStats.notStarted}
                  </h3>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Student List */}
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
                  {filteredStudents.length > 0 ? filteredStudents.map(student => <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm mr-3">
                              {student.firstName.charAt(0)}
                              {student.lastName.charAt(0)}
                            </div>
                            <div className="font-medium">
                              {student.firstName} {student.lastName}
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
                          <div className="mt-1 flex flex-wrap justify-center gap-1">
                            {student.assignedForms.slice(0, 2).map(form => <Badge key={form.id} variant="secondary" className="text-xs">
                                {form.name}
                              </Badge>)}
                            {student.assignedForms.length > 2 && <Badge variant="outline" className="text-xs">
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