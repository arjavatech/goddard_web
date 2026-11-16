import React, { useEffect, useState } from 'react';
import { EmployeeLayout } from './EmployeeLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loading } from '../../components/ui/loading';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { FileText, ExternalLink, Download, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

function StatusSection({ offer }: { offer: OfferLetter }) {
  switch (offer.status) {
    case 'offer_sent':
      return (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Your Offer Letter is Ready</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Click the button below to open the offer form, review the details, and submit your response.
            </p>
          </div>
          {offer.prefillUrl && (
            <a href={offer.prefillUrl} target="_blank" rel="noopener noreferrer">
              <Button className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white gap-2 mt-2">
                <ExternalLink className="w-4 h-4" /> Open Offer Letter
              </Button>
            </a>
          )}
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
              Your offer has been submitted. The admin will review and activate your account shortly.
            </p>
          </div>
        </div>
      );

    case 'offer_rejected':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Offer Not Accepted</p>
            {offer.employeeRejectionReason && (
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{offer.employeeRejectionReason}</p>
            )}
            <p className="text-sm text-slate-400 mt-2">Please contact your school administrator.</p>
          </div>
        </div>
      );

    case 'active':
      return (
        <div className="text-center space-y-3 py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">Offer Letter Confirmed</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              Your offer letter has been accepted and your account is active.
            </p>
          </div>
          {offer.filloutPdfLink && (
            <a href={offer.filloutPdfLink} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="rounded-xl gap-2 mt-2">
                <Download className="w-4 h-4" /> Download Offer Letter PDF
              </Button>
            </a>
          )}
        </div>
      );

    default:
      return null;
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

export function OfferLetterPage() {
  const { userData } = useUserContext();
  const [offer, setOffer] = useState<OfferLetter | null>(null);
  const [pastOffers, setPastOffers] = useState<OfferLetter[]>([]);
  const [showPastOffers, setShowPastOffers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolId = userData?.schoolId ?? '';

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);

    const employeeId = (userData as any)?.employeeId;
    if (!employeeId) {
      setError('Employee information not found.');
      setLoading(false);
      return;
    }

    OfferLetterService.getOfferLetterHistory(employeeId, schoolId)
      .then(history => {
        const current = history.find(o => o.isCurrent) ?? history[0] ?? null;
        const past = history.filter(o => !o.isCurrent);
        setOffer(current);
        setPastOffers(past);
      })
      .catch(err => setError(err.message || 'Failed to load offer letter'))
      .finally(() => setLoading(false));
  }, [schoolId]);

  return (
    <EmployeeLayout>
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
          <div className="flex justify-center py-16">
            <Loading size="md" message="Loading offer letter…" />
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
                    offer.status === 'active' ? 'success'
                      : offer.status === 'offer_accepted' ? 'warning'
                      : offer.status === 'offer_rejected' ? 'destructive'
                      : offer.status === 'offer_sent' ? 'info'
                      : 'secondary'
                  }
                  className="text-[10px] font-bold rounded-full px-2.5 py-0.5"
                >
                  {offer.status === 'active' ? 'Active'
                    : offer.status === 'offer_accepted' ? 'Awaiting Approval'
                    : offer.status === 'offer_rejected' ? 'Rejected'
                    : offer.status === 'offer_sent' ? 'Action Required'
                    : 'Pending'}
                </Badge>
              </div>
              <StatusSection offer={offer} />
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
                              : past.status === 'offer_accepted' ? 'warning'
                              : past.status === 'offer_rejected' || past.status === 'rejected' ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px] font-bold rounded-full px-2 py-0.5"
                        >
                          {past.status === 'approved' || past.status === 'active' ? 'Approved'
                            : past.status === 'offer_accepted' ? 'Accepted'
                            : past.status === 'offer_rejected' || past.status === 'rejected' ? 'Rejected'
                            : past.status === 'offer_sent' ? 'Sent'
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
      </div>
    </EmployeeLayout>
  );
}
