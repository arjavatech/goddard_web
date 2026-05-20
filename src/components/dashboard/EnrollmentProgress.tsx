import React, { useState } from 'react';
import { ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
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
  enrollmentId
}: EnrollmentProgressProps) {
  // Sort forms: Approved/Submitted first, then In Progress, then others
  const sortedForms = [...forms].sort((a, b) => {
    const statusOrder: Record<string, number> = {
      'Approved': 1,
      'Submitted': 2,
      'In Progress': 3,
      'Needs Revision': 4,
      'Draft': 5
    };
    return (statusOrder[a.status] || 6) - (statusOrder[b.status] || 6);
  });

  // Calculate completion
  const completedCount = forms.filter(form => COMPLETION_STATUSES.has(form.status)).length;
  const totalForms = forms.length;
  const progressPercentage = totalForms > 0 ? Math.round((completedCount / totalForms) * 100) : 0;

  // Find first incomplete form
  const incompleteForm = sortedForms.find(form => !COMPLETION_STATUSES.has(form.status));
  const currentStep = incompleteForm?.title || 'Enrollment complete';

  const continueStudentFormAssignmentId = (() => {
    const direct = incompleteForm?.studentFormAssignmentId;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    if (typeof incompleteForm?.filloutFormId === 'string') {
      const parts = incompleteForm.filloutFormId.split('?');
      if (parts.length > 1) {
        const params = new URLSearchParams(parts[1]);
        const fromUrl = params.get('student_form_assignment_id');
        if (fromUrl && fromUrl.trim()) return fromUrl.trim();
      }
    }
    return null;
  })();

  // State for showing all forms
  const [showAllForms, setShowAllForms] = useState(false);

  // Generate steps from forms (limit to 5 for display unless expanded)
  const displaySteps = sortedForms.slice(0, showAllForms ? sortedForms.length : 5).map(form => ({
    name: form.title,
    completed: COMPLETION_STATUSES.has(form.status)
  }));
  if (childStatus === 'archive') {
    return <div className="glass-card bg-gradient-to-br from-amber-50 to-amber-100 text-foreground rounded-lg p-4 sm:p-8 border-amber-200">
        <div className="flex items-center justify-center flex-col text-center">
          <AlertCircle className="h-12 w-12 sm:h-16 sm:w-16 text-amber-600 mb-3 sm:mb-4" />
          <h2 className="text-lg sm:text-2xl font-semibold mb-2 text-amber-900">
            The student is Archived
          </h2>
          <p className="text-sm sm:text-base text-amber-700">
            Enrollment forms are disabled for archived students.
          </p>
        </div>
      </div>;
  }

  return <div className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 text-foreground rounded-lg p-4 sm:p-6 lg:p-8 border-blue-200">
      <h2 className="text-base sm:text-lg lg:text-2xl font-semibold mb-2 sm:mb-3">
        Let's complete {childName}'s enrollment
      </h2>
      <p className="mb-4 sm:mb-5 lg:mb-6 text-xs sm:text-sm lg:text-base text-muted-foreground">
        You've completed {completedCount} of {totalForms} required forms.
        <span className="hidden sm:inline"> Continue where you left off.</span>
      </p>
      <div className="mb-3 sm:mb-4">
        <Progress value={progressPercentage} className="h-1.5 sm:h-2 bg-blue-100" />
      </div>
      {/* Mobile: Creative grid layout with overflow handling */}
      <div className="sm:hidden mb-4">
        {displaySteps.length <= 3 ? (
          // For 3 or fewer forms: vertical list
          <div className="space-y-2">
            {displaySteps.map((step, index) => <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-white/50">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                  {step.completed && <Check className="h-3 w-3" />}
                </div>
                <span className={`${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'} text-sm flex-1`}>
                  {step.name}
                </span>
              </div>)}
          </div>
        ) : (
          // For 4+ forms: compact grid with summary
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {displaySteps.slice(0, showAllForms ? displaySteps.length : 4).map((step, index) => <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-white/50">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${step.completed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {step.completed && <Check className="h-2.5 w-2.5" />}
                  </div>
                  <span className={`${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'} text-xs truncate`}>
                    {step.name}
                  </span>
                </div>)}
            </div>
            {!showAllForms && sortedForms.length > 4 && (
              <button 
                onClick={() => setShowAllForms(true)}
                className="w-full text-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-xs text-blue-700 font-medium">
                  +{sortedForms.length - 4} more forms
                </span>
              </button>
            )}
            {showAllForms && sortedForms.length > 4 && (
              <button 
                onClick={() => setShowAllForms(false)}
                className="w-full text-center p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-xs text-blue-700 font-medium">
                  Show less
                </span>
              </button>
            )}
          </div>
        )}
        <div className="text-center mt-3 p-2 bg-blue-100 rounded-lg">
          <span className="text-sm text-blue-700 font-semibold">
            {completedCount} of {totalForms} forms complete ({progressPercentage}%)
          </span>
        </div>
      </div>
      
      {/* Desktop: Horizontal layout */}
      <div className="hidden sm:flex justify-between text-xs mb-4 sm:mb-5 lg:mb-6 gap-1 sm:gap-2">
        {displaySteps.map((step, index) => <div key={index} className="flex flex-col items-center flex-1 min-w-0">
            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full mb-1 flex items-center justify-center ${step.completed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step.completed && <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
            </div>
            <span className={`${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'} text-center text-xs leading-tight`}>
              {step.name}
            </span>
            {index === displaySteps.length - 1 && <span className="text-xs mt-1 text-blue-600 font-medium">
                {progressPercentage}% Complete
              </span>}
          </div>)}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3"
          disabled={progressPercentage === 100 || !continueStudentFormAssignmentId}
          onClick={() => {
            console.log('Continue button clicked, incomplete form:', incompleteForm);
            console.log('childId prop:', childId);
            if (!continueStudentFormAssignmentId) {
              console.error('[Fillout] BLOCKED continue: Missing student_form_assignment_id', { incompleteForm });
              return;
            }
            if (incompleteForm && onContinue) {
              console.log('Resolved student_form_assignment_id:', continueStudentFormAssignmentId);
              const actualChildId = childId || incompleteForm.childId || 'continue-form';
              const invalidFormIds = ['wed', 'sdexewsa', 'sdceswd'];
              const isValidFormId = incompleteForm.filloutFormId &&
                !invalidFormIds.includes(incompleteForm.filloutFormId.toLowerCase());
              const formWithChildData = {
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
                  student_form_assignment_id: continueStudentFormAssignmentId
                }
              };
              console.log('Calling onContinue with:', formWithChildData);
              onContinue(formWithChildData);
            }
          }}
        >
          <span className="sm:hidden">
            {progressPercentage === 100 ? 'Complete' : 'Continue'}
          </span>
          <span className="hidden sm:inline">
            {progressPercentage === 100 ? 'Enrollment Complete' : `Continue ${currentStep}`}
          </span>
          {progressPercentage < 100 && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>;
}
