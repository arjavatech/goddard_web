import React from 'react';
import { Loading } from './loading';
import { Pagination } from './pagination';
import { PageSizeSelector } from './page-size-selector';

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
  onPageSizeChange?: (size: number) => void;
  tableLayout?: 'auto' | 'fixed';
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
  onPageSizeChange,
  tableLayout = 'fixed',
  className,
}: DataTableProps) {
  return (
    <div className={className}>
      {onPageSizeChange && (
        <div className="flex justify-end items-center px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <PageSizeSelector
              pageSize={itemsPerPage}
              onPageSizeChange={(size) => {
                onPageSizeChange?.(size);
                onPageChange(1);
              }}
              options={[10, 25, 50, 100]}
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[800px] border-collapse stagger-rows ${tableLayout === 'auto' ? 'table-auto' : 'table-fixed'}`}>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-500/50">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`text-left py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 ${col.className ?? ''}`}
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
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
