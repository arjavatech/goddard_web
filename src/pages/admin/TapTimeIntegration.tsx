import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { CheckCircle2, CircleAlert, Link2, ShieldCheck } from 'lucide-react';

export function TapTimeIntegration() {
  const [data, setData] = useState<any>(null); const [error, setError] = useState('');
  useEffect(() => { TapTimeService.connection().then(setData).catch((e: Error) => setError(e.message)); }, []);
  return <AdminLayout><main className="p-4 sm:p-6 lg:p-8"><div className="max-w-5xl mx-auto"><h1 className="text-2xl font-bold text-slate-900">TapTime Integration</h1><p className="mt-1 text-slate-500">Connection and school mapping status for TapTime.</p><section className="mt-6 rounded-xl border bg-white p-6 shadow-sm">{!data && !error ? <Loading size="md" message="Checking TapTime connection…" /> : error ? <div className="flex gap-3 text-red-700"><CircleAlert /><div><p className="font-semibold">Connection needs attention</p><p className="text-sm mt-1">{error}</p></div></div> : <div className="space-y-5"><div className="flex items-center gap-3"><div className="rounded-full bg-emerald-100 p-2 text-emerald-700"><CheckCircle2 /></div><div><p className="font-semibold text-slate-900">TapTime connected</p><p className="text-sm text-slate-500">This school is ready to use attendance features.</p></div></div><dl className="grid gap-4 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">Connection status</dt><dd className="mt-1 font-medium capitalize text-slate-900">{data.status}</dd></div><div className="rounded-lg bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase text-slate-500">TapTime company</dt><dd className="mt-1 font-mono text-sm text-slate-900">{data.company_id}</dd></div></dl><div className="flex gap-2 text-sm text-slate-600"><ShieldCheck className="h-5 w-5 text-blue-700" /><span>Credentials and tokens are protected and never displayed in Goddard.</span></div></div>}</section></div></main></AdminLayout>;
}
