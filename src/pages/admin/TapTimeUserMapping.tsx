import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link2, Loader2, RefreshCw, Search } from 'lucide-react';

import { AdminLayout } from './AdminLayout';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { authedFetch, z } from '../../services/api/common';

type GoddardUser = {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: 'Employee' | 'Admin';
  mapping_status: 'mapped' | 'not_mapped';
  taptime_employee?: { emp_id?: string } | null;
};

type TapTimeUser = {
  emp_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_number?: string | null;
  is_admin?: number;
  role_label?: string;
  mapping_status?: 'mapped' | 'available';
};

const responseSchema = z.object({ items: z.array(z.any()) });

export function TapTimeUserMapping() {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;
  const [items, setItems] = useState<GoddardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<GoddardUser | null>(null);
  const [tapTimeUsers, setTapTimeUsers] = useState<TapTimeUser[]>([]);
  const [loadingTapTimeUsers, setLoadingTapTimeUsers] = useState(false);
  const [mappingEmpId, setMappingEmpId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [tapTimeQuery, setTapTimeQuery] = useState('');
  const candidateCacheRef = useRef<{ schoolId: string; users: TapTimeUser[] } | null>(null);
  const candidateRequestRef = useRef<Promise<TapTimeUser[]> | null>(null);

  const loadUsers = async () => {
    if (!schoolId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await authedFetch(
        { method: 'GET', url: `/taptime/mapping-users?school_id=${encodeURIComponent(schoolId)}` },
        responseSchema,
      );
      setItems(response.items as GoddardUser[]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load Goddard users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    candidateCacheRef.current = null;
    candidateRequestRef.current = null;
    setTapTimeUsers([]);
    void loadUsers();
  }, [schoolId]);

  const loadTapTimeUsers = async (forceRefresh = false): Promise<TapTimeUser[]> => {
    if (!schoolId) return [];
    const cached = candidateCacheRef.current;
    if (!forceRefresh && cached?.schoolId === schoolId) {
      setTapTimeUsers(cached.users);
      return cached.users;
    }
    if (candidateRequestRef.current) return candidateRequestRef.current;

    setLoadingTapTimeUsers(true);
    setDialogError('');
    const request = authedFetch(
      { method: 'GET', url: `/taptime/available-users?school_id=${encodeURIComponent(schoolId)}` },
      responseSchema,
    )
      .then((response) => {
        const users = response.items as TapTimeUser[];
        candidateCacheRef.current = { schoolId, users };
        setTapTimeUsers(users);
        return users;
      })
      .catch((requestError) => {
        const message = requestError instanceof Error ? requestError.message : 'Unable to load TapTime users.';
        setDialogError(message);
        throw requestError;
      })
      .finally(() => {
        setLoadingTapTimeUsers(false);
        if (candidateRequestRef.current === request) candidateRequestRef.current = null;
      });
    candidateRequestRef.current = request;
    return request;
  };

  const openFinder = async (user: GoddardUser) => {
    if (!schoolId) return;
    setSelected(user);
    setTapTimeUsers([]);
    setTapTimeQuery('');
    setDialogError('');
    try {
      await loadTapTimeUsers();
    } catch { /* The loader stores a user-safe message in dialogError. */ }
  };

  const mapUser = async (tapTimeUser: TapTimeUser) => {
    if (!schoolId || !selected || mappingEmpId) return;
    setMappingEmpId(tapTimeUser.emp_id);
    setDialogError('');
    try {
      await authedFetch(
        {
          method: 'POST',
          url: '/taptime/user-mappings',
          body: { school_id: schoolId, goddard_user_id: selected.user_id, taptime_emp_id: tapTimeUser.emp_id },
        },
        z.object({ status: z.literal('mapped') }),
      );
      const updatedUsers = tapTimeUsers.map((user) => user.emp_id === tapTimeUser.emp_id
        ? { ...user, mapping_status: 'mapped' as const }
        : user);
      candidateCacheRef.current = schoolId ? { schoolId, users: updatedUsers } : null;
      setTapTimeUsers(updatedUsers);
      setSelected(null);
      await loadUsers();
    } catch (requestError) {
      setDialogError(requestError instanceof Error ? requestError.message : 'Unable to save the mapping.');
    } finally {
      setMappingEmpId(null);
    }
  };

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => `${item.first_name} ${item.last_name} ${item.email} ${item.role}`.toLowerCase().includes(needle));
  }, [items, query]);

  const candidates = useMemo(() => {
    const needle = tapTimeQuery.trim().toLowerCase();
    if (!needle) return tapTimeUsers;
    return tapTimeUsers.filter((user) => `${user.first_name} ${user.last_name} ${user.email ?? ''} ${user.phone_number ?? ''}`.toLowerCase().includes(needle));
  }, [tapTimeUsers, tapTimeQuery]);
  const mappedTapTimeEmployeeIds = useMemo(() => new Set(
    items
      .filter((item) => item.mapping_status === 'mapped')
      .map((item) => item.taptime_employee?.emp_id)
      .filter((empId): empId is string => Boolean(empId)),
  ), [items]);
  const mappingInProgress = mappingEmpId !== null;

  return (
    <AdminLayout>
      <main className="min-h-full bg-[#f6f9fd] p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex gap-3">
              <div className="rounded-lg bg-blue-50 p-2 text-[#0F2D52]"><Link2 /></div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F2D52]">TapTime User Mapping</h1>
                <p className="mt-1 text-slate-600">Select only the Goddard users that should be connected to TapTime. No user is synchronized automatically.</p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50/50 p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row">
              <div>
                <h2 className="text-lg font-bold text-[#0F2D52]">Goddard users</h2>
                <p className="text-sm text-slate-500">Employees and Admins eligible for manual mapping.</p>
              </div>
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input className="pl-9" placeholder="Search users..." value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
            </div>
            </div>

            {loading ? <Loading size="md" message="Loading Goddard users..." /> : error ? <p className="py-8 text-red-600">{error}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50/80 text-left"><tr>{['User', 'Contact', 'Status', 'TapTime mapping', 'Action'].map(header => <th key={header} className="border-y border-slate-200/85 p-4 text-xs font-bold uppercase tracking-wider text-slate-500">{header}</th>)}</tr></thead>
                  <tbody>{rows.map((item) => {
                    const mapped = item.mapping_status === 'mapped';
                    return <tr className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]" key={item.user_id}>
                      <td className="p-4 font-bold text-[#0F2D52]">{item.first_name} {item.last_name}<div className="mt-1 text-xs font-medium text-slate-400">{item.role}</div></td>
                      <td className="p-4 font-medium text-slate-700">{item.email}<div className="text-xs font-medium text-slate-400">{item.phone || 'Phone required'}</div></td>
                      <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${mapped ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{mapped ? 'Mapped' : 'Not mapped'}</span></td>
                      <td className="p-4">{item.taptime_employee?.emp_id ? <span className="font-mono text-xs text-slate-600">{item.taptime_employee.emp_id}</span> : <span className="text-slate-300">—</span>}</td>
                      <td className="p-4">{mapped ? <span className="text-xs font-semibold text-slate-400">Mapping active</span> : <Button size="sm" className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white" onClick={() => void openFinder(item)}>Find TapTime user</Button>}</td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !mappingInProgress) setSelected(null); }}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F2D52]">Find TapTime user</DialogTitle>
            <DialogDescription>Choose the existing TapTime user to map to {selected?.first_name} {selected?.last_name}. This does not change either user record.</DialogDescription>
          </DialogHeader>
          {dialogError && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{dialogError}</p>}
          {loadingTapTimeUsers ? <Loading size="sm" message="Loading TapTime users..." /> : <>
            <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Search TapTime users..." value={tapTimeQuery} onChange={(event) => setTapTimeQuery(event.target.value)} /></div><Button type="button" variant="outline" size="icon" title="Refresh TapTime users" disabled={mappingInProgress} onClick={() => void loadTapTimeUsers(true)}><RefreshCw className="h-4 w-4" /></Button></div>
            <div className="mt-3 space-y-2">{candidates.length ? candidates.map((user) => {
              // The Goddard employee_id and the TapTime emp_id are unrelated.
              // The mapping record's taptime_employee.emp_id is the authoritative
              // link and remains available after a page refresh.
              const alreadyMapped = user.mapping_status === 'mapped' || mappedTapTimeEmployeeIds.has(user.emp_id);
              return <div key={user.emp_id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-800">{user.first_name} {user.last_name}</p><p className="mt-1 text-xs font-medium text-slate-400">{user.email || user.phone_number || 'No contact available'}</p></div>{alreadyMapped ? <Button type="button" disabled className="border border-emerald-200 bg-emerald-50 text-emerald-700 disabled:opacity-100">Already mapped</Button> : <Button className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 hover:text-white disabled:cursor-wait disabled:opacity-100" disabled={mappingInProgress} onClick={() => void mapUser(user)}>{mappingEmpId === user.emp_id ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mapping…</> : 'Map this user'}</Button>}</div>;
            }) : <p className="py-6 text-center text-sm text-slate-500">No TapTime users match this search.</p>}</div>
          </>}
          <DialogFooter><Button variant="outline" disabled={mappingInProgress} onClick={() => setSelected(null)}>Cancel</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
