import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 25, 50, 100],
  className = '',
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Records per page:</span>
      <Select
        value={pageSize.toString()}
        onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
      >
        <SelectTrigger className="h-8 w-16 text-xs font-bold rounded-lg border-slate-200 bg-white">
          <SelectValue placeholder={pageSize.toString()} />
        </SelectTrigger>
        <SelectContent className="bg-white rounded-xl border border-slate-100 shadow-xl min-w-[4rem]">
          {options.map((option) => (
            <SelectItem key={option} value={option.toString()} className="text-xs cursor-pointer">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
