import React, { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Search, Plus, FileText, User, School, Calendar, X } from 'lucide-react';
import { Checkbox } from '../../components/ui/checkbox';

export function StudentFormAssignment() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('all');

  // Mock data - replace with API calls later
  const students = [
    { id: '1', name: 'Emma Johnson', classroom: 'Toddler A', parent: 'Sarah Johnson', email: 'sarah@example.com' },
    { id: '2', name: 'Liam Smith', classroom: 'Toddler A', parent: 'Mike Smith', email: 'mike@example.com' },
    { id: '3', name: 'Olivia Brown', classroom: 'Preschool B', parent: 'Lisa Brown', email: 'lisa@example.com' },
    { id: '4', name: 'Noah Davis', classroom: 'Preschool B', parent: 'John Davis', email: 'john@example.com' }
  ];

  const forms = [
    { id: '1', name: 'Emergency Contact Form', description: 'Required emergency contact information' },
    { id: '2', name: 'Medical Information Form', description: 'Child medical history and allergies' },
    { id: '3', name: 'Enrollment Agreement', description: 'School enrollment terms and conditions' },
    { id: '4', name: 'Photo Release Form', description: 'Permission for photos and videos' }
  ];

  const classrooms = ['Toddler A', 'Toddler B', 'Preschool A', 'Preschool B'];

  const [assignments, setAssignments] = useState([
    { id: '1', studentId: '1', studentName: 'Emma Johnson', formName: 'Emergency Contact Form', assignedDate: '2024-01-15', status: 'pending' },
    { id: '2', studentId: '2', studentName: 'Liam Smith', formName: 'Medical Information Form', assignedDate: '2024-01-14', status: 'completed' },
    { id: '3', studentId: '3', studentName: 'Olivia Brown', formName: 'Enrollment Agreement', assignedDate: '2024-01-13', status: 'pending' }
  ]);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.parent.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClassroom = classroomFilter === 'all' || student.classroom === classroomFilter;
    return matchesSearch && matchesClassroom;
  });

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAssignForm = () => {
    if (!selectedForm || selectedStudents.length === 0) return;

    const formName = forms.find(f => f.id === selectedForm)?.name || '';
    const newAssignments = selectedStudents.map(studentId => {
      const student = students.find(s => s.id === studentId);
      return {
        id: `${assignments.length + selectedStudents.indexOf(studentId) + 1}`,
        studentId,
        studentName: student?.name || '',
        formName,
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'pending'
      };
    });

    setAssignments([...assignments, ...newAssignments]);
    setIsAssignDialogOpen(false);
    setSelectedStudents([]);
    setSelectedForm('');
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(assignments.filter(a => a.id !== assignmentId));
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Student Form Assignment
            </h1>
            <p className="text-sm text-slate-500">
              Assign forms to specific students
            </p>
          </div>
          <Button 
            className="bg-[#0891b2] hover:bg-[#0e7490]"
            onClick={() => setIsAssignDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Forms
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Students</p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
                <User className="w-8 h-8 text-amazon-teal" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Available Forms</p>
                  <p className="text-2xl font-bold">{forms.length}</p>
                </div>
                <FileText className="w-8 h-8 text-amazon-teal" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Active Assignments</p>
                  <p className="text-2xl font-bold">{assignments.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-amazon-teal" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Assignments */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Current Form Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
                        {assignment.studentName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-medium">{assignment.studentName}</h3>
                        <p className="text-sm text-slate-500">{assignment.formName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Assigned: {assignment.assignedDate}</p>
                      <Badge variant={assignment.status === 'completed' ? 'success' : 'secondary'}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No form assignments yet. Click "Assign Forms" to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assign Forms Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Form to Students</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Form Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Select Form</label>
                <Select value={selectedForm} onValueChange={setSelectedForm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a form to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map(form => (
                      <SelectItem key={form.id} value={form.id}>
                        <div>
                          <div className="font-medium">{form.name}</div>
                          <div className="text-xs text-muted-foreground">{form.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student Search and Filter */}
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={classroomFilter} onValueChange={setClassroomFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classrooms</SelectItem>
                      {classrooms.map(classroom => (
                        <SelectItem key={classroom} value={classroom}>
                          {classroom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Select Students ({selectedStudents.length} selected)
                </label>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center space-x-3 p-3 border-b last:border-b-0 hover:bg-gray-50">
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentSelect(student.id)}
                      />
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-slate-500">
                          {student.classroom} • {student.parent}
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      No students found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAssignForm} 
                className="bg-[#0891b2] hover:bg-[#0e7490]"
                disabled={!selectedForm || selectedStudents.length === 0}
              >
                Assign Form ({selectedStudents.length} students)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}