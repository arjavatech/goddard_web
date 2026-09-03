import React, { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BarChart3, CalendarDays, Clock3, Download, FileText, Grid2X2, List, Loader2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { TapTimeService, type AttendanceReport } from '../../services/api/tapTime';
import { Loading } from '../../components/ui/loading';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { authedFetch, z } from '../../services/api/common';
import { Pagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePageSize } from '../../hooks/usePageSize';
import { usePagination } from '../../hooks/usePagination';

type Tab = 'today' | 'daywise' | 'range' | 'pending';
type AttendanceUser = { external_employee_id: string; taptime_employee_id: string; first_name: string; last_name: string; email: string; role: string };

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'today', label: 'Today Report', icon: CalendarDays },
  { key: 'daywise', label: 'Day-wise Report', icon: CalendarDays },
  { key: 'range', label: 'Date Range Report', icon: BarChart3 },
  { key: 'pending', label: 'Pending Checkout', icon: Clock3 },
];

const today = () => new Date().toISOString().slice(0, 10);
const MANUAL_ATTENDANCE_TYPE = 'General Employee';
const reportDate = (report?: AttendanceReport | null) => report?.date || report?.check_in_time?.replace(' ', 'T').slice(0, 10) || '';
const reportTime = (value?: string) => value ? value.replace(' ', 'T').slice(11, 16) : '';
const timestamp = (date: string, time: string) => time ? `${date}T${time}:00` : null;
const attendanceUsersSchema = z.object({ items: z.array(z.object({ external_employee_id: z.string(), taptime_employee_id: z.string(), first_name: z.string(), last_name: z.string(), email: z.string(), role: z.string() })) });
const displayTime = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
const displayReportDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : '';

