import { useState, useEffect } from 'react';
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
import { useToast } from '../../contexts/ToastContext';

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

export function FormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [resolvedResumeLink, setResolvedResumeLink] = useState<string | null>(null);
  const [isResolvingLink, setIsResolvingLink] = useState(false);

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

  // Fetch in-progress resume link from backend when recentEditLink is missing
  useEffect(() => {
    if (recentEditLink || !studentFormAssignmentId) return;
    setIsResolvingLink(true);
    import('../../services/api/admin')
      .then(({ getFormResumeLink }) => getFormResumeLink(studentFormAssignmentId))
      .then(link => { if (link) setResolvedResumeLink(link); })
      .catch(err => console.error('Failed to get resume link for admin view:', err))
      .finally(() => setIsResolvingLink(false));
  }, [studentFormAssignmentId, recentEditLink]);

  // Determine which URL to use based on form status
  const getFormUrl = () => {
    let url: string | undefined;

    // Priority 0: In-progress resume link fetched from backend (cross-browser resume)
    if (resolvedResumeLink && !isInvalidFormId(resolvedResumeLink)) {
      url = resolvedResumeLink;
    } else if (recentEditLink && !isInvalidFormId(recentEditLink)) {
      // Priority 1: Use recent_edit_link if form is filled (has existing submission)
      url = recentEditLink;
    } else if (filloutFormId && !isInvalidFormId(filloutFormId)) {
      // Priority 2: Use fillout_form_id if form is empty (no existing submission)
      url = filloutFormId;
    } else {
      // Fallback: Use the original filloutFormUrl or form link
      const fallbackUrl = filloutFormUrl || formData?.link;
      if (fallbackUrl && !isInvalidFormId(fallbackUrl)) {
        url = fallbackUrl;
      }
    }

    if (url && url !== '#') {
      url = url.trim();
      // If it is just a form ID/slug (e.g. not starting with http/https), prepend the fillout base URL
      if (!/^https?:\/\//i.test(url)) {
        url = `https://goddard.fillout.com/${url}`;
      }
    }

    // Append student_form_assignment_id if available and not already in URL
    if (url && studentFormAssignmentId && !url.includes('student_form_assignment_id')) {
      url += `${url.includes('?') ? '&' : '?'}student_form_assignment_id=${studentFormAssignmentId}`;
    }

    return url;
  };

  // Handle back button click
  const handleBack = () => {
    navigate(returnPath);
  };

  // Handle form approval
  const handleApprove = async () => {
    if (!studentFormAssignmentId) {
      showToast('error', 'Unable to approve form: Assignment ID is missing');
      return;
    }

    if (!user?.id) {
      showToast('error', 'Unable to approve form: User not authenticated');
      return;
    }

    setIsApproving(true);
    try {
      await reviewStudentFormAssignment(
        studentFormAssignmentId,
        'approved',
        notes,
        user.id
      );

      showToast('success', 'Form approved successfully');

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(returnPath);
      }, 1500);
    } catch (error) {
      console.error('Error approving form:', error);
      showToast('error', 'Failed to approve form');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle form rejection
  const handleReject = async () => {
    if (!studentFormAssignmentId) {
      showToast('error', 'Unable to reject form: Assignment ID is missing');
      return;
    }

    if (!user?.id) {
      showToast('error', 'Unable to reject form: User not authenticated');
      return;
    }

    if (!notes.trim()) {
      showToast('error', 'Please provide notes when rejecting a form');
      return;
    }

    setIsRejecting(true);
    try {
      await reviewStudentFormAssignment(
        studentFormAssignmentId,
        'rejected',
        notes,
        user.id
      );

      showToast('success', 'Form rejected with notes');

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(returnPath);
      }, 1500);
    } catch (error) {
      console.error('Error rejecting form:', error);
      showToast('error', 'Failed to reject form');
    } finally {
      setIsRejecting(false);
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
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Button variant="outline" onClick={handleBack} size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="flex items-center min-w-0 flex-1">
              {childName && <div className="flex flex-col sm:flex-row sm:items-center text-gray-600 gap-1 sm:gap-4 min-w-0">
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-sm sm:text-base truncate">{childName}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                    <School className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-sm sm:text-base truncate">{classDetails}</span>
                  </div>
                </div>}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="truncate">Last updated: {formData.lastUpdated}</span>
            </div>
            <div>
              <StatusBadge status={formData.status} />
            </div>
          </div>
        </div>
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="mb-4 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <h2 className="text-lg sm:text-xl font-bold truncate">{formData.title}</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Textarea
                  placeholder="Add notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[60px] w-full sm:w-64 text-sm"
                  rows={2}
                />
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={handleApprove}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    size="sm"
                    disabled={!isReviewable || isApproving || isRejecting}
                  >
                    {isApproving ? (
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
                    disabled={!isReviewable || isApproving || isRejecting}
                  >
                    {isRejecting ? (
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
                if (isResolvingLink) {
                  return (
                    <div className="flex items-center justify-center min-h-[400px]">
                      <Loading message="Loading form..." size="md" />
                    </div>
                  );
                }

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
                          height: '500px',
                          border: 'none',
                          borderRadius: '8px',
                          opacity: isFrameLoading ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out'
                        }}
                        className="sm:h-[600px]"
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

    </AdminLayout>;
}