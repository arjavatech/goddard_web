import React, { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarDays, Clock3, Download, FileText, Grid2X2, List, Loader2, Printer, Zap } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Button } from '../../components/ui/button';
import { useUserContext } from '../../contexts/UserContext';
import { Pagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePageSize } from '../../hooks/usePageSize';
import { usePagination } from '../../hooks/usePagination';

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const periodLabel = (period: any) => `${formatDate(period.start_date)} – ${formatDate(period.end_date)}`;

export function WeeklyReport() {
  const { userData } = useUserContext();
  const canManage = ['admin', 'superadmin'].includes(userData?.role?.toLowerCase() || '');
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPeriod, setDownloadingPeriod] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 640);
  const [view, setView] = useState<'table' | 'grid'>(isMobile ? 'grid' : 'table');
  const [historyView, setHistoryView] = useState<'table' | 'grid'>(isMobile ? 'grid' : 'table');

  const detailRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentItemsPerPage, setCurrentItemsPerPage] = usePageSize('weekly-report-current', 10);
  const [historyItemsPerPage, setHistoryItemsPerPage] = usePageSize('weekly-report-history', 10);

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
        TapTimeService.weeklyReportCurrent(),
        TapTimeService.weeklyReportHistory(),
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

  const selectPeriod = async (period: any, switchTab = true) => {
    setLoading(true);
    setError('');
    try {
      const response = await TapTimeService.weeklyReportPeriod(period.start_date, period.end_date);
      setSelected(response.data);
      if (switchTab) {
        setTab('current');
      } else {
        setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this report period');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = (reportData: any, action: 'download' | 'print' = 'download') => {
    if (!reportData) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    doc.setFontSize(18);
    doc.setTextColor(15, 45, 82);
    doc.text('The Goddard School', 40, 42);

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Weekly Time Report', 40, 66);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${periodLabel(reportData.period)} • Employees: ${reportData.totals.employees} • Total Hours: ${reportData.totals.total_hours} • Overtime: ${reportData.totals.overtime_hours}`, 40, 84);

    autoTable(doc, {
      startY: 104,
      head: [['Employee', 'PIN', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Total Hours', 'Overtime']],
      body: reportData.items.map((item: any) => [
        item.name || '—',
        item.pin || '—',
        item.mon,
        item.tue,
        item.wed,
        item.thu,
        item.fri,
        item.total_hours,
        item.overtime_hours,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 45, 82], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 7, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
    });

    if (action === 'print') {
      doc.output('dataurlnewwindow');
    } else {
      doc.save(`weekly-report-${reportData.period.start_date}-to-${reportData.period.end_date}.pdf`);
    }
  };

  const downloadPeriodPdf = async (period: any) => {
    setDownloadingPeriod(period);
    try {
      const response = await TapTimeService.weeklyReportPeriod(period.start_date, period.end_date);
      generatePdf(response.data, 'download');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download this report');
    } finally {
      setDownloadingPeriod(null);
    }
  };

  const printPeriodPdf = async (period: any) => {
    setDownloadingPeriod(period);
    try {
      const response = await TapTimeService.weeklyReportPeriod(period.start_date, period.end_date);
      generatePdf(response.data, 'print');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to print this report');
    } finally {
      setDownloadingPeriod(null);
    }
  };

  const report = selected || current;

  // Current Period tab pagination
  const {
    currentPage,
    totalPages: currentTotalPages,
    paginatedData: paginatedItems,
    setCurrentPage: setCurrentPageItems,
  } = usePagination({ data: report?.items ?? [], itemsPerPage: currentItemsPerPage });

  // History tab pagination
  const {
    currentPage: historyPage,
    totalPages: historyTotalPages,
    paginatedData: paginatedHistory,
    setCurrentPage: setHistoryPage,
  } = usePagination({ data: history, itemsPerPage: historyItemsPerPage });

  useEffect(() => { setCurrentPageItems(1); }, [report, setCurrentPageItems]);
  useEffect(() => { setHistoryPage(1); }, [history, setHistoryPage]);

  const handleCurrentPageSizeChange = (value: number) => {
    setCurrentItemsPerPage(value);
    setCurrentPageItems(1);
  };

  const handleHistoryPageSizeChange = (value: number) => {
    setHistoryItemsPerPage(value);
    setHistoryPage(1);
  };

  const handleCurrentPageSizeChangeView = (value: number) => {
    setCurrentItemsPerPage(value);
    setCurrentPageItems(1);
  };

  const {
    currentPage: historyDetailPage,
    totalPages: historyDetailTotalPages,
    paginatedData: paginatedHistoryDetailItems,
    setCurrentPage: setHistoryDetailPage,
  } = usePagination({ data: selected?.items ?? [], itemsPerPage: currentItemsPerPage });

  useEffect(() => { setHistoryDetailPage(1); }, [selected?.period?.start_date, setHistoryDetailPage]);

  return (
    <AdminLayout>
      {(loading || downloadingPeriod !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#0F2D52]" />
              <p className="text-sm font-medium text-slate-700">
                {downloadingPeriod !== null ? 'Generating PDF…' : 'Loading weekly reports…'}
              </p>
            </div>
          </div>
        </div>
      )}
      <main className="min-h-full bg-[#f6f9fd] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0F2D52]">Weekly Time Report</h1>
              <p className="mt-1 text-sm text-slate-600">View daily and weekly hour breakdowns with overtime tracking</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {report && !report.period.is_current && (
                <Button variant="outline" onClick={() => { setSelected(current); setTab('current'); }}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  View Current
                </Button>
              )}
              <Button variant="outline" onClick={() => generatePdf(selected || current, 'download')} disabled={!report || loading}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => generatePdf(selected || current, 'print')} disabled={!report || loading}>
                <Printer className="mr-2 h-4 w-4" />
                Print PDF
              </Button>
            </div>
          </header>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          {!error && (
            <>
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat icon={Clock3} label="Employees" value={String(report?.totals?.employees || 0)} color="text-blue-600" />
                <Stat icon={FileText} label="Total Hours" value={report?.totals?.total_hours || '—'} color="text-emerald-600" />
                <Stat
                  icon={Zap}
                  label="Overtime"
                  value={report?.totals?.overtime_hours || '—'}
                  color="text-amber-600"
                  subtitle={report?.period?.is_current && report?.totals?.completed_weekdays < 5 ? `Threshold: ${report.totals.overtime_threshold_hours}` : undefined}
                />
              </div>

              {/* Tabs */}
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5">
                  <nav className="flex gap-6 overflow-x-auto">
                    {[
                      { key: 'current', label: 'Current Week' },
                      { key: 'history', label: 'History' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTab(key as typeof tab)}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-bold ${
                          tab === key
                            ? 'border-[#1a6fc4] text-[#0F2D52]'
                            : 'border-transparent text-slate-500 hover:text-[#0F2D52]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-5">
                  {tab === 'current' ? (
                    <>
                      {report && (
                        <>
                          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <h3 className="text-sm font-bold text-[#0F2D52]">{report?.period?.is_current ? 'Current Week' : `Historical Week`}</h3>
                            <p className="mt-2 text-xs text-slate-600">{report?.period ? periodLabel(report.period) : ''}</p>
                            {report?.period?.is_current && (
                              <p className="mt-3 text-xs text-slate-500">
                                {report.totals.completed_weekdays} of 5 days complete · Overtime threshold: {report.totals.overtime_threshold_hours}
                              </p>
                            )}
                          </div>

                          {report && (
                            <>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10">
                                  <button type="button" onClick={() => setView('table')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${view === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><List className="h-3.5 w-3.5" />Table</button>
                                  <button type="button" onClick={() => setView('grid')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${view === 'grid' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><Grid2X2 className="h-3.5 w-3.5" />Cards</button>
                                </div>
                                <PageSizeSelector pageSize={currentItemsPerPage} onPageSizeChange={handleCurrentPageSizeChangeView} />
                              </div>
                              {view === 'grid' ? (
                                <>
                                  <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {paginatedItems.length ? (
                                      paginatedItems.map((item: any, idx: number) => {
                                        const completedWeekdays = report?.period?.is_current ? (report?.totals?.completed_weekdays ?? 5) : 5;
                                        return <WeeklyCard key={idx} item={item} completedWeekdays={completedWeekdays} />;
                                      })
                                    ) : (
                                      <div className="col-span-full py-20 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-slate-400" />
                                        <h3 className="mt-4 text-lg font-bold text-[#0F2D52]">No Records Found</h3>
                                        <p className="mt-2 text-sm text-slate-600">No attendance records in this week.</p>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                  {(() => {
                                    const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
                                    const completedWeekdays: number = report?.period?.is_current
                                      ? (report?.totals?.completed_weekdays ?? 5)
                                      : 5;
                                    return (
                                      <table className="w-full min-w-[1000px] text-sm">
                                        <thead className="bg-slate-50/80">
                                          <tr>
                                            {['Employee', 'PIN'].map((header) => (
                                              <th key={header} className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>
                                            ))}
                                            {DAY_KEYS.map((day, idx) => (
                                              <th key={day} className={`border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${idx >= completedWeekdays ? 'text-slate-300' : 'text-slate-500'}`}>
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                              </th>
                                            ))}
                                            {['Total Hours', 'Overtime'].map((header) => (
                                              <th key={header} className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {paginatedItems.length ? (
                                            paginatedItems.map((item: any, idx: number) => {
                                              const hasOvertime = item.overtime_hours !== '00:00';
                                              return (
                                                <tr key={idx} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                                                  <td className="px-4 py-4 font-medium text-[#0F2D52]">{item.name || '—'}</td>
                                                  <td className="px-4 py-4 text-slate-600">{item.pin || '—'}</td>
                                                  {DAY_KEYS.map((day, idx) => (
                                                    <td key={day} className={`px-4 py-4 ${idx >= completedWeekdays ? 'text-slate-300' : 'text-slate-600'}`}>
                                                      {idx >= completedWeekdays ? '—' : item[day]}
                                                    </td>
                                                  ))}
                                                  <td className="px-4 py-4 font-semibold text-slate-700">{item.total_hours}</td>
                                                  <td className={`px-4 py-4 font-semibold rounded ${hasOvertime ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600'}`}>{item.overtime_hours}</td>
                                                </tr>
                                              );
                                            })
                                          ) : (
                                            <tr>
                                              <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                                                No attendance records in this week.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    );
                                  })()}
                                </div>
                              )}
                              <Pagination
                                currentPage={currentPage}
                                totalPages={currentTotalPages}
                                totalItems={report.items.length}
                                itemsPerPage={currentItemsPerPage}
                                onPageChange={setCurrentPageItems}
                              />
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10">
                              <button type="button" onClick={() => setHistoryView('table')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${historyView === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><List className="h-3.5 w-3.5" />Table</button>
                              <button type="button" onClick={() => setHistoryView('grid')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${historyView === 'grid' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><Grid2X2 className="h-3.5 w-3.5" />Cards</button>
                            </div>
                            <PageSizeSelector pageSize={historyItemsPerPage} onPageSizeChange={handleHistoryPageSizeChange} />
                          </div>

                          {historyView === 'grid' ? (
                        <>
                          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {paginatedHistory.length ? (
                              paginatedHistory.map((period, idx) => (
                                <HistoryCard key={idx} period={period} current={current} selected={selected} onSelect={() => { void selectPeriod(period, false); void selectPeriod(period, false); }} onDownload={() => void downloadPeriodPdf(period)} loading={loading} downloadingPeriod={downloadingPeriod} />
                              ))
                            ) : (
                              <div className="col-span-full py-20 text-center">
                                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-4 text-lg font-bold text-[#0F2D52]">No Records Found</h3>
                                <p className="mt-2 text-sm text-slate-600">No weekly report history available.</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full min-w-[700px] text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                {['Start Date', 'End Date', 'Actions'].map((header) => (
                                  <th
                                    key={header}
                                    className={`border-y border-slate-200/85 px-4 py-3.5 text-xs font-bold uppercase tracking-wider ${
                                      header === 'Actions' ? 'text-center text-slate-500' : 'text-left text-slate-500'
                                    }`}
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedHistory.map((period, idx) => (
                                <tr
                                  key={idx}
                                  className={`border-b border-slate-50 transition-colors hover:bg-[#F8FAFC] ${
                                    selected?.period.start_date === period.start_date &&
                                    selected?.period.end_date === period.end_date
                                      ? 'bg-blue-50'
                                      : ''
                                  }`}
                                >
                                  <td className="px-4 py-4 text-slate-600">{formatDate(period.start_date)}</td>
                                  <td className="px-4 py-4 text-slate-600">{formatDate(period.end_date)}</td>
                                  <td className="px-4 py-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <Button size="sm" variant="outline" onClick={() => void selectPeriod(period, false)} disabled={loading}>
                                        View
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={downloadingPeriod?.start_date === period.start_date}
                                        onClick={() => void downloadPeriodPdf(period)}
                                        title="Download PDF"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        disabled={downloadingPeriod?.start_date === period.start_date}
                                        onClick={() => void printPeriodPdf(period)}
                                        title="Print PDF"
                                      >
                                        <Printer className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                          <Pagination
                            currentPage={historyPage}
                            totalPages={historyTotalPages}
                            totalItems={history.length}
                            itemsPerPage={historyItemsPerPage}
                            onPageChange={setHistoryPage}
                          />

                      {/* Detail section — shown below history list when a period is selected */}
                      {selected && !selected.period.is_current && (
                        <div className="mt-8 border-t border-slate-200 pt-8" ref={detailRef}>
                          <div className="mb-6 flex items-center justify-between">
                            <div>
                              <h3 className="text-sm font-bold text-[#0F2D52]">Detail — {periodLabel(selected.period)}</h3>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => generatePdf(selected, 'print')}>
                                <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => generatePdf(selected, 'download')}>
                                <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                              </Button>
                            </div>
                          </div>
                          {historyView === 'grid' ? (
                            <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                              {paginatedHistoryDetailItems.length ? (
                                paginatedHistoryDetailItems.map((item: any, idx: number) => {
                                  const completedWeekdays = selected?.totals?.completed_weekdays ?? 5;
                                  return <WeeklyCard key={idx} item={item} completedWeekdays={completedWeekdays} />;
                                })
                              ) : (
                                <div className="col-span-full text-center text-slate-400">No records</div>
                              )}
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                              <table className="w-full min-w-[1000px] text-sm">
                                <thead className="bg-slate-50/80">
                                  <tr>
                                    {['Employee', 'PIN', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Total Hours', 'Overtime'].map((header) => (
                                      <th key={header} className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {paginatedHistoryDetailItems.length ? (
                                    paginatedHistoryDetailItems.map((item: any, idx: number) => {
                                      const hasOvertime = item.overtime_hours !== '00:00';
                                      return (
                                        <tr key={idx} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                                          <td className="px-4 py-4 font-medium text-[#0F2D52]">{item.name || '—'}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.pin || '—'}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.mon}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.tue}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.wed}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.thu}</td>
                                          <td className="px-4 py-4 text-slate-600">{item.fri}</td>
                                          <td className="px-4 py-4 font-semibold text-slate-700">{item.total_hours}</td>
                                          <td className={`px-4 py-4 font-semibold rounded ${hasOvertime ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600'}`}>{item.overtime_hours}</td>
                                        </tr>
                                      );
                                    })
                                  ) : (
                                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No records</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}

function Stat({ icon: Icon, label, value, color, subtitle }: { icon: React.ElementType; label: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-2 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-xl bg-[#EFF5FB] p-2.5">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function WeeklyCard({ item, completedWeekdays = 5 }: { item: any; completedWeekdays?: number }) {
  const hasOvertime = item.overtime_hours !== '00:00';
  const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F'];
  return (
    <div className="rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden">
      <div className="min-w-0">
        <p className="font-bold text-[#0F2D52] truncate">{item.name || '—'}</p>
      </div>
      <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm text-slate-600">
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0">PIN</dt>
          <dd className="text-right truncate">{item.pin || '—'}</dd>
        </div>
        <div className="grid grid-cols-5 gap-1 text-xs">
          {DAY_KEYS.map((key, idx) => (
            <div key={key} className={`text-center ${idx >= completedWeekdays ? 'opacity-40' : ''}`}>
              <dt className={`font-bold ${idx >= completedWeekdays ? 'text-slate-300' : 'text-slate-500'}`}>{DAY_LABELS[idx]}</dt>
              <dd className={`${idx >= completedWeekdays ? 'text-slate-300' : 'text-slate-700'}`}>
                {idx >= completedWeekdays ? '—' : item[key]}
              </dd>
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-2 min-w-0 font-semibold text-slate-800 border-t border-slate-100 pt-2">
          <dt className="flex-shrink-0">Total</dt>
          <dd className="text-right truncate">{item.total_hours}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0 font-semibold">
          <dt className="flex-shrink-0">Overtime</dt>
          <dd className={`text-right truncate rounded px-2 ${hasOvertime ? 'bg-yellow-200 text-yellow-900' : 'text-slate-600'}`}>{item.overtime_hours}</dd>
        </div>
      </dl>
    </div>
  );
}

function HistoryCard({ period, current, selected, onSelect, onDownload, loading, downloadingPeriod }: { period: any; current: any; selected: any; onSelect: () => void; onDownload: () => void; loading: boolean; downloadingPeriod: any }) {
  const isSelected = selected?.period.start_date === period.start_date && selected?.period.end_date === period.end_date;
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden ${
      isSelected ? 'border-[#1a6fc4] bg-blue-50' : 'border-slate-100'
    }`}>
      <div className="min-w-0">
        <p className="font-bold text-[#0F2D52] truncate">{periodLabel(period)}</p>
        <p className="mt-1 text-xs font-medium text-slate-400 truncate">Weekly Report</p>
      </div>
      <dl className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm text-slate-600">
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0">Start Date</dt>
          <dd className="text-right truncate">{formatDate(period.start_date)}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0">End Date</dt>
          <dd className="text-right truncate">{formatDate(period.end_date)}</dd>
        </div>
      </dl>
      <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-4 flex justify-around border-t border-slate-100 px-4 sm:px-5 py-3 gap-1 sm:gap-2">
        <Button size="sm" variant="outline" onClick={onSelect} disabled={loading} className="flex-1 min-w-0">
          View
        </Button>
        <Button size="icon" variant="outline" disabled={downloadingPeriod?.start_date === period.start_date} onClick={onDownload} className="flex-1 min-w-0 px-2 sm:px-3">
          <Download className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="sm:hidden ml-1 text-xs">PDF</span>
        </Button>
      </div>
    </div>
  );
}
