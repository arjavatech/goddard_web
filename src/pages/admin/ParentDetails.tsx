import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail, Phone, Calendar, School, CheckCircle, AlertCircle, FileText, ChevronLeft, Eye, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../components/ui/toast';
import { fetchUserContext } from '../../services/api/user';
import { fetchParentDetails, fetchSchoolEnrollments, fetchClassrooms } from '../../services/api/admin';
import { fetchFormTemplates, fetchEnrollmentChildren } from '../../services/api/dashboard';
import { reviewForm } from '../../services/api/forms';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';
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
}
interface ParentDetailView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  children: ChildInfo[];
  familyForms: Form[];
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
  const passedParentData = location.state?.parentData;
  const [parent, setParent] = useState<ParentDetailView | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const {
    addToast
  } = useToast();
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const user = await fetchUserContext();
        if (!user.schoolId || !parentId) return;
        // Always fetch from parent details API which has the forms data
        const parentDetails = await fetchParentDetails(user.schoolId).catch(() => []);
        let parentRecord = parentDetails.find(detail => detail.parentId === parentId) || null;
        // If not found in parent details, use passed data as fallback
        if (!parentRecord && passedParentData) {
          parentRecord = {
            parentId: passedParentData.id,
            email: passedParentData.email,
            firstName: passedParentData.firstName,
            lastName: passedParentData.lastName,
            isSigned: passedParentData.signupStatus === 'Complete',
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
          return;
        }
        const [, classrooms, templates] = await Promise.all([fetchSchoolEnrollments(user.schoolId).catch(() => []), fetchClassrooms(user.schoolId).catch(() => []), fetchFormTemplates(user.schoolId).catch(() => []), fetchEnrollmentChildren(user.schoolId).catch(() => [])]);
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
              const template = templates.find(t => t.id === form.formId || t.formName === form.formName || (t as any).form_name === form.formName);
              const formObj = {
                id: form.formId,
                title: form.formName,
                description: template?.formType || (template as any)?.form_type || 'Enrollment form',
                lastUpdated: template?.createdAt ? new Date(template.createdAt).toLocaleDateString() : '—',
                status: mapToFormStatus(form.status),
                link: form.recent_edit_link || form.fillout_form_id || form.filloutFormId || template?.filloutFormUrl || (template as any)?.fillout_form_url || '#',
                recentEditLink: form.recent_edit_link || null,
                filloutFormId: form.fillout_form_id || form.filloutFormId || template?.filloutFormUrl || (template as any)?.fillout_form_url || '#',
                studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || null
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
            enrollmentProgress: progress
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
        const finalParentData = {
          id: parentRecord.parentId,
          firstName: parentRecord.firstName || friendly.first,
          lastName: parentRecord.lastName || friendly.last,
          email: parentRecord.email,
          phone: '—',
          children: processedChildren,
          familyForms: Array.from(allForms.values())
        };
        setParent(finalParentData);
        if (processedChildren.length > 0) {
          setSelectedChildId(processedChildren[0].id);
        }
      } catch (error) {
        if (isMounted) {
          setError('Failed to load parent details. Please try again.');
          addToast({
            type: 'error',
            title: 'Loading Error',
            description: 'Failed to load parent details. Please refresh the page.'
          });
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
  const openReviewDialog = (form: Form, action: 'approve' | 'reject') => {
    setSelectedForm(form);
    setFormAction(action);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
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
        addToast({
          type: 'success',
          title: 'Form Review Completed',
          description: result.message
        });
      } else {
        addToast({
          type: 'error',
          title: 'Form Review Failed',
          description: result.message
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Review Error',
        description: 'Failed to review form. Please try again.'
      });
    } finally {
      setIsReviewing(false);
    }
    setIsReviewDialogOpen(false);
  };
  if (isLoading) {
    return <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading parent details...</p>
          </div>
        </div>
      </AdminLayout>;
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/admin/parents" className="mr-4">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">
              Parent Details
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {parent.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              {parent.phone}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle>Guardian Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center text-2xl font-bold">
                  {parent.firstName.charAt(0)}
                  {parent.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    {parent.firstName} {parent.lastName}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {parent.children.length} child
                      {parent.children.length === 1 ? '' : 'ren'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Member since TBD
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parent.children.map(child => <Card key={child.id} className={`border ${child.id === selectedChildId ? 'border-amazon-teal' : 'border-transparent'} hover:border-amazon-teal transition-colors cursor-pointer`} onClick={() => setSelectedChildId(child.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">
                            {child.firstName} {child.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Classroom: {child.classroom.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            DOB: {child.dob}
                          </div>
                        </div>
                        <Badge variant={child.enrollmentProgress === 100 ? 'success' : child.enrollmentProgress > 0 ? 'secondary' : 'outline'}>
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
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {parent.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {parent.phone || '—'}
              </div>
              <div className="flex items-center gap-2">
                <School className="h-4 w-4" />
                Primary Guardian
              </div>
            </CardContent>
          </Card>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Child Forms</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={selectedChild?.id ?? ''} value={selectedChild?.id ?? ''} onValueChange={value => setSelectedChildId(value)}>
              <TabsList className="w-full justify-start overflow-x-auto">
                {parent.children.map(child => <TabsTrigger key={child.id} value={child.id} className="whitespace-nowrap">
                    {child.firstName} {child.lastName}
                  </TabsTrigger>)}
              </TabsList>
              {parent.children.map(child => <TabsContent key={child.id} value={child.id} className="mt-4 space-y-3">
                  {child.forms && child.forms.length > 0 ? child.forms.map(form => <div key={form.id} className="border border-gray-100 rounded-lg p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center">
                              <FileText className="h-5 w-5 mr-2 text-amazon-teal" />
                              <h3 className="font-medium">{form.title}</h3>
                            </div>
                            <StatusBadge status={form.status} />
                            <p className="text-sm text-gray-600 mt-1">
                              {form.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Last updated: {form.lastUpdated}
                            </p>
                          </div>
                          <div className="flex space-x-2">
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
                      studentFormAssignmentId: form.studentFormAssignmentId
                    }}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Form
                              </Button>
                            </Link>
                            {form.status === 'Submitted' && <>
                                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => openReviewDialog(form, 'approve')}>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => openReviewDialog(form, 'reject')}>
                                  <AlertCircle className="h-4 w-4 mr-1" />
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
                        No enrollment forms have been assigned to{' '}
                        {child.firstName} {child.lastName} yet.
                      </p>
                    </div>}
                </TabsContent>)}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
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