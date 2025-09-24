import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Search, FileText, Plus, X, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassrooms } from '../../services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
type FormStatus = 'Default' | 'Active' | 'Inactive' | 'Archive';
interface Form {
  id: string;
  name: string;
  status: FormStatus;
}
interface Classroom {
  id: string;
  name: string;
  assignedForms: Form[];
}
const DEFAULT_FORMS: Form[] = [{
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
}, {
  id: '5',
  name: 'Field Trip Permission',
  status: 'Inactive'
}, {
  id: '6',
  name: 'Parent Handbook Acknowledgment',
  status: 'Default'
}, {
  id: '7',
  name: 'Meal Program Enrollment',
  status: 'Archive'
}];

const DEFAULT_CLASSROOMS: Classroom[] = [{
  id: '1',
  name: 'Sunshine Room',
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
    }]
  }, {
    id: '2',
    name: 'Rainbow Room',
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
    }]
  }, {
    id: '3',
    name: 'Stars Room',
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }]
  }, {
    id: '4',
    name: 'Moon Room',
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '5',
      name: 'Field Trip Permission',
      status: 'Inactive'
    }]
  }, {
    id: '5',
    name: 'Ocean Room',
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }, {
      id: '6',
      name: 'Parent Handbook Acknowledgment',
      status: 'Default'
    }]
  }, {
    id: '6',
    name: 'Mountain Room',
    assignedForms: [{
      id: '1',
      name: 'Admission Form',
      status: 'Active'
    }, {
      id: '2',
      name: 'Medical Authorization',
      status: 'Active'
    }]
  }];

const formStatusFromTemplate = (status: string | null | undefined): FormStatus => {
  const value = (status ?? '').toLowerCase();
  if (value.includes('default')) return 'Default';
  if (value.includes('inactive')) return 'Inactive';
  if (value.includes('archive')) return 'Archive';
  return 'Active';
};



