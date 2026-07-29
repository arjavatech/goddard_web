import React from 'react';
import { AlertCircle, FileCheck2 } from 'lucide-react';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import { COMPLETION_STATUSES, type NormalizedFormStatus } from '../../lib/formStatus';

interface FormItem {
  title: string;
  status: NormalizedFormStatus;
  formId?: string;
  [key: string]: any;
}

interface EnrollmentProgressProps {
  childName: string;
  forms: FormItem[];
  onContinue?: (form: any) => void;
  childStatus?: 'active' | 'archive';
  childId?: string;
  enrollmentId?: string;
}

export function EnrollmentProgress({
  childName,
  forms,
  onContinue,
  childStatus = 'active',
  childId,
  enrollmentId,
}: EnrollmentProgressProps) {
  // Archived child
  if (childStatus === 'archive') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-amber-900">Student is Archived</p>
          <p className="text-sm text-amber-700 mt-1">
            Enrollment forms are disabled for archived students. Contact your school administrator to re-enroll.
          </p>
        </div>
      </div>
    );
  }

  const completedCount = forms.filter(f => COMPLETION_STATUSES.has(f.status)).length;
  const totalForms = forms.length;
  const progress = totalForms > 0 ? Math.round((completedCount / totalForms) * 100) : 0;
  const isComplete = progress === 100;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md hover:-translate-y-[2px] transition-all duration-300 relative overflow-hidden">
      {/* Header gradient strip */}
      <div className="bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4] px-4 sm:px-6 pt-4 sm:pt-5 pb-5 sm:pb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-4 h-4 text-slate-300" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-300">
                Enrollment Progress
              </span>
            </div>
            <h2 className="text-sm sm:text-xl font-bold text-white leading-snug">
              {isComplete
                ? `${childName}'s enrollment is complete `
                : `Complete ${childName}'s enrollment`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300/80 mt-1">
              {completedCount} of {totalForms} forms completed
            </p>
          </div>
          {/* Progress ring — desktop */}
          <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-full bg-white/15 flex-shrink-0 border-2 border-white/20">
            <span className="text-xl font-extrabold text-white leading-none">{progress}</span>
            <span className="text-[10px] font-semibold text-slate-300 leading-tight">%</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] sm:text-xs text-slate-300/80">
            <span>{completedCount} done</span>
            <span>{totalForms - completedCount} remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}
