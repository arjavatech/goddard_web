import React from 'react';
import { DataTable } from '../ui/data-table';
import { Button } from '../ui/button';
import { EmailHistoryRecord, EmailHistoryFilters } from '../../types/emailHistory';
import { cn } from '../../lib/utils';
import { Eye } from 'lucide-react';

interface EmailHistoryTableProps {
  records: EmailHistoryRecord[];
  totalItems: number;
  filters: EmailHistoryFilters;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewRecord: (record: EmailHistoryRecord) => void;
}

const formatDate = (isoString?: string) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  } catch {
    return '—';
  }
};

export function EmailHistoryTable({
  records,
  totalItems,
  filters,
  loading,
  onPageChange,
  onPageSizeChange,
  onViewRecord
}: EmailHistoryTableProps) {
  const columns = [
    { header: 'Recipient', className: 'min-w-[200px]' },
    { header: 'Email Type', className: 'min-w-[150px]' },
    { header: 'Subject', className: 'min-w-[200px]' },
    { header: 'Sent At', className: 'min-w-[150px]' },
    { header: 'Status', className: 'min-w-[100px]' }
  ];

  const rows = records.map(record => (
    <tr 
      key={record.id} 
      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
      onClick={() => onViewRecord(record)}
    >
      <td className="p-4 border-b border-slate-100">
        <div className="font-medium text-slate-900">{record.recipientName || '—'}</div>
        <div className="text-xs text-slate-500 truncate">{record.recipientEmail}</div>
      </td>
      <td className="p-4 border-b border-slate-100 text-sm text-slate-600">
        {record.emailType}
      </td>
      <td className="p-4 border-b border-slate-100 text-sm text-slate-900 font-medium truncate max-w-[200px]" title={record.subject}>
        {record.subject}
      </td>
      <td className="p-4 border-b border-slate-100 text-sm text-slate-600">
        {formatDate(record.sentAt || record.createdAt)}
      </td>
      <td className="p-4 border-b border-slate-100">
        <span className={cn(
          "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
          record.status === 'delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          record.status === 'failed' ? "bg-red-50 text-red-700 border-red-200" :
          record.status === 'sent' ? "bg-blue-50 text-blue-700 border-blue-200" :
          "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {record.status}
        </span>
      </td>
    </tr>
  ));

  const totalPages = Math.ceil(totalItems / filters.pageSize) || 1;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        loadingMessage="Loading email history..."
        emptyMessage="No email history found matching your filters."
        currentPage={filters.page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={filters.pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        tableLayout="auto"
      />
    </div>
  );
}
