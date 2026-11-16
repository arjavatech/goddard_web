import React, { useEffect, useState } from 'react';
import { EmployeeLayout } from './EmployeeLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Loading } from '../../components/ui/loading';
import { useUserContext } from '../../contexts/UserContext';
import { OfferLetterService, type OfferLetter } from '../../services/api/offerLetter';
import { FileText, ExternalLink, Download, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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

    OfferLetterService.getOfferLetter(employeeId, schoolId)
      .then(setOffer)
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
            <Card className="rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Offer Details</p>
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="Role" value={offer.role} />
                <InfoRow label="Joining Date" value={offer.joiningDate} />
                {offer.salary != null && (
                  <InfoRow label="Salary" value={`${offer.salaryCurrency ?? 'USD'} ${offer.salary.toLocaleString()}`} />
                )}
              </div>
              {offer.additionalNotes && (
                <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{offer.additionalNotes}</p>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
}
