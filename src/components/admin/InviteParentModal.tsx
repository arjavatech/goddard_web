import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AsyncButton } from '../ui/async-button';
import { ValidatedEmailInput } from '../ui/validated-email-input';
import { Mail, ChevronDown, ChevronUp, UserPlus } from 'lucide-react';

interface InviteParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: () => Promise<void>;
  parentFirstName: string;
  setParentFirstName: (value: string) => void;
  parentLastName: string;
  setParentLastName: (value: string) => void;
  parentEmail: string;
  setParentEmail: (value: string) => void;
  parentPhoneNumber: string;
  setParentPhoneNumber: (value: string) => void;
  secondaryParentFirstName: string;
  setSecondaryParentFirstName: (value: string) => void;
  secondaryParentLastName: string;
  setSecondaryParentLastName: (value: string) => void;
  secondaryParentEmail: string;
  setSecondaryParentEmail: (value: string) => void;
  secondaryParentPhoneNumber: string;
  setSecondaryParentPhoneNumber: (value: string) => void;
  childFirstName: string;
  setChildFirstName: (value: string) => void;
  childLastName: string;
  setChildLastName: (value: string) => void;
  childDob: string;
  setChildDob: (value: string) => void;
  childGender: string;
  setChildGender: (value: string) => void;
  childClassroom: string;
  setChildClassroom: (value: string) => void;
  classrooms: { id: string; name: string }[];
  inviteFormErrors: { [key: string]: string };
  setInviteFormErrors: (errors: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
  isDialogClosing: boolean;
}

