import { useEffect, useMemo, useState } from 'react';
import { Check, Eye, FileCheck2, Mail, MoreHorizontal, Pencil, Plus, RefreshCw, Search, Send, Upload, X } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Pagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { usePageSize } from '../../hooks/usePageSize';
import { useUserContext } from '../../contexts/UserContext';
import { createDocumentRequest, documentFileUrl, documentUploadIntent, completeDocumentUpload, sendDocumentReminders, fetchDocumentAssignments, fetchDocumentRecipients, fetchDocumentRequests, fetchRecipientsForRequest, publishDocumentRequest, reviewDocument, updateDocumentRequest, assignDocumentRecipients, type DocumentAssignment, type DocumentRecipient, type DocumentRequest } from '../../services/api/documentRequests';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { DocumentSectionTabs } from './DocumentSectionTabs';
import { ApproveFormModal } from '../../components/admin/ApproveFormModal';
import { UploadDocumentModal } from '../../components/admin/UploadDocumentModal';

type Props = { audience:'student'|'employee'; mode:'manage'|'due'|'review' };
const label = (audience:Props['audience']) => audience === 'student' ? 'Student' : 'Employee';
const displayDate = (value?:string) => value || '—';

export function DocumentWorkspace({ audience, mode }:Props) {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [page, setPage] = useState({items:[] as DocumentAssignment[], total:0, page:1, limit:10});
  const [loading, setLoading] = useState(true); const [search,setSearch] = useState(''); const [status,setStatus] = useState('');
  const [itemsPerPage,setItemsPerPage] = usePageSize(`documents-${audience}-${mode}`,10); const [currentPage,setCurrentPage]=useState(1);
  const [createOpen,setCreateOpen]=useState(false); const [reviewing,setReviewing]=useState<DocumentAssignment|null>(null); const [reason,setReason]=useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false); const [rejectError, setRejectError] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDocApproveModalOpen, setIsDocApproveModalOpen] = useState(false);
  const [docUploading, setDocUploading] = useState<DocumentAssignment | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [remindingIds, setRemindingIds] = useState<Set<string>>(new Set());
  const isEditable = userData?.role === 'Admin' || userData?.role === 'SuperAdmin';
  const [form,setForm]=useState({document_name:'',instructions:'',due_date:'',target:'all'});
  const [recipients,setRecipients]=useState<DocumentRecipient[]>([]); const [selectedIds,setSelectedIds]=useState<string[]>([]);
  const [editTarget,setEditTarget]=useState<DocumentRequest|null>(null); const [editForm,setEditForm]=useState({document_name:'',instructions:'',due_date:''}); const [isSavingEdit,setIsSavingEdit]=useState(false);
  const [assignTarget,setAssignTarget]=useState<DocumentRequest|null>(null); const [assignMode,setAssignMode]=useState<'all'|'selected'|null>(null); const [assignRecipients,setAssignRecipients]=useState<(DocumentRecipient&{is_assigned:boolean})[]>([]); const [assignSelectedIds,setAssignSelectedIds]=useState<string[]>([]); const [isAssigning,setIsAssigning]=useState(false);
  const load = async () => { if (!schoolId) return; setLoading(true); try {
    if (mode === 'manage') setRequests(await fetchDocumentRequests(schoolId,audience));
    else setPage(await fetchDocumentAssignments({school_id:schoolId,audience,status:mode === 'review' ? 'submitted' : status || undefined,search,page:currentPage,limit:itemsPerPage}, mode === 'review'));
  } finally { setLoading(false); } };
  useEffect(() => {
    setRequests([]);
    setPage({items:[], total:0, page:1, limit:10});
    setSearch('');
    setCurrentPage(1);
    setStatus('');
  }, [audience, mode]);
  useEffect(()=>{ void load(); },[schoolId,audience,mode,currentPage,itemsPerPage,status]);
  useEffect(()=>{ if(createOpen&&schoolId)void fetchDocumentRecipients(schoolId,audience).then(setRecipients); },[createOpen,schoolId,audience]);
  useEffect(()=>{ if(editTarget)setEditForm({document_name:editTarget.document_name,instructions:editTarget.instructions||'',due_date:editTarget.due_date||''}); },[editTarget]);
  useEffect(()=>{ if(assignTarget&&assignMode==='selected'&&schoolId)void fetchRecipientsForRequest(schoolId,audience,assignTarget.id).then(setAssignRecipients); },[assignTarget,assignMode,schoolId,audience]);
  const title = mode === 'manage' ? `${label(audience)} Document Requests` : mode === 'review' ? `Review ${label(audience)} Documents` : `${label(audience)} Documents Due`;
  const subtitle = mode === 'manage' ? `Create, publish, and track document requests for ${audience === 'student' ? 'students and parents' : 'employees'}.` : mode === 'review' ? 'Review submitted documents and approve or request a re-upload.' : 'Track documents that are pending, rejected, or overdue.';
  const totalPages=Math.max(1,Math.ceil(page.total/itemsPerPage));
  const filtered = useMemo(()=>requests.filter(r=>!search || `${r.document_name} ${r.instructions||''}`.toLowerCase().includes(search.toLowerCase())),[requests,search]);
  const create = async () => { 
    if (!schoolId || !form.document_name.trim() || (form.target==='selected'&&!selectedIds.length) || isPublishing) return; 
    setIsPublishing(true);
    try {
      const created=await createDocumentRequest({school_id:schoolId,audience,document_name:form.document_name,instructions:form.instructions||null,due_date:form.due_date||null,target:form.target, ...(audience==='student'?{child_ids:selectedIds}:{employee_ids:selectedIds})}); 
      await publishDocumentRequest(created.id); 
      setCreateOpen(false); 
      setForm({document_name:'',instructions:'',due_date:'',target:'all'});
      setSelectedIds([]); 
      await load(); 
    } finally {
      setIsPublishing(false);
    }
  };
  const review = async (next:'approved'|'rejected') => { 
    if (!reviewing || isSubmittingReview) return;
    if (next === 'rejected' && !reason.trim()) {
      setRejectError(true);
      return;
    }
    setRejectError(false);
    setIsSubmittingReview(true);
    try {
      await reviewDocument(reviewing.id, next, reason || undefined);
      setReviewing(null);
      setReason('');
      await load();
    } finally {
      setIsSubmittingReview(false);
    }
  };
  const handleDocApproveConfirm = async (data: { formAcademicYear?: string; approvedFormName: string }) => {
    if (!reviewing || isSubmittingReview) return;
    setIsSubmittingReview(true);
    try {
      await reviewDocument(reviewing.id, 'approved', reason || undefined, data.formAcademicYear, data.approvedFormName);
      setIsDocApproveModalOpen(false);
      setReviewing(null);
      setReason('');
      await load();
    } finally {
      setIsSubmittingReview(false);
    }
  };
  const handleDocUploadWithApproval = async (data: { file: File; approvedFormName: string; formAcademicYear?: string }) => {
    if (!docUploading || !schoolId) return;
    setIsUploadingDoc(true);
    try {
      const { storage_key, upload_url } = await documentUploadIntent(docUploading.id, data.file);
      await fetch(upload_url, { method: 'PUT', body: data.file, headers: { 'Content-Type': data.file.type } });
      await completeDocumentUpload(docUploading.id, { storage_key, file_name: data.file.name, content_type: data.file.type, file_size_bytes: data.file.size, auto_approve: true, approved_form_name: data.approvedFormName, form_academic_year: data.formAcademicYear });
      setDocUploading(null);
      await load();
    } catch { /* silently fail — load will refresh state */ }
    finally { setIsUploadingDoc(false); }
  };
  const handleRemind = async (assignmentId: string) => {
    if (!schoolId || remindingIds.has(assignmentId)) return;
    setRemindingIds(prev => new Set(prev).add(assignmentId));
    try { await sendDocumentReminders(schoolId, [assignmentId]); }
    finally { setRemindingIds(prev => { const s = new Set(prev); s.delete(assignmentId); return s; }); }
  };
  const saveEdit = async () => { if (!editTarget||!schoolId||!editForm.document_name.trim()||isSavingEdit) return; setIsSavingEdit(true); try { await updateDocumentRequest(editTarget.id,{school_id:schoolId,document_name:editForm.document_name,instructions:editForm.instructions||null,due_date:editForm.due_date||null}); setEditTarget(null); await load(); } finally { setIsSavingEdit(false); } };
  const confirmAssign = async () => { if (!assignTarget||!schoolId||isAssigning) return; setIsAssigning(true); try { await assignDocumentRecipients(assignTarget.id,{school_id:schoolId,target:assignMode==='all'?'all':'selected',...(audience==='student'?{child_ids:assignSelectedIds}:{employee_ids:assignSelectedIds})}); setAssignTarget(null); setAssignMode(null); setAssignSelectedIds([]); await load(); } finally { setIsAssigning(false); } };
  const openFile = async (item:DocumentAssignment, download=false) => { if (!item.latest_submission_id) return; const {url}=await documentFileUrl(item.latest_submission_id,download); window.open(url,'_blank','noopener,noreferrer'); };
  return <AdminLayout><main className="container mx-auto px-2 sm:px-4 pb-12 pt-0 sm:pt-12 space-y-6">
    <section className="mt-16 sm:mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl sm:text-2xl font-extrabold text-slate-950">{title}</h1><p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p></div>{mode==='manage' && <Button onClick={()=>setCreateOpen(true)} className="rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white"><Plus className="mr-2 h-4 w-4"/>New document request</Button>}</section>
    <DocumentSectionTabs audience={audience} section={mode === 'manage' ? 'documents' : mode === 'due' ? 'due' : 'review'} />
    {mode==='manage' ? <>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[['Active',filtered.filter(x=>x.status==='active').length],['Submitted',filtered.reduce((n,x)=>n+x.submitted,0)],['Approved',filtered.reduce((n,x)=>n+x.approved,0)],['Pending',filtered.reduce((n,x)=>n+x.pending,0)]].map(([name,value])=><Card key={String(name)} className="rounded-2xl border-slate-100 shadow-xs"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></CardContent></Card>)}
    </div>
    <Card className="rounded-2xl border-slate-100 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Document requests</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
            <Input value={search} onChange={e=>setSearch(e.target.value)} className="h-10 rounded-xl pl-9" placeholder="Search document requests..."/>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-4">Document</th>
              <th className="p-4">Due date</th>
              <th className="p-4">Progress</th>
              <th className="p-4">Status</th>
              <th className="p-4"/>
            </tr>
          </thead>
          <tbody>{loading?<tr>
            <td colSpan={4} className="p-12 text-center text-slate-500">Loading document requests...</td>
            </tr>:filtered.map(item=><tr key={item.id} className="border-t border-slate-100">
              <td className="p-4">
                <p className="font-bold text-slate-800">{item.document_name}</p>
                <p className="max-w-md truncate text-xs text-slate-500">{item.instructions||'No instructions'}</p>
              </td>
              <td className="p-4 text-slate-600">{displayDate(item.due_date)}</td>
              <td className="p-4">
                <div className="space-y-1.5 min-w-[140px]">
                  {item.total > 0 && (
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      {item.approved > 0 && <div className="bg-emerald-500" style={{width:`${item.approved/item.total*100}%`}}/>}
                      {item.submitted > 0 && <div className="bg-blue-400" style={{width:`${item.submitted/item.total*100}%`}}/>}
                      {item.rejected > 0 && <div className="bg-rose-500" style={{width:`${item.rejected/item.total*100}%`}}/>}
                      {item.pending > 0 && <div className="bg-amber-400" style={{width:`${item.pending/item.total*100}%`}}/>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] font-medium">
                    <span className="text-slate-500">{item.total} total</span>
                    {item.approved > 0 && <span className="text-emerald-600">{item.approved} approved</span>}
                    {item.submitted > 0 && <span className="text-blue-600">{item.submitted} submitted</span>}
                    {item.rejected > 0 && <span className="text-rose-600">{item.rejected} rejected</span>}
                    {item.pending > 0 && <span className="text-amber-600">{item.pending} pending</span>}
                    {item.total === 0 && <span className="text-slate-400">No assignments yet</span>}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.status}</span></td>
                <td className="p-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8 w-8 p-0 rounded-xl"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={()=>setEditTarget(item)}><Pencil className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                      <DropdownMenuSeparator/>
                      <DropdownMenuItem onClick={()=>{setAssignTarget(item);setAssignMode('all');}}>Assign to all {audience==='student'?'students':'employees'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={()=>{setAssignTarget(item);setAssignMode('selected');setAssignSelectedIds([]);}}>Assign to selected</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td></tr>)}{!loading&&!filtered.length&&<tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500">No document requests yet.</td>
            </tr>}
          </tbody>
        </table>
      </CardContent>
      </Card></> : <Card className="rounded-2xl border-slate-100 shadow-sm"><CardHeader className="border-b border-slate-100"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">{mode==='review'?'Documents ready for review':'Document assignments'}</CardTitle><div className="flex flex-wrap gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><Input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setCurrentPage(1);void load();}}} className="h-10 w-64 rounded-xl pl-9" placeholder="Search people or documents..."/></div>{mode==='due'&&<select value={status} onChange={e=>{setStatus(e.target.value);setCurrentPage(1)}} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">All statuses</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select>}<Button variant="outline" onClick={()=>void load()} className="h-10 rounded-xl"><RefreshCw className="mr-2 h-4 w-4"/>Refresh</Button></div></div></CardHeader><div className="flex justify-end border-b border-slate-100 p-3"><PageSizeSelector pageSize={itemsPerPage} onPageSizeChange={setItemsPerPage} options={[10,25,50,100]}/></div><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-4">{label(audience)}</th><th className="p-4">Document</th><th className="p-4">Due date</th><th className="p-4">Status</th><th className="p-4"/></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-12 text-center text-slate-500">Loading documents...</td></tr>:page.items.map(item=><tr key={item.id} className="border-t border-slate-100"><td className="p-4"><p className="font-bold text-slate-800">{item.subject_name}</p><p className="text-xs text-slate-500">{audience==='student'?`${item.parent_name||'—'} · ${item.parent_email||''}`:item.employee_email}</p></td><td className="p-4 font-semibold text-slate-700">{item.document_name}</td><td className="p-4 text-slate-600">{displayDate(item.due_date)}</td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.derived_status==='overdue'||item.status==='rejected'?'bg-rose-50 text-rose-700':item.status==='approved'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{item.derived_status}</span></td><td className="p-4 text-right flex justify-end gap-2">{item.latest_submission_id&&<Button variant="outline" size="sm" onClick={()=>void openFile(item)} className="rounded-xl"><Eye className="mr-1 h-3.5 w-3.5"/>View</Button>}{mode==='review'&&<Button size="sm" onClick={()=>setReviewing(item)} className="rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white"><FileCheck2 className="mr-1 h-3.5 w-3.5"/>Review</Button>}{mode==='due'&&<><Button variant="outline" size="sm" className="h-8 px-3 text-xs rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold" onClick={()=>setDocUploading(item)}><Upload className="h-3.5 w-3.5 mr-1"/>Upload</Button><Button size="sm" disabled={remindingIds.has(item.id)} className="h-8 px-3 text-xs rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-90 font-bold" onClick={()=>void handleRemind(item.id)}>{remindingIds.has(item.id)?<span className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>:<Mail className="h-3.5 w-3.5 mr-1"/>}{remindingIds.has(item.id)?'Sending...':'Remind'}</Button></>}</td></tr>)}{!loading&&!page.items.length&&<tr><td colSpan={5} className="p-12 text-center text-slate-500">No matching document assignments.</td></tr>}</tbody></table></CardContent><div className="border-t border-slate-100 p-4"><Pagination currentPage={currentPage} totalPages={totalPages} totalItems={page.total} itemsPerPage={itemsPerPage} onPageSizeChange={setItemsPerPage} onPageChange={setCurrentPage}/></div></Card>}
    <Dialog open={createOpen} onOpenChange={(open)=>{if(isPublishing)return;setCreateOpen(open);}}><DialogContent><DialogHeader><DialogTitle>Create document request</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="mb-1 block text-sm font-semibold">Document name</label><Input disabled={isPublishing} value={form.document_name} onChange={e=>setForm({...form,document_name:e.target.value})} placeholder="Income Certificate"/></div><div><label className="mb-1 block text-sm font-semibold">Instructions</label><textarea disabled={isPublishing} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:opacity-50" placeholder="Explain what is required..."/></div><div><label className="mb-1 block text-sm font-semibold">Due date (optional)</label><Input disabled={isPublishing} type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div><div><label className="mb-1 block text-sm font-semibold">Recipients</label><select disabled={isPublishing} value={form.target} onChange={e=>setForm({...form,target:e.target.value})} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm md:hidden lg:block disabled:opacity-50"><option value="all">All active {audience==='student'?'students':'employees'}</option><option value="selected">Selected {audience==='student'?'students':'employees'}</option></select><div className="hidden md:block lg:hidden"><Select disabled={isPublishing} value={form.target} onValueChange={val=>setForm({...form,target:val})}><SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-sm shadow-none focus:ring-0 disabled:opacity-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All active {audience==='student'?'students':'employees'}</SelectItem><SelectItem value="selected">Selected {audience==='student'?'students':'employees'}</SelectItem></SelectContent></Select></div></div>{form.target==='selected'&&<div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{recipients.map(person=><label key={person.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50"><input disabled={isPublishing} type="checkbox" checked={selectedIds.includes(person.id)} onChange={()=>setSelectedIds(ids=>ids.includes(person.id)?ids.filter(id=>id!==person.id):[...ids,person.id])}/><span className="text-sm"><b>{person.name}</b><span className="ml-1 text-slate-500">{person.email}</span></span></label>)}</div>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={isPublishing} onClick={()=>setCreateOpen(false)}>Cancel</Button><Button disabled={!form.document_name.trim()||(form.target==='selected'&&!selectedIds.length)||isPublishing} onClick={()=>void create()} className="bg-[#0F2D52] text-white disabled:opacity-50"><Send className="mr-2 h-4 w-4"/>{isPublishing ? 'Publishing...' : 'Publish request'}</Button></div></div></DialogContent></Dialog>
    <Dialog open={Boolean(reviewing)} onOpenChange={open=>{if(!open&&!isSubmittingReview){setReviewing(null);setRejectError(false);setReason('');}}}><DialogContent><DialogHeader><DialogTitle>Review document</DialogTitle></DialogHeader>{reviewing&&<div className="space-y-4"><div className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{reviewing.document_name}</p><p className="text-sm text-slate-600">{reviewing.subject_name}</p>{reviewing.latest_file_name&&<Button variant="link" className="mt-2 h-auto p-0" onClick={()=>void openFile(reviewing)}><Eye className="mr-1 h-4 w-4"/>Preview uploaded document</Button>}</div><div><textarea value={reason} onChange={e=>{setReason(e.target.value);if(e.target.value.trim())setRejectError(false);}} className={`min-h-24 w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${rejectError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#0F2D52]'}`} placeholder="Reason or re-upload instructions (required only when rejecting)"/>{rejectError && <p className="mt-1 text-xs text-rose-500 font-medium">Please provide a reason for rejecting this document.</p>}</div><div className="flex justify-end gap-2"><Button variant="outline" disabled={isSubmittingReview} onClick={()=>void review('rejected')} className="border-rose-200 text-rose-700 disabled:opacity-50"><X className="mr-1 h-4 w-4"/>{isSubmittingReview ? 'Processing...' : 'Reject'}</Button><Button disabled={isSubmittingReview} onClick={()=>setIsDocApproveModalOpen(true)} className="bg-[#0F2D52] text-white disabled:opacity-50"><Check className="mr-1 h-4 w-4"/>{isSubmittingReview ? 'Processing...' : 'Approve'}</Button></div></div>}</DialogContent></Dialog>
    {/* Edit document request */}
    <Dialog open={!!editTarget} onOpenChange={open=>{if(!isSavingEdit&&!open)setEditTarget(null);}}>
      <DialogContent><DialogHeader><DialogTitle>Edit document request</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><label className="mb-1 block text-sm font-semibold">Document name</label><Input disabled={isSavingEdit} value={editForm.document_name} onChange={e=>setEditForm({...editForm,document_name:e.target.value})} placeholder="Income Certificate"/></div>
          <div><label className="mb-1 block text-sm font-semibold">Instructions</label><textarea disabled={isSavingEdit} value={editForm.instructions} onChange={e=>setEditForm({...editForm,instructions:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:opacity-50" placeholder="Explain what is required..."/></div>
          <div><label className="mb-1 block text-sm font-semibold">Due date (optional)</label><Input disabled={isSavingEdit} type="date" value={editForm.due_date} onChange={e=>setEditForm({...editForm,due_date:e.target.value})}/></div>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={isSavingEdit} onClick={()=>setEditTarget(null)}>Cancel</Button><Button disabled={!editForm.document_name.trim()||isSavingEdit} onClick={()=>void saveEdit()} className="bg-[#0F2D52] text-white disabled:opacity-50">{isSavingEdit?'Saving...':'Save changes'}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
    {/* Assign recipients */}
    <Dialog open={!!assignTarget&&!!assignMode} onOpenChange={open=>{if(!isAssigning&&!open){setAssignTarget(null);setAssignMode(null);setAssignSelectedIds([]);}}}>
      <DialogContent><DialogHeader><DialogTitle>{assignMode==='all'?`Assign to all ${audience==='student'?'students':'employees'}`:`Assign to selected ${audience==='student'?'students':'employees'}`}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {assignMode==='all'&&<p className="text-sm text-slate-600">This will assign <b>{assignTarget?.document_name}</b> to all active {audience==='student'?'students':'employees'} who are not yet assigned. Already assigned recipients will be skipped.</p>}
          {assignMode==='selected'&&<div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {assignRecipients.length===0&&<p className="p-4 text-center text-sm text-slate-400">Loading...</p>}
            {assignRecipients.map(person=><label key={person.id} className={`flex items-center gap-2 rounded-lg p-2 ${person.is_assigned?'opacity-60':'cursor-pointer hover:bg-slate-50'}`}>
              <input type="checkbox" disabled={person.is_assigned||isAssigning} checked={person.is_assigned||assignSelectedIds.includes(person.id)} onChange={()=>setAssignSelectedIds(ids=>ids.includes(person.id)?ids.filter(i=>i!==person.id):[...ids,person.id])}/>
              <span className="text-sm flex-1"><b>{person.name}</b>{person.email&&<span className="ml-1 text-slate-500">{person.email}</span>}</span>
              {person.is_assigned&&<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">Assigned</span>}
            </label>)}
          </div>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" disabled={isAssigning} onClick={()=>{setAssignTarget(null);setAssignMode(null);setAssignSelectedIds([]);}}>Cancel</Button>
            <Button disabled={isAssigning||(assignMode==='selected'&&!assignSelectedIds.length)} onClick={()=>void confirmAssign()} className="bg-[#0F2D52] text-white disabled:opacity-50">{isAssigning?'Assigning...':'Confirm'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <ApproveFormModal
      open={isDocApproveModalOpen}
      onClose={() => setIsDocApproveModalOpen(false)}
      onConfirm={handleDocApproveConfirm}
      isEmployee={audience === 'employee'}
      formTemplateName={reviewing?.document_name || ''}
      personName={reviewing?.subject_name || ''}
      isEditable={isEditable}
      isSubmitting={isSubmittingReview}
    />
    <UploadDocumentModal
      open={!!docUploading}
      onClose={() => setDocUploading(null)}
      onConfirm={handleDocUploadWithApproval}
      isStudent={audience === 'student'}
      documentName={docUploading?.document_name || ''}
      personName={docUploading?.subject_name || ''}
      uploaderEmail={userData?.email}
      isSubmitting={isUploadingDoc}
    />
  </main></AdminLayout>;
}
