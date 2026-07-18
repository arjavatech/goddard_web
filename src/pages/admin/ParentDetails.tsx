import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
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
  return <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="icon"
            className="mr-3 sm:mr-4 h-8 w-8 sm:h-10 sm:w-10"
            onClick={() => {
              // Check if user came from students page
              const referrer = document.referrer;
              if (referrer.includes('/admin/students') || location.state?.fromStudents) {
                navigate('/admin/students');
              } else {
                navigate('/admin/parents');
              }
            }}
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">
            Parent Details
          </h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <MailIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">{parent.email}</span>
          </div>

        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Guardian Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center text-lg sm:text-2xl font-bold flex-shrink-0">
                {parent.firstName.charAt(0)}
                {parent.lastName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-semibold truncate">
                  {parent.firstName} {parent.lastName}
                </h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    {parent.children.length} child
                    {parent.children.length === 1 ? '' : 'ren'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    Member since TBD
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {parent.children.map(child => <Card key={child.id} className={`border ${child.id === selectedChildId ? 'border-amazon-teal' : 'border-transparent'} hover:border-amazon-teal transition-colors cursor-pointer`} onClick={() => setSelectedChildId(child.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {child.firstName} {child.lastName}
                      </div>
                      <div className="text-sm text-slate-500">
                        Classroom: {child.classroom.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        DOB: {child.dob}
                      </div>
                    </div>
                    <Badge variant={child.forms.every(f => f.status === 'Approved') ? 'success' : child.enrollmentProgress > 0 ? 'secondary' : 'outline'}>
                      {child.enrollmentProgress}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>)}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {(() => {
              const primaryEmail = parent.primaryParentEmail;
              const isPrimaryParent = parent.email === primaryEmail;
              
              return (
                <>
                  {/* Current Parent */}
                  <div className="flex items-center gap-2">
                    <MailIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">{parent.firstName} {parent.lastName}</div>
                      <div>{parent.email}</div>
                      <div className="text-xs text-muted-foreground">{isPrimaryParent ? 'Primary Parent' : 'Secondary Parent'}</div>
                    </div>
                  </div>

                  {/* Additional Parent - only show if exists */}
                  {parent.additionalParentEmail && (
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        {parent.additionalParentName && (
                          <div className="font-medium text-foreground">{parent.additionalParentName}</div>
                        )}
                        <div>{parent.additionalParentEmail}</div>
                        <div className="text-xs text-muted-foreground">{isPrimaryParent ? 'Secondary Parent' : 'Primary Parent'}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <School className="h-4 w-4" />
                    {isPrimaryParent ? 'Primary Guardian' : 'Secondary Guardian'}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <CardTitle className="text-base sm:text-lg">Child Forms</CardTitle>
            {availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Filter by year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={selectedChild?.id ?? ''} value={selectedChild?.id ?? ''} onValueChange={value => setSelectedChildId(value)}>
            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1">
              {parent.children.map(child => <TabsTrigger key={child.id} value={child.id} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2">
                <span className="sm:hidden">{child.firstName}</span>
                <span className="hidden sm:inline">{child.firstName} {child.lastName}</span>
              </TabsTrigger>)}
            </TabsList>
            {parent.children.map(child => {
              // Filter forms by selected year based on approvedOn date
              const filteredForms = selectedYear === 'all'
                ? child.forms
                : child.forms.filter(form => {
                  // Show forms that have approvedOn date matching the selected year
                  // Forms without approvedOn will also be shown (they appear in all year filters)
                  if (!form.approvedOn) return true; // Show non-approved forms in all year filters

                  try {
                    const date = new Date(form.approvedOn);
                    if (!isNaN(date.getTime())) {
                      return date.getFullYear().toString() === selectedYear;
                    }
                  } catch (e) {
                    // Try to extract year from string format (e.g., "2024-10-02T15:59:46.009750")
                    const yearMatch = form.approvedOn.match(/\d{4}/);
                    if (yearMatch) {
                      return yearMatch[0] === selectedYear;
                    }
                  }
                  return true; // If parsing fails, show the form
                });

              return <TabsContent key={child.id} value={child.id} className="mt-4 space-y-3">
                {child.childStatus === 'archive' ? (
                  <div className="border border-amber-200 rounded-lg p-8 bg-amber-50 text-center">
                    <AlertCircle className="h-12 w-12 mx-auto text-amber-600 mb-4" />
                    <h3 className="font-semibold text-amber-900 mb-2 text-lg">
                      The student is Archived
                    </h3>
                    <p className="text-sm text-amber-700">
                      Form viewing is disabled for archived students.
                    </p>
                  </div>
                ) : filteredForms && filteredForms.length > 0 ? filteredForms.map(form => <div key={form.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-amazon-teal flex-shrink-0" />
                        <h3 className="font-medium text-sm sm:text-base truncate">{form.title}</h3>
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={form.status} />
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {form.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Last updated: {form.lastUpdated}
                      </p>

                      {(() => {
                        if (!form.approvedOn) {
                          return (
                            <p className="text-xs text-gray-500 mt-1">
                              Approved on: —
                            </p>
                          );
                        }

                        try {
                          const date = new Date(form.approvedOn);
                          if (!isNaN(date.getTime())) {
                            return (
                              <p className="text-xs text-green-600 mt-1">
                                Approved on: {date.toLocaleDateString()} at {date.toLocaleTimeString()}
                              </p>
                            );
                          }
                        } catch (e) {
                          // Silently fail and show raw value
                        }

                        return (
                          <p className="text-xs text-green-600 mt-1">
                            Approved on: {form.approvedOn}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:space-x-2 sm:gap-0 flex-shrink-0">
                      {form.status === 'Approved' && form.recentPdfLink && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50"
                            onClick={() => handleDownload(form)}
                            disabled={loadingAction?.formId === form.id}
                            title="Download PDF"
                          >
                            {loadingAction?.formId === form.id && loadingAction?.action === 'download' ? (
                              <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-gray-600 border-gray-200 hover:bg-gray-50"
                            onClick={() => handlePrint(form)}
                            disabled={loadingAction?.formId === form.id}
                            title="Print PDF"
                          >
                            {loadingAction?.formId === form.id && loadingAction?.action === 'print' ? (
                              <span className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full" />
                            ) : (
                              <Printer className="h-4 w-4" />
                            )}
                          </Button>
                        </>
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
                        <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          <span className="hidden sm:inline">View Form</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                      </Link>
                      {form.status === 'Submitted' && <>
                        <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50 text-xs sm:text-sm" onClick={() => openReviewDialog(form, 'approve')}>
                          <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50 text-xs sm:text-sm" onClick={() => openReviewDialog(form, 'reject')}>
                          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                          Revise
                        </Button>
                      </>}
                    </div>
                  </div>
                </div>) : <div className="border border-gray-100 rounded-lg p-8 bg-white text-center">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="font-medium text-gray-900 mb-2">
                    No Forms Available
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedYear === 'all'
                      ? `No enrollment forms have been assigned to ${child.firstName} ${child.lastName} yet.`
                      : `No forms found for ${child.firstName} ${child.lastName} in ${selectedYear}.`
                    }
                  </p>
                </div>}
              </TabsContent>;
            })}
          </Tabs>
        </CardContent>
      </Card>
    </div>
    <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md" preventClose>
        <DialogHeader>
          <DialogTitle>
            {formAction === 'approve' ? 'Approve Form' : 'Request Revision'}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <p className="text-lg font-medium">{selectedForm?.title}</p>
            <p className="text-sm text-gray-600">
              {selectedForm?.description}
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              {formAction === 'approve' ? 'Approval Notes (Optional)' : 'Revision Notes'}
              {formAction === 'reject' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder={formAction === 'approve' ? 'Add any notes about this approval (optional)' : 'Explain what needs to be revised'} className={`w-full ${formAction === 'reject' && !reviewNotes.trim() ? 'border-red-300 focus:border-red-500' : ''}`} rows={4} maxLength={500} />
            <div className="flex justify-between mt-1">
              <div>
                {formAction === 'reject' && !reviewNotes.trim() && <p className="text-sm text-red-500">
                  Revision notes are required
                </p>}
              </div>
              <p className="text-xs text-gray-500">
                {reviewNotes.length}/500
              </p>
            </div>
          </div>
          <div className={`p-3 rounded-md border ${formAction === 'approve' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className="text-sm font-medium">
              {formAction === 'approve' ? '✓ This will approve the form and notify the parent via email.' : '⚠ This will request revisions and notify the parent of required changes.'}
            </p>
            {formAction === 'approve' && <p className="text-xs text-gray-600 mt-1">
              The parent will receive a confirmation email and can proceed
              with enrollment.
            </p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleFormReview} className={formAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'} disabled={formAction === 'reject' && !reviewNotes.trim() || isReviewing}>
            {isReviewing ? <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div> : formAction === 'approve' ? <>
              <CheckCircle className="h-4 w-4 mr-2" /> Confirm Approval
            </> : <>
              <AlertCircle className="h-4 w-4 mr-2" /> Request Revision
            </>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </AdminLayout>;
}