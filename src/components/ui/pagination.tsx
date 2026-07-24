import React from 'react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemCount = true,
  className = ''
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-t ${className}`}>
      {showItemCount && (
        <div className="text-xs text-slate-500 text-center sm:text-left">
          Showing {startItem}–{endItem} of {totalItems}
        </div>
      )}
      <div className="flex items-center justify-center sm:justify-end gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
        >
          Prev
        </Button>
        <span className="text-xs text-slate-500 font-semibold px-1 whitespace-nowrap">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
        >
          Next
        </Button>
      </div>
    </div>
  );
}

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function MobilePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = ''
}: MobilePaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = totalItems && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : null;
  const endItem = totalItems && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : null;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t ${className}`}>
      <div className="text-xs text-slate-500 text-center sm:text-left">
        {startItem && endItem && totalItems
          ? `Showing ${startItem}–${endItem} of ${totalItems}`
          : `Page ${currentPage} of ${totalPages}`}
      </div>
      <div className="flex items-center justify-center sm:justify-end gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
        >
          Prev
        </Button>
        <span className="text-xs text-slate-500 font-semibold px-1 whitespace-nowrap">{currentPage} / {totalPages}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-8 px-3 rounded-xl text-xs font-bold border-slate-200"
        >
          Next
        </Button>
      </div>
    </div>
  );
}