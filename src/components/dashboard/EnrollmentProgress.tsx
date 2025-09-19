import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
interface EnrollmentProgressProps {
  childName: string;
  completedSteps: number;
  totalSteps: number;
  currentStep: string;
}
export function EnrollmentProgress({
  childName,
  completedSteps,
  totalSteps,
  currentStep
}: EnrollmentProgressProps) {
  const steps = [{
    name: 'Start',
    completed: true
  }, {
    name: 'Personal',
    completed: true
  }, {
    name: 'Medical',
    completed: true
  }, {
    name: 'Agreements',
    completed: false
  }, {
    name: 'Complete',
    completed: false
  }];
  const progressPercentage = totalSteps > 0 ? Math.round(completedSteps / totalSteps * 100) : 0;
  return <div className="glass-card bg-gradient-to-br from-blue-50 to-blue-100 text-foreground rounded-lg p-8 border-blue-200">
      <h2 className="text-2xl font-semibold mb-2">
        Let's complete {childName}'s enrollment
      </h2>
      <p className="mb-6 text-muted-foreground">
        You've completed {completedSteps} of {totalSteps} required forms.
        Continue where you left off.
      </p>
      <div className="mb-2">
        <Progress value={progressPercentage} className="h-2 bg-blue-100" />
      </div>
      <div className="flex justify-between text-sm mb-6">
        {steps.map((step, index) => <div key={index} className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${step.completed ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {step.completed && <Check className="h-3 w-3" />}
            </div>
            <span className={step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}>
              {step.name}
            </span>
            {index === steps.length - 1 && <span className="text-xs mt-1 text-blue-600 font-medium">
                {progressPercentage}% Complete
              </span>}
          </div>)}
      </div>
      <Button className="bg-blue-600 text-white hover:bg-blue-700 font-medium transition-colors">
        Continue {currentStep} <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>;
}
