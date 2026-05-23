import { ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export interface SortOption {
  label: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface SortDropdownProps {
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  options: SortOption[];
  labels: Record<string, string>;
  onSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  className?: string;
}

export function SortDropdown({ currentSortBy, currentSortOrder, options, labels, onSort, className }: SortDropdownProps) {
  const label = labels[currentSortBy] ?? 'Sort';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`h-10 sm:h-11 ${className ?? ''}`}>
          {currentSortOrder === 'asc'
            ? <ArrowUp className="h-4 w-4 mr-2" />
            : <ArrowDown className="h-4 w-4 mr-2" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(opt => (
          <DropdownMenuItem key={`${opt.sortBy}-${opt.sortOrder}`} onClick={() => onSort(opt.sortBy, opt.sortOrder)}>
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Generic sort comparator for use with useMemo. */
export function sortItems<T>(items: T[], sortBy: string, sortOrder: 'asc' | 'desc', getVal: (item: T, key: string) => any): T[] {
  return [...items].sort((a, b) => {
    let aVal = getVal(a, sortBy);
    let bVal = getVal(b, sortBy);
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });
}
