import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChildForm {
  status: string;
}

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
  forms?: ChildForm[];
}

interface ChildrenOverviewProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function ChildrenOverview({ children, selectedChildId, onSelectChild }: ChildrenOverviewProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [showAll, setShowAll] = useState(false);

  const sortedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name));
  const selectedIndex = sortedChildren.findIndex(c => c.id === selectedChildId);
  const visibleChildren = showAll
    ? sortedChildren
    : selectedIndex >= 2
      ? [sortedChildren[0], sortedChildren[selectedIndex]]
      : sortedChildren.slice(0, 2);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedChildId]);
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
    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden bg-white hover:border-[#1a6fc4]/20 hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 relative">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Users className="w-4 h-4 text-[#0F2D52]" />
          Children Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2 pr-1">
        {visibleChildren.map(child => {
          const isSelected = child.id === selectedChildId;
          const forms = child.forms ?? [];
          const total = forms.length;
          // Segment counts
          const approvedCount = forms.filter(f => f.status === 'Approved').length;
          const pendingCount  = forms.filter(f => f.status === 'Submitted' || f.status === 'In Progress').length;
          const draftCount    = total - approvedCount - pendingCount;
          // Segment widths as percentages of the full bar
          const approvedPct = total > 0 ? (approvedCount / total) * 100 : 0;
          const pendingPct  = total > 0 ? (pendingCount  / total) * 100 : 0;
          const draftPct    = total > 0 ? (draftCount    / total) * 100 : 0;
          const progressColor = approvedCount === total && total > 0 ? 'text-emerald-600' : 'text-[#1a6fc4]';

          return (
            <button
              key={child.id}
              ref={isSelected ? activeRef : null}
              onClick={() => onSelectChild(child.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all duration-150',
                isSelected
                  ? 'border-[#0F2D52]/20 bg-[#EFF5FB]/50 shadow-[0_0_0_1px_rgba(15,45,82,0.15)]'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 shadow-sm',
                  isSelected
                    ? 'bg-gradient-to-br from-[#0F2D52] to-[#1E4B83]'
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
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                    {approvedPct > 0 && (
                      <div className="h-full transition-all duration-500 ease-out" style={{ width: `${approvedPct}%`, background: '#10b981' }} />
                    )}
                    {pendingPct > 0 && (
                      <div className="h-full transition-all duration-500 ease-out" style={{ width: `${pendingPct}%`, background: '#f59e0b' }} />
                    )}
                    {draftPct > 0 && (
                      <div className="h-full transition-all duration-500 ease-out" style={{ width: `${draftPct}%`, background: '#cbd5e1' }} />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {child.formsCompleted} of {child.totalForms} forms complete
                  </p>
                </div>
              </div>
            </button>
          );
        })}
        {sortedChildren.length > 2 && (
          <button
            onClick={() => setShowAll(prev => !prev)}
            className="w-full text-center text-xs font-medium text-[#0F2D52] hover:text-[#0F2D52] py-1.5 transition-colors"
          >
            {showAll ? 'View Less' : `View More (${sortedChildren.length - 2} more)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
