import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { ChevronLeft, CheckCircle, XCircle, Download, Mail, Calendar } from 'lucide-react';

function statusLabel(status: string): string {
  switch (status) {
    case 'employee_signed':
    case 'offer_accepted': return 'Awaiting Approval';
    case 'approved':
    case 'active': return 'Active';
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
  const [rejectionReason, setRejectionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!offer) return null;

  const embedUrl = offer.filloutEditLink ?? offer.filloutPdfLink ?? null;
  const acceptedDate = offer.employeeRespondedAt
    ? new Date(offer.employeeRespondedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await OfferLetterService.adminReviewOffer(offer.employeeId, schoolId, { approved: true });
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
                {offer.firstName} {offer.lastName}
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
            <div className="relative w-full" style={{ minHeight: '600px' }}>
              {isFrameLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 z-10">
                  <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-10 w-10 mb-4" />
                  <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading offer letter…</p>
                </div>
              )}
              <iframe
                src={embedUrl}
                title="Offer Letter"
                style={{
                  width: '100%',
                  minHeight: '700px',
                  height: '80vh',
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

        {/* Bottom action bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex-1 w-full sm:max-w-xs">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                Rejection Reason <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Reason shown to the employee if rejected…"
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20 resize-none"
              />
            </div>
            <div className="flex gap-2 shrink-0">
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-5"
              >
                {isApproving
                  ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Processing…</>
                  : <><CheckCircle className="h-4 w-4" /> Approve &amp; Activate</>
                }
              </Button>
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
                className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2 h-10 px-5"
              >
                {isRejecting
                  ? <><span className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" /> Processing…</>
                  : <><XCircle className="h-4 w-4" /> Reject</>
                }
              </Button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
