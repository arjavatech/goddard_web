import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { AsyncButton } from '../ui/async-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface AddFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  formName: string;
  setFormName: (value: string) => void;
  formLink: string;
  setFormLink: (value: string) => void;
  formDueDate: string;
  setFormDueDate: (value: string) => void;
  formStatus?: 'active' | 'inactive' | 'draft' | 'archived' | 'school_default' | 'available';
  setFormStatus?: (value: 'active' | 'inactive' | 'draft' | 'archived' | 'school_default' | 'available') => void;
  formErrors: { [key: string]: string };
  setFormErrors: (errors: { [key: string]: string } | ((prev: { [key: string]: string }) => { [key: string]: string })) => void;
  isSubmitting: boolean;
  title?: string;
  submitButtonText?: string;
}

export function AddFormModal({
  isOpen,
  onClose,
  onSubmit,
  formName,
  setFormName,
  formLink,
  setFormLink,
  formDueDate,
  setFormDueDate,
  formStatus,
  setFormStatus,
  formErrors,
  setFormErrors,
  isSubmitting,
  title = "Add New Form",
  submitButtonText = "Add Form"
}: AddFormModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg" preventClose>
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
        </DialogHeader>
        <div className="py-3 sm:py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Form Name</label>
            <Input
              value={formName}
              onChange={e => {
                setFormName(e.target.value);
                if (formErrors.formName) {
                  setFormErrors(prev => ({...prev, formName: ''}));
                }
              }}
              placeholder="Enter form name"
              className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${formErrors.formName ? 'border-red-500' : ''}`}
              autoFocus
            />
            {formErrors.formName && (
              <p className="text-xs text-red-600 mt-1">{formErrors.formName}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Form Link (Fillout Form ID or URL)</label>
            <Input
              value={formLink}
              onChange={e => {
                setFormLink(e.target.value);
                if (formErrors.formLink) {
                  setFormErrors(prev => ({...prev, formLink: ''}));
                }
              }}
              placeholder="parent_handbook or https://goddard.fillout.com/parent_handbook"
              className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${formErrors.formLink ? 'border-red-500' : ''}`}
            />
            {formErrors.formLink && (
              <p className="text-xs text-red-600 mt-1">{formErrors.formLink}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Form Status</label>
            <Select value={formStatus} onValueChange={(value) => setFormStatus?.(value as 'active' | 'inactive' | 'school_default')}>
              <SelectTrigger className="w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="school_default">Default</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Due Date</label>
            <Input
              type="date"
              value={formDueDate}
              onChange={e => {
                setFormDueDate(e.target.value);
                if (formErrors.formDueDate) {
                  setFormErrors(prev => ({...prev, formDueDate: ''}));
                }
              }}
              className={`w-full h-10 sm:h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${formErrors.formDueDate ? 'border-red-500' : ''}`}
              min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            />
            {formErrors.formDueDate && (
              <p className="text-xs text-red-600 mt-1">{formErrors.formDueDate}</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-white text-[#0F2D52] border border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200"
          >
            Cancel
          </Button>
          <AsyncButton
            onClick={onSubmit}
            className="w-full sm:w-auto h-9 sm:h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#163e6b] text-white transition-all duration-200"
            disabled={!formName.trim() || !formLink.trim() || !formDueDate || (formStatus === undefined ? false : !formStatus) || isSubmitting || !!formErrors.formName || !!formErrors.formLink || !!formErrors.formDueDate}
          >
            {isSubmitting ? `${submitButtonText.includes('Add') ? 'Adding' : 'Updating'} Form...` : submitButtonText}
          </AsyncButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
