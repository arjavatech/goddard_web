import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Eye, FileImage, FileText, RefreshCw, Upload, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ChildSelector } from '../components/dashboard/ChildSelector';
import { EmployeeLayout } from './employee/EmployeeLayout';
import { ParentLayout } from './parent/ParentLayout';
import { useUserContext } from '../contexts/UserContext';
import { completeDocumentUpload, documentFileUrl, documentUploadIntent, fetchDocumentHistory, fetchMyDocumentAssignments, type DocumentAssignment } from '../services/api/documentRequests';

type Audience = 'student' | 'employee';
type Status = 'pending' | 'submitted' | 'approved' | 'rejected' | 'overdue';
const statusStyle: Record<Status, string> = { pending: 'bg-amber-50 text-amber-700', submitted: 'bg-blue-50 text-blue-700', approved: 'bg-emerald-50 text-emerald-700', rejected: 'bg-rose-50 text-rose-700', overdue: 'bg-rose-50 text-rose-700' };
const statusBorder: Record<Status, string> = { pending: 'border-amber-200', submitted: 'border-blue-200', approved: 'border-emerald-200', rejected: 'border-rose-200', overdue: 'border-rose-300' };
const statusLabel: Record<Status, string> = { pending: 'Upload required', submitted: 'Submitted', approved: 'Approved', rejected: 'Re-upload required', overdue: 'Overdue · upload required' };
const assignmentStatus = (item: DocumentAssignment): Status => item.derived_status === 'overdue' ? 'overdue' : item.status as Status;
const date = (value?: string) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric', ...(value.includes('T') ? { hour: 'numeric', minute: '2-digit' } : {}) }).format(new Date(value)) : 'No due date';
const fileSize = (value?: number) => !value ? '' : value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;

export function MyDocuments({ audience }: { audience: Audience }) {
  const { userData } = useUserContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<DocumentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState(searchParams.get('child') || '');
  const [selected, setSelected] = useState<DocumentAssignment | null>(null);
  const [history, setHistory] = useState<Array<{event_type:string;actor_name?:string;reason?:string;created_at:string}>>([]);
  const [uploading, setUploading] = useState<DocumentAssignment | null>(null);
  const [uploadError, setUploadError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const isParent = audience === 'student';
  const schoolId = userData?.schoolId;
  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const first = await fetchMyDocumentAssignments({ school_id: schoolId, audience, page: 1, limit: 100 });
      const rest = await Promise.all(Array.from({ length: Math.max(0, Math.min(3, Math.ceil(first.total / 100)) - 1) }, (_, index) => fetchMyDocumentAssignments({ school_id: schoolId, audience, page: index + 2, limit: 100 })));
      setItems([first, ...rest].flatMap(page => page.items));
    } catch (error) { console.error('Unable to load documents', error); setUploadError('Unable to load documents. Please refresh and try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [schoolId, audience]);
  const children = useMemo(() => Array.from(new Map(items.map(item => [item.subject_name, item])).values()).map(item => ({ id: item.subject_name, name: item.subject_name, initials: item.subject_name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(), age: '', dob: '', enrollmentProgress: 0, formsCompleted: 0, totalForms: 0 })), [items]);
  useEffect(() => { if (isParent && children.length && !children.some(child => child.id === selectedChildId)) setSelectedChildId(children[0].id); }, [children, isParent, selectedChildId]);
  useEffect(() => { if (isParent && selectedChildId) setSearchParams({ child: selectedChildId }, { replace: true }); }, [isParent, selectedChildId, setSearchParams]);
  const visibleItems = isParent ? items.filter(item => item.subject_name === selectedChildId) : items;
  const summary = useMemo(() => ({ required: visibleItems.filter(item => ['pending', 'overdue'].includes(assignmentStatus(item))).length, submitted: visibleItems.filter(item => assignmentStatus(item) === 'submitted').length, approved: visibleItems.filter(item => assignmentStatus(item) === 'approved').length, rejected: visibleItems.filter(item => assignmentStatus(item) === 'rejected').length }), [visibleItems]);
  const openDetails = async (item: DocumentAssignment) => { setSelected(item); try { setHistory(await fetchDocumentHistory(item.id)); } catch { setHistory([]); } };
  const startUpload = (item: DocumentAssignment) => { setUploading(item); setUploadError(''); window.setTimeout(() => input.current?.click(), 0); };
  const upload = async (file?: File) => {
    if (!file || !uploading) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024) { setUploadError('Choose a PDF, JPG/JPEG, or PNG no larger than 10 MB.'); return; }
    try {
      const intent = await documentUploadIntent(uploading.id, file);
      const response = await fetch(intent.upload_url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!response.ok) throw new Error('Upload failed');
      await completeDocumentUpload(uploading.id, { storage_key: intent.storage_key, file_name: file.name, content_type: file.type, file_size_bytes: file.size });
      setUploading(null); await load();
    } catch (error) { console.error('Document upload failed', error); setUploadError('Document upload failed. Please try again.'); }
  };
  const content = <div className="mx-auto w-full max-w-6xl space-y-6 mt-16">
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">{isParent ? 'Documents' :        'Employee Documents'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">View required documents, upload or replace files, and follow their review status.</p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}className="rounded-xl text-xs font-bold">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
        {isParent && children.length >
         0 && 
        <div className="border-t border-slate-100">
          <ChildSelector children={children} selectedChildId={selectedChildId} onSelectChild={setSelectedChildId} showTitle={false} />
        </div>}
        </section>
        
        {isParent && selectedChildId && 
          <p className="-mt-2 text-sm text-slate-500">
            Showing document requirements for <span className="font-semibold text-slate-700">{selectedChildId}</span>.</p>}<section className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Summary label="Upload required" value={summary.required} /><Summary label="Submitted" value={summary.submitted} /><Summary label="Approved" value={summary.approved} /><Summary label="Re-upload needed" value={summary.rejected} /></section>{loading ? <div className="py-16 text-center text-sm text-slate-500">Loading documents…</div> : !visibleItems.length ? <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-500">No document requests are currently assigned.</div> : <section className="grid auto-rows-fr items-stretch gap-5 sm:grid-cols-2">{visibleItems.map(item => <DocumentCard key={item.id} item={item} onView={() => void openDetails(item)} onUpload={() => startUpload(item)} />)}</section>}<input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }} />{uploadError && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-medium text-white shadow-lg"><XCircle className="mr-2 inline h-4 w-4" />{uploadError}</div>}<DocumentDetails item={selected} history={history} onClose={() => setSelected(null)} onUpload={() => { if (selected) { setSelected(null); startUpload(selected); } }} /></div>;
  const Wrapper = isParent ? ParentLayout : EmployeeLayout;
  return <Wrapper>{content}</Wrapper>;
}

