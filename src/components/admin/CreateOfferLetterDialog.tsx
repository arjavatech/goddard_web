import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AsyncButton } from '../ui/async-button';
import { Input } from '../ui/input';
import { useToast } from '../../contexts/ToastContext';
import { OfferLetterService, type OfferLetter, type OfferLetterField } from '../../services/api/offerLetter';
import { FileEdit, Send, AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  schoolId: string;
  schoolFormId?: string;
  offerLetterFields?: OfferLetterField[];
  prefill?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  existingOffer?: OfferLetter | null;
  onSaved?: (offer: OfferLetter) => void;
}

export function CreateOfferLetterDialog({
  open,
  onOpenChange,
  employeeId,
  schoolId,
  schoolFormId,
  offerLetterFields,
  prefill,
  existingOffer,
  onSaved,
}: Props) {
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const isEditing = !!existingOffer;
  const isResend = isEditing && existingOffer?.status !== 'draft';
  const isApprovedEdit = isEditing && (
    ['approved', 'active', 'employee_signed', 'offer_accepted'].includes(existingOffer?.status ?? '')
  );
  const hasCustomFields = (offerLetterFields ?? []).length > 0;

  useEffect(() => {
    if (!open) {
      setStep(1);
      return;
    }
    if (existingOffer) {
      setFirstName(existingOffer.firstName);
      setLastName(existingOffer.lastName);
      setEmail(existingOffer.email);
      setPhone(existingOffer.phone ?? '');
      setCustomFields(existingOffer.customFields ?? {});
    } else {
      setFirstName(prefill?.firstName ?? '');
      setLastName(prefill?.lastName ?? '');
      setEmail(prefill?.email ?? '');
      setPhone('');
      setCustomFields({});
    }
  }, [open, existingOffer, prefill]);

  const basicFieldsValid = firstName.trim() && lastName.trim() && email.trim();

  const requiredCustomFieldsFilled = (offerLetterFields ?? [])
    .filter(f => f.required)
    .every(f => !!customFields[f.filloutParam]?.trim());

  const isFormValid = !!basicFieldsValid && requiredCustomFieldsFilled;

  async function saveOrUpdate() {
    const nonEmptyCustomFields = Object.fromEntries(
      Object.entries(customFields).filter(([, v]) => v.trim() !== '')
    );
    const req = {
      schoolId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      customFields: Object.keys(nonEmptyCustomFields).length > 0 ? nonEmptyCustomFields : undefined,
    };
    if (isEditing) {
      return OfferLetterService.updateOfferLetter(employeeId, schoolId, req);
    }
    return OfferLetterService.createOfferLetter(employeeId, req);
  }

  const handleSaveDraft = async () => {
    if (!basicFieldsValid) return;
    setIsSavingDraft(true);
    try {
      const offer = await saveOrUpdate();
      showToast('success', 'Offer letter saved as draft');
      onSaved?.(offer);
      onOpenChange(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save offer letter');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSendOffer = async () => {
    if (!isFormValid) return;
    if (!schoolFormId) {
      showToast('error', 'No offer letter form configured. Set it in Employee Forms settings.');
      return;
    }
    setIsSending(true);
    try {
      const draft = await saveOrUpdate();
      if (isResend) {
        await OfferLetterService.resendOfferLetter(draft.employeeId, schoolId);
        showToast('success', isApprovedEdit
          ? 'Offer letter updated — employee has been notified to re-sign'
          : 'New offer letter sent — employee has been notified');
      } else {
        const sent = await OfferLetterService.sendOfferLetter(draft.employeeId, schoolId);
        showToast('success', `Offer letter sent to ${sent.email}`);
      }
      onSaved?.(draft);
      onOpenChange(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send offer letter');
    } finally {
      setIsSending(false);
    }
  };

  const stepSubtitle = isEditing
    ? (step === 1
        ? 'Step 1 of 2: Basic Details'
        : hasCustomFields ? 'Step 2 of 2: Job Details & Confirm' : 'Step 2 of 2: Confirm')
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-lg border border-slate-100 bg-white p-0 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] px-6 py-4 rounded-t-2xl flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
            <FileEdit className="w-4 h-4 text-white" />
          </div>
          <DialogHeader className="p-0 flex-1">
            <DialogTitle className="text-base font-bold text-white">
              {isEditing ? 'Edit Offer Letter' : 'Create Offer Letter'}
            </DialogTitle>
            {stepSubtitle && (
              <p className="text-xs text-white/70 mt-0.5">{stepSubtitle}</p>
            )}
          </DialogHeader>
        </div>

        {/* ── EDIT MODE: Step 1 — Basic fields ── */}
        {isEditing && step === 1 && (
          <div className="px-6 py-5 space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className="h-10 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                Email <span className="text-red-500">*</span>
                <span className="normal-case font-normal text-slate-400 ml-1">(Cannot edit)</span>
              </label>
              <Input type="email" value={email} disabled className="h-10 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-10 rounded-xl" />
            </div>
          </div>
        )}

        {/* ── EDIT MODE: Step 2 — Custom fields + confirm ── */}
        {isEditing && step === 2 && (
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {/* Warning for approved/signed offers */}
            {isApprovedEdit && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">
                  This offer is already approved. Saving will reset it — the employee must re-sign with the updated details.
                </p>
              </div>
            )}

            {hasCustomFields && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase text-slate-500">School-Specific Fields</p>
                {offerLetterFields!.map(field => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                      {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    <Input
                      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                      value={customFields[field.filloutParam] ?? ''}
                      onChange={e => setCustomFields(prev => ({ ...prev, [field.filloutParam]: e.target.value }))}
                      placeholder={field.type === 'number' ? '0.00' : field.label}
                      className="h-10 rounded-xl"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Offer form info */}
            {schoolFormId ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 font-medium shrink-0">Offer form:</span>
                <span className="text-xs font-mono text-slate-700 truncate">{schoolFormId}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  No offer letter form configured. Sending requires a form ID — set it in <strong>Employee Forms</strong> settings.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE MODE: Single step — all fields ── */}
        {!isEditing && (
          <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
            {schoolFormId ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs text-slate-500 font-medium">Offer form:</span>
                <span className="text-xs font-mono text-slate-700 truncate">{schoolFormId}</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  No offer letter form configured. You can save a draft, but sending requires a form ID — set it in <strong>Employee Forms</strong> settings.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">First Name <span className="text-red-500">*</span></label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First" className="h-10 rounded-xl" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Last Name <span className="text-red-500">*</span></label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last" className="h-10 rounded-xl" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="employee@example.com" className="h-10 rounded-xl" />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-10 rounded-xl" />
            </div>

            {hasCustomFields && (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase text-slate-500 mb-3">School-Specific Fields</p>
                <div className="space-y-3">
                  {offerLetterFields!.map(field => (
                    <div key={field.id}>
                      <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      <Input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        value={customFields[field.filloutParam] ?? ''}
                        onChange={e => setCustomFields(prev => ({ ...prev, [field.filloutParam]: e.target.value }))}
                        placeholder={field.type === 'number' ? '0.00' : field.label}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FOOTERS ── */}

        {/* Edit step 1 */}
        {isEditing && step === 1 && (
          <DialogFooter className="px-6 pb-5 pt-4 border-t border-slate-100 flex flex-row items-center justify-between gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!basicFieldsValid}
              className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white gap-2"
            >
              {hasCustomFields ? 'Next: Job Details' : 'Review & Send'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </DialogFooter>
        )}

        {/* Edit step 2 */}
        {isEditing && step === 2 && (
          <DialogFooter className="px-6 pb-5 pt-4 border-t border-slate-100 flex flex-row items-center justify-between gap-2 shrink-0">
            <Button variant="outline" onClick={() => setStep(1)} disabled={isSending} className="rounded-xl gap-1">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <AsyncButton
              onClick={handleSendOffer}
              disabled={!isFormValid || !schoolFormId || isSending}
              className={`rounded-xl text-white gap-2 ${isApprovedEdit ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0F2D52] hover:bg-[#1c477c]'}`}
            >
              <Send className="w-4 h-4" />
              {isApprovedEdit ? 'Confirm & Re-send for Signing' : 'Confirm & Re-send'}
            </AsyncButton>
          </DialogFooter>
        )}

        {/* Create mode */}
        {!isEditing && (
          <DialogFooter className="px-6 pb-5 pt-4 border-t border-slate-100 flex flex-row items-center justify-between gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingDraft || isSending} className="rounded-xl">
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveDraft} disabled={!basicFieldsValid || isSavingDraft || isSending} className="rounded-xl">
                {isSavingDraft ? 'Saving…' : 'Save Draft'}
              </Button>
              <AsyncButton
                onClick={handleSendOffer}
                disabled={!isFormValid || !schoolFormId || isSending || isSavingDraft}
                className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white gap-2"
              >
                <Send className="w-4 h-4" />
                Send Offer Letter
              </AsyncButton>
            </div>
          </DialogFooter>
        )}

      </DialogContent>
    </Dialog>
  );
}
