import { useState, useEffect, useCallback, useRef } from 'react';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../../hooks/useEmbeddedFormResize';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Calendar, User, School, ChevronLeft, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Loading } from '../../components/ui/loading';
import { reviewStudentFormAssignment, getFormResumeLink } from '../../services/api/admin';
import { EmployeeService } from '../../services/api/employee';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { Document, Page, pdfjs } from 'react-pdf';
import { isFormBuilderUrl } from '../../lib/formBuilderUrl';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

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

  // State for approval actions and notes
  const [notes, setNotes] = useState('');
  const [resolvedResumeLink, setResolvedResumeLink] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsFrameLoading(false);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(760);

  const iframeContainerRef = useRef<HTMLDivElement>(null);
  // Use a page-sized fallback for embeds that do not publish their content height.
  // Forms that support postMessage still replace this with their exact height.
  const [formHeight, setFormHeight] = useState<number>(1050);

  // Stable embed ID — unique per form load so we can match resize postMessages
  // from this specific iframe. Regenerated whenever the URL changes.
  const embedIdRef = useRef<string>(`fe-${Date.now()}`);

  // Reset to the page-sized fallback when a new form is loaded.
  const filloutFormId = location.state?.filloutFormId;
  useEffect(() => {
    setFormHeight(1050);
    embedIdRef.current = `fe-${Date.now()}`;
  }, [resolvedResumeLink, filloutFormId]);

  // Prevent the parent page from auto-scrolling to the top when the user
  // clicks inside the cross-origin Fillout iframe (e.g. a country-code
  // selector in a phone field). See hook for full explanation.
  useIframeScrollLock();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        const h =
          (data.type === 'form_resized' ? data.size : undefined) ??
          data.height ??
          data.value ??
          data.clientHeight ??
          data.size ??
          data.payload?.height ??
          data.payload?.size ??
          data.data?.height ??
          data.data?.size;

        if (typeof h === 'number' && h > 0) {
          setFormHeight(prev => {
            const newHeight = Math.ceil(h);
            // Only block small increases (loop prevention); always allow shrinks.
            if (newHeight > prev && (newHeight - prev) < 50) return prev;
            return newHeight;
          });
        }
      } catch { /* Ignore non-resize messages from the embedded form. */ }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(100, entry.contentRect.width));
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Get the form data and navigation state from the location state
  const formData = location.state?.form;

  // Check if form is reviewable (only when status is in_progress or submitted)
  // Handle both normalized and raw status values
  const isReviewable = formData?.status === 'In Progress' ||
    formData?.status === 'Submitted' ||
    formData?.status === 'in_progress' ||
    formData?.status === 'in progress' ||
    formData?.status === 'submitted';
  const isApproved = formData?.status === 'Approved' || formData?.status === 'approved';
  const childName = location.state?.childName;
  const childDob = location.state?.childDob;
  const childGender = location.state?.childGender;
  const parentEmail = location.state?.parentEmail;
  const classDetails = location.state?.classDetails || 'Unassigned Class';
  const returnPath = location.state?.returnPath || '/admin/parents';
  const filloutFormUrl = location.state?.filloutFormUrl;
  const recentEditLink = location.state?.recentEditLink;
  // const filloutFormId = location.state?.filloutFormId;
  const studentFormAssignmentId = location.state?.studentFormAssignmentId;
  const recentPdfLink = location.state?.recentPdfLink;
  const isEmployeeForm = location.state?.isEmployeeForm as boolean | undefined;
  const schoolId = location.state?.schoolId as string | undefined;

  const usesResumeLink = (() => {
    const link = recentEditLink || filloutFormId || filloutFormUrl;
    if (!link) return false;
    if (link.includes('fillout.com')) return true;
    if (isFormBuilderUrl(link)) return true;
    if (!link.startsWith('http')) return true;
    return false;
  })();

  useEffect(() => {
    if (studentFormAssignmentId && usesResumeLink) {
      getFormResumeLink(studentFormAssignmentId).then(setResolvedResumeLink);
    }
  }, [studentFormAssignmentId, usesResumeLink]);

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

    // Append student_form_assignment_id if available and not already in URL (skip for employee forms)
    if (url && studentFormAssignmentId && !url.includes('student_form_assignment_id') && !isEmployeeForm) {
      url += `${url.includes('?') ? '&' : '?'}student_form_assignment_id=${studentFormAssignmentId}`;
    }

    // Append child/parent params to all form URLs
    if (url && url !== '#') {
      const toYMD = (v: string | undefined | null): string | null => {
        if (!v || v === '—') return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      };
      const dob = toYMD(childDob);
      const extras: Record<string, string> = {};
      if (childName) extras['child_name'] = childName;
      if (dob) extras['child_dob'] = dob;
      if (childGender) extras['child_gender'] = childGender.charAt(0).toUpperCase() + childGender.slice(1).toLowerCase();
      if (parentEmail) extras['parent_email'] = parentEmail;
      const paramStr = Object.entries(extras)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      if (paramStr) url += `${url.includes('?') ? '&' : '?'}${paramStr}`;
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
      if (isEmployeeForm && schoolId) {
        await EmployeeService.reviewEmployeeForm(studentFormAssignmentId, schoolId, 'Approved', notes);
      } else {
        await reviewStudentFormAssignment(studentFormAssignmentId, 'approved', notes, user.id);
      }

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
      if (isEmployeeForm && schoolId) {
        await EmployeeService.reviewEmployeeForm(studentFormAssignmentId, schoolId, 'Rejected', notes);
      } else {
        await reviewStudentFormAssignment(studentFormAssignmentId, 'rejected', notes, user.id);
      }

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
  const selectedUrl = getFormUrl();
  const embeddedResize = useEmbeddedFormResize(selectedUrl);

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
  return <AdminLayout>
    <div className="space-y-6 max-w-7xl mx-auto mt-14 pb-26">
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
            {isApproved ? (
              <div className="flex items-center gap-2 text-green-600">
                {/* <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>This form has been approved and is read-only.</span> */}
              </div>
            ) : (
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
            )}
          </div>
          {/* Form container with dynamic height */}
          <div className="mt-6 relative min-h-[480px]">
            {isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10 rounded-xl">
                <Loading message="Loading..." size="md" />
              </div>
            )}
            {isApproved && recentPdfLink ? (
              <div className="w-full max-w-[800px] aspect-[1/1.414] mx-auto bg-white border border-slate-200/80 rounded-xl shadow-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-2 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="flex items-center gap-1 text-xs px-2 h-8"
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Prev
                  </Button>
                  <span className="text-xs sm:text-sm font-semibold px-2 text-slate-800">
                    {pageNumber} / {numPages || '...'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.min(numPages || 1, p + 1))}
                    disabled={pageNumber >= (numPages || 1)}
                    className="flex items-center gap-1 text-xs px-2 h-8"
                  >
                    Next
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <div
                  ref={containerRef}
                  className="relative flex-1 flex justify-center items-start overflow-y-auto bg-slate-50/40 p-2 sm:p-4"
                >
                  <Document
                    file={recentPdfLink}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<Loading message="Loading PDF..." size="md" />}
                    error={<div className="text-red-500 text-center p-4">Failed to load PDF</div>}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={containerWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      className="shadow-md"
                    />
                  </Document>
                </div>
              </div>
            ) : (() => {
              if (selectedUrl && selectedUrl !== '#') {
                return (
                  <>
                    <style>{`
                      @media (max-width: 640px) {
                        .ndfHFb-c4YZDc-q77wGc,
                        .ndfHFb-c4YZDc-nJjxad-nK2kYb-i5oIFb { display: none !important; }
                      }
                    `}</style>
                    <div ref={iframeContainerRef} className="w-full">
                      <iframe
                        ref={embeddedResize.iframeRef}
                        src={selectedUrl}
                        style={{
                          width: '100%',
                          height: embeddedResize.isDynamic
                            // Arjava forms: use the full dynamic height so the page scrolls
                            // rather than the iframe scrolling internally.
                            ? `${embeddedResize.height ?? 800}px`
                            // Fillout forms: use postMessage height.
                            : `${formHeight}px`,
                          border: 'none',
                          display: 'block',
                          opacity: isFrameLoading ? 0 : 1,
                          transition: 'opacity 0.3s ease-in-out',
                        }}
                        scrolling="auto"
                        title={formData.title}
                        allow="fullscreen"
                        onLoad={() => {
                          embeddedResize.handleLoad();
                          setIsFrameLoading(false);
                        }}
                      />
                    </div>
                  </>
                );
              }
              return (
                <div className="flex items-center justify-center min-h-[400px] text-gray-500 bg-white border border-slate-100 rounded-xl">
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
