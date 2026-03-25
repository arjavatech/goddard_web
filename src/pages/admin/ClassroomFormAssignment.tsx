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
import { Loading } from '../../components/ui/loading';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassEnrollmentStats, assignFormToClassroom, assignFormToClassStudents, deleteClassFormOverride } from '../../services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { useToast } from '../../contexts/ToastContext';
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
const formStatusFromTemplate = (status: string | null | undefined): FormStatus => {
  const value = (status ?? '').toLowerCase();
  if (value === 'school_default' || value.includes('default')) return 'Default';
  if (value === 'inactive' || value.includes('inactive')) return 'Inactive';
  if (value === 'archive' || value.includes('archive')) return 'Archive';
  if (value === 'active') return 'Active';
  return 'Default';
};
export function ClassroomFormAssignment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryParams = new URLSearchParams(location.search);
  const classroomIdFromQuery = queryParams.get('classroom');
  const [allForms, setAllForms] = useState<Form[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>(classroomIdFromQuery || '');
  const [loading, setLoading] = useState(true);
  const schoolId = localStorage.getItem('schoolId');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        // const user = await fetchUserContext();
        if (!schoolId) return;
        const [templates, classroomList] = await Promise.all([fetchFormTemplates(schoolId).catch(() => []), fetchClassEnrollmentStats(schoolId).catch(() => [])]);
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
              name: formName,
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
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'success' | 'error'>('idle');

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
      default:
        return 'default';
    }
  };
  const handleAssignForms = async () => {
    if (!selectedClassroom || selectedFormIds.length === 0) return;
    
    // const user = await fetchUserContext();
    if (!schoolId) throw new Error('School context not found');
    
    // Use Promise.all to assign forms to classroom and students simultaneously
    await Promise.all(
      selectedFormIds.map(async (formId) => {
        // First assign to classroom (for form management)
        await assignFormToClassroom(schoolId, selectedClassroom.id, formId);
        // Then assign to all students in the class
        await assignFormToClassStudents(schoolId, selectedClassroom.id, formId);
      })
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
  const handleRemoveForm = (formId: string) => {
    const form = selectedClassroom?.assignedForms.find(f => f.id === formId);
    if (!form) return;
    
    setFormToDelete(form);
    setDeleteStatus('idle');
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteForm = async () => {
    if (!selectedClassroom || !formToDelete) return;
    
    setDeleteStatus('deleting');
    
    try {
      // const user = await fetchUserContext(); 
      if (!schoolId) throw new Error('School context not found');
      
      await deleteClassFormOverride(formToDelete.id, selectedClassroom.id);
      
      // Update UI on success
      setClassrooms(classrooms.map(classroom => {
        if (classroom.id === selectedClassroom.id) {
          return {
            ...classroom,
            assignedForms: classroom.assignedForms.filter(form => form.id !== formToDelete.id)
          };
        }
        return classroom;
      }));
      
      // Show success toast
      showToast('success', `"${formToDelete.name}" has been removed from ${selectedClassroom.name}`);
      
      // Close modal immediately
      setIsDeleteDialogOpen(false);
      setFormToDelete(null);
      setDeleteStatus('idle');
      
    } catch (error) {
      console.log('Failed to delete form override:', error);
      setDeleteStatus('error');
      
      // Close modal after showing error
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setFormToDelete(null);
        setDeleteStatus('idle');
      }, 2000);
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
                            {selectedClassroom && (
                              <span className={`ml-1 sm:ml-2 px-1 sm:px-1.5 py-0.5 rounded text-xs ${
                                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                              }`}>
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
                  {loading ? (
                    <div className="text-center py-8 sm:py-12">
                      <Loading message="Loading classrooms..." size="sm" />
                    </div>
                  ) : !selectedClassroom ? (
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
                        Manage Forms
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
      
      {/* Delete Form Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[90vw] sm:w-[80vw] md:w-[70vw] lg:w-[60vw] max-w-md mx-4" preventClose>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Remove Form</DialogTitle>
          </DialogHeader>
          <div className="py-3 sm:py-4">
            <p className="text-sm sm:text-base text-gray-600">
              Are you sure you want to remove{' '}
              <span className="font-medium">{formToDelete?.name}</span> from {selectedClassroom?.name}? This
              action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm"
            >
              Cancel
            </Button>
            <AsyncButton 
              variant="destructive" 
              onClick={confirmDeleteForm}
              className="w-full sm:w-auto h-9 sm:h-10 text-sm"
            >
              Remove Form
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Forms Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] xl:w-[60vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0" preventClose>
          {/* Header */}
          <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5 border-b bg-gradient-to-r from-amazon-teal/5 to-amazon-teal/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amazon-teal/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-amazon-teal" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                  Add Forms to Classroom
                </DialogTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                  Select forms to assign to <span className="font-medium text-amazon-teal">{selectedClassroom?.name}</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search and Stats Bar */}
            <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50/50 border-b">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${
                    formSearchQuery ? 'text-amazon-teal' : 'text-gray-400'
                  }`} />
                  <Input 
                    placeholder="Search available forms..." 
                    className={`pl-9 h-9 sm:h-10 text-sm transition-all border-gray-200 focus:border-amazon-teal focus:ring-amazon-teal/20 ${
                      formSearchQuery 
                        ? 'border-amazon-teal/40 ring-2 ring-amazon-teal/10 bg-amazon-teal/5' 
                        : 'bg-white'
                    }`}
                    value={formSearchQuery} 
                    onChange={e => setFormSearchQuery(e.target.value)} 
                  />
                  {formSearchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-gray-400 hover:text-gray-600"
                      onClick={() => setFormSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-2 h-2 bg-amazon-teal rounded-full"></div>
                    <span>{availableForms.length} available</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>{selectedFormIds.length} selected</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Forms List */}
            <div className="flex-1 overflow-y-auto min-h-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              {availableForms.length === 0 ? (
                <div className="flex items-center justify-center h-full min-h-[250px] sm:min-h-[300px]">
                  <div className="text-center max-w-sm px-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Available Forms</h3>
                    {formSearchQuery ? (
                      <p className="text-sm text-gray-600">
                        No forms match your search for <span className="font-medium">'{formSearchQuery}'</span>.
                        <br className="hidden sm:block" />Try adjusting your search terms.
                      </p>
                    ) : selectedClassroom?.assignedForms.length === allForms.length ? (
                      <p className="text-sm text-gray-600">
                        All available forms have already been assigned to this classroom.
                      </p>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No forms are currently available for assignment.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3">
                  {availableForms.map(form => {
                    const isSelected = selectedFormIds.includes(form.id);
                    return (
                      <div 
                        key={form.id} 
                        className={`group relative flex items-center p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'border-amazon-teal bg-amazon-teal/5 shadow-sm' 
                            : 'border-gray-200 hover:border-amazon-teal/40 hover:bg-gray-50/50'
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFormIds(selectedFormIds.filter(id => id !== form.id));
                          } else {
                            setSelectedFormIds([...selectedFormIds, form.id]);
                          }
                        }}
                      >
                        {/* Selection Indicator */}
                        <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all ${
                          isSelected 
                            ? 'bg-amazon-teal border-amazon-teal' 
                            : 'border-gray-300 group-hover:border-amazon-teal/60'
                        }`}>
                          {isSelected && (
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white absolute top-0.5 left-0.5" />
                          )}
                        </div>
                        
                        <Checkbox 
                          id={`form-${form.id}`} 
                          checked={isSelected} 
                          className="mr-3 sm:mr-4 flex-shrink-0" 
                        />
                        
                        <div className="flex items-center flex-1 min-w-0 gap-3 sm:gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-amazon-teal/20' : 'bg-amazon-teal/10'
                          }`}>
                            <FileText className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
                              isSelected ? 'text-amazon-teal' : 'text-amazon-teal/70'
                            }`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-gray-900 truncate text-sm sm:text-base mb-1">
                              {form.name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={getStatusBadgeVariant(form.status)} 
                                className="text-xs h-5 sm:h-6 px-2 sm:px-3 font-medium"
                              >
                                {form.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex-shrink-0 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t bg-white">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex items-center justify-center sm:justify-start">
                {selectedFormIds.length > 0 && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-amazon-teal">
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{selectedFormIds.length} form{selectedFormIds.length !== 1 ? 's' : ''} selected</span>
                  </div>
                )}
                {selectedFormIds.length === 0 && (
                  <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                    Select forms to add to the classroom
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAssignDialogOpen(false);
                    setSelectedFormIds([]);
                  }}
                  className="flex-1 sm:flex-none px-4 sm:px-6 h-9 sm:h-10 border-gray-300 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </Button>
                <AsyncButton 
                  onClick={handleAssignForms} 
                  className="flex-1 sm:flex-none bg-amazon-teal hover:bg-amazon-teal/90 text-white px-4 sm:px-6 h-9 sm:h-10 shadow-sm text-sm" 
                  disabled={selectedFormIds.length === 0}
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Add {selectedFormIds.length > 0 ? `${selectedFormIds.length} ` : ''}Form{selectedFormIds.length !== 1 ? 's' : ''}
                </AsyncButton>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
}