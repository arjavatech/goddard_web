import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Card } from '../ui/card';
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
export function ChildSelector({
  children,
  selectedChildId,
  onSelectChild
}: ChildSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (children.length === 0) {
    return <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Parent Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">
          No enrolled children were found for this account.
        </p>
      </div>;
  }
  const selectedChild = children.find(child => child.id === selectedChildId) || children[0];
  return <div className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Parent Dashboard</h1>
        <div className="relative">
          <div className="flex items-center bg-white/80 rounded-full px-3 py-1 border border-gray-200 shadow-sm cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-xs">
                {selectedChild.initials}
              </div>
              <span className="text-sm font-medium">{selectedChild.name}</span>
            </div>
            <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
          </div>
          {isOpen && <Card className="glass-card absolute top-full right-0 mt-2 z-10 w-full min-w-[200px] max-w-[280px] py-2 shadow-lg">
              <div className="max-h-80 overflow-auto">
                {children.map(child => <div key={child.id} className={cn('flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-gray-50', child.id === selectedChildId && 'bg-gray-50')} onClick={() => {
              onSelectChild(child.id);
              setIsOpen(false);
            }}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm">
                      {child.initials}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {child.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Age: {(() => {
                          if (!child.dob || child.dob === '—') return '—';
                          const birthDate = new Date(child.dob);
                          if (isNaN(birthDate.getTime())) return '—';
                          const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                          return age >= 0 ? age : '—';
                        })()} • DOB: {child.dob}
                      </p>
                    </div>
                    {child.id === selectedChildId && <Check className="w-4 h-4 text-amazon-teal" />}
                  </div>)}
              </div>
            </Card>}
        </div>
      </div>
    </div>;
}