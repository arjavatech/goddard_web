import React, { useEffect, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2, Printer, Zap, List, Grid3x3 } from 'lucide-react';
import { EmployeeLayout } from './EmployeeLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Button } from '../../components/ui/button';
import { Pagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePageSize } from '../../hooks/usePageSize';
import { usePagination } from '../../hooks/usePagination';

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const periodLabel = (period: any) => `${formatDate(period.start_date)} – ${formatDate(period.end_date)}`;

const DAY_KEYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
] as const;

function DayCard({ day, label, entries, hours, completed }: { day: string; label: string; entries: number; hours: string; completed: boolean }) {
  const isBold = DAY_KEYS.findIndex(d => d.key === day) % 2 === 0;
  return (
    <div className="rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden">
      <dl className="grid gap-3 text-xs sm:text-sm text-slate-600">
        <div className="flex justify-between gap-2 min-w-0">
          <dt className={`flex-shrink-0 ${isBold ? 'font-semibold' : 'font-normal'} uppercase tracking-wider text-slate-500 ${completed ? 'text-slate-700' : 'text-slate-300'}`}>
            {label}
          </dt>
        </div>
        <div className="flex justify-between gap-2 min-w-0 pt-2 border-t border-slate-100">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Entries</dt>
          <dd className={`text-right truncate font-semibold ${completed ? 'text-slate-900' : 'text-slate-300'}`}>
            {completed ? (entries > 0 ? entries : '—') : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Hours</dt>
          <dd className={`text-right truncate font-semibold ${completed ? 'text-slate-900' : 'text-slate-300'}`}>
            {completed ? hours : '—'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function DaysSummaryCard({ data }: { data: any }) {
  const hasOvertime = data.overtime_hours !== '00:00';
  return (
    <div className="rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden">
      <dl className="grid gap-3 text-xs sm:text-sm text-slate-600">
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Total</dt>
          <dd className="text-right truncate font-semibold text-[#0F2D52]">{data.total_hours || '00:00'}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0 pt-2 border-t border-slate-100">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Overtime</dt>
          <dd className={`text-right truncate font-semibold rounded px-2 py-0.5 ${
            hasOvertime
              ? 'bg-yellow-100 text-yellow-800'
              : 'text-slate-700'
          }`}>
            {data.overtime_hours || '00:00'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function PeriodCard({ period, loading, downloadingPeriod, onSelect, onDownload, onPrint }: { period: any; loading: boolean; downloadingPeriod: any; onSelect: () => void; onDownload: () => void; onPrint: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden">
      <dl className="grid gap-3 text-xs sm:text-sm text-slate-600">
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Start Date</dt>
          <dd className="text-right truncate font-semibold text-slate-900">{formatDate(period.start_date)}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">End Date</dt>
          <dd className="text-right truncate font-semibold text-slate-900">{formatDate(period.end_date)}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0 pt-2 border-t border-slate-100">
          <Button size="sm" variant="outline" onClick={onSelect} disabled={loading} className="flex-1">
            View
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={downloadingPeriod?.start_date === period.start_date}
            onClick={onDownload}
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            disabled={downloadingPeriod?.start_date === period.start_date}
            onClick={onPrint}
            title="Print PDF"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </dl>
    </div>
  );
}

function DayTable({ data, completedWeekdays }: { data: any; completedWeekdays: number }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[400px] text-sm">
        <thead className="bg-slate-50/80">
          <tr>
            <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Day</th>
            <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Entries</th>
            <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Hours</th>
          </tr>
        </thead>
        <tbody>
          {DAY_KEYS.map((day, idx) => {
            const isCompleted = idx < completedWeekdays;
            const entries = data[`${day.key}_entries`] || 0;
            const hours = data[day.key] || '00:00';
            const isBold = idx % 2 === 0;
            return (
              <tr key={day.key} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                <td className={`px-4 py-4 ${isBold ? 'font-semibold' : 'font-normal'} ${isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>
                  {day.label}
                </td>
                <td className={`px-4 py-4 ${isCompleted ? 'text-slate-600' : 'text-slate-300'}`}>
                  {isCompleted ? (entries > 0 ? entries : '—') : '—'}
                </td>
                <td className={`px-4 py-4 font-semibold ${isCompleted ? 'text-slate-700' : 'text-slate-300'}`}>
                  {isCompleted ? hours : '—'}
                </td>
              </tr>
            );
          })}
          <tr className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
            <td className="px-4 py-4 font-bold text-[#0F2D52]">Total</td>
            <td className="px-4 py-4"></td>
            <td className="px-4 py-4 font-bold text-[#0F2D52]">{data.total_hours || '00:00'}</td>
          </tr>
          <tr className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
            <td className="px-4 py-4 font-bold text-[#0F2D52]">Overtime</td>
            <td className="px-4 py-4"></td>
            <td className={`px-4 py-4 font-semibold ${
              data.overtime_hours !== '00:00'
                ? 'bg-yellow-100 text-yellow-800 rounded px-2 py-0.5'
                : 'text-slate-700'
            }`}>
              {data.overtime_hours || '00:00'}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function EmployeeWeeklyReport() {
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPeriod, setDownloadingPeriod] = useState<any>(null);
  const [pdfAction, setPdfAction] = useState<'download' | 'print' | null>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(typeof window !== 'undefined' && window.innerWidth < 640 ? 'card' : 'table');
  const [historyViewMode, setHistoryViewMode] = useState<'table' | 'card'>(typeof window !== 'undefined' && window.innerWidth < 640 ? 'card' : 'table');

  const detailRef = useRef<HTMLDivElement>(null);

  const [historyItemsPerPage, setHistoryItemsPerPage] = usePageSize('employee-weekly-report-history', 10);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [currentResponse, historyResponse] = await Promise.all([
        TapTimeService.myWeeklyReportCurrent(),
        TapTimeService.myWeeklyReportHistory(),
      ]);
      setCurrent(currentResponse.data);
      setSelected(currentResponse.data);
      setHistory(historyResponse.data.periods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load weekly reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectPeriod = async (period: any) => {
    setLoading(true);
    setError('');
    try {
      const response = await TapTimeService.myWeeklyReportPeriod(period.start_date, period.end_date);
      setSelected(response.data);
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this report period');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintPeriod = async (period: any) => {
    setDownloadingPeriod(period);
    setPdfAction('print');
    try {
      const response = await TapTimeService.myWeeklyReportPeriod(period.start_date, period.end_date);
      generatePdf(response.data, 'print');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate PDF');
    } finally {
      setDownloadingPeriod(null);
      setPdfAction(null);
    }
  };

  const handleDownloadPeriod = async (period: any) => {
    setDownloadingPeriod(period);
    setPdfAction('download');
    try {
      const response = await TapTimeService.myWeeklyReportPeriod(period.start_date, period.end_date);
      generatePdf(response.data, 'download');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate PDF');
    } finally {
      setDownloadingPeriod(null);
      setPdfAction(null);
    }
  };

  const generatePdf = (reportData: any, action: 'download' | 'print' = 'download') => {
    if (!reportData) return;
    setDownloadingPeriod(reportData.period);
    setPdfAction(action);
    setTimeout(() => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      doc.setFontSize(18);
      doc.setTextColor(15, 45, 82);
      doc.text('The Goddard School', 40, 42);

      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text('My Weekly Time Report', 40, 66);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${periodLabel(reportData.period)} • Total Hours: ${reportData.total_hours} • Overtime: ${reportData.overtime_hours}`, 40, 84);

      const bodyRows = DAY_KEYS.map((day) => [
        day.label,
        reportData[`${day.key}_entries`] || 0,
        reportData[day.key] || '00:00',
      ]);
      bodyRows.push(['Total', '', reportData.total_hours || '00:00']);
      bodyRows.push(['Overtime', '', reportData.overtime_hours || '00:00']);

      autoTable(doc, {
        startY: 104,
        head: [['Day', 'Entries', 'Hours']],
        body: bodyRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 45, 82], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data: any) => {
          // Make Total and Overtime rows bold (last 2 rows)
          if (data.row.index >= bodyRows.length - 2) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 40, right: 40 },
      });

      const filename = `my-weekly-report-${reportData.period.start_date}-to-${reportData.period.end_date}.pdf`;
      if (action === 'print') {
        doc.output('dataurlnewwindow');
      } else {
        doc.save(filename);
      }
      setDownloadingPeriod(null);
      setPdfAction(null);
    }, 100);
  };

  const {
    currentPage: historyPage,
    totalPages: historyTotalPages,
    paginatedData: paginatedHistoryItems,
    setCurrentPage: setHistoryPage,
  } = usePagination({ data: history, itemsPerPage: historyItemsPerPage });

  useEffect(() => { setHistoryPage(1); }, [history, setHistoryPage]);

  const handleHistoryPageSizeChange = (value: number) => {
    setHistoryItemsPerPage(value);
    setHistoryPage(1);
  };

  if (!current && !loading) {
    return (
      <EmployeeLayout>
        <main className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-4 sm:p-6">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-slate-500">No weekly report data available</p>
          </div>
        </main>
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <main className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen p-4 sm:p-6">
        {(loading || downloadingPeriod !== null) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F2D52]" />
              <p className="text-sm font-medium text-slate-700">
                {pdfAction === 'print' ? 'Opening PDF for print…' : pdfAction === 'download' ? 'Generating PDF…' : 'Loading weekly reports…'}
              </p>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#0F2D52] mb-2">Weekly Time Report</h1>
            <p className="text-slate-600">View your daily hours and overtime</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {!error && current && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Total Hours</p>
                      <p className="text-2xl font-bold text-[#0F2D52]">{current.total_hours}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Overtime</p>
                      <p className={`text-2xl font-bold flex items-center gap-2 ${current.overtime_hours !== '00:00' ? 'text-amber-600' : 'text-slate-600'}`}>
                        {current.overtime_hours}
                        {current.overtime_hours !== '00:00' && <Zap className="h-5 w-5 text-amber-500" />}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-6 flex items-center gap-2 border-b border-slate-200">
                <button
                  onClick={() => setTab('current')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    tab === 'current'
                      ? 'text-[#0F2D52] border-b-2 border-[#0F2D52]'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Current Week
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    tab === 'history'
                      ? 'text-[#0F2D52] border-b-2 border-[#0F2D52]'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  History
                </button>
              </div>

              {/* Current Week Tab */}
              {tab === 'current' && current && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <h3 className="text-sm font-bold text-[#0F2D52]">Week — {periodLabel(current.period)}</h3>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button size="icon" variant="outline" onClick={() => generatePdf(current, 'print')} title="Print" className="flex-1 sm:flex-none">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => generatePdf(current, 'download')} className="flex-1 sm:flex-none">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10 w-fit">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                        viewMode === 'table'
                          ? 'bg-white text-[#0F2D52] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('card')}
                      className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                        viewMode === 'card'
                          ? 'bg-white text-[#0F2D52] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Grid3x3 className="h-3.5 w-3.5" />
                      Cards
                    </button>
                  </div>

                  {/* Card View */}
                  {viewMode === 'card' ? (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {DAY_KEYS.map((day, idx) => (
                        <DayCard
                          key={day.key}
                          day={day.key}
                          label={day.label}
                          entries={current[`${day.key}_entries`] || 0}
                          hours={current[day.key] || '00:00'}
                          completed={idx < current.completed_weekdays}
                        />
                      ))}
                      <DaysSummaryCard data={current} />
                    </div>
                  ) : (
                    <DayTable data={current} completedWeekdays={current.completed_weekdays} />
                  )}
                </div>
              )}

              {/* History Tab */}
              {tab === 'history' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10 w-fit">
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode('table')}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                          historyViewMode === 'table'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setHistoryViewMode('card')}
                        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                          historyViewMode === 'card'
                            ? 'bg-white text-[#0F2D52] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Grid3x3 className="h-3.5 w-3.5" />
                        Cards
                      </button>
                    </div>
                    <PageSizeSelector pageSize={historyItemsPerPage} onPageSizeChange={handleHistoryPageSizeChange} />
                  </div>

                  {historyViewMode === 'card' ? (
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {paginatedHistoryItems.length > 0 ? (
                        paginatedHistoryItems.map((period: any, idx: number) => (
                          <PeriodCard
                            key={idx}
                            period={period}
                            loading={loading}
                            downloadingPeriod={downloadingPeriod}
                            onSelect={() => selectPeriod(period)}
                            onDownload={() => handleDownloadPeriod(period)}
                            onPrint={() => handlePrintPeriod(period)}
                          />
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center text-slate-500">No history available</div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm">
                          <thead className="bg-slate-50/80">
                            <tr>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Start Date</th>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">End Date</th>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedHistoryItems.length > 0 ? (
                              paginatedHistoryItems.map((period: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                                  <td className="px-4 py-4 text-slate-600">{formatDate(period.start_date)}</td>
                                  <td className="px-4 py-4 text-slate-600">{formatDate(period.end_date)}</td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button size="sm" variant="outline" onClick={() => selectPeriod(period)} disabled={loading}>
                                        View
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={downloadingPeriod?.start_date === period.start_date}
                                        onClick={() => handleDownloadPeriod(period)}
                                        title="Download PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={downloadingPeriod?.start_date === period.start_date}
                                        onClick={() => handlePrintPeriod(period)}
                                        title="Print PDF"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                                  No history available
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {history.length > 0 && (
                    <Pagination
                      currentPage={historyPage}
                      totalPages={historyTotalPages}
                      totalItems={history.length}
                      itemsPerPage={historyItemsPerPage}
                      onPageChange={setHistoryPage}
                    />
                  )}

                  {/* Detail section — shown below history list when a period is selected */}
                  {selected && !selected.period.is_current && (
                    <div className="mt-8 border-t border-slate-200 pt-8" ref={detailRef}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                        <h3 className="text-sm font-bold text-[#0F2D52]">Detail — {periodLabel(selected.period)}</h3>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button size="icon" variant="outline" onClick={() => generatePdf(selected, 'print')} title="Print" className="flex-1 sm:flex-none">
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => generatePdf(selected, 'download')} className="flex-1 sm:flex-none">
                            <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10 w-fit">
                        <button
                          type="button"
                          onClick={() => setHistoryViewMode('table')}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                            historyViewMode === 'table'
                              ? 'bg-white text-[#0F2D52] shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <List className="h-3.5 w-3.5" />
                          Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryViewMode('card')}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${
                            historyViewMode === 'card'
                              ? 'bg-white text-[#0F2D52] shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Grid3x3 className="h-3.5 w-3.5" />
                          Cards
                        </button>
                      </div>

                      {historyViewMode === 'card' ? (
                        <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          <DayCard
                            day="summary"
                            label="Summary"
                            entries={0}
                            hours=""
                            completed={true}
                          />
                          {DAY_KEYS.map((day, idx) => (
                            <DayCard
                              key={day.key}
                              day={day.key}
                              label={day.label}
                              entries={selected[`${day.key}_entries`] || 0}
                              hours={selected[day.key] || '00:00'}
                              completed={true}
                            />
                          ))}
                          <DaysSummaryCard data={selected} />
                        </div>
                      ) : (
                        <div className="mt-4">
                          <DayTable data={selected} completedWeekdays={5} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </EmployeeLayout>
  );
}
