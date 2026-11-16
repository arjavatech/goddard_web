import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AsyncButton } from '../ui/async-button';
import { Badge } from '../ui/badge';
import { useToast } from '../../contexts/ToastContext';
import { OfferLetterService, type OfferLetter, type OfferLetterField, type OfferLetterStatus } from '../../services/api/offerLetter';
import { FileText, Download, CheckCircle2, XCircle, Send, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offer: OfferLetter;
  schoolId: string;
  offerLetterFields?: OfferLetterField[];
  onUpdated?: (offer: OfferLetter) => void;
}

function statusLabel(status: OfferLetterStatus): string {
  switch (status) {
    case 'draft': return 'Draft';
    case 'offer_sent': return 'Offer Sent';
    case 'offer_accepted': return 'Awaiting Approval';
    case 'offer_rejected': return 'Rejected by Employee';
    case 'active': return 'Active';
    case 'rejected': return 'Rejected by Admin';
    default: return status;
  }
}

function statusVariant(status: OfferLetterStatus): 'secondary' | 'default' | 'info' | 'success' | 'destructive' | 'warning' {
  switch (status) {
    case 'draft': return 'secondary';
    case 'offer_sent': return 'info';
    case 'offer_accepted': return 'warning';
    case 'offer_rejected': return 'destructive';
    case 'active': return 'success';
    case 'rejected': return 'destructive';
    default: return 'secondary';
  }
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null) return null;
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function OfferLetterDetailDialog({ open, onOpenChange, offer, schoolId, offerLetterFields, onUpdated }: Props) {
  const { showToast } = useToast();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isResending, setIsResending] = useState(false);

  const canReview = offer.status === 'offer_accepted';
  const canResend = offer.status === 'offer_sent' || offer.status === 'offer_accepted';

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const updated = await OfferLetterService.adminReviewOffer(offer.employeeId, schoolId, { approved: true });
      showToast('success', 'Employee activated successfully');
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve offer');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    try {
      const updated = await OfferLetterService.adminReviewOffer(offer.employeeId, schoolId, {
        approved: false,
        rejectionReason: rejectionReason.trim() || undefined,
      });
      showToast('success', 'Offer rejected');
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reject offer');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const updated = await OfferLetterService.resendOfferLetter(offer.employeeId, schoolId);
      showToast('success', `Offer letter resent to ${offer.email}`);
      onUpdated?.(updated);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to resend offer letter');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-0">
        <div className="bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] px-6 py-4 rounded-t-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-bold text-white">
                Offer Letter — {offer.firstName} {offer.lastName}
              </DialogTitle>
            </DialogHeader>
          </div>
          <Badge variant={statusVariant(offer.status)} className="text-[10px] font-bold rounded-full px-2 py-0.5 flex-shrink-0">
            {statusLabel(offer.status)}
          </Badge>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="First Name" value={offer.firstName} />
            <InfoRow label="Last Name" value={offer.lastName} />
            <InfoRow label="Email" value={offer.email} />
            <InfoRow label="Phone" value={offer.phone} />
          </div>

          {/* Custom fields */}
          {offer.customFields && Object.keys(offer.customFields).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(offer.customFields).map(([key, value]) => {
                const field = offerLetterFields?.find(f => f.filloutParam === key);
                const label = field?.label ?? key;
                return <InfoRow key={key} label={label} value={String(value)} />;
              })}
            </div>
          )}

          {/* Fillout / PDF links */}
          {(offer.prefillUrl || offer.filloutPdfLink || offer.filloutEditLink) && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fillout</p>
              <div className="flex flex-wrap gap-2">
                {offer.filloutPdfLink && (
                  <a href={offer.filloutPdfLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs">
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </Button>
                  </a>
                )}
                {offer.filloutEditLink && (
                  <a href={offer.filloutEditLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" /> View Submission
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Employee rejection reason */}
          {offer.employeeRejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-0.5">Employee Rejection Reason</p>
              <p className="text-sm text-red-700">{offer.employeeRejectionReason}</p>
            </div>
          )}

          {/* Admin rejection reason */}
          {offer.adminRejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-600 mb-0.5">Admin Rejection Reason</p>
              <p className="text-sm text-red-700">{offer.adminRejectionReason}</p>
            </div>
          )}

          {/* Admin review section */}
          {canReview && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Review Offer</p>

              {showRejectForm ? (
                <div className="space-y-3">
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Reason for rejection (optional)..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowRejectForm(false); setRejectionReason(''); }} className="rounded-xl">
                      Cancel
                    </Button>
                    <AsyncButton
                      size="sm"
                      onClick={handleReject}
                      disabled={isRejecting}
                      className="rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2"
                    >
                      <XCircle className="w-4 h-4" /> Confirm Rejection
                    </AsyncButton>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <AsyncButton
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve & Activate
                  </AsyncButton>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectForm(true)}
                    disabled={isApproving}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 gap-2"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resend */}
          {canResend && (
            <div className={cn('border-t border-slate-100 pt-4', canReview && 'hidden')}>
              <AsyncButton
                size="sm"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="rounded-xl gap-2 text-xs"
              >
                <Send className="w-3.5 h-3.5" /> {isResending ? 'Resending…' : 'Resend Offer Email'}
              </AsyncButton>
            </div>
          )}

          {!canReview && canResend && (
            <div className="border-t border-slate-100 pt-4">
              <AsyncButton
                size="sm"
                variant="outline"
                onClick={handleResend}
                disabled={isResending}
                className="rounded-xl gap-2 text-xs"
              >
                <Send className="w-3.5 h-3.5" /> {isResending ? 'Resending…' : 'Resend Offer Email'}
              </AsyncButton>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-5">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
