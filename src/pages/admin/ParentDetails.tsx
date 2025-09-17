import React, { useState, Children } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail, Phone, Calendar, School, CheckCircle, XCircle, AlertCircle, Clock, FileText, ChevronLeft, ChevronRight, Eye, Edit } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
type FormStatus = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
interface Form {
  id: string;
  title: string;
  description: string;
  lastUpdated: string;
  status: FormStatus;
  link: string;
}
interface Child {
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
interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  children: Child[];
  familyForms: Form[];
}
export function ParentDetails() {
  const {
    parentId
  } = useParams<{
    parentId: string;
  }>();
  // Mock parent data - in a real app, you would fetch this based on parentId
  const [parent, setParent] = useState<Parent>({
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
      classroom: {
        id: '1',
        name: 'Sunshine Room'
      },
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
      classroom: {
        id: '2',
        name: 'Rainbow Room'
      },
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
  });
  const [selectedChildId, setSelectedChildId] = useState<string>(parent.children[0]?.id || '');
  const [isViewFormDialogOpen, setIsViewFormDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);
  const selectedChild = parent.children.find(child => child.id === selectedChildId) || parent.children[0];
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
    // Update the form status based on the action
    const newStatus: FormStatus = formAction === 'approve' ? 'Approved' : 'Needs Revision';
    // Check if it's a family form or child-specific form
    const isFamilyForm = parent.familyForms.some(form => form.id === selectedForm.id);
    if (isFamilyForm) {
      setParent({
        ...parent,
        familyForms: parent.familyForms.map(form => form.id === selectedForm.id ? {
          ...form,
          status: newStatus,
          lastUpdated: new Date().toLocaleDateString()
        } : form)
      });
    } else {
      setParent({
        ...parent,
        children: parent.children.map(child => ({
          ...child,
          forms: child.forms.map(form => form.id === selectedForm.id ? {
            ...form,
            status: newStatus,
            lastUpdated: new Date().toLocaleDateString()
          } : form)
        }))
      });
    }
    setIsReviewDialogOpen(false);
    setIsViewFormDialogOpen(false);
  };
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
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            {/* Parent Info Card */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle>Parent Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-xl mr-4">
                    {parent.firstName.charAt(0)}
                    {parent.lastName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {parent.firstName} {parent.lastName}
                    </h2>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Mail className="h-4 w-4 mr-2" />
                      <span>{parent.email}</span>
                    </div>
                    <div className="flex items-center text-gray-600 mt-1">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{parent.phone}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Children Selector */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle>Children</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parent.children.map(child => <div key={child.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${child.id === selectedChildId ? 'border-amazon-teal/50 bg-amazon-teal/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => setSelectedChildId(child.id)}>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold">
                          {child.firstName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <h3 className="font-medium">
                              {child.firstName} {child.lastName}
                            </h3>
                            <span className="text-sm text-amazon-teal font-medium">
                              {child.enrollmentProgress}% Complete
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>DOB: {child.dob}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <School className="h-3 w-3 mr-1" />
                            <span>{child.classroom.name}</span>
                          </div>
                          <div className="mt-2">
                            <Progress value={child.enrollmentProgress} className="h-2" />
                          </div>
                        </div>
                        {child.id === selectedChildId && <ChevronRight className="h-4 w-4 text-amazon-teal" />}
                      </div>
                    </div>)}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {/* Forms Tabs */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle>Forms & Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="child" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="child">
                      {selectedChild.firstName}'s Forms
                    </TabsTrigger>
                    <TabsTrigger value="family">Family Forms</TabsTrigger>
                  </TabsList>
                  <TabsContent value="child">
                    <div className="space-y-4">
                      {selectedChild.forms.map(form => <div key={form.id} className="p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex justify-between items-start">
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
                    </div>
                  </TabsContent>
                  <TabsContent value="family">
                    <div className="space-y-4">
                      {parent.familyForms.map(form => <div key={form.id} className="p-4 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex justify-between items-start">
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
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      {/* View Form Dialog */}
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
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => {
                  setIsViewFormDialogOpen(false);
                  openReviewDialog(selectedForm, 'reject');
                }}>
                      <AlertCircle className="h-4 w-4 mr-1" />
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
      {/* Review Form Dialog */}
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