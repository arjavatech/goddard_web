import { useMemo, useState, useEffect, useRef, MutableRefObject } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Download, Printer, Eye, AlertCircle, LayoutGrid, List } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { uploadFormMock, getMockUploadedForms, isMockRecord, getMockPdfFromIdb } from '../../services/api/formUpload';
import { getFilloutUserContext, appendFilloutUserParams } from '../../services/api/fillout';
import { cn } from '../../lib/utils';
import { isFormBuilderUrl } from '../../lib/formBuilderUrl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { DocumentUploader } from '../forms/DocumentUploader';
import { PdfPreviewModal } from '../forms/PdfPreviewModal';
import { DocumentRequest, documentRequestsApi } from '../../services/api/documentRequests';
import { UploadCloud, CheckCircle, Clock, FileSearch } from 'lucide-react';
import { Badge } from '../ui/badge';
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
  onUploadClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  isLoading?: { action: string; formId: string } | null;
  formId?: string;
  assignedAt?: string | null;
  dueDate?: string | null;
  onViewUploaded?: () => void;
  hasUploadedFile?: boolean;
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
  onUploadClick,
  disabled = false,
  disabledReason,
  isLoading,
  formId,
  dueDate,
  onViewUploaded,
  hasUploadedFile
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
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                onClick={(e) => { e.stopPropagation(); if (disabled) return; onView(); }}
                title="View Form"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {onUploadClick && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200 ml-1"
                  onClick={(e) => { e.stopPropagation(); if (disabled) return; onUploadClick(); }}
                  title="Upload Form PDF"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                </Button>
              )}
              {hasUploadedFile && onViewUploaded && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200 ml-1"
                  onClick={(e) => { e.stopPropagation(); if (disabled) return; onViewUploaded(); }}
                  title="Preview Uploaded Form"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
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
    documentRequests?: DocumentRequest[];
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
  onFormCompleted?: (forceFullRefresh?: boolean) => void; // Callback when form is completed to trigger refresh
  onFormViewChange?: (isOpen: boolean) => void; // Callback when form view opens/closes
  yearFilter?: string; // Year filter value
  onYearFilterChange?: (year: string) => void; // Callback to change year filter
  enrollmentId?: string; // For downloading all forms
  formOpenGuard?: MutableRefObject<boolean>; // Shared ref across instances — first to claim blocks the other
  selectedChildDob?: string; // DOB of the selected child
  selectedChildGender?: string; // Gender of the selected child
  parentEmail?: string; // Parent email
}
export function FormsDocuments({
  childSpecificForms,
  familyForms,
  rawFormData,
  selectedChildId,
  selectedChildName,
  childStatus = 'active',
  onChildSelect,
  onViewForm,
  formToOpen,
  onFormOpened,
  onFormCompleted,
  onFormViewChange,
  yearFilter = 'all',
  onYearFilterChange,
  enrollmentId,
  formOpenGuard,
  selectedChildDob,
  selectedChildGender,
  parentEmail,
}: FormsDocumentsProps) {
  const { userData } = useUserContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState<{ action: string; formId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(selectedChildId || childSpecificForms[0]?.childId || 'family');
  const previousChildIdRef = useRef<string | undefined>(selectedChildId);
  const [openError, setOpenError] = useState<string | null>(null);
  const isOpeningRef = useRef(false);
  const processedFormToOpenRef = useRef<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleViewUploaded = async (assignmentId: string) => {
    try {
      const file = await getMockPdfFromIdb(assignmentId);
      if (file) {
        const url = URL.createObjectURL(file);
        setPreviewPdfUrl(url);
        setIsPreviewOpen(true);
      } else {
        showToast('error', 'Uploaded file not found. It may have expired or you are in a different session.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load preview');
    }
  };
  const [selectedDocumentRequest, setSelectedDocumentRequest] = useState<DocumentRequest | null>(null);
  const [selectedFormForUpload, setSelectedFormForUpload] = useState<any | null>(null);
  const [isUploadingMock, setIsUploadingMock] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(
    (localStorage.getItem('parentFormsViewMode') as 'card' | 'table') || 'card'
  );
  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('parentFormsViewMode', mode);
  };
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
      setOpenError(null);
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
          // console.log('Matching form for:', form.title, 'formId:', form.formId);
          // console.log('Raw child data:', rawChild);
          // console.log('Available raw forms (full):', rawChild?.forms);
          const matchingRawForm = rawChild?.forms?.find((rawForm: any) => {
            return rawForm.formId === form.formId ||
              rawForm.formName === form.title ||
              rawForm.formName === form.description;
          });

          // console.log('Final matching result:', matchingRawForm);
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
      }),
      ...[
        {
          title: 'Mock Form 1',
          description: 'Testing upload workflow 1',
          status: 'Draft',
          formId: 'mock-parent-1',
          studentFormAssignmentId: 'mock-parent-1',
          lastUpdated: new Date().toLocaleDateString(),
          dueDate: '2027-01-01'
        },
        {
          title: 'Mock Form 2',
          description: 'Testing upload workflow 2',
          status: 'Draft',
          formId: 'mock-parent-2',
          studentFormAssignmentId: 'mock-parent-2',
          lastUpdated: new Date().toLocaleDateString(),
          dueDate: '2027-01-01'
        },
        {
          title: 'Mock Form 3',
          description: 'Testing upload workflow 3',
          status: 'Draft',
          formId: 'mock-parent-3',
          studentFormAssignmentId: 'mock-parent-3',
          lastUpdated: new Date().toLocaleDateString(),
          dueDate: '2027-01-01'
        }
      ].map(mockForm => {
        const uploaded = getMockUploadedForms().find(f => f.assignmentId === mockForm.studentFormAssignmentId);
        return {
          ...mockForm,
          childId: selectedChildId || childSpecificForms[0]?.childId,
          childName: selectedChildName || childSpecificForms[0]?.childName,
          _key: `mock-${mockForm.formId}`,
          rawData: null,
          status: uploaded ? uploaded.status : mockForm.status
        };
      })
    ];
  }, [familyForms, childSpecificForms, rawFormData, selectedChildId, selectedChildName]);

  const handleView = async (form: any) => {
    if (isOpeningRef.current) return;
    isOpeningRef.current = true;
    try {
      setOpenError(null);
      // console.log('handleView called with form:', form);
      // console.log('Form ID:', form.formId || form._key);
      // console.log('Child ID form opening:', form.childId);
      // console.log('Selected Child ID:', selectedChildId);
      // console.log('Form data:', form);
      // console.log('Active Tab:', activeTab);
      // Skip validation for forms from Continue button
      if (form.fromContinueButton) {
        // console.log('✓ Form from Continue button - bypassing child ID validation');
      } else {
        // Ensure we're using the correct child's data
        if (form.childId && form.childId !== activeTab && form.childId !== selectedChildId) {
          // console.warn('Form child ID does not match selected child ID - blocking form open');
          return;
        }
        // console.log('✓ Child ID validation passed - opening form for correct child');
      }

      let formUrl = '#';

      // Extract all possible URL sources from rawData and form object
      const rawData = form.rawData || {};
      // console.log('Raw data for form:', form);
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
      // console.log('Form data for URL construction:', {
      //   status: form.status,
      //   recentEditLink,
      //   recentPdfLink,
      //   filloutFormId,
      //   studentFormAssignmentId,
      //   studentFormAssignmentIdNumber: idForPayload.asNumber,
      //   formId,
      //   rawData
      // });

      const isReadOnly = form.status === 'Approved' || form.status === 'Submitted';

      if (isReadOnly) {
        return;
      } else {
        const isFillout = (() => {
          const link = recentEditLink || filloutFormId;
          if (!link) return false;
          if (link.includes('fillout.com')) return true;
          if (isFormBuilderUrl(link)) return true; // Supports every tenant subdomain.
          if (!link.startsWith('http')) return true; // Legacy slugs/IDs are treated as Fillout
          return false;
        })();

        if (isFillout) {
          // Backend validation requires this hidden field; do not open Fillout without it.
          // Exception: if recentEditLink is available, allow opening directly without assignment ID.
          if (!idForPayload.isValid && !(recentEditLink && recentEditLink !== '#' && recentEditLink.trim() !== '')) {
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
            // Ensure student_form_assignment_id is present even on edit/resume links
            if (idForPayload.raw && !formUrl.includes('student_form_assignment_id')) {
              formUrl += `${formUrl.includes('?') ? '&' : '?'}student_form_assignment_id=${idForPayload.raw}`;
            }
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
            // console.log('Default form ID used:', defaultFormId)
            formUrl = `https://goddard.fillout.com/${defaultFormId}?student_form_assignment_id=${idForPayload.raw}`;
          }

          // Attach the Fillout user context (user_id + user_token) so signatures and
          // initials saved on earlier forms can be re-used in this one. Provisioning
          // failures degrade gracefully — the form still opens without re-use.
          if (formUrl && formUrl !== '#') {
            const filloutEmail = (userData?.email || user?.email || '').trim().toLowerCase();
            // Stable identity only: Goddard parentId or the email itself. The auth
            // user id must not be used — before userData loads it would provision a
            // second Fillout user for the same parent (and the dev bypass id is
            // shared by everyone).
            const externalUserId = userData?.parentId || filloutEmail;
            if (!externalUserId) {
              console.warn('[Fillout] Skipping user provisioning — parent identity not loaded yet (no parentId/email)');
            }
            if (externalUserId) {
              const parentName =
                [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || filloutEmail || 'Goddard Parent';
              const filloutCtx = await getFilloutUserContext({
                externalUserId,
                email: filloutEmail || `${externalUserId}@goddard.parent`,
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
      // Append child/parent params for all non-readonly form URLs
      if (!isReadOnly && formUrl && formUrl !== '#') {
        const toYMD = (v: string | undefined | null): string | null => {
          if (!v || v === '—') return null;
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        };
        const prefill: Record<string, string> = {};
        const dob = toYMD(selectedChildDob);
        const parentName = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ');
        const parentNameTitled = parentName.replace(/\b\w/g, c => c.toUpperCase());
        const parentNameUpper  = parentName.toUpperCase();
        if (form.childName)      prefill['child_name']   = form.childName;
        if (dob)                 prefill['child_dob']    = dob;
        if (selectedChildGender) prefill['child_gender'] = selectedChildGender.charAt(0).toUpperCase() + selectedChildGender.slice(1).toLowerCase();
        if (parentEmail)         prefill['parent_email'] = parentEmail;
        if (parentNameTitled)    prefill['parent_name']  = parentNameTitled;
        if (parentNameUpper)     prefill['print_name']   = parentNameUpper;
        const paramStr = Object.entries(prefill)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
          .join('&');
        if (paramStr) formUrl += `${formUrl.includes('?') ? '&' : '?'}${paramStr}`;
      }
      // console.log('Final form URL:', formUrl);
      // console.log('[Fillout] READY payload (frontend):', {
      //   student_form_assignment_id: idForPayload.asNumber ?? idForPayload.raw,
      //   student_form_assignment_id_raw: idForPayload.raw,
      //   student_form_assignment_id_number: idForPayload.asNumber,
      //   viewUrl: formUrl
      // });

      const tabForms = getFormsForTab(form.childId || activeTab);
      const completedCount = tabForms.filter((f: any) =>
        f.status === 'Approved' || f.status === 'Submitted'
      ).length;
      navigate(`/${schoolSlug}/dashboard/form/${encodeURIComponent(form.formId || form._key)}`, {
        state: {
          viewUrl: formUrl,
          title: form.title,
          status: form.status,
          childName: form.childName,
          returnPath: `/${schoolSlug}/dashboard`,
          isDocumentRequest: form.isDocumentRequest,
          siblingForms: tabForms.map((f: any) => ({
            formId: f.formId || f._key,
            title: f.title,
            status: f.status,
            recentPdfLink: f.rawData?.recent_pdf_link || f.rawData?.recentPdfLink || f.recentPdfLink || null,
            recentEditLink: f.rawData?.recent_edit_link || f.rawData?.recentEditLink || f.recentEditLink || null,
            filloutFormId: f.rawData?.fillout_form_id || f.rawData?.filloutFormId || f.filloutFormId || null,
            studentFormAssignmentId: f.studentFormAssignmentId ||
              f.rawData?.student_form_assignment_id || f.rawData?.studentFormAssignmentId || null,
            childName: f.childName || null,
            isDocumentRequest: f.isDocumentRequest,
          })),
          completedCount,
          totalForms: tabForms.length,
        }
      });
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

    // console.log('Auto-opening form:', formToOpen);
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
      // Individual child tab - filter by childId matching the active tab
      return allForms.filter(form => form.childId === tabValue);
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
  return (
    <div className="px-2 sm:px-0">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          if (value !== 'family' && onChildSelect) {
            const child = childSpecificForms.find(c => c.childId === value);
            if (child) onChildSelect(child.childName);
          }
        }}
      >
        {/* ── Section header card ── */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-4">
          {/* Gradient title + controls */}
          <div className="bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4] px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Enrollment</p>
                <h2 className="text-sm font-bold text-white leading-tight">Forms & Documents</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span className="hidden sm:inline">Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <List className="h-3 w-3" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </div>
              {onYearFilterChange && (
                <Select value={yearFilter} onValueChange={onYearFilterChange}>
                  <SelectTrigger className="w-auto min-w-[70px] sm:w-24 h-7 text-[11px] bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-0 focus:ring-offset-0">
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
                <Button
                  size="sm"
                  onClick={handleDownloadAll}
                  disabled={isDownloadingAll || !allForms.some(f => f.status === 'Approved')}
                  title={!allForms.some(f => f.status === 'Approved') ? 'No completed forms available' : 'Download all approved forms as ZIP'}
                  className="h-7 px-2.5 text-[11px] gap-1 bg-white text-[#0F2D52] hover:text-[#0F2D52] hover:bg-slate-100 border-0 shadow-sm font-bold flex-1 sm:flex-none justify-center"
                >
                  {isDownloadingAll
                    ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#0F2D52] border-t-transparent" />
                    : <Download className="h-3 w-3" />}
                  <span>{isDownloadingAll ? 'Downloading…' : 'Download All'}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Child-name tab triggers + error */}
          {(childSpecificForms.length > 1 || familyForms.length > 0 || openError) && (
            <div className="px-4 sm:px-5 pt-3 pb-3 border-t border-slate-100">
              {openError && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{openError}</span>
                </div>
              )}
              {(childSpecificForms.length > 1 || familyForms.length > 0) && (
                <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
                  <TabsList className="h-auto bg-transparent p-0 gap-1.5 flex w-max">
                    {familyForms.length > 0 && (
                      <TabsTrigger
                        value="family"
                        className="h-8 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 whitespace-nowrap shadow-none transition-all data-[state=active]:bg-[#0F2D52] data-[state=active]:text-white data-[state=active]:border-[#0F2D52] data-[state=active]:shadow-sm hover:border-[#0F2D52]/40 hover:text-[#0F2D52] data-[state=active]:hover:text-white"
                      >
                        Family Forms
                      </TabsTrigger>
                    )}
                    {childSpecificForms.length > 1 && [...childSpecificForms].sort((a, b) => a.childName.localeCompare(b.childName)).map((child) => (
                      <TabsTrigger
                        key={child.childId}
                        value={child.childId}
                        className="h-8 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 whitespace-nowrap shadow-none transition-all data-[state=active]:bg-[#0F2D52] data-[state=active]:hover:bg-[#0F2D52]/90 data-[state=active]:text-white data-[state=active]:border-[#0F2D52] data-[state=active]:shadow-sm hover:border-[#0F2D52]/40 data-[state=inactive]:hover:text-[#0F2D52] data-[state=active]:hover:text-white"
                      >
                        <span className="sm:hidden">{child.childName.split(' ')[0]}</span>
                        <span className="hidden sm:inline">{child.childName}</span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tab content: form cards / table ── */}
        {familyForms.length > 0 && (
          <TabsContent value="family" className="mt-0">
            {getFormsForTab('family').length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 text-center">
                No family forms available yet.
              </div>
            ) : viewMode === 'table' ? (
              <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto shadow-sm">
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
                    {getFormsForTab('family').map(form => {
                      const isApproved = form.status === 'Approved';
                      const assignmentIdStr = extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key;
                      const hasUploadedFile = !!(assignmentIdStr && isMockRecord(assignmentIdStr) && ['Submitted', 'Needs Revision', 'Approved'].includes(form.status));
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
                              {!isApproved && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" disabled={isDisabled} onClick={() => handleView(form)} title="View">
                                    {isLoadingThis && loadingAction?.action === 'view'
                                      ? <span className="animate-spin h-3 w-3 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                                      : <Eye className="h-3 w-3" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52] ml-1" disabled={isDisabled} onClick={() => setSelectedFormForUpload(form)} title="Upload Form PDF">
                                    <UploadCloud className="h-3 w-3" />
                                  </Button>
                                  {hasUploadedFile && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52] ml-1" disabled={isDisabled} onClick={(e) => { e.stopPropagation(); handleViewUploaded(assignmentIdStr); }} title="Preview Uploaded Form">
                                      <FileSearch className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
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
                {getFormsForTab('family').map(form => (
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
                    onView={() => handleView(form)}
                    hasUploadedFile={!!(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key ? isMockRecord(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key) && ['Submitted', 'Needs Revision', 'Approved'].includes(form.status) : false)}
                    onViewUploaded={() => handleViewUploaded(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key)}
                    onUploadClick={() => setSelectedFormForUpload(form)}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
        {childSpecificForms.map((child) => (
          <TabsContent key={child.childId} value={child.childId} className="mt-0">
            {getFormsForTab(child.childId).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500 text-center">
                No forms available for {child.childName} yet.
              </div>
            ) : viewMode === 'table' ? (
              <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto shadow-sm">
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
                      const assignmentIdStr = extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key;
                      const hasUploadedFile = !!(assignmentIdStr && isMockRecord(assignmentIdStr) && ['Submitted', 'Needs Revision', 'Approved'].includes(form.status));
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
                              {!isApproved && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52]" disabled={isDisabled} onClick={() => handleView(form)} title="View">
                                    {isLoadingThis && loadingAction?.action === 'view'
                                      ? <span className="animate-spin h-3 w-3 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                                      : <Eye className="h-3 w-3" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52] ml-1" disabled={isDisabled} onClick={() => setSelectedFormForUpload(form)} title="Upload Form PDF">
                                    <UploadCloud className="h-3 w-3" />
                                  </Button>
                                  {hasUploadedFile && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-slate-400 hover:text-[#0F2D52] ml-1" disabled={isDisabled} onClick={(e) => { e.stopPropagation(); handleViewUploaded(assignmentIdStr); }} title="Preview Uploaded Form">
                                      <FileSearch className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
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
                    onView={() => handleView(form)}
                    hasUploadedFile={!!(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key ? isMockRecord(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key) && ['Submitted', 'Needs Revision', 'Approved'].includes(form.status) : false)}
                    onViewUploaded={() => handleViewUploaded(extractStudentFormAssignmentId(form.studentFormAssignmentId) || form.formId || form._key)}
                    onUploadClick={() => setSelectedFormForUpload(form)}
                    onDownload={() => handleDownload(form)}
                    onPrint={() => handlePrint(form)}
                    isLoading={loadingAction}
                  />
                ))}
              </div>
            )}
            
            {/* Requested Documents Section (Separated from Forms) */}
            {child.documentRequests && child.documentRequests.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-slate-800">Requested Documents</h3>
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {child.documentRequests.length}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {child.documentRequests.map(req => {
                    return (
                      <div 
                        key={req.id} 
                        className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col hover:border-slate-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-3 flex-1 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <UploadCloud className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 leading-snug truncate" title={req.title}>{req.title}</h4>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-xs text-slate-500">
                                {req.documents && req.documents.length > 0 ? `${req.documents.length} document${req.documents.length === 1 ? '' : 's'} uploaded` : 'No documents uploaded yet'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          className="w-full text-xs h-9 rounded-xl font-semibold bg-[#0891b2] hover:bg-[#0e7490] text-white"
                          onClick={() => setSelectedDocumentRequest(req)}
                        >
                          Manage Documents
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          if (previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
          }
        }}
        fileUrl={previewPdfUrl}
      />

      {/* Document Uploader Modal */}
      <Dialog 
        open={!!selectedDocumentRequest} 
        onOpenChange={(open) => !open && setSelectedDocumentRequest(null)}
      >
        <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-slate-50 rounded-2xl border-0 shadow-xl">
          <DialogHeader className="px-6 py-4 bg-white border-b border-slate-100">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {selectedDocumentRequest?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-0">
            {selectedDocumentRequest && (
              <div className="flex flex-col md:flex-row h-full max-h-[70vh]">
                {/* Left side: Upload */}
                <div className="flex-1 p-6 bg-white border-r border-slate-100 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-slate-900 mb-4">Upload New Document</h4>
                  <DocumentUploader
                    onUpload={async (file) => {
                      if (selectedDocumentRequest) {
                        const updatedReq = await documentRequestsApi.uploadDocumentForRequest(selectedDocumentRequest.id, file);
                        setSelectedDocumentRequest(updatedReq);
                        if (onFormCompleted) {
                          onFormCompleted(true);
                        }
                      }
                    }}
                  />
                </div>
                
                {/* Right side: Uploaded Documents */}
                <div className="w-full md:w-[350px] lg:w-[400px] p-6 bg-slate-50 overflow-y-auto">
                  <h4 className="text-sm font-semibold text-slate-900 mb-4">Uploaded Documents</h4>
                  {selectedDocumentRequest.documents && selectedDocumentRequest.documents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedDocumentRequest.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate" title={doc.name}>{doc.name}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="flex-shrink-0 hover:bg-slate-100" onClick={() => window.open(doc.url, '_blank')} title="Download">
                            <Download className="w-4 h-4 text-slate-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center h-full min-h-[200px]">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <FileText className="w-6 h-6 text-slate-300" />
                      </div>
                      <p className="text-sm font-medium text-slate-600">No documents uploaded yet</p>
                      <p className="text-xs text-slate-400 mt-1">Upload a document on the left to see it here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Form PDF Uploader Modal */}
      <Dialog 
        open={!!selectedFormForUpload} 
        onOpenChange={(open) => !open && setSelectedFormForUpload(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] p-0 overflow-y-auto bg-slate-50 rounded-2xl border-0 shadow-xl">
          <DialogHeader className="px-4 py-4 sm:px-6 bg-white border-b border-slate-100 relative">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 break-words pr-12 text-left">
              Select Form: {selectedFormForUpload?.title || selectedFormForUpload?.formName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 sm:p-6">
            <DocumentUploader
              entityName="Form"
              onUpload={async (file) => {
                  if (selectedFormForUpload && !isUploadingMock) {
                    setIsUploadingMock(true);
                    try {
                      await uploadFormMock({
                        file,
                        assignmentId: selectedFormForUpload.studentFormAssignmentId || selectedFormForUpload.formId || '',
                        entityType: 'student'
                      }, {
                        schoolId: userData?.schoolId || '',
                        formTemplateId: selectedFormForUpload.formId || '',
                        formName: selectedFormForUpload.title || selectedFormForUpload.formName || 'Form',
                        studentName: selectedChildName || selectedFormForUpload.childName || '',
                        parentName: `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim(),
                        parentEmail: userData?.email || ''
                      });
                      
                      showToast('success', 'Form uploaded successfully and is pending approval.');
                      setSelectedFormForUpload(null);
                      if (onFormCompleted) {
                        onFormCompleted(true);
                      }
                    } finally {
                      setIsUploadingMock(false);
                    }
                  }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
