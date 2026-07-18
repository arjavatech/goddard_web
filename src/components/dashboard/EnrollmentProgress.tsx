import React, { useState } from 'react';
import { ChevronRight, Check, AlertCircle, Clock, FileCheck2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
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

function StatusDot({ status }: { status: NormalizedFormStatus }) {
  if (COMPLETION_STATUSES.has(status)) {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
        <Check className="w-3 h-3 text-white stroke-[2.5]" />
      </span>
    );
  }
  if (status === 'Needs Revision') {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
        <AlertCircle className="w-3 h-3 text-white stroke-[2.5]" />
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center shadow-sm">
        <Clock className="w-3 h-3 text-white stroke-[2.5]" />
      </span>
    );
  }
  // Pending / Draft
  return (
    <span className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-slate-300 bg-white flex items-center justify-center">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
    </span>
  );
}

export function EnrollmentProgress({
  childName,
  forms,
  onContinue,
  childStatus = 'active',
  childId,
  enrollmentId,
}: EnrollmentProgressProps) {
  const [showAll, setShowAll] = useState(false);

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

  // Sort forms: completed first
  const sorted = [...forms].sort((a, b) => {
    const order: Record<string, number> = { Approved: 1, Submitted: 2, 'In Progress': 3, 'Needs Revision': 4, Draft: 5 };
    return (order[a.status] || 6) - (order[b.status] || 6);
  });

  const completedCount = forms.filter(f => COMPLETION_STATUSES.has(f.status)).length;
  const totalForms = forms.length;
  const progress = totalForms > 0 ? Math.round((completedCount / totalForms) * 100) : 0;
  const isComplete = progress === 100;

  const incompleteForm = sorted.find(f => !COMPLETION_STATUSES.has(f.status));

  const continueAssignmentId = (() => {
    const direct = incompleteForm?.studentFormAssignmentId;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    if (typeof incompleteForm?.filloutFormId === 'string') {
      const parts = incompleteForm.filloutFormId.split('?');
      if (parts.length > 1) {
        const p = new URLSearchParams(parts[1]);
        const v = p.get('student_form_assignment_id');
        if (v?.trim()) return v.trim();
      }
    }
    return null;
  })();

  const visibleForms = sorted.slice(0, showAll ? sorted.length : Math.min(4, sorted.length));
  const hasMore = sorted.length > 4;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* Header gradient strip */}
      <div className="bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4] px-5 sm:px-6 pt-5 pb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCheck2 className="w-4 h-4 text-slate-300" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">
                Enrollment Progress
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {isComplete
                ? `${childName}'s enrollment is complete `
                : `Complete ${childName}'s enrollment`}
            </h2>
            <p className="text-sm text-slate-300/80 mt-1">
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
          <div className="flex justify-between text-xs text-slate-300/80">
            <span>{completedCount} done</span>
            <span>{totalForms - completedCount} remaining</span>
          </div>
        </div>
      </div>

      {/* Form steps */}
      <div className="px-5 sm:px-6 py-4 space-y-1.5">
        {visibleForms.map((form, i) => {
          const done = COMPLETION_STATUSES.has(form.status);
          return (
            <div
              key={form.formId || i}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors',
                done ? 'bg-emerald-50/60' : 'bg-slate-50/60'
              )}
            >
              <StatusDot status={form.status} />
              <span className={cn(
                'text-sm flex-1 min-w-0 truncate',
                done ? 'text-emerald-700 font-medium' : 'text-slate-600'
              )}>
                {form.title}
              </span>
              {!done && form.status === 'Needs Revision' && (
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                  Revision
                </span>
              )}
              {!done && form.status === 'In Progress' && (
                <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
                  In Progress
                </span>
              )}
            </div>
          );
        })}

        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 w-full justify-center py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            {showAll ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show fewer forms</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> +{sorted.length - 4} more forms</>
            )}
          </button>
        )}
      </div>

      {/* CTA */}
      {!isComplete && (
        <div className="px-5 sm:px-6 pb-5">
          <Button
            className={cn(
              'w-full sm:w-auto h-11 px-6 rounded-xl text-sm font-semibold bg-white text-[#0F2D52] border-2 border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-all duration-200 shadow-sm flex items-center justify-center',
              !continueAssignmentId && 'opacity-60 cursor-not-allowed bg-white text-[#0F2D52]/40 border-2 border-[#0F2D52]/20'
            )}
            disabled={!continueAssignmentId}
            onClick={() => {
              if (!continueAssignmentId || !incompleteForm || !onContinue) return;
              const actualChildId = childId || incompleteForm.childId || 'continue-form';
              const invalidIds = ['wed', 'sdexewsa', 'sdceswd'];
              const isValidFormId = incompleteForm.filloutFormId &&
                !invalidIds.includes(incompleteForm.filloutFormId.toLowerCase());
              onContinue({
                ...incompleteForm,
                childId: actualChildId,
                childName,
                _key: `child-${actualChildId}-form-${incompleteForm.formId}`,
                fromContinueButton: true,
                rawData: {
                  form_id: incompleteForm.formId,
                  fillout_form_id: isValidFormId ? incompleteForm.filloutFormId : null,
                  recent_edit_link: incompleteForm.recentEditLink,
                  recent_pdf_link: incompleteForm.recentPdfLink,
                  student_form_assignment_id: continueAssignmentId,
                },
              });
            }}
          >
            Continue — {incompleteForm?.title}
            <ChevronRight className="ml-1.5 w-4 h-4" />
          </Button>
        </div>
      )}

      {isComplete && (
        <div className="px-5 sm:px-6 pb-5">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">All forms submitted — enrollment complete!</p>
          </div>
        </div>
      )}
    </div>
  );
}
