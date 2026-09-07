import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, KeyRound, Link2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useUserContext } from '../../contexts/UserContext';
import { authedFetch, z } from '../../services/api/common';

type SetupStatus = { school_id: string; configured: boolean; message: string; active_staff_count?: number; connected_user_count?: number; unresolved_user_count?: number };
type TapTimeUser = { user_id: string; first_name: string; last_name: string; email: string; phone?: string | null; role: string; mapping_status: string };

const setupSchema = z.object({
  school_id: z.string(), configured: z.boolean(), message: z.string(),
  active_staff_count: z.number().optional(), connected_user_count: z.number().optional(), unresolved_user_count: z.number().optional(),
});
const usersSchema = z.object({ items: z.array(z.object({ user_id: z.string(), first_name: z.string(), last_name: z.string(), email: z.string(), phone: z.string().nullable().optional(), role: z.string(), mapping_status: z.string() })) });
const reconciliationSchema = z.object({ linked_count: z.number(), already_connected_count: z.number(), unresolved_count: z.number(), failed_user_ids: z.array(z.string()) });

/** TapTime setup and exact-email reconciliation are performed by Goddard's backend. */
export function TapTimeIntegration() {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkingCode, setLinkingCode] = useState('');
  const [busy, setBusy] = useState<'link' | 'sync' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [users, setUsers] = useState<TapTimeUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TapTimeUser | null>(null);
  const [pin, setPin] = useState('');

  const loadStatus = async () => {
    if (!schoolId) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      setStatus(await authedFetch({ method: 'GET', url: `/taptime/integration-status?school_id=${encodeURIComponent(schoolId)}` }, setupSchema));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load TapTime setup status.');
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    if (!schoolId || !status?.configured) return;
    try {
      setUsers((await authedFetch({ method: 'GET', url: `/taptime/users?school_id=${encodeURIComponent(schoolId)}` }, usersSchema)).items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load TapTime users.');
    }
  };

  const refresh = async () => { await loadStatus(); await loadUsers(); };
  useEffect(() => { void loadStatus(); }, [schoolId]);
  useEffect(() => { void loadUsers(); }, [schoolId, status?.configured]);

  const suggestPin = (phone?: string | null) => {
    const digits = (phone || '').replace(/\D/g, '');
    return digits.length >= 4 ? digits.slice(-4) : '';
  };

  const redeemCode = async () => {
    if (!schoolId || !linkingCode.trim()) return;
    setBusy('link'); setError(''); setNotice('');
    try {
      const result = await authedFetch({ method: 'POST', url: '/taptime/setup/redeem-linking-code', body: { school_id: schoolId, code: linkingCode.trim() } }, setupSchema);
      setStatus(result); setLinkingCode(''); setNotice(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect TapTime.');
    } finally { setBusy(null); }
  };

  const syncEmailMatches = async () => {
    if (!schoolId || !status?.configured) return;
    setBusy('sync'); setError(''); setNotice('');
    try {
      const result = await authedFetch({ method: 'POST', url: `/taptime/reconcile?school_id=${encodeURIComponent(schoolId)}` }, reconciliationSchema);
      setNotice(result.linked_count > 0
        ? `${result.linked_count} user${result.linked_count === 1 ? '' : 's'} connected by exact email. ${result.unresolved_count} still unresolved.`
        : `No new exact email matches were found. ${result.already_connected_count} already connected; ${result.unresolved_count} still unresolved.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sync TapTime email matches.');
    } finally { setBusy(null); }
  };

  const createUser = async () => {
    if (!schoolId || !selectedUser || !/^\d{4,10}$/.test(pin)) return;
    setBusy('link'); setError('');
    try {
      await authedFetch({ method: 'POST', url: '/taptime/user-mappings', body: { school_id: schoolId, goddard_user_id: selectedUser.user_id, pin } }, z.object({ status: z.string() }));
      setSelectedUser(null); setPin(''); setNotice(`${selectedUser.first_name} is now connected to TapTime.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create the TapTime user.');
    } finally { setBusy(null); }
  };

  return <AdminLayout><main className="min-h-full bg-[#f6f9fd] p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:p-6"><div className="rounded-xl bg-[#EFF5FB] p-2.5 text-[#0F2D52]"><Link2 className="h-5 w-5" /></div><div><h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">TapTime Integration</h1><p className="mt-1 text-xs font-semibold text-slate-400 sm:text-sm">Connect this school once, then manage TapTime from Goddard.</p></div></header>
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {loading ? <Loading size="md" message="Checking TapTime setup…" /> : !schoolId ? <p className="p-5 text-red-700">A school context is required.</p> : <div className="space-y-5">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center"><div className="flex items-center gap-3">{status?.configured ? <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div> : <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><CircleAlert className="h-5 w-5" /></div>}<div><p className="text-sm font-bold text-slate-900">{status?.configured ? 'TapTime connected' : 'TapTime setup required'}</p><p className="mt-0.5 text-xs font-semibold text-slate-400">{status?.message}</p></div></div><Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading || busy !== null}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button></div>
        <div className="space-y-5 p-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}
          {!status?.configured ? <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5"><div className="flex gap-3"><KeyRound className="mt-0.5 h-5 w-5 text-[#0F2D52]" /><div className="flex-1"><h2 className="text-sm font-bold text-slate-900">Connect this school</h2><p className="mt-1 text-sm text-slate-600">Enter the one-time TapTime linking code supplied during onboarding. It is company-scoped, expires automatically, and is never stored in Goddard.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><Input value={linkingCode} onChange={e => setLinkingCode(e.target.value)} placeholder="TapTime linking code" className="flex-1" autoComplete="off" /><Button className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white" onClick={() => void redeemCode()} disabled={!linkingCode.trim() || busy !== null}>{busy === 'link' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Connect TapTime</Button></div></div></div></div> : <>
            <div className="grid gap-3 sm:grid-cols-3"><StatusMetric label="Active staff" value={status?.active_staff_count ?? users.length} tone="slate" /><StatusMetric label="Connected users" value={status?.connected_user_count ?? users.filter(user => user.mapping_status === 'connected').length} tone="emerald" /><StatusMetric label="Unresolved users" value={status?.unresolved_user_count ?? users.filter(user => user.mapping_status !== 'connected').length} tone="amber" /></div>
            <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-sm font-bold text-slate-900">TapTime users</h2><p className="mt-1 text-sm text-slate-600">Exact email matches connect automatically. Sync again after correcting an email. Unresolved users are never created automatically.</p></div><Button size="sm" className="min-w-44 bg-[#0F2D52] text-white shadow-sm hover:bg-[#173d69] hover:text-white" onClick={() => void syncEmailMatches()} disabled={busy !== null}>{busy === 'sync' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy === 'sync' ? 'Syncing users…' : 'Sync email matches'}</Button></div>{users.map(user => <div key={user.user_id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{user.first_name} {user.last_name} <span className="ml-2 text-xs font-medium text-slate-500">{user.role}</span></p><p className="text-sm text-slate-500">{user.email}</p></div>{user.mapping_status === 'connected' ? <span className="text-sm font-semibold text-emerald-700">Connected</span> : <Button size="sm" onClick={() => { setSelectedUser(user); setPin(suggestPin(user.phone)); }} disabled={busy !== null}>Create in TapTime</Button>}</div>)}</div>
          </>}
          <div className="flex gap-2 rounded-xl bg-[#EFF5FB] p-4 text-sm text-slate-600"><ShieldCheck className="h-5 w-5 shrink-0 text-[#0F2D52]" /><span>Goddard sends all pairing and access-sync requests through its backend. Browser users never receive a TapTime service credential.</span></div>
        </div>
      </div>}
    </section>
    {selectedUser && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><h2 className="text-lg font-bold text-slate-900">Create TapTime user</h2><p className="mt-1 text-sm text-slate-600">{selectedUser.first_name} {selectedUser.last_name} · {selectedUser.role}</p><label className="mt-5 block text-sm font-semibold text-slate-700">Employee PIN</label><Input className="mt-2" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="4-digit PIN" inputMode="numeric" /><p className="mt-2 text-xs text-slate-500">The phone-based value is only a suggestion and can be changed.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" onClick={() => setSelectedUser(null)}>Cancel</Button><Button onClick={() => void createUser()} disabled={!/^\d{4,10}$/.test(pin) || busy !== null}>{busy === 'link' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create user</Button></div></div></div>}
  </div></main></AdminLayout>;
}

function StatusMetric({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'emerald' | 'amber' }) {
  const tones = { slate: 'border-slate-200 bg-slate-50 text-slate-900', emerald: 'border-emerald-100 bg-emerald-50 text-emerald-800', amber: 'border-amber-100 bg-amber-50 text-amber-800' };
  return <div className={`rounded-xl border p-4 ${tones[tone]}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>;
}
