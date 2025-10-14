import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Calendar, User, School, ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Loading } from '../../components/ui/loading';
import { reviewStudentFormAssignment } from '../../services/api/admin';
import { useAuth } from '../../services/auth/useAuth';
import { Toast } from '../../components/ui/toast';

export function FormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [toast, setToast] = useState<{
    open: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ open: false, type: 'success', title: '', message: '' });
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for approval actions and notes
  const [notes, setNotes] = useState('');

  // Get the form data and navigation state from the location state
  const formData = location.state?.form;

  // Check if form is reviewable (only when status is in_progress or submitted)
  // Handle both normalized and raw status values
  const isReviewable = formData?.status === 'In Progress' ||
                       formData?.status === 'Submitted' ||
                       formData?.status === 'in_progress' ||
                       formData?.status === 'in progress' ||
                       formData?.status === 'submitted';
  const childName = location.state?.childName;
  const classDetails = location.state?.classDetails || 'Unassigned Class';
  const returnPath = location.state?.returnPath || '/admin/parents';
  const filloutFormUrl = location.state?.filloutFormUrl;
  const recentEditLink = location.state?.recentEditLink;
  const filloutFormId = location.state?.filloutFormId;
  const studentFormAssignmentId = location.state?.studentFormAssignmentId;

  // Determine which URL to use based on form status
  const getFormUrl = () => {

    // Priority 1: Use recent_edit_link if form is filled (has existing submission)
    // Check for truthy value and not '#' and not null and not undefined
    if (recentEditLink &&
        recentEditLink !== '#' &&
        recentEditLink !== null &&
        recentEditLink !== undefined &&
        recentEditLink.trim() !== '') {
      return recentEditLink;
    } else {
    }

    // Priority 2: Use fillout_form_id if form is empty (no existing submission)
    if (filloutFormId &&
        filloutFormId !== '#' &&
        filloutFormId !== null &&
        filloutFormId !== undefined &&
        filloutFormId.trim() !== '') {
      return filloutFormId;
    }

    // Fallback: Use the original filloutFormUrl or form link
    const fallbackUrl = filloutFormUrl || formData?.link;
    return fallbackUrl;
  };

  // Handle back button click
  const handleBack = () => {
    navigate(returnPath);
  };

  // Handle form approval
  const handleApprove = async () => {
    if (!studentFormAssignmentId) {
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Unable to approve form: Assignment ID is missing'
      });
      return;
    }

    if (!user?.id) {
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Unable to approve form: User not authenticated'
      });
      return;
    }

    setIsProcessing(true);
    try {
      await reviewStudentFormAssignment(
        studentFormAssignmentId,
        'approved',
        notes,
        user.id
      );

      setToast({
        open: true,
        type: 'success',
        title: '',
        message: 'Form approved successfully'
      });

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(returnPath);
      }, 1500);
    } catch (error) {
      console.error('Error approving form:', error);
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Failed to approve form'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle form rejection
  const handleReject = async () => {
    if (!studentFormAssignmentId) {
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Unable to reject form: Assignment ID is missing'
      });
      return;
    }

    if (!user?.id) {
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Unable to reject form: User not authenticated'
      });
      return;
    }

    if (!notes.trim()) {
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Please provide notes when rejecting a form'
      });
      return;
    }

    setIsProcessing(true);
    try {
      await reviewStudentFormAssignment(
        studentFormAssignmentId,
        'rejected',
        notes,
        user.id
      );

      setToast({
        open: true,
        type: 'success',
        title: '',
        message: 'Form rejected with notes'
      });

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(returnPath);
      }, 1500);
    } catch (error) {
      console.error('Error rejecting form:', error);
      setToast({
        open: true,
        type: 'error',
        title: '',
        message: 'Failed to reject form'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  if (!formData) {
    return <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack} size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Form Not Found</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <p>
                  The form information could not be found. Please go back and
                  try again.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>;
  }


  const selectedUrl = getFormUrl();
  return <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack} size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center">
              {childName && <div className="flex items-center text-gray-600 mr-4">
                  <User className="h-4 w-4 mr-2" />
                  <span>{childName}</span>
                  <span className="mx-1">•</span>
                  <School className="h-4 w-4 mx-1" />
                  <span>{classDetails}</span>
                </div>}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              Last updated: {formData.lastUpdated}
            </div>
            <div className="mt-1">
              <StatusBadge status={formData.status} />
            </div>
          </div>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-4 flex justify-between items-start gap-4">
              <h2 className="text-xl font-bold">{formData.title}</h2>
              <div className="flex items-center gap-3">
                <Textarea
                  placeholder="Add notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] w-64 text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleApprove}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                    disabled={!isReviewable || isProcessing}
                  >
                    {isProcessing ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleReject}
                    variant="destructive"
                    size="sm"
                    disabled={!isReviewable || isProcessing}
                  >
                    {isProcessing ? (
                      <span className="flex items-center">
                        <span className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
            {/* Form container with dynamic height */}
            <div className="mt-6 rounded-md">
              {(() => {
                if (selectedUrl && selectedUrl !== '#') {
                  return (
                    <div className="relative">
                      {isFrameLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md">
                          <Loading message="Loading form..." size="md" />
                        </div>
                      )}
                      <iframe
                        src={selectedUrl}
                        style={{
                          width: '100%',
                          height: '600px',
                          border: 'none',
                          borderRadius: '8px',
                          opacity: isFrameLoading ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                        title={formData.title}
                        allow="fullscreen"
                        onLoad={() => setIsFrameLoading(false)}
                      />
                    </div>
                  );
                }

                // No valid form URL
                return (
                  <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                    Unable to load form. Please check the form configuration.
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Toast Notification */}
      <Toast
        open={toast.open}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        type={toast.type}
        title={toast.title}
        message={toast.message}
      />
    </AdminLayout>;
}