import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Users, FileText, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Link } from 'react-router-dom';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassEnrollmentStats, fetchClassrooms, renameClassroom, deleteClassroom, createClassroom, type Classroom } from '../../services/api/admin';
export function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) {
          throw new Error('Unable to determine school context for this admin.');
        }
        const [rawClassrooms, enrollmentStats] = await Promise.all([fetchClassrooms(user.schoolId).catch(() => []), fetchClassEnrollmentStats(user.schoolId).catch(() => [])]);
        console.log('Raw Classrooms:', rawClassrooms);
        console.log('Enrollment Stats:', enrollmentStats);
        if (!isMounted) return;
        if (rawClassrooms.length === 0) {
          return;
        }
        const statsByName = new Map<string, {
          students: number;
          forms: Record<string, string>;
        }>();
        enrollmentStats.forEach(stat => {
          statsByName.set(stat.className, {
            students: stat.studentCount,
            forms: stat.forms ?? {}
          });
        });
        const mapped: Classroom[] = rawClassrooms.map(classroom => {
          const stats = statsByName.get(classroom.name);
          console.log('Applying stats for classroom:', classroom.name, stats);
          return {
            ...classroom,
            studentsCount: stats?.students ?? 0
          };
        });
        console.log('Final mapped classrooms:', mapped);
        setClassrooms(mapped);
      } catch (err) {
        console.warn('Failed to load classroom data', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter(classroom => classroom.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [classrooms, searchQuery]);
  const handleAddClassroom = async () => {
    if (newClassroomName.trim()) {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await createClassroom(user.schoolId, newClassroomName.trim());
        const newClassroom: Classroom = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: newClassroomName.trim(),
          studentsCount: 0,
          formsCount: 0,
          assignedForms: []
        };
        setClassrooms([...classrooms, newClassroom]);
        setNewClassroomName('');
        setIsAddDialogOpen(false);
      } catch (error) {
        console.error('Failed to create classroom:', error);
      }
    }
  };
  const handleEditClassroom = async () => {
    if (selectedClassroom && newClassroomName.trim()) {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        await renameClassroom(selectedClassroom.id, newClassroomName.trim(), user.schoolId);
        setClassrooms(classrooms.map(classroom => classroom.id === selectedClassroom.id ? {
          ...classroom,
          name: newClassroomName.trim()
        } : classroom));
        setNewClassroomName('');
        setIsEditDialogOpen(false);
      } catch (error) {
        console.error('Failed to rename classroom:', error);
      }
    }
  };
  const handleDeleteClassroom = async () => {
    if (selectedClassroom) {
      try {
        const user = await fetchUserContext();
        if (user.schoolId) {
          await deleteClassroom(selectedClassroom.id, user.schoolId);
        }
      } catch (error) {
        console.error('Failed to delete classroom:', error);
      }
      // Remove from local state regardless of API success
      setClassrooms(classrooms.filter(classroom => classroom.id !== selectedClassroom.id));
      setIsDeleteDialogOpen(false);
    }
  };
  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setNewClassroomName(classroom.name);
    setIsEditDialogOpen(true);
  };
  const openDeleteDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setIsDeleteDialogOpen(true);
  };
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            Classroom Management
          </h1>
          <Button onClick={() => {
          setNewClassroomName('');
          setIsAddDialogOpen(true);
        }} className="bg-amazon-teal hover:bg-amazon-teal/90">
            <Plus className="h-4 w-4 mr-2" /> Add Classroom
          </Button>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input placeholder="Search classrooms..." className="pl-9 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Classroom
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Students
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Assigned Forms
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClassrooms.length > 0 ? filteredClassrooms.map((classroom, index) => <tr key={classroom.id || `classroom-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold">
                              {classroom.name.split(' ').map(word => word.charAt(0)).join('').slice(0, 2)}
                            </div>
                            <div>
                              <Link to={`/admin/classrooms/${classroom.id}`} className="text-base font-medium text-foreground hover:text-amazon-teal">
                                {classroom.name}
                              </Link>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />{' '}
                                {classroom.studentsCount} student
                                {classroom.studentsCount === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {classroom.studentsCount}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {classroom.assignedForms.length > 0 ? classroom.assignedForms.slice(0, 3).map(form => <Badge key={form.id} variant="secondary" className="text-xs">
                                    {form.name}
                                  </Badge>) : <span className="text-gray-400 text-sm">
                                No forms assigned
                              </span>}
                            {classroom.assignedForms.length > 3 && <Badge variant="outline" className="text-xs">
                                +{classroom.assignedForms.length - 3} more
                              </Badge>}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link to={`/admin/form-assignments?classroom=${classroom.id}`}>
                              <Button variant="outline" size="sm" className="flex items-center">
                                <FileText className="h-4 w-4 mr-1" />
                                Manage Forms
                              </Button>
                            </Link>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
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
          </CardContent>
        </Card>
      </div>
      {/* Add Classroom Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input value={newClassroomName} onChange={e => setNewClassroomName(e.target.value)} placeholder="Enter classroom name" className="w-full" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newClassroomName.trim()}>
              Add Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">
              Classroom Name
            </label>
            <Input value={newClassroomName} onChange={e => setNewClassroomName(e.target.value)} placeholder="Enter new classroom name" className="w-full" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditClassroom} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={!newClassroomName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Classroom Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-medium">{selectedClassroom?.name}</span>?
              This action cannot be undone.
            </p>
            {selectedClassroom?.studentsCount && selectedClassroom.studentsCount > 0 && <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    This classroom has {selectedClassroom?.studentsCount}{' '}
                    student{selectedClassroom?.studentsCount !== 1 ? 's' : ''}{' '}
                    enrolled. Deleting it will remove all student associations.
                  </p>
                </div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteClassroom}>
              Delete Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}