function Summary({ label, value }: { label: string; value: number }) { return <Card className="rounded-2xl border-slate-100 shadow-xs"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></CardContent></Card>; }
function DocumentCard({ item, onView, onUpload }: { item: DocumentAssignment; onView: () => void; onUpload: () => void }) { const status = assignmentStatus(item); const action = status === 'rejected' ? 'Re-upload document' : status === 'submitted' ? 'Replace document' : 'Upload document'; return <Card className={`h-full rounded-2xl bg-white shadow-xs ${statusBorder[status]}`}><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-bold text-slate-900">{item.document_name}</h2><p className="mt-1 text-sm text-slate-500">{item.instructions}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[status]}`}>{statusLabel[status]}</span></div><div className="mt-4 border-y border-slate-100 py-3 text-sm text-slate-600"><p>Due date: <span className="font-semibold">{date(item.due_date)}</span></p>{item.submitted_at ? <p className="mt-1 text-xs text-slate-500">Submitted {date(item.submitted_at)} · Version {item.version_count}</p> : <p className="mt-1 text-xs text-slate-400">Not submitted yet</p>}</div><StatusMessage item={item} status={status} /><div className="mt-auto flex flex-wrap gap-2 pt-5">{status !== 'approved' && <Button onClick={onUpload} className="order-1 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:text-white [&_svg]:text-white"><Upload className="mr-2 h-4 w-4" />{action}</Button>}{item.latest_submission_id && <Button variant="outline" onClick={onView} className="order-2 rounded-xl"><Eye className="mr-2 h-4 w-4" />View details</Button>}</div></CardContent></Card>; }
function StatusMessage({ item, status }: { item: DocumentAssignment; status: Status }) { const message = status === 'rejected' ? <><b>Re-upload instruction:</b> {item.rejection_reason}</> : status === 'approved' ? <><b>Review complete:</b> This document has been approved by the school.</> : status === 'submitted' ? <><b>Under review:</b> Your document was submitted and is waiting for school review.</> : status === 'overdue' ? <><b>Action needed:</b> This document is overdue. Upload it as soon as possible.</> : <><b>Upload guidance:</b> PDF, JPG, or PNG files up to 10 MB are accepted.</>; return <div className={`mt-4 min-h-[76px] rounded-xl p-3 text-sm ${statusStyle[status]}`}>{message}</div>; }
function DocumentDetails({ item, history, onClose, onUpload }: { item: DocumentAssignment | null; history: Array<{event_type:string;actor_name?:string;reason?:string;created_at:string}>; onClose: () => void; onUpload: () => void }) { const [url, setUrl] = useState(''); useEffect(() => { if (!item?.latest_submission_id) { setUrl(''); return; } void documentFileUrl(item.latest_submission_id).then(result => setUrl(result.url)).catch(() => setUrl('')); }, [item?.latest_submission_id]); const status = item ? assignmentStatus(item) : 'pending'; return <Dialog open={Boolean(item)} onOpenChange={open => !open && onClose()}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{item?.document_name}</DialogTitle></DialogHeader>{item && <div className="space-y-4"><div className="min-h-56 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">{url ? item.latest_content_type?.startsWith('image/') ? <img src={url} alt={item.latest_file_name || item.document_name} className="max-h-[55vh] w-full object-contain" /> : <iframe src={url} title={item.document_name} className="h-[55vh] w-full" /> : <div className="flex min-h-56 flex-col items-center justify-center text-slate-500">{item.latest_content_type?.startsWith('image/') ? <FileImage className="mb-3 h-11 w-11" /> : <FileText className="mb-3 h-11 w-11" />}<p>{item.latest_file_name}</p><p className="text-xs">{fileSize(item.latest_file_size_bytes)}</p></div>}</div><div><p className="mb-2 text-sm font-bold text-slate-800">Document history</p><div className="space-y-3">{history.map(entry => <div key={entry.id || `${entry.event_type}-${entry.created_at}`} className="flex gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" /><div><p className="font-semibold text-slate-700">{entry.event_type.replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{entry.actor_name || 'School'} · {date(entry.created_at)}</p>{entry.reason && <p className="mt-1 text-xs text-slate-600">{entry.reason}</p>}</div></div>)}</div></div>{status !== 'approved' && <Button onClick={onUpload} className="w-full rounded-xl bg-[#0F2D52] text-white hover:text-white [&_svg]:text-white"><Upload className="mr-2 h-4 w-4" />{status === 'rejected' ? 'Upload corrected document' : 'Replace document'}</Button>}</div>}</DialogContent></Dialog>; }
