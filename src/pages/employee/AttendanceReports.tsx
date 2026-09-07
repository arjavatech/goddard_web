import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays } from 'lucide-react';
import { EmployeeLayout } from './EmployeeLayout';
import { TapTimeService, type AttendanceReport } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';

type ReportTab = 'day' | 'range';

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

  const selectedDateLabel = tab === 'day' ? date : startDate;
  const title = tab === 'day' ? `Day-wise Report — ${date}` : 'Date Range Report';

  const load = async () => {
    if (tab === 'range' && startDate > endDate) {
      setError('Start date cannot be after end date.');
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = tab === 'day'
        ? new URLSearchParams({ date })
        : new URLSearchParams({ start_date: startDate, end_date: endDate });
      setItems((await TapTimeService.myReports(params)).items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

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
            </nav>

            <div className="p-5">
              <div className="flex flex-wrap items-end gap-3">
                {tab === 'day' ? (
                  <DateField label="Date" value={date} onChange={setDate} />
                ) : (
                  <>
                    <DateField label="Start Date" value={startDate} onChange={setStartDate} />
                    <DateField label="End Date" value={endDate} onChange={setEndDate} />
                  </>
                )}
                <Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={() => void load()}>
                  View report
                </Button>
              </div>

              {loading ? (
                <div className="py-20"><Loading size="md" message="Loading attendance…" /></div>
              ) : error ? (
                <p className="py-10 text-sm text-red-600" role="alert">{error}</p>
              ) : (
                <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F2D52]">{title}</h2>
                    <p className="mt-1 text-sm text-slate-600">Your check-in and check-out summary</p>
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-sm">
                      <thead className="border-y border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                        <tr><th className="p-3">Date</th><th className="p-3">Check In</th><th className="p-3">Check Out</th><th className="p-3">Worked</th></tr>
                      </thead>
                      <tbody>
                        {records.length ? records.map(record => (
                          <tr key={record.key} className="border-b border-slate-200 last:border-0">
                            <td className="p-3 font-medium text-slate-800">{rowDate(record, selectedDateLabel)}</td>
                            <td className="p-3 text-slate-700">{record.check_in_time ? displayTime(record.check_in_time) : '—'}</td>
                            <td className="p-3 text-slate-700">{displayTime(record.check_out_time)}</td>
                            <td className="p-3 font-medium text-slate-800">{record.time_worked || '—'}</td>
                          </tr>
                        )) : (
                          <tr><td className="p-12 text-center text-slate-500" colSpan={4}>No attendance records found for this selection.</td></tr>
                        )}
                      </tbody>
                    </table>
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
