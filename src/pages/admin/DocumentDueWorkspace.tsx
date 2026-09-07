import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckSquare, LayoutGrid, List, Mail, RefreshCw, Search } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { DocumentSectionTabs } from './DocumentSectionTabs';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Input } from '../../components/ui/input';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { Pagination } from '../../components/ui/pagination';
import { usePageSize } from '../../hooks/usePageSize';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { fetchDocumentAssignments, sendDocumentReminders, type DocumentAssignment } from '../../services/api/documentRequests';

type Audience = 'student' | 'employee';
type Status = 'pending' | 'rejected' | 'overdue';
const eligible = (item: DocumentAssignment) => ['pending', 'rejected', 'overdue'].includes(item.derived_status || item.status);
const dueStatus = (item: DocumentAssignment): Status => item.derived_status === 'overdue' ? 'overdue' : item.status === 'rejected' ? 'rejected' : 'pending';
const dueDate = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'No due date';

export function DocumentDueWorkspace({ audience }: { audience: Audience }) {
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const [items, setItems] = useState<DocumentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [view, setView] = useState<'table' | 'card'>('table');
  const [pageSize, setPageSize] = usePageSize(`document-due-${audience}`, 10);
  const [page, setPage] = useState(1);
  const schoolId = userData?.schoolId;
  const audienceLabel = audience === 'student' ? 'Student' : 'Employee';

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const first = await fetchDocumentAssignments({ school_id: schoolId, audience, page: 1, limit: 100 });
      const pageCount = Math.min(3, Math.ceil(first.total / 100));
      const remaining = await Promise.all(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchDocumentAssignments({ school_id: schoolId, audience, page: index + 2, limit: 100 })));
      setItems([first, ...remaining].flatMap(result => result.items).filter(eligible));
      setSelected([]);
      setPage(1);
    } catch (error) {
      console.error('Unable to load due documents', error);
      showToast('error', 'Unable to load due documents');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [schoolId, audience]);

  const filtered = useMemo(() => items.filter(item => {
    const matchesStatus = status === 'all' || dueStatus(item) === status;
    const needle = search.trim().toLowerCase();
    const matchesSearch = !needle || `${item.document_name} ${item.subject_name} ${item.parent_name || ''} ${item.parent_email || ''} ${item.employee_email || ''} ${item.classroom_name || ''}`.toLowerCase().includes(needle);
    return matchesStatus && matchesSearch;
  }), [items, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedVisible = pageItems.filter(item => selected.includes(item.id));
  const send = async (ids: string[], bulk = false) => {
    if (!schoolId || !ids.length) { showToast('error', 'Select at least one eligible document'); return; }
    if (ids.length > 300) { showToast('error', 'Select no more than 300 documents at one time'); return; }
    if (bulk) setBulkSending(true); else setSending(previous => new Set([...previous, ...ids]));
    try {
      const result = await sendDocumentReminders(schoolId, ids);
      showToast(result.total_failed ? 'error' : 'success', result.total_failed ? `${result.message}. Failed: ${result.failed_emails.join(', ')}` : result.message);
      setSelected([]);
    } catch (error) {
      console.error('Unable to send document reminder', error);
      showToast('error', 'Unable to send document reminder emails');
    } finally {
      if (bulk) setBulkSending(false); else setSending(previous => { const next = new Set(previous); ids.forEach(id => next.delete(id)); return next; });
    }
  };
  const toggle = (id: string, checked: boolean) => setSelected(previous => checked ? [...new Set([...previous, id])] : previous.filter(value => value !== id));
  const selectPage = (checked: boolean) => setSelected(previous => checked ? [...new Set([...previous, ...pageItems.map(item => item.id)])] : previous.filter(id => !pageItems.some(item => item.id === id)));
  const count = (next: Status) => filtered.filter(item => dueStatus(item) === next).map(item => item.id);

  return <AdminLayout><main className="container mx-auto space-y-6 px-2 pb-12 pt-0 sm:px-4 sm:pt-12">
    <section className="mt-16 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs sm:mt-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">{audienceLabel} Documents Due</h1><p className="mt-1 text-sm font-medium text-slate-500">Track outstanding uploads and send document reminders.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl"><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button></section>
    <DocumentSectionTabs audience={audience} section="due" />
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Metric label="Pending upload" value={items.filter(item => dueStatus(item) === 'pending').length} /><Metric label="Re-upload required" value={items.filter(item => dueStatus(item) === 'rejected').length} /><Metric label="Overdue" value={items.filter(item => dueStatus(item) === 'overdue').length} alert /></section>
    <Card className="overflow-hidden rounded-2xl border-slate-100 bg-white shadow-sm"><CardHeader className="border-b border-slate-100 bg-slate-50/50"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><CardTitle className="text-base">Documents needing action ({filtered.length})</CardTitle><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="h-10 w-64 rounded-xl pl-9" placeholder={audience === 'student' ? 'Search students, parents, or documents...' : 'Search employees or documents...'} /></div><select value={status} onChange={event => { setStatus(event.target.value as 'all' | Status); setPage(1); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold"><option value="all">All statuses</option><option value="pending">Pending</option><option value="rejected">Re-upload required</option><option value="overdue">Overdue</option></select><div className="flex rounded-xl border border-slate-200 bg-white p-1"><button onClick={() => setView('table')} className={`rounded-lg p-2 ${view === 'table' ? 'bg-slate-100 text-[#0F2D52]' : 'text-slate-400'}`}><List className="h-4 w-4" /></button><button onClick={() => setView('card')} className={`rounded-lg p-2 ${view === 'card' ? 'bg-slate-100 text-[#0F2D52]' : 'text-slate-400'}`}><LayoutGrid className="h-4 w-4" /></button></div><DropdownMenu><DropdownMenuTrigger asChild><Button disabled={bulkSending} className="rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:text-white"><Mail className="mr-2 h-4 w-4" />{bulkSending ? 'Sending...' : 'Remind'}</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem disabled={!selected.length || bulkSending} onClick={() => void send(selected, true)}>Remind Selected ({selected.length})</DropdownMenuItem><DropdownMenuItem disabled={!count('pending').length || bulkSending} onClick={() => void send(count('pending'), true)}>Remind Pending ({count('pending').length})</DropdownMenuItem><DropdownMenuItem disabled={!count('rejected').length || bulkSending} onClick={() => void send(count('rejected'), true)}>Remind Re-upload Required ({count('rejected').length})</DropdownMenuItem><DropdownMenuItem disabled={!count('overdue').length || bulkSending} onClick={() => void send(count('overdue'), true)}>Remind Overdue ({count('overdue').length})</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div></CardHeader><div className="flex justify-end border-b border-slate-100 p-3"><PageSizeSelector pageSize={pageSize} onPageSizeChange={size => { setPageSize(size); setPage(1); }} options={[10,25,50,100]} /></div><CardContent className="p-0">{loading ? <Empty label="Loading due documents..." /> : !filtered.length ? <Empty label="No documents currently need action." /> : view === 'table' ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="w-12 p-4"><Checkbox checked={pageItems.length > 0 && selectedVisible.length === pageItems.length} indeterminate={selectedVisible.length > 0 && selectedVisible.length < pageItems.length} onCheckedChange={checked => selectPage(Boolean(checked))} /></th><th className="p-4">{audience === 'student' ? 'Student / Parent' : 'Employee'}</th><th className="p-4">Document</th><th className="p-4">Due date</th><th className="p-4">Status</th><th className="p-4" /></tr></thead><tbody>{pageItems.map(item => <tr key={item.id} className="border-t border-slate-100"><td className="p-4"><Checkbox checked={selected.includes(item.id)} onCheckedChange={checked => toggle(item.id, Boolean(checked))} /></td><td className="p-4"><p className="font-bold text-slate-800">{item.subject_name}</p><p className="text-xs text-slate-500">{audience === 'student' ? `${item.parent_name || '—'} · ${item.parent_email || ''}` : item.employee_email}</p></td><td className="p-4"><p className="font-semibold text-slate-700">{item.document_name}</p>{item.rejection_reason && <p className="mt-1 max-w-xs truncate text-xs text-rose-600">{item.rejection_reason}</p>}</td><td className="p-4 whitespace-nowrap text-slate-600">{dueDate(item.due_date)}</td><td className="p-4"><StatusBadge value={dueStatus(item)} /></td><td className="p-4 text-right"><Button size="sm" onClick={() => void send([item.id])} disabled={sending.has(item.id)} className="rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:text-white"><Mail className="mr-1.5 h-3.5 w-3.5" />{sending.has(item.id) ? 'Sending...' : 'Send reminder'}</Button></td></tr>)}</tbody></table></div> : <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">{pageItems.map(item => <Card key={item.id} className="rounded-2xl border-slate-100"><CardContent className="space-y-4 p-5"><div className="flex items-start gap-3"><Checkbox checked={selected.includes(item.id)} onCheckedChange={checked => toggle(item.id, Boolean(checked))} /><div className="min-w-0"><p className="font-bold text-slate-900">{item.document_name}</p><p className="mt-1 text-xs text-slate-500">{item.subject_name}</p></div></div><div className="space-y-2 border-y border-slate-100 py-3 text-sm"><p className="text-slate-600">Due: <span className="font-semibold">{dueDate(item.due_date)}</span></p><StatusBadge value={dueStatus(item)} />{item.rejection_reason && <p className="text-xs text-rose-600">{item.rejection_reason}</p>}</div><Button onClick={() => void send([item.id])} disabled={sending.has(item.id)} className="w-full rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:text-white"><Mail className="mr-2 h-4 w-4" />{sending.has(item.id) ? 'Sending...' : 'Send reminder'}</Button></CardContent></Card>)}</div>}<div className="border-t border-slate-100 p-4"><Pagination currentPage={page} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={pageSize} onPageSizeChange={setPageSize} onPageChange={setPage} /></div></CardContent></Card>
  </main></AdminLayout>;
}

function Metric({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) { return <Card className="rounded-2xl border-slate-100 shadow-xs"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className={`mt-1 text-2xl font-extrabold ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p></CardContent></Card>; }
function StatusBadge({ value }: { value: Status }) { const style = value === 'overdue' ? 'bg-rose-50 text-rose-700' : value === 'rejected' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'; const label = value === 'rejected' ? 'Re-upload required' : value[0].toUpperCase() + value.slice(1); return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{value === 'overdue' && <AlertTriangle className="mr-1 h-3.5 w-3.5" />}{label}</span>; }
function Empty({ label }: { label: string }) { return <div className="py-16 text-center text-sm font-medium text-slate-500"><CheckSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />{label}</div>; }
