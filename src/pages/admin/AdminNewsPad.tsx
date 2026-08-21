import { useEffect, useMemo, useState } from 'react';
import { Send, Save, Newspaper } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { useUserContext } from '../../contexts/UserContext';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { createNewsletter, fetchNewsletters, publishNewsletter, renderNewsletterHtml, type Newsletter, type NewsletterBlock } from '../../services/api/newsletters';

const starter: NewsletterBlock[] = [
  { type: 'header', title: 'The Goddard School News', body: 'School newsletter' },
  { type: 'text', title: 'Welcome', body: 'Add your school update here.' },
  { type: 'footer', body: 'The Goddard School' },
];

export function AdminNewsPad() {
  const { userData } = useUserContext();
  const schoolId = userData?.schoolId ?? '';
  const isSuperAdmin = userData?.role?.toLowerCase() === 'superadmin';
  const [items, setItems] = useState<Newsletter[]>([]);
  const [selectedItem, setSelectedItem] = useState<Newsletter | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NewsletterBlock[]>(starter);
  const [scope, setScope] = useState<'school' | 'classrooms'>('school');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const html = useMemo(() => renderNewsletterHtml(blocks), [blocks]);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const response = await fetchNewsletters({ schoolId });
      setItems(response.items);
      setSelectedItem(response.items[0] ?? null);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); if (schoolId && isSuperAdmin) fetchClassrooms(schoolId).then(setClasses); }, [schoolId, isSuperAdmin]);

  const save = async (publish: boolean) => {
    if (!schoolId || !title.trim() || (scope === 'classrooms' && !selectedClasses.length)) return;
    setSaving(true);
    try {
      const newsletter = await createNewsletter({ schoolId, title, blocks, html, audienceScope: scope, classroomIds: scope === 'classrooms' ? selectedClasses : [] });
      if (publish) await publishNewsletter(newsletter.id, scheduledAt ? new Date(scheduledAt).toISOString() : undefined, undefined, [15, 7, 3]);
      setTitle(''); setBlocks(starter); setScope('school'); setSelectedClasses([]); setScheduledAt('');
      await load();
    } finally { setSaving(false); }
  };

  return <AdminLayout><div className="p-5 lg:p-8 space-y-6"><div><p className="text-xs font-bold uppercase tracking-widest text-[#1a6fc4]">School communications</p><h1 className="text-3xl font-bold text-[#0F2D52]">News Pad</h1></div>
    {isSuperAdmin && <div className="grid xl:grid-cols-2 gap-6"><section className="rounded-2xl border bg-white p-5 space-y-4"><h2 className="font-bold text-lg">Create newsletter</h2><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Newsletter title" className="w-full border rounded-xl p-2" /><textarea value={blocks[1]?.body ?? ''} onChange={e => setBlocks(current => current.map((block, index) => index === 1 ? { ...block, body: e.target.value } : block))} rows={8} className="w-full border rounded-xl p-3" placeholder="Newsletter content" /><div className="flex gap-3 text-sm"><label><input type="radio" checked={scope === 'school'} onChange={() => setScope('school')} /> Entire school</label><label><input type="radio" checked={scope === 'classrooms'} onChange={() => setScope('classrooms')} /> Specific classes</label></div>{scope === 'classrooms' && <div className="grid grid-cols-2 gap-2">{classes.map(item => <label key={item.id} className="text-sm"><input type="checkbox" checked={selectedClasses.includes(item.id)} onChange={() => setSelectedClasses(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /> {item.name}</label>)}</div>}<label className="block text-sm">Publish date/time (optional)<input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full border rounded-xl p-2 mt-1" /></label><div className="flex gap-2"><button disabled={saving} onClick={() => save(false)} className="px-4 py-2 rounded-xl border font-semibold"><Save className="w-4 h-4 inline mr-1" />Save draft</button><button disabled={saving} onClick={() => save(true)} className="px-4 py-2 rounded-xl bg-[#0F2D52] text-white font-semibold"><Send className="w-4 h-4 inline mr-1" />{scheduledAt ? 'Schedule' : 'Publish'}</button></div></section><section className="rounded-2xl border bg-slate-100 overflow-hidden"><iframe title="Newsletter preview" sandbox="allow-popups" srcDoc={html} className="w-full min-h-[650px] bg-white" /></section></div>}
    <section className="grid lg:grid-cols-[250px_1fr] gap-5">{loading ? <p>Loading newsletters…</p> : !items.length ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500"><Newspaper className="w-9 h-9 mx-auto mb-3" />No newsletters have been published for this school yet.</div> : <><aside className="rounded-2xl border bg-white p-3 h-fit">{items.map(item => <button key={item.id} onClick={() => setSelectedItem(item)} className={`w-full p-3 text-left rounded-xl ${selectedItem?.id === item.id ? 'bg-[#EFF5FB]' : 'hover:bg-slate-50'}`}><p className="font-semibold text-sm">{item.title}</p><p className="text-xs text-slate-400 mt-1">{item.status}</p></button>)}</aside>{selectedItem && <div className="rounded-2xl border overflow-hidden bg-slate-100"><iframe title={selectedItem.title} sandbox="allow-popups" srcDoc={selectedItem.rendered_html} className="w-full min-h-[780px] bg-white" /></div>}</>}</section>
  </div></AdminLayout>;
}
