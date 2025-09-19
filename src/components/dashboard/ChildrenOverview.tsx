import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
interface Child {
  id: string;
  name: string;
  initials: string;
  age: string;
  dob: string;
  enrollmentProgress: number;
  formsCompleted: number;
  totalForms: number;
}
interface ChildrenOverviewProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}
export function ChildrenOverview({
  children,
  selectedChildId,
  onSelectChild
}: ChildrenOverviewProps) {
  if (children.length === 0) {
    return <Card className="glass-card">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-foreground">
            Children Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            We could not load any children for this account.
          </p>
        </CardContent>
      </Card>;
  }
  return <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Children Overview
          </h2>
          <a href="#" className="text-amazon-teal text-sm font-medium hover:text-amazon-teal/80 transition-colors flex items-center">
            Add child <ChevronRight className="h-4 w-4 ml-1" />
          </a>
        </div>
        <div className="space-y-4">
          {children.map(child => <div key={child.id} className={`p-4 rounded-lg border transition-all cursor-pointer ${child.id === selectedChildId ? 'border-amazon-teal/50 bg-amazon-teal/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => onSelectChild(child.id)}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-lg">
                  {child.initials}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-medium text-foreground">
                      {child.name}
                    </h3>
                    <span className="text-sm text-amazon-teal font-medium">
                      {child.enrollmentProgress}% Complete
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Age: {child.age} • DOB: {child.dob}
                  </p>
                  <div className="mt-2">
                    <Progress value={child.enrollmentProgress} className="h-2" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {child.formsCompleted} of {child.totalForms} forms completed
                  </p>
                </div>
              </div>
            </div>)}
        </div>
      </CardContent>
    </Card>;
}
