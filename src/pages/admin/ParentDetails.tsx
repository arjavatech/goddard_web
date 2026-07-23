import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail as MailIcon, Calendar, School, CheckCircle, AlertCircle, FileText, ChevronLeft, Eye, Users, Download, Printer } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../contexts/ToastContext';
import { fetchParentDetails, fetchSchoolEnrollments, fetchClassrooms } from '../../services/api/admin';
import { fetchFormTemplates, fetchEnrollmentChildren } from '../../services/api/dashboard';
import { reviewForm } from '../../services/api/forms';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';
import { Loading } from '../../components/ui/loading';
type FormStatus = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
interface Form {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  status: FormStatus;
  link: string;
  recentEditLink: string | null;
  filloutFormId: string;
  studentFormAssignmentId: string | null;
  recentPdfLink: string | null;
  approvedOn: string | null;
}
interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  classroom: {
    id: string;
    name: string;
  };
  forms: Form[];
  enrollmentProgress: number;
  childStatus: 'active' | 'archive';
}
interface ParentDetailView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  children: ChildInfo[];
  familyForms: Form[];
  additionalParentEmail?: string | null;
  additionalParentName?: string | null;
  primaryParentEmail?: string | null;
  secondaryParentEmail?: string | null;
}
const mapToFormStatus = (value: string | null | undefined): FormStatus => {
  const normalized = normalizeFormStatus(value);
  switch (normalized) {
    case 'Approved':
      return 'Approved';
    case 'Submitted':
      return 'Submitted';
    case 'Needs Revision':
      return 'Needs Revision';
    case 'Draft':
      return 'Draft';
    default:
      return 'In Progress';
  }
};
const isInvalidFormId = (id: string | null | undefined): boolean => {
  if (!id) return true;
  const trimmed = id.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === '#' ||
    trimmed === 'test' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'placeholder' ||
    trimmed === 'none' ||
    trimmed === 'dummy' ||
    (trimmed.length < 4 && !/^https?:\/\//i.test(trimmed))
  );
};
const makeFriendlyName = (email: string) => {
  const local = email.split('@')[0] ?? 'guardian';
  const parts = local.replace(/[._]/g, ' ').split(' ').filter(Boolean);
  const first = parts[0] ? parts[0][0].toUpperCase() + parts[0].slice(1) : 'Guardian';
  const last = parts.slice(1).map(part => part[0].toUpperCase() + part.slice(1)).join(' ') || 'Family';
  return {
    first,
    last
  };
};
export function ParentDetails() {
  const {
    parentId
  } = useParams<{
    parentId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const passedParentData = location.state?.parentData;
  const [parent, setParent] = useState<ParentDetailView | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{ formId: string, action: 'download' | 'print' } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const { showToast } = useToast();


  const schoolId = localStorage.getItem('schoolId');
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        // const user = await fetchUserContext();
        if (!schoolId || !parentId) return;
        // Always fetch from parent details API which has the forms data
        const parentDetailsResponse = await fetchParentDetails(schoolId).catch(() => ({ activeParents: [], inactiveParents: [] }));
        // Search in both active and inactive parents
        let parentRecord = parentDetailsResponse.activeParents.find(detail => detail.parentId === parentId)
          || parentDetailsResponse.inactiveParents.find(detail => detail.parentId === parentId)
          || null;
        // If not found in parent details, use passed data as fallback
        if (!parentRecord && passedParentData) {
          parentRecord = {
            parentId: passedParentData.id,
            email: passedParentData.email,
            firstName: passedParentData.firstName,
            lastName: passedParentData.lastName,
            signedStatus: passedParentData.signupStatus === 'Signed' ? 'signed' : 'not signed',
            createdAt: null,
            children: passedParentData.children.map((child: any) => ({
              childId: child.id,
              childFullName: `${child.firstName} ${child.lastName}`,
              childDob: child.dob,
              classroomId: child.classroom.id,
              classroomName: child.classroom.name,
              enrollmentId: child.id,
              forms: []
            }))
          };
        }
        if (!parentRecord) {
          if (isMounted) {
            window.location.href = '/admin/parents';
          }
          return;
        }
        const [, classrooms, templates] = await Promise.all([fetchSchoolEnrollments(schoolId).catch(() => []), fetchClassrooms(schoolId).catch(() => []), fetchFormTemplates(schoolId).catch(() => []), fetchEnrollmentChildren(schoolId).catch(() => [])]);
        if (!isMounted) return;
        const classroomByName = new Map(classrooms.map(cls => [cls.name.toLowerCase(), {
          id: cls.id,
          name: cls.name
        }]));
        // Process children directly from parent record which has forms data
        const processedChildren = parentRecord.children?.map((child: any) => {
          let formsArray: Form[] = [];
          // Only use the child's specific forms array - no fallback to templates
          if (child.forms && Array.isArray(child.forms) && child.forms.length > 0) {
            formsArray = child.forms.map((form: any) => {
              // Find template by matching form ID or name
              const formId = form.form_id || form.formId;
              const formName = form.form_name || form.formName;
              const template = templates.find(t => t.id === formId || t.formName === formName || (t as any).form_name === formName);
              const formObj = {
                id: formId,
                title: formName,
                description: template?.formType || (template as any)?.form_type || 'Enrollment form',
                lastUpdated: template?.createdAt ? new Date(template.createdAt).toLocaleDateString() : '—',
                status: mapToFormStatus(form.status),
                link: (!isInvalidFormId(form.recent_edit_link) ? form.recent_edit_link : null) ||
                  (!isInvalidFormId(form.fillout_form_id) ? form.fillout_form_id : null) ||
                  (!isInvalidFormId(form.filloutFormId) ? form.filloutFormId : null) ||
                  template?.filloutFormUrl ||
                  (template as any)?.fillout_form_url ||
                  '#',
                recentEditLink: !isInvalidFormId(form.recent_edit_link) ? form.recent_edit_link : null,
                filloutFormId: (!isInvalidFormId(form.fillout_form_id) ? form.fillout_form_id : null) ||
                  (!isInvalidFormId(form.filloutFormId) ? form.filloutFormId : null) ||
                  template?.filloutFormUrl ||
                  (template as any)?.fillout_form_url ||
                  '#',
                studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || null,
                recentPdfLink: form.recent_pdf_link || form.recentPdfLink || null,
                approvedOn: form.approved_on || form.approvedOn || null
              } satisfies Form;



              return formObj;
            });
          }
          const completed = formsArray.filter(form => COMPLETION_STATUSES.has(form.status)).length;
          const progress = formsArray.length > 0 ? Math.round(completed / formsArray.length * 100) : 0;
          const classroomInfo = classroomByName.get((child.classroomName ?? 'Unassigned').toLowerCase()) ?? {
            id: child.classroomId ?? 'Unassigned',
            name: child.classroomName ?? 'Unassigned'
          };
          const [firstName, ...lastNameParts] = child.childFullName.split(' ');
          return {
            id: child.childId,
            firstName: firstName || 'Unknown',
            lastName: lastNameParts.join(' ') || 'Child',
            dob: child.childDob || '—',
            classroom: classroomInfo,
            forms: formsArray,
            enrollmentProgress: progress,
            childStatus: (child.childStatus || 'active') as 'active' | 'archive'
          } satisfies ChildInfo;
        }) || [];
        // Create family forms from all unique forms across children
        const allForms = new Map<string, Form>();
        processedChildren.forEach((child: ChildInfo) => {
          child.forms.forEach((form: Form) => {
            allForms.set(form.id, form);
          });
        });
        const friendly = makeFriendlyName(parentRecord.email);

        // Find additional parent email and name from children
        // The additional parent is whichever email (primary or secondary) differs from the main parent_email
        const firstChild = parentRecord.children?.[0];
        let additionalParentEmail: string | null = null;
        let additionalParentName: string | null = null;

        if (firstChild) {
          const primaryEmail = (firstChild as any).primaryParentEmail;
          const secondaryEmail = (firstChild as any).secondaryParentEmail;

          // Check if primary parent email differs from main parent email
          if (primaryEmail && primaryEmail !== parentRecord.email) {
            additionalParentEmail = primaryEmail;
            const firstName = (firstChild as any).primaryParentFirstName || '';
            const lastName = (firstChild as any).primaryParentLastName || '';
            additionalParentName = `${firstName} ${lastName}`.trim() || null;
          }
          // Or if secondary parent email exists and differs
          else if (secondaryEmail && secondaryEmail !== parentRecord.email) {
            additionalParentEmail = secondaryEmail;
            const firstName = (firstChild as any).secondaryParentFirstName || '';
            const lastName = (firstChild as any).secondaryParentLastName || '';
            additionalParentName = `${firstName} ${lastName}`.trim() || null;
          }
        }

        const finalParentData = {
          id: parentRecord.parentId,
          firstName: parentRecord.firstName || friendly.first,
          lastName: parentRecord.lastName || friendly.last,
          email: parentRecord.email,
          phone: '—',
          children: processedChildren,
          familyForms: Array.from(allForms.values()),
          additionalParentEmail,
          additionalParentName,
          primaryParentEmail: firstChild ? (firstChild as any).primaryParentEmail : null,
          secondaryParentEmail: firstChild ? (firstChild as any).secondaryParentEmail : null
        };
        setParent(finalParentData);
        if (processedChildren.length > 0) {
          // Check if there's a selectedChildId in route state first
          const routeSelectedChildId = location.state?.selectedChildId;

          if (routeSelectedChildId) {
            // Find child by ID from route state
            const targetChild = processedChildren.find(child => child.id === routeSelectedChildId);
            if (targetChild) {
              setSelectedChildId(targetChild.id);
            } else {
              setSelectedChildId(processedChildren[0].id);
            }
          } else {
            // Fallback to student query parameter
            const urlParams = new URLSearchParams(location.search);
            const studentName = urlParams.get('student');

            if (studentName) {
              // Find child by matching name
              const targetChild = processedChildren.find(child =>
                `${child.firstName} ${child.lastName}` === decodeURIComponent(studentName)
              );
              if (targetChild) {
                setSelectedChildId(targetChild.id);
              } else {
                setSelectedChildId(processedChildren[0].id);
              }
            } else {
              setSelectedChildId(processedChildren[0].id);
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to load parent details. Please try again.');
          showToast('error', 'Failed to load parent details');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [parentId]);
  const selectedChild = useMemo(() => parent?.children.find(child => child.id === selectedChildId) || parent?.children[0], [parent?.children, selectedChildId]);

  // Extract all available years from forms based on approved_on date
  const availableYears = useMemo(() => {
    if (!parent) return [];
    const yearsSet = new Set<number>();

    parent.children.forEach(child => {
      child.forms.forEach(form => {
        if (form.approvedOn) {
          try {
            const date = new Date(form.approvedOn);
            if (!isNaN(date.getTime())) {
              yearsSet.add(date.getFullYear());
            }
          } catch (e) {
            const yearMatch = form.approvedOn.match(/\d{4}/);
            if (yearMatch) {
              yearsSet.add(parseInt(yearMatch[0]));
            }
          }
        }
      });
    });

    // Always include current year to ensure filter is always visible
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);

    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [parent]);
  const openReviewDialog = (form: Form, action: 'approve' | 'reject') => {
    setSelectedForm(form);
    setFormAction(action);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
  };

  const handleDownload = async (form: Form) => {
    if (!form.recentPdfLink) return;

    setLoadingAction({ formId: form.id, action: 'download' });

    try {
      // Fetch the PDF as a blob
      const response = await fetch(form.recentPdfLink);
      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.title.replace(/\s+/g, '_')}_${selectedChild?.firstName}_${selectedChild?.lastName}.pdf`;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('success', `${form.title} downloading...`);
    } catch (error) {
      console.error('Download failed:', error);
      showToast('error', 'Download failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrint = async (form: Form) => {
    if (!form.recentPdfLink) return;

    setLoadingAction({ formId: form.id, action: 'print' });

    try {
      // Fetch the PDF as a blob first
      const response = await fetch(form.recentPdfLink);
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Open in new window and trigger print
      const printWindow = window.open(blobUrl, '_blank');

      if (printWindow) {
        // Wait for the PDF to load in the new window
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();

            // Close the window after print dialog is closed
            printWindow.onafterprint = () => {
              printWindow.close();
              window.URL.revokeObjectURL(blobUrl);
            };
          }, 1000);
        };

        // Set timeout to clean up
        setTimeout(() => {
          setLoadingAction(null);
          window.URL.revokeObjectURL(blobUrl);
        }, 3000);

        showToast('success', 'Print dialog opening...');
      } else {
        throw new Error('Popup blocked');
      }

    } catch (error) {
      console.error('Print failed:', error);

      // Fallback: Open PDF in new tab for manual print
      const printWindow = window.open(form.recentPdfLink, '_blank');
      if (printWindow) {
        showToast('success', 'Use Ctrl+P to print');
      } else {
        showToast('error', 'Print failed - enable popups');
      }

      setLoadingAction(null);
    }
  };
  const handleFormReview = async () => {
    if (!selectedForm || !formAction || !selectedChild) return;
    setIsReviewing(true);
    try {
      const result = await reviewForm({
        formId: selectedForm.id,
        childId: selectedChild.id,
        action: formAction,
        notes: reviewNotes
      });
      if (result.success) {
        const newStatus: FormStatus = result.updatedStatus as FormStatus;
        setParent(current => {
          if (!current) return current;
          return {
            ...current,
            familyForms: current.familyForms.map(form => form.id === selectedForm.id ? {
              ...form,
              status: newStatus,
              lastUpdated: new Date().toLocaleDateString()
            } : form),
            children: current.children.map(child => ({
              ...child,
              forms: child.forms.map(form => form.id === selectedForm.id ? {
                ...form,
                status: newStatus,
                lastUpdated: new Date().toLocaleDateString()
              } : form)
            }))
          };
        });
        showToast('success', 'Form review completed');
      } else {
        showToast('error', 'Form review failed');
      }
    } catch (error) {
      showToast('error', 'Failed to review form');
    } finally {
      setIsReviewing(false);
    }
    setIsReviewDialogOpen(false);
  };
  if (isLoading) {
    return <AdminLayout><Loading message="Loading parent details..." /></AdminLayout>;
  }
  if (!parent) {
    return <AdminLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Parent Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested parent could not be found.
          </p>
          <Link to="/admin/parents">
            <Button variant="outline">Back to Parents</Button>
          </Link>
        </div>
      </div>
    </AdminLayout>;
  }
  if (error) {
    return <AdminLayout>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Error Loading Parent Details
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    </AdminLayout>;
  }
  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl space-y-6 pb-12"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-12 sm:mt-10 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center">
            <Button
              variant="outline"
              size="icon"
              className="mr-3 h-9 w-9 bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 rounded-xl transition-all h-9"
              onClick={() => {
                const referrer = document.referrer;
                if (referrer.includes('/admin/students') || location.state?.fromStudents) {
                  navigate('/admin/students');
                } else {
                  navigate('/admin/parents');
                }
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                Parent Details
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 sm:hidden">{parent.email}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-[#EFF5FB] px-4 py-2 rounded-xl border border-blue-50 text-xs font-bold text-[#0F2D52]">
            <MailIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{parent.email}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2 border border-slate-100 rounded-2xl shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm font-bold text-slate-900">Guardian Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-md shadow-[#0F2D52]/10">
                {parent.firstName.charAt(0)}
                {parent.lastName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                  {parent.firstName} {parent.lastName}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1 text-xs font-semibold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {parent.children.length} child{parent.children.length === 1 ? '' : 'ren'}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {parent.children.map(child => {
                const isActive = child.id === selectedChildId;
                return (
                  <Card 
                    key={child.id} 
                    className={`border transition-all duration-200 cursor-pointer shadow-xs rounded-xl ${
                      isActive 
                        ? 'border-[#0F2D52] ring-2 ring-[#0F2D52]/5 bg-[#EFF5FB]/10' 
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                    }`} 
                    onClick={() => setSelectedChildId(child.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-800 truncate">
                            {child.firstName} {child.lastName}
                          </div>
                          <div className="text-xs text-slate-400 font-semibold mt-1 truncate">
                            Class: {child.classroom.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            DOB: {child.dob}
                          </div>
                        </div>
                        <Badge 
                          variant={child.forms.every(f => f.status === 'Approved') ? 'success' : child.enrollmentProgress > 0 ? 'secondary' : 'outline'}
                          className="text-[10px] rounded-full px-2 py-0.5 font-bold flex-shrink-0"
                        >
                          {child.enrollmentProgress}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border border-slate-100 rounded-2xl shadow-xs bg-white">
          <CardHeader className="pb-3 border-b border-slate-50">
            <CardTitle className="text-sm font-bold text-slate-900">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {(() => {
              const primaryEmail = parent.primaryParentEmail;
              const isPrimaryParent = parent.email === primaryEmail;
              
              return (
                <div className="space-y-4">
                  {/* Current Parent */}
                  <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                    <MailIcon className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-xs truncate">{parent.firstName} {parent.lastName}</div>
                      <div className="text-xs text-slate-500 font-medium truncate mt-0.5">{parent.email}</div>
                      <div className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{isPrimaryParent ? 'Primary Parent' : 'Secondary Parent'}</div>
                    </div>
                  </div>

                  {/* Additional Parent - only show if exists */}
                  {parent.additionalParentEmail && (
                    <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                      <MailIcon className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                      <div className="min-w-0">
                        {parent.additionalParentName && (
                          <div className="font-bold text-slate-800 text-xs truncate">{parent.additionalParentName}</div>
                        )}
                        <div className="text-xs text-slate-500 font-medium truncate mt-0.5">{parent.additionalParentEmail}</div>
                        <div className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{isPrimaryParent ? 'Secondary Parent' : 'Primary Parent'}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1 pt-1">
                    <School className="h-4 w-4 text-slate-400" />
                    <span>{isPrimaryParent ? 'Primary Guardian' : 'Secondary Guardian'}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      <Card className="glass-card border border-slate-100 rounded-2xl shadow-xs bg-white">
        <CardHeader className="pb-3 border-b border-slate-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-bold text-slate-900">Child Forms</CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <Tabs defaultValue={selectedChild?.id ?? ''} value={selectedChild?.id ?? ''} onValueChange={value => setSelectedChildId(value)}>
            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-slate-100/60 border border-slate-100 rounded-xl mb-4">
              {parent.children.map(child => (
                <TabsTrigger 
                  key={child.id} 
                  value={child.id} 
                  className="whitespace-nowrap text-xs font-bold px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#0F2D52] data-[state=active]:shadow-sm transition-all"
                >
                  <span className="sm:hidden">{child.firstName}</span>
                  <span className="hidden sm:inline">{child.firstName} {child.lastName}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {parent.children.map(child => {
              const filteredForms = selectedYear === 'all'
                ? child.forms
                : child.forms.filter(form => {
                  if (!form.approvedOn) return true;
                  try {
                    const date = new Date(form.approvedOn);
                    if (!isNaN(date.getTime())) {
                      return date.getFullYear().toString() === selectedYear;
                    }
                  } catch (e) {
                    const yearMatch = form.approvedOn.match(/\d{4}/);
                    if (yearMatch) {
                      return yearMatch[0] === selectedYear;
                    }
                  }
                  return true;
                });

              return (
                <TabsContent key={child.id} value={child.id} className="mt-0 space-y-3 outline-none">
                  {child.childStatus === 'archive' ? (
                    <div className="border border-amber-100 rounded-xl p-8 bg-amber-50/50 text-center">
                      <AlertCircle className="h-10 w-10 mx-auto text-amber-500 mb-3" />
                      <h3 className="font-bold text-amber-950 mb-1 text-base">
                        The student is Archived
                      </h3>
                      <p className="text-xs text-amber-700 font-semibold">
                        Form viewing is disabled for archived students.
                      </p>
                    </div>
                  ) : filteredForms && filteredForms.length > 0 ? (
                    filteredForms.map(form => (
                      <div key={form.id} className="border border-slate-100 rounded-xl p-4 bg-white hover:shadow-xs transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                              <h3 className="font-bold text-sm text-slate-800 truncate">{form.title}</h3>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StatusBadge status={form.status} />
                              {form.approvedOn && (() => {
                                try {
                                  const date = new Date(form.approvedOn);
                                  if (!isNaN(date.getTime())) {
                                    return (
                                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                        Approved {date.toLocaleDateString()}
                                      </span>
                                    );
                                  }
                                } catch (e) {
                                  console.log('Error parsing approved date:', e);
                                }
                                return (
                                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    Approved {form.approvedOn}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                              {form.description}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-2">
                              Last updated: {form.lastUpdated}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
                            {form.status === 'Approved' && form.recentPdfLink && (
                              <div className="flex gap-1.5">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-[#0F2D52] border-slate-200 hover:bg-slate-50 rounded-lg"
                                  onClick={() => handleDownload(form)}
                                  disabled={loadingAction?.formId === form.id}
                                  title="Download PDF"
                                >
                                  {loadingAction?.formId === form.id && loadingAction?.action === 'download' ? (
                                    <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                                  ) : (
                                    <Download className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg"
                                  onClick={() => handlePrint(form)}
                                  disabled={loadingAction?.formId === form.id}
                                  title="Print PDF"
                                >
                                  {loadingAction?.formId === form.id && loadingAction?.action === 'print' ? (
                                    <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full" />
                                  ) : (
                                    <Printer className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                            <Link to={`/admin/forms/view/${form.id}`} state={{
                              form,
                              childId: selectedChild?.id,
                              childName: `${selectedChild?.firstName} ${selectedChild?.lastName}`,
                              classDetails: selectedChild?.classroom?.name || 'Unassigned',
                              parentId: parent.id,
                              returnPath: `/admin/parents/${parentId}`,
                              filloutFormUrl: form.link,
                              recentEditLink: form.recentEditLink,
                              filloutFormId: form.filloutFormId,
                              studentFormAssignmentId: form.studentFormAssignmentId,
                              recentPdfLink: form.recentPdfLink
                            }}>
                              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                <span>View Form</span>
                              </Button>
                            </Link>
                            {form.status === 'Submitted' && (
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-xs font-bold" onClick={() => openReviewDialog(form, 'approve')}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100/50 text-xs font-bold" onClick={() => openReviewDialog(form, 'reject')}>
                                  <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                  Revise
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="border border-slate-100 rounded-xl p-8 bg-white text-center shadow-xs">
                      <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <h3 className="font-bold text-slate-800 mb-1 text-sm">
                        No Forms Available
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold max-w-xs mx-auto">
                        {selectedYear === 'all'
                          ? `No enrollment forms have been assigned to ${child.firstName} ${child.lastName} yet.`
                          : `No forms found for ${child.firstName} ${child.lastName} in ${selectedYear}.`
                        }
                      </p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
      </motion.div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {formAction === 'approve' ? 'Approve Form' : 'Request Revision'}
            </DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="font-bold text-slate-800 text-sm">{selectedForm?.title}</p>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                {selectedForm?.description}
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                {formAction === 'approve' ? 'Approval Notes (Optional)' : 'Revision Notes'}
                {formAction === 'reject' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Textarea 
                value={reviewNotes} 
                onChange={e => setReviewNotes(e.target.value)} 
                placeholder={formAction === 'approve' ? 'Add any notes about this approval (optional)' : 'Explain what needs to be revised'} 
                className={`w-full rounded-xl border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white ${formAction === 'reject' && !reviewNotes.trim() ? 'border-red-300 focus:ring-red-100/50 focus:border-red-400' : ''}`} 
                rows={4} 
                maxLength={500} 
              />
              <div className="flex justify-between items-center text-[10px]">
                <div>
                  {formAction === 'reject' && !reviewNotes.trim() && (
                    <p className="text-red-500 font-bold">
                      Revision notes are required
                    </p>
                  )}
                </div>
                <p className="text-slate-400 font-bold">
                  {reviewNotes.length}/500
                </p>
              </div>
            </div>
            <div className={`p-3 rounded-xl border text-xs font-semibold ${formAction === 'approve' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-amber-50/50 border-amber-100 text-amber-800'}`}>
              <p className="font-bold">
                {formAction === 'approve' ? '✓ This will approve the form and notify the parent via email.' : '⚠ This will request revisions and notify the parent of required changes.'}
              </p>
              {formAction === 'approve' && (
                <p className="text-[10px] text-emerald-600 mt-1">
                  The parent will receive a confirmation email and can proceed with enrollment.
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsReviewDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFormReview} 
              className={`h-10 rounded-xl text-xs font-bold px-4 text-white ${formAction === 'approve' ? 'bg-[#0F2D52] hover:bg-[#1E4B83]' : 'bg-amber-600 hover:bg-amber-700'}`} 
              disabled={formAction === 'reject' && !reviewNotes.trim() || isReviewing}
            >
              {isReviewing ? (
                <div className="flex items-center gap-1.5">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  <span>Processing...</span>
                </div>
              ) : formAction === 'approve' ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> 
                  <span>Confirm Approval</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> 
                  <span>Request Revision</span>
                </div>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}