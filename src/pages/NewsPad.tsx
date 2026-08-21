import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { fetchNewsletters, type Newsletter } from '../services/api/newsletters';
import { useUserContext } from '../contexts/UserContext';

export function NewsPad() {
  const { userData, schoolSubdomain } = useUserContext(); const [items, setItems] = useState<Newsletter[]>([]); const [selected, setSelected] = useState<Newsletter | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => { fetchNewsletters().then(r => { setItems(r.items); setSelected(r.items[0] ?? null); }).finally(() => setLoading(false)); }, []);
  return <><Header /><main className="max-w-6xl mx-auto px-4 py-8"><div className="flex items-center justify-between mb-7"><div><p className="text-xs uppercase font-bold tracking-widest text-[#1a6fc4]">School communications</p><h1 className="text-3xl font-bold text-[#0F2D52]">News Pad</h1></div><Link className="text-sm font-semibold text-[#1a6fc4]" to={`/${schoolSubdomain || 'goddard'}/dashboard`}>Back to dashboard</Link></div>{loading ? <p>Loading newsletters…</p> : !items.length ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500"><Newspaper className="w-9 h-9 mx-auto mb-3" />No newsletters have been published for you yet.</div> : <div className="grid lg:grid-cols-[250px_1fr] gap-5"><aside className="rounded-2xl border bg-white p-3 h-fit">{items.map(n => <button key={n.id} onClick={() => setSelected(n)} className={`w-full text-left p-3 rounded-xl ${selected?.id === n.id ? 'bg-[#EFF5FB]' : 'hover:bg-slate-50'}`}><p className="font-semibold text-sm text-slate-800">{n.title}</p><p className="text-xs text-slate-400 mt-1">{n.published_at ? new Date(n.published_at).toLocaleDateString() : 'Scheduled'}</p></button>)}</aside>{selected && <section className="rounded-2xl overflow-hidden border bg-slate-100"><iframe title={selected.title} sandbox="allow-popups" className="w-full min-h-[780px] bg-white" srcDoc={selected.rendered_html} /></section>}</div>}</main></>;
}
