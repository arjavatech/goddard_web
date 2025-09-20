import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail, Phone, Calendar, School, CheckCircle, AlertCircle, FileText, ChevronLeft, ChevronRight, Eye, Users } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { fetchUserContext } from '../../services/api/user';
import { fetchParentDetails, fetchSchoolEnrollments, fetchClassrooms } from '../../services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';

type FormStatus = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
interface Form {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  status: FormStatus;
  link: string;
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

const DEFAULT_PARENT: ParentDetailView = {
  id: '1',
  firstName: 'Sarah',
  lastName: 'Johnson',
  email: 'sarah.johnson@example.com',
  phone: '(555) 123-4567',
  children: [{
    id: '1',
    firstName: 'Emma',
    lastName: 'Johnson',
    dob: '05/12/2019',
    classroom: { id: '1', name: 'Sunshine Room' },
    forms: [{
      id: '1',
      title: 'Medical & Health Forms',
      description: 'Health history, immunizations, and medical authorizations',
      lastUpdated: 'May 12, 2023',
      status: 'Submitted',
      link: 'https://goddard.fillout.com/t/med-auth'
    }, {
      id: '2',
      title: 'Emergency Contact Information',
      description: 'Contacts for emergencies and authorized pickups',
      lastUpdated: 'May 14, 2023',
      status: 'In Progress',
      link: 'https://goddard.fillout.com/t/emergency'
    }, {
      id: '3',
      title: 'Photo Release Form',
      description: "Permission to use child's photos in school materials",
      lastUpdated: 'May 10, 2023',
      status: 'Approved',
      link: 'https://goddard.fillout.com/t/photo-release'
    }],
    enrollmentProgress: 67
  }, {
    id: '2',
    firstName: 'Jacob',
    lastName: 'Johnson',
    dob: '03/24/2017',
    classroom: { id: '2', name: 'Rainbow Room' },
    forms: [{
      id: '1',
      title: 'Medical & Health Forms',
      description: 'Health history, immunizations, and medical authorizations',
      lastUpdated: 'June 2, 2023',
      status: 'Approved',
      link: 'https://goddard.fillout.com/t/med-auth'
    }, {
      id: '2',
      title: 'Emergency Contact Information',
      description: 'Contacts for emergencies and authorized pickups',
      lastUpdated: 'June 3, 2023',
      status: 'Approved',
      link: 'https://goddard.fillout.com/t/emergency'
    }, {
      id: '3',
      title: 'Photo Release Form',
      description: "Permission to use child's photos in school materials",
      lastUpdated: 'June 1, 2023',
      status: 'Needs Revision',
      link: 'https://goddard.fillout.com/t/photo-release'
    }],
    enrollmentProgress: 83
  }],
  familyForms: [{
    id: '1',
    title: 'Admission Form',
    description: 'Basic information about your family',
    lastUpdated: 'May 10, 2023',
    status: 'Approved',
    link: 'https://goddard.fillout.com/t/admission'
  }, {
    id: '2',
    title: 'Parent Handbook Acknowledgment',
    description: "Confirmation that you've read and understood our policies",
    lastUpdated: 'May 15, 2023',
    status: 'Needs Revision',
    link: 'https://goddard.fillout.com/t/handbook'
  }, {
    id: '3',
    title: 'Enrollment Agreement',
    description: 'Terms and conditions for enrollment',
    lastUpdated: 'May 16, 2023',
    status: 'Draft',
    link: 'https://goddard.fillout.com/t/agreement'
  }]
};

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
  return { first, last };
};

