import React from 'react';
import { Loading } from './loading';
import { Pagination } from './pagination';

interface Column {
  header: string | React.ReactNode;
  className?: string;
}

interface DataTableProps {
  columns: Column[];
  rows: React.ReactNode[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function DataTable({
  columns,
  rows,
  loading,
  loadingMessage = 'Loading...',
  emptyMessage = 'No results found.',
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className,
}: DataTableProps) {
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left py-3 px-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-8">
                  <Loading message={loadingMessage} size="sm" />
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
      />
    </div>
  );
}
