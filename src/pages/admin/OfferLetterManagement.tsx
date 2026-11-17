import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter, type OfferLetterField } from '../../services/api/offerLetter';
import { CreateOfferLetterDialog } from '../../components/admin/CreateOfferLetterDialog';
import { StatCard } from '../../components/ui/stat-card';
import { DataTable } from '../../components/ui/data-table';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { usePageSize } from '../../hooks/usePageSize';
import {
  FileText, Settings, AlertCircle, MoreHorizontal, Send, Edit, Pencil,
  RefreshCw, CheckCircle, X, Search, Filter, Mail, Trash2, History,
} from 'lucide-react';

function statusLabel(s: string) {
  switch (s) {
    case 'draft': return 'Draft';
    case 'offer_sent': return 'Sent';
    case 'offer_accepted': return 'Accepted — Review Needed';
    case 'offer_rejected': return 'Rejected';
    case 'approved': return 'Approved';
    case 'active': return 'Approved';
    case 'rejected': return 'Rejected';
    default: return s;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'draft' ? 'bg-slate-100 text-slate-600 border-slate-200' :
    status === 'offer_sent' ? 'bg-amber-50 text-amber-700 border-amber-200' :
    status === 'offer_accepted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    (status === 'approved' || status === 'active') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    'bg-red-50 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

export function OfferLetterManagement() {
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId ?? '';
  const offerLetterEnabled = userData?.schoolData?.features?.offerLetterEnabled ?? false;

  // ── Offer letters list ────────────────────────────────────────────────────
  const [offers, setOffers] = useState<OfferLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePageSize('offerLetters', 10);

  // ── Config ────────────────────────────────────────────────────────────────
  const [confirmedFormId, setConfirmedFormId] = useState(userData?.schoolData?.offerLetterFilloutFormId ?? '');
  const [isSavingFormId, setIsSavingFormId] = useState(false);
  const [editFormIdOpen, setEditFormIdOpen] = useState(false);
  const [editFormIdValue, setEditFormIdValue] = useState('');
  const initialFields: OfferLetterField[] = ((userData?.schoolData?.settings as any)?.offer_letter_fields) ?? [];
  const [offerLetterFields, setOfferLetterFields] = useState<OfferLetterField[]>(initialFields);
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [newField, setNewField] = useState<Partial<OfferLetterField>>({ type: 'text', required: false });
  const [editingFieldParam, setEditingFieldParam] = useState<string | null>(null);
  const [deleteFieldConfirm, setDeleteFieldConfirm] = useState<OfferLetterField | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);
  const [clearFormIdConfirm, setClearFormIdConfirm] = useState(false);
  const [isClearingFormId, setIsClearingFormId] = useState(false);

  useEffect(() => {
    setConfirmedFormId(userData?.schoolData?.offerLetterFilloutFormId ?? '');
    setOfferLetterFields(((userData?.schoolData?.settings as any)?.offer_letter_fields) ?? []);
  }, [userData?.schoolData?.offerLetterFilloutFormId, userData?.schoolData?.settings]);

  // ── History dialog ────────────────────────────────────────────────────────
  const [historyEmployee, setHistoryEmployee] = useState<OfferLetter | null>(null);
  const [offerHistory, setOfferHistory] = useState<OfferLetter[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleViewHistory = async (offer: OfferLetter) => {
    setHistoryEmployee(offer);
    setOfferHistory([]);
    setIsLoadingHistory(true);
    try {
      const history = await OfferLetterService.getOfferLetterHistory(offer.employeeId, schoolId);
      setOfferHistory(history);
    } catch {
      showToast('error', 'Failed to load offer history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // ── Send / Approve / Reject dialogs ──────────────────────────────────────
  const [sendingOffer, setSendingOffer] = useState<OfferLetter | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [reviewOffer, setReviewOffer] = useState<{ offer: OfferLetter; action: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [editOffer, setEditOffer] = useState<OfferLetter | null>(null);

  const loadOffers = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const data = await OfferLetterService.listOfferLetters(schoolId);
      setOffers(data);
    } catch {
      showToast('error', 'Failed to load offer letters');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const handleSaveFormId = async () => {
    if (!schoolId || !editFormIdValue.trim()) return;
    setIsSavingFormId(true);
    try {
      await OfferLetterService.updateOfferLetterConfig(schoolId, editFormIdValue.trim());
      setConfirmedFormId(editFormIdValue.trim());
      setEditFormIdOpen(false);
      showToast('success', 'Offer letter form URL saved');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save form ID');
    } finally {
      setIsSavingFormId(false);
    }
  };

  const handleAddField = () => {
    if (!newField.label?.trim() || !newField.filloutParam?.trim()) return;
    const field: OfferLetterField = {
      id: newField.filloutParam!.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      label: newField.label!.trim(),
      type: newField.type ?? 'text',
      filloutParam: newField.filloutParam!.trim(),
      required: newField.required ?? false,
    };
    if (editingFieldParam) {
      setOfferLetterFields(prev => prev.map(f => f.filloutParam === editingFieldParam ? field : f));
      setEditingFieldParam(null);
    } else {
      setOfferLetterFields(prev => [...prev, field]);
    }
    setNewField({ type: 'text', required: false });
  };

  const handleClearFormId = async () => {
    if (!schoolId) return;
    setIsClearingFormId(true);
    try {
      await OfferLetterService.updateOfferLetterConfig(schoolId, '');
      setConfirmedFormId('');
      setClearFormIdConfirm(false);
      showToast('success', 'Form ID removed');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove form ID');
    } finally {
      setIsClearingFormId(false);
    }
  };

  const handleEditField = (field: OfferLetterField) => {
    setNewField({ label: field.label, type: field.type, filloutParam: field.filloutParam, required: field.required });
    setEditingFieldParam(field.filloutParam);
  };

  const handleConfirmDeleteField = async () => {
    if (!deleteFieldConfirm || !schoolId) return;
    setIsDeletingField(true);
    try {
      const updated = offerLetterFields.filter(f => f.filloutParam !== deleteFieldConfirm.filloutParam);
      await OfferLetterService.updateOfferLetterConfig(schoolId, undefined, updated);
      setOfferLetterFields(updated);
      showToast('success', 'Field removed');
      setDeleteFieldConfirm(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to remove field');
    } finally {
      setIsDeletingField(false);
    }
  };

  const handleSaveFields = async () => {
    if (!schoolId) return;
    setIsSavingFields(true);
    try {
      await OfferLetterService.updateOfferLetterConfig(schoolId, undefined, offerLetterFields);
      showToast('success', 'Custom fields saved');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save custom fields');
    } finally {
      setIsSavingFields(false);
    }
  };

  const handleSend = async () => {
    if (!sendingOffer) return;
    setIsSending(true);
    try {
      await OfferLetterService.sendOfferLetter(sendingOffer.employeeId, schoolId);
      showToast('success', 'Offer letter sent');
      setSendingOffer(null);
      loadOffers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send offer letter');
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async (offer: OfferLetter) => {
    try {
      await OfferLetterService.resendOfferLetter(offer.employeeId, schoolId);
      showToast('success', 'Offer letter resent');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resend');
    }
  };

  const handleReview = async () => {
    if (!reviewOffer) return;
    setIsReviewing(true);
    try {
      await OfferLetterService.adminReviewOffer(reviewOffer.offer.employeeId, schoolId, {
        approved: reviewOffer.action === 'approve',
        rejectionReason: rejectionReason.trim() || undefined,
      });
      showToast('success', reviewOffer.action === 'approve' ? 'Offer approved — employee activated' : 'Offer rejected');
      setReviewOffer(null);
      setRejectionReason('');
      loadOffers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process review');
    } finally {
      setIsReviewing(false);
    }
  };

  const filtered = offers.filter(o => {
    const matchesSearch = !searchTerm ||
      `${o.firstName} ${o.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalOffers = offers.length;
  const sentPending = offers.filter(o => o.status === 'offer_sent').length;
  const awaitingReview = offers.filter(o => o.status === 'offer_accepted').length;

  if (!offerLetterEnabled) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] mt-16 sm:mt-10">
          <p className="text-slate-500 text-sm">Offer Letter feature is not enabled for this school.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Offer Letters</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage and review employee offer letters</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard label="Total Offer Letters" value={totalOffers} icon={FileText} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
          <StatCard label="Sent / Pending Response" value={sentPending} icon={Mail} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
          <StatCard label="Awaiting Approval" value={awaitingReview} icon={CheckCircle} iconBgClass="bg-blue-50" iconColorClass="text-blue-600" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
        </div>

        {/* Configuration card */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[#EFF5FB] rounded-lg flex items-center justify-center">
              <Settings className="w-3.5 h-3.5 text-[#0F2D52]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Offer Letter Settings</h2>
              <p className="text-xs text-slate-400">Configure the Fillout form URL and custom fields for this school</p>
            </div>
          </div>

          {/* Form ID */}
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Fillout Form URL</p>
          {!confirmedFormId ? (
            <div className="mb-5 flex items-start gap-3 px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700">No form configured — offer letters cannot be sent until this is set.</p>
              </div>
              <Button
                onClick={() => { setEditFormIdValue(''); setEditFormIdOpen(true); }}
                className="h-7 rounded-lg bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs px-3 shrink-0"
              >
                Set Form URL
              </Button>
            </div>
          ) : (
            <div className="mb-5 flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span
                className="font-mono text-xs text-slate-700 flex-1 truncate"
                title={confirmedFormId}
              >
                {confirmedFormId}
              </span>
              <Button
                variant="outline"
                onClick={() => { setEditFormIdValue(confirmedFormId); setEditFormIdOpen(true); }}
                className="h-7 rounded-lg text-xs px-3 shrink-0 gap-1.5"
              >
                <Edit className="w-3 h-3" /> Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setClearFormIdConfirm(true)}
                className="h-7 rounded-lg text-xs px-3 shrink-0 text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          )}

          {/* Custom Fields */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-slate-900">Custom Fields</p>
                <p className="text-xs text-slate-400">School-specific fields added to every offer letter</p>
              </div>
              {offerLetterFields.length > 0 && (
                <Button onClick={handleSaveFields} disabled={isSavingFields}
                  className="h-7 rounded-lg bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs px-3 shrink-0">
                  {isSavingFields ? 'Saving…' : 'Save Fields'}
                </Button>
              )}
            </div>

            {offerLetterFields.length > 0 && (
              <div className="mb-3 rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Label</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Type</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Fillout Param</th>
                      <th className="px-3 py-2 text-center font-semibold text-slate-600">Required</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {offerLetterFields.map(field => (
                      <tr key={field.filloutParam} className={`border-t border-slate-50 ${editingFieldParam === field.filloutParam ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-3 py-2 text-slate-800">{field.label}</td>
                        <td className="px-3 py-2 text-slate-500 capitalize">{field.type}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{field.filloutParam}</td>
                        <td className="px-3 py-2 text-center">{field.required ? '✓' : '—'}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleEditField(field)}
                              className="text-slate-300 hover:text-blue-500 transition-colors" title="Edit">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => setDeleteFieldConfirm(field)}
                              className="text-slate-300 hover:text-red-400 transition-colors" title="Delete">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="block text-xs text-slate-500 mb-1">Label</label>
                <Input value={newField.label ?? ''} onChange={e => setNewField(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Base Hourly Wage" className="h-8 rounded-lg text-xs" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Type</label>
                <select value={newField.type ?? 'text'}
                  onChange={e => setNewField(p => ({ ...p, type: e.target.value as OfferLetterField['type'] }))}
                  className="w-full h-8 rounded-lg border border-slate-200 px-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#0F2D52]/20">
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-slate-500 mb-1">Fillout Param</label>
                <Input value={newField.filloutParam ?? ''} onChange={e => setNewField(p => ({ ...p, filloutParam: e.target.value }))}
                  placeholder="e.g. baseHourlyWage" className="h-8 rounded-lg font-mono text-xs" />
              </div>
              <div className="col-span-1 flex items-center justify-center pb-0.5">
                <label className="flex flex-col items-center gap-1 cursor-pointer">
                  <span className="text-xs text-slate-500">Req.</span>
                  <input type="checkbox" checked={newField.required ?? false}
                    onChange={e => setNewField(p => ({ ...p, required: e.target.checked }))}
                    className="accent-[#0F2D52]" />
                </label>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <Button onClick={handleAddField} disabled={!newField.label?.trim() || !newField.filloutParam?.trim()}
                  className={`w-full h-8 rounded-lg text-xs ${editingFieldParam ? 'bg-[#0F2D52] hover:bg-[#1c477c] text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                  {editingFieldParam ? 'Update' : '+ Add'}
                </Button>
                {editingFieldParam && (
                  <button onClick={() => { setEditingFieldParam(null); setNewField({ type: 'text', required: false }); }}
                    className="text-xs text-slate-400 hover:text-slate-600 text-center">
                    Cancel
                  </button>
                )}
              </div>
            </div>
            {offerLetterFields.length > 0 && (
              <div className="mt-3 flex justify-end">
                <Button onClick={handleSaveFields} disabled={isSavingFields}
                  className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1c477c] text-white text-xs px-4">
                  {isSavingFields ? 'Saving…' : 'Save Fields'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Offer letters list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">All Offer Letters</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">Showing {filtered.length} of {totalOffers}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input placeholder="Search by name or email…"
                  className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="relative w-full sm:w-48">
                <select value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-3 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 appearance-none cursor-pointer font-medium">
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="offer_sent">Sent</option>
                  <option value="offer_accepted">Accepted — Review Needed</option>
                  <option value="offer_rejected">Rejected</option>
                  <option value="approved">Approved</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <Filter className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </div>

          <DataTable
            className="relative z-0"
            loading={isLoading}
            loadingMessage="Loading offer letters…"
            emptyMessage="No offer letters found."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={setItemsPerPage}
            onPageChange={setCurrentPage}
            columns={[
              { header: 'Employee', className: 'w-1/3' },
              { header: 'Email', className: 'w-1/3' },
              { header: 'Status', className: 'w-auto' },
              { header: 'Date', className: 'w-32' },
              { header: 'Actions', className: 'w-auto' },
            ]}
            rows={paginated.map(offer => {
              const initials = `${offer.firstName?.[0] || ''}${offer.lastName?.[0] || ''}`.toUpperCase();
              const displayDate = offer.sentAt || offer.createdAt;
              return (
                <tr key={offer.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <AvatarInitials initials={initials} className="bg-[#0151a0] text-white font-semibold" />
                      <span className="text-sm font-bold text-slate-900">{offer.firstName} {offer.lastName}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs text-slate-600 font-semibold break-all">{offer.email}</p>
                  </td>
                  <td className="py-4 px-4">
                    <StatusBadge status={offer.status} />
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-xs text-slate-500">
                      {displayDate ? new Date(displayDate).toLocaleDateString() : '—'}
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                        {(offer.status === 'draft' || offer.status === 'offer_sent') && (
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700"
                            onClick={() => setEditOffer(offer)}>
                            <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit
                          </DropdownMenuItem>
                        )}
                        {offer.status === 'draft' && (
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700"
                            onClick={() => setSendingOffer(offer)}>
                            <Send className="w-4 h-4 mr-2 text-slate-400" /> Send Offer Letter
                          </DropdownMenuItem>
                        )}
                        {offer.status === 'offer_sent' && (
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700"
                            onClick={() => handleResend(offer)}>
                            <RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Resend
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700"
                          onClick={() => handleViewHistory(offer)}>
                          <History className="w-4 h-4 mr-2 text-slate-400" /> View History
                        </DropdownMenuItem>
                        {offer.status === 'offer_accepted' && (
                          <>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs text-emerald-700 focus:text-emerald-700 focus:bg-emerald-50"
                              onClick={() => { setReviewOffer({ offer, action: 'approve' }); setRejectionReason(''); }}>
                              <CheckCircle className="w-4 h-4 mr-2" /> Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => { setReviewOffer({ offer, action: 'reject' }); setRejectionReason(''); }}>
                              <X className="w-4 h-4 mr-2" /> Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          />
        </div>
      </div>

      {/* Edit / Set Form URL dialog */}
      <Dialog open={editFormIdOpen} onOpenChange={v => { if (!v) setEditFormIdOpen(false); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold text-slate-900">
              {confirmedFormId ? 'Edit Fillout Form URL' : 'Set Fillout Form URL'}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Enter the full Fillout form URL used for offer letters at this school.
            </p>
          </DialogHeader>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Form URL</label>
            <Input
              value={editFormIdValue}
              onChange={e => setEditFormIdValue(e.target.value)}
              placeholder="https://template-1.form-builder-atj.pages.dev/..."
              className="h-10 rounded-xl font-mono text-sm"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveFormId(); }}
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditFormIdOpen(false)} disabled={isSavingFormId} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveFormId} disabled={isSavingFormId || !editFormIdValue.trim()}
              className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white">
              {isSavingFormId ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear form ID confirmation */}
      <Dialog open={clearFormIdConfirm} onOpenChange={v => { if (!v) setClearFormIdConfirm(false); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold text-slate-900">Remove Fillout Form URL</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              This will remove the configured Fillout Form URL. Offer letters cannot be sent until a new URL is set.
            </p>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setClearFormIdConfirm(false)} disabled={isClearingFormId} className="rounded-xl">Cancel</Button>
            <Button onClick={handleClearFormId} disabled={isClearingFormId}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {isClearingFormId ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete custom field confirmation */}
      <Dialog open={!!deleteFieldConfirm} onOpenChange={v => { if (!v) setDeleteFieldConfirm(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold text-slate-900">Remove Custom Field</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Remove <strong>{deleteFieldConfirm?.label}</strong> (<span className="font-mono">{deleteFieldConfirm?.filloutParam}</span>)? This will also save the updated field list immediately.
            </p>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteFieldConfirm(null)} disabled={isDeletingField} className="rounded-xl">Cancel</Button>
            <Button onClick={handleConfirmDeleteField} disabled={isDeletingField}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              {isDeletingField ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send confirmation dialog */}
      <Dialog open={!!sendingOffer} onOpenChange={v => { if (!v) setSendingOffer(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">Send Offer Letter</DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Send the offer letter to <strong>{sendingOffer?.firstName} {sendingOffer?.lastName}</strong> ({sendingOffer?.email})?
            </p>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSendingOffer(null)} disabled={isSending} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSend} disabled={isSending}
              className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white">
              {isSending ? 'Sending…' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve / Reject dialog */}
      <Dialog open={!!reviewOffer} onOpenChange={v => { if (!v) { setReviewOffer(null); setRejectionReason(''); } }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {reviewOffer?.action === 'approve' ? 'Approve Offer Letter' : 'Reject Offer Letter'}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              {reviewOffer?.action === 'approve'
                ? `Approving will activate ${reviewOffer.offer.firstName} ${reviewOffer.offer.lastName}'s account.`
                : `Rejecting will notify ${reviewOffer?.offer.firstName} ${reviewOffer?.offer.lastName}.`}
            </p>
          </DialogHeader>
          {reviewOffer?.action === 'reject' && (
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Rejection Reason</label>
              <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                placeholder="Optional reason…" rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 resize-none" />
            </div>
          )}
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { setReviewOffer(null); setRejectionReason(''); }} disabled={isReviewing} className="rounded-xl">Cancel</Button>
            <Button onClick={handleReview} disabled={isReviewing}
              className={`rounded-xl text-white ${reviewOffer?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
              {isReviewing ? 'Processing…' : reviewOffer?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Letter History Dialog */}
      <Dialog open={!!historyEmployee} onOpenChange={v => { if (!v) { setHistoryEmployee(null); setOfferHistory([]); } }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-base font-bold text-slate-900">
              Offer Letter History — {historyEmployee?.firstName} {historyEmployee?.lastName}
            </DialogTitle>
          </DialogHeader>
          {isLoadingHistory ? (
            <div className="text-center py-8 text-sm text-slate-400">Loading history…</div>
          ) : offerHistory.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">No history found.</div>
          ) : (
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Sent</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Created</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {offerHistory.map(h => (
                    <tr key={h.id} className={h.isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={h.status} />
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {h.sentAt ? new Date(h.sentAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">
                        {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        {h.isCurrent
                          ? <span className="text-emerald-700 font-semibold">Current</span>
                          : <span className="text-slate-400">Historical</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setHistoryEmployee(null); setOfferHistory([]); }} className="rounded-xl">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit offer letter dialog */}
      {editOffer && (
        <CreateOfferLetterDialog
          open={!!editOffer}
          onOpenChange={v => { if (!v) setEditOffer(null); }}
          employeeId={editOffer.employeeId}
          schoolId={schoolId}
          schoolFormId={userData?.schoolData?.offerLetterFilloutFormId}
          offerLetterFields={offerLetterFields}
          existingOffer={editOffer}
          onSaved={() => { setEditOffer(null); loadOffers(); }}
        />
      )}
    </AdminLayout>
  );
}
