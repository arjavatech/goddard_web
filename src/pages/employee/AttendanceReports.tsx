import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Clock, Grid3x3, List } from 'lucide-react';
import { EmployeeLayout } from './EmployeeLayout';
import { TapTimeService, type AttendanceReport } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';

type ReportTab = 'day' | 'range' | 'pending';
type ViewMode = 'table' | 'card';

const today = () => new Date().toISOString().slice(0, 10);

function rowDate(report: AttendanceReport, fallback: string) {
  return report.date || report.check_in_time?.replace(' ', 'T').slice(0, 10) || fallback;
}

function displayTime(value?: string) {
  if (!value) return 'Pending';
  const date = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function AttendanceReports() {
  const [tab, setTab] = useState<ReportTab>('day');
  const [date, setDate] = useState(today());
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [items, setItems] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(() => window.innerWidth < 768 ? 'card' : 'table');
  const [rangeViewMode, setRangeViewMode] = useState<ViewMode>(() => window.innerWidth < 768 ? 'card' : 'table');
  const [pendingViewMode, setPendingViewMode] = useState<ViewMode>(() => window.innerWidth < 768 ? 'card' : 'table');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const currentViewMode = tab === 'day' ? viewMode : tab === 'range' ? rangeViewMode : pendingViewMode;

  const selectedDateLabel = tab === 'day' ? date : startDate;
  const title = tab === 'day' ? `Day-wise Report — ${date}` : tab === 'range' ? 'Date Range Report' : 'Pending Checkout';

  const load = async () => {
    if (tab === 'range' && startDate > endDate) {
      setError('Start date cannot be after end date.');
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (tab === 'pending') {
        setItems((await TapTimeService.myPending()).items);
      } else {
        const params = tab === 'day'
          ? new URLSearchParams({ date })
          : new URLSearchParams({ start_date: startDate, end_date: endDate });
        setItems((await TapTimeService.myReports(params)).items);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab, date, startDate, endDate]);

  const records = useMemo(() => items.map((item, index) => ({
    ...item,
    key: `${item.check_in_time || item.date || 'attendance'}-${index}`,
  })), [items]);

  return (
    <EmployeeLayout>
      <main className="min-h-full bg-[#f6f9fd] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header>
            <h1 className="text-2xl font-bold text-[#0F2D52]">My Attendance</h1>
            <p className="mt-1 text-slate-500">Your TapTime attendance records.</p>
          </header>

          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <nav className="flex gap-6 overflow-x-auto border-b border-slate-100 bg-slate-50/50 px-5">
              <TabButton active={tab === 'day'} icon={CalendarDays} onClick={() => setTab('day')}>Day-wise Report</TabButton>
              <TabButton active={tab === 'range'} icon={BarChart3} onClick={() => setTab('range')}>Date Range Report</TabButton>
              <TabButton active={tab === 'pending'} icon={Clock} onClick={() => setTab('pending')}>Pending Checkout</TabButton>
            </nav>

            <div className="p-5">
              <div className="flex flex-wrap items-end gap-3">
                {tab === 'day' ? (
                  <DateField label="Date" value={date} onChange={setDate} />
                ) : tab === 'range' ? (
                  <>
                    <DateField label="Start Date" value={startDate} onChange={setStartDate} />
                    <DateField label="End Date" value={endDate} onChange={setEndDate} />
                  </>
                ) : null}
                {tab !== 'pending' && (
                  <Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={() => void load()}>
                    View report
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="py-20"><Loading size="md" message="Loading attendance…" /></div>
              ) : error ? (
                <p className="py-10 text-sm text-red-600" role="alert">{error}</p>
              ) : (
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-[#0F2D52]">{title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{tab === 'pending' ? 'Records where you have checked in but not checked out' : 'Your check-in and check-out summary'}</p>
                    </div>
                    {(tab === 'day' || tab === 'range' || tab === 'pending') && (
                      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 h-10">
                        <button
                          type="button"
                          onClick={() => {
                            if (tab === 'day') setViewMode('table');
                            else if (tab === 'range') setRangeViewMode('table');
                            else setPendingViewMode('table');
                          }}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                            currentViewMode === 'table'
                              ? 'bg-white text-[#0F2D52] shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <List className="h-3.5 w-3.5" />
                          <span>Table</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (tab === 'day') setViewMode('card');
                            else if (tab === 'range') setRangeViewMode('card');
                            else setPendingViewMode('card');
                          }}
                          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
                            currentViewMode === 'card'
                              ? 'bg-white text-[#0F2D52] shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          <Grid3x3 className="h-3.5 w-3.5" />
                          <span>Cards</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-5">
                    {((tab === 'day' && currentViewMode === 'card') || (tab === 'range' && currentViewMode === 'card') || (tab === 'pending' && currentViewMode === 'card')) ? (
                      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {records.length ? records.map(record => (
                          <div key={record.key} className="rounded-2xl border border-slate-100 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md bg-white overflow-hidden">
                            <dl className="grid gap-2 border-t border-slate-100 pt-3 text-xs sm:text-sm text-slate-600">
                              <div className="flex justify-between gap-2 min-w-0">
                                <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Date</dt>
                                <dd className="text-right truncate font-semibold text-slate-900">{rowDate(record, selectedDateLabel)}</dd>
                              </div>
                              <div className="flex justify-between gap-2 min-w-0">
                                <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Check In</dt>
                                <dd className="text-right truncate">{record.check_in_time ? displayTime(record.check_in_time) : '—'}</dd>
                              </div>
                              <div className="flex justify-between gap-2 min-w-0">
                                <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Check Out</dt>
                                <dd className="text-right truncate">{displayTime(record.check_out_time)}</dd>
                              </div>
                              <div className="flex justify-between gap-2 min-w-0 font-semibold text-slate-800">
                                <dt className="flex-shrink-0 font-bold uppercase tracking-wider text-slate-500">Worked</dt>
                                <dd className="text-right truncate">{record.time_worked || '—'}</dd>
                              </div>
                            </dl>
                          </div>
                        )) : (
                          <div className="col-span-full py-12 text-center text-slate-500">No attendance records found for this selection.</div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full min-w-[720px] text-sm">
                          <thead className="bg-slate-50/80">
                            <tr>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Check In</th>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Check Out</th>
                              <th className="border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Worked</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records.length ? records.map(record => (
                              <tr key={record.key} className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]">
                                <td className="px-4 py-4 text-slate-600">{rowDate(record, selectedDateLabel)}</td>
                                <td className="px-4 py-4 text-slate-600">{record.check_in_time ? displayTime(record.check_in_time) : '—'}</td>
                                <td className="px-4 py-4">{record.check_out_time ? <span className="text-slate-600">{displayTime(record.check_out_time)}</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Pending</span>}</td>
                                <td className="px-4 py-4 font-semibold text-slate-700">{record.time_worked || '—'}</td>
                              </tr>
                            )) : (
                              <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={4}>No attendance records found for this selection.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </section>
        </div>
      </main>
    </EmployeeLayout>
  );
}

function TabButton({ active, icon: Icon, onClick, children }: { active: boolean; icon: typeof CalendarDays; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-bold transition ${active ? 'border-[#1a6fc4] text-[#0F2D52]' : 'border-transparent text-slate-500 hover:text-[#0F2D52]'}`}><Icon className="h-4 w-4" />{children}</button>;
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-semibold text-slate-700">{label}<input className="h-10 rounded-md border border-slate-200 bg-white px-3 text-slate-900 outline-none focus:border-[#0F2D52] focus:ring-2 focus:ring-[#0F2D52]/15" type="date" value={value} onChange={event => onChange(event.target.value)} /></label>;
}
