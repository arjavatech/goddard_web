import { useState } from 'react';
import { ProcessedParent } from '../../services/csv/csvService';
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

interface CSVResultsTableProps {
  records: ProcessedParent[];
  skipped: number;
}

function Field({ label, value, error }: { label: string; value?: string; error?: string }) {
  if (!value && !error) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      {value && (
        <span className={`text-xs font-medium ${error ? 'text-red-600' : 'text-slate-700'}`}>{value}</span>
      )}
      {!value && error && (
        <span className="text-xs text-red-500 italic">Empty</span>
      )}
      {error && (
        <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 mt-0.5">{error}</span>
      )}
    </div>
  );
}

export function CSVResultsTable({ records, skipped }: CSVResultsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const validCount = records.filter(r => r.validation.isValid).length;
  const failedCount = records.length - validCount;

  const toggle = (rowNum: number) => {
    const next = new Set(expandedRows);
    if (next.has(rowNum)) next.delete(rowNum);
    else next.add(rowNum);
    setExpandedRows(next);
  };

  if (records.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="p-5 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">{records.length} rows processed</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-green-600 font-semibold">{validCount} valid</span>
          {failedCount > 0 && <span className="text-xs text-red-600 font-semibold">{failedCount} with errors</span>}
          {skipped > 0 && <span className="text-xs text-slate-400 font-semibold">{skipped} duplicate(s) skipped</span>}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3">Row</th>
              <th className="px-4 py-3">Parent Name</th>
              <th className="px-4 py-3">Email & Contact</th>
              <th className="px-4 py-3">Child Name</th>
              <th className="px-4 py-3">Classroom</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record, idx) => {
              const d = record.data;
              const errors = record.validation.errors;
              const isValid = record.validation.isValid;
              const isExpanded = expandedRows.has(record.rowNumber);

              const primaryName = [d['Parent First Name'], d['Parent Last Name']].filter(Boolean).join(' ');
              const secondaryName = [d['Secondary Parent First Name'], d['Secondary Parent Last Name']].filter(Boolean).join(' ');
              const childName = [d['Child First Name'], d['Child Last Name']].filter(Boolean).join(' ');
              const hasSecondary = secondaryName || d['Secondary Parent Email'] || d['Secondary Parent Phone Number'];

              return (
                <>
                  {/* Main row */}
                  <tr
                    key={`row-${idx}`}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => toggle(record.rowNumber)}
                  >
                    <td className="px-4 py-3 text-slate-400">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-medium">#{record.rowNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {primaryName || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-slate-900">{d['Parent Email'] || <span className="text-slate-300">—</span>}</span>
                        {d['Parent Phone Number'] && (
                          <span className="text-slate-500 text-xs mt-0.5">{d['Parent Phone Number']}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {childName || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {d['Classroom'] || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isValid ? (
                        <span className="flex items-center gap-1 text-green-600 font-semibold text-xs">
                          <CheckCircle className="w-4 h-4" /> Valid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 font-semibold text-xs">
                          <XCircle className="w-4 h-4" /> {Object.keys(errors).length} error(s)
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr key={`detail-${idx}`} className={isValid ? 'bg-slate-50/40' : 'bg-red-50/20'}>
                      <td colSpan={7} className="px-8 py-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {/* Primary Parent */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Primary Parent</p>
                            <Field label="Name" value={primaryName || undefined} error={errors['Parent First Name'] || errors['Parent Last Name']} />
                            <Field label="Email" value={d['Parent Email']} error={errors['Parent Email']} />
                            <Field label="Phone" value={d['Parent Phone Number']} />
                            <Field label="Address" value={d['Primary Parent Address']} />
                          </div>

                          {/* Secondary Parent */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Secondary Parent</p>
                            {hasSecondary ? (
                              <>
                                <Field label="Name" value={secondaryName || undefined} error={errors['Secondary Parent First Name'] || errors['Secondary Parent Last Name']} />
                                <Field label="Email" value={d['Secondary Parent Email']} error={errors['Secondary Parent Email']} />
                                <Field label="Phone" value={d['Secondary Parent Phone Number']} />
                              </>
                            ) : (
                              <span className="text-xs text-slate-300 italic">Not provided</span>
                            )}
                          </div>

                          {/* Child */}
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">Child</p>
                            <Field label="Name" value={childName || undefined} error={errors['Child First Name'] || errors['Child Last Name']} />
                            <Field label="Gender" value={d['Child Gender']} error={errors['Child Gender']} />
                            <Field label="Date of Birth" value={d['Child DOB']} error={errors['Child DOB']} />
                            <Field label="Classroom" value={d['Classroom']} error={errors['Classroom']} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
