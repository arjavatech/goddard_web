import React from 'react';
import { ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { COMPLETION_STATUSES, type NormalizedFormStatus } from '../../lib/formStatus';

interface FormItem {
  title: string;
  status: NormalizedFormStatus;
}

interface EnrollmentProgressProps {
  childName: string;
  forms: FormItem[];
  onContinue?: (form: any) => void;
  childStatus?: 'active' | 'archive';
}

export function EnrollmentProgress({
  childName,
  forms,
  onContinue,
  childStatus = 'active'
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

  // Generate steps from forms (limit to 5 for display)
  const displaySteps = sortedForms.slice(0, 5).map(form => ({
    name: form.title.length > 15 ? form.title.substring(0, 12) + '...' : form.title,
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

  return <div className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 text-foreground rounded-lg p-4 sm:p-8 border-blue-200">
      <h2 className="text-lg sm:text-2xl font-semibold mb-2">
        Let's complete {childName}'s enrollment
      </h2>
      <p className="mb-4 sm:mb-6 text-sm sm:text-base text-muted-foreground">
        You've completed {completedCount} of {totalForms} required forms.
        Continue where you left off.
      </p>
      <div className="mb-2">
        <Progress value={progressPercentage} className="h-2 bg-blue-100" />
      </div>
      <div className="flex justify-between text-xs sm:text-sm mb-4 sm:mb-6">
        {displaySteps.map((step, index) => <div key={index} className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${step.completed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step.completed && <Check className="h-3 w-3" />}
            </div>
            <span className={`${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'} text-center text-xs sm:text-sm`}>
              {step.name}
            </span>
            {index === displaySteps.length - 1 && <span className="text-xs mt-1 text-blue-600 font-medium">
                {progressPercentage}% Complete
              </span>}
          </div>)}
      </div>
      <Button
        className="bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors text-sm sm:text-base"
        disabled={progressPercentage === 100}
        onClick={() => {
          if (incompleteForm && onContinue) {
            onContinue(incompleteForm);
          }
        }}
      >
        {progressPercentage === 100 ? 'Enrollment Complete' : `Continue ${currentStep}`}
        {progressPercentage < 100 && <ChevronRight className="ml-1 h-4 w-4" />}
      </Button>
    </div>;
}