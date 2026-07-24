import { useMemo, useState, useEffect, useRef, MutableRefObject } from 'react';
import { FileText, Download, Printer, Eye, ChevronLeft, AlertCircle, ChevronRight, CheckCircle, LayoutGrid, List } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Loading } from '../ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { getFilloutUserContext, appendFilloutUserParams } from '../../services/api/fillout';
import { cn } from '../../lib/utils';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();
interface FormCardProps {
  title: string;
  description: string;
  lastUpdated: string;
  status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  childName?: string; // Optional - only for child-specific forms
  recentPdfLink?: string | null;
  onView?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isLoading?: { action: string; formId: string } | null;
  formId?: string;
  assignedAt?: string | null;
  dueDate?: string | null;
}
function FormCard({
  title,
  description,
  lastUpdated,
  status,
  recentPdfLink,
  onView,
  onDownload,
  onPrint,
  disabled = false,
  disabledReason,
  isLoading,
  formId,
  dueDate
}: FormCardProps) {
  const isApproved = status === 'Approved';
  const isLoadingThis = isLoading?.formId === formId;



  const getBorderColor = () => {
    if (status === 'Approved' || status === 'Submitted' || status === 'In Progress') return 'border-green-500';
    return 'border-amber-500';
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200",
        disabled ? "cursor-not-allowed opacity-60 hover:shadow-none hover:translate-y-0" : "cursor-pointer"
      )}
      onClick={() => { if (disabled) return; onView?.(); }}
      title={disabled ? (disabledReason || 'Form is not ready yet') : undefined}
    >
      {/* Card body */}
      <div className="p-4 flex items-start gap-3 flex-1">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
          <FileText className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{title}</p>
          <div className="mt-1.5">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-50" />

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400 font-medium truncate">Assigned: {lastUpdated}</p>
          {dueDate && (
            <p className="text-[11px] text-slate-400 font-medium truncate">Due: {dueDate}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {isApproved && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); if (disabled) return; onView?.(); }}
                title="View Form (Read-only)"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {recentPdfLink && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                    onClick={(e) => { e.stopPropagation(); if (disabled) return; onDownload?.(); }}
                    disabled={isLoadingThis}
                    title="Download PDF"
                  >
                    {isLoadingThis && isLoading?.action === 'download'
                      ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                      : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                    onClick={(e) => { e.stopPropagation(); if (disabled) return; onPrint?.(); }}
                    disabled={isLoadingThis}
                    title="Print PDF"
                  >
                    {isLoadingThis && isLoading?.action === 'print'
                      ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                      : <Printer className="h-3.5 w-3.5" />}
                  </Button>
                </>
              )}
            </>
          )}
          {!isApproved && onView && (
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
              onClick={(e) => { e.stopPropagation(); if (disabled) return; onView(); }}
              title="View Form"
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {disabled && disabledReason && (
        <div className="px-4 pb-3 text-[11px] text-amber-700 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{disabledReason}</span>
        </div>
      )}
    </div>
  );
}
interface FormData {
  title: string;
  description: string;
  lastUpdated: string;
  status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  formId?: string;
  recentPdfLink?: string | null;
  recentEditLink?: string | null;
  filloutFormId?: string | null;
  studentFormAssignmentId?: string | null;
  assignedAt?: string | null;
  dueDate?: string | null;
  fromContinueButton?: boolean;
}