export function InviteParentModal({
  isOpen,
  onClose,
  onInvite,
  parentFirstName,
  setParentFirstName,
  parentLastName,
  setParentLastName,
  parentEmail,
  setParentEmail,
  parentPhoneNumber,
  setParentPhoneNumber,
  secondaryParentFirstName,
  setSecondaryParentFirstName,
  secondaryParentLastName,
  setSecondaryParentLastName,
  secondaryParentEmail,
  setSecondaryParentEmail,
  secondaryParentPhoneNumber,
  setSecondaryParentPhoneNumber,
  childFirstName,
  setChildFirstName,
  childLastName,
  setChildLastName,
  childDob,
  setChildDob,
  childGender,
  setChildGender,
  childClassroom,
  setChildClassroom,
  classrooms,
  inviteFormErrors,
  setInviteFormErrors,
  isDialogClosing
}: InviteParentModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg" preventClose>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">Invite New Parent</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-3">
          {/* Primary Parent */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Primary Parent Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">First Name</label>
                <Input
                  value={parentFirstName}
                  onChange={e => setParentFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                <Input
                  value={parentLastName}
                  onChange={e => setParentLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ValidatedEmailInput
                value={parentEmail}
                onChange={setParentEmail}
                errors={inviteFormErrors}
                errorKey="parentEmail"
                setErrors={setInviteFormErrors}
                isDialogClosing={isDialogClosing}
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={parentPhoneNumber}
                  onChange={e => setParentPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Secondary Parent — collapsible */}
          <SecondaryParentSection
            secondaryParentFirstName={secondaryParentFirstName}
            setSecondaryParentFirstName={setSecondaryParentFirstName}
            secondaryParentLastName={secondaryParentLastName}
            setSecondaryParentLastName={setSecondaryParentLastName}
            secondaryParentEmail={secondaryParentEmail}
            setSecondaryParentEmail={setSecondaryParentEmail}
            secondaryParentPhoneNumber={secondaryParentPhoneNumber}
            setSecondaryParentPhoneNumber={setSecondaryParentPhoneNumber}
            inviteFormErrors={inviteFormErrors}
            setInviteFormErrors={setInviteFormErrors}
            isDialogClosing={isDialogClosing}
          />

          {/* Child Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">Child Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">First Name</label>
                <Input
                  value={childFirstName}
                  onChange={e => {
                    setChildFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                    if (inviteFormErrors.childFirstName) setInviteFormErrors(prev => ({ ...prev, childFirstName: '' }));
                  }}
                  onBlur={() => { if (!childFirstName.trim()) setInviteFormErrors(prev => ({ ...prev, childFirstName: 'Child first name is required' })); }}
                  placeholder="Enter first name"
                  className={inviteFormErrors.childFirstName ? 'border-red-500' : ''}
                />
                {inviteFormErrors.childFirstName && <p className="text-xs text-red-600 mt-1">{inviteFormErrors.childFirstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Last Name</label>
                <Input
                  value={childLastName}
                  onChange={e => {
                    setChildLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                    if (inviteFormErrors.childLastName) setInviteFormErrors(prev => ({ ...prev, childLastName: '' }));
                  }}
                  onBlur={() => { if (!childLastName.trim()) setInviteFormErrors(prev => ({ ...prev, childLastName: 'Child last name is required' })); }}
                  placeholder="Enter last name"
                  className={inviteFormErrors.childLastName ? 'border-red-500' : ''}
                />
                {inviteFormErrors.childLastName && <p className="text-xs text-red-600 mt-1">{inviteFormErrors.childLastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Date of Birth <span className="font-normal text-muted-foreground">(Optional)</span></label>
                <Input
                  type="date"
                  value={childDob}
                  onChange={e => {
                    setChildDob(e.target.value);
                    if (inviteFormErrors.childDob) setInviteFormErrors(prev => ({ ...prev, childDob: '' }));
                  }}
                  className={inviteFormErrors.childDob ? 'border-red-500' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Gender</label>
                <Select value={childGender} onValueChange={v => { setChildGender(v); if (inviteFormErrors.childGender) setInviteFormErrors(prev => ({ ...prev, childGender: '' })); }}>
                  <SelectTrigger className={inviteFormErrors.childGender ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {inviteFormErrors.childGender && <p className="text-xs text-red-600 mt-1">{inviteFormErrors.childGender}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Classroom</label>
                <Select value={childClassroom} onValueChange={v => { setChildClassroom(v); if (inviteFormErrors.childClassroom) setInviteFormErrors(prev => ({ ...prev, childClassroom: '' })); }}>
                  <SelectTrigger className={inviteFormErrors.childClassroom ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {inviteFormErrors.childClassroom && <p className="text-xs text-red-600 mt-1">{inviteFormErrors.childClassroom}</p>}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
          >
            Cancel
          </Button>
          <AsyncButton
            onClick={onInvite}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200"
            disabled={(() => {
              const primaryParentValid = parentFirstName.trim() && parentLastName.trim() && parentEmail.trim();
              const childValid = childFirstName.trim() && childLastName.trim() && childGender && childClassroom;
              if (!primaryParentValid || !childValid) return true;
              const hasSecondaryParentData =
                secondaryParentFirstName.trim() ||
                secondaryParentLastName.trim() ||
                secondaryParentEmail.trim() ||
                secondaryParentPhoneNumber.trim();
              if (hasSecondaryParentData) {
                return !(secondaryParentFirstName.trim() && secondaryParentLastName.trim() && secondaryParentEmail.trim());
              }
              return false;
            })()}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Invitation
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SecondaryParentSectionProps {
  secondaryParentFirstName: string;
  setSecondaryParentFirstName: (v: string) => void;
  secondaryParentLastName: string;
  setSecondaryParentLastName: (v: string) => void;
  secondaryParentEmail: string;
  setSecondaryParentEmail: (v: string) => void;
  secondaryParentPhoneNumber: string;
  setSecondaryParentPhoneNumber: (v: string) => void;
  inviteFormErrors: { [key: string]: string };
  setInviteFormErrors: (errors: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
  isDialogClosing: boolean;
}

function SecondaryParentSection({
  secondaryParentFirstName, setSecondaryParentFirstName,
  secondaryParentLastName, setSecondaryParentLastName,
  secondaryParentEmail, setSecondaryParentEmail,
  secondaryParentPhoneNumber, setSecondaryParentPhoneNumber,
  inviteFormErrors, setInviteFormErrors, isDialogClosing,
}: SecondaryParentSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    if (isOpen) {
      // Collapse — clear all secondary fields and errors
      setSecondaryParentFirstName('');
      setSecondaryParentLastName('');
      setSecondaryParentEmail('');
      setSecondaryParentPhoneNumber('');
      setInviteFormErrors(prev => ({
        ...prev,
        secondaryParentFirstName: '',
        secondaryParentLastName: '',
        secondaryParentEmail: '',
      }));
    }
    setIsOpen(prev => !prev);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Secondary Parent
          </span>
          <span className="text-xs text-slate-400 font-normal">(Optional)</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">First Name</label>
              <Input
                value={secondaryParentFirstName}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setSecondaryParentFirstName(val);
                  if (inviteFormErrors.secondaryParentFirstName)
                    setInviteFormErrors(prev => ({ ...prev, secondaryParentFirstName: '' }));
                  if (!val.trim() && !secondaryParentLastName.trim() && !secondaryParentPhoneNumber.trim())
                    setInviteFormErrors(prev => ({ ...prev, secondaryParentEmail: '' }));
                }}
                placeholder="Enter first name"
                className={inviteFormErrors.secondaryParentFirstName ? 'border-red-500' : ''}
              />
              {inviteFormErrors.secondaryParentFirstName && (
                <p className="text-xs text-red-600 mt-1">{inviteFormErrors.secondaryParentFirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Last Name</label>
              <Input
                value={secondaryParentLastName}
                onChange={e => {
                  const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                  setSecondaryParentLastName(val);
                  if (inviteFormErrors.secondaryParentLastName)
                    setInviteFormErrors(prev => ({ ...prev, secondaryParentLastName: '' }));
                  if (!val.trim() && !secondaryParentFirstName.trim() && !secondaryParentPhoneNumber.trim())
                    setInviteFormErrors(prev => ({ ...prev, secondaryParentEmail: '' }));
                }}
                placeholder="Enter last name"
                className={inviteFormErrors.secondaryParentLastName ? 'border-red-500' : ''}
              />
              {inviteFormErrors.secondaryParentLastName && (
                <p className="text-xs text-red-600 mt-1">{inviteFormErrors.secondaryParentLastName}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ValidatedEmailInput
              value={secondaryParentEmail}
              onChange={setSecondaryParentEmail}
              errors={inviteFormErrors}
              errorKey="secondaryParentEmail"
              setErrors={setInviteFormErrors}
              isDialogClosing={isDialogClosing}
              required={false}
              skipRequiredCheck={() =>
                !(secondaryParentFirstName.trim() || secondaryParentLastName.trim() || secondaryParentPhoneNumber.trim())
              }
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number (Optional)</label>
              <Input
                type="tel"
                value={secondaryParentPhoneNumber}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                  setSecondaryParentPhoneNumber(val);
                  if (!val.trim() && !secondaryParentFirstName.trim() && !secondaryParentLastName.trim())
                    setInviteFormErrors(prev => ({ ...prev, secondaryParentEmail: '' }));
                }}
                placeholder="Enter phone number"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
