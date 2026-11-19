import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Mail as MailIcon, CheckCircle, AlertCircle, FileText, ChevronLeft, Download, Printer, Briefcase, Eye, Upload, Pencil, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { useToast } from '../../contexts/ToastContext';
import { EmployeeService, type EmployeeFormAssignment, revokeEmployeeFormAssignment, updateApprovedEmployeeFormMetadata } from '../../services/api/employee';
import { fetchAdminUsers, type AdminUser } from '../../services/api/admin';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { normalizeFormStatus } from '../../lib/formStatus';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar } from 'lucide-react';
import { ManualUploadModal } from '../../components/admin/ManualUploadModal';
import { ApproveFormModal } from '../../components/admin/ApproveFormModal';
import { UploadDocumentModal } from '../../components/admin/UploadDocumentModal';
import { fetchDocumentAssignments, reviewDocument, documentFileUrl, documentUploadIntent, completeDocumentUpload, updateDocumentMetadata, changeDocumentStatus, type DocumentAssignment } from '../../services/api/documentRequests';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { CreateOfferLetterDialog } from '../../components/admin/CreateOfferLetterDialog';

const PERMISSION_OPTIONS = [
  { key: 'manage_parents',     label: 'Parent Management' },
  { key: 'manage_employees',   label: 'Employee Management' },
  { key: 'manage_expenses',    label: 'Expense Management' },
  { key: 'manage_taptime',     label: 'Time Tracking' },
  { key: 'manage_conferences', label: 'Conference Management' },
  { key: 'manage_surveys',     label: 'Survey Management' },
] as const;

