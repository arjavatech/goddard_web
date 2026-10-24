import React, { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail as MailIcon, Calendar, School, CheckCircle, AlertCircle, FileText, ChevronLeft, Eye, Users, Download, Printer, ChevronDown, ChevronUp, Phone, MapPin, Upload, Pencil } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../contexts/ToastContext';
import { fetchParentDetails, revokeStudentFormAssignment, updateApprovedFormMetadata } from '../../services/api/admin';
import { fetchDocumentAssignments, reviewDocument, documentFileUrl, documentUploadIntent, completeDocumentUpload, updateDocumentMetadata, changeDocumentStatus, DocumentAssignment } from '../../services/api/documentRequests';
import { ApproveFormModal } from '../../components/admin/ApproveFormModal';
import { UploadDocumentModal } from '../../components/admin/UploadDocumentModal';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { reviewForm } from '../../services/api/forms';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';
import { useUserContext } from '../../contexts/UserContext';
import { ManualUploadModal } from '../../components/admin/ManualUploadModal';
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
  manualPdfUploadedAt?: string | null;
  submissionSource?: string;
  formAcademicYear?: string | null;
  approvedFormName?: string | null;
}
interface ChildInfo {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender?: string;
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
  address?: string | null;
  relationType?: string | null;
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
    schoolSlug,
    parentId
  } = useParams<{
    schoolSlug: string;
    parentId: string;
  }>();
  const location = useLocation();
  const navigate = useNavigate();
  const passedParentData = location.state?.parentData;
  const [parent, setParent] = useState<ParentDetailView | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});
  const toggleChildExpand = (childId: string) => {
    setExpandedChildren(prev => ({ ...prev, [childId]: !prev[childId] }));
  };
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [formAction, setFormAction] = useState<'approve' | 'reject' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<{ formId: string, action: 'download' | 'print' } | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedFormForUpload, setSelectedFormForUpload] = useState<{ form: Form; childName: string } | null>(null);
  const [isManualUploadOpen, setIsManualUploadOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingFormMeta, setEditingFormMeta] = useState<{ form: Form; childName: string } | null>(null);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [revokeFormData, setRevokeFormData] = useState<{ form: Form; childId: string } | null>(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [revokeTargetStatus, setRevokeTargetStatus] = useState<'in_progress' | 'rejected'>('in_progress');
  const [isRevoking, setIsRevoking] = useState(false);
  const [childDocuments, setChildDocuments] = useState<Record<string, DocumentAssignment[]>>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [docApproving, setDocApproving] = useState<{ doc: DocumentAssignment; childName: string } | null>(null);
  const [isApprovingDoc, setIsApprovingDoc] = useState(false);
  const [docLoadingAction, setDocLoadingAction] = useState<{ docId: string; action: 'download' | 'print' } | null>(null);
  const [docRejecting, setDocRejecting] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isRejectingDoc, setIsRejectingDoc] = useState(false);
  const [docRejectReason, setDocRejectReason] = useState('');
  const [docUploading, setDocUploading] = useState<{ doc: DocumentAssignment; childName: string } | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docEditingMeta, setDocEditingMeta] = useState<{ doc: DocumentAssignment; childName: string } | null>(null);
  const [isSavingDocMeta, setIsSavingDocMeta] = useState(false);
  const [docChangingStatus, setDocChangingStatus] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isChangingDocStatus, setIsChangingDocStatus] = useState(false);
  const [docChangeStatusReason, setDocChangeStatusReason] = useState('');
  const [docTargetStatus, setDocTargetStatus] = useState<'pending' | 'rejected'>('pending');
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const isAdminOrSuperAdmin = userData?.role === 'Admin' || userData?.role === 'SuperAdmin';

  const schoolId = localStorage.getItem('schoolId');
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (refreshKey === 0) setIsLoading(true);
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
        const [templates] = await Promise.all([fetchFormTemplates(schoolId).catch(() => [])]);
        if (!isMounted) return;
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
                approvedOn: form.approved_on || form.approvedOn || null,
                manualPdfUploadedAt: form.manual_pdf_uploaded_at || form.manualPdfUploadedAt || null,
                formAcademicYear: form.form_academic_year || form.formAcademicYear || null,
                approvedFormName: form.approved_form_name || form.approvedFormName || null,
              } satisfies Form;



              return formObj;
            });
          }
          const completed = formsArray.filter(form => COMPLETION_STATUSES.has(form.status)).length;
          const progress = formsArray.length > 0 ? Math.round(completed / formsArray.length * 100) : 0;
          const classroomInfo = {
            id: child.classroomId ?? 'Unassigned',
            name: child.classroomName ?? 'Unassigned'
          };
          const [firstName, ...lastNameParts] = child.childFullName.split(' ');
          return {
            id: child.childId,
            firstName: firstName || 'Unknown',
            lastName: lastNameParts.join(' ') || 'Child',
            dob: child.childDob || '—',
            gender: child.childGender,
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
          phone: (parentRecord as any).phoneNumber || '—',
          address: (parentRecord as any).address || null,
          relationType: (parentRecord as any).relationType || null,
          children: processedChildren,
          familyForms: Array.from(allForms.values()),
          additionalParentEmail,
          additionalParentName,
          primaryParentEmail: firstChild ? (firstChild as any).primaryParentEmail : null,
          secondaryParentEmail: firstChild ? (firstChild as any).secondaryParentEmail : null
        };
        setParent(finalParentData);
        if (processedChildren.length > 0) {
          const routeSelectedChildId = location.state?.selectedChildId;
          let targetId = processedChildren[0].id;

          if (routeSelectedChildId) {
            const found = processedChildren.find(child => child.id === routeSelectedChildId);
            if (found) targetId = found.id;
          } else {
            const urlParams = new URLSearchParams(location.search);
            const childIdFromUrl = urlParams.get('childId');
            if (childIdFromUrl) {
              const found = processedChildren.find(child => child.id === childIdFromUrl);
              if (found) targetId = found.id;
            }
          }

          setSelectedChildId(targetId);
          const routeChildId = location.state?.selectedChildId || new URLSearchParams(location.search).get('childId');
          setExpandedChildren(routeChildId ? { [targetId]: true } : {});
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
  }, [parentId, refreshKey]);

  // Fetch all student document assignments for this school, grouped by child name
  useEffect(() => {
    if (!schoolId) return;
    setIsLoadingDocuments(true);
    fetchDocumentAssignments({ school_id: schoolId, audience: 'student', limit: 1000 })
      .then(result => {
        const grouped: Record<string, DocumentAssignment[]> = {};
        result.items.forEach(doc => {
          if (!grouped[doc.subject_name]) grouped[doc.subject_name] = [];
          grouped[doc.subject_name].push(doc);
        });
        setChildDocuments(grouped);
      })
      .catch(() => {})
      .finally(() => setIsLoadingDocuments(false));
  }, [schoolId, refreshKey]);

  const selectedChild = useMemo(() => parent?.children.find(child => child.id === selectedChildId) || parent?.children[0], [parent?.children, selectedChildId]);

  // Extract all available academic years from formAcademicYear field
  const availableAcademicYears = useMemo(() => {
    if (!parent) return [];
    const yearsSet = new Set<string>();

    parent.children.forEach(child => {
      child.forms.forEach(form => {
        if (form.formAcademicYear) yearsSet.add(form.formAcademicYear);
      });
    });

    // Also include years from document assignments
    Object.values(childDocuments).flat().forEach(doc => {
      if (doc.form_academic_year) yearsSet.add(doc.form_academic_year);
    });

    // Always include current academic year so the filter is always visible
    const y = new Date().getFullYear();
    yearsSet.add(`${y}-${y + 1}`);

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [parent, childDocuments]);
  const openReviewDialog = (form: Form, action: 'approve' | 'reject') => {
    setSelectedForm(form);
    setFormAction(action);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
  };

  const handleDownload = async (form: Form, childName?: string) => {
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
      
      const formattedChildName = childName 
        ? childName.replace(/\s+/g, '_') 
        : `${selectedChild?.firstName || 'student'}_${selectedChild?.lastName || ''}`;
        
      link.download = `${form.approvedFormName || `${form.title.replace(/\s+/g, '_')}_${formattedChildName}`}.pdf`;

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

  const handleEditMetaConfirm = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!editingFormMeta?.form.studentFormAssignmentId || !schoolId) return;
    setIsSavingMeta(true);
    try {
      await updateApprovedFormMetadata(
        editingFormMeta.form.studentFormAssignmentId,
        schoolId,
        data.formAcademicYear,
        data.approvedFormName,
      );
      setRefreshKey(k => k + 1);
      setEditingFormMeta(null);
      showToast('success', 'Form details updated');
    } catch {
      showToast('error', 'Failed to update form details');
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleDocApproveConfirm = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!docApproving || !schoolId) return;
    setIsApprovingDoc(true);
    try {
      await reviewDocument(docApproving.doc.id, 'approved', undefined, data.formAcademicYear, data.approvedFormName);
      const result = await fetchDocumentAssignments({ school_id: schoolId, audience: 'student', limit: 1000 });
      const grouped: Record<string, DocumentAssignment[]> = {};
      result.items.forEach(doc => {
        if (!grouped[doc.subject_name]) grouped[doc.subject_name] = [];
        grouped[doc.subject_name].push(doc);
      });
      setChildDocuments(grouped);
      setDocApproving(null);
      showToast('success', 'Document approved successfully');
    } catch {
      showToast('error', 'Failed to approve document');
    } finally {
      setIsApprovingDoc(false);
    }
  };

  const handleDocDownload = async (doc: DocumentAssignment) => {
    if (!doc.latest_submission_id) return;
    try {
      const { url } = await documentFileUrl(doc.latest_submission_id, true);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.approved_form_name || doc.latest_file_name || doc.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      showToast('error', 'Failed to download document');
    }
  };

  const handleDocDownloadFile = async (doc: DocumentAssignment) => {
    if (!doc.latest_submission_id) return;
    setDocLoadingAction({ docId: doc.id, action: 'download' });
    try {
      const { url } = await documentFileUrl(doc.latest_submission_id, true);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.approved_form_name || doc.latest_file_name || doc.document_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showToast('error', 'Download failed');
    } finally {
      setDocLoadingAction(null);
    }
  };

  const handleDocPrint = async (doc: DocumentAssignment) => {
    if (!doc.latest_submission_id) return;
    setDocLoadingAction({ docId: doc.id, action: 'print' });
    try {
      const { url } = await documentFileUrl(doc.latest_submission_id, false);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => { printWindow.close(); window.URL.revokeObjectURL(blobUrl); };
          }, 1000);
        };
        setTimeout(() => { setDocLoadingAction(null); window.URL.revokeObjectURL(blobUrl); }, 3000);
        showToast('success', 'Print dialog opening...');
      } else {
        throw new Error('Popup blocked');
      }
    } catch (err: any) {
      showToast('error', err?.message === 'Popup blocked' ? 'Allow popups to print' : 'Print failed');
      setDocLoadingAction(null);
    }
  };

  const handleDocRejectConfirm = async () => {
    if (!docRejecting) return;
    setIsRejectingDoc(true);
    try {
      await reviewDocument(docRejecting.doc.id, 'rejected', docRejectReason);
      const result = await fetchDocumentAssignments({ school_id: schoolId!, audience: 'student', limit: 1000 });
      const grouped: Record<string, DocumentAssignment[]> = {};
      result.items.forEach(d => { if (!grouped[d.subject_name]) grouped[d.subject_name] = []; grouped[d.subject_name].push(d); });
      setChildDocuments(grouped);
      setDocRejecting(null);
      setDocRejectReason('');
      showToast('success', 'Document rejected');
    } catch {
      showToast('error', 'Failed to reject document');
    } finally {
      setIsRejectingDoc(false);
    }
  };

  const handleDocUploadWithApproval = async (data: { file: File; approvedFormName: string; formAcademicYear?: string }) => {
    if (!docUploading) return;
    setIsUploadingDoc(true);
    try {
      const { storage_key, upload_url } = await documentUploadIntent(docUploading.doc.id, data.file);
      await fetch(upload_url, { method: 'PUT', body: data.file, headers: { 'Content-Type': data.file.type } });
      await completeDocumentUpload(docUploading.doc.id, { storage_key, file_name: data.file.name, content_type: data.file.type, file_size_bytes: data.file.size });
      await reviewDocument(docUploading.doc.id, 'approved', undefined, data.formAcademicYear, data.approvedFormName);
      const result = await fetchDocumentAssignments({ school_id: schoolId!, audience: 'student', limit: 1000 });
      const grouped: Record<string, DocumentAssignment[]> = {};
      result.items.forEach(d => { if (!grouped[d.subject_name]) grouped[d.subject_name] = []; grouped[d.subject_name].push(d); });
      setChildDocuments(grouped);
      setDocUploading(null);
      showToast('success', 'Document uploaded and approved');
    } catch {
      showToast('error', 'Upload failed');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDocMetadataSave = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!docEditingMeta || !schoolId) return;
    setIsSavingDocMeta(true);
    try {
      await updateDocumentMetadata(docEditingMeta.doc.id, {
        school_id: schoolId,
        form_academic_year: data.formAcademicYear || undefined,
        approved_form_name: data.approvedFormName || undefined,
      });
      const result = await fetchDocumentAssignments({ school_id: schoolId, audience: 'student', limit: 1000 });
      const grouped: Record<string, DocumentAssignment[]> = {};
      result.items.forEach(d => { if (!grouped[d.subject_name]) grouped[d.subject_name] = []; grouped[d.subject_name].push(d); });
      setChildDocuments(grouped);
      setDocEditingMeta(null);
      showToast('success', 'Document metadata updated');
    } catch { showToast('error', 'Failed to update metadata'); }
    finally { setIsSavingDocMeta(false); }
  };

  const handleDocChangeStatus = async () => {
    if (!docChangingStatus || !schoolId) return;
    setIsChangingDocStatus(true);
    try {
      await changeDocumentStatus(docChangingStatus.doc.id, { status: docTargetStatus, reason: docChangeStatusReason || undefined });
      const result = await fetchDocumentAssignments({ school_id: schoolId, audience: 'student', limit: 1000 });
      const grouped: Record<string, DocumentAssignment[]> = {};
      result.items.forEach(d => { if (!grouped[d.subject_name]) grouped[d.subject_name] = []; grouped[d.subject_name].push(d); });
      setChildDocuments(grouped);
      setDocChangingStatus(null);
      setDocChangeStatusReason('');
      showToast('success', 'Document status updated');
    } catch { showToast('error', 'Failed to change status'); }
    finally { setIsChangingDocStatus(false); }
  };

  const handleRevoke = async () => {
    if (!revokeFormData || !userData?.parentId) {
      showToast('error', 'User information missing');
      return;
    }

    if (!revokeNotes.trim()) {
      showToast('error', 'Please provide a reason');
      return;
    }

    setIsRevoking(true);
    try {
      if (revokeFormData.form.studentFormAssignmentId) {
        await revokeStudentFormAssignment(
          revokeFormData.form.studentFormAssignmentId,
          revokeNotes,
          userData.parentId,
          revokeTargetStatus
        );

        const displayStatus = revokeTargetStatus === 'rejected' ? 'Rejected' : 'In Progress';
        setParent(current => {
          if (!current) return current;
          return {
            ...current,
            children: current.children.map(child => ({
              ...child,
              forms: child.forms.map(form =>
                form.id === revokeFormData.form.id
                  ? { ...form, status: displayStatus as FormStatus, lastUpdated: new Date().toLocaleDateString() }
                  : form
              )
            }))
          };
        });

        showToast('success', `Form ${displayStatus.toLowerCase()} successfully`);
        setIsRevokeDialogOpen(false);
        setRevokeNotes('');
        setRevokeFormData(null);
        setRevokeTargetStatus('in_progress');
      }
    } catch (error) {
      console.error('Error revoking form:', error);
      showToast('error', 'Failed to revoke form approval');
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12  mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading parent details...</p>
          </div>
        </div>
      </AdminLayout>
    );
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
        className="container mx-auto px-2 sm:px-4  py-0 sm:pt-12  space-y-6 pb-12"
      >
        <div className="mt-12 sm:mt-10 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl hover:bg-slate-100 flex-shrink-0"
              onClick={() => {
                if (location.state?.fromStudents) navigate('/admin/students');
                else navigate('/admin/parents');
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="min-w-0 w-full">
              {(() => {
                const primaryEmail = parent.primaryParentEmail;
                const isPrimaryParent = parent.email === primaryEmail;
                
                const primaryData = isPrimaryParent ? 
                  { name: `${parent.firstName} ${parent.lastName}`, email: parent.email } : 
                  { name: parent.additionalParentName || 'Primary Parent', email: parent.additionalParentEmail || '' };
                  
                const secondaryData = !isPrimaryParent ? 
                  { name: `${parent.firstName} ${parent.lastName}`, email: parent.email } : 
                  (parent.additionalParentEmail ? { name: parent.additionalParentName || 'Secondary Parent', email: parent.additionalParentEmail } : null);

                return (
                  <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                    {/* Primary Parent */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-950 tracking-tight truncate">
                              {primaryData.name}
                            </h1>
                            <Badge variant="secondary" className="text-[10px] rounded-md px-2 py-0.5 font-bold uppercase tracking-wider bg-[#0F2D52]/10 text-[#0F2D52] hover:bg-[#0F2D52]/15 border-0">Primary Parent</Badge>
                            {isPrimaryParent && parent.relationType && (
                              <Badge variant="outline" className={`text-[10px] rounded-md px-2 py-0.5 font-bold uppercase tracking-wider border-0 ${parent.relationType.toUpperCase() === 'FATHER' ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-700'}`}>
                                {parent.relationType.charAt(0) + parent.relationType.slice(1).toLowerCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                            <MailIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-slate-500 font-medium truncate">{primaryData.email}</span>
                          </div>
                          {isPrimaryParent && parent.phone && parent.phone !== '—' && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-500 font-medium">{parent.phone}</span>
                            </div>
                          )}
                          {isPrimaryParent && parent.address && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-500 font-medium">{parent.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Secondary Parent */}
                    {secondaryData && (
                      <>
                        <div className="hidden sm:block w-px bg-slate-100 self-stretch" />
                        <div className="sm:hidden h-px bg-slate-100 w-full" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 w-full">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base sm:text-lg font-extrabold text-slate-800 tracking-tight truncate">
                                  {secondaryData.name}
                                </h2>
                                <Badge variant="outline" className="text-[10px] rounded-md px-2 py-0.5 font-bold uppercase tracking-wider text-slate-500 border-slate-200">Secondary Parent</Badge>
                                {!isPrimaryParent && parent.relationType && (
                                  <Badge variant="outline" className={`text-[10px] rounded-md px-2 py-0.5 font-bold uppercase tracking-wider border-0 ${parent.relationType.toUpperCase() === 'FATHER' ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-700'}`}>
                                    {parent.relationType.charAt(0) + parent.relationType.slice(1).toLowerCase()}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <MailIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-slate-500 font-medium truncate">{secondaryData.email}</span>
                              </div>
                              {!isPrimaryParent && parent.phone && parent.phone !== '—' && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-500 font-medium">{parent.phone}</span>
                                </div>
                              )}
                              {!isPrimaryParent && parent.address && (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs text-slate-500 font-medium">{parent.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="w-full space-y-6">
            <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Children & Forms</CardTitle>
                  <p className="text-xs text-slate-450 font-semibold mt-0.5">
                    {parent.children.length} children{parent.children.length === 1 ? '' : 's'}
                  </p>
                </div>
                {availableAcademicYears.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs font-semibold rounded-xl border-slate-200 bg-white">
                        <SelectValue placeholder="Filter by year" />
                      </SelectTrigger>
                      <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl">
                        <SelectItem value="all" className="cursor-pointer">All Years</SelectItem>
                        {availableAcademicYears.map(year => (
                          <SelectItem key={year} value={year} className="cursor-pointer">
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-5 px-5">
                <div className="flex flex-col md:flex-row gap-4 pb-4 items-start">
                  {[
                    parent.children.filter((_, i) => i % 2 === 0),
                    parent.children.filter((_, i) => i % 2 !== 0)
                  ].map((columnChildren, colIndex) => {
                    if (columnChildren.length === 0) return null;
                    return (
                      <div key={colIndex} className="flex flex-col gap-4 flex-1 w-full">
                        {columnChildren.map(child => {
                  const isExpanded = !!expandedChildren[child.id];
                  const totalForms = child.forms.length;
                  const approvedForms = child.forms.filter(f => f.status === 'Approved').length;
                  const pendingForms = child.forms.filter(f => f.status === 'Submitted' || f.status === 'In Progress').length;
                  const draftForms = totalForms - approvedForms - pendingForms;

                  const completionPct = totalForms > 0 ? Math.round((approvedForms / totalForms) * 100) : 0;
                  const approvedPct = totalForms > 0 ? (approvedForms / totalForms) * 100 : 0;
                  const pendingPct = totalForms > 0 ? (pendingForms / totalForms) * 100 : 0;
                  const draftPct = totalForms > 0 ? (draftForms / totalForms) * 100 : 0;
                  const childFilteredForms = selectedYear === 'all'
                    ? child.forms
                    : child.forms.filter(form =>
                        !form.formAcademicYear || form.formAcademicYear === selectedYear
                      );
                  const childDocs = childDocuments[`${child.firstName} ${child.lastName}`] || [];
                  const childFilteredDocs = selectedYear === 'all'
                    ? childDocs
                    : childDocs.filter(d => !d.form_academic_year || d.form_academic_year === selectedYear);

                  return (
                    <Card
                      key={child.id}
                      className={`border transition-all duration-200 shadow-xs rounded-xl overflow-hidden ${
                        isExpanded
                          ? 'border-[#0F2D52] ring-1 ring-[#0F2D52]/5 bg-[#EFF5FB]/5'
                          : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                      }`}
                    >
                      {/* Child Card Header */}
                      <div
                        onClick={() => toggleChildExpand(child.id)}
                        className="p-4 flex flex-col gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                              {child.firstName.charAt(0)}{child.lastName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-sm text-slate-800 truncate">
                                {child.firstName} {child.lastName}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400 font-semibold">
                                <span>Class: {child.classroom.name}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-355" />
                                <span>DOB: {child.dob}</span>
                                <span className="h-1 w-1 rounded-full bg-slate-355" />
                                <span>{totalForms} forms · {childDocs.length} docs</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant={completionPct === 100 ? 'success' : completionPct > 0 ? 'secondary' : 'outline'}
                              className="text-[10px] rounded-full px-2 py-0.5 font-bold whitespace-nowrap"
                            >
                              <span className="hidden sm:inline">{completionPct}% Completed</span>
                              <span className="sm:hidden">{completionPct}%</span>
                            </Badge>
                            <div className="text-slate-400 hover:text-slate-600 transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {(totalForms > 0 || childDocs.length > 0) && (
                          <div className="mt-1.5 space-y-1">
                            {totalForms > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-8 flex-shrink-0">Forms</span>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                  {approvedPct > 0 && <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${approvedPct}%` }} />}
                                  {pendingPct > 0 && <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${pendingPct}%` }} />}
                                  {draftPct > 0 && <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${draftPct}%` }} />}
                                </div>
                                <span className="text-[9px] font-semibold tabular-nums text-slate-400 w-7 text-right flex-shrink-0">{approvedForms}/{totalForms}</span>
                              </div>
                            )}
                            {childDocs.length > 0 && (() => {
                              const appDocs = childDocs.filter(d => d.status === 'approved').length;
                              const subDocs = childDocs.filter(d => d.status === 'submitted').length;
                              const pendDocs = childDocs.length - appDocs - subDocs;
                              const appDocPct = (appDocs / childDocs.length) * 100;
                              const subDocPct = (subDocs / childDocs.length) * 100;
                              const pendDocPct = (pendDocs / childDocs.length) * 100;
                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-8 flex-shrink-0">Docs</span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                    {appDocPct > 0 && <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${appDocPct}%` }} />}
                                    {subDocPct > 0 && <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${subDocPct}%` }} />}
                                    {pendDocPct > 0 && <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${pendDocPct}%` }} />}
                                  </div>
                                  <span className="text-[9px] font-semibold tabular-nums text-slate-400 w-7 text-right flex-shrink-0">{appDocs}/{childDocs.length}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-white p-4 space-y-4">
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
                          ) : childFilteredForms && childFilteredForms.length > 0 ? (
                            childFilteredForms.map(form => (
                              <div key={form.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-200 transition-all">
                                <div className="flex flex-col gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                                        <h3 className="font-bold text-sm text-slate-800 truncate">{form.title}</h3>
                                      </div>
                                      {form.status === 'Approved' && isAdminOrSuperAdmin && (
                                        <button
                                          onClick={() => setEditingFormMeta({ form, childName: `${child.firstName} ${child.lastName}` })}
                                          className="flex items-center gap-1 text-xs font-semibold text-[#0F2D52] hover:text-[#1E4B83] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0"
                                        >
                                          <Pencil className="h-3 w-3" />
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                    <div className="mt-2.5">
                                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                        form.status === 'Approved' ? 'text-emerald-600' :
                                        form.status === 'Draft' ? 'text-slate-500' :
                                        'text-amber-600'
                                      }`}>
                                        {form.status === 'Submitted' || form.status === 'In Progress' ? 'Pending Approval' : form.status}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
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
                                          // console.log('Error parsing approved date:', e);
                                        }
                                        return (
                                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            Approved {form.approvedOn}
                                          </span>
                                        );
                                      })()}
                                      {form.manualPdfUploadedAt && (() => {
                                        try {
                                          const date = new Date(form.manualPdfUploadedAt);
                                          if (!isNaN(date.getTime())) {
                                            return (
                                              <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                Admin Uploaded {date.toLocaleDateString()}
                                              </span>
                                            );
                                          }
                                        } catch (e) {
                                          // console.log('Error parsing manual upload date:', e);
                                        }
                                        return null;
                                      })()}
                                      {form.status === 'Approved' && form.formAcademicYear && (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                          {form.formAcademicYear}
                                        </span>
                                      )}
                                      {form.status === 'Approved' && form.approvedFormName && (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[180px]" title={form.approvedFormName}>
                                          {form.approvedFormName}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">
                                      {form.description}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-2">
                                      Last updated: {form.lastUpdated}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-2 items-center">
                                    {form.status === 'Approved' && form.recentPdfLink && (
                                      <div className="flex gap-1.5">
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8 text-[#0F2D52] border-slate-200 hover:bg-slate-50 rounded-lg"
                                          onClick={() => handleDownload(form, `${child.firstName} ${child.lastName}`)}
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
                                          className="h-8 w-8 text-slate-650 border-slate-200 hover:bg-slate-50 rounded-lg"
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
                                      {form.status !== 'Approved' && <Link to={`/${schoolSlug || 'goddard'}/admin/forms/view/${form.id}`} state={{
                                      form,
                                      childId: child.id,
                                      childName: `${child.firstName} ${child.lastName}`,
                                      childDob: child.dob,
                                      childGender: child.gender,
                                      parentEmail: parent.email,
                                      classDetails: child.classroom?.name || 'Unassigned',
                                      parentId: parent.id,
                                      returnPath: `/${schoolSlug || 'goddard'}/admin/parents/${parentId}`,
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
                                    </Link>}
                                    {form.studentFormAssignmentId && isAdminOrSuperAdmin && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                                        onClick={() => {
                                          setSelectedFormForUpload({ form, childName: `${child.firstName} ${child.lastName}` });
                                          setIsManualUploadOpen(true);
                                        }}
                                      >
                                        <Upload className="h-3.5 w-3.5 mr-1" />
                                        {form.status === 'Approved' ? 'Replace PDF' : 'Upload PDF'}
                                      </Button>
                                    )}
                                    {form.status === 'Submitted' && (
                                      <div className="flex gap-1.5">
                                        <Button variant="outline" size="sm" className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-xs font-bold" onClick={() => { setSelectedChildId(child.id); openReviewDialog(form, 'approve'); }}>
                                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                          Approve
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-8 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100/50 text-xs font-bold" onClick={() => { setSelectedChildId(child.id); openReviewDialog(form, 'reject'); }}>
                                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                          Revise
                                        </Button>
                                      </div>
                                    )}
                                    {form.status === 'Approved' && isAdminOrSuperAdmin && (
                                      <Button
                                        size="sm"
                                        className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white text-xs font-bold"
                                        onClick={() => {
                                          setRevokeTargetStatus('in_progress');
                                          setRevokeFormData({ form, childId: child.id });
                                          setIsRevokeDialogOpen(true);
                                        }}
                                        disabled={isRevoking}
                                      >
                                        Change Status
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="border border-slate-100 rounded-xl p-8 bg-slate-50/10 text-center shadow-xs">
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

                          {/* Documents Section */}
                          {child.childStatus !== 'archive' && (
                            <div className="mt-2 pt-4 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                Documents
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                                  {childDocs.length}
                                </span>
                              </h4>

                              {isLoadingDocuments ? (
                                <div className="space-y-2">
                                  {[1, 2].map(i => (
                                    <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
                                  ))}
                                </div>
                              ) : childFilteredDocs.length === 0 ? (
                                <p className="text-xs text-slate-400 font-semibold text-center py-4">
                                  {childDocs.length === 0 ? 'No documents assigned.' : `No documents found in ${selectedYear}.`}
                                </p>
                              ) : (
                                childFilteredDocs.map(doc => (
                                  <div key={doc.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-200 transition-all mb-3">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                        <h3 className="font-bold text-sm text-slate-800 truncate">{doc.document_name}</h3>
                                      </div>
                                      {doc.status === 'approved' && isAdminOrSuperAdmin && (
                                        <button onClick={() => setDocEditingMeta({ doc, childName: `${child.firstName} ${child.lastName}` })}
                                          className="flex items-center gap-1 text-xs font-semibold text-[#0F2D52] hover:text-[#1E4B83] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                                          <Pencil className="h-3 w-3" />
                                          Edit
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                        doc.status === 'approved' ? 'text-emerald-600' :
                                        doc.status === 'rejected' ? 'text-red-600' :
                                        doc.status === 'submitted' ? 'text-amber-600' : 'text-slate-500'
                                      }`}>
                                        {doc.status === 'submitted' ? 'Pending Approval' : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                                      </span>

                                      {doc.reviewed_at && doc.status === 'approved' && (
                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                          Approved {new Date(doc.reviewed_at).toLocaleDateString()}
                                        </span>
                                      )}
                                      {doc.form_academic_year && (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                          {doc.form_academic_year}
                                        </span>
                                      )}
                                      {doc.approved_form_name && (
                                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[180px]" title={doc.approved_form_name}>
                                          {doc.approved_form_name}
                                        </span>
                                      )}
                                      {doc.due_date && doc.status !== 'approved' && (
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          Due {new Date(doc.due_date).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>

                                    {doc.status === 'rejected' && doc.rejection_reason && (
                                      <p className="text-xs text-red-600 mt-1.5 font-medium">Reason: {doc.rejection_reason}</p>
                                    )}

                                    <div className="flex flex-wrap gap-2 items-center mt-3">
                                      {/* Download + Print icons — approved docs with a file */}
                                      {doc.status === 'approved' && doc.latest_submission_id && (
                                        <div className="flex gap-1.5">
                                          <Button variant="outline" size="icon" className="h-8 w-8 text-[#0F2D52] border-slate-200 hover:bg-slate-50 rounded-lg"
                                            onClick={() => handleDocDownloadFile(doc)}
                                            disabled={docLoadingAction?.docId === doc.id}
                                            title="Download document">
                                            {docLoadingAction?.docId === doc.id && docLoadingAction.action === 'download'
                                              ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                                              : <Download className="h-4 w-4" />}
                                          </Button>
                                          <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg"
                                            onClick={() => handleDocPrint(doc)}
                                            disabled={docLoadingAction?.docId === doc.id}
                                            title="Print document">
                                            {docLoadingAction?.docId === doc.id && docLoadingAction.action === 'print'
                                              ? <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full" />
                                              : <Printer className="h-4 w-4" />}
                                          </Button>
                                        </div>
                                      )}
                                      {/* Upload / Re-upload — admin only */}
                                      {isAdminOrSuperAdmin && (doc.status === 'pending' || doc.status === 'overdue' || doc.status === 'submitted' || doc.status === 'approved' || doc.status === 'rejected') && (
                                        <Button variant="outline" size="sm"
                                          className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                                          disabled={isUploadingDoc && docUploading?.doc.id === doc.id}
                                          onClick={() => setDocUploading({ doc, childName: `${child.firstName} ${child.lastName}` })}>
                                          <Upload className="h-3.5 w-3.5 mr-1" />
                                          {(doc.status === 'approved' || doc.status === 'submitted' || doc.status === 'rejected') ? 'Re-upload' : 'Upload'}
                                        </Button>
                                      )}
                                      {/* Approve + Reject — submitted docs, admin only */}
                                      {doc.status === 'submitted' && isAdminOrSuperAdmin && (
                                        <div className="flex gap-1.5">
                                          <Button variant="outline" size="sm"
                                            className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-xs font-bold"
                                            onClick={() => setDocApproving({ doc, childName: `${child.firstName} ${child.lastName}` })}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                            Approve
                                          </Button>
                                          <Button variant="outline" size="sm"
                                            className="h-8 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100/50 text-xs font-bold"
                                            onClick={() => { setDocRejecting({ doc }); setDocRejectReason(''); }}>
                                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                                            Reject
                                          </Button>
                                        </div>
                                      )}
                                      {doc.status === 'approved' && isAdminOrSuperAdmin && (
                                        <Button
                                          size="sm"
                                          className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white text-xs font-bold"
                                          onClick={() => { setDocTargetStatus('pending'); setDocChangeStatusReason(''); setDocChangingStatus({ doc }); }}
                                          disabled={isChangingDocStatus}
                                        >
                                          Change Status
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
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

      {selectedFormForUpload && (
        <ManualUploadModal
          isOpen={isManualUploadOpen}
          onClose={() => {
            setIsManualUploadOpen(false);
            setSelectedFormForUpload(null);
          }}
          onSuccess={() => {
            setIsManualUploadOpen(false);
            setSelectedFormForUpload(null);
            showToast('success', 'PDF uploaded successfully');
            setRefreshKey(k => k + 1);
          }}
          assignmentId={selectedFormForUpload.form.studentFormAssignmentId!}
          schoolId={schoolId || localStorage.getItem('schoolId') || ''}
          studentName={selectedFormForUpload.childName}
          uploadedBy={userData?.email || userData?.name || 'Admin'}
          formType="student"
          isReplacing={selectedFormForUpload.form.status === 'Approved'}
          formTemplateName={selectedFormForUpload.form.title}
          isEditable={userData?.role === 'Admin' || userData?.role === 'SuperAdmin'}
        />
      )}

      {editingFormMeta && (
        <ApproveFormModal
          open={true}
          onClose={() => setEditingFormMeta(null)}
          onConfirm={handleEditMetaConfirm}
          isEmployee={false}
          formTemplateName={editingFormMeta.form.title}
          personName={editingFormMeta.childName}
          isEditable={isAdminOrSuperAdmin}
          isSubmitting={isSavingMeta}
          initialFormName={editingFormMeta.form.approvedFormName || undefined}
          initialAcademicYear={editingFormMeta.form.formAcademicYear || undefined}
        />
      )}

      {docApproving && (
        <ApproveFormModal
          open={true}
          onClose={() => setDocApproving(null)}
          onConfirm={handleDocApproveConfirm}
          isEmployee={false}
          formTemplateName={docApproving.doc.document_name}
          personName={docApproving.childName}
          isEditable={true}
          isSubmitting={isApprovingDoc}
          initialFormName={docApproving.doc.approved_form_name || undefined}
          initialAcademicYear={docApproving.doc.form_academic_year || undefined}
        />
      )}

      <UploadDocumentModal
        open={!!docUploading}
        onClose={() => setDocUploading(null)}
        onConfirm={handleDocUploadWithApproval}
        isStudent={true}
        documentName={docUploading?.doc.document_name || ''}
        personName={docUploading?.childName || ''}
        uploaderEmail={userData?.email}
        isSubmitting={isUploadingDoc}
      />

      {/* Reject Document Dialog */}
      <Dialog open={!!docRejecting} onOpenChange={open => { if (!open && !isRejectingDoc) { setDocRejecting(null); setDocRejectReason(''); } }}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Reject Document</DialogTitle>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm text-slate-600 font-semibold">{docRejecting?.doc.document_name}</p>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason <span className="text-red-500">*</span>
            </label>
            <Textarea
              placeholder="Provide a reason for rejection..."
              value={docRejectReason}
              onChange={e => setDocRejectReason(e.target.value)}
              className="h-24 rounded-xl border-slate-200 text-sm"
            />
          </div>
          <div className="px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-slate-200"
              onClick={() => { setDocRejecting(null); setDocRejectReason(''); }}
              disabled={isRejectingDoc}>
              Cancel
            </Button>
            <Button
              onClick={handleDocRejectConfirm}
              className="h-10 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white"
              disabled={isRejectingDoc || !docRejectReason.trim()}>
              {isRejectingDoc ? 'Rejecting...' : 'Reject'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Metadata Modal */}
      {docEditingMeta && (
        <ApproveFormModal
          open={true}
          onClose={() => setDocEditingMeta(null)}
          onConfirm={handleDocMetadataSave}
          isEmployee={false}
          formTemplateName={docEditingMeta.doc.document_name}
          personName={docEditingMeta.childName}
          isEditable={true}
          isSubmitting={isSavingDocMeta}
          initialFormName={docEditingMeta.doc.approved_form_name || undefined}
          initialAcademicYear={docEditingMeta.doc.form_academic_year || undefined}
          title="Edit Document Metadata"
          confirmLabel="Save Changes"
        />
      )}

      {/* Change Document Status Dialog */}
      <Dialog open={!!docChangingStatus} onOpenChange={open => { if (!open && !isChangingDocStatus) { setDocChangingStatus(null); setDocChangeStatusReason(''); } }}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Change Document Status</DialogTitle>
          </div>
          <div className="px-6 py-4 space-y-3">
            <p className="text-sm font-semibold text-slate-600">{docChangingStatus?.doc.document_name}</p>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Status</label>
            <Select value={docTargetStatus} onValueChange={v => setDocTargetStatus(v as 'pending' | 'rejected')}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Send Back (Pending)</SelectItem>
                <SelectItem value="rejected">Reject</SelectItem>
              </SelectContent>
            </Select>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason {docTargetStatus === 'rejected' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              value={docChangeStatusReason}
              onChange={e => setDocChangeStatusReason(e.target.value)}
              placeholder="Provide a reason..."
              className="h-20 rounded-xl border-slate-200 text-sm"
            />
          </div>
          <div className="px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-slate-200"
              onClick={() => { setDocChangingStatus(null); setDocChangeStatusReason(''); }}
              disabled={isChangingDocStatus}>
              Cancel
            </Button>
            <Button
              onClick={handleDocChangeStatus}
              disabled={isChangingDocStatus || (docTargetStatus === 'rejected' && !docChangeStatusReason.trim())}
              className="h-10 rounded-xl text-xs font-bold bg-[#0F2D52] hover:bg-[#1E4B83] text-white">
              {isChangingDocStatus ? 'Updating...' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Approval Dialog */}
      <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900">Change Form Status</DialogTitle>
          </div>
          <div className="flex-shrink-0 px-6 py-4 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">New Status</label>
              <Select
                value={revokeTargetStatus}
                onValueChange={(v) => setRevokeTargetStatus(v as 'in_progress' | 'rejected')}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Send Back for Revision</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={revokeTargetStatus === 'rejected'
                  ? 'Provide a reason for rejecting this form...'
                  : 'Provide a reason for sending back for revision...'}
                value={revokeNotes}
                onChange={(e) => setRevokeNotes(e.target.value)}
                className="h-24 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]"
              />
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
              onClick={() => {
                setIsRevokeDialogOpen(false);
                setRevokeNotes('');
                setRevokeFormData(null);
                setRevokeTargetStatus('in_progress');
              }}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              className="h-10 rounded-xl text-xs font-bold px-4 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all"
              disabled={isRevoking || !revokeNotes.trim()}
            >
              {isRevoking ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                  {revokeTargetStatus === 'rejected' ? 'Rejecting...' : 'Sending...'}
                </span>
              ) : (
                revokeTargetStatus === 'rejected' ? 'Reject' : 'Send Back'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}