interface FormsDocumentsProps {
  childSpecificForms: {
    childId: string;
    childName: string;
    forms: FormData[];
  }[];
  familyForms: FormData[];
  rawFormData?: any; // Raw parent data to access form URLs
  selectedChildId?: string; // ID of the currently selected child
  selectedChildName?: string; // Name of the currently selected child
  childStatus?: 'active' | 'archive'; // Status of the currently selected child
  onChildSelect?: (childName: string) => void; // Callback when a child tab is clicked
  onViewForm: (form: any) => void; // Callback to view a form
  formToOpen?: any; // Form to automatically open
  onFormOpened?: () => void; // Callback when form is opened
  onFormCompleted?: () => void; // Callback when form is completed to trigger refresh
  yearFilter?: string; // Year filter value
  onYearFilterChange?: (year: string) => void; // Callback to change year filter
  enrollmentId?: string; // For downloading all forms
  formOpenGuard?: MutableRefObject<boolean>; // Shared ref across instances — first to claim blocks the other
}
export function FormsDocuments({
  childSpecificForms,
  familyForms,
  rawFormData,
  selectedChildId,
  childStatus = 'active',
  onChildSelect,
  onViewForm,
  formToOpen,
  onFormOpened,
  onFormCompleted,
  yearFilter = 'all',
  onYearFilterChange,
  enrollmentId,
  formOpenGuard,
}: FormsDocumentsProps) {
  const { userData } = useUserContext();
  const { user } = useAuth();
  const [loadingAction, setLoadingAction] = useState<{ action: string; formId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(selectedChildId || childSpecificForms[0]?.childId || 'family');
  const previousChildIdRef = useRef<string | undefined>(selectedChildId);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [isFrameLoading, setIsFrameLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const isOpeningRef = useRef(false);
  const processedFormToOpenRef = useRef<string | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thankYouTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCountingDownRef = useRef(false);
  const iframeLoadedRef = useRef(false);
  const selectedFormRef = useRef<any>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(
    window.innerWidth < 640 ? 'card' : (localStorage.getItem('parentFormsViewMode') as 'card' | 'table') || 'card'
  );
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    if (window.innerWidth >= 640) localStorage.setItem('parentFormsViewMode', mode);
  };
  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 640) setViewMode('card'); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDownloadAll = async () => {
    if (!enrollmentId) return;
    setIsDownloadingAll(true);
    try {
      const { downloadAllForms } = await import('../../services/api/admin');
      await downloadAllForms(enrollmentId);
    } catch (err) {
      console.error('Download all forms failed:', err);
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Sync activeTab with selectedChildId only when it actually changes
  useEffect(() => {
    if (selectedChildId && selectedChildId !== previousChildIdRef.current) {
      setActiveTab(selectedChildId);
      previousChildIdRef.current = selectedChildId;
      // Close any open form when child changes
      setSelectedForm(null);
      setOpenError(null);
      setShowThankYou(false);
      setIsFrameLoading(false);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
    }
  }, [selectedChildId]);

  const extractStudentFormAssignmentId = (value: unknown): string | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '#') return null;
    return trimmed;
  };

  const extractStudentFormAssignmentIdFromUrl = (value: unknown): string | null => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === '#') return null;
    try {
      const paramsPart = trimmed.includes('?') ? trimmed.split('?')[1] : '';
      if (!paramsPart) return null;
      const urlParams = new URLSearchParams(paramsPart);
      return extractStudentFormAssignmentId(urlParams.get('student_form_assignment_id'));
    } catch {
      return null;
    }
  };

  const coerceStudentFormAssignmentIdForPayload = (value: unknown): { raw: string | null; asNumber: number | null; isValid: boolean } => {
    const raw = extractStudentFormAssignmentId(value);
    if (!raw) return { raw: null, asNumber: null, isValid: false };
    const numeric = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    return { raw, asNumber: Number.isFinite(numeric) ? numeric : null, isValid: true };
  };

  // Combine all forms into a single list with proper typing
  const allForms = useMemo(() => {
    return [
      ...familyForms.map((form, index) => ({
        ...form,
        childId: undefined,
        childName: undefined,
        _key: `family-${index}`,
        rawData: null as any
      })),
      ...childSpecificForms.flatMap((child) => {
        // Find the matching child in rawFormData by childId
        const rawChild = rawFormData?.children?.find((c: any) => c.childId === child.childId);
        return child.forms.map((form, formIndex) => {
          // Find the exact matching form in rawData by form_id or form_name
          console.log('Matching form for:', form.title, 'formId:', form.formId);
          console.log('Raw child data:', rawChild);
          console.log('Available raw forms (full):', rawChild?.forms);

          const matchingRawForm = rawChild?.forms?.find((rawForm: any) => {
            return rawForm.formId === form.formId ||
              rawForm.formName === form.title ||
              rawForm.formName === form.description;
          });

          console.log('Final matching result:', matchingRawForm);
          const rawData = matchingRawForm || null;
          const studentFormAssignmentId =
            extractStudentFormAssignmentId(rawData?.student_form_assignment_id) ||
            extractStudentFormAssignmentId(rawData?.studentFormAssignmentId) ||
            extractStudentFormAssignmentIdFromUrl(rawData?.recent_edit_link) ||
            extractStudentFormAssignmentIdFromUrl(rawData?.fillout_form_id) ||
            extractStudentFormAssignmentIdFromUrl(form.filloutFormId) ||
            extractStudentFormAssignmentIdFromUrl(form.recentEditLink) ||
            null;
          return {
            ...form,
            childId: child.childId,
            childName: child.childName,
            _key: `child-${child.childId}-form-${form.formId || formIndex}`,
            rawData,
            studentFormAssignmentId
          };
        });
      })
    ];
  }, [familyForms, childSpecificForms, rawFormData, selectedChildId]);

  const handleView = async (form: any) => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    try {
      setOpenError(null);
      console.log('handleView called with form:', form);
      console.log('Form ID:', form.formId || form._key);
      console.log('Child ID form opening:', form.childId);
      console.log('Selected Child ID:', selectedChildId);
      console.log('Form data:', form);
      console.log('Active Tab:', activeTab);

      // Skip validation for forms from Continue button
      if (form.fromContinueButton) {
        console.log('✓ Form from Continue button - bypassing child ID validation');
      } else {
        // Ensure we're using the correct child's data
        if (form.childId && selectedChildId && form.childId !== selectedChildId) {
          console.warn('Form child ID does not match selected child ID - blocking form open');
          console.log('Expected child ID:', selectedChildId, 'Got child ID:', form.childId);
          return;
        }
        console.log('✓ Child ID validation passed - opening form for correct child');
      }

      let formUrl = '#';

      // Extract all possible URL sources from rawData and form object
      const rawData = form.rawData || {};
      console.log('Raw data for form:', form);
      const recentEditLink = rawData.recent_edit_link || rawData.recentEditLink || form.recentEditLink;
      const recentPdfLink = rawData.recent_pdf_link || rawData.recentPdfLink || form.recentPdfLink;
      const filloutFormId = rawData.fillout_form_id || rawData.filloutFormId || form.filloutFormId;
      const studentFormAssignmentId =
        extractStudentFormAssignmentId(form.studentFormAssignmentId) ||
        extractStudentFormAssignmentId(rawData.student_form_assignment_id) ||
        extractStudentFormAssignmentId(rawData.studentFormAssignmentId) ||
        extractStudentFormAssignmentId(form.student_form_assignment_id) ||
        extractStudentFormAssignmentIdFromUrl(recentEditLink) ||
        extractStudentFormAssignmentIdFromUrl(filloutFormId) ||
        extractStudentFormAssignmentIdFromUrl(form.filloutFormId) ||
        extractStudentFormAssignmentIdFromUrl(form.recentEditLink) ||
        null;
      const formId = rawData.formId || form.formId;
      const idForPayload = coerceStudentFormAssignmentIdForPayload(studentFormAssignmentId);

      console.log('Form data for URL construction:', {
        status: form.status,
        recentEditLink,
        recentPdfLink,
        filloutFormId,
        studentFormAssignmentId,
        studentFormAssignmentIdNumber: idForPayload.asNumber,
        formId,
        rawData
      });

      const isReadOnly = form.status === 'Approved' || form.status === 'Submitted';

      if (isReadOnly) {
        // For approved/submitted forms, use direct PDF link for react-pdf viewer
        if (recentPdfLink && recentPdfLink !== '#' && recentPdfLink.trim() !== '') {
          formUrl = recentPdfLink;
        } else {
          // If no PDF link available, don't allow viewing
          return;
        }
      } else {
        const isFillout = (() => {
          const link = recentEditLink || filloutFormId;
          if (!link) return false;
          if (link.includes('fillout.com')) return true;
          if (!link.startsWith('http')) return true; // Legacy slugs/IDs are treated as Fillout
          return false;
        })();

        if (isFillout) {
          // Backend validation requires this hidden field; do not open Fillout without it.
          if (!idForPayload.isValid) {
            const debugPayload = {
              formId: form.formId || form._key,
              status: form.status,
              recentEditLink,
              filloutFormId,
              extractedStudentFormAssignmentId: studentFormAssignmentId,
              coerced: idForPayload,
              expectedHiddenFieldKey: 'student_form_assignment_id'
            };
            console.error('[Fillout] BLOCKED: Missing or invalid student_form_assignment_id', debugPayload);
            setOpenError('This form is not ready yet (missing assignment ID). Please refresh and try again. If it still fails, contact support.');
            return;
          }

          // Poll backend for a resume link for any non-completed form (Draft or In Progress).
          // The DB status may still be "incomplete"/"Draft" even when Fillout has partial data,
          // because the webhook that flips it to "in_progress" may not have fired yet.
          let resumeLinkFromApi: string | null = null;
          const isNotCompleted = form.status !== 'Approved' && form.status !== 'Submitted';
          if (isNotCompleted && !recentEditLink && idForPayload.raw) {
            setLoadingAction({ action: 'view', formId: form.formId ?? '' });
            try {
              const { getFormResumeLink } = await import('../../services/api/admin');
              resumeLinkFromApi = await getFormResumeLink(idForPayload.raw);
            } catch (err) {
              console.error('Failed to fetch resume link:', err);
            } finally {
              setLoadingAction(null);
            }
          }

          const effectiveEditLink = resumeLinkFromApi || recentEditLink;

          // For non-approved forms, prioritize recent_edit_link (or fetched resume link) first
          if (effectiveEditLink && effectiveEditLink !== '#' && effectiveEditLink.trim() !== '') {
            formUrl = effectiveEditLink;
          } else if (filloutFormId && filloutFormId !== '#' && filloutFormId.trim() !== '') {
            // Handle fillout form URL construction
            if (filloutFormId.startsWith('http')) {
              // Already a full URL
              formUrl = filloutFormId;
              // Add student_form_assignment_id if available and not already in URL
              if (idForPayload.raw && !formUrl.includes('student_form_assignment_id')) {
                formUrl += `${formUrl.includes('?') ? '&' : '?'}student_form_assignment_id=${idForPayload.raw}`;
              }
            } else {
              // Construct fillout URL
              const baseUrl = `https://goddard.fillout.com/${filloutFormId}`;
              formUrl = `${baseUrl}?student_form_assignment_id=${idForPayload.raw}`;
            }
          } else if (idForPayload.raw) {
            // Fallback: use the form's fillout_form_id or a default form with student_form_assignment_id
            let defaultFormId = rawData.fillout_form_id || 'parent_handbook';
            // Validate the default form ID - if it's invalid test data, use parent_handbook
            const invalidFormIds = ['wed', 'sdexewsa', 'sdceswd'];
            if (invalidFormIds.includes(defaultFormId.toLowerCase())) {
              defaultFormId = 'parent_handbook';
            }
            console.log('Default form ID used:', defaultFormId)
            formUrl = `https://goddard.fillout.com/${defaultFormId}?student_form_assignment_id=${idForPayload.raw}`;
          }

          // Attach the Fillout user context (user_id + user_token) so signatures and
          // initials saved on earlier forms can be re-used in this one. Provisioning
          // failures degrade gracefully — the form still opens without re-use.
          if (formUrl && formUrl !== '#') {
            const parentEmail = (userData?.email || user?.email || '').trim().toLowerCase();
            // Stable identity only: Goddard parentId or the email itself. The auth
            // user id must not be used — before userData loads it would provision a
            // second Fillout user for the same parent (and the dev bypass id is
            // shared by everyone).
            const externalUserId = userData?.parentId || parentEmail;
            if (!externalUserId) {
              console.warn('[Fillout] Skipping user provisioning — parent identity not loaded yet (no parentId/email)');
            }
            if (externalUserId) {
              const parentName =
                [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || parentEmail || 'Goddard Parent';
              const filloutCtx = await getFilloutUserContext({
                externalUserId,
                email: parentEmail || `${externalUserId}@goddard.parent`,
                name: parentName,
              });
              formUrl = appendFilloutUserParams(formUrl, filloutCtx);
            }
          }
        } else {
          // Non-Fillout form: Use the direct URLs provided by the alternative form service
          formUrl = recentEditLink || filloutFormId || '#';

          // Append assignment ID as standard query parameter if needed
          if (formUrl && formUrl !== '#' && idForPayload.raw && !formUrl.includes('student_form_assignment_id')) {
            formUrl += `${formUrl.includes('?') ? '&' : '?'}student_form_assignment_id=${idForPayload.raw}`;
          }
        }
      }
      console.log('Final form URL:', formUrl);
      console.log('[Fillout] READY payload (frontend):', {
        student_form_assignment_id: idForPayload.asNumber ?? idForPayload.raw,
        student_form_assignment_id_raw: idForPayload.raw,
        student_form_assignment_id_number: idForPayload.asNumber,
        viewUrl: formUrl
      });

      setSelectedForm({
        ...form,
        viewUrl: formUrl
      });
      setIsFrameLoading(true);
      setPageNumber(1);
      setNumPages(null);
      isCountingDownRef.current = false;
      iframeLoadedRef.current = false;
      // Mark as processed so if formToOpen is set externally with the same form, useEffect skips it
      const formKey = form.fromContinueButton
        ? `continue-${form.formId ?? 'unknown'}`
        : (form.formId ?? null);
      if (formKey) processedFormToOpenRef.current = formKey;
      onViewForm(form);
    } finally {
      isOpeningRef.current = false;
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsFrameLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber(pageNumber - 1 <= 1 ? 1 : pageNumber - 1);
  };

  const goToNextPage = () => {
    setPageNumber(pageNumber + 1 >= (numPages || 1) ? (numPages || 1) : pageNumber + 1);
  };

  // Auto-open form when formToOpen is set
  useEffect(() => {
    if (!formToOpen) {
      processedFormToOpenRef.current = null;
      return;
    }
    // If another FormsDocuments instance already claimed this formToOpen, skip
    if (formOpenGuard?.current) return;
    const key = formToOpen.fromContinueButton
      ? `continue-${formToOpen.formId ?? 'unknown'}`
      : (formToOpen.formId ?? null);
    if (!key || key === processedFormToOpenRef.current) return;
    // Claim this formToOpen before any async work so the sibling instance skips
    if (formOpenGuard) formOpenGuard.current = true;
    processedFormToOpenRef.current = key;

    console.log('Auto-opening form:', formToOpen);
    // If it's from Continue button, directly open it
    if (formToOpen.fromContinueButton) {
      handleView(formToOpen);
    } else if (formToOpen.formId) {
      // Find the matching form in allForms by unique formId
      const matchingForm = allForms.find(f => f.formId === formToOpen.formId);
      if (matchingForm) {
        // Only auto-open if it belongs to the selected child
        if (!matchingForm.childId || matchingForm.childId === selectedChildId) {
          handleView(matchingForm);
        } else {
          console.warn('Auto-open blocked: Form belongs to different child');
        }
      }
    }
    if (onFormOpened) {
      onFormOpened();
    }
  }, [formToOpen, allForms, selectedChildId]);

  // Get forms for the selected tab
  const getFormsForTab = (tabValue: string) => {
    if (tabValue === 'all') {
      return allForms;
    } else if (tabValue === 'family') {
      return allForms.filter(form => !form.childId);
    } else {
      // Individual child tab - filter by childId and ensure it matches selectedChildId
      return allForms.filter(form => form.childId === tabValue && form.childId === selectedChildId);
    }
  };


  const handleDownload = async (form: any) => {
    const pdfLink = form.rawData?.recent_pdf_link || form.recentPdfLink;
    if (!pdfLink) return;

    setLoadingAction({ action: 'download', formId: form.formId || form._key });
    try {
      const response = await fetch(pdfLink);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrint = async (form: any) => {
    const pdfLink = form.rawData?.recent_pdf_link || form.recentPdfLink;
    if (!pdfLink) return;

    setLoadingAction({ action: 'print', formId: form.formId || form._key });
    try {
      const response = await fetch(pdfLink);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        });
      }
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  // Keep selectedFormRef in sync with the state
  useEffect(() => {
    selectedFormRef.current = selectedForm;
  }, [selectedForm]);

  // Function to start thank you countdown
  const startThankYouCountdown = () => {
    if (!selectedFormRef.current || isCountingDownRef.current) return;
    isCountingDownRef.current = true;
    setShowThankYou(true);
    setCountdown(3);
    
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
    
    // Start countdown
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto redirect to home
          setSelectedForm(null);
          setShowThankYou(false);
          setIsFrameLoading(false);
          if (countdownRef.current) clearInterval(countdownRef.current);
          // Trigger refresh when auto-redirecting
          if (onFormCompleted) onFormCompleted();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Fallback timeout in case countdown doesn't work
    thankYouTimeoutRef.current = setTimeout(() => {
      setSelectedForm(null);
      setShowThankYou(false);
      setIsFrameLoading(false);
      if (onFormCompleted) onFormCompleted();
    }, 15000);
  };

  // Handle form completion detection and auto-redirect
  useEffect(() => {
    let urlCheckInterval: ReturnType<typeof setInterval>;

    // Monitor iframe URL changes for thank you page detection
    const monitorIframeUrl = () => {
      const activeForm = selectedFormRef.current;
      if (!activeForm) return;
      try {
        const iframe = document.querySelector('iframe[title="' + activeForm.title + '"]') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          const currentUrl = iframe.contentWindow.location.href;
          // Check if URL contains thank you indicators
          if (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('complete')) {
            startThankYouCountdown();
            if (urlCheckInterval) clearInterval(urlCheckInterval);
          }
        }
      } catch (error) {
        // Cross-origin restrictions prevent URL access, this is expected
        // We'll rely on message passing or user interaction
      }
    };
    
    if (selectedForm) {
      urlCheckInterval = setInterval(monitorIframeUrl, 2000);
    }
    
    return () => {
      if (urlCheckInterval) clearInterval(urlCheckInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
    };
  }, [selectedForm, isFrameLoading]);

  // Helper to retrieve the current status of the active form from state arrays
  const getActiveFormStatus = (): string | null => {
    if (!selectedForm) return null;
    const targetId = selectedForm.formId || selectedForm._key;
    
    if (childSpecificForms) {
      for (const group of childSpecificForms) {
        for (const f of group.forms) {
          if ((f.formId || (f as any)._key) === targetId) return f.status;
        }
      }
    }
    if (familyForms) {
      for (const f of familyForms) {
        if ((f.formId || (f as any)._key) === targetId) return f.status;
      }
    }
    if (allForms) {
      for (const f of allForms) {
        if ((f.formId || f._key) === targetId) return f.status;
      }
    }
    return selectedForm.status;
  };

  // Monitor form status changes from API response triggers to fire the thank-you screen
  useEffect(() => {
    if (!selectedForm) return;

    const currentStatus = getActiveFormStatus();
    if (
      currentStatus === 'Submitted' || 
      currentStatus === 'Approved' || 
      currentStatus === 'submitted' || 
      currentStatus === 'approved'
    ) {
      console.log('[FormsDocuments] Active form submission detected via API status change! Status:', currentStatus);
      startThankYouCountdown();
    }
  }, [childSpecificForms, familyForms, allForms, selectedForm]);

  // Global window message event listener (registered once on mount)
  useEffect(() => {
    const handleMessageGlobal = (event: MessageEvent) => {
      // Log all message events to console for debugging
      console.log('Received postMessage event (global):', event.origin, event.data);

      const activeForm = selectedFormRef.current;
      if (!activeForm) {
        console.log('Ignore message event: no active form in parent dashboard state');
        return;
      }

      let isSubmitted = false;
      let parsedData: any = null;

      // 1. Attempt to parse stringified JSON
      if (typeof event.data === 'string') {
        try {
          parsedData = JSON.parse(event.data);
        } catch (e) {
          // Not JSON format
        }
      } else if (typeof event.data === 'object' && event.data !== null) {
        parsedData = event.data;
      }

      // 2. Validate against success === true and submission_id exists (directly or recursively)
      if (parsedData && typeof parsedData === 'object') {
        // Deep search helper to find success: true and submission_id inside the object
        const findSubmissionInObject = (obj: any, depth = 0): boolean => {
          if (depth > 4) return false;
          if (!obj || typeof obj !== 'object') return false;
          
          // Check direct keys of current object
          const success = obj.success === true || obj.success === 'true';
          const submissionId = obj.submission_id || obj.submissionId;
          if (success && submissionId) {
            return true;
          }

          // Check direct fields of payload or data
          const nestedPayload = obj.payload || obj.data;
          if (nestedPayload && typeof nestedPayload === 'object') {
            if (findSubmissionInObject(nestedPayload, depth + 1)) {
              return true;
            }
          }

          // Scan all keys recursively
          for (const key in obj) {
            try {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const val = obj[key];
                if (val && typeof val === 'object') {
                  if (findSubmissionInObject(val, depth + 1)) {
                    return true;
                  }
                }
              }
            } catch (e) {
              // Ignore
            }
          }
          return false;
        };

        if (findSubmissionInObject(parsedData)) {
          isSubmitted = true;
        } else {
          // Check other common format types
          const type = parsedData.type || parsedData.event;
          if (
            type === 'fillout-form-submitted' ||
            type === 'fillout:form-submitted' ||
            type === 'feathery:form_submitted' ||
            type === 'feathery:form-submitted' ||
            type === 'FORM_SUBMITTED' ||
            type === 'submit' ||
            (typeof type === 'string' && (
              type.toLowerCase().includes('submit') || 
              type.toLowerCase().includes('success') || 
              type.toLowerCase().includes('complete')
            ))
          ) {
            isSubmitted = true;
          }
        }
      }

      // 3. String-based serialization fallback check
      if (!isSubmitted) {
        let serializedString = '';
        if (typeof event.data === 'string') {
          serializedString = event.data;
        } else {
          try {
            serializedString = JSON.stringify(event.data);
          } catch (e) {
            // Ignore serialization error
          }
        }

        if (serializedString) {
          const lower = serializedString.toLowerCase();
          if (
            (lower.includes('submit') || lower.includes('complete') || lower.includes('success') || lower.includes('thank')) &&
            (lower.includes('submission') || lower.includes('id') || lower.includes('record') || lower.includes('done') || lower.includes('response'))
          ) {
            isSubmitted = true;
          }
        }
      }

      if (isSubmitted) {
        console.log('Form submission detected in global listener! Starting thank you countdown...');
        startThankYouCountdown();
      }
    };

    window.addEventListener('message', handleMessageGlobal);
    return () => {
      window.removeEventListener('message', handleMessageGlobal);
    };
  }, []);

  // If a form is selected for viewing, show iframe in this section
  if (selectedForm) {
    return (
      <div className="px-2 sm:px-0 mt-10">
        <div className="mb-3 sm:mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => {
                setSelectedForm(null);
                setIsFrameLoading(false);
                setShowThankYou(false);
                if (countdownRef.current) clearInterval(countdownRef.current);
                if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
                if (onFormCompleted) onFormCompleted();
              }}
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground truncate">
                {selectedForm.title}
                {(selectedForm.status === 'Approved' || selectedForm.status === 'Submitted') && (
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-green-600">(Read-only)</span>
                )}
              </h2>
              {selectedForm.childName && (
                <span className="inline-block mt-1 text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                  {selectedForm.childName}
                </span>
              )}
            </div>
          </div>
        </div>

        <Card className="glass-card animate-fade-in">
          <CardContent className="p-2 sm:p-3 md:p-6">
            {showThankYou && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center justify-between shadow-sm animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-1.5">
                    <CheckCircle className="h-5 w-5 text-green-600 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-green-900">Form submitted successfully!</h4>
                    <p className="text-xs text-green-700 mt-0.5">We've received your submission.</p>
                  </div>
                </div>
                <div className="bg-green-100/80 px-3 py-1 rounded-md text-xs font-semibold text-green-800 border border-green-200">
                  Updating dashboard in {countdown}s
                </div>
              </div>
            )}
            <div className="relative">
              {isFrameLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md z-10">
                  <Loading message="Loading form..." size="sm" />
                </div>
              )}
              {selectedForm.viewUrl && selectedForm.viewUrl !== '#' ? (
                selectedForm.status === 'Approved' || selectedForm.status === 'Submitted' ? (
                  <div className="flex flex-col">
                    {/* PDF Navigation */}
                    <div className="flex items-center justify-between mb-2 sm:mb-4 p-2 bg-gray-50 rounded-lg">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      <span className="text-xs sm:text-sm font-medium px-2">
                        {pageNumber} / {numPages || '...'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={pageNumber >= (numPages || 1)}
                        className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>

                    {/* PDF Viewer */}
                    <div className="flex justify-center overflow-x-auto">
                      <Document
                        file={selectedForm.viewUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<Loading message="Loading PDF..." size="sm" />}
                        error={<div className="text-red-500 text-center p-4">Failed to load PDF</div>}
                      >
                        <Page
                          pageNumber={pageNumber}
                          width={typeof window !== 'undefined' ? Math.min(800, window.innerWidth - 40) : 800}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          className="shadow-lg"
                        />
                      </Document>
                    </div>
                  </div>
                ) : (
                  <>
                    <style>{`
                      @media (max-width: 640px) {
                        .ndfHFb-c4YZDc-q77wGc,
                        .ndfHFb-c4YZDc-nJjxad-nK2kYb-i5oIFb {
                          display: none !important;
                        }
                      }
                    `}</style>
                    <iframe
                      src={selectedForm.viewUrl}
                      className="w-full h-[60vh] sm:h-[70vh] md:h-[80vh] min-h-[400px] sm:min-h-[500px] md:min-h-[1000px] border-none rounded-lg transition-opacity duration-300"
                      style={{
                        opacity: isFrameLoading ? 0 : 1
                      }}
                      title={selectedForm.title}
                      onLoad={() => {
                        console.log('iframe onLoad triggered! loadedRef:', iframeLoadedRef.current);
                        if (iframeLoadedRef.current) {
                          console.log('iframe onLoad detected redirect! Starting countdown...');
                          startThankYouCountdown();
                        }
                        iframeLoadedRef.current = true;
                        setIsFrameLoading(false);
                      }}
                    />
                  </>
                )
              ) : (
                <div className="flex items-center justify-center min-h-[400px] text-gray-500">
                  Unable to load form. Please check the form configuration.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show archived message if child is archived
  if (childStatus === 'archive') {
    return <div className="px-2 sm:px-0">
      <div className="mb-3 sm:mb-4 md:mb-6">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-foreground mb-2 sm:mb-3 md:mb-4">
          Forms & Documents
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4 md:p-8 text-center">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 mx-auto text-amber-600 mb-2 sm:mb-3 md:mb-4" />
          <h3 className="font-semibold text-amber-900 mb-1 sm:mb-2 text-sm sm:text-base md:text-lg">
            The student is Archived
          </h3>
          <p className="text-xs sm:text-sm text-amber-700">
            Form viewing is disabled for archived students.
          </p>
        </div>
      </div>
    </div>;
  }

  // Forms grid view with tabs
  return <div className="px-2 sm:px-0">
    <div className="mb-3 sm:mb-4 md:mb-6">
      <div className="mb-3 sm:mb-4 space-y-2">
        {/* Row 1: Title */}
        <h2 className="text-sm sm:text-base font-bold text-slate-900">Forms & Documents</h2>
        {/* Row 2: Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
            <button
              type="button"
              onClick={() => handleViewModeChange('card')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="h-3 w-3" />
              <span className="hidden sm:inline">Card</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('table')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="h-3 w-3" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
          {onYearFilterChange && (
            <Select value={yearFilter} onValueChange={onYearFilterChange}>
              <SelectTrigger className="w-24 h-7 text-[11px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => {
                  const year = (new Date().getFullYear() - i).toString();
                  return <SelectItem key={year} value={year}>{year}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}
          {enrollmentId && (
            <button
              onClick={handleDownloadAll}
              disabled={isDownloadingAll || !allForms.some(f => f.status === 'Approved')}
              title={!allForms.some(f => f.status === 'Approved') ? 'No completed forms available' : 'Download all approved forms as ZIP'}
              className="flex items-center gap-1 rounded-lg border border-dashed border-[#0F2D52]/40 bg-white/60 px-2 py-1.5 text-[11px] font-medium text-[#0F2D52] transition-all hover:border-[#0F2D52] hover:bg-[#0F2D52]/5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloadingAll
                ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0F2D52] border-t-transparent" />
                : <Download className="h-3 w-3" />}
              <span>{isDownloadingAll ? 'Downloading…' : 'Download All'}</span>
            </button>
          )}
        </div>
        {openError && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{openError}</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        // If a child tab is clicked, notify parent to update selected child
        if (value !== 'family' && onChildSelect) {
          // Find the child by ID and pass their name to onChildSelect
          const child = childSpecificForms.find(c => c.childId === value);
          if (child) {
            onChildSelect(child.childName);
          }
        }
      }}>
        {(childSpecificForms.length > 1 || familyForms.length > 0) && (
          <div className="mb-2 sm:mb-3 md:mb-4 overflow-x-auto">
            <TabsList className="w-max h-8 sm:h-10">
              {familyForms.length > 0 && (
                <TabsTrigger value="family" className="text-xs sm:text-sm px-2 sm:px-3">Family Forms</TabsTrigger>
              )}
              {childSpecificForms.length > 1 && childSpecificForms.map((child) => (
                <TabsTrigger key={child.childId} value={child.childId} className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                  <span className="sm:hidden">{child.childName.split(' ')[0]}</span>
                  <span className="hidden sm:inline">{child.childName}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        )}

        {childSpecificForms.map((child) => (
          <TabsContent key={child.childId} value={child.childId}>
            {getFormsForTab(child.childId).length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-3 sm:p-4 md:p-6 text-xs sm:text-sm text-muted-foreground">
                No forms available for {child.childName} yet.
              </div>
            ) : viewMode === 'table' ? (
              <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto">
                <table className="w-full min-w-[320px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-[45%]">Form</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Assigned</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Due</th>
                      <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="text-right px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFormsForTab(child.childId).map(form => {
                      const isApproved = form.status === 'Approved';
                      const isDisabled = form.status !== 'Approved' && !extractStudentFormAssignmentId(form.studentFormAssignmentId);
                      const isLoadingThis = loadingAction?.formId === (form.formId || form._key);
                      return (
                        <tr
                          key={form._key}
                          className={cn('border-b border-slate-50 last:border-0 transition-colors', isDisabled ? 'opacity-60' : 'hover:bg-slate-50/60 cursor-pointer')}
                          onClick={() => { if (isDisabled) return; handleView(form); }}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                                <FileText className="h-3 w-3 text-white" />
                              </div>
                              <span className="font-semibold text-slate-900 text-[11px] sm:text-xs line-clamp-2 leading-tight">{form.title}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px] hidden sm:table-cell whitespace-nowrap">{form.lastUpdated}</td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px] hidden sm:table-cell whitespace-nowrap">{form.dueDate || '—'}</td>
                          <td className="px-3 py-2.5">
                            <StatusBadge status={form.status} className="text-[10px] px-1.5 py-0.5 gap-0.5 mt-0" />
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-0.5 justify-end" onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" disabled={isDisabled} onClick={() => handleView(form)} title="View">
                                {isLoadingThis && loadingAction?.action === 'view'
                                  ? <span className="animate-spin h-3 w-3 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                                  : <Eye className="h-3 w-3" />}
                              </Button>
                              {isApproved && (form.rawData?.recent_pdf_link || form.recentPdfLink) && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" disabled={isLoadingThis} onClick={() => handleDownload(form)} title="Download">
                                    {isLoadingThis && loadingAction?.action === 'download' ? <span className="animate-spin h-3 w-3 border-2 border-[#0F2D52] border-t-transparent rounded-full" /> : <Download className="h-3 w-3" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" disabled={isLoadingThis} onClick={() => handlePrint(form)} title="Print">
                                    {isLoadingThis && loadingAction?.action === 'print' ? <span className="animate-spin h-3 w-3 border-2 border-[#0F2D52] border-t-transparent rounded-full" /> : <Printer className="h-3 w-3" />}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {getFormsForTab(child.childId).map(form => (
                  <FormCard
                    key={form._key}
                    title={form.title}
                    description={form.description}
                    lastUpdated={form.lastUpdated}
                    status={form.status}
                    childName={form.childName}
                    formId={form.formId || form._key}
                    recentPdfLink={form.rawData?.recent_pdf_link || form.recentPdfLink}
                    assignedAt={form.assignedAt}
                    dueDate={form.dueDate}
                    disabled={form.status !== 'Approved' && !extractStudentFormAssignmentId(form.studentFormAssignmentId)}
                    disabledReason={form.status !== 'Approved' && !extractStudentFormAssignmentId(form.studentFormAssignmentId) ? 'Loading form assignment… (missing student_form_assignment_id)' : undefined}
                    onView={() => {
                      console.log('Form ID:', form.formId || form._key);
                      console.log('Child ID:', form.childId);
                      console.log('Form data passss:', form);
                      handleView(form);
                    }}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </div>;
}
