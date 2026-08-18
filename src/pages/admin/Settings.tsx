import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Tag, Trash2, MapPin } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import {
  fetchRequestSettings,
  updateRequestSettings,
  type RequestSetting,
  type RequestSettingOption,
} from '../../services/api/settings';

type ListEditorProps = {
  title: string;
  icon: React.ReactNode;
  setting: RequestSetting;
  items: RequestSettingOption[];
  loading: boolean;
  onAdd: (setting: RequestSetting, label: string) => Promise<void>;
  onUpdate: (setting: RequestSetting, item: RequestSettingOption, label: string) => Promise<void>;
  onDelete: (setting: RequestSetting, item: RequestSettingOption) => Promise<void>;
  placeholder: string;
};

function ListEditor({ title, icon, setting, items, loading, onAdd, onUpdate, onDelete, placeholder }: ListEditorProps) {
  const { showToast } = useToast();
  const [newItem, setNewItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RequestSettingOption | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const add = async () => {
    const label = newItem.trim();
    if (!label) return;
    setSaving(true);
    try {
      await onAdd(setting, label);
      setNewItem('');
      showToast('success', `Added to ${title}.`, 'Added');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to add item.', 'Error');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!editing || !editLabel.trim()) return;
    setSaving(true);
    try {
      await onUpdate(setting, editing, editLabel.trim());
      setEditing(null);
      showToast('success', 'Item updated.', 'Updated');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to update item.', 'Error');
    } finally { setSaving(false); }
  };

  const remove = async (item: RequestSettingOption) => {
    setDeletingId(item.id);
    try {
      await onDelete(setting, item);
      showToast('success', 'Item removed and matching request values cleared.', 'Removed');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to remove item.', 'Error');
    } finally { setDeletingId(null); }
  };

  return <>
    <Card className="border border-slate-100 rounded-2xl shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-50">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {icon}{title}
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <div className="flex gap-2">
          <input value={newItem} onChange={event => setNewItem(event.target.value)} onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), add())}
            placeholder={placeholder} className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
          <Button type="button" onClick={add} disabled={!newItem.trim() || saving}
            className="h-9 px-3 rounded-xl bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1E4B83]">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add
          </Button>
        </div>
        {loading ? <p className="text-xs text-slate-400 text-center py-4">Loading...</p> : items.length === 0 ?
          <p className="text-xs text-slate-400 text-center py-4 italic">No items yet. Add one above.</p> :
          <ul className="space-y-1.5">{items.map(item => <li key={item.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 group">
            <span className="text-xs font-medium text-slate-700">{item.label}</span>
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={() => { setEditing(item); setEditLabel(item.label); }} className="p-1 rounded-lg text-slate-400 hover:text-[#0F2D52] hover:bg-slate-100" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => remove(item)} disabled={deletingId === item.id} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" title="Remove">
                {deletingId === item.id ? <span className="animate-spin rounded-full border-2 border-slate-400 border-t-transparent h-3 w-3 inline-block" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </li>)}</ul>}
      </CardContent>
    </Card>
    <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-5">
        <DialogHeader><DialogTitle>Edit {title}</DialogTitle><DialogDescription>Update this value for future and matching existing requests.</DialogDescription></DialogHeader>
        <input autoFocus value={editLabel} onChange={event => setEditLabel(event.target.value)} onKeyDown={event => event.key === 'Enter' && (event.preventDefault(), saveEdit())}
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
        <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={saveEdit} disabled={!editLabel.trim() || saving} className="bg-[#0F2D52] text-white">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export function Settings() {
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const schoolId = userData?.schoolId ?? '';
  const [categories, setCategories] = useState<RequestSettingOption[]>([]);
  const [locations, setLocations] = useState<RequestSettingOption[]>([]);
  const [loading, setLoading] = useState(true);

  const applySettings = (settings: Awaited<ReturnType<typeof fetchRequestSettings>>) => {
    setCategories(settings.requestCategories);
    setLocations(settings.location);
  };
  const loadSettings = async () => {
    if (!schoolId) return;
    setLoading(true);
    try { applySettings(await fetchRequestSettings(schoolId)); }
    catch (error) { showToast('error', error instanceof Error ? error.message : 'Failed to load request settings.', 'Error'); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadSettings(); }, [schoolId]);

  const mutate = async (operation: Parameters<typeof updateRequestSettings>[1][number]) => {
    applySettings(await updateRequestSettings(schoolId, [operation]));
  };
  return <AdminLayout>
    <div className="mx-auto space-y-6 px-4 sm:px-6 py-6 mt-14">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6"><h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings</h1></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ListEditor title="Procurement Categories" icon={<Tag className="w-4 h-4 text-[#0F2D52]" />} setting="request_categories" items={categories} loading={loading} placeholder="e.g. Art Supplies"
          onAdd={(setting, label) => mutate({ operation: 'add', setting, label })} onUpdate={(setting, item, label) => mutate({ operation: 'update', setting, optionId: item.id, label })} onDelete={(setting, item) => mutate({ operation: 'delete', setting, optionId: item.id })} />
        <ListEditor title="Campus Locations" icon={<MapPin className="w-4 h-4 text-[#0F2D52]" />} setting="location" items={locations} loading={loading} placeholder="e.g. Library"
          onAdd={(setting, label) => mutate({ operation: 'add', setting, label })} onUpdate={(setting, item, label) => mutate({ operation: 'update', setting, optionId: item.id, label })} onDelete={(setting, item) => mutate({ operation: 'delete', setting, optionId: item.id })} />
      </div>
    </div>
  </AdminLayout>;
}