export function ClassroomFormAssignment() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const classroomIdFromQuery = queryParams.get('classroom');
  const [allForms, setAllForms] = useState<Form[]>(DEFAULT_FORMS);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classroomIdFromQuery || DEFAULT_CLASSROOMS[0]?.id || '');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;

        const [templates, classroomList] = await Promise.all([
          fetchFormTemplates(user.schoolId).catch(() => []),
          fetchClassrooms(user.schoolId).catch(() => [])
        ]);

        if (!isMounted) return;

        if (templates.length > 0) {
          const mappedForms = templates.map(template => ({
            id: template.id,
            name: template.formName || template.id,
            status: formStatusFromTemplate(template.status)
          }));
          setAllForms(mappedForms);
        }

        if (classroomList.length > 0) {
          console.log('ClassroomList from API:', classroomList);
          const convertedClassrooms = classroomList.map(classroom => ({
            ...classroom,
            assignedForms: classroom.assignedForms.map(form => ({
              ...form,
              status: formStatusFromTemplate(form.status)
            }))
          }));
          setClassrooms(convertedClassrooms);

          const preferredId = classroomIdFromQuery && classroomList.some(cls => cls.id === classroomIdFromQuery) ? classroomIdFromQuery : classroomList[0]?.id;
          if (preferredId) {
            setSelectedClassroomId(preferredId);
          }
        }
      } catch (error) {
        console.warn('Failed to load classroom form assignments', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [classroomIdFromQuery]);
  useEffect(() => {
    if (classroomIdFromQuery) {
      setSelectedClassroomId(classroomIdFromQuery);
    }
  }, [classroomIdFromQuery]);
  const [formSearchQuery, setFormSearchQuery] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId) || classrooms[0];
  // Filter forms that are not already assigned to the selected classroom
  const availableForms = allForms.filter(form => !selectedClassroom?.assignedForms.some(f => f.id === form.id)).filter(form => form.name.toLowerCase().includes(formSearchQuery.toLowerCase()));
  const getStatusBadgeVariant = (status: FormStatus): 'success' | 'default' | 'secondary' | 'outline' => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Default':
        return 'default';
      case 'Inactive':
        return 'secondary';
      case 'Archive':
        return 'outline';
      default:
        return 'default';
    }
  };
  const handleAssignForms = () => {
    if (selectedClassroom && selectedFormIds.length > 0) {
      const formsToAssign = allForms.filter(form => selectedFormIds.includes(form.id));
      setClassrooms(classrooms.map(classroom => {
        if (classroom.id === selectedClassroom.id) {
          return {
            ...classroom,
            assignedForms: [...classroom.assignedForms, ...formsToAssign]
          };
        }
        return classroom;
      }));
      setSelectedFormIds([]);
      setIsAssignDialogOpen(false);
    }
  };
  const handleRemoveForm = (formId: string) => {
    if (selectedClassroom) {
      setClassrooms(classrooms.map(classroom => {
        if (classroom.id === selectedClassroom.id) {
          return {
            ...classroom,
            assignedForms: classroom.assignedForms.filter(form => form.id !== formId)
          };
        }
        return classroom;
      }));
    }
  };
  const tabs = [{
    id: 'all',
    label: 'All Forms'
  }, {
    id: 'active',
    label: 'Active'
  }, {
    id: 'default',
    label: 'Default'
  }, {
    id: 'inactive',
    label: 'Inactive'
  }, {
    id: 'archive',
    label: 'Archive'
  }];
  const [activeTab, setActiveTab] = useState('all');
  const filteredForms = selectedClassroom ? selectedClassroom.assignedForms.filter(form => activeTab === 'all' || form.status.toLowerCase() === activeTab) : [];
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/admin/classrooms')} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Classrooms
          </Button>
          <div className="flex items-center space-x-3">
            <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map(classroom => <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search forms..." className="pl-9 bg-white" value={formSearchQuery} onChange={e => setFormSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => setIsAssignDialogOpen(true)} className="bg-amazon-teal hover:bg-amazon-teal/90">
              <Plus className="h-4 w-4 mr-2" /> Assign Forms
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="glass-card h-full">
              <CardHeader>
                <CardTitle>Classrooms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {classrooms.map(classroom => <div key={classroom.id} className={`p-3 rounded-lg cursor-pointer transition-all ${classroom.id === selectedClassroomId ? 'bg-amazon-teal text-white' : 'hover:bg-gray-100'}`} onClick={() => setSelectedClassroomId(classroom.id)}>
                      <div className="flex justify-between items-center">
                        <div className="font-medium">{classroom.name}</div>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          <span>{classroom.assignedForms.length}</span>
                          {classroom.id === selectedClassroomId && <ChevronRight className="h-4 w-4 ml-1" />}
                        </div>
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{selectedClassroom?.name}: Assigned Forms</CardTitle>
                <Button onClick={() => setIsAssignDialogOpen(true)} className="bg-amazon-teal hover:bg-amazon-teal/90">
                  <Plus className="h-4 w-4 mr-2" /> Assign Forms
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2 mb-4 overflow-x-auto">
                  {tabs.map(tab => <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab(tab.id)}>
                      {tab.label}
                    </Button>)}
                </div>
                {selectedClassroom?.assignedForms.length === 0 ? <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No forms have been assigned to this classroom yet.</p>
                    <Button onClick={() => setIsAssignDialogOpen(true)} variant="outline" className="mt-4">
                      Assign Forms
                    </Button>
                  </div> : <div className="space-y-3">
                    {filteredForms.map(form => <div key={form.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 mr-3 text-amazon-teal" />
                          <div>
                            <div className="font-medium">{form.name}</div>
                            <Badge variant={getStatusBadgeVariant(form.status)} className="mt-1">
                              {form.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveForm(form.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* Assign Forms Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Forms to {selectedClassroom?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input placeholder="Search forms..." className="pl-9 bg-white" value={formSearchQuery} onChange={e => setFormSearchQuery(e.target.value)} />
            </div>
            {availableForms.length === 0 ? <div className="text-center py-8 text-gray-500">
                <p>No available forms found.</p>
                {formSearchQuery && <p className="text-sm mt-2">
                    Try a different search term or clear the search.
                  </p>}
                {!formSearchQuery && selectedClassroom?.assignedForms.length === allForms.length && <p className="text-sm mt-2">
                      All forms are already assigned to this classroom.
                    </p>}
              </div> : <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {availableForms.map(form => <div key={form.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-center flex-1">
                      <Checkbox id={`form-${form.id}`} checked={selectedFormIds.includes(form.id)} onCheckedChange={checked => {
                  if (checked) {
                    setSelectedFormIds([...selectedFormIds, form.id]);
                  } else {
                    setSelectedFormIds(selectedFormIds.filter(id => id !== form.id));
                  }
                }} className="mr-3" />
                      <div className="flex items-center flex-1">
                        <FileText className="h-5 w-5 mr-3 text-amazon-teal" />
                        <div>
                          <label htmlFor={`form-${form.id}`} className="font-medium cursor-pointer">
                            {form.name}
                          </label>
                          <Badge variant={getStatusBadgeVariant(form.status)} className="mt-1">
                            {form.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>)}
              </div>}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-500">
                {selectedFormIds.length} form
                {selectedFormIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignForms} className="bg-amazon-teal hover:bg-amazon-teal/90" disabled={selectedFormIds.length === 0}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Assign Selected Forms
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>;
}
