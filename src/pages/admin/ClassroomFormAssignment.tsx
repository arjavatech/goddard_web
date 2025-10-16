import { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AsyncButton } from '../../components/ui/async-button';
import { Search, FileText, Plus, X, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassEnrollmentStats, assignFormToClassroom, deleteClassFormOverride } from '../../services/api/admin';
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
  formCount: number;
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
// const DEFAULT_CLASSROOMS: Classroom[] = [{
//   id: '1',
//   name: 'Sunshine Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }, {
//     id: '3',
//     name: 'Emergency Contact Form',
//     status: 'Active'
//   }, {
//     id: '4',
//     name: 'Photo Release Form',
//     status: 'Active'
//   }]
// }, {
//   id: '2',
//   name: 'Rainbow Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }, {
//     id: '3',
//     name: 'Emergency Contact Form',
//     status: 'Active'
//   }]
// }, {
//   id: '3',
//   name: 'Stars Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }]
// }, {
//   id: '4',
//   name: 'Moon Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }, {
//     id: '5',
//     name: 'Field Trip Permission',
//     status: 'Inactive'
//   }]
// }, {
//   id: '5',
//   name: 'Ocean Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }, {
//     id: '6',
//     name: 'Parent Handbook Acknowledgment',
//     status: 'Default'
//   }]
// }, {
//   id: '6',
//   name: 'Mountain Room',
//   assignedForms: [{
//     id: '1',
//     name: 'Admission Form',
//     status: 'Active'
//   }, {
//     id: '2',
//     name: 'Medical Authorization',
//     status: 'Active'
//   }]
// }];
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
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classroomIdFromQuery || '');
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId) return;
        const [templates, classroomList] = await Promise.all([fetchFormTemplates(user.schoolId).catch(() => []), fetchClassEnrollmentStats(user.schoolId).catch(() => [])]);
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
          const convertedClassrooms = classroomList.map(classroom => {
            // Convert forms object to assignedForms array
            const assignedForms = Object.entries(classroom.forms || {}).map(([formId, formName]) => ({
              id: formId,
              name: formName || 'Unknown Form',
              status: 'Active' as FormStatus
            })).filter(form => form.name !== null); // Filter out null form names
            
            return {
              id: classroom.classId,
              name: classroom.className,
              assignedForms,
              formCount: assignedForms.length // Use actual assigned forms count
            };
          });
          setClassrooms(convertedClassrooms);
          const preferredId = classroomIdFromQuery && classroomList.some(cls => cls.classId === classroomIdFromQuery) ? classroomIdFromQuery : classroomList[0]?.classId;
          if (preferredId) {
            setSelectedClassroomId(preferredId);
          }
        }
      } catch (error) {
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

  // Reset search query when component mounts
  useEffect(() => {
    setFormSearchQuery('');
  }, []);
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
  const handleAssignForms = async () => {
    if (!selectedClassroom || selectedFormIds.length === 0) return;
    
    const user = await fetchUserContext();
    if (!user.schoolId) throw new Error('School context not found');
    
    await Promise.all(
      selectedFormIds.map(formId => 
        assignFormToClassroom(user.schoolId!, selectedClassroom.id, formId)
      )
    );
    
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
  };
  const handleRemoveForm = async (formId: string) => {
    if (!selectedClassroom) return;
    
    try {
      const user = await fetchUserContext();
      if (!user.schoolId) throw new Error('School context not found');
      
      await deleteClassFormOverride(formId, selectedClassroom.id);
    } catch (error) {
      console.log('Failed to delete form override:', error);
    }
    
    // Update UI regardless of API result
    setClassrooms(classrooms.map(classroom => {
      if (classroom.id === selectedClassroom.id) {
        return {
          ...classroom,
          assignedForms: classroom.assignedForms.filter(form => form.id !== formId)
        };
      }
      return classroom;
    }));
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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        <div className="space-y-4 sm:space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-3 sm:space-y-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/classrooms')} 
              className="flex items-center self-start w-fit text-sm"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Back to Classrooms</span>
              <span className="sm:hidden">Back</span>
            </Button>
            
            {/* Controls Section */}
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
              <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue placeholder="Select classroom" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                  formSearchQuery ? 'text-amazon-teal' : 'text-gray-400'
                }`} />
                <Input 
                  placeholder="Search forms..." 
                  className={`pl-9 transition-all ${
                    formSearchQuery 
                      ? 'bg-amazon-teal/5 border-amazon-teal/30 ring-1 ring-amazon-teal/20' 
                      : 'bg-white'
                  }`}
                  value={formSearchQuery} 
                  onChange={e => setFormSearchQuery(e.target.value)} 
                />
                {formSearchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-gray-600"
                      onClick={() => setFormSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => {
                  setFormSearchQuery('');
                  setIsAssignDialogOpen(true);
                }} 
                className="bg-amazon-teal hover:bg-amazon-teal/90 w-full lg:w-auto lg:min-w-[140px]"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" /> 
                Assign Forms
              </Button>
            </div>
          </div>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Classrooms Sidebar */}
            <div className="lg:col-span-1">
              <Card className="glass-card h-full">
                <CardHeader className="pb-2 sm:pb-3">
                  <CardTitle className="text-base sm:text-lg">Classrooms</CardTitle>
                  <p className="text-xs sm:text-sm text-gray-500">{classrooms.length} total</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-1 sm:space-y-2 max-h-[300px] sm:max-h-[600px] overflow-y-auto pr-1 sm:pr-2">
                    {classrooms.map(classroom => (
                      <div 
                        key={classroom.id} 
                        className={`p-2 sm:p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                          classroom.id === selectedClassroomId 
                            ? 'bg-amazon-teal text-white shadow-md' 
                            : 'hover:bg-gray-50 hover:shadow-sm border border-gray-100'
                        }`} 
                        onClick={() => setSelectedClassroomId(classroom.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium truncate pr-2 text-xs sm:text-sm">
                            {classroom.name}
                          </div>
                          <div className="flex items-center flex-shrink-0 text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            <span>{classroom.assignedForms.length}</span>
                            {classroom.id === selectedClassroomId && (
                              <ChevronRight className="h-3 w-3 ml-1" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Forms Content */}
            <div className="lg:col-span-3">
              <Card className="glass-card">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl truncate">
                        {selectedClassroom?.name || 'Select Classroom'}
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">
                        {selectedClassroom?.assignedForms.length || 0} assigned forms
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setFormSearchQuery('');
                        setIsAssignDialogOpen(true);
                      }} 
                      className="bg-amazon-teal hover:bg-amazon-teal/90 w-full lg:w-auto lg:min-w-[140px]"
                      disabled={!selectedClassroom}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" /> 
                      Manage Forms
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {/* Filter Tabs */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex space-x-1 overflow-x-auto scrollbar-hide pb-2 -mx-1">
                      <div className="flex space-x-1 min-w-max px-1">
                        {tabs.map(tab => (
                          <Button 
                            key={tab.id} 
                            variant={activeTab === tab.id ? 'default' : 'outline'} 
                            size="sm" 
                            onClick={() => setActiveTab(tab.id)} 
                            className="whitespace-nowrap flex-shrink-0 text-xs px-2 sm:px-4 py-1.5 sm:py-2 transition-all h-8 sm:h-9"
                          >
                            {tab.label}
                            {activeTab === tab.id && selectedClassroom && (
                              <span className="ml-1 sm:ml-2 bg-white/20 px-1 sm:px-1.5 py-0.5 rounded text-xs">
                                {tab.id === 'all' 
                                  ? selectedClassroom.assignedForms.length
                                  : selectedClassroom.assignedForms.filter(f => f.status.toLowerCase() === tab.id).length
                                }
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Forms List */}
                  {!selectedClassroom ? (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                      <p className="text-base sm:text-lg font-medium mb-2">Select a Classroom</p>
                      <p className="text-xs sm:text-sm px-4">Choose a classroom from the sidebar to view and manage assigned forms.</p>
                    </div>
                  ) : selectedClassroom.assignedForms.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                      <p className="text-base sm:text-lg font-medium mb-2">No Forms Assigned</p>
                      <p className="text-xs sm:text-sm mb-4 sm:mb-6 px-4">This classroom doesn't have any forms assigned yet.</p>
                      <Button 
                        onClick={() => {
                          setFormSearchQuery('');
                          setIsAssignDialogOpen(true);
                        }} 
                        variant="outline" 
                        className="bg-white hover:bg-gray-50"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Forms
                      </Button>
                    </div>
                  ) : filteredForms.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                      <p className="text-base sm:text-lg font-medium mb-2">No {activeTab === 'all' ? '' : activeTab} Forms</p>
                      <p className="text-xs sm:text-sm px-4">No forms match the selected filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredForms.map(form => (
                        <div 
                          key={form.id} 
                          className="flex items-center justify-between p-3 lg:p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 min-h-[60px] lg:min-h-[70px]"
                        >
                          <div className="flex items-center min-w-0 flex-1 gap-3 lg:gap-4">
                            <div className="flex-shrink-0 w-8 h-8 lg:w-10 lg:h-10 bg-amazon-teal/10 rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-amazon-teal" />
                            </div>
                            <div className="min-w-0 flex-1 lg:flex lg:items-center lg:justify-between lg:gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate text-sm lg:text-base">
                                  {form.name}
                                </div>
                                <div className="lg:hidden mt-1">
                                  <Badge 
                                    variant={getStatusBadgeVariant(form.status)} 
                                    className="text-xs h-5"
                                  >
                                    {form.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="hidden lg:block flex-shrink-0">
                                <Badge 
                                  variant={getStatusBadgeVariant(form.status)} 
                                  className="text-xs h-6 px-3"
                                >
                                  {form.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleRemoveForm(form.id)} 
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 ml-2 lg:ml-4 transition-colors h-8 w-8 lg:h-9 lg:w-9"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      
      {/* Assign Forms Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 m-2">
          <DialogHeader className="px-4 sm:px-6 py-4 border-b">
            <DialogTitle className="text-base sm:text-lg font-semibold pr-8">
              Assign Forms to {selectedClassroom?.name}
            </DialogTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Select forms to assign to this classroom
            </p>
          </DialogHeader>
          
          <div className="px-4 sm:px-6 py-4 space-y-4 flex-1 overflow-hidden">
            {/* Search Bar */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                formSearchQuery ? 'text-amazon-teal' : 'text-muted-foreground'
              }`} />
              <Input 
                placeholder="Search forms..." 
                className={`pl-9 text-sm transition-all ${
                  formSearchQuery 
                    ? 'border-amazon-teal/30 ring-1 ring-amazon-teal/20 bg-amazon-teal/5' 
                    : ''
                }`}
                value={formSearchQuery} 
                onChange={e => setFormSearchQuery(e.target.value)} 
              />
              {formSearchQuery && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-gray-600"
                    onClick={() => setFormSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            
            {/* Forms List */}
            <div className="max-h-[50vh] sm:max-h-[400px] overflow-y-auto">
              {availableForms.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="font-medium mb-1 text-sm sm:text-base">No Available Forms</p>
                  {formSearchQuery ? (
                    <p className="text-xs sm:text-sm">
                      No forms match your search.
                    </p>
                  ) : selectedClassroom?.assignedForms.length === allForms.length ? (
                    <p className="text-xs sm:text-sm">
                      All forms are already assigned.
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm">
                      No forms available for assignment.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {availableForms.map(form => (
                    <div 
                      key={form.id} 
                      className="flex items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer active:bg-muted"
                      onClick={() => {
                        const isSelected = selectedFormIds.includes(form.id);
                        if (isSelected) {
                          setSelectedFormIds(selectedFormIds.filter(id => id !== form.id));
                        } else {
                          setSelectedFormIds([...selectedFormIds, form.id]);
                        }
                      }}
                    >
                      <Checkbox 
                        id={`form-${form.id}`} 
                        checked={selectedFormIds.includes(form.id)} 
                        className="mr-3 flex-shrink-0" 
                      />
                      
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center mr-3">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate mb-1">
                            {form.name}
                          </div>
                          <Badge 
                            variant={getStatusBadgeVariant(form.status)} 
                            className="text-xs h-5"
                          >
                            {form.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/20 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                {selectedFormIds.length} form{selectedFormIds.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAssignDialogOpen(false);
                    setSelectedFormIds([]);
                  }}
                  className="flex-1 sm:flex-none text-sm"
                >
                  Cancel
                </Button>
                <AsyncButton 
                  onClick={handleAssignForms} 
                  className="bg-amazon-teal hover:bg-amazon-teal/90 flex-1 sm:flex-none text-sm" 
                  disabled={selectedFormIds.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Assign {selectedFormIds.length > 0 ? selectedFormIds.length : ''} Form{selectedFormIds.length !== 1 ? 's' : ''}</span>
                  <span className="sm:hidden">Assign ({selectedFormIds.length})</span>
                </AsyncButton>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
}