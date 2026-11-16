import React, { useEffect, useState, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DataTable } from '../../components/ui/data-table';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { StatCard } from '../../components/ui/stat-card';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { usePageSize } from '../../hooks/usePageSize';
import { CheckCircle, XCircle, Search, X, ClipboardList } from 'lucide-react';

interface ReviewDialogState {
  offer: OfferLetter;
  action: 'approve' | 'reject';
}

export function OfferLetterReview() {
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId ?? '';
  const offerLetterEnabled = userData?.schoolData?.features?.offerLetterEnabled ?? false;

  const [offers, setOffers] = useState<OfferLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePageSize('offerLetterReview', 10);

  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    try {
      const all = await OfferLetterService.listOfferLetters(schoolId);
      setOffers(all.filter(o => o.status === 'offer_accepted'));
    } catch {
      showToast('error', 'Failed to load pending offer letters');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => { loadOffers(); }, [loadOffers]);

  const handleReview = async () => {
    if (!reviewDialog) return;
    setIsReviewing(true);
    try {
      await OfferLetterService.adminReviewOffer(reviewDialog.offer.employeeId, schoolId, {
        approved: reviewDialog.action === 'approve',
        rejectionReason: rejectionReason.trim() || undefined,
      });
      showToast(
        'success',
        reviewDialog.action === 'approve'
          ? 'Offer approved — employee account activated'
          : 'Offer rejected'
      );
      setReviewDialog(null);
      setRejectionReason('');
      loadOffers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to process review');
    } finally {
      setIsReviewing(false);
    }
  };

  const filtered = offers.filter(o => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      `${o.firstName} ${o.lastName}`.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Offer Letter Review</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Review and approve accepted offer letters before activating employees
            </p>
          </div>
        </div>

        {/* Stat card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <StatCard
            label="Awaiting Review"
            value={offers.length}
            icon={ClipboardList}
            iconBgClass="bg-blue-50"
            iconColorClass="text-blue-600"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pending Approval</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Employees who accepted their offer letter and are awaiting your review
                </p>
              </div>
            </div>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <DataTable
            className="relative z-0"
            loading={isLoading}
            loadingMessage="Loading pending offer letters…"
            emptyMessage="No offer letters are awaiting review."
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={setItemsPerPage}
            onPageChange={setCurrentPage}
            columns={[
              { header: 'Employee', className: 'w-1/3' },
              { header: 'Email', className: 'w-1/3' },
              { header: 'Accepted At', className: 'w-32' },
              { header: 'Actions', className: 'w-auto' },
            ]}
            rows={paginated.map(offer => {
              const initials = `${offer.firstName?.[0] || ''}${offer.lastName?.[0] || ''}`.toUpperCase();
              const acceptedDate = offer.employeeRespondedAt
                ? new Date(offer.employeeRespondedAt).toLocaleDateString()
                : '—';
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
                    <p className="text-xs text-slate-500">{acceptedDate}</p>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => { setReviewDialog({ offer, action: 'approve' }); setRejectionReason(''); }}
                        className="h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        onClick={() => { setReviewDialog({ offer, action: 'reject' }); setRejectionReason(''); }}
                        variant="outline"
                        className="h-7 rounded-lg border-red-200 text-red-600 hover:bg-red-50 text-xs px-3 gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          />
        </div>
      </div>

      {/* Approve / Reject confirmation dialog */}
      <Dialog
        open={!!reviewDialog}
        onOpenChange={v => { if (!v) { setReviewDialog(null); setRejectionReason(''); } }}
      >
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {reviewDialog?.action === 'approve' ? 'Approve Offer Letter' : 'Reject Offer Letter'}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              {reviewDialog?.action === 'approve'
                ? `Approving will activate ${reviewDialog.offer.firstName} ${reviewDialog.offer.lastName}'s employee account.`
                : `This will reject ${reviewDialog?.offer.firstName} ${reviewDialog?.offer.lastName}'s signed offer.`}
            </p>
          </DialogHeader>

          {reviewDialog?.action === 'reject' && (
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Optional — reason shown to the employee"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 resize-none"
              />
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setReviewDialog(null); setRejectionReason(''); }}
              disabled={isReviewing}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={isReviewing}
              className={`rounded-xl text-white ${reviewDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isReviewing
                ? 'Processing…'
                : reviewDialog?.action === 'approve'
                  ? 'Approve & Activate'
                  : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
