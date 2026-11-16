import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { AsyncButton } from '../ui/async-button';
import { Input } from '../ui/input';
import { useToast } from '../../contexts/ToastContext';
import { OfferLetterService, type OfferLetter, type OfferLetterField } from '../../services/api/offerLetter';
import { FileEdit, Send, AlertTriangle } from 'lucide-react';

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

  const isEditing = !!existingOffer;

  useEffect(() => {
    if (!open) return;
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

  const requiredCustomFieldsFilled = (offerLetterFields ?? [])
    .filter(f => f.required)
    .every(f => !!customFields[f.filloutParam]?.trim());

  const isFormValid = firstName.trim() && lastName.trim() && email.trim() && requiredCustomFieldsFilled;

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
    if (!isFormValid) return;
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
      const sent = await OfferLetterService.sendOfferLetter(draft.employeeId, schoolId);
      showToast('success', `Offer letter sent to ${sent.email}`);
      onSaved?.(sent);
      onOpenChange(false);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to send offer letter');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-0">
        <div className="bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] px-6 py-4 rounded-t-2xl flex items-center gap-3">
          <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
            <FileEdit className="w-4 h-4 text-white" />
          </div>
          <DialogHeader className="p-0">
            <DialogTitle className="text-base font-bold text-white">
              {isEditing ? 'Edit Offer Letter' : 'Create Offer Letter'}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Offer form info */}
          {schoolFormId ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Offer form:</span>
              <span className="text-xs font-mono text-slate-700">{schoolFormId}</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                No offer letter form configured. You can save a draft, but sending requires a form ID — set it in <strong>Employee Forms</strong> settings.
              </p>
            </div>
          )}

          {/* Name row */}
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

          {offerLetterFields && offerLetterFields.length > 0 && (
            <>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold uppercase text-slate-500 mb-3">School-Specific Fields</p>
                <div className="space-y-3">
                  {offerLetterFields.map(field => (
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
            </>
          )}
        </div>

        <DialogFooter className="px-6 pb-5 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingDraft || isSending} className="rounded-xl">
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={!isFormValid || isSavingDraft || isSending} className="rounded-xl">
            {isSavingDraft ? 'Saving…' : (isEditing ? 'Save Changes' : 'Save Draft')}
          </Button>
          <AsyncButton
            onClick={handleSendOffer}
            disabled={!isFormValid || !schoolFormId || isSending || isSavingDraft}
            className="rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white gap-2"
          >
            <Send className="w-4 h-4" /> {isEditing ? 'Save & Resend Email' : 'Send Offer Letter'}
          </AsyncButton>
          {isEditing && (
            <p className="w-full text-center text-xs text-slate-500 mt-1">
              "Save Changes" updates fields only. "Save &amp; Resend Email" also sends a new email to the employee.
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