export function AdminDetailPage() {
  const { schoolSlug, adminId } = useParams<{ schoolSlug: string; adminId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { userData } = useUserContext();
  const { user } = useAuth();
  const { showToast } = useToast();

  const schoolId = userData?.schoolId || localStorage.getItem('schoolId') || '';
  const offerLetterEnabled = userData?.schoolData?.features?.offerLetterEnabled ?? false;
  const offerLetterFields = ((userData?.schoolData?.settings as any)?.offer_letter_fields) ?? [];
  const isAdminOrSuperAdmin = userData?.role === 'Admin' || userData?.role === 'SuperAdmin' || userData?.role === 'Owner';

  const stateAdmin = (state as any)?.admin as AdminUser | undefined;
  const [admin, setAdmin] = useState<AdminUser | null>(stateAdmin || null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(!stateAdmin);
  const [assignments, setAssignments] = useState<(EmployeeFormAssignment & { formTitle: string; formDescription: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loadingAction, setLoadingAction] = useState<{ formId: string; action: 'download' | 'print' } | null>(null);
  const [selectedFormForUpload, setSelectedFormForUpload] = useState<{ form: EmployeeFormAssignment & { formTitle: string }; employeeName: string } | null>(null);
  const [isManualUploadOpen, setIsManualUploadOpen] = useState(false);

  const [approvingForm, setApprovingForm] = useState<{ form: EmployeeFormAssignment & { formTitle: string } } | null>(null);
  const [isApprovingForm, setIsApprovingForm] = useState(false);
  const [rejectingForm, setRejectingForm] = useState<{ form: EmployeeFormAssignment & { formTitle: string } } | null>(null);
  const [isRejectingForm, setIsRejectingForm] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editingFormMeta, setEditingFormMeta] = useState<{ form: EmployeeFormAssignment & { formTitle: string } } | null>(null);
  const [isSavingFormMeta, setIsSavingFormMeta] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [revokeFormData, setRevokeFormData] = useState<{ form: EmployeeFormAssignment & { formTitle: string } } | null>(null);
  const [revokeNotes, setRevokeNotes] = useState('');
  const [revokeTargetStatus, setRevokeTargetStatus] = useState<'in_progress' | 'rejected'>('in_progress');
  const [isRevoking, setIsRevoking] = useState(false);

  const [employeeDocs, setEmployeeDocs] = useState<DocumentAssignment[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [docApproving, setDocApproving] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isApprovingDoc, setIsApprovingDoc] = useState(false);
  const [docLoadingAction, setDocLoadingAction] = useState<{ docId: string; action: 'download' | 'print' } | null>(null);
  const [docRejecting, setDocRejecting] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isRejectingDoc, setIsRejectingDoc] = useState(false);
  const [docRejectReason, setDocRejectReason] = useState('');
  const [docUploading, setDocUploading] = useState<DocumentAssignment | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docEditingMeta, setDocEditingMeta] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isSavingDocMeta, setIsSavingDocMeta] = useState(false);
  const [docChangingStatus, setDocChangingStatus] = useState<{ doc: DocumentAssignment } | null>(null);
  const [isChangingDocStatus, setIsChangingDocStatus] = useState(false);
  const [docChangeStatusReason, setDocChangeStatusReason] = useState('');
  const [docTargetStatus, setDocTargetStatus] = useState<'pending' | 'rejected'>('pending');

  const [offerLetter, setOfferLetter] = useState<OfferLetter | null>(null);
  const [offerEditOpen, setOfferEditOpen] = useState(false);
  const [isCreatingOffer, setIsCreatingOffer] = useState(false);
  const [offerSendConfirmOpen, setOfferSendConfirmOpen] = useState(false);
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const [offerReviewDialog, setOfferReviewDialog] = useState<{ action: 'approve' | 'reject' } | null>(null);
  const [offerRejectionReason, setOfferRejectionReason] = useState('');
  const [isProcessingOfferReview, setIsProcessingOfferReview] = useState(false);

  // Fetch admin if not passed via navigation state
  useEffect(() => {
    if (stateAdmin || !schoolId || !adminId) return;
    setIsLoadingAdmin(true);
    fetchAdminUsers(schoolId)
      .then(list => setAdmin(list.find(a => a.id === adminId) || null))
      .catch(() => setAdmin(null))
      .finally(() => setIsLoadingAdmin(false));
  }, [adminId, schoolId, stateAdmin]);

  // Fetch forms + docs + offer letter once admin is known
  useEffect(() => {
    if (!admin || !schoolId) return;
    const employeeId = admin.employee_id;

    let isMounted = true;
    (async () => {
      try {
        if (refreshKey === 0) setIsLoading(true);
        if (refreshKey === 0) setIsLoadingDocuments(true);

        const [rawAssignments, docResult, offerLetterData] = await Promise.all([
          employeeId
            ? EmployeeService.fetchEmployeeFormAssignments(employeeId)
            : EmployeeService.fetchFormAssignmentsByUserId(admin.id),
          fetchDocumentAssignments({ school_id: schoolId, audience: 'employee', limit: 1000 }),
          offerLetterEnabled && employeeId ? OfferLetterService.getOfferLetter(employeeId, schoolId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        setAssignments(rawAssignments.map(a => ({
          ...a,
          formTitle: a.formName || 'Unknown Form',
          formDescription: a.dueDate ? `Due: ${a.dueDate}` : 'Employee Form',
        })));

        const adminName = `${admin.first_name} ${admin.last_name}`;
        setEmployeeDocs(docResult.items.filter(d => d.subject_name === adminName));
        setOfferLetter(offerLetterData);
      } catch {
        showToast('error', 'Failed to load admin details');
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsLoadingDocuments(false);
        }
      }
    })();

    return () => { isMounted = false; };
  }, [admin, schoolId, offerLetterEnabled, refreshKey, showToast]);

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    assignments.forEach(form => {
      if (form.assignedOn) {
        const date = new Date(form.assignedOn);
        if (!isNaN(date.getTime())) yearsSet.add(date.getFullYear());
      }
    });
    yearsSet.add(new Date().getFullYear());
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [assignments]);

  const filteredForms = useMemo(() => {
    if (selectedYear === 'all') return assignments;
    return assignments.filter(form => {
      if (!form.assignedOn) return true;
      const date = new Date(form.assignedOn);
      return !isNaN(date.getTime()) && date.getFullYear().toString() === selectedYear;
    });
  }, [assignments, selectedYear]);

  const totalForms = assignments.length;
  const approvedForms = assignments.filter(f => normalizeFormStatus(f.status) === 'Approved').length;
  const pendingForms = assignments.filter(f => { const ns = normalizeFormStatus(f.status); return ns === 'Submitted' || ns === 'In Progress' || ns === 'Needs Revision'; }).length;
  const draftForms = totalForms - approvedForms - pendingForms;
  const approvedPct = totalForms > 0 ? (approvedForms / totalForms) * 100 : 0;
  const pendingPct = totalForms > 0 ? (pendingForms / totalForms) * 100 : 0;
  const draftPct = totalForms > 0 ? (draftForms / totalForms) * 100 : 0;

  const appDocs = employeeDocs.filter(d => d.status === 'approved').length;
  const subDocs = employeeDocs.filter(d => d.status === 'submitted').length;
  const pendDocs = employeeDocs.length - appDocs - subDocs;
  const appDocPct = employeeDocs.length > 0 ? (appDocs / employeeDocs.length) * 100 : 0;
  const subDocPct = employeeDocs.length > 0 ? (subDocs / employeeDocs.length) * 100 : 0;
  const pendDocPct = employeeDocs.length > 0 ? (pendDocs / employeeDocs.length) * 100 : 0;

  const handleDownloadForm = async (form: EmployeeFormAssignment & { formTitle: string }) => {
    if (!form.recentPdfLink) return;
    setLoadingAction({ formId: form.id!, action: 'download' });
    try {
      const res = await fetch(form.recentPdfLink);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url; el.download = `${form.approvedFormName || form.formTitle}.pdf`;
      document.body.appendChild(el); el.click(); el.remove();
      URL.revokeObjectURL(url);
    } catch { showToast('error', 'Download failed'); }
    finally { setLoadingAction(null); }
  };

  const handlePrintForm = async (form: EmployeeFormAssignment & { formTitle: string }) => {
    if (!form.recentPdfLink) return;
    setLoadingAction({ formId: form.id!, action: 'print' });
    try {
      const res = await fetch(form.recentPdfLink);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => { setTimeout(() => { w.print(); w.onafterprint = () => { w.close(); URL.revokeObjectURL(url); }; }, 1000); };
        setTimeout(() => { setLoadingAction(null); URL.revokeObjectURL(url); }, 3000);
        showToast('success', 'Print dialog opening...');
      } else { throw new Error('Popup blocked'); }
    } catch (err: any) {
      showToast('error', err?.message === 'Popup blocked' ? 'Allow popups to print' : 'Print failed');
      setLoadingAction(null);
    }
  };

  const handleFormApproveConfirm = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!approvingForm) return;
    setIsApprovingForm(true);
    try {
      await EmployeeService.reviewEmployeeForm(approvingForm.form.id!, approvingForm.form.schoolId, 'approved', undefined, data.approvedFormName);
      setRefreshKey(k => k + 1); setApprovingForm(null);
      showToast('success', 'Form approved');
    } catch { showToast('error', 'Failed to approve form'); }
    finally { setIsApprovingForm(false); }
  };

  const handleFormRejectConfirm = async () => {
    if (!rejectingForm) return;
    setIsRejectingForm(true);
    try {
      await EmployeeService.reviewEmployeeForm(rejectingForm.form.id!, rejectingForm.form.schoolId, 'rejected', rejectNotes || undefined);
      setRefreshKey(k => k + 1); setRejectingForm(null); setRejectNotes('');
      showToast('success', 'Form rejected');
    } catch { showToast('error', 'Failed to reject form'); }
    finally { setIsRejectingForm(false); }
  };

  const handleFormMetadataSave = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!editingFormMeta || !schoolId) return;
    setIsSavingFormMeta(true);
    try {
      await updateApprovedEmployeeFormMetadata(editingFormMeta.form.id!, schoolId, data.approvedFormName);
      setRefreshKey(k => k + 1); setEditingFormMeta(null);
      showToast('success', 'Form metadata updated');
    } catch { showToast('error', 'Failed to update metadata'); }
    finally { setIsSavingFormMeta(false); }
  };

  const handleRevoke = async () => {
    if (!revokeFormData || !revokeNotes.trim()) { showToast('error', 'Please provide a reason'); return; }
    const revokedBy = user?.id || '00000000-0000-0000-0000-000000000000';
    setIsRevoking(true);
    try {
      await revokeEmployeeFormAssignment(revokeFormData.form.id!, revokeNotes, revokedBy, revokeTargetStatus);
      setRefreshKey(k => k + 1); setIsRevokeDialogOpen(false); setRevokeNotes(''); setRevokeFormData(null); setRevokeTargetStatus('in_progress');
      showToast('success', 'Form status updated');
    } catch { showToast('error', 'Failed to change status'); }
    finally { setIsRevoking(false); }
  };

  const refreshDocs = async () => {
    if (!admin || !schoolId) return;
    const result = await fetchDocumentAssignments({ school_id: schoolId, audience: 'employee', limit: 1000 });
    const adminName = `${admin.first_name} ${admin.last_name}`;
    setEmployeeDocs(result.items.filter(d => d.subject_name === adminName));
  };

  const handleDocDownloadFile = async (doc: DocumentAssignment) => {
    if (!doc.latest_submission_id) return;
    setDocLoadingAction({ docId: doc.id, action: 'download' });
    try {
      const { url } = await documentFileUrl(doc.latest_submission_id, true);
      const response = await fetch(url); const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl; link.download = doc.approved_form_name || doc.latest_file_name || doc.document_name;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch { showToast('error', 'Download failed'); }
    finally { setDocLoadingAction(null); }
  };

  const handleDocPrint = async (doc: DocumentAssignment) => {
    if (!doc.latest_submission_id) return;
    setDocLoadingAction({ docId: doc.id, action: 'print' });
    try {
      const { url } = await documentFileUrl(doc.latest_submission_id, false);
      const response = await fetch(url); const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => { setTimeout(() => { printWindow.print(); printWindow.onafterprint = () => { printWindow.close(); URL.revokeObjectURL(blobUrl); }; }, 1000); };
        setTimeout(() => { setDocLoadingAction(null); URL.revokeObjectURL(blobUrl); }, 3000);
        showToast('success', 'Print dialog opening...');
      } else { throw new Error('Popup blocked'); }
    } catch (err: any) {
      showToast('error', err?.message === 'Popup blocked' ? 'Allow popups to print' : 'Print failed');
      setDocLoadingAction(null);
    }
  };

  const handleDocApproveConfirm = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!docApproving || !schoolId) return;
    setIsApprovingDoc(true);
    try {
      await reviewDocument(docApproving.doc.id, 'approved', undefined, undefined, data.approvedFormName);
      await refreshDocs(); setDocApproving(null);
      showToast('success', 'Document approved');
    } catch { showToast('error', 'Failed to approve document'); }
    finally { setIsApprovingDoc(false); }
  };

  const handleDocRejectConfirm = async () => {
    if (!docRejecting || !schoolId) return;
    setIsRejectingDoc(true);
    try {
      await reviewDocument(docRejecting.doc.id, 'rejected', docRejectReason);
      await refreshDocs(); setDocRejecting(null); setDocRejectReason('');
      showToast('success', 'Document rejected');
    } catch { showToast('error', 'Failed to reject document'); }
    finally { setIsRejectingDoc(false); }
  };

  const handleDocUploadWithApproval = async (data: { file: File; approvedFormName: string; formAcademicYear?: string }) => {
    if (!docUploading) return;
    setIsUploadingDoc(true);
    try {
      const { storage_key, upload_url } = await documentUploadIntent(docUploading.id, data.file);
      await fetch(upload_url, { method: 'PUT', body: data.file, headers: { 'Content-Type': data.file.type } });
      await completeDocumentUpload(docUploading.id, { storage_key, file_name: data.file.name, content_type: data.file.type, file_size_bytes: data.file.size, auto_approve: true, approved_form_name: data.approvedFormName });
      await refreshDocs(); setDocUploading(null);
      showToast('success', 'Document uploaded and approved');
    } catch { showToast('error', 'Upload failed'); }
    finally { setIsUploadingDoc(false); }
  };

  const handleDocMetadataSave = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!docEditingMeta || !schoolId) return;
    setIsSavingDocMeta(true);
    try {
      await updateDocumentMetadata(docEditingMeta.doc.id, { school_id: schoolId, approved_form_name: data.approvedFormName || undefined });
      await refreshDocs(); setDocEditingMeta(null);
      showToast('success', 'Document metadata updated');
    } catch { showToast('error', 'Failed to update metadata'); }
    finally { setIsSavingDocMeta(false); }
  };

  const handleDocChangeStatus = async () => {
    if (!docChangingStatus || !schoolId) return;
    setIsChangingDocStatus(true);
    try {
      await changeDocumentStatus(docChangingStatus.doc.id, { status: docTargetStatus, reason: docChangeStatusReason || undefined });
      await refreshDocs(); setDocChangingStatus(null); setDocChangeStatusReason('');
      showToast('success', 'Document status updated');
    } catch { showToast('error', 'Failed to change status'); }
    finally { setIsChangingDocStatus(false); }
  };

  if (isLoadingAdmin || (!admin && isLoadingAdmin)) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading admin details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!admin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Admin Not Found</h2>
            <Link to={`/${schoolSlug}/admin/admin-management`}>
              <Button variant="outline">Back to Admin Management</Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const adminName = `${admin.first_name} ${admin.last_name}`;

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12"
      >
        {/* Header */}
        <div className="mt-12 sm:mt-10 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 flex-shrink-0 bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 rounded-xl transition-all"
                onClick={() => navigate(`/${schoolSlug}/admin/admin-management`)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-extrabold text-slate-950 tracking-tight truncate">
                    {adminName}
                  </h1>
                  {admin.role.toLowerCase() === 'owner' && (
                    <Shield className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 sm:hidden">
                  <MailIcon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                  <div className="overflow-x-auto scrollbar-thin"><div className="whitespace-nowrap text-xs text-slate-500 font-medium">{admin.email}</div></div>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-[#EFF5FB] px-4 py-2 rounded-xl border border-blue-50 text-xs font-bold text-[#0F2D52] flex-shrink-0 max-w-[280px]">
              <MailIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <div className="overflow-x-auto scrollbar-thin"><div className="whitespace-nowrap">{admin.email}</div></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Admin Information */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white h-fit">
              <CardHeader className="pb-3 border-b border-slate-50">
                <CardTitle className="text-sm font-bold text-slate-900">Admin Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                  <Briefcase className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-xs truncate">Role</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
                    </div>
                  </div>
                </div>

                {admin.phone_number && (
                  <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                    <CheckCircle className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-xs truncate">Phone</div>
                      <div className="text-xs text-slate-500 font-medium mt-0.5">{admin.phone_number}</div>
                    </div>
                  </div>
                )}

                {admin.permissions && admin.permissions.length > 0 && (
                  <div className="flex items-start gap-3 bg-slate-50/40 p-3 rounded-xl border border-slate-50">
                    <FileText className="h-4 w-4 text-[#0F2D52] mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-800 text-xs mb-2">Permissions</div>
                      <div className="flex flex-wrap gap-1">
                        {admin.permissions.map(perm => {
                          const opt = PERMISSION_OPTIONS.find(o => o.key === perm);
                          const label = opt ? opt.label.replace(' Management', '') : perm;
                          return (
                            <span key={perm} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#0F2D52] border border-blue-100 whitespace-nowrap">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-1">
                  <Badge variant={admin.is_verified ? 'success' : 'secondary'} className="rounded-md shadow-xs">
                    {admin.is_verified ? 'Active' : 'Pending'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {isLoading ? (
              <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white">
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
                  <p className="text-slate-500 text-sm font-semibold">Loading forms and documents...</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card border border-slate-100 rounded-2xl shadow-sm bg-white">
                <CardHeader className="pb-3 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">Assigned Forms</CardTitle>
                    <p className="text-xs text-slate-450 font-semibold mt-0.5">
                      {filteredForms.length} form{filteredForms.length === 1 ? '' : 's'} assigned
                    </p>
                  </div>
                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs font-semibold rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Filter by year" />
                        </SelectTrigger>
                        <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl">
                          <SelectItem value="all" className="cursor-pointer">All Years</SelectItem>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year.toString()} className="cursor-pointer">{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 pt-5 px-5 pb-5">

                  {/* Summary + progress bars */}
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                        {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-slate-800 truncate">{adminName}</div>
                        {(totalForms > 0 || employeeDocs.length > 0) && (
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
                            {employeeDocs.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-8 flex-shrink-0">Docs</span>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                                  {appDocPct > 0 && <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${appDocPct}%` }} />}
                                  {subDocPct > 0 && <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${subDocPct}%` }} />}
                                  {pendDocPct > 0 && <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${pendDocPct}%` }} />}
                                </div>
                                <span className="text-[9px] font-semibold tabular-nums text-slate-400 w-7 text-right flex-shrink-0">{appDocs}/{employeeDocs.length}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Form cards */}
                  {filteredForms.length > 0 ? (
                    <div className="space-y-4">
                      {filteredForms.map(form => (
                        <div key={form.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-200 transition-all">
                          <div className="flex flex-col gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-[#0F2D52] flex-shrink-0" />
                                  <h3 className="font-bold text-sm text-slate-800 truncate">{form.formTitle}</h3>
                                </div>
                                {normalizeFormStatus(form.status) === 'Approved' && isAdminOrSuperAdmin && (
                                  <button onClick={() => setEditingFormMeta({ form })} className="flex items-center gap-1 text-xs font-semibold text-[#0F2D52] hover:text-[#1E4B83] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                                    <Pencil className="h-3 w-3" /> Edit
                                  </button>
                                )}
                              </div>
                              <div className="mt-2.5">
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${normalizeFormStatus(form.status) === 'Approved' ? 'text-emerald-600' : normalizeFormStatus(form.status) === 'Submitted' ? 'text-amber-600' : 'text-slate-500'}`}>
                                  {normalizeFormStatus(form.status) === 'Submitted' ? 'Pending Approval' : normalizeFormStatus(form.status)}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <StatusBadge status={normalizeFormStatus(form.status)} />
                                <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                  Assigned {form.assignedOn ? new Date(form.assignedOn).toLocaleDateString() : '—'}
                                </span>
                                {form.approvedOn && (() => { try { const d = new Date(form.approvedOn); if (!isNaN(d.getTime())) return <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Approved {d.toLocaleDateString()}</span>; } catch {} return null; })()}
                                {form.manualPdfUploadedAt && (() => { try { const d = new Date(form.manualPdfUploadedAt!); if (!isNaN(d.getTime())) return <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Admin Uploaded {d.toLocaleDateString()}</span>; } catch {} return null; })()}
                                {normalizeFormStatus(form.status) === 'Approved' && form.approvedFormName && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[180px]" title={form.approvedFormName}>{form.approvedFormName}</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-1.5 leading-relaxed">{form.formDescription}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              {normalizeFormStatus(form.status) === 'Approved' && form.recentPdfLink && (
                                <div className="flex gap-1.5">
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-[#0F2D52] border-slate-200 hover:bg-slate-50 rounded-lg" onClick={() => handleDownloadForm(form)} disabled={loadingAction?.formId === form.id} title="Download PDF">
                                    {loadingAction?.formId === form.id && loadingAction?.action === 'download' ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" /> : <Download className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg" onClick={() => handlePrintForm(form)} disabled={loadingAction?.formId === form.id} title="Print PDF">
                                    {loadingAction?.formId === form.id && loadingAction?.action === 'print' ? <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full" /> : <Printer className="h-4 w-4" />}
                                  </Button>
                                </div>
                              )}
                              {normalizeFormStatus(form.status) !== 'Approved' && (
                                <Link to={`/${schoolSlug || 'goddard'}/admin/forms/view/${form.formId}`} state={{ form, employeeId: admin.employee_id, employeeName: adminName, returnPath: `/${schoolSlug || 'goddard'}/admin/admin-management/${adminId}`, recentEditLink: form.recentEditLink, filloutFormId: form.filloutFormId, studentFormAssignmentId: form.id, schoolId: form.schoolId, isEmployeeForm: true }}>
                                  <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50">
                                    <Eye className="h-3.5 w-3.5 mr-1" /> View Form
                                  </Button>
                                </Link>
                              )}
                              {form.id && isAdminOrSuperAdmin && (
                                <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50"
                                  onClick={() => { setSelectedFormForUpload({ form, employeeName: adminName }); setIsManualUploadOpen(true); }}>
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  {normalizeFormStatus(form.status) === 'Approved' ? 'Replace PDF' : 'Upload PDF'}
                                </Button>
                              )}
                              {normalizeFormStatus(form.status) === 'Submitted' && isAdminOrSuperAdmin && (
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 h-8 text-xs font-semibold shadow-xs" onClick={() => setApprovingForm({ form })}>Approve</Button>
                                  <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg px-3 h-8 text-xs font-semibold" onClick={() => { setRejectNotes(''); setRejectingForm({ form }); }}>Reject</Button>
                                </div>
                              )}
                              {normalizeFormStatus(form.status) === 'Approved' && isAdminOrSuperAdmin && (
                                <Button size="sm" className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white text-xs font-bold" onClick={() => { setRevokeTargetStatus('in_progress'); setRevokeFormData({ form }); setIsRevokeDialogOpen(true); }} disabled={isRevoking}>
                                  Change Status
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium text-sm">No forms assigned for this period.</p>
                    </div>
                  )}

                  {/* Documents */}
                  <div className="mt-2 pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                      Documents
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full normal-case tracking-normal">{employeeDocs.length}</span>
                    </h4>
                    {isLoadingDocuments ? (
                      <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
                    ) : employeeDocs.length === 0 ? (
                      <p className="text-xs text-slate-400 font-semibold text-center py-4">No documents assigned.</p>
                    ) : (
                      employeeDocs.map(doc => (
                        <div key={doc.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 hover:bg-slate-50/40 hover:border-slate-200 transition-all mb-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                              <h3 className="font-bold text-sm text-slate-800 truncate">{doc.document_name}</h3>
                            </div>
                            {doc.status === 'approved' && isAdminOrSuperAdmin && (
                              <button onClick={() => setDocEditingMeta({ doc })} className="flex items-center gap-1 text-xs font-semibold text-[#0F2D52] hover:text-[#1E4B83] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors flex-shrink-0">
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`text-[10px] font-extrabold uppercase tracking-wider ${doc.status === 'approved' ? 'text-emerald-600' : doc.status === 'rejected' ? 'text-red-600' : doc.status === 'submitted' ? 'text-amber-600' : 'text-slate-500'}`}>
                              {doc.status === 'submitted' ? 'Pending Approval' : doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                            {doc.reviewed_at && doc.status === 'approved' && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Approved {new Date(doc.reviewed_at).toLocaleDateString()}</span>
                            )}
                            {doc.approved_form_name && (
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[180px]" title={doc.approved_form_name}>{doc.approved_form_name}</span>
                            )}
                            {doc.due_date && doc.status !== 'approved' && (
                              <span className="text-[10px] text-slate-400 font-medium">Due {new Date(doc.due_date).toLocaleDateString()}</span>
                            )}
                          </div>
                          {doc.status === 'rejected' && doc.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium">Reason: {doc.rejection_reason}</p>
                          )}
                          <div className="flex flex-wrap gap-2 items-center mt-3">
                            {doc.status === 'approved' && doc.latest_submission_id && (
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="icon" className="h-8 w-8 text-[#0F2D52] border-slate-200 hover:bg-slate-50 rounded-lg" onClick={() => handleDocDownloadFile(doc)} disabled={docLoadingAction?.docId === doc.id} title="Download document">
                                  {docLoadingAction?.docId === doc.id && docLoadingAction.action === 'download' ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" /> : <Download className="h-4 w-4" />}
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg" onClick={() => handleDocPrint(doc)} disabled={docLoadingAction?.docId === doc.id} title="Print document">
                                  {docLoadingAction?.docId === doc.id && docLoadingAction.action === 'print' ? <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full" /> : <Printer className="h-4 w-4" />}
                                </Button>
                              </div>
                            )}
                            {isAdminOrSuperAdmin && (
                              <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50" disabled={isUploadingDoc && docUploading?.id === doc.id} onClick={() => setDocUploading(doc)}>
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                {(doc.status === 'approved' || doc.status === 'submitted' || doc.status === 'rejected') ? 'Re-upload' : 'Upload'}
                              </Button>
                            )}
                            {doc.status === 'submitted' && isAdminOrSuperAdmin && (
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100/50 text-xs font-bold" onClick={() => setDocApproving({ doc })}>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>
                                <Button variant="outline" size="sm" className="h-8 rounded-lg text-amber-700 bg-amber-50 border border-amber-100 hover:bg-amber-100/50 text-xs font-bold" onClick={() => { setDocRejecting({ doc }); setDocRejectReason(''); }}>
                                  <AlertCircle className="h-3.5 w-3.5 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                            {doc.status === 'approved' && isAdminOrSuperAdmin && (
                              <Button size="sm" className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white text-xs font-bold" onClick={() => { setDocTargetStatus('pending'); setDocChangeStatusReason(''); setDocChangingStatus({ doc }); }} disabled={isChangingDocStatus}>
                                Change Status
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Offer Letter */}
                  {offerLetterEnabled && (
                    <div className="mt-2 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Offer Letter</h4>
                        {offerLetter && (
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            offerLetter.status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            (offerLetter.status === 'offer_sent' || offerLetter.status === 'viewed') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            (offerLetter.status === 'employee_signed' || offerLetter.status === 'offer_accepted') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            (offerLetter.status === 'approved' || offerLetter.status === 'active') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {offerLetter.status === 'draft' ? 'Draft' :
                             offerLetter.status === 'offer_sent' ? 'Offer Sent' :
                             offerLetter.status === 'viewed' ? 'Viewed' :
                             offerLetter.status === 'employee_signed' ? 'Awaiting Approval' :
                             offerLetter.status === 'offer_accepted' ? 'Awaiting Approval' :
                             (offerLetter.status === 'approved' || offerLetter.status === 'active') ? 'Approved' : 'Rejected'}
                          </span>
                        )}
                      </div>
                      {!offerLetter ? (
                        <div className="flex items-center justify-between py-2">
                          <p className="text-xs text-slate-400">No offer letter yet.</p>
                          {isAdminOrSuperAdmin && (
                            <Button size="sm" onClick={() => setIsCreatingOffer(true)} className="h-7 rounded-lg bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs px-3">Create Offer Letter</Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            {offerLetter.customFields && Object.entries(offerLetter.customFields).map(([key, value]) => {
                              const field = offerLetterFields?.find((f: any) => f.filloutParam === key);
                              const label = field?.label ?? key;
                              return <div key={key}><span className="text-slate-400">{label}: </span><span className="text-slate-700 font-medium">{String(value)}</span></div>;
                            })}
                            {offerLetter.sentAt && <div><span className="text-slate-400">Sent: </span><span className="text-slate-700 font-medium">{new Date(offerLetter.sentAt).toLocaleDateString()}</span></div>}
                          </div>
                          {isAdminOrSuperAdmin && (
                            <div className="flex gap-2 mt-3 flex-wrap">
                              {(offerLetter.status === 'draft' || offerLetter.status === 'offer_sent') && (
                                <Button size="sm" variant="outline" onClick={() => setOfferEditOpen(true)} className="h-7 rounded-lg text-xs px-3">Edit</Button>
                              )}
                              {offerLetter.status === 'draft' && (
                                <Button size="sm" onClick={() => setOfferSendConfirmOpen(true)} className="h-7 rounded-lg bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs px-3">Send</Button>
                              )}
                              {offerLetter.status === 'offer_sent' && (
                                <Button size="sm" variant="outline" onClick={async () => {
                                  try { await OfferLetterService.resendOfferLetter(offerLetter.employeeId, schoolId); showToast('success', 'Offer letter resent'); }
                                  catch (err: any) { showToast('error', err.message || 'Failed to resend'); }
                                }} className="h-7 rounded-lg text-xs px-3">Resend</Button>
                              )}
                              {offerLetter.status === 'offer_accepted' && (
                                <>
                                  <Button size="sm" onClick={() => setOfferReviewDialog({ action: 'approve' })} className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3">Approve</Button>
                                  <Button size="sm" variant="outline" onClick={() => { setOfferReviewDialog({ action: 'reject' }); setOfferRejectionReason(''); }} className="h-7 rounded-lg text-red-600 border-red-200 hover:bg-red-50 text-xs px-3">Reject</Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Offer Letter Dialogs */}
        {offerLetterEnabled && admin.employee_id && (
          <>
            <CreateOfferLetterDialog
              open={isCreatingOffer || offerEditOpen}
              onOpenChange={v => { if (!v) { setIsCreatingOffer(false); setOfferEditOpen(false); } }}
              employeeId={admin.employee_id}
              schoolId={schoolId}
              schoolFormId={userData?.schoolData?.offerLetterFilloutFormId}
              offerLetterFields={offerLetterFields}
              prefill={{ firstName: admin.first_name, lastName: admin.last_name, email: admin.email }}
              existingOffer={offerEditOpen ? offerLetter : null}
              onSaved={saved => { setOfferLetter(saved); setIsCreatingOffer(false); setOfferEditOpen(false); }}
            />

            <Dialog open={offerSendConfirmOpen} onOpenChange={v => { if (!v) setOfferSendConfirmOpen(false); }}>
              <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
                <DialogTitle className="text-base font-bold text-slate-900 mb-2">Send Offer Letter</DialogTitle>
                <p className="text-xs text-slate-500 mb-4">Send the offer letter to <strong>{adminName}</strong>?</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOfferSendConfirmOpen(false)} disabled={isSendingOffer} className="rounded-xl text-xs h-8">Cancel</Button>
                  <Button disabled={isSendingOffer} onClick={async () => {
                    setIsSendingOffer(true);
                    try { const sent = await OfferLetterService.sendOfferLetter(admin.employee_id!, schoolId); setOfferLetter(sent); setOfferSendConfirmOpen(false); showToast('success', 'Offer letter sent'); }
                    catch (err: any) { showToast('error', err.message || 'Failed to send'); }
                    finally { setIsSendingOffer(false); }
                  }} className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs h-8 px-4">
                    {isSendingOffer ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={!!offerReviewDialog} onOpenChange={v => { if (!v) { setOfferReviewDialog(null); setOfferRejectionReason(''); } }}>
              <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
                <DialogTitle className="text-base font-bold text-slate-900 mb-2">
                  {offerReviewDialog?.action === 'approve' ? 'Approve Offer Letter' : 'Reject Offer Letter'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mb-3">
                  {offerReviewDialog?.action === 'approve' ? `Approving will activate ${adminName}'s account.` : 'Rejecting will notify the admin.'}
                </p>
                {offerReviewDialog?.action === 'reject' && (
                  <textarea value={offerRejectionReason} onChange={e => setOfferRejectionReason(e.target.value)} placeholder="Optional rejection reason" rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 resize-none" />
                )}
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setOfferReviewDialog(null); setOfferRejectionReason(''); }} disabled={isProcessingOfferReview} className="rounded-xl text-xs h-8">Cancel</Button>
                  <Button disabled={isProcessingOfferReview} onClick={async () => {
                    if (!offerReviewDialog) return;
                    setIsProcessingOfferReview(true);
                    try {
                      await OfferLetterService.adminReviewOffer(admin.employee_id!, schoolId, { approved: offerReviewDialog.action === 'approve', rejectionReason: offerRejectionReason.trim() || undefined });
                      showToast('success', offerReviewDialog.action === 'approve' ? 'Offer approved — admin activated' : 'Offer rejected');
                      setOfferReviewDialog(null); setOfferRejectionReason(''); setRefreshKey(k => k + 1);
                    } catch (err: any) { showToast('error', err.message || 'Failed'); }
                    finally { setIsProcessingOfferReview(false); }
                  }} className={`rounded-xl text-white text-xs h-8 px-4 ${offerReviewDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isProcessingOfferReview ? 'Processing…' : offerReviewDialog?.action === 'approve' ? 'Approve & Activate' : 'Reject'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Manual Upload Modal */}
        {selectedFormForUpload && (
          <ManualUploadModal
            isOpen={isManualUploadOpen}
            onClose={() => { setIsManualUploadOpen(false); setSelectedFormForUpload(null); }}
            onSuccess={() => { setIsManualUploadOpen(false); setSelectedFormForUpload(null); setRefreshKey(k => k + 1); }}
            assignmentId={selectedFormForUpload.form.id!}
            schoolId={selectedFormForUpload.form.schoolId || schoolId}
            studentName={selectedFormForUpload.employeeName}
            uploadedBy={userData?.email || 'Admin'}
            formType="employee"
            formTemplateName={selectedFormForUpload.form.formTitle}
            isEditable={isAdminOrSuperAdmin}
          />
        )}

        {approvingForm && (
          <ApproveFormModal open={true} onClose={() => setApprovingForm(null)} onConfirm={handleFormApproveConfirm} isEmployee={true} formTemplateName={approvingForm.form.formTitle} personName={adminName} isEditable={true} isSubmitting={isApprovingForm} initialFormName={approvingForm.form.approvedFormName || undefined} />
        )}

        <Dialog open={!!rejectingForm} onOpenChange={open => { if (!open && !isRejectingForm) { setRejectingForm(null); setRejectNotes(''); } }}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50"><DialogTitle className="text-lg font-bold text-slate-900">Reject Form</DialogTitle></div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm font-semibold text-slate-600">{rejectingForm?.form.formTitle}</p>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Reason <span className="text-red-500">*</span></label>
              <Textarea placeholder="Provide a reason for rejection..." value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="h-24 rounded-xl border-slate-200 text-sm" />
            </div>
            <div className="px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-slate-200" onClick={() => { setRejectingForm(null); setRejectNotes(''); }} disabled={isRejectingForm}>Cancel</Button>
              <Button onClick={handleFormRejectConfirm} className="h-10 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white" disabled={isRejectingForm || !rejectNotes.trim()}>
                {isRejectingForm ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {editingFormMeta && (
          <ApproveFormModal open={true} onClose={() => setEditingFormMeta(null)} onConfirm={handleFormMetadataSave} isEmployee={true} formTemplateName={editingFormMeta.form.formTitle} personName={adminName} isEditable={true} isSubmitting={isSavingFormMeta} initialFormName={editingFormMeta.form.approvedFormName || undefined} title="Edit Form Metadata" confirmLabel="Save Changes" />
        )}

        <Dialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50"><DialogTitle className="text-lg font-bold text-slate-900">Change Form Status</DialogTitle></div>
            <div className="flex-shrink-0 px-6 py-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">New Status</label>
                <Select value={revokeTargetStatus} onValueChange={v => setRevokeTargetStatus(v as 'in_progress' | 'rejected')}>
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in_progress">Send Back for Revision</SelectItem><SelectItem value="rejected">Reject</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Reason <span className="text-red-500">*</span></label>
                <Textarea placeholder={revokeTargetStatus === 'rejected' ? 'Provide a reason for rejecting...' : 'Provide a reason for sending back...'} value={revokeNotes} onChange={e => setRevokeNotes(e.target.value)} className="h-24 rounded-xl border-slate-200 text-sm" />
              </div>
            </div>
            <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
              <Button variant="outline" className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4" onClick={() => { setIsRevokeDialogOpen(false); setRevokeNotes(''); setRevokeFormData(null); setRevokeTargetStatus('in_progress'); }} disabled={isRevoking}>Cancel</Button>
              <Button onClick={handleRevoke} className="h-10 rounded-xl text-xs font-bold px-4 bg-[#0F2D52] hover:bg-[#1E4B83] text-white" disabled={isRevoking || !revokeNotes.trim()}>
                {isRevoking ? <span className="flex items-center"><span className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />{revokeTargetStatus === 'rejected' ? 'Rejecting...' : 'Sending...'}</span> : revokeTargetStatus === 'rejected' ? 'Reject' : 'Send Back'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {docApproving && (
          <ApproveFormModal open={true} onClose={() => setDocApproving(null)} onConfirm={handleDocApproveConfirm} isEmployee={true} formTemplateName={docApproving.doc.document_name} personName={adminName} isEditable={true} isSubmitting={isApprovingDoc} initialFormName={docApproving.doc.approved_form_name || undefined} />
        )}

        <UploadDocumentModal open={!!docUploading} onClose={() => setDocUploading(null)} onConfirm={handleDocUploadWithApproval} isStudent={false} documentName={docUploading?.document_name || ''} personName={adminName} uploaderEmail={userData?.email} isSubmitting={isUploadingDoc} />

        <Dialog open={!!docRejecting} onOpenChange={open => { if (!open && !isRejectingDoc) { setDocRejecting(null); setDocRejectReason(''); } }}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50"><DialogTitle className="text-lg font-bold text-slate-900">Reject Document</DialogTitle></div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600 font-semibold">{docRejecting?.doc.document_name}</p>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Reason <span className="text-red-500">*</span></label>
              <Textarea placeholder="Provide a reason for rejection..." value={docRejectReason} onChange={e => setDocRejectReason(e.target.value)} className="h-24 rounded-xl border-slate-200 text-sm" />
            </div>
            <div className="px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-slate-200" onClick={() => { setDocRejecting(null); setDocRejectReason(''); }} disabled={isRejectingDoc}>Cancel</Button>
              <Button onClick={handleDocRejectConfirm} className="h-10 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white" disabled={isRejectingDoc || !docRejectReason.trim()}>
                {isRejectingDoc ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {docEditingMeta && (
          <ApproveFormModal open={true} onClose={() => setDocEditingMeta(null)} onConfirm={handleDocMetadataSave} isEmployee={true} formTemplateName={docEditingMeta.doc.document_name} personName={adminName} isEditable={true} isSubmitting={isSavingDocMeta} initialFormName={docEditingMeta.doc.approved_form_name || undefined} title="Edit Document Metadata" confirmLabel="Save Changes" />
        )}

        <Dialog open={!!docChangingStatus} onOpenChange={open => { if (!open && !isChangingDocStatus) { setDocChangingStatus(null); setDocChangeStatusReason(''); } }}>
          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0">
            <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50"><DialogTitle className="text-lg font-bold text-slate-900">Change Document Status</DialogTitle></div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm font-semibold text-slate-600">{docChangingStatus?.doc.document_name}</p>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">New Status</label>
              <Select value={docTargetStatus} onValueChange={v => setDocTargetStatus(v as 'pending' | 'rejected')}>
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-sm bg-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Send Back (Pending)</SelectItem><SelectItem value="rejected">Reject</SelectItem></SelectContent>
              </Select>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">Reason {docTargetStatus === 'rejected' && <span className="text-red-500">*</span>}</label>
              <Textarea value={docChangeStatusReason} onChange={e => setDocChangeStatusReason(e.target.value)} placeholder="Provide a reason..." className="h-20 rounded-xl border-slate-200 text-sm" />
            </div>
            <div className="px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
              <Button variant="outline" className="h-10 rounded-xl text-xs font-bold border-slate-200" onClick={() => { setDocChangingStatus(null); setDocChangeStatusReason(''); }} disabled={isChangingDocStatus}>Cancel</Button>
              <Button onClick={handleDocChangeStatus} disabled={isChangingDocStatus || (docTargetStatus === 'rejected' && !docChangeStatusReason.trim())} className="h-10 rounded-xl text-xs font-bold bg-[#0F2D52] hover:bg-[#1E4B83] text-white">
                {isChangingDocStatus ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </motion.div>
    </AdminLayout>
  );
}
