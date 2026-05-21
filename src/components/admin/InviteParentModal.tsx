import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AsyncButton } from '../ui/async-button';
import { ValidatedEmailInput } from '../ui/validated-email-input';
import { Mail } from 'lucide-react';

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
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto" preventClose>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Invite New Parent</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Primary Parent */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Primary Parent Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input
                  value={parentFirstName}
                  onChange={e => setParentFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input
                  value={parentLastName}
                  onChange={e => setParentLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedEmailInput
                value={parentEmail}
                onChange={setParentEmail}
                errors={inviteFormErrors}
                errorKey="parentEmail"
                setErrors={setInviteFormErrors}
                isDialogClosing={isDialogClosing}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={parentPhoneNumber}
                  onChange={e => setParentPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Secondary Parent */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Secondary Parent Information (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input
                  value={secondaryParentFirstName}
                  onChange={e => {
                    setSecondaryParentFirstName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                    if (inviteFormErrors.secondaryParentFirstName) setInviteFormErrors(prev => ({ ...prev, secondaryParentFirstName: '' }));
                  }}
                  placeholder="Enter first name"
                  className={inviteFormErrors.secondaryParentFirstName ? 'border-red-500' : ''}
                />
                {inviteFormErrors.secondaryParentFirstName && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.secondaryParentFirstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input
                  value={secondaryParentLastName}
                  onChange={e => {
                    setSecondaryParentLastName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                    if (inviteFormErrors.secondaryParentLastName) setInviteFormErrors(prev => ({ ...prev, secondaryParentLastName: '' }));
                  }}
                  placeholder="Enter last name"
                  className={inviteFormErrors.secondaryParentLastName ? 'border-red-500' : ''}
                />
                {inviteFormErrors.secondaryParentLastName && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.secondaryParentLastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedEmailInput
                value={secondaryParentEmail}
                onChange={setSecondaryParentEmail}
                errors={inviteFormErrors}
                errorKey="secondaryParentEmail"
                setErrors={setInviteFormErrors}
                isDialogClosing={isDialogClosing}
                required={false}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={secondaryParentPhoneNumber}
                  onChange={e => setSecondaryParentPhoneNumber(e.target.value.replace(/[^0-9+\-\s()]/g, ''))}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          </div>

          {/* Child Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Child Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
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
                {inviteFormErrors.childFirstName && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childFirstName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
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
                {inviteFormErrors.childLastName && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childLastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date of Birth</label>
                <Input
                  type="date"
                  value={childDob}
                  onChange={e => {
                    setChildDob(e.target.value);
                    if (inviteFormErrors.childDob) setInviteFormErrors(prev => ({ ...prev, childDob: '' }));
                  }}
                  onBlur={() => { if (!childDob) setInviteFormErrors(prev => ({ ...prev, childDob: 'Child date of birth is required' })); }}
                  className={inviteFormErrors.childDob ? 'border-red-500' : ''}
                  min="2000-01-01"
                  max="2020-12-31"
                />
                {inviteFormErrors.childDob && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childDob}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <Select value={childGender} onValueChange={v => { setChildGender(v); if (inviteFormErrors.childGender) setInviteFormErrors(prev => ({ ...prev, childGender: '' })); }}>
                  <SelectTrigger className={inviteFormErrors.childGender ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                {inviteFormErrors.childGender && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childGender}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Classroom</label>
                <Select value={childClassroom} onValueChange={v => { setChildClassroom(v); if (inviteFormErrors.childClassroom) setInviteFormErrors(prev => ({ ...prev, childClassroom: '' })); }}>
                  <SelectTrigger className={inviteFormErrors.childClassroom ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {inviteFormErrors.childClassroom && <p className="text-sm text-red-600 mt-1">{inviteFormErrors.childClassroom}</p>}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton
            onClick={onInvite}
            className="bg-amazon-teal hover:bg-amazon-teal/90"
            disabled={(() => {
              // Primary parent and child fields are always required
              const primaryParentValid = parentFirstName.trim() && parentLastName.trim() && parentEmail.trim();
              const childValid = childFirstName.trim() && childLastName.trim() && childDob && childGender && childClassroom;
              
              if (!primaryParentValid || !childValid) return true;
              
              // Check if any secondary parent field is filled
              const hasSecondaryParentData = 
                secondaryParentFirstName.trim() || 
                secondaryParentLastName.trim() || 
                secondaryParentEmail.trim() || 
                secondaryParentPhoneNumber.trim();
              
              // If any secondary parent field is filled, all required fields must be filled
              if (hasSecondaryParentData) {
                return !(
                  secondaryParentFirstName.trim() && 
                  secondaryParentLastName.trim() && 
                  secondaryParentEmail.trim()
                );
              }
              
              // If no secondary parent fields are filled, button is enabled
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
