import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CalendarDays, Clock3, Download, FileText, Loader2, Users, LayoutGrid, List, Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { useUserContext } from '../../contexts/UserContext';

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const periodLabel = (period: any) => `${formatDate(period.start_date)} – ${formatDate(period.end_date)}`;

export function SalaryReport() {
  const { userData } = useUserContext();
  const canManage = ['admin', 'superadmin'].includes(userData?.role?.toLowerCase() || '');
  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('none');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyViewMode, setHistoryViewMode] = useState<'table' | 'card'>('table');
  const [current, setCurrent] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [downloadingPeriod, setDownloadingPeriod] = useState<any>(null);

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
      setVisibleCount(12);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load this report period');
    } finally {
      setLoading(false);
    }
  };

  const generatePdf = (reportData: any) => {
    if (!reportData) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(15, 45, 82);
    doc.text('The Goddard School', 14, 18);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Salary Report - ${reportData.frequency}`, 14, 28);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`${periodLabel(reportData.period)} • Employees: ${reportData.totals.employees} • Total Time: ${reportData.totals.time_worked}`, 14, 36);

    autoTable(doc, {
      startY: 45,
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

  const filteredHistory = useMemo(() => {
    let list = history;
    if (historySearchQuery) {
      const q = historySearchQuery.toLowerCase();
      list = list.filter(period => {
         const start = formatDate(period.start_date).toLowerCase();
         const end = formatDate(period.end_date).toLowerCase();
         return start.includes(q) || end.includes(q);
      });
    }
    return list;
  }, [history, historySearchQuery]);

  const visibleHistory = filteredHistory.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(12);
  }, [historySearchQuery]);

  const filteredItems = useMemo(() => {
    if (!report?.items) return [];
    let items = [...report.items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item: any) => 
        (item.name || '').toLowerCase().includes(q) || 
        (item.pin || '').toLowerCase().includes(q)
      );
    }

    if (sortOption === 'name-asc') {
      items.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOption === 'name-desc') {
      items.sort((a: any, b: any) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortOption === 'entries-asc') {
      items.sort((a: any, b: any) => a.entries - b.entries);
    } else if (sortOption === 'entries-desc') {
      items.sort((a: any, b: any) => b.entries - a.entries);
    }

    return items;
  }, [report?.items, searchQuery, sortOption]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption, report]);

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
                <Button variant="outline" onClick={() => { setSelected(current); setTab('current'); }}>
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
                        onClick={() => {
                          setTab(key as typeof tab);
                          setSelected(current);
                        }}
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
                  {tab === 'current' || (tab === 'history' && selected && !selected.period.is_current) ? (
                    <>
                      {report && (
                        <>
                          <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
                            <h3 className="text-sm font-bold text-[#0F2D52]">{report?.period?.is_current ? report.frequency + ' Report' : `Historical Report — ${report?.frequency}`}</h3>
                            <p className="mt-2 text-xs text-slate-600">{report?.period ? periodLabel(report.period) : ''}</p>
                          </div>

                          {report && (
                            <>
                              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
                                  <div className="relative w-full sm:max-w-sm sm:flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Search by name or PIN..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-[#1a6fc4] focus:ring-1 focus:ring-[#1a6fc4]"
                                    />
                                  </div>
                                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
                                    <div className="flex w-full items-center gap-2 sm:w-auto">
                                      <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-400" />
                                      <select
                                        value={sortOption}
                                        onChange={(e) => setSortOption(e.target.value)}
                                        className="w-full rounded-lg border border-slate-200 py-2 pl-3 pr-8 text-sm outline-none focus:border-[#1a6fc4] focus:ring-1 focus:ring-[#1a6fc4] sm:w-auto"
                                      >
                                        <option value="none">Sort By</option>
                                        <option value="name-asc">Name: A → Z</option>
                                        <option value="name-desc">Name: Z → A</option>
                                        <option value="entries-asc">Entries: Low → High</option>
                                        <option value="entries-desc">Entries: High → Low</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center self-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:self-auto">
                                  <button
                                    onClick={() => setViewMode('table')}
                                    className={`rounded-md p-1.5 transition-colors ${
                                      viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Table View"
                                  >
                                    <List className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setViewMode('card')}
                                    className={`rounded-md p-1.5 transition-colors ${
                                      viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                    title="Card View"
                                  >
                                    <LayoutGrid className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {viewMode === 'table' ? (
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
                                            No attendance records found.
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                  {paginatedItems.length ? (
                                    paginatedItems.map((item: any, idx: number) => (
                                      <div key={idx} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                          <h4 className="font-bold text-[#0F2D52]">{item.name || '—'}</h4>
                                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                            PIN: {item.pin || '—'}
                                          </span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-xs text-slate-500">Entries</p>
                                            <p className="font-semibold text-slate-700">{item.entries}</p>
                                          </div>
                                          <div>
                                            <p className="text-xs text-slate-500">Time Worked</p>
                                            <p className="font-semibold text-slate-700">{item.time_worked}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400">
                                      No attendance records found.
                                    </div>
                                  )}
                                </div>
                              )}

                              {totalPages > 1 && (
                                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                                  <p className="text-sm text-slate-600">
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of{' '}
                                    <span className="font-medium">{filteredItems.length}</span> results
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                      disabled={currentPage === 1}
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex items-center gap-1">
                                      <span className="px-2 text-sm text-slate-600">
                                        Page {currentPage} of {totalPages}
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                      disabled={currentPage === totalPages}
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex w-full flex-col gap-3 sm:flex-1 sm:flex-row sm:items-center sm:gap-4">
                          <div className="relative w-full sm:max-w-sm sm:flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Search by date..."
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm outline-none focus:border-[#1a6fc4] focus:ring-1 focus:ring-[#1a6fc4]"
                            />
                          </div>
                        </div>
                        <div className="flex items-center self-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:self-auto">
                          <button
                            onClick={() => setHistoryViewMode('table')}
                            className={`rounded-md p-1.5 transition-colors ${
                              historyViewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Table View"
                          >
                            <List className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setHistoryViewMode('card')}
                            className={`rounded-md p-1.5 transition-colors ${
                              historyViewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                            }`}
                            title="Card View"
                          >
                            <LayoutGrid className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs text-slate-600">
                          Showing {visibleHistory.length} of {filteredHistory.length} records
                        </p>
                      </div>

                      {historyViewMode === 'table' ? (
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
                              {visibleHistory.length ? (
                                visibleHistory.map((period, idx) => (
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
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                    No records found.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {visibleHistory.length ? (
                            visibleHistory.map((period, idx) => (
                              <div key={idx} className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
                                selected?.period.start_date === period.start_date &&
                                selected?.period.end_date === period.end_date
                                  ? 'border-[#1a6fc4] bg-blue-50/50'
                                  : 'border-slate-100 bg-white'
                              }`}>
                                <div className="flex items-center justify-between border-b border-slate-100/50 pb-3">
                                  <h4 className="font-bold text-[#0F2D52]">{current?.frequency || '—'} Report</h4>
                                </div>
                                <div className="mt-4 grid gap-3 grid-cols-2">
                                  <div>
                                    <p className="text-xs text-slate-500">Start Date</p>
                                    <p className="font-semibold text-slate-700">{formatDate(period.start_date)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">End Date</p>
                                    <p className="font-semibold text-slate-700">{formatDate(period.end_date)}</p>
                                  </div>
                                </div>
                                <div className="mt-4 flex gap-2 pt-4 border-t border-slate-100/50">
                                  <Button className="flex-1" size="sm" variant="outline" onClick={() => void selectPeriod(period)} disabled={loading}>
                                    View
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    disabled={downloadingPeriod?.start_date === period.start_date}
                                    onClick={() => void downloadPeriodPdf(period)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full py-8 text-center text-slate-400">
                              No records found.
                            </div>
                          )}
                        </div>
                      )}

                      {visibleCount < filteredHistory.length && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            onClick={() => setVisibleCount((c) => c + 12)}
                          >
                            Load More ({filteredHistory.length - visibleCount} remaining)
                          </Button>
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
