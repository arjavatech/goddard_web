import React, { useEffect, useState } from 'react';
import { EmployeeLayout } from './EmployeeLayout';
import { TapTimeService, type AttendanceReport } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';

export function AttendanceReports() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { setItems((await TapTimeService.myReports(new URLSearchParams({ date }))).items); } catch (e: any) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  return <EmployeeLayout><main className="p-4 sm:p-6 lg:p-8"><div className="max-w-6xl mx-auto"><h1 className="text-2xl font-bold text-slate-900">My Attendance</h1><p className="mt-1 text-slate-500">Your TapTime attendance records.</p><div className="mt-6 rounded-xl border bg-white p-5 shadow-sm"><div className="flex gap-3 items-end"><label className="grid gap-1 text-sm font-medium">Date<input className="h-10 rounded-md border px-3" type="date" value={date} onChange={e => setDate(e.target.value)} /></label><Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={load}>View report</Button></div>{loading ? <div className="py-12"><Loading size="md" message="Loading attendance…" /></div> : error ? <p className="py-8 text-red-600">{error}</p> : <div className="mt-6 overflow-auto"><table className="w-full text-sm"><thead className="border-b text-left text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Check in</th><th className="p-3">Check out</th><th className="p-3">Worked</th></tr></thead><tbody>{items.length ? items.map((r, i) => <tr key={i} className="border-b"><td className="p-3">{r.date || date}</td><td className="p-3">{r.check_in_time ? new Date(r.check_in_time).toLocaleString() : '—'}</td><td className="p-3">{r.check_out_time ? new Date(r.check_out_time).toLocaleString() : 'Pending'}</td><td className="p-3">{r.time_worked || '—'}</td></tr>) : <tr><td className="p-6 text-slate-500" colSpan={4}>No attendance records found.</td></tr>}</tbody></table></div>}</div></div></main></EmployeeLayout>;
}
