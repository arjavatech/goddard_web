import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { ChevronLeft, CheckCircle, XCircle, Download, Mail, Calendar } from 'lucide-react';

function statusLabel(status: string): string {
  switch (status) {
    case 'employee_signed':
    case 'offer_accepted': return 'Awaiting Approval';
    case 'approved':
    case 'active': return 'Active';
    case 'offer_rejected':
    case 'rejected': return 'Rejected';
    case 'viewed': return 'Viewed';
    case 'offer_sent': return 'Offer Sent';
    default: return status;
  }
}

function statusVariant(status: string): 'warning' | 'success' | 'destructive' | 'info' | 'secondary' {
  switch (status) {
    case 'employee_signed':
    case 'offer_accepted': return 'warning';
    case 'approved':
    case 'active': return 'success';
    case 'offer_rejected':
    case 'rejected': return 'destructive';
    case 'viewed':
    case 'offer_sent': return 'info';
    default: return 'secondary';
  }
}

export function OfferLetterReviewDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId ?? '';

  const state = location.state as { offer: OfferLetter; returnPath: string } | null;

  useEffect(() => {
    if (!state?.offer) {
      navigate(`/${schoolSlug}/admin/offer-letters/review`, { replace: true });
    }
  }, []);

  const offer = state?.offer;
  const returnPath = state?.returnPath ?? `/${schoolSlug}/admin/offer-letters/review`;

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [formHeight, setFormHeight] = useState<number>(1050);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  useIframeScrollLock();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;
        const h =
          (data.type === 'form_resized' ? data.size : undefined) ??
          data.height ?? data.value ?? data.clientHeight ?? data.size ??
          data.payload?.height ?? data.payload?.size ??
          data.data?.height ?? data.data?.size;
        if (typeof h === 'number' && h > 0) {
          setFormHeight(prev => {
            const next = Math.ceil(h);
            if (next > prev && (next - prev) < 50) return prev;
            return next;
          });
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!offer) return null;

  const embedUrl = offer.filloutEditLink ?? offer.filloutPdfLink ?? null;
  const acceptedDate = offer.employeeRespondedAt
    ? new Date(offer.employeeRespondedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const fullName = `${offer.firstName} ${offer.lastName}`;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await OfferLetterService.adminReviewOffer(offer.employeeId, schoolId, { approved: true });
      setApproveModalOpen(false);
      showToast('success', 'Offer approved — employee account activated');
      navigate(returnPath);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve offer');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      await OfferLetterService.adminReviewOffer(offer.employeeId, schoolId, {
        approved: false,
        rejectionReason: rejectionReason.trim() || undefined,
      });
      setRejectModalOpen(false);
      setRejectionReason('');
      showToast('success', 'Offer rejected');
      navigate(returnPath);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject offer');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 pb-32 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(returnPath)}
              className="h-8 w-8 rounded-xl border-slate-200 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
                {fullName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
                Offer Letter Review
              </p>
            </div>
          </div>
          <Badge
            variant={statusVariant(offer.status)}
            className="text-xs font-bold rounded-full px-3 py-1 self-start sm:self-auto"
          >
            {statusLabel(offer.status)}
          </Badge>
        </div>

        {/* Info row */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs px-6 py-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 text-[#0F2D52]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Email</p>
              <p className="text-sm font-semibold text-slate-900">{offer.email}</p>
            </div>
          </div>
          {acceptedDate && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#0F2D52]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Accepted On</p>
                <p className="text-sm font-semibold text-slate-900">{acceptedDate}</p>
              </div>
            </div>
          )}
        </div>

        {/* Document viewer */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {embedUrl ? (
            <div className="relative w-full">
              {isFrameLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-10" style={{ minHeight: '400px' }}>
                  <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-10 w-10 mb-4" />
                  <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading offer letter…</p>
                </div>
              )}
              <iframe
                src={embedUrl}
                title="Offer Letter"
                style={{
                  width: '100%',
                  height: `${formHeight}px`,
                  border: 'none',
                  display: 'block',
                  opacity: isFrameLoading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
                allow="camera; microphone"
                onLoad={() => setIsFrameLoading(false)}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
              <p className="text-sm font-semibold">No document available to preview.</p>
              {offer.filloutPdfLink && (
                <a href={offer.filloutPdfLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs h-9">
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Sticky bottom action bar */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.06)] z-10">
        <Button
          variant="outline"
          onClick={() => navigate(returnPath)}
          className="rounded-xl h-10 px-5"
        >
          Back
        </Button>
        {offer.status !== 'approved' && offer.status !== 'active' && (
          <>
            <Button
              variant="outline"
              onClick={() => { setRejectionReason(''); setRejectModalOpen(true); }}
              className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2 h-10 px-5"
            >
              <XCircle className="h-4 w-4" /> Reject
            </Button>
            <Button
              onClick={() => setApproveModalOpen(true)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-5"
            >
              <CheckCircle className="h-4 w-4" /> Approve &amp; Activate
            </Button>
          </>
        )}
      </div>

      {/* Approve confirmation modal */}
      <Dialog open={approveModalOpen} onOpenChange={v => { if (!v && !isApproving) setApproveModalOpen(false); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Approve Offer Letter</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Approving will activate <span className="font-semibold text-slate-700">{fullName}</span>'s employee account. This action cannot be undone.
            </p>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setApproveModalOpen(false)}
              disabled={isApproving}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {isApproving
                ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Processing…</>
                : <><CheckCircle className="h-4 w-4" /> Approve &amp; Activate</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModalOpen} onOpenChange={v => { if (!v && !isRejecting) { setRejectModalOpen(false); setRejectionReason(''); } }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl bg-white p-6">
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Reject Offer Letter</DialogTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              This will reject <span className="font-semibold text-slate-700">{fullName}</span>'s signed offer letter.
            </p>
          </DialogHeader>
          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-600 mb-1.5">
              Rejection Reason <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Reason shown to the employee…"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300/40 resize-none"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => { setRejectModalOpen(false); setRejectionReason(''); }}
              disabled={isRejecting}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isRejecting}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {isRejecting
                ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Processing…</>
                : <><XCircle className="h-4 w-4" /> Confirm Rejection</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
