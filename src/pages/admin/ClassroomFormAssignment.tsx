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
import { fetchClassEnrollmentStats, assignFormToClassroom, assignFormToClassStudents, deleteClassFormOverride, assignFormToAllStudents } from '../../services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
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
        console.error('Failed to load form assignments:', error);
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
  const [selectedFormStatus, setSelectedFormStatus] = useState<'active' | 'inactive' | 'school_default'>('active');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  // Reset search query when component mounts
  useEffect(() => {
    setFormSearchQuery('');
  }, []);
  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId) || classrooms[0];
  // Filter forms based on search and status, excluding already assigned forms
  const availableForms = allForms
    .filter(form => !selectedClassroom?.assignedForms.some(f => f.id === form.id))
    .filter(form => form.name.toLowerCase().includes(formSearchQuery.toLowerCase()))
    .filter(form => {
      if (selectedFormStatus === 'active') return form.status === 'Active';
      if (selectedFormStatus === 'school_default') return form.status === 'Default';
      if (selectedFormStatus === 'inactive') return form.status === 'Inactive';
      return true;
    });
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
  const handleAssignToAllStudents = async () => {
    if (!selectedClassroom || selectedFormIds.length === 0) return;

    if (!schoolId) throw new Error('School context not found');

    const apiStatus = selectedFormStatus === 'school_default' ? 'default' : selectedFormStatus;

    await Promise.all(
      selectedFormIds.map(formId => assignFormToClassroom(schoolId, selectedClassroom.id, formId, apiStatus))
    );

    const formsToAssign = allForms.filter(form => selectedFormIds.includes(form.id)).map(form => ({
      ...form,
      status: selectedFormStatus === 'school_default' ? 'Default' : selectedFormStatus.charAt(0).toUpperCase() + selectedFormStatus.slice(1) as FormStatus
    }));
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
    setSelectedFormStatus('active');
    setIsAssignDialogOpen(false);
  };

  const handleAssignToClass = async () => {
    if (!selectedClassroom || selectedFormIds.length === 0) return;

    if (!schoolId) throw new Error('School context not found');

    const apiStatus = selectedFormStatus === 'school_default' ? 'default' : selectedFormStatus;

    await Promise.all(
      selectedFormIds.map(formId => assignFormToClassroom(schoolId, selectedClassroom.id, formId, apiStatus))
    );

    const formsToAssign = allForms.filter(form => selectedFormIds.includes(form.id)).map(form => ({
      ...form,
      status: selectedFormStatus === 'school_default' ? 'Default' : selectedFormStatus.charAt(0).toUpperCase() + selectedFormStatus.slice(1) as FormStatus
    }));
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
    setSelectedFormStatus('active');
    setIsAssignDialogOpen(false);
  };
  const handleRemoveForm = (formId: string) => {
    const form = selectedClassroom?.assignedForms.find(f => f.id === formId);
    if (!form) return;

    setFormToDelete(form);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteForm = async () => {
    if (!selectedClassroom || !formToDelete) return;


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

    } catch (error) {
      console.log('Failed to delete form override:', error);

      // Close modal after showing error
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
        setFormToDelete(null);
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
  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl pb-10"
      >
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-col space-y-4 mt-12 sm:mt-10 animate-fade-in bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/classrooms')}
              className="flex items-center self-start w-fit text-xs font-bold bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 rounded-xl transition-all h-9"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              <span>Back to Classrooms</span>
            </Button>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedClassroomId} onValueChange={setSelectedClassroomId}>
                <SelectTrigger className="w-full sm:w-[220px] rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] h-10 font-medium">
                  <SelectValue placeholder="Select classroom" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                  {classrooms.map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.id} className="cursor-pointer">
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${formSearchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search forms..."
                  className="pl-9 pr-8 h-10 transition-all rounded-xl focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white border-slate-200 text-sm placeholder:text-slate-400"
                  value={formSearchQuery}
                  onChange={e => setFormSearchQuery(e.target.value)}
                />
                {formSearchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-600 rounded-md"
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Classrooms Sidebar */}
            <div className="lg:col-span-1">
              <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white h-full">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <CardTitle className="text-sm font-bold text-slate-900">Classrooms</CardTitle>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">{classrooms.length} total</p>
                </CardHeader>
                <CardContent className="pt-4 px-3">
                  <div className="space-y-1.5 max-h-[300px] sm:max-h-[600px] overflow-y-auto pr-1">
                    {classrooms.map(classroom => {
                      const isActive = classroom.id === selectedClassroomId;
                      return (
                        <div
                          key={classroom.id}
                          className={`p-3 rounded-xl cursor-pointer transition-all duration-200 ${isActive
                            ? 'bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white shadow-md shadow-[#0F2D52]/10 font-bold'
                            : 'hover:bg-slate-50/80 hover:shadow-xs border border-transparent text-slate-700 font-semibold'
                          }`}
                          onClick={() => setSelectedClassroomId(classroom.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="text-xs sm:text-sm truncate pr-2">
                              {classroom.name}
                            </div>
                            <div className="flex items-center flex-shrink-0 text-xs opacity-90">
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              <span>{classroom.assignedForms.length}</span>
                              {isActive && <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Forms Content */}
            <div className="lg:col-span-3">
              <Card className="glass-card rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Classroom</p>
                      <CardTitle className="text-base sm:text-lg font-extrabold text-slate-950 truncate mt-0.5">
                        {selectedClassroom?.name || 'Select Classroom'}
                      </CardTitle>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">
                        {selectedClassroom?.assignedForms.length || 0} assigned forms
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setFormSearchQuery('');
                        setSelectedFormIds([]);
                        setIsAssignDialogOpen(true);
                      }}
                      className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 shadow-sm border-none font-bold rounded-xl h-10 text-xs px-4 w-full sm:w-auto"
                      disabled={!selectedClassroom}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Manage Forms
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 px-5">
                  {/* Filter Tabs */}
                  <div className="mb-5 overflow-x-auto">
                    <div className="flex space-x-1 pb-1">
                      {tabs.map(tab => (
                        <Button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "whitespace-nowrap flex-shrink-0 text-xs px-4 py-1.5 transition-all duration-200 h-8 border rounded-xl font-bold",
                            activeTab === tab.id
                              ? "bg-[#0F2D52] text-white border-[#0F2D52] shadow-xs"
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                          )}
                          size="sm"
                        >
                          {tab.label}
                          {selectedClassroom && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
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

                  {/* Forms List */}
                  {loading ? (
                    <div className="text-center py-12">
                      <Loading message="Loading classrooms..." size="sm" />
                    </div>
                  ) : !selectedClassroom ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-bold mb-1 text-slate-800">Select a Classroom</p>
                      <p className="text-xs font-semibold px-4 max-w-sm mx-auto">Choose a classroom from the sidebar to view and manage assigned forms.</p>
                    </div>
                  ) : selectedClassroom.assignedForms.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-bold mb-1 text-slate-800">No Forms Assigned</p>
                      <p className="text-xs font-semibold mb-5 px-4 max-w-sm mx-auto">This classroom doesn't have any forms assigned yet.</p>
                      <Button
                        onClick={() => {
                          setFormSearchQuery('');
                          setSelectedFormIds([]);
                          setIsAssignDialogOpen(true);
                        }}
                        className="bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-slate-50 rounded-xl transition-all font-bold text-xs h-9 px-4"
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Manage Forms
                      </Button>
                    </div>
                  ) : filteredForms.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-bold mb-1 text-slate-800">No {activeTab === 'all' ? '' : activeTab} Forms</p>
                      <p className="text-xs font-semibold px-4">No forms match the selected filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredForms.map(form => (
                        <div
                          key={form.id}
                          className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-100 hover:border-blue-100/50 hover:bg-slate-50/10 hover:shadow-xs transition-all duration-200 min-h-[60px]"
                        >
                          <div className="flex items-center min-w-0 flex-1 gap-3">
                            <div className="flex-shrink-0 w-9 h-9 bg-[#EFF5FB] border border-blue-50 text-[#0F2D52] rounded-lg flex items-center justify-center">
                              <FileText className="h-4 w-4 text-[#0F2D52]" />
                            </div>
                            <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 truncate text-sm">
                                  {form.name}
                                </div>
                                <div className="sm:hidden mt-1">
                                  <Badge
                                    variant={getStatusBadgeVariant(form.status)}
                                    className="text-[10px] rounded-full px-2.5 py-0.5 font-bold"
                                  >
                                    {form.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="hidden sm:block flex-shrink-0">
                                <Badge
                                  variant={getStatusBadgeVariant(form.status)}
                                  className="text-[10px] rounded-full px-2.5 py-0.5 font-bold"
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
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0 ml-3 transition-colors h-8 w-8 rounded-lg"
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
      </motion.div>
  );

    {/* Delete Form Dialog */}
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl shadow-lg border border-slate-100 bg-white" preventClose>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Remove Form</DialogTitle>
        </DialogHeader>
        <div className="py-3 sm:py-4">
          <p className="text-sm text-slate-600 font-semibold">
            Are you sure you want to remove{' '}
            <span className="font-extrabold text-[#0F2D52]">{formToDelete?.name}</span> from {selectedClassroom?.name}? This
            action cannot be undone.
          </p>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setIsDeleteDialogOpen(false)}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all duration-200"
          >
            Cancel
          </Button>
          <AsyncButton
            variant="destructive"
            onClick={confirmDeleteForm}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl transition-all duration-200 font-bold"
          >
            Remove Form
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Manage Forms Dialog */}
    <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] xl:w-[60vw] max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl" preventClose>
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#EFF5FB] border border-blue-50 text-[#0F2D52] rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="h-5 w-5 text-[#0F2D52]" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg font-bold text-slate-900 truncate">
                Add Forms to Classroom
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-0.5 font-semibold truncate">
                Select forms to assign to <span className="font-extrabold text-[#0F2D52]">{selectedClassroom?.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search and Stats Bar */}
          <div className="flex-shrink-0 px-6 py-4 bg-slate-50/20 border-b">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${formSearchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search available forms..."
                  className="pl-9 h-10 text-sm transition-all border-slate-200 focus:border-[#0F2D52] focus:ring-[#0F2D52]/15 rounded-xl bg-white"
                  value={formSearchQuery}
                  onChange={e => setFormSearchQuery(e.target.value)}
                />
                {formSearchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 rounded-md"
                    onClick={() => setFormSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Form Status</label>
                <Select value={selectedFormStatus} onValueChange={(value) => setSelectedFormStatus(value as 'active' | 'inactive' | 'school_default')}>
                  <SelectTrigger className="rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] h-10 font-semibold bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                    <SelectItem value="active" className="cursor-pointer">Active</SelectItem>
                    <SelectItem value="school_default" className="cursor-pointer">Default</SelectItem>
                    <SelectItem value="inactive" className="cursor-pointer">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Forms List */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 bg-slate-50/10">
            {availableForms.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[250px]">
                <div className="text-center max-w-sm px-4">
                  <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">No Available Forms</h3>
                  {formSearchQuery ? (
                    <p className="text-xs text-slate-400 font-semibold">
                      No forms match your search for <span className="font-bold text-[#0F2D52]">'{formSearchQuery}'</span>.
                    </p>
                  ) : selectedClassroom?.assignedForms.length === allForms.length ? (
                    <p className="text-xs text-slate-400 font-semibold">
                      All available forms have already been assigned to this classroom.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 font-semibold">
                      No active forms are currently available for assignment.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {availableForms.map(form => {
                  const isSelected = selectedFormIds.includes(form.id);
                  const isInactive = form.status === 'Inactive';
                  return (
                    <div
                      key={form.id}
                      className={`group relative flex items-center p-3 rounded-xl border-2 transition-all duration-200 ${isInactive ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${isSelected
                          ? 'border-[#0F2D52] bg-[#0F2D52]/5 shadow-xs'
                          : isInactive ? 'border-slate-100 bg-slate-50/50' : 'border-slate-100 hover:border-[#0F2D52]/30 hover:bg-slate-50/30'
                        }`}
                      onClick={() => {
                        if (isInactive) return;
                        if (isSelected) {
                          setSelectedFormIds(selectedFormIds.filter(id => id !== form.id));
                        } else {
                          setSelectedFormIds([...selectedFormIds, form.id]);
                        }
                      }}
                    >
                      {/* Selection Indicator */}
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 transition-all ${isSelected
                          ? 'bg-[#0F2D52] border-[#0F2D52]'
                          : isInactive ? 'border-slate-200' : 'border-slate-300 group-hover:border-[#0F2D52]/50'
                        }`}>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white absolute top-0.5 left-0.5" />
                        )}
                      </div>

                      <Checkbox
                        id={`form-${form.id}`}
                        checked={isSelected}
                        disabled={isInactive}
                        className="mr-4 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#0F2D52] data-[state=checked]:border-[#0F2D52]"
                      />

                      <div className="flex items-center flex-1 min-w-0 gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-[#0F2D52]/20' : 'bg-[#EFF5FB] text-[#0F2D52]'}`}>
                          <FileText className={`h-5 w-5 transition-colors ${isSelected ? 'text-[#0F2D52]' : 'text-[#0F2D52]'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className={`font-bold truncate text-sm mb-1 ${isInactive ? 'text-slate-400' : 'text-slate-800'}`}>
                            {form.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={getStatusBadgeVariant(form.status)}
                              className="text-[10px] rounded-full px-2.5 py-0.5 font-bold"
                            >
                              {form.status}
                            </Badge>
                            {isInactive && (
                              <span className="text-[10px] text-slate-400 font-bold">Not available</span>
                            )}
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
        <div className="flex-shrink-0 px-6 py-4 border-t bg-white">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center sm:justify-start">
              {selectedFormIds.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F2D52]">
                  <CheckCircle2 className="h-4 w-4 text-[#0F2D52]" />
                  <span>{selectedFormIds.length} form{selectedFormIds.length !== 1 ? 's' : ''} selected</span>
                </div>
              )}
              {selectedFormIds.length === 0 && (
                <div className="text-xs font-semibold text-slate-400 text-center sm:text-left">
                  Select forms to add to the classroom
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAssignDialogOpen(false);
                  setSelectedFormIds([]);
                }}
                className="w-full sm:w-auto h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </Button>
              <AsyncButton
                onClick={handleAssignToAllStudents}
                className="w-full sm:w-auto bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-slate-50 h-10 rounded-xl transition-all duration-200 text-xs font-bold"
                disabled={selectedFormIds.length === 0}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Assign to All Students
              </AsyncButton>
              <AsyncButton
                onClick={handleAssignToClass}
                className="w-full sm:w-auto bg-[#0F2D52] hover:bg-[#1E4B83] text-white h-10 rounded-xl transition-all duration-200 text-xs font-bold"
                disabled={selectedFormIds.length === 0}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Assign to Class
              </AsyncButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </AdminLayout>
  );
}