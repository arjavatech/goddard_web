import { ChevronUp, ChevronDown } from 'lucide-react';
import { SortDirection } from '../../hooks/useSorting';

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: { key: string; direction: SortDirection };
  onSort: (key: string) => void;
  className?: string;
}

export function SortableHeader({ children, sortKey, currentSort, onSort, className = '' }: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th 
      className={`cursor-pointer hover:bg-gray-50 select-none ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <div className="flex flex-col">
          <ChevronUp 
            className={`h-3 w-3 ${
              isActive && direction === 'asc' 
                ? 'text-amazon-teal' 
                : 'text-gray-300'
            }`} 
          />
          <ChevronDown 
            className={`h-3 w-3 -mt-1 ${
              isActive && direction === 'desc' 
                ? 'text-amazon-teal' 
                : 'text-gray-300'
            }`} 
          />
        </div>
      </div>
    </th>
  );
}