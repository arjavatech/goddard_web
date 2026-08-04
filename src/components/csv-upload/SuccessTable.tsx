import React, { useState, useMemo } from 'react';
import { ProcessedParent } from '../../services/csv/csvService';
import { Input } from '../ui/input';
import { Search, CheckCircle } from 'lucide-react';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { usePagination } from '../../hooks/usePagination';

interface SuccessTableProps {
  records: ProcessedParent[];
}

export function SuccessTable({ records }: SuccessTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const lowerQuery = searchQuery.toLowerCase();
    return records.filter(r => 
      `${r.data['Parent First Name']} ${r.data['Parent Last Name']}`.toLowerCase().includes(lowerQuery) ||
      r.data['Parent Email']?.toLowerCase().includes(lowerQuery)
    );
  }, [records, searchQuery]);

  const {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage,
    setCurrentPage
  } = usePagination({ data: filteredRecords, itemsPerPage: 10 });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Successfully Validated Parents
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{records.length} records ready to be created</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name or email..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm rounded-xl"
          />
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-500">No successful records found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 border-b border-slate-100">Row</th>
                <th className="px-6 py-3 border-b border-slate-100">Parent Name</th>
                <th className="px-6 py-3 border-b border-slate-100">Email & Contact</th>
                <th className="px-6 py-3 border-b border-slate-100">Child Name</th>
                <th className="px-6 py-3 border-b border-slate-100">Classroom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((record, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3 text-slate-500 font-medium">#{record.rowNumber}</td>
                  <td className="px-6 py-3 font-semibold text-slate-900">
                    {record.data['Parent First Name']} {record.data['Parent Last Name']}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="text-slate-900">{record.data['Parent Email']}</span>
                      {record.data['Parent Phone Number'] && (
                        <span className="text-slate-500 text-xs mt-0.5">{record.data['Parent Phone Number']}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {record.data['Child First Name']} {record.data['Child Last Name']}
                  </td>
                  <td className="px-6 py-3">
                    <Badge variant="outline" className="font-medium bg-white">{record.data['Classroom']}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of <span className="font-bold text-slate-900">{filteredRecords.length}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-bold text-slate-900 px-2 py-1.5 bg-slate-100 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
