import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarDays, Clock3, Download, FileText, Grid2X2, List, Loader2, Users } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { useUserContext } from '../../contexts/UserContext';
import { Pagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePageSize } from '../../hooks/usePageSize';
import { usePagination } from '../../hooks/usePagination';

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const periodLabel = (period: any) => `${formatDate(period.start_date)} – ${formatDate(period.end_date)}`;

export function SalaryReport() {
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

  // Pagination state
  const [currentItemsPerPage, setCurrentItemsPerPage] = usePageSize('salary-report-current', 10);
  const [historyItemsPerPage, setHistoryItemsPerPage] = usePageSize('salary-report-history', 10);

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
        TapTimeService.salaryReportCurrent(),
        TapTimeService.salaryReportHistory(),
      ]);
      setCurrent(currentResponse.data);
      setSelected(currentResponse.data);
      setHistory(historyResponse.data.periods || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load salary reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const selectPeriod = async (period: any) => {
    setLoading(true);
    setError('');
    try {
      const response = await TapTimeService.salaryReportPeriod(period.start_date, period.end_date);
      setSelected(response.data);
      setTab('current');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this report period');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = (reportData: any) => {
    if (!reportData) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    doc.setFontSize(18);
    doc.setTextColor(15, 45, 82);
    doc.text('The Goddard School', 40, 42);

    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(`Salary Report - ${reportData.frequency}`, 40, 66);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${periodLabel(reportData.period)} • Employees: ${reportData.totals.employees} • Total Time: ${reportData.totals.time_worked}`, 40, 84);

    autoTable(doc, {
      startY: 104,
      head: [['Employee', 'PIN', 'Entries', 'Time Worked']],
      body: reportData.items.map((item: any) => [
        item.name || '—',
        item.pin || '—',
        String(item.entries),
        item.time_worked,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 45, 82], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 7, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`salary-report-${reportData.period.start_date}-to-${reportData.period.end_date}.pdf`);
  };

  const downloadPeriodPdf = async (period: any) => {
    setDownloadingPeriod(period);
    try {
      const response = await TapTimeService.salaryReportPeriod(period.start_date, period.end_date);
      generatePdf(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to download this report');
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

  return (
    <AdminLayout>
      {downloadingPeriod !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#0F2D52]" />
              <p className="text-sm font-medium text-slate-700">Generating PDF…</p>
            </div>
          </div>
        </div>
      )}
      <main className="min-h-full bg-[#f6f9fd] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0F2D52]">Salary Report</h1>
              <p className="mt-1 text-sm text-slate-600">View salary report history by configured frequency</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {report && !report.period.is_current && (
                <Button variant="outline" onClick={() => setSelected(current)}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  View Current
                </Button>
              )}
              <Button variant="outline" onClick={() => generatePdf(selected || current)} disabled={!report || loading}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </header>

          {loading ? (
            <div className="py-20"><Loading size="md" message="Loading salary reports…" /></div>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          ) : (
            <>
              {/* Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat icon={Users} label="Employees" value={String(report?.totals?.employees || 0)} color="text-blue-600" />
                <Stat icon={FileText} label="Entries" value={String(report?.totals?.entries || 0)} color="text-emerald-600" />
                <Stat icon={Clock3} label="Total Time" value={report?.totals?.time_worked || '—'} color="text-purple-600" />
              </div>

              {/* Tabs */}
              <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/50 px-5">
                  <nav className="flex gap-6 overflow-x-auto">
                    {[
                      { key: 'current', label: 'Current Period' },
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
                            <h3 className="text-sm font-bold text-[#0F2D52]">{report?.period?.is_current ? report.frequency + ' Report' : `Historical Report — ${report?.frequency}`}</h3>
                            <p className="mt-2 text-xs text-slate-600">{report?.period ? periodLabel(report.period) : ''}</p>
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
                                      paginatedItems.map((item: any, idx: number) => (
                                        <SalaryCard key={idx} item={item} />
                                      ))
                                    ) : (
                                      <div className="col-span-full py-20 text-center">
                                        <FileText className="mx-auto h-12 w-12 text-slate-400" />
                                        <h3 className="mt-4 text-lg font-bold text-[#0F2D52]">No Records Found</h3>
                                        <p className="mt-2 text-sm text-slate-600">No attendance records in this period.</p>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="overflow-x-auto rounded-xl border border-slate-100">
                                  <table className="w-full min-w-[600px] text-sm">
                                    <thead className="bg-slate-50/80">
                                      <tr>
                                        {['Employee', 'PIN', 'Entries', 'Time Worked'].map((header) => (
                                          <th
                                            key={header}
                                            className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                                          >
                                            {header}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paginatedItems.length ? (
                                        paginatedItems.map((item: any, idx: number) => (
                                          <tr key={idx} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                                            <td className="px-4 py-4 font-medium text-[#0F2D52]">{item.name || '—'}</td>
                                            <td className="px-4 py-4 text-slate-600">{item.pin || '—'}</td>
                                            <td className="px-4 py-4 text-slate-600">{item.entries}</td>
                                            <td className="px-4 py-4 font-semibold text-slate-700">{item.time_worked}</td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                            No attendance records in this period.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
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
                                <HistoryCard key={idx} period={period} current={current} selected={selected} onSelect={() => void selectPeriod(period)} onDownload={() => void downloadPeriodPdf(period)} loading={loading} downloadingPeriod={downloadingPeriod} />
                              ))
                            ) : (
                              <div className="col-span-full py-20 text-center">
                                <FileText className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-4 text-lg font-bold text-[#0F2D52]">No Records Found</h3>
                                <p className="mt-2 text-sm text-slate-600">No salary report history available.</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full min-w-[700px] text-sm">
                            <thead className="bg-slate-50/80">
                              <tr>
                                {['Start Date', 'End Date', 'Report Type', 'Period End', 'View', 'Download PDF'].map((header) => (
                                  <th
                                    key={header}
                                    className={`border-y border-slate-200/85 px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 ${
                                      ['View', 'Download PDF'].includes(header) ? 'text-center' : 'text-left'
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
                                  <td className="px-4 py-4 text-slate-600">{current?.frequency || '—'}</td>
                                  <td className="px-4 py-4 text-slate-600">{formatDate(period.end_date)}</td>
                                  <td className="px-4 py-4 text-center">
                                    <Button size="sm" variant="outline" onClick={() => void selectPeriod(period)} disabled={loading}>
                                      View
                                    </Button>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      disabled={downloadingPeriod?.start_date === period.start_date}
                                      onClick={() => void downloadPeriodPdf(period)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
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

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl bg-[#EFF5FB] p-2.5">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function SalaryCard({ item }: { item: any }) {
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
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0">Entries</dt>
          <dd className="text-right truncate">{item.entries}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0 font-semibold text-slate-800">
          <dt className="flex-shrink-0">Time Worked</dt>
          <dd className="text-right truncate">{item.time_worked}</dd>
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
        <p className="mt-1 text-xs font-medium text-slate-400 truncate">{current?.frequency || '—'}</p>
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
        <div className="flex justify-between gap-2 min-w-0">
          <dt className="flex-shrink-0">Report Type</dt>
          <dd className="text-right truncate">{current?.frequency || '—'}</dd>
        </div>
        <div className="flex justify-between gap-2 min-w-0 font-semibold text-slate-800">
          <dt className="flex-shrink-0">Period End</dt>
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
