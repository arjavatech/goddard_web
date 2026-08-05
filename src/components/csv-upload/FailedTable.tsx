import React, { useState } from 'react';
import { ProcessedParent } from '../../services/csv/csvService';
import { AlertCircle, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface FailedTableProps {
  records: ProcessedParent[];
}

export function FailedTable({ records }: FailedTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (rowNum: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNum)) {
      newExpanded.delete(rowNum);
    } else {
      newExpanded.add(rowNum);
    }
    setExpandedRows(newExpanded);
  };

  const handleDownloadFailed = () => {
    if (records.length === 0) return;
    
    // Get headers from the first record's data keys, and add an 'Error Reasons' column
    const originalHeaders = Object.keys(records[0].data);
    const exportHeaders = [...originalHeaders, 'Error Reasons'];
    
    const rows = records.map(record => {
      const errorReasons = Object.entries(record.validation.errors)
        .map(([field, error]) => `${field}: ${error}`)
        .join(' | ');
        
      const rowData = originalHeaders.map(header => {
        let val = record.data[header] || '';
        // Escape CSV values
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      });
      
      // Escape the error reasons string as well
      const escapedErrors = `"${errorReasons.replace(/"/g, '""')}"`;
      
      return [...rowData, escapedErrors].join(',');
    });

    const csvContent = exportHeaders.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'failed_parent_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (records.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div className="p-5 border-b border-slate-100 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            Failed Validations
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{records.length} records require corrections</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadFailed}
          className="bg-white text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800 h-9 rounded-xl flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Failed Records
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Parent Name</th>
              <th className="px-4 py-3">Email & Contact</th>
              <th className="px-4 py-3">Failed Fields</th>
              <th className="px-4 py-3">Primary Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record, idx) => {
              const errorKeys = Object.keys(record.validation.errors);
              const firstError = errorKeys.length > 0 ? record.validation.errors[errorKeys[0]] : 'Unknown error';
              const isExpanded = expandedRows.has(record.rowNumber);

              return (
                <React.Fragment key={idx}>
                  <tr 
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => toggleRow(record.rowNumber)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">#{record.rowNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {record.data['Parent First Name'] || 'Unknown'} {record.data['Parent Last Name'] || ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{record.data['Parent Email'] || '-'}</span>
                        {record.data['Parent Phone Number'] && (
                          <span className="text-slate-500 text-xs mt-0.5">{record.data['Parent Phone Number']}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {errorKeys.slice(0, 2).map((key, i) => (
                          <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[10px]">
                            {key}
                          </Badge>
                        ))}
                        {errorKeys.length > 2 && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[10px]">
                            +{errorKeys.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-red-600 truncate max-w-xs">{firstError}</td>
                  </tr>
                  
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="space-y-2 border-l-2 border-red-200 pl-4">
                          <p className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">Detailed Errors:</p>
                          {errorKeys.map((key, i) => (
                            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                              <span className="text-xs font-semibold text-slate-800 min-w-[150px]">{key}:</span>
                              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded border border-red-100 break-words">
                                {record.validation.errors[key]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
