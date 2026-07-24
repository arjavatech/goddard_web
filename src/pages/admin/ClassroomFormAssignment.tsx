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
              className="flex items-center self-start w-fit text-xs font-bold bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white border border-slate-200 rounded-xl transition-all h-9"
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
                              : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-500"
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
                        className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white border border-[#0F2D52] rounded-xl transition-all font-bold text-xs h-9 px-4"
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

      {/* Delete Form Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-2xl border border-slate-100 bg-white" preventClose>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 pr-6">Remove Form</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-600 font-semibold">
              Are you sure you want to remove{' '}
              <span className="font-extrabold text-[#0F2D52]">{formToDelete?.name}</span> from {selectedClassroom?.name}? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="w-full sm:w-auto h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <AsyncButton
              variant="destructive"
              onClick={confirmDeleteForm}
              className="w-full sm:w-auto h-10 text-sm rounded-xl font-bold"
            >
              Remove Form
            </AsyncButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Forms Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 rounded-2xl border border-slate-100 bg-white overflow-hidden" preventClose>
          {/* Header */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b bg-slate-50/50">
            <div className="flex items-center gap-3 pr-6">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#EFF5FB] border border-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#0F2D52]" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  Add Forms to Classroom
                </DialogTitle>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-semibold truncate">
                  Assigning to <span className="font-extrabold text-[#0F2D52]">{selectedClassroom?.name}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search + Filter */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-b bg-white">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${formSearchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search forms..."
                  className="pl-8 h-9 text-sm border-slate-200 focus:border-[#0F2D52] focus:ring-[#0F2D52]/15 rounded-xl bg-white"
                  value={formSearchQuery}
                  onChange={e => setFormSearchQuery(e.target.value)}
                />
                {formSearchQuery && (
                  <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 rounded-md" onClick={() => setFormSearchQuery('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select value={selectedFormStatus} onValueChange={(v) => setSelectedFormStatus(v as 'active' | 'inactive' | 'school_default')}>
                <SelectTrigger className="w-full sm:w-36 rounded-xl border-slate-200 text-xs h-9 font-semibold bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl bg-white">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="school_default">Default</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Forms List — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-3">
            {availableForms.length === 0 ? (
              <div className="flex items-center justify-center min-h-[180px]">
                <div className="text-center px-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">No Available Forms</p>
                  <p className="text-xs text-slate-400 font-semibold">
                    {formSearchQuery
                      ? <>No forms match <span className="font-bold text-[#0F2D52]">'{formSearchQuery}'</span>.</>  
                      : 'All forms are already assigned or none are available.'}
                  </p>
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
                      onClick={() => {
                        if (isInactive) return;
                        setSelectedFormIds(isSelected
                          ? selectedFormIds.filter(id => id !== form.id)
                          : [...selectedFormIds, form.id]
                        );
                      }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-150 ${
                        isInactive ? 'cursor-not-allowed opacity-50 border-slate-100 bg-slate-50/50'
                        : isSelected ? 'cursor-pointer border-[#0F2D52] bg-[#0F2D52]/5'
                        : 'cursor-pointer border-slate-100 hover:border-[#0F2D52]/30 hover:bg-slate-50/40'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={isInactive}
                        className="flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#0F2D52] data-[state=checked]:border-[#0F2D52]"
                      />
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-[#0F2D52]/15' : 'bg-[#EFF5FB]'}`}>
                        <FileText className="h-4 w-4 text-[#0F2D52]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-sm truncate ${isInactive ? 'text-slate-400' : 'text-slate-800'}`}>{form.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant={getStatusBadgeVariant(form.status)} className="text-[10px] rounded-full px-2 py-0 font-bold">{form.status}</Badge>
                          {isInactive && <span className="text-[10px] text-slate-400 font-semibold">Not available</span>}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="flex-shrink-0 h-4 w-4 text-[#0F2D52]" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 sm:px-6 py-3 border-t bg-white">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[11px] font-semibold text-slate-400">
                {selectedFormIds.length > 0
                  ? <span className="flex items-center gap-1.5 text-[#0F2D52] font-bold"><CheckCircle2 className="h-3.5 w-3.5" />{selectedFormIds.length} form{selectedFormIds.length !== 1 ? 's' : ''} selected</span>
                  : 'Select forms to add to the classroom'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => { setIsAssignDialogOpen(false); setSelectedFormIds([]); }}
                className="h-9 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600"
              >
                Cancel
              </Button>
              <AsyncButton
                onClick={handleAssignToAllStudents}
                className="h-9 bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-slate-50 rounded-xl text-xs font-bold"
                disabled={selectedFormIds.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                All Students
              </AsyncButton>
              <AsyncButton
                onClick={handleAssignToClass}
                className="h-9 bg-[#0F2D52] hover:bg-[#1E4B83] text-white rounded-xl text-xs font-bold"
                disabled={selectedFormIds.length === 0}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Assign to Class
              </AsyncButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}