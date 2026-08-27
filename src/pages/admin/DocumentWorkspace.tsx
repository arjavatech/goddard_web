import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, Eye, FileCheck2, Filter, LayoutGrid, List, Plus, RefreshCw, Search, Send, X } from 'lucide-react';
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
import { createDocumentRequest, documentFileUrl, fetchDocumentAssignments, fetchDocumentRecipients, fetchDocumentRequests, publishDocumentRequest, reviewDocument, type DocumentAssignment, type DocumentRecipient, type DocumentRequest } from '../../services/api/documentRequests';
import { DocumentSectionTabs } from './DocumentSectionTabs';

type Props = { audience:'student'|'employee'; mode:'manage'|'due'|'review' };
const label = (audience:Props['audience']) => audience === 'student' ? 'Student' : 'Employee';
const displayDate = (value?:string) => value || '—';

export function DocumentWorkspace({ audience, mode }:Props) {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId;
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [page, setPage] = useState({items:[] as DocumentAssignment[], total:0, page:1, limit:10});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [docFilter, setDocFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('subject_name');
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');
  const [viewMode, setViewMode] = useState<'table'|'card'>(() => (localStorage.getItem(`docWorkView-${audience}-${mode}`) as 'table'|'card') || 'table');
  const setView = (v: 'table'|'card') => { setViewMode(v); localStorage.setItem(`docWorkView-${audience}-${mode}`, v); };
  const [itemsPerPage,setItemsPerPage] = usePageSize(`documents-${audience}-${mode}`,10);
  const [currentPage,setCurrentPage]=useState(1);
  const [createOpen,setCreateOpen]=useState(false);
  const [reviewing,setReviewing]=useState<DocumentAssignment|null>(null);
  const [reason,setReason]=useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [rejectError, setRejectError] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [form,setForm]=useState({document_name:'',instructions:'',due_date:'',target:'all'});
  const [recipients,setRecipients]=useState<DocumentRecipient[]>([]);
  const [selectedIds,setSelectedIds]=useState<string[]>([]);
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
    setDocFilter([]);
    setStatusFilter([]);
    setShowFilters(false);
  }, [audience, mode]);
  useEffect(()=>{ void load(); },[schoolId,audience,mode,currentPage,itemsPerPage,status]);
  const title = mode === 'manage' ? `${label(audience)} Document Requests` : mode === 'review' ? `Review ${label(audience)} Documents` : `${label(audience)} Documents Due`;
  const subtitle = mode === 'manage' ? `Create, publish, and track document requests for ${audience === 'student' ? 'students and parents' : 'employees'}.` : mode === 'review' ? 'Review submitted documents and approve or request a re-upload.' : 'Track documents that are pending, rejected, or overdue.';
  const totalPages=Math.max(1,Math.ceil(page.total/itemsPerPage));
  const allReqDocNames = useMemo(() => Array.from(new Set(requests.map(r => r.document_name))).sort(), [requests]);
  const allReqStatuses = useMemo(() => Array.from(new Set(requests.map(r => r.status))).sort(), [requests]);
  const filteredManage = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const base = requests.filter(r => {
      const matchSearch = !needle || `${r.document_name} ${r.instructions||''}`.toLowerCase().includes(needle);
      const matchDoc = docFilter.length === 0 || docFilter.includes(r.document_name);
      const matchStatus = statusFilter.length === 0 || statusFilter.includes(r.status);
      return matchSearch && matchDoc && matchStatus;
    });
    return [...base].sort((a, b) => {
      const aVal = (sortBy === 'document_name' ? a.document_name : a.status).toLowerCase();
      const bVal = (sortBy === 'document_name' ? b.document_name : b.status).toLowerCase();
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [requests, search, docFilter, statusFilter, sortBy, sortOrder]);
  const allPageDocNames = useMemo(() => Array.from(new Set(page.items.map(i => i.document_name))).sort(), [page.items]);
  const filteredReview = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return [...page.items].filter(item => {
      const matchSearch = !needle || `${item.document_name} ${item.subject_name} ${item.parent_name||''} ${item.parent_email||''} ${item.employee_email||''}`.toLowerCase().includes(needle);
      const matchDoc = docFilter.length === 0 || docFilter.includes(item.document_name);
      return matchSearch && matchDoc;
    }).sort((a, b) => {
      const aVal = (sortBy === 'document_name' ? a.document_name : a.subject_name).toLowerCase();
      const bVal = (sortBy === 'document_name' ? b.document_name : b.subject_name).toLowerCase();
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [page.items, search, docFilter, sortBy, sortOrder]);
  const manageActiveFilters = [docFilter.length > 0, statusFilter.length > 0].filter(Boolean).length;
  const reviewActiveFilters = [docFilter.length > 0].filter(Boolean).length;
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
  const openFile = async (item:DocumentAssignment, download=false) => { if (!item.latest_submission_id) return; const {url}=await documentFileUrl(item.latest_submission_id,download); window.open(url,'_blank','noopener,noreferrer'); };
  return <AdminLayout><main className="container mx-auto px-2 sm:px-4 pb-12 pt-0 sm:pt-12 space-y-6">
    <section className="mt-16 sm:mt-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-xl sm:text-2xl font-extrabold text-slate-950">{title}</h1><p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p></div>{mode==='manage' && <Button onClick={()=>setCreateOpen(true)} className="rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white"><Plus className="mr-2 h-4 w-4"/>New document request</Button>}</section>
    <DocumentSectionTabs audience={audience} section={mode === 'manage' ? 'documents' : mode === 'due' ? 'due' : 'review'} />
    {mode==='manage' ? <>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[['Active',filteredManage.filter(x=>x.status==='active').length],['Submitted',filteredManage.reduce((n,x)=>n+x.submitted,0)],['Approved',filteredManage.reduce((n,x)=>n+x.approved,0)],['Pending',filteredManage.reduce((n,x)=>n+x.pending,0)]].map(([name,value])=><Card key={String(name)} className="rounded-2xl border-slate-100 shadow-xs"><CardContent className="p-5"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{name}</p><p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p></CardContent></Card>)}
    </div>
    <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold">Document requests ({filteredManage.length})</CardTitle>
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button onClick={()=>setView('table')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode==='table'?'bg-white text-[#0F2D52] shadow-xs':'text-slate-500 hover:text-slate-800'}`}><List className="h-3.5 w-3.5"/><span className="hidden sm:inline">Table</span></button>
              <button onClick={()=>setView('card')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode==='card'?'bg-white text-[#0F2D52] shadow-xs':'text-slate-500 hover:text-slate-800'}`}><LayoutGrid className="h-3.5 w-3.5"/><span className="hidden sm:inline">Cards</span></button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative w-full sm:flex-1 sm:min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
              <Input value={search} onChange={e=>setSearch(e.target.value)} className="h-10 rounded-xl pl-9 w-full" placeholder="Search document requests..."/>
            </div>
            <div className="flex gap-2">
            <button onClick={()=>setShowFilters(p=>!p)} className={`relative flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${showFilters?'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {showFilters?<X className="h-4 w-4"/>:<Filter className="h-4 w-4 text-slate-400"/>}
              <span className="hidden sm:inline">{showFilters?'Hide Filters':'Filters'}</span>
              {!showFilters&&manageActiveFilters>0&&<span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">{manageActiveFilters}</span>}
            </button>
            <button onClick={()=>setSortOrder(p=>p==='asc'?'desc':'asc')} className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {sortOrder==='asc'?<ArrowUp className="h-3.5 w-3.5 text-slate-400"/>:<ArrowDown className="h-3.5 w-3.5 text-slate-400"/>}
              <span className="hidden sm:inline">{sortBy==='document_name'?'Document':'Status'}</span>
            </button>
            </div>
          </div>
          {showFilters&&(
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              {manageActiveFilters>0&&(
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-500">{manageActiveFilters} {manageActiveFilters===1?'filter':'filters'} applied</span>
                  <button onClick={()=>{setDocFilter([]);setStatusFilter([]);}} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50"><X className="h-3 w-3"/>Clear All</button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document</label><WsMultiSelect value={docFilter} options={allReqDocNames} placeholder="All documents" onValueChange={setDocFilter}/></div>
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label><WsMultiSelect value={statusFilter} options={allReqStatuses} placeholder="All statuses" onValueChange={setStatusFilter}/></div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      {viewMode==='table'?(
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3 sm:p-4 cursor-pointer" onClick={()=>{setSortBy('document_name');setSortOrder(p=>p==='asc'?'desc':'asc');}}>Document</th>
              <th className="p-3 sm:p-4 hidden sm:table-cell">Due date</th>
              <th className="p-3 sm:p-4 hidden md:table-cell">Progress</th>
              <th className="p-3 sm:p-4 cursor-pointer" onClick={()=>{setSortBy('status');setSortOrder(p=>p==='asc'?'desc':'asc');}}>Status</th>
            </tr>
          </thead>
          <tbody>{loading?<tr><td colSpan={4} className="p-12 text-center text-slate-500">Loading document requests...</td></tr>:filteredManage.map(item=><tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
            <td className="p-3 sm:p-4">
              <p className="font-bold text-slate-800">{item.document_name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500 max-w-[200px] sm:max-w-md">{item.instructions||'No instructions'}</p>
              <p className="mt-0.5 text-xs text-slate-400 sm:hidden">{displayDate(item.due_date)} · {item.submitted}/{item.total} submitted</p>
            </td>
            <td className="p-3 sm:p-4 text-slate-600 hidden sm:table-cell whitespace-nowrap">{displayDate(item.due_date)}</td>
            <td className="p-3 sm:p-4 text-slate-600 hidden md:table-cell">{item.submitted}/{item.total} submitted · {item.approved} approved</td>
            <td className="p-3 sm:p-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.status}</span></td>
          </tr>)}{!loading&&!filteredManage.length&&<tr><td colSpan={4} className="p-12 text-center text-slate-500">No document requests found.</td></tr>}</tbody>
        </table>
      </CardContent>
      ):(
      <CardContent className="p-5">
        {loading?<p className="py-12 text-center text-sm text-slate-500">Loading document requests...</p>:!filteredManage.length?<p className="py-12 text-center text-sm text-slate-500">No document requests found.</p>:(
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredManage.map(item=>(
            <Card key={item.id} className="rounded-2xl border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-5 space-y-3">
                <div><p className="font-bold text-slate-900">{item.document_name}</p><p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.instructions||'No instructions'}</p></div>
                <div className="space-y-1.5 border-y border-slate-100 py-3 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400 font-semibold">Due:</span><span className="font-bold text-slate-700">{displayDate(item.due_date)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-semibold">Progress:</span><span className="font-bold text-slate-700">{item.submitted}/{item.total} submitted</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-semibold">Approved:</span><span className="font-bold text-slate-700">{item.approved}</span></div>
                </div>
                <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{item.status}</span>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </CardContent>
      )}
    </Card></> : <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold">{mode==='review'?'Documents ready for review':'Document assignments'} ({filteredReview.length})</CardTitle>
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button onClick={()=>setView('table')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode==='table'?'bg-white text-[#0F2D52] shadow-xs':'text-slate-500 hover:text-slate-800'}`}><List className="h-3.5 w-3.5"/><span className="hidden sm:inline">Table</span></button>
              <button onClick={()=>setView('card')} className={`flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode==='card'?'bg-white text-[#0F2D52] shadow-xs':'text-slate-500 hover:text-slate-800'}`}><LayoutGrid className="h-3.5 w-3.5"/><span className="hidden sm:inline">Cards</span></button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative w-full sm:flex-1 sm:min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/>
              <Input value={search} onChange={e=>{setSearch(e.target.value);setCurrentPage(1);}} onKeyDown={e=>{if(e.key==='Enter'){setCurrentPage(1);void load();}}} className="h-10 rounded-xl pl-9 w-full" placeholder="Search people or documents..."/>
            </div>
            <div className="flex flex-wrap gap-2">
            <button onClick={()=>setShowFilters(p=>!p)} className={`relative flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${showFilters?'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
              {showFilters?<X className="h-4 w-4"/>:<Filter className="h-4 w-4 text-slate-400"/>}
              <span className="hidden sm:inline">{showFilters?'Hide Filters':'Filters'}</span>
              {!showFilters&&reviewActiveFilters>0&&<span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white">{reviewActiveFilters}</span>}
            </button>
            <button onClick={()=>{const next=sortOrder==='asc'?'desc':'asc';setSortOrder(next);}} className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
              {sortOrder==='asc'?<ArrowUp className="h-3.5 w-3.5 text-slate-400"/>:<ArrowDown className="h-3.5 w-3.5 text-slate-400"/>}
              <span className="hidden sm:inline">{sortBy==='document_name'?'Document':label(audience)}</span>
            </button>
            <Button variant="outline" onClick={()=>void load()} className="h-10 rounded-xl px-3"><RefreshCw className="h-4 w-4 sm:mr-2"/><span className="hidden sm:inline">Refresh</span></Button>
            </div>
          </div>
          {showFilters&&(
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              {reviewActiveFilters>0&&(
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-500">{reviewActiveFilters} filter applied</span>
                  <button onClick={()=>setDocFilter([])} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-slate-600 hover:bg-slate-50"><X className="h-3 w-3"/>Clear All</button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Document</label><WsMultiSelect value={docFilter} options={allPageDocNames} placeholder="All documents" onValueChange={vals=>{setDocFilter(vals);setCurrentPage(1);}}/></div>
                <div className="space-y-1.5"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Sort by</label>
                  <div className="flex gap-2">
                    <button onClick={()=>setSortBy('subject_name')} className={`flex-1 h-10 rounded-xl border text-xs font-bold transition-all ${sortBy==='subject_name'?'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{label(audience)}</button>
                    <button onClick={()=>setSortBy('document_name')} className={`flex-1 h-10 rounded-xl border text-xs font-bold transition-all ${sortBy==='document_name'?'border-[#0F2D52] bg-[#EFF5FB] text-[#0F2D52]':'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>Document</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <div className="flex justify-end border-b border-slate-100 p-3"><PageSizeSelector pageSize={itemsPerPage} onPageSizeChange={setItemsPerPage} options={[10,25,50,100]}/></div>
      {viewMode==='table'?(
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="p-3 sm:p-4">{label(audience)}</th>
              <th className="p-3 sm:p-4 hidden sm:table-cell">Document</th>
              <th className="p-3 sm:p-4 hidden md:table-cell">Due date</th>
              <th className="p-3 sm:p-4">Status</th>
              <th className="p-3 sm:p-4"/>
            </tr>
          </thead>
          <tbody>{loading?<tr><td colSpan={5} className="p-12 text-center text-slate-500">Loading documents...</td></tr>:filteredReview.map(item=><tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
            <td className="p-3 sm:p-4">
              <p className="font-bold text-slate-800">{item.subject_name}</p>
              <p className="text-xs text-slate-500">{audience==='student'?`${item.parent_name||'—'} · ${item.parent_email||''}`:item.employee_email}</p>
              <p className="mt-0.5 text-xs text-slate-400 sm:hidden">{item.document_name}</p>
            </td>
            <td className="p-3 sm:p-4 font-semibold text-slate-700 hidden sm:table-cell">{item.document_name}</td>
            <td className="p-3 sm:p-4 text-slate-600 hidden md:table-cell whitespace-nowrap">{displayDate(item.due_date)}</td>
            <td className="p-3 sm:p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.derived_status==='overdue'||item.status==='rejected'?'bg-rose-50 text-rose-700':item.status==='approved'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{item.derived_status}</span></td>
            <td className="p-3 sm:p-4 text-right">
              <div className="flex justify-end gap-1.5 flex-wrap">
                {item.latest_submission_id&&<Button variant="outline" size="sm" onClick={()=>void openFile(item)} className="rounded-xl h-8 px-2.5"><Eye className="h-3.5 w-3.5 sm:mr-1"/><span className="hidden sm:inline">View</span></Button>}
                {mode==='review'&&<Button size="sm" onClick={()=>setReviewing(item)} className="rounded-xl h-8 px-2.5 bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white"><FileCheck2 className="h-3.5 w-3.5 sm:mr-1"/><span className="hidden sm:inline">Review</span></Button>}
              </div>
            </td>
          </tr>)}{!loading&&!filteredReview.length&&<tr><td colSpan={5} className="p-12 text-center text-slate-500">No matching document assignments.</td></tr>}</tbody>
        </table>
      </CardContent>
      ):(
      <CardContent className="p-5">
        {loading?<p className="py-12 text-center text-sm text-slate-500">Loading documents...</p>:!filteredReview.length?<p className="py-12 text-center text-sm text-slate-500">No matching document assignments.</p>:(
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredReview.map(item=>(
            <Card key={item.id} className="rounded-2xl border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-5 space-y-3">
                <div><p className="font-bold text-slate-900">{item.document_name}</p><p className="mt-0.5 text-xs font-extrabold uppercase tracking-wider text-slate-400">{item.subject_name}</p></div>
                <div className="space-y-1.5 border-y border-slate-100 py-3 text-xs">
                  <div className="flex justify-between"><span className="text-slate-400 font-semibold">{audience==='student'?'Parent:':'Email:'}</span><span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{audience==='student'?(item.parent_name||'—'):item.employee_email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-semibold">Due:</span><span className="font-bold text-slate-700">{displayDate(item.due_date)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-400 font-semibold">Status:</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.derived_status==='overdue'||item.status==='rejected'?'bg-rose-50 text-rose-700':item.status==='approved'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{item.derived_status}</span></div>
                </div>
                <div className="flex gap-2">
                  {item.latest_submission_id&&<Button variant="outline" size="sm" onClick={()=>void openFile(item)} className="flex-1 rounded-xl"><Eye className="mr-1 h-3.5 w-3.5"/>View</Button>}
                  {mode==='review'&&<Button size="sm" onClick={()=>setReviewing(item)} className="flex-1 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white"><FileCheck2 className="mr-1 h-3.5 w-3.5"/>Review</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}
      </CardContent>
      )}
      <div className="border-t border-slate-100 p-4"><Pagination currentPage={currentPage} totalPages={totalPages} totalItems={page.total} itemsPerPage={itemsPerPage} onPageSizeChange={setItemsPerPage} onPageChange={setCurrentPage}/></div>
    </Card>}
    <Dialog open={createOpen} onOpenChange={(open)=>{if(isPublishing)return;setCreateOpen(open);if(open&&schoolId)void fetchDocumentRecipients(schoolId,audience).then(setRecipients)}}><DialogContent><DialogHeader><DialogTitle>Create document request</DialogTitle></DialogHeader><div className="space-y-4"><div><label className="mb-1 block text-sm font-semibold">Document name</label><Input disabled={isPublishing} value={form.document_name} onChange={e=>setForm({...form,document_name:e.target.value})} placeholder="Income Certificate"/></div><div><label className="mb-1 block text-sm font-semibold">Instructions</label><textarea disabled={isPublishing} value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm disabled:opacity-50" placeholder="Explain what is required..."/></div><div><label className="mb-1 block text-sm font-semibold">Due date (optional)</label><Input disabled={isPublishing} type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></div><div><label className="mb-1 block text-sm font-semibold">Recipients</label><select disabled={isPublishing} value={form.target} onChange={e=>setForm({...form,target:e.target.value})} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm md:hidden lg:block disabled:opacity-50"><option value="all">All active {audience==='student'?'students':'employees'}</option><option value="selected">Selected {audience==='student'?'students':'employees'}</option></select><div className="hidden md:block lg:hidden"><Select disabled={isPublishing} value={form.target} onValueChange={val=>setForm({...form,target:val})}><SelectTrigger className="h-10 w-full rounded-xl border-slate-200 bg-white px-3 text-sm shadow-none focus:ring-0 disabled:opacity-50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All active {audience==='student'?'students':'employees'}</SelectItem><SelectItem value="selected">Selected {audience==='student'?'students':'employees'}</SelectItem></SelectContent></Select></div></div>{form.target==='selected'&&<div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">{recipients.map(person=><label key={person.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50"><input disabled={isPublishing} type="checkbox" checked={selectedIds.includes(person.id)} onChange={()=>setSelectedIds(ids=>ids.includes(person.id)?ids.filter(id=>id!==person.id):[...ids,person.id])}/><span className="text-sm"><b>{person.name}</b><span className="ml-1 text-slate-500">{person.email}</span></span></label>)}</div>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={isPublishing} onClick={()=>setCreateOpen(false)}>Cancel</Button><Button disabled={!form.document_name.trim()||(form.target==='selected'&&!selectedIds.length)||isPublishing} onClick={()=>void create()} className="bg-[#0F2D52] text-white disabled:opacity-50"><Send className="mr-2 h-4 w-4"/>{isPublishing ? 'Publishing...' : 'Publish request'}</Button></div></div></DialogContent></Dialog>
    <Dialog open={Boolean(reviewing)} onOpenChange={open=>{if(!open&&!isSubmittingReview){setReviewing(null);setRejectError(false);setReason('');}}}><DialogContent><DialogHeader><DialogTitle>Review document</DialogTitle></DialogHeader>{reviewing&&<div className="space-y-4"><div className="rounded-xl bg-slate-50 p-3"><p className="font-bold">{reviewing.document_name}</p><p className="text-sm text-slate-600">{reviewing.subject_name}</p>{reviewing.latest_file_name&&<Button variant="link" className="mt-2 h-auto p-0" onClick={()=>void openFile(reviewing)}><Eye className="mr-1 h-4 w-4"/>Preview uploaded document</Button>}</div><div><textarea value={reason} onChange={e=>{setReason(e.target.value);if(e.target.value.trim())setRejectError(false);}} className={`min-h-24 w-full rounded-xl border p-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${rejectError ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 focus:ring-[#0F2D52]'}`} placeholder="Reason or re-upload instructions (required only when rejecting)"/>{rejectError && <p className="mt-1 text-xs text-rose-500 font-medium">Please provide a reason for rejecting this document.</p>}</div><div className="flex justify-end gap-2"><Button variant="outline" disabled={isSubmittingReview} onClick={()=>void review('rejected')} className="border-rose-200 text-rose-700 disabled:opacity-50"><X className="mr-1 h-4 w-4"/>{isSubmittingReview ? 'Processing...' : 'Reject'}</Button><Button disabled={isSubmittingReview} onClick={()=>void review('approved')} className="bg-[#0F2D52] text-white disabled:opacity-50"><Check className="mr-1 h-4 w-4"/>{isSubmittingReview ? 'Processing...' : 'Approve'}</Button></div></div>}</DialogContent></Dialog>
  </main></AdminLayout>;
}

function WsMultiSelect({ value, options, placeholder, onValueChange }: { value: string[]; options: string[]; placeholder: string; onValueChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (opt: string) => onValueChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(p => !p)} className="flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none gap-2">
        <div className="flex flex-wrap gap-1 flex-1">
          {value.length === 0 ? <span className="text-slate-400 font-semibold">{placeholder}</span> : value.map(v => (
            <span key={v} className="inline-flex items-center gap-1 bg-[#EFF5FB] text-[#0F2D52] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#0F2D52]/10">
              {v}<span role="button" onClick={e => { e.stopPropagation(); toggle(v); }} className="hover:text-red-500 cursor-pointer leading-none">×</span>
            </span>
          ))}
        </div>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
          <div className="p-1.5 max-h-52 overflow-y-auto space-y-0.5">
            {options.length > 0 && (
              <div className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold border-b border-slate-100 mb-0.5 ${value.length === options.length ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => onValueChange(value.length === options.length ? [] : [...options])}>
                <span>Select All</span>
                {value.length === options.length && <span className="h-4 w-4 rounded-full bg-[#0F2D52] text-white flex items-center justify-center text-[10px] font-bold">✓</span>}
              </div>
            )}
            {options.map(opt => (
              <div key={opt} className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold ${value.includes(opt) ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'text-slate-700 hover:bg-slate-50'}`} onClick={() => toggle(opt)}>
                <span>{opt}</span>
                {value.includes(opt) && <span className="h-4 w-4 rounded-full bg-[#0F2D52] text-white flex items-center justify-center text-[10px] font-bold">✓</span>}
              </div>
            ))}
            {options.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 font-semibold">No options available</div>}
          </div>
        </div>
      )}
    </div>
  );
}
