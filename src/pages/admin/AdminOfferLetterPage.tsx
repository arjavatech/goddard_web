import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { FileText, Download, Printer, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null) return null;
  return (
    <div className="bg-slate-50 rounded-xl px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusSection({
  offer,
  onOpenForm,
  onDownload,
  onPrint,
  onCheckStatus,
  isRefreshing,
  isDownloading,
  isPrinting,
}: {
  offer: OfferLetter;
  onOpenForm?: () => void;
  onDownload?: () => void;
  onPrint?: () => void;
  onCheckStatus?: () => void;
  isRefreshing?: boolean;
  isDownloading?: boolean;
  isPrinting?: boolean;
}) {
  switch (offer.status) {
    case 'pending_offer':
    case 'offer_sent':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Your Offer Letter is Ready</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Review the details below, then open your offer letter to sign.
            </p>
          </div>
          {offer.prefillUrl && (
            <button
              onClick={onOpenForm}
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white text-sm font-semibold transition-colors"
            >
              <FileText className="w-4 h-4" /> Open Offer Letter
            </button>
          )}
        </div>
      );

    case 'viewed':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Complete Your Offer Letter</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              You've opened the offer letter. Please complete and sign it to proceed.
            </p>
          </div>
          {offer.prefillUrl && (
            <button
              onClick={onOpenForm}
              className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white text-sm font-semibold transition-colors"
            >
              <FileText className="w-4 h-4" /> Open Offer Letter
            </button>
          )}
        </div>
      );

    case 'employee_signed':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Offer Letter Signed</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              You've signed your offer letter. Waiting for school approval.
            </p>
          </div>
        </div>
      );

    case 'offer_accepted':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Offer Submitted</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Your offer has been submitted. The school administrator will review and activate your account shortly.
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={onCheckStatus}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>
      );

    case 'offer_rejected': {
      const reason = offer.adminRejectionReason ?? offer.employeeRejectionReason;
      return (
        <div className="space-y-4 py-2">
          {reason && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-4">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-red-700">Rejection Reason</p>
                <p className="text-sm text-red-600 mt-0.5">{reason}</p>
              </div>
            </div>
          )}
          <div className="text-center space-y-2">
            <p className="text-base font-bold text-slate-900">Your Offer Letter Was Rejected</p>
            <p className="text-sm text-slate-500">Please re-fill your offer letter to resubmit for approval.</p>
            {(offer.filloutEditLink ?? offer.prefillUrl) && (
              <button
                onClick={onOpenForm}
                className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white text-sm font-semibold transition-colors"
              >
                <FileText className="w-4 h-4" /> Re-fill Offer Letter
              </button>
            )}
          </div>
        </div>
      );
    }

    case 'approved':
    case 'active':
      return (
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900">Offer Letter Confirmed — Welcome!</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Your offer letter has been accepted and your account is now active.
            </p>
          </div>
          {offer.filloutPdfLink && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
              >
                {isDownloading
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Downloading…</>
                  : <><Download className="w-3.5 h-3.5" /> Download</>}
              </button>
              <button
                onClick={onPrint}
                disabled={isPrinting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 text-slate-700 text-xs font-semibold transition-colors"
              >
                {isPrinting
                  ? <><span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Preparing…</>
                  : <><Printer className="w-3.5 h-3.5" /> Print</>}
              </button>
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

export function AdminOfferLetterPage() {
  const { userData } = useUserContext();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [offer, setOffer] = useState<OfferLetter | null>(null);
  const [pastOffers, setPastOffers] = useState<OfferLetter[]>([]);
  const [showPastOffers, setShowPastOffers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCountRef = useRef(0);

  const schoolId = userData?.schoolId ?? '';
  const employeeId = userData?.employeeId ?? '';

  const fetchOffer = async (quiet = false) => {
    if (!schoolId || !employeeId) return;
    if (!quiet) setLoading(true);
    else setIsRefreshing(true);
    try {
      const history = await OfferLetterService.getOfferLetterHistory(employeeId, schoolId);
      const current = history.find(o => o.isCurrent) ?? history[0] ?? null;
      const past = history.filter(o => !o.isCurrent);
      setOffer(current);
      setPastOffers(past);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load offer letter');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOffer();
  }, [schoolId, employeeId]);

  // Poll for status update when waiting for Fillout webhook after re-fill
  useEffect(() => {
    if (!schoolId || !employeeId || offer?.status !== 'offer_rejected') return;
    pollCountRef.current = 0;

    const interval = setInterval(async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > 10) { clearInterval(interval); return; }
      try {
        const history = await OfferLetterService.getOfferLetterHistory(employeeId, schoolId);
        const current = history.find(o => o.isCurrent) ?? history[0] ?? null;
        if (current && current.status !== 'offer_rejected') {
          setOffer(current);
          setPastOffers(history.filter(o => !o.isCurrent));
          clearInterval(interval);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [schoolId, employeeId, offer?.status]);

  const handleDownload = async () => {
    if (!offer?.filloutPdfLink) return;
    setIsDownloading(true);
    try {
      const res = await fetch(offer.filloutPdfLink);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url;
      el.download = `Offer Letter - ${offer.firstName ?? ''} ${offer.lastName ?? ''}.pdf`;
      document.body.appendChild(el);
      el.click();
      el.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!offer?.filloutPdfLink) return;
    setIsPrinting(true);
    try {
      const res = await fetch(offer.filloutPdfLink);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:-9999px;width:800px;height:600px;border:0;';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setIsPrinting(false);
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      };
    } catch {
      setIsPrinting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#0F2D52] flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Offer Letter</h1>
            <p className="text-xs text-slate-500">Your employment offer details</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-3 bg-slate-200 rounded w-16" />
                <div className="h-5 bg-slate-200 rounded-full w-24" />
              </div>
              <div className="flex items-center gap-4 py-2">
                <div className="w-14 h-14 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="h-2 bg-slate-200 rounded w-16 mb-1" />
                    <div className="h-4 bg-slate-200 rounded w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && error && (
          <Card className="rounded-2xl border border-red-100 p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600">{error}</p>
          </Card>
        )}

        {!loading && !error && offer && (
          <div className="space-y-4">
            {/* Status card */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
                <Badge
                  variant={
                    offer.status === 'active' || offer.status === 'approved' ? 'success'
                      : offer.status === 'employee_signed' || offer.status === 'offer_accepted' ? 'warning'
                      : offer.status === 'offer_rejected' ? 'destructive'
                      : offer.status === 'pending_offer' || offer.status === 'offer_sent' || offer.status === 'viewed' ? 'info'
                      : 'secondary'
                  }
                  className="text-[10px] font-bold rounded-full px-2.5 py-0.5"
                >
                  {offer.status === 'active' || offer.status === 'approved' ? 'Active'
                    : offer.status === 'employee_signed' || offer.status === 'offer_accepted' ? 'Awaiting Admin Approval'
                    : offer.status === 'offer_rejected' ? 'Rejected'
                    : offer.status === 'pending_offer' || offer.status === 'offer_sent' ? 'Offer Sent'
                    : offer.status === 'viewed' ? 'Action Required'
                    : 'Pending'}
                </Badge>
              </div>
              <StatusSection
                offer={offer}
                onOpenForm={() => navigate(`/${schoolSlug}/admin/offer-letter/view`, {
                  state: {
                    prefillUrl: offer.status === 'offer_rejected'
                      ? (offer.filloutEditLink ?? offer.prefillUrl)
                      : offer.prefillUrl,
                    status: offer.status,
                    rejectionReason: offer.adminRejectionReason ?? offer.employeeRejectionReason,
                  },
                })}
                onDownload={handleDownload}
                onPrint={handlePrint}
                onCheckStatus={() => fetchOffer(true)}
                isRefreshing={isRefreshing}
                isDownloading={isDownloading}
                isPrinting={isPrinting}
              />
            </Card>

            {/* Offer details */}
            {offer.customFields && Object.keys(offer.customFields).length > 0 && (
              <Card className="rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Offer Details</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(offer.customFields).map(([key, value]) => {
                    const fields = (userData?.schoolData?.settings as any)?.offer_letter_fields ?? [];
                    const field = fields.find((f: any) => f.filloutParam === key);
                    const label = field?.label ?? key;
                    return <InfoRow key={key} label={label} value={String(value)} />;
                  })}
                </div>
              </Card>
            )}

            {/* Past Offers */}
            {pastOffers.length > 0 && (
              <Card className="rounded-2xl border border-slate-100 shadow-sm p-5">
                <button
                  onClick={() => setShowPastOffers(v => !v)}
                  className="flex items-center justify-between w-full"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Past Offers ({pastOffers.length})
                  </p>
                  {showPastOffers
                    ? <ChevronUp className="w-4 h-4 text-slate-400" />
                    : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showPastOffers && (
                  <div className="mt-3 space-y-2">
                    {pastOffers.map(past => (
                      <div key={past.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">
                            {past.sentAt
                              ? `Sent ${new Date(past.sentAt).toLocaleDateString()}`
                              : past.createdAt
                                ? `Created ${new Date(past.createdAt).toLocaleDateString()}`
                                : 'No date'}
                          </p>
                        </div>
                        <Badge
                          variant={
                            past.status === 'approved' || past.status === 'active' ? 'success'
                              : past.status === 'offer_accepted' || past.status === 'employee_signed' ? 'warning'
                              : past.status === 'offer_rejected' || past.status === 'rejected' ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] font-bold rounded-full px-2 py-0.5"
                        >
                          {past.status === 'approved' || past.status === 'active' ? 'Approved'
                            : past.status === 'offer_accepted' || past.status === 'employee_signed' ? 'Awaiting Approval'
                            : past.status === 'offer_rejected' || past.status === 'rejected' ? 'Rejected'
                            : past.status === 'offer_sent' || past.status === 'pending_offer' ? 'Sent'
                            : 'Draft'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {!loading && !error && !offer && (
          <Card className="rounded-2xl border border-slate-100 p-8 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No offer letter found.</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