export function ParentDetails() {
  const { parentId } = useParams<{ parentId: string }>();
  const [parent, setParent] = useState<ParentDetailView>(DEFAULT_PARENT);
  const [selectedChildId, setSelectedChildId] = useState<string>(DEFAULT_PARENT.children[0]?.id || '');
  const [isViewFormDialogOpen, setIsViewFormDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const user = await fetchUserContext();
        if (!user.schoolId || !parentId) return;
        const [parentDetails, enrollments, classrooms, templates] = await Promise.all([
          fetchParentDetails(user.schoolId).catch(() => []),
          fetchSchoolEnrollments(user.schoolId).catch(() => []),
          fetchClassrooms(user.schoolId).catch(() => []),
          fetchFormTemplates(user.schoolId).catch(() => [])
        ]);
        if (!isMounted) return;

        console.log(ParentDetails)

        const parentRecord = parentDetails.find(detail => detail.parentId === parentId);
        console.log(parentRecord)
        if (!parentRecord) return;

        const classroomByName = new Map(classrooms.map(cls => [cls.name.toLowerCase(), { id: cls.id, name: cls.name }]));
        const templateById = new Map(templates.map(template => [template.id, template]));

        const childEntries = enrollments.filter(child => {
          const emails = [child.primaryEmail, child.additionalParentEmail]
            .filter((email): email is string => Boolean(email))
            .map(email => email.toLowerCase());
          return emails.includes(parentRecord.email.toLowerCase());
        }).map(child => {
          const formsArray: Form[] = Object.entries(child.forms).map(([formId, status]) => {
            const template = templateById.get(formId);
            return {
              id: formId,
              title: template?.formName ?? formId,
              description: template?.formType ?? 'Enrollment form',
              lastUpdated: template?.createdAt ? new Date(template.createdAt).toLocaleDateString() : '—',
              status: mapToFormStatus(status),
              link: template?.filloutFormUrl ?? '#'
            } satisfies Form;
          });
          const completed = formsArray.filter(form => COMPLETION_STATUSES.has(form.status)).length;
          const progress = formsArray.length > 0 ? Math.round((completed / formsArray.length) * 100) : 0;
          const classroomInfo = classroomByName.get((child.className ?? 'Unassigned').toLowerCase()) ?? {
            id: child.className ?? 'Unassigned',
            name: child.className ?? 'Unassigned'
          };
          return {
            id: child.childId,
            firstName: child.firstName,
            lastName: child.lastName,
            dob: '—',
            classroom: classroomInfo,
            forms: formsArray,
            enrollmentProgress: progress
          } satisfies ChildInfo;
        });

        const familyFormMap = new Map<string, Form>();
        childEntries.forEach(child => {
          child.forms.forEach(form => {
            if (!familyFormMap.has(form.id) || form.status !== 'Approved') {
              familyFormMap.set(form.id, form);
            }
          });
        });

        const friendly = makeFriendlyName(parentRecord.email);
        setParent({
          id: parentRecord.parentId,
          firstName: friendly.first,
          lastName: friendly.last,
          email: parentRecord.email,
          phone: '—',
          children: childEntries.length > 0 ? childEntries : DEFAULT_PARENT.children,
          familyForms: familyFormMap.size > 0 ? Array.from(familyFormMap.values()) : DEFAULT_PARENT.familyForms
        });
        if (childEntries.length > 0) {
          setSelectedChildId(childEntries[0].id);
        }
      } catch (error) {
        console.warn('Failed to load parent details', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [parentId]);

  const selectedChild = useMemo(() => parent.children.find(child => child.id === selectedChildId) || parent.children[0], [parent.children, selectedChildId]);

  const openViewFormDialog = (form: Form) => {
    setSelectedForm(form);
    setIsViewFormDialogOpen(true);
  };
  const openReviewDialog = (form: Form, action: 'approve' | 'reject') => {
    setSelectedForm(form);
    setFormAction(action);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
  };
  const handleFormReview = () => {
    if (!selectedForm || !formAction) return;
    const newStatus: FormStatus = formAction === 'approve' ? 'Approved' : 'Needs Revision';
    setParent(current => ({
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
    }));
    setIsReviewDialogOpen(false);
    setIsViewFormDialogOpen(false);
  };
  console.log(parent)

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
                      {parent.children.length} child{parent.children.length === 1 ? '' : 'ren'}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass-card">
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Enrollment Progress</CardTitle>
                <Button variant="outline" size="sm">
                  <ChevronRight className="h-4 w-4 mr-1" />
                  View Timeline
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Child</p>
                    <p className="text-lg font-semibold">
                      {selectedChild?.firstName} {selectedChild?.lastName}
                    </p>
                  </div>
                  <Badge variant={selectedChild?.enrollmentProgress === 100 ? 'success' : 'secondary'}>
                    {selectedChild?.enrollmentProgress}% Complete
                  </Badge>
                </div>
                <Progress value={selectedChild?.enrollmentProgress ?? 0} className="h-2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-white/60">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">
                        Current Classroom
                      </div>
                      <div className="text-sm font-semibold">
                        {selectedChild?.classroom.name}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">
                        Required Forms
                      </div>
                      <div className="text-sm font-semibold">
                        {selectedChild?.forms.length ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60">
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground">
                        Completed Forms
                      </div>
                      <div className="text-sm font-semibold">
                        {selectedChild ? selectedChild.forms.filter(form => COMPLETION_STATUSES.has(form.status)).length : 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Family Forms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parent.familyForms.map(form => <div key={form.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                    <div>
                      <h3 className="font-medium">{form.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {form.lastUpdated}
                      </p>
                    </div>
                    <StatusBadge status={form.status} />
                  </div>)}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Enrollment packet approved (placeholder)
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Awaiting API activity feed
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Contact Log</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  No logged interactions yet.
                </div>
              </CardContent>
            </Card>
          </div>
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
                  {child.forms.map(form => <div key={form.id} className="border border-gray-100 rounded-lg p-4 bg-white">
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
                          <Button variant="outline" size="sm" onClick={() => openViewFormDialog(form)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          {form.status === 'Submitted' && <>
                              <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => openReviewDialog(form, 'approve')}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button variant="outline" size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => openReviewDialog(form, 'reject')}>
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Request Revision
                              </Button>
                            </>}
                        </div>
                      </div>
                    </div>)}
                </TabsContent>)}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isViewFormDialogOpen} onOpenChange={setIsViewFormDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedForm?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {selectedForm && <iframe src={selectedForm.link} className="w-full h-full border-0" title={selectedForm.title} />}
          </div>
          <DialogFooter>
            <div className="flex justify-between w-full">
              <div className="flex items-center">
                <span className="mr-2">Status:</span>
                {selectedForm && <StatusBadge status={selectedForm.status} />}
              </div>
              <div className="flex space-x-2">
                {selectedForm?.status === 'Submitted' && <>
                    <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => {
                  setIsViewFormDialogOpen(false);
                  openReviewDialog(selectedForm, 'approve');
                }}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm Approval
                    </Button>
                    <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
                  setIsViewFormDialogOpen(false);
                  openReviewDialog(selectedForm, 'reject');
                }}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Request Revision
                    </Button>
                  </>}
                <Button onClick={() => setIsViewFormDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
              </label>
              <Textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder={formAction === 'approve' ? 'Add any notes about this approval (optional)' : 'Explain what needs to be revised'} className="w-full" rows={4} />
            </div>
            <div className="p-3 rounded-md bg-gray-50 border border-gray-200">
              <p className="text-sm font-medium">
                {formAction === 'approve' ? 'This will approve the form and notify the parent.' : 'This will request revisions and notify the parent of required changes.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFormReview} className={formAction === 'approve' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-amber-600 hover:bg-amber-700 text-white'} disabled={formAction === 'reject' && !reviewNotes.trim()}>
              {formAction === 'approve' ? <>
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
