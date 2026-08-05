import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail as MailIcon, CheckCircle, AlertCircle, FileText, ChevronLeft, Download, Printer, ChevronDown, ChevronUp, Briefcase, Eye } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { EmployeeService, type Employee, type EmployeeFormAssignment } from '../../services/api/employee';
import { useUserContext } from '../../contexts/UserContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { COMPLETION_STATUSES } from '../../lib/formStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar } from 'lucide-react';

type FormStatus = 'Approved' | 'Submitted' | 'Assigned' | 'Rejected';

export function EmployeeDetails() {
  const { schoolSlug, employeeId } = useParams<{ schoolSlug: string; employeeId: string }>();
  const navigate = useNavigate();
  const { userData } = useUserContext();
  const { showToast } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [assignments, setAssignments] = useState<(EmployeeFormAssignment & { formTitle: string; formDescription: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedForm, setSelectedForm] = useState<EmployeeFormAssignment | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loadingAction, setLoadingAction] = useState<{ formId: string, action: 'download' | 'print' } | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        if (!userData?.schoolId || !employeeId) return;

        const [empData, rawAssignments, templates] = await Promise.all([
          EmployeeService.fetchEmployeeDetails(employeeId),
          EmployeeService.fetchEmployeeFormAssignments(employeeId),
          fetchFormTemplates(userData.schoolId).catch(() => [])
        ]);

        if (!isMounted) return;

        if (!empData) {
          navigate(`/${schoolSlug}/admin/employees`);
          return;
        }

        setEmployee(empData);

        const enrichedAssignments = rawAssignments.map(assignment => {
          const template = templates.find((t: any) => t.id === assignment.formId);
          return {
            ...assignment,
            formTitle: template?.formName || 'Unknown Form',
            formDescription: template?.formType || 'Employee Form'
          };
        });

        setAssignments(enrichedAssignments);
      } catch (error) {
        showToast('error', 'Failed to load employee details');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, [userData?.schoolId, employeeId, schoolSlug, navigate, showToast]);

  const handleReviewAction = async () => {
    if (!selectedForm || !formAction) return;
    setIsReviewing(true);
    
    try {
      const status = formAction === 'approve' ? 'Approved' : 'Rejected';
      const updated = await EmployeeService.reviewEmployeeForm(
        selectedForm.id, 
        status, 
        `${userData?.firstName} ${userData?.lastName}`.trim() || 'Admin'
      );
      
      setAssignments(prev => prev.map(a => a.id === selectedForm.id ? { ...a, ...updated } : a));
      showToast('success', `Form ${status.toLowerCase()} successfully`);
      setIsReviewDialogOpen(false);
      setSelectedForm(null);
    } catch (error) {
      showToast('error', 'Failed to review form');
    } finally {
      setIsReviewing(false);
    }
  };

  const availableYears = useMemo(() => {
    if (!assignments) return [];
    const yearsSet = new Set<number>();

    assignments.forEach(form => {
      if (form.assignedOn) {
        try {
          const date = new Date(form.assignedOn);
          if (!isNaN(date.getTime())) {
            yearsSet.add(date.getFullYear());
          }
        } catch (e) {
          // fallback
        }
      }
    });

    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [assignments]);

  const filteredForms = useMemo(() => {
    if (selectedYear === 'all') return assignments;
    return assignments.filter(form => {
      if (!form.assignedOn) return true;
      try {
        const date = new Date(form.assignedOn);
        if (!isNaN(date.getTime())) {
          return date.getFullYear().toString() === selectedYear;
        }
      } catch (e) {
        return true;
      }
      return true;
    });
  }, [assignments, selectedYear]);

  const progress = useMemo(() => {
    if (assignments.length === 0) return 0;
    const completed = assignments.filter(f => f.status === 'Approved').length;
    return Math.round((completed / assignments.length) * 100);
  }, [assignments]);

  const openReviewDialog = (form: any, action: 'approve' | 'reject') => {
    setSelectedForm(form);
    setFormAction(action);
    setIsReviewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 max-w-7xl mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading employee details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!employee) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Employee Not Found</h2>
            <Link to={`/${schoolSlug}/admin/employees`}>
              <Button variant="outline">Back to Employees</Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 max-w-7xl space-y-6 pb-12"
      >
        {/* Header Section */}
        <div className="mt-12 sm:mt-10 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0 bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                onClick={() => navigate(`/${schoolSlug}/admin/employees`)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-950 tracking-tight truncate">
                  {employee.firstName} {employee.lastName}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                  <MailIcon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-500 font-medium truncate">{employee.email}</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-[#EFF5FB] px-4 py-2 rounded-xl border border-blue-50 text-xs font-bold text-[#0F2D52] flex-shrink-0 max-w-[280px]">
              <MailIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{employee.email}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white h-fit">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900">Employee Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                  <Briefcase className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">Role</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{employee.employeeType || '—'}</div>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                  <CheckCircle className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">Phone</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{employee.phone || '—'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                  <FileText className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">Address</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5 whitespace-pre-wrap">{employee.address || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1 pt-1">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <span>Joined on {employee.joinedOn ? new Date(employee.joinedOn).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1">
                  <Badge variant={employee.status === 'active' ? 'success' : 'secondary'} className="rounded-md shadow-xs">
                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Forms */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Assigned Forms</CardTitle>
                  <p className="text-xs text-slate-450 font-semibold mt-0.5">
                    {filteredForms.length} form{filteredForms.length === 1 ? '' : 's'} assigned
                  </p>
                </div>
                {availableYears.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs font-semibold rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Filter by year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl">
                        <SelectItem value="all" className="cursor-pointer">All Years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year.toString()} className="cursor-pointer">
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-5 px-5 pb-5">
                
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                      {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-800 truncate">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="flex items-center mt-1">
                        <Badge
                          variant={progress === 100 ? 'success' : progress > 0 ? 'secondary' : 'outline'}
                          className="text-[10px] rounded-full px-2 py-0.5 font-bold"
                        >
                          {progress}% Completed
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {filteredForms.length > 0 ? (
                  <div className="space-y-4">
                    {filteredForms.map(form => (
                      <div key={form.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-200 transition-all">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                              <h3 className="font-bold text-sm text-slate-800 truncate">{form.formTitle}</h3>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StatusBadge status={form.status} />
                              <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                Assigned {new Date(form.assignedOn).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                              {form.formDescription}
                            </p>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 items-start sm:justify-end">
                            <Link to={`/${schoolSlug || 'goddard'}/admin/forms/view/${form.formId}`} state={{
                              form,
                              employeeId: employee.id,
                              employeeName: `${employee.firstName} ${employee.lastName}`,
                              returnPath: `/${schoolSlug || 'goddard'}/admin/employees/${employee.id}`,
                              filloutFormId: form.formId,
                              employeeFormAssignmentId: form.id,
                            }}>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>View Form</span>
                              </Button>
                            </Link>

                            {form.status === 'Submitted' && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 h-8 text-xs font-semibold shadow-xs"
                                  onClick={() => openReviewDialog(form, 'approve')}
                                >
                                  Approve
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-3 h-8 text-xs font-semibold"
                                  onClick={() => openReviewDialog(form, 'reject')}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">No forms assigned for this period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {formAction === 'approve' ? 'Approve' : 'Reject'} Form
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 text-sm text-slate-600">
              Are you sure you want to {formAction === 'approve' ? 'approve' : 'reject'} this form submission?
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleReviewAction}
                className={formAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                disabled={isReviewing}
              >
                {isReviewing ? 'Saving...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </AdminLayout>
  );
}
