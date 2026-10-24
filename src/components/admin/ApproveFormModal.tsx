import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

interface ApproveFormModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { formAcademicYear?: string; approvedFormName: string }) => void;
  isEmployee: boolean;
  formTemplateName: string;
  personName: string;
  isEditable: boolean;
  isSubmitting: boolean;
  initialFormName?: string;
  initialAcademicYear?: string;
  title?: string;
  confirmLabel?: string;
}

function getPresetAcademicYears(): string[] {
  const y = new Date().getFullYear();
  return [`${y - 3}-${y - 2}`, `${y - 2}-${y - 1}`, `${y - 1}-${y}`, `${y}-${y + 1}`];
}

const YEAR_RE = /^(\d{4})-(\d{4})$/;
function isValidCustomYear(val: string): boolean {
  const m = val.match(YEAR_RE);
  return !!m && parseInt(m[2]) === parseInt(m[1]) + 1;
}

function buildDefaultFormName(templateName: string, personName: string, academicYear?: string): string {
  const parts = [templateName, personName];
  if (academicYear) parts.push(academicYear);
  return parts
    .map(p => p.trim().replace(/\s+/g, '-'))
    .filter(Boolean)
    .join('-');
}

export function ApproveFormModal({
  open,
  onClose,
  onConfirm,
  isEmployee,
  formTemplateName,
  personName,
  isEditable,
  isSubmitting,
  initialFormName,
  initialAcademicYear,
  title,
  confirmLabel,
}: ApproveFormModalProps) {
  const presets = getPresetAcademicYears();
  const defaultYear = presets[3];

  const [academicYear, setAcademicYear] = useState(
    initialAcademicYear && presets.includes(initialAcademicYear) ? initialAcademicYear : defaultYear
  );
  const [isCustom, setIsCustom] = useState(
    !!initialAcademicYear && !presets.includes(initialAcademicYear)
  );
  const [customInput, setCustomInput] = useState(
    initialAcademicYear && !presets.includes(initialAcademicYear) ? initialAcademicYear : ''
  );
  const [formName, setFormName] = useState('');

  const effectiveYear = isCustom
    ? (isValidCustomYear(customInput) ? customInput : '')
    : academicYear;

  // Seed values when modal opens — prefer stored values over computed defaults
  useEffect(() => {
    if (open) {
      const inPresets = presets.includes(initialAcademicYear ?? '');
      const custom = !!initialAcademicYear && !inPresets;
      setIsCustom(custom);
      setCustomInput(custom ? (initialAcademicYear ?? '') : '');
      const year = inPresets ? (initialAcademicYear ?? defaultYear) : defaultYear;
      setAcademicYear(year);
      setFormName(initialFormName || buildDefaultFormName(formTemplateName, personName, isEmployee ? undefined : (initialAcademicYear ?? year)));
    }
  }, [open, formTemplateName, personName, isEmployee, initialFormName, initialAcademicYear]);

  const handleYearChange = (year: string) => {
    setAcademicYear(year);
    setFormName(prev => {
      const currentDefault = buildDefaultFormName(formTemplateName, personName, academicYear);
      if (prev === currentDefault) {
        return buildDefaultFormName(formTemplateName, personName, year);
      }
      return prev;
    });
  };

  const handleConfirm = () => {
    onConfirm({
      formAcademicYear: isEmployee ? undefined : effectiveYear || undefined,
      approvedFormName: formName.trim() || buildDefaultFormName(formTemplateName, personName, isEmployee ? undefined : effectiveYear),
    });
  };

  const isValid = isEmployee ? true : Boolean(effectiveYear);

  return (
    <Dialog open={open} onOpenChange={open => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {title ?? 'Confirm Approval'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEmployee && (
            <div className="space-y-1.5">
              <label htmlFor="academic-year" className="text-sm font-medium leading-none">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <Select
                value={isCustom ? 'custom' : academicYear}
                onValueChange={val => {
                  if (val === 'custom') {
                    setIsCustom(true);
                  } else {
                    setIsCustom(false);
                    handleYearChange(val);
                  }
                }}
              >
                <SelectTrigger id="academic-year" className="w-full">
                  <SelectValue placeholder="Select academic year" />
                </SelectTrigger>
                <SelectContent>
                  {presets.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                  <SelectItem value="custom">Custom…</SelectItem>
                </SelectContent>
              </Select>
              {isCustom && (
                <div>
                  <Input
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    placeholder="e.g. 2021-2022"
                    className="w-full h-10 rounded-xl mt-1.5"
                  />
                  {customInput && !isValidCustomYear(customInput) && (
                    <p className="text-xs text-red-500 mt-1">Enter as YYYY-YYYY with consecutive years.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="form-name" className="text-sm font-medium leading-none">
              Form Name
            </label>
            {isEditable ? (
              <Input
                id="form-name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Enter form name"
                className="w-full h-10 rounded-xl"
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {formName}
              </div>
            )}
            {isEditable && (
              <p className="text-xs text-slate-500">
                Used as the document file name when downloaded or scanned.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="bg-[#0F2D52] hover:bg-[#1E4B83] text-white disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Approving...
              </span>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                {confirmLabel ?? 'Confirm Approval'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
