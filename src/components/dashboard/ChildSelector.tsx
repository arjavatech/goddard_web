import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Users } from 'lucide-react';
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
}

interface ChildSelectorProps {
  children: Child[];
  selectedChildId: string;
  onSelectChild: (childId: string) => void;
}

export function ChildSelector({ children, selectedChildId, onSelectChild }: ChildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sortedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (sortedChildren.length === 0) {
    return (
      <div className="mb-2">
        <h1 className="text-base sm:text-2xl font-bold text-slate-900">Parent Dashboard</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">No enrolled children found for this account.</p>
      </div>
    );
  }

  const selectedChild = sortedChildren.find(c => c.id === selectedChildId) || sortedChildren[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#EFF5FB] flex items-center justify-center">
          <Users className="w-4 h-4 text-[#0F2D52]" />
        </div>
        <h1 className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight">Parent Dashboard</h1>
      </div>

      {/* Child picker — only shown when there are multiple children */}
      {sortedChildren.length > 1 && (
        <div className="relative w-full sm:w-auto" ref={ref}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full sm:w-auto flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-slate-200 shadow-xs hover:border-[#1a6fc4]/50 hover:shadow-sm transition-all duration-150 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a6fc4]/20"
          >
            {/* Avatar */}
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
              {selectedChild.initials}
            </div>
            <span className="font-semibold text-slate-800">{selectedChild.name}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-150', isOpen && 'rotate-180')} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-2 z-30 w-full sm:w-64 bg-white rounded-xl border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-1 max-h-72 overflow-auto">
                {sortedChildren.map(child => (
                  <button
                    key={child.id}
                    onClick={() => { onSelectChild(child.id); setIsOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                      child.id === selectedChildId
                        ? 'bg-[#EFF5FB] text-[#0F2D52]'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {child.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs sm:text-sm truncate">{child.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {child.formsCompleted}/{child.totalForms} forms · {child.enrollmentProgress}%
                      </p>
                    </div>
                    {child.id === selectedChildId && (
                      <Check className="w-4 h-4 text-[#0F2D52] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single child — just show name as a pill */}
      {sortedChildren.length === 1 && (
        <div className="flex items-center gap-2 bg-[#EFF5FB] rounded-xl px-3 py-2 border border-[#0F2D52]/10">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white flex items-center justify-center font-bold text-[10px]">
            {selectedChild.initials}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#0F2D52]">{selectedChild.name}</span>
        </div>
      )}
    </div>
  );
}