function timeWorked(date: string, checkIn: string, checkOut: string) {
  if (!checkOut) return 'Pending';
  const minutes = Math.floor((new Date(`${date}T${checkOut}`).getTime() - new Date(`${date}T${checkIn}`).getTime()) / 60000);
  if (minutes < 1) return 'Invalid time range';
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function TimeTracking() {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId || '';
  const [tab, setTab] = useState<Tab>('today');
  const [date, setDate] = useState(today());
  const [appliedDaywiseDate, setAppliedDaywiseDate] = useState(today());
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [items, setItems] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [itemsPerPage, setItemsPerPage] = usePageSize('time-tracking', 10);

  const [record, setRecord] = useState<AttendanceReport | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState<AttendanceReport | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [addDate, setAddDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [mappedUsers, setMappedUsers] = useState<AttendanceUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [defaultType, setDefaultType] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    let active = true;
    setFormLoading(true);
    Promise.all([
      authedFetch({ method: 'GET', url: `/taptime/attendance-users?school_id=${encodeURIComponent(schoolId)}` }, attendanceUsersSchema),
    ]).then(([users]) => {
      if (!active) return;
      setMappedUsers(users.items);
      setDefaultType(MANUAL_ATTENDANCE_TYPE);
    }).catch((e: unknown) => {
      if (active) setFormError(e instanceof Error ? e.message : 'Unable to prepare attendance entry settings.');
    }).finally(() => { if (active) setFormLoading(false); });
    return () => { active = false; };
  }, [schoolId]);

  const load = async () => {
    const requestedTab = tab;
    const requestedDate = requestedTab === 'today' ? today() : date;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(requestedTab === 'range' ? { start_date: start, end_date: end } : { date: requestedDate });
      const response = requestedTab === 'pending' ? await TapTimeService.pending() : await TapTimeService.schoolReports(params);
      setItems(response.items);
      if (requestedTab === 'daywise') setAppliedDaywiseDate(requestedDate);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [tab]);

  const filtered = useMemo(() => items.filter(item =>
    `${item.name || ''} ${item.email || ''} ${item.date || ''}`.toLowerCase().includes(query.toLowerCase()),
  ), [items, query]);
  const { currentPage, totalPages, paginatedData: paginatedReports, setCurrentPage } = usePagination({ data: filtered, itemsPerPage });
  const activeDate = tab === 'today' ? today() : tab === 'daywise' ? date : '';

  useEffect(() => { setCurrentPage(1); }, [items, query, tab, setCurrentPage]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const downloadCsv = () => {
    const rows = [['Employee', 'Username', 'Date', 'Check in', 'Check out', 'Worked'], ...filtered.map(item => [item.name || '', item.email || '', item.date || '', item.check_in_time || '', item.check_out_time || '', item.time_worked || ''])];
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([rows.map(row => row.map(value => `"${value}"`).join(',')).join('\n')], { type: 'text/csv' }));
    link.download = 'taptime-report.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportPdf = () => {
    const document = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const reportTitle = tab === 'today' ? "Today's Attendance Report" : title;

    document.setFontSize(18);
    document.setTextColor(15, 45, 82);
    document.text('The Goddard School', 40, 42);
    document.setFontSize(13);
    document.setTextColor(30, 41, 59);
    document.text(reportTitle, 40, 66);
    document.setFontSize(9);
    document.setTextColor(100, 116, 139);
    document.text(`Exported on ${new Date().toLocaleDateString()} • ${filtered.length} record${filtered.length === 1 ? '' : 's'}`, 40, 84);

    autoTable(document, {
      startY: 104,
      head: [['Employee', 'Username', 'Date', 'Check In', 'Check Out', 'Worked']],
      body: filtered.map(item => [
        item.name || '—',
        item.email || '—',
        item.date || '—',
        displayTime(item.check_in_time),
        item.check_out_time ? displayTime(item.check_out_time) : 'Pending',
        item.time_worked || '—',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [15, 45, 82], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 7, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
    });

    document.save(`taptime-attendance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const openEdit = (item: AttendanceReport) => {
    setRecord(item);
    setEditDate(reportDate(item));
    setCheckInTime(reportTime(item.check_in_time));
    setCheckOutTime(reportTime(item.check_out_time));
    setFormError('');
    setEditOpen(true);
  };

  const openAdd = () => {
    if (!schoolId || !activeDate) return;
    setFormError('');
    setAddDate(activeDate);
    setSelectedUserId('');
    setCheckInTime('');
    setCheckOutTime('');
    setAddOpen(true);
  };

  const openDelete = (item: AttendanceReport) => {
    setDeleteRecord(item);
    setFormError('');
    setDeleteOpen(true);
  };

  const removeReport = async () => {
    if (!deleteRecord?.emp_id || !deleteRecord.check_in_time) return;
    setDeleting(true);
    setFormError('');
    try {
      await TapTimeService.deleteReport(deleteRecord.emp_id, deleteRecord.check_in_time);
      setDeleteOpen(false);
      setDeleteRecord(null);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Unable to delete the report.');
    } finally {
      setDeleting(false);
    }
  };

  const validateTimeValues = (selectedDate: string, checkIn: string, checkOut: string, checkoutRequired: boolean) => {
    if (!checkIn) return 'Check-In Time is required.';
    if (checkoutRequired && !checkOut) return 'Check-Out Time is required.';
    if (checkOut && timeWorked(selectedDate, checkIn, checkOut) === 'Invalid time range') {
      return 'Check-Out Time must be at least 1 minute after Check-In Time.';
    }
    return '';
  };

  const validateTimes = (selectedDate: string, checkoutRequired: boolean) => {
    return validateTimeValues(selectedDate, checkInTime, checkOutTime, checkoutRequired);
  };

  const updatePendingTime = (field: 'check_in' | 'check_out', value: string) => {
    const nextCheckIn = field === 'check_in' ? value : checkInTime;
    const nextCheckOut = field === 'check_out' ? value : checkOutTime;
    if (field === 'check_in') setCheckInTime(value); else setCheckOutTime(value);
    setFormError(nextCheckOut ? validateTimeValues(editDate, nextCheckIn, nextCheckOut, true) : '');
  };

  const saveEdit = async () => {
    if (!record?.emp_id || !record.check_in_time) return;
    const pending = !record.check_out_time;
    const validationError = validateTimes(editDate, pending);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await TapTimeService.correctReport(record.emp_id, {
        original_check_in_time: record.check_in_time,
        check_in_time: timestamp(editDate, checkInTime)!,
        check_out_time: timestamp(editDate, checkOutTime),
        type_id: record.type || null,
      });
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Unable to save the correction.');
    } finally {
      setSaving(false);
    }
  };

  const saveAdd = async () => {
    const validationError = validateTimes(addDate, false);
    if (validationError) { setFormError(validationError); return; }
    if (!selectedUserId) { setFormError('Select a Username.'); return; }
    if (!defaultType) { setFormError('Configure the school TapTime default Type in Settings before adding an entry.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await TapTimeService.createManualReport({
          external_employee_id: selectedUserId,
        check_in_time: timestamp(addDate, checkInTime),
        check_out_time: timestamp(addDate, checkOutTime),
        type_id: defaultType,
      });
      setAddOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Unable to add attendance entry.');
    } finally {
      setSaving(false);
    }
  };

  const title = tab === 'daywise' ? `Day-wise Report - ${displayReportDate(appliedDaywiseDate)}` : tab === 'today' ? `Today's Report - ${displayReportDate(today())}` : tabs.find(value => value.key === tab)?.label || 'Reports';

  return (
    <AdminLayout>
      <main className="min-h-full bg-[#f6f9fd] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:p-6">
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h1 className="text-2xl font-bold text-[#0F2D52]">Reports &amp; Analytics</h1><p className="mt-1 text-sm text-slate-600">View and correct employee time tracking data</p></div>
            <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={downloadCsv} disabled={!filtered.length}><Download className="mr-2 h-4 w-4" />Export CSV</Button><Button variant="outline" onClick={exportPdf} disabled={!filtered.length}><FileText className="mr-2 h-4 w-4" />Export PDF</Button></div>
          </div>
        </header>
        <div className="grid gap-4 sm:grid-cols-2"><Stat icon={Users} label={tab === 'pending' ? 'Affected Employees' : tab === 'today' ? 'Checked-in Employees' : 'Total Employees'} value={String(new Set(filtered.map(item => item.emp_id || item.name)).size)} color="text-blue-600" /><Stat icon={Clock3} label={tab === 'pending' ? 'Pending Checkouts' : tab === 'today' ? 'Currently Working' : 'Total Records'} value={String(tab === 'today' ? filtered.filter(item => item.check_in_time && !item.check_out_time).length : filtered.length)} color="text-emerald-600" /></div>
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"><div className="border-b border-slate-100 bg-slate-50/50 px-5"><nav className="flex gap-6 overflow-x-auto">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-bold ${tab === key ? 'border-[#1a6fc4] text-[#0F2D52]' : 'border-transparent text-slate-500 hover:text-[#0F2D52]'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav></div>
        <div className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">{tab === 'daywise' && <DateField label="Select Date" value={date} onChange={setDate} />}{tab === 'range' && <><DateField label="Start Date" value={start} onChange={setStart} /><DateField label="End Date" value={end} onChange={setEnd} /></>}{(tab === 'daywise' || tab === 'range') && <Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={() => void load()}>View Report</Button>}</div>
            <div className="flex flex-wrap gap-3"><div className="relative max-w-md flex-1"><Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${query ? 'text-[#0F2D52]' : 'text-slate-400'}`} /><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search reports..." className="pl-9" /></div><div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1"><button type="button" onClick={() => setView('table')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${view === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><List className="h-3.5 w-3.5" />Table</button><button type="button" onClick={() => setView('grid')} className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${view === 'grid' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><Grid2X2 className="h-3.5 w-3.5" />Cards</button></div></div>
          </div>
          {loading ? <div className="py-20"><Loading size="md" message="Loading reports…" /></div> : error ? <p className="py-10 text-red-600">{error}</p> : <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold text-[#0F2D52]">{title}</h2><p className="mt-1 text-sm text-slate-600">Employee check-in and check-out summary</p></div>{activeDate && <Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Entry</Button>}</div>{filtered.length === 0 ? <div className="py-20 text-center"><FileText className="mx-auto h-12 w-12 text-slate-400" /><h3 className="mt-4 text-lg font-bold text-[#0F2D52]">No Records Found</h3><p className="mt-2 text-sm text-slate-600">No entries found for this selection.</p></div> : <><div className="mt-6 flex justify-end"><PageSizeSelector pageSize={itemsPerPage} onPageSizeChange={handleItemsPerPageChange} /></div>{view === 'grid' ? <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paginatedReports.map((item, index) => <ReportCard key={`${item.emp_id}-${item.check_in_time}-${index}`} item={item} onEdit={() => openEdit(item)} onDelete={() => openDelete(item)} pending={tab === 'pending'} />)}</div> : <ReportTable items={paginatedReports} onEdit={openEdit} onDelete={openDelete} pending={tab === 'pending'} />}<Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} /></>}</section>}
        </div></section></div>
      </main>
      <AttendanceDialog open={editOpen} onOpenChange={setEditOpen} mode="edit" record={record} username={record ? `${record.name || 'Employee'}${record.email ? ` — ${record.email}` : ''}` : ''} date={editDate} checkInTime={checkInTime} checkOutTime={checkOutTime} error={formError} saving={saving} onDate={setEditDate} onCheckIn={value => updatePendingTime('check_in', value)} onCheckOut={value => updatePendingTime('check_out', value)} onSave={() => void saveEdit()} />
      <AttendanceDialog open={addOpen} onOpenChange={setAddOpen} mode="add" username={selectedUserId} users={mappedUsers} date={addDate} checkInTime={checkInTime} checkOutTime={checkOutTime} error={formError} saving={saving || formLoading} onUsername={setSelectedUserId} onDate={setAddDate} onCheckIn={setCheckInTime} onCheckOut={setCheckOutTime} onSave={() => void saveAdd()} />
      <Dialog open={deleteOpen} onOpenChange={open => { if (!deleting) setDeleteOpen(open); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Delete attendance report?</DialogTitle><DialogDescription>This removes the {reportDate(deleteRecord)} report for {deleteRecord?.name || 'this employee'} from active reports. This action can be recovered only by TapTime operations.</DialogDescription></DialogHeader>{formError && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button><Button variant="destructive" onClick={() => void removeReport()} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete report</Button></DialogFooter></DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) { return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs"><div className="flex items-center justify-between"><div><p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p></div><div className="rounded-xl bg-[#EFF5FB] p-2.5"><Icon className={`h-4 w-4 ${color}`} /></div></div></div>; }
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">{label}<Input type="date" value={value} max={today()} onChange={event => onChange(event.target.value)} className="w-auto min-w-44" /></label>; }
function ReportTable({ items, onEdit, onDelete, pending }: { items: AttendanceReport[]; onEdit: (item: AttendanceReport) => void; onDelete: (item: AttendanceReport) => void; pending: boolean }) { return <div className="mt-6 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full min-w-[720px] text-sm"><thead className="bg-slate-50/80"><tr>{['Employee', 'Date', 'Check In', 'Check Out', 'Worked', 'Action'].map((header, index) => <th key={header} className={`border-y border-slate-200/85 px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500 ${index === 5 ? 'text-right' : ''}`}>{header}</th>)}</tr></thead><tbody>{items.map((item, index) => <tr className="border-b border-slate-50 transition-colors hover:bg-[#F8FAFC]" key={`${item.emp_id}-${item.check_in_time}-${index}`}><td className="px-4 py-4"><p className="font-bold text-[#0F2D52]">{item.name || 'Employee'}</p><p className="text-xs text-slate-400">{item.email || '—'}</p></td><td className="px-4 py-4 text-slate-600">{item.date || '—'}</td><td className="px-4 py-4 text-slate-600">{displayTime(item.check_in_time)}</td><td className="px-4 py-4">{item.check_out_time ? <span className="text-slate-600">{displayTime(item.check_out_time)}</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">Pending</span>}</td><td className="px-4 py-4 font-semibold text-slate-700">{item.time_worked || '—'}</td><td className="px-4 py-4"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => onEdit(item)}><Pencil className="mr-1 h-3.5 w-3.5" />{pending ? 'Complete & Edit' : 'Edit'}</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={() => onDelete(item)}><Trash2 className="mr-1 h-3.5 w-3.5" />Delete</Button></div></td></tr>)}</tbody></table></div>; }
function ReportCard({ item, onEdit, onDelete, pending }: { item: AttendanceReport; onEdit: () => void; onDelete: () => void; pending: boolean }) { return <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all hover:shadow-md"><div className="flex justify-between gap-3"><div><p className="font-bold text-[#0F2D52]">{item.name || 'Employee'}</p><p className="mt-1 text-xs font-medium text-slate-400">{item.email || '—'}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" />{pending ? 'Complete' : 'Edit'}</Button><Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /><span className="sr-only">Delete</span></Button></div></div><dl className="mt-4 grid gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600"><div className="flex justify-between"><dt>Date</dt><dd>{item.date || '—'}</dd></div><div className="flex justify-between"><dt>Check in</dt><dd>{displayTime(item.check_in_time)}</dd></div><div className="flex justify-between"><dt>Check out</dt><dd>{item.check_out_time ? displayTime(item.check_out_time) : 'Pending'}</dd></div><div className="flex justify-between font-semibold text-slate-800"><dt>Worked</dt><dd>{item.time_worked || '—'}</dd></div></dl></div>; }

function AttendanceDialog({ open, onOpenChange, mode, record, username, users = [], date, checkInTime, checkOutTime, error, saving, onUsername, onDate, onCheckIn, onCheckOut, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; mode: 'add' | 'edit'; record?: AttendanceReport | null; username: string; users?: AttendanceUser[]; date: string; checkInTime: string; checkOutTime: string; error: string; saving: boolean; onUsername?: (value: string) => void; onDate?: (value: string) => void; onCheckIn: (value: string) => void; onCheckOut: (value: string) => void; onSave: () => void }) {
  const pending = mode === 'edit' && !record?.check_out_time;
  const description = pending ? 'Choose the correct date and enter a Check-Out Time at least 1 minute after Check-In.' : 'Date, Check-In Time, and Check-Out Time can be changed. TapTime calculates Time Worked.';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{mode === 'add' ? 'Add Attendance Entry' : pending ? 'Complete Pending Check-Out' : 'Edit Attendance Entry'}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="grid min-w-0 gap-4 py-2">
          <label className="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Username{mode === 'add' ? <select value={username} onChange={event => onUsername?.(event.target.value)} disabled={saving} className="h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#0F2D52] focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15"><option value="">Select Username</option>{users.map(user => <option key={user.external_employee_id} value={user.external_employee_id}>{user.first_name} {user.last_name} — {user.email}</option>)}</select> : <Input value={username} readOnly className="bg-slate-50 text-slate-600" />}</label>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Date<Input type="date" value={date} max={today()} onChange={event => onDate?.(event.target.value)} disabled={saving} /></label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><span className="flex h-5 items-center">Check-In Time</span><Input type="time" value={checkInTime} onChange={event => onCheckIn(event.target.value)} disabled={saving} /></label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><span className="flex h-5 items-center gap-1">Check-Out Time{pending && <span className="text-red-600">*</span>}</span><Input type="time" value={checkOutTime} onChange={event => onCheckOut(event.target.value)} disabled={saving} /></label>
          </div>
          {!pending && <div className="rounded-xl bg-slate-50 p-3 text-sm"><span className="text-slate-600">Time Worked</span><p className="mt-1 font-semibold text-[#0F2D52]">{timeWorked(date, checkInTime, checkOutTime)}</p></div>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button className="bg-[#0F2D52] text-white hover:bg-[#173d69] hover:text-white" onClick={onSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === 'add' ? 'Add Entry' : pending ? 'Complete Check-Out' : 'Save Correction'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
