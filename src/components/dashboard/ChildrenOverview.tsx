import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Child {
  id: string;
  name: string;
  initials: string;
  age: string;
  dob: string;
  enrollmentProgress: number;
  formsCompleted: number;
  totalForms: number;
  parentType?: string;
  classroom: string;
}

interface ChildrenOverviewProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function ChildrenOverview({ children, selectedChildId, onSelectChild }: ChildrenOverviewProps) {
  if (children.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out">
        <CardContent className="p-5">
          <p className="text-sm font-semibold text-slate-700 mb-1">Children Overview</p>
          <p className="text-sm text-slate-400">No children found for this account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Users className="w-4 h-4 text-cyan-600" />
          Children Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {children.map(child => {
          const isSelected = child.id === selectedChildId;
          const progressColor = child.enrollmentProgress === 100
            ? 'text-emerald-600'
            : child.enrollmentProgress >= 50
              ? 'text-cyan-600'
              : 'text-amber-600';

          return (
            <button
              key={child.id}
              onClick={() => onSelectChild(child.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all duration-150',
                isSelected
                  ? 'border-cyan-200 bg-cyan-50/70 shadow-[0_0_0_1px_rgba(8,145,178,0.15)]'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm',
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-500 to-cyan-700'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
                )}>
                  {child.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <p className="text-xs font-semibold text-slate-800 truncate">{child.name}</p>
                    <span className={cn('text-[11px] font-bold flex-shrink-0', progressColor)}>
                      {child.enrollmentProgress}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mb-1.5">
                    Age {child.age} · {child.classroom}
                  </p>
                  <Progress value={child.enrollmentProgress} className="h-1.5" />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {child.formsCompleted} of {child.totalForms} forms complete
